using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Pipeline;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Authorize]
public class ContactPersonsController : ControllerBase
{
    private readonly ContactPersonsService _contactPersonsService;

    public ContactPersonsController(ContactPersonsService contactPersonsService)
    {
        _contactPersonsService = contactPersonsService;
    }

    [HttpGet("api/clients/{clientId}/contacts")]
    public async Task<IActionResult> GetByClient(string clientId)
    {
        if (!Guid.TryParse(clientId, out var clientGuid))
            throw new AppException("Invalid client ID", 400, "VALIDATION_ERROR");

        var contacts = await _contactPersonsService.GetByClientIdAsync(clientGuid);
        return Ok(ApiResponse<List<ContactPersonDto>>.Ok(contacts));
    }

    [HttpPost("api/clients/{clientId}/contacts")]
    public async Task<IActionResult> Create(string clientId, [FromBody] CreateContactPersonRequest request)
    {
        if (!Guid.TryParse(clientId, out var clientGuid))
            throw new AppException("Invalid client ID", 400, "VALIDATION_ERROR");

        var userId = HttpContext.GetRequiredUserId();
        var contact = await _contactPersonsService.CreateAsync(clientGuid, request, userId);
        return StatusCode(201, ApiResponse<ContactPersonDto>.Ok(contact));
    }

    [HttpPut("api/contacts/{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateContactPersonRequest request)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid contact ID", 400, "VALIDATION_ERROR");

        var contact = await _contactPersonsService.UpdateAsync(guid, request);
        if (contact == null)
            throw new AppException("Contact not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<ContactPersonDto>.Ok(contact));
    }

    [HttpDelete("api/contacts/{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new AppException("Invalid contact ID", 400, "VALIDATION_ERROR");

        var deleted = await _contactPersonsService.DeleteAsync(guid);
        if (!deleted)
            throw new AppException("Contact not found", 404, "NOT_FOUND");

        return Ok(ApiResponse<object>.Ok(new { message = "Contact deleted successfully" }));
    }
}
