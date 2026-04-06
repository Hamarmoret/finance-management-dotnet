using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Pipeline;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/clients")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly ClientsService _clientsService;

    public ClientsController(ClientsService clientsService)
    {
        _clientsService = clientsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null)
    {
        var (clients, total) = await _clientsService.GetAllAsync(page, limit, search, status);

        return Ok(new PaginatedResponse<ClientDto>
        {
            Data = clients,
            Pagination = new PaginationInfo
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            },
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid client ID", 400, "VALIDATION_ERROR");

        var client = await _clientsService.GetByIdAsync(guid);
        if (client == null)
            throw new AppException("Client not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<ClientDto>.Ok(client));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientRequest request)
    {
        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var client = await _clientsService.CreateAsync(request, userId);
        return StatusCode(201, ApiResponse<ClientDto>.Ok(client));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateClientRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid client ID", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var client = await _clientsService.UpdateAsync(guid, request, userId);
        if (client == null)
            throw new AppException("Client not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<ClientDto>.Ok(client));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid client ID", 400, "VALIDATION_ERROR");

        var userId = Guid.Parse(HttpContext.GetUserId()!);
        var deleted = await _clientsService.DeleteAsync(guid, userId);
        if (!deleted)
            throw new AppException("Client not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<object>.Ok(new { message = "Client deleted successfully" }));
    }
}
