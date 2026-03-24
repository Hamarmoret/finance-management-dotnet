using Npgsql;

namespace FinanceManagement.Api.Database;

/// <summary>
/// Lightweight Dapper-based database context using Npgsql connection pooling.
/// </summary>
public class DbContext
{
    private readonly string _connectionString;

    public DbContext(string connectionString)
    {
        _connectionString = connectionString;
    }

    public NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(_connectionString);
    }
}
