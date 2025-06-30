# MySQL Database Access MCP Server

This MCP server provides read-only access to MySQL databases. It allows you to:

- List available databases
- List tables in a database
- Describe table schemas
- Execute read-only SQL queries

## Security Features

- **Read-only access**: Only SELECT, SHOW, DESCRIBE, and EXPLAIN statements are allowed
- **Query validation**: Prevents SQL injection and blocks any data modification attempts
- **Query timeout**: Prevents long-running queries from consuming resources
- **Row limit**: Prevents excessive data return

## Installation

### 1. Install using one of these methods:

#### Install from NPM

```bash
# Install globally
npm install -g mysql-mcp-server

# Or install locally in your project
npm install mysql-mcp-server
```

#### Build from Source

```bash
# Clone the repository
git clone https://github.com/utajum/mysql-mcp-server.git
cd mysql-mcp-server

# Install dependencies and build
npm install
npm run build
```


### 2. Configure environment variables

The server requires the following environment variables:

- `MYSQL_HOST`: Database server hostname
- `MYSQL_PORT`: Database server port (default: 3306)
- `MYSQL_USER`: Database username
- `MYSQL_PASSWORD`: Database password (optional, but recommended for secure connections)
- `MYSQL_DATABASE`: Default database name (optional)
- `PORT`: Port for the HTTP server to listen on (default: 3000)
- `MCP_HTTP_AUTH_ENABLED`: Set to `true` to enable API key authentication for the HTTP server (default: `false`)
- `MCP_HTTP_API_KEY`: The secret API key required for authenticated requests when `MCP_HTTP_AUTH_ENABLED` is `true`

### 3. Add to MCP settings

Add the following configuration to your MCP settings file:

If you installed via npm (Option 1):
```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["mysql-mcp-server"],
      "env": {
        "MYSQL_HOST": "your-mysql-host",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "your-mysql-user",
        "MYSQL_PASSWORD": "your-mysql-password",
        "MYSQL_DATABASE": "your-default-database",
        "PORT": "3000",
        "MCP_HTTP_AUTH_ENABLED": "true",
        "MCP_HTTP_API_KEY": "your-secret-api-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

If you built from source (Option 2):
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/path/to/mysql-mcp-server/build/index.js"],
      "env": {
        "MYSQL_HOST": "your-mysql-host",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "your-mysql-user",
        "MYSQL_PASSWORD": "your-mysql-password",
        "MYSQL_DATABASE": "your-default-database",
        "PORT": "3000",
        "MCP_HTTP_AUTH_ENABLED": "true",
        "MCP_HTTP_API_KEY": "your-secret-api-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Usage

The server can be started in two modes:

### Stdio Mode (Default)

This is the default mode and uses standard input/output for communication.

```bash
npm start
```

### HTTP Mode

This mode starts an HTTP server that exposes the MCP endpoints.

```bash
npm run start:http
```

When running in HTTP mode, the server will listen on the port specified by the `PORT` environment variable (default: 3000).

#### API Key Authentication

If `MCP_HTTP_AUTH_ENABLED` is set to `true`, all requests to the `/mcp` endpoint must include an `X-API-Key` header with the value of `MCP_HTTP_API_KEY`.

Example `curl` request with authentication:

```bash
curl -X POST -H "Content-Type: application/json" \
     -H "X-API-Key: your-secret-api-key" \
     -d '{ "jsonrpc": "2.0", "method": "list_tools", "id": 1 }' \
     http://localhost:3000/mcp
```

## Available Tools

### list_databases

Lists all accessible databases on the MySQL server.

**Parameters**: None

**Example**:
```json
{
  "server_name": "mysql",
  "tool_name": "list_databases",
  "arguments": {}
}
```

### list_tables

Lists all tables in a specified database.

**Parameters**:
- `database` (optional): Database name (uses default if not specified)

**Example**:
```json
{
  "server_name": "mysql",
  "tool_name": "list_tables",
  "arguments": {
    "database": "my_database"
  }
}
```

### describe_table

Shows the schema for a specific table.

**Parameters**:
- `database` (optional): Database name (uses default if not specified)
- `table` (required): Table name

**Example**:
```json
{
  "server_name": "mysql",
  "tool_name": "describe_table",
  "arguments": {
    "database": "my_database",
    "table": "my_table"
  }
}
```

### execute_query

Executes a read-only SQL query.

**Parameters**:
- `query` (required): SQL query (only SELECT, SHOW, DESCRIBE, and EXPLAIN statements are allowed)
- `database` (optional): Database name (uses default if not specified)

**Example**:
```json
{
  "server_name": "mysql",
  "tool_name": "execute_query",
  "arguments": {
    "database": "my_database",
    "query": "SELECT * FROM my_table LIMIT 10"
  }
}
```

## Advanced Configuration

For more control over the MySQL connection pool behavior and HTTP server settings, you can configure additional parameters:

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["mysql-mcp-server"],
      "env": {
        "MYSQL_HOST": "your-mysql-host",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "your-mysql-user",
        "MYSQL_PASSWORD": "your-mysql-password",
        "MYSQL_DATABASE": "your-default-database",
        
        "MYSQL_CONNECTION_LIMIT": "10",
        "MYSQL_QUEUE_LIMIT": "0",
        "MYSQL_CONNECT_TIMEOUT": "10000",
        "MYSQL_IDLE_TIMEOUT": "60000",
        "MYSQL_MAX_IDLE": "10",
        
        "PORT": "3000",
        "MCP_HTTP_AUTH_ENABLED": "true",
        "MCP_HTTP_API_KEY": "your-secret-api-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

These advanced options allow you to:

- `MYSQL_CONNECTION_LIMIT`: Control the maximum number of connections in the pool (default: 10)
- `MYSQL_QUEUE_LIMIT`: Set the maximum number of connection requests to queue (default: 0, unlimited)
- `MYSQL_CONNECT_TIMEOUT`: Adjust the connection timeout in milliseconds (default: 10000)
- `MYSQL_IDLE_TIMEOUT`: Configure how long a connection can be idle before being released (in milliseconds)
- `MYSQL_MAX_IDLE`: Set the maximum number of idle connections to keep in the pool
- `PORT`: Specify the port for the HTTP server (default: 3000)
- `MCP_HTTP_AUTH_ENABLED`: Enable or disable API key authentication for the HTTP server
- `MCP_HTTP_API_KEY`: Set the API key for HTTP server authentication


## Testing

The server includes test scripts to verify functionality with your MySQL setup:

### 1. Setup Test Database

This script creates a test database, table, and sample data:

```bash
# Set your MySQL credentials as environment variables
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=your_username
export MYSQL_PASSWORD=your_password

# Run the setup script
npm run test:setup
```

### 2. Test MCP Tools

This script tests each of the MCP tools against the test database:

```bash
# Set your MySQL credentials as environment variables
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=your_username
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=mcp_test_db

# Run the tools test script
npm run test:tools
```

### 3. Run All Tests

To run both setup and tool tests:

```bash
# Set your MySQL credentials as environment variables
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=your_username
export MYSQL_PASSWORD=your_password

# Run all tests
npm test
```

## Troubleshooting

If you encounter issues:

1. Check the server logs for error messages
2. Verify your MySQL credentials and connection details
3. Ensure your MySQL user has appropriate permissions
4. Check that your query is read-only and properly formatted

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.