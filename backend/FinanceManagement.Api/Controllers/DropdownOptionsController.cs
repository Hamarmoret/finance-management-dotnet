using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Settings;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/dropdown-options")]
[Authorize]
public class DropdownOptionsController : ControllerBase
{
    private readonly DropdownOptionsService _service;

    public DropdownOptionsController(DropdownOptionsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var grouped = await _service.GetAllGroupedAsync();
        return Ok(ApiResponse<Dictionary<string, List<DropdownOptionDto>>>.Ok(grouped));
    }

    [HttpGet("{category}")]
    public async Task<IActionResult> GetByCategory(string category)
    {
        var options = await _service.GetByCategoryAsync(category);
        return Ok(ApiResponse<List<DropdownOptionDto>>.Ok(options));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDropdownOptionRequest request)
    {
        var option = await _service.CreateAsync(request);
        return StatusCode(201, ApiResponse<DropdownOptionDto>.Ok(option));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDropdownOptionRequest request)
    {
        var option = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<DropdownOptionDto>.Ok(option));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse<object>.Ok(new { message = "Option deleted" }));
    }
}
