import { defineConfig, loadEnv } from 'vite';
import { NvidiaAiService } from './src/infrastructure/ai/nvidiaAiService.js';
import { AiChatServerHandler } from './src/infrastructure/ai/aiChatServerHandler.js';
import { ReportServerHandler } from './src/infrastructure/reports/reportServerHandler.js';
import { telegramPlugin } from './src/infrastructure/telegram/telegramPlugin.js';

function nvidiaAiPlugin(env) {
  const aiService = new NvidiaAiService({
    apiKey: env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY || '',
    baseUrl: env.NVIDIA_BASE_URL || process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    model: env.NVIDIA_MODEL || process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct'
  });

  const serverHandler = new AiChatServerHandler({ aiService });
  const reportHandler = new ReportServerHandler();

  return {
    name: 'vite-plugin-nvidia-ai-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        
        // 1. Client-Server Database Synchronization Endpoint
        if (req.method === 'POST' && url === '/api/db/sync') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              const body = bodyStr ? JSON.parse(bodyStr) : {};
              const result = await serverHandler.syncData(body);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 2. Authenticated Reports RBAC Backend Endpoint
        if (url === '/api/reports') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              let body = {};
              if (bodyStr) {
                try {
                  body = JSON.parse(bodyStr);
                } catch {
                  body = {};
                }
              }

              const clientIp = req.socket?.remoteAddress || '127.0.0.1';
              const result = await reportHandler.handleReportsRequest({
                method: req.method,
                url: req.url,
                headers: req.headers,
                body,
                clientIp
              });

              res.writeHead(result.status || 200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              });
              res.end(JSON.stringify(result.body || {}));
            } catch (err) {
              console.error('[Reports Route Error]:', err.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                status: 500,
                error: err.message || 'Terjadi kesalahan saat memproses laporan keuangan.'
              }));
            }
          });

          req.on('error', err => {
            console.error('[Reports Stream Error]:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Request stream error.' }));
          });
          return;
        }

        // 3. Authenticated Smart Co-op Multi-Model AI Endpoints
        if (url.startsWith('/api/ai')) {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              let body = {};
              if (bodyStr) {
                try {
                  body = JSON.parse(bodyStr);
                } catch {
                  body = {};
                }
              }

              const clientIp = req.socket?.remoteAddress || '127.0.0.1';
              const result = await serverHandler.dispatchApiRequest({
                method: req.method,
                url: req.url,
                headers: req.headers,
                body,
                clientIp
              });

              res.writeHead(result.status || 200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              });
              res.end(JSON.stringify(result.body || {}));
            } catch (err) {
              console.error('[AI Route Error]:', err.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: err.message || 'Terjadi kesalahan saat memproses permintaan AI.'
              }));
            }
          });

          req.on('error', err => {
            console.error('[AI Stream Error]:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Request stream error.' }));
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [nvidiaAiPlugin(env), telegramPlugin(env)],
    server: {
      port: 3000,
      open: false,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});

