using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Uploads;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/uploads")]
[Authorize]
public class UploadsController : ControllerBase
{
    private readonly UploadsService _uploadsService;
    private readonly ILogger<UploadsController> _logger;

    public UploadsController(UploadsService uploadsService, ILogger<UploadsController> logger)
    {
        _uploadsService = uploadsService;
        _logger = logger;
    }

    /// <summary>
    /// Get a signed URL for direct upload to GCS
    /// </summary>
    [HttpPost("signed-url")]
    public async Task<IActionResult> GetSignedUploadUrl([FromBody] SignedUrlRequest request)
    {
        var userId = HttpContext.GetRequiredUserId().ToString();
        var result = await _uploadsService.GetSignedUploadUrlAsync(request.Filename, request.MimeType, userId);
        return Ok(ApiResponse<SignedUrlResultDto>.Ok(result));
    }

    /// <summary>
    /// Upload a single file through the server
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new AppException("No file provided", 400, "VALIDATION_ERROR");

        var userId = HttpContext.GetRequiredUserId().ToString();

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        var result = await _uploadsService.UploadBufferAsync(
            ms.ToArray(), file.FileName, file.ContentType, userId);

        _logger.LogInformation("File uploaded: {FileId} by user {UserId}", result.Id, userId);

        return StatusCode(201, ApiResponse<UploadResultDto>.Ok(result));
    }

    /// <summary>
    /// Upload multiple files
    /// </summary>
    [HttpPost("multiple")]
    [RequestSizeLimit(100 * 1024 * 1024)] // 100MB total
    public async Task<IActionResult> UploadMultiple(List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            throw new AppException("No files provided", 400, "VALIDATION_ERROR");

        if (files.Count > 10)
            throw new AppException("Maximum 10 files allowed", 400, "VALIDATION_ERROR");

        var userId = HttpContext.GetRequiredUserId().ToString();
        var results = new List<UploadResultDto>();

        foreach (var file in files)
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var result = await _uploadsService.UploadBufferAsync(
                ms.ToArray(), file.FileName, file.ContentType, userId);
            results.Add(result);
        }

        _logger.LogInformation("{Count} files uploaded by user {UserId}", results.Count, userId);

        return StatusCode(201, ApiResponse<List<UploadResultDto>>.Ok(results));
    }

    /// <summary>
    /// Get a signed URL for reading a file
    /// </summary>
    [HttpGet("read-url")]
    public async Task<IActionResult> GetReadUrl([FromQuery] string path)
    {
        if (string.IsNullOrEmpty(path))
            throw new AppException("File path is required", 400, "VALIDATION_ERROR");

        var userId = HttpContext.GetRequiredUserId().ToString();
        if (!path.StartsWith($"uploads/{userId}/"))
            throw new AppException("Access denied", 403, "FORBIDDEN");

        var url = await _uploadsService.GetSignedReadUrlAsync(path);
        return Ok(ApiResponse<object>.Ok(new { url }));
    }

    /// <summary>
    /// Get a signed URL from a public GCS URL
    /// </summary>
    [HttpPost("get-signed-url")]
    public async Task<IActionResult> GetSignedUrlFromPublicUrl([FromBody] GetSignedUrlRequest request)
    {
        if (string.IsNullOrEmpty(request.Url))
            throw new AppException("URL is required", 400, "VALIDATION_ERROR");

        var bucketName = Environment.GetEnvironmentVariable("GCS_BUCKET") ?? "finance-management-uploads";
        var urlPrefix = $"https://storage.googleapis.com/{bucketName}/";

        if (!request.Url.StartsWith(urlPrefix))
            throw new AppException("Invalid file URL", 400, "VALIDATION_ERROR");

        var filePath = request.Url[urlPrefix.Length..];

        if (!filePath.StartsWith("uploads/"))
            throw new AppException("Access denied", 403, "FORBIDDEN");

        try
        {
            var signedUrl = await _uploadsService.GetSignedReadUrlAsync(filePath);
            return Ok(ApiResponse<object>.Ok(new { url = signedUrl }));
        }
        catch
        {
            // Fall back to proxy URL
            var proxyUrl = $"/api/uploads/proxy?path={Uri.EscapeDataString(filePath)}";
            return Ok(ApiResponse<object>.Ok(new { url = proxyUrl, isProxy = true }));
        }
    }

    /// <summary>
    /// Proxy endpoint to stream file content from GCS
    /// </summary>
    [HttpGet("proxy")]
    public async Task<IActionResult> ProxyFile([FromQuery] string path)
    {
        if (string.IsNullOrEmpty(path))
            throw new AppException("File path is required", 400, "VALIDATION_ERROR");

        if (!path.StartsWith("uploads/"))
            throw new AppException("Access denied", 403, "FORBIDDEN");

        var (stream, contentType, size, originalName) = await _uploadsService.GetFileStreamAsync(path);

        if (!string.IsNullOrEmpty(originalName))
            Response.Headers.ContentDisposition = $"inline; filename=\"{Path.GetFileName(originalName)}\"";

        return File(stream, contentType);
    }

    /// <summary>
    /// Delete a file
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string path)
    {
        if (string.IsNullOrEmpty(path))
            throw new AppException("File path is required", 400, "VALIDATION_ERROR");

        var userId = HttpContext.GetRequiredUserId().ToString();
        if (!path.StartsWith($"uploads/{userId}/"))
            throw new AppException("Access denied", 403, "FORBIDDEN");

        await _uploadsService.DeleteFileAsync(path);
        _logger.LogInformation("File deleted: {Path} by user {UserId}", path, userId);

        return Ok(ApiResponse<object>.Ok(new { message = "File deleted successfully" }));
    }

    /// <summary>
    /// List user's uploaded files
    /// </summary>
    [HttpGet("list")]
    public async Task<IActionResult> ListFiles([FromQuery] string? prefix = null)
    {
        var userId = HttpContext.GetRequiredUserId().ToString();
        var files = await _uploadsService.ListUserFilesAsync(userId, prefix);
        return Ok(ApiResponse<List<FileListItemDto>>.Ok(files));
    }
}
