using System.Text.Json.Serialization;
using Google.Cloud.Storage.V1;
using FinanceManagement.Api.Config;
using FinanceManagement.Api.Middleware;

namespace FinanceManagement.Api.Services.Uploads;

#region DTOs

public class UploadResultDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("url")] public string Url { get; set; } = string.Empty;
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
    [JsonPropertyName("size")] public long Size { get; set; }
}

public class SignedUrlResultDto
{
    [JsonPropertyName("signedUrl")] public string SignedUrl { get; set; } = string.Empty;
    [JsonPropertyName("filePath")] public string FilePath { get; set; } = string.Empty;
    [JsonPropertyName("publicUrl")] public string PublicUrl { get; set; } = string.Empty;
}

public class FileListItemDto
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("size")] public long Size { get; set; }
    [JsonPropertyName("contentType")] public string? ContentType { get; set; }
    [JsonPropertyName("updated")] public DateTime? Updated { get; set; }
}

public class SignedUrlRequest
{
    [JsonPropertyName("filename")] public string Filename { get; set; } = string.Empty;
    [JsonPropertyName("mimeType")] public string MimeType { get; set; } = string.Empty;
}

public class GetSignedUrlRequest
{
    [JsonPropertyName("url")] public string Url { get; set; } = string.Empty;
}

#endregion

public class UploadsService
{
    private readonly string _bucketName;
    private readonly StorageClient? _storageClient;
    private readonly ILogger<UploadsService> _logger;

    // Credential is application-global and long-lived — cache it once to avoid
    // a metadata server round-trip on every upload/download signed-URL request.
    private static Google.Apis.Auth.OAuth2.GoogleCredential? _cachedCredential;
    private static readonly SemaphoreSlim _credentialLock = new(1, 1);

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.ms-excel",
        "text/csv",
    };

    // Magic byte signatures for file types that can contain executable content.
    // Text-based formats (CSV, XML) are omitted — their bytes are indistinguishable
    // from plain text and they cannot be executed by the browser anyway.
    private static readonly Dictionary<string, byte[][]> MagicSignatures =
        new(StringComparer.OrdinalIgnoreCase)
    {
        ["application/pdf"]  = [[ 0x25, 0x50, 0x44, 0x46 ]],           // %PDF
        ["image/jpeg"]       = [[ 0xFF, 0xD8, 0xFF ]],
        ["image/png"]        = [[ 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A ]],
        ["image/gif"]        = [[ 0x47, 0x49, 0x46, 0x38, 0x37, 0x61 ], // GIF87a
                                [ 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 ]], // GIF89a
        ["image/webp"]       = [[ 0x52, 0x49, 0x46, 0x46 ]],            // RIFF….WEBP
        // Office Open XML (docx, xlsx) and legacy Office (doc, xls) are ZIP-based — PK magic
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
                             = [[ 0x50, 0x4B, 0x03, 0x04 ]],
        ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
                             = [[ 0x50, 0x4B, 0x03, 0x04 ]],
        ["application/msword"]     = [[ 0xD0, 0xCF, 0x11, 0xE0 ]],     // OLE2
        ["application/vnd.ms-excel"] = [[ 0xD0, 0xCF, 0x11, 0xE0 ]],
    };

    /// <summary>
    /// Returns true if the buffer starts with one of the known magic byte sequences for the
    /// declared MIME type. Types with no registered signature (e.g. text/csv) always pass.
    /// </summary>
    private static bool HasValidMagicBytes(byte[] buffer, string mimeType)
    {
        if (!MagicSignatures.TryGetValue(mimeType, out var signatures))
            return true; // no magic check defined for this type

        foreach (var sig in signatures)
        {
            if (buffer.Length >= sig.Length && buffer.AsSpan(0, sig.Length).SequenceEqual(sig))
                return true;
        }
        return false;
    }

    public UploadsService(AppSettings settings, ILogger<UploadsService> logger)
    {
        _bucketName = settings.Gcs.BucketName;
        _logger = logger;

        try
        {
            _storageClient = StorageClient.Create();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GCS client not available - uploads will fail. This is expected in development without GCP credentials.");
        }
    }

    public async Task<SignedUrlResultDto> GetSignedUploadUrlAsync(string filename, string mimeType, string userId)
    {
        EnsureStorageClient();

        var fileId = Guid.NewGuid().ToString();
        var ext = Path.GetExtension(filename);
        var filePath = $"uploads/{userId}/{fileId}{ext}";

        var credential = await GetOrFetchCredentialAsync();
        var urlSigner = UrlSigner.FromCredential(credential);

        var signedUrl = await urlSigner.SignAsync(
            UrlSigner.RequestTemplate.FromBucket(_bucketName).WithObjectName(filePath)
                .WithHttpMethod(HttpMethod.Put)
                .WithContentHeaders(new Dictionary<string, IEnumerable<string>>
                {
                    ["Content-Type"] = new[] { mimeType }
                }),
            UrlSigner.Options.FromDuration(TimeSpan.FromMinutes(15)));

        var publicUrl = $"https://storage.googleapis.com/{_bucketName}/{filePath}";

        return new SignedUrlResultDto
        {
            SignedUrl = signedUrl,
            FilePath = filePath,
            PublicUrl = publicUrl,
        };
    }

    public async Task<UploadResultDto> UploadBufferAsync(
        byte[] buffer, string originalName, string mimeType, string userId)
    {
        EnsureStorageClient();

        if (!AllowedMimeTypes.Contains(mimeType))
            throw new AppException($"File type {mimeType} is not allowed", 400, "VALIDATION_ERROR");

        if (!HasValidMagicBytes(buffer, mimeType))
            throw new AppException("File content does not match the declared file type", 400, "VALIDATION_ERROR");

        var fileId = Guid.NewGuid().ToString();
        var ext = Path.GetExtension(originalName);
        var filePath = $"uploads/{userId}/{fileId}{ext}";

        try
        {
            using var stream = new MemoryStream(buffer);
            // Do NOT set PredefinedAcl — buckets with Uniform Bucket-Level Access
            // reject per-object ACL settings and throw a 400 GoogleApiException.
            await _storageClient!.UploadObjectAsync(_bucketName, filePath, mimeType, stream);
        }
        catch (Google.GoogleApiException ex)
        {
            _logger.LogError(ex, "GCS upload failed for {FilePath}: {Status}", filePath, ex.HttpStatusCode);
            throw new AppException($"File upload failed: {ex.Message}", 500, "UPLOAD_ERROR");
        }
        catch (Exception ex) when (ex is not AppException)
        {
            _logger.LogError(ex, "Unexpected error uploading {FilePath}", filePath);
            throw new AppException("File upload failed due to a server error", 500, "UPLOAD_ERROR");
        }

        var publicUrl = $"https://storage.googleapis.com/{_bucketName}/{filePath}";

        return new UploadResultDto
        {
            Id = fileId,
            Name = originalName,
            Url = publicUrl,
            Type = mimeType,
            Size = buffer.Length,
        };
    }

    public async Task<string> GetSignedReadUrlAsync(string filePath)
    {
        EnsureStorageClient();

        var credential = await GetOrFetchCredentialAsync();
        var urlSigner = UrlSigner.FromCredential(credential);

        return await urlSigner.SignAsync(
            UrlSigner.RequestTemplate.FromBucket(_bucketName).WithObjectName(filePath)
                .WithHttpMethod(HttpMethod.Get),
            UrlSigner.Options.FromDuration(TimeSpan.FromHours(1)));
    }

    public async Task<(Stream Stream, string ContentType, long? Size, string? OriginalName)> GetFileStreamAsync(string filePath)
    {
        EnsureStorageClient();

        var obj = await _storageClient!.GetObjectAsync(_bucketName, filePath);
        var stream = new MemoryStream();
        await _storageClient.DownloadObjectAsync(_bucketName, filePath, stream);
        stream.Position = 0;

        return (stream, obj.ContentType ?? "application/octet-stream", (long?)obj.Size, obj.Name);
    }

    public async Task DeleteFileAsync(string filePath)
    {
        EnsureStorageClient();

        try
        {
            await _storageClient!.DeleteObjectAsync(_bucketName, filePath);
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            throw new AppException("File not found", 404, "NOT_FOUND");
        }
        catch (Google.GoogleApiException ex)
        {
            _logger.LogError(ex, "GCS error deleting {FilePath}: {Status}", filePath, ex.HttpStatusCode);
            throw new AppException($"File deletion failed", 502, "STORAGE_ERROR");
        }
    }

    public async Task<List<FileListItemDto>> ListUserFilesAsync(string userId, string? prefix = null)
    {
        EnsureStorageClient();

        var fullPrefix = string.IsNullOrEmpty(prefix)
            ? $"uploads/{userId}/"
            : $"uploads/{userId}/{prefix}";

        var files = new List<FileListItemDto>();
        var objects = _storageClient!.ListObjectsAsync(_bucketName, fullPrefix);

        await foreach (var obj in objects)
        {
            files.Add(new FileListItemDto
            {
                Name = obj.Name,
                Size = (long)(obj.Size ?? 0),
                ContentType = obj.ContentType,
                Updated = obj.UpdatedDateTimeOffset?.UtcDateTime,
            });
        }

        return files;
    }

    private void EnsureStorageClient()
    {
        if (_storageClient == null)
            throw new AppException("Storage service not available", 503, "SERVICE_UNAVAILABLE");
    }

    /// <summary>
    /// Returns the application-default GCS credential, fetching it once and caching it
    /// for the lifetime of the process.  A 10-second timeout prevents the metadata server
    /// round-trip from hanging upload requests indefinitely.
    /// </summary>
    private static async Task<Google.Apis.Auth.OAuth2.GoogleCredential> GetOrFetchCredentialAsync()
    {
        if (_cachedCredential != null) return _cachedCredential;

        await _credentialLock.WaitAsync();
        try
        {
            if (_cachedCredential != null) return _cachedCredential;

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            _cachedCredential = await Google.Apis.Auth.OAuth2.GoogleCredential
                .GetApplicationDefaultAsync(cts.Token);
            return _cachedCredential;
        }
        finally
        {
            _credentialLock.Release();
        }
    }
}
