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

        var credential = await Google.Apis.Auth.OAuth2.GoogleCredential.GetApplicationDefaultAsync();
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

        var credential = await Google.Apis.Auth.OAuth2.GoogleCredential.GetApplicationDefaultAsync();
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
}
