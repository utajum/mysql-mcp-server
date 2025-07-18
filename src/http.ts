import express from 'express';
import { randomUUID } from 'node:crypto';
import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { MySQLConfig } from './types.js';

export function startHttpServer(server: McpServer, config: MySQLConfig) {
  const app = express();
  // Middleware to log every request
  // app.use((req, res, next) => {
  //   const start = Date.now();
  //   console.log(`[HTTP] --> ${req.method} ${req.originalUrl}`);
  //   console.log(`[HTTP] Headers: ${JSON.stringify(req.headers, null, 2)}`);
  //   if (req.body) {
  //     console.log(`[HTTP] Body: ${JSON.stringify(req.body, null, 2)}`);
  //   }

  //   res.on('finish', () => {
  //     const duration = Date.now() - start;
  //     console.log(
  //       `[HTTP] <-- ${req.method} ${req.originalUrl} ${res.statusCode} ${res.statusMessage} - ${duration}ms`
  //     );
  //   });

  //   next();
  // });

  const mcpRouter = express.Router();
  mcpRouter.use(express.json());

  // API key authentication middleware.
  // This is applied to all /mcp routes.
  if (config.httpAuthEnabled) {
    mcpRouter.use((req, res, next) => {
      if (!config.httpApiKey) {
        console.error(
          'API key authentication is enabled, but no API key is configured.'
        );
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== config.httpApiKey) {
        res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
        return;
      }
      next();
    });
  }

  // MCP sessions are necessary for the server to send back asynchronous
  // notifications to the correct client. The session ID correlates a client
  // with a long-lived transport instance on the server. This is different
  // from authentication, which is handled by the API key.
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Handle POST requests for client-to-server communication
  mcpRouter.post('/', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // A session already exists, reuse the transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // This is a request to initialize a new session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          // Store the transport so we can find it for future requests
          transports[newSessionId] = transport;
        },
      });

      // Clean up the transport when the session is closed
      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      // Connect the MCP server instance to this new transport
      await server.connect(transport);
    } else {
      // This is an invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'Bad Request: No valid session ID provided for a non-initialization request.',
        },
        id: null,
      });
      return;
    }

    // Forward the request to the transport to be handled by the MCP server
    await transport.handleRequest(req, res, req.body);
  });

  // Reusable handler for GET (SSE) and DELETE (session termination) requests
  const handleSessionRequest = async (
    req: express.Request,
    res: express.Response
  ) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  // Handle GET requests for server-to-client notifications via SSE
  mcpRouter.get('/', handleSessionRequest);

  // Handle DELETE requests for session termination
  mcpRouter.delete('/', handleSessionRequest);

  app.use('/mcp', mcpRouter);

  // Deprecated SSE transport.
  // This implementation is not safe for concurrent clients and should only be
  // used for backwards compatibility with single-client scenarios.
  let sseTransport: SSEServerTransport | null = null;

  app.get('/sse', (req, res) => {
    console.log('[HTTP] SSE transport requested (deprecated)');
    sseTransport = new SSEServerTransport('/messages', res);
    server.connect(sseTransport);
    req.on('close', () => {
      console.log('[HTTP] SSE transport closed (deprecated)');
      sseTransport = null;
    });
  });

  app.post('/messages', (req, res) => {
    if (sseTransport) {
      sseTransport.handlePostMessage(req, res);
    } else {
      res.status(400).send('No active SSE transport');
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.error(`[Setup] HTTP MCP server running on port ${port}`);
    if (config.httpAuthEnabled) {
      console.error('[Setup] API key authentication is enabled.');
    } else {
      console.error('[Setup] API key authentication is disabled.');
    }
  });
}
