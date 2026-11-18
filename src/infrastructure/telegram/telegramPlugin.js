/**
 * Vite Dev Server Middleware Plugin for Telegram Bot API
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 */

import { TelegramServerHandler } from './telegramServerHandler.js';

export function telegramPlugin(env = {}) {
  const token = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  const botUsername = env.TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || '';

  const serverHandler = new TelegramServerHandler({
    token,
    botUsername
  });

  return {
    name: 'vite-plugin-telegram-coop-api',
    async configureServer(server) {
      // 1. Initialize server handler (seeds database & default sessions)
      await serverHandler.init();

      // 2. Start background long-polling worker if bot token is configured
      if (serverHandler.telegramService.isConfigured()) {
        serverHandler.telegramService.startPolling({ timeoutSeconds: 15 });
      }

      // 3. Clean up polling on server close
      server.httpServer?.on('close', () => {
        serverHandler.telegramService.stopPolling();
      });

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';

        // Intercept all /api/telegram/* endpoints
        if (url.startsWith('/api/telegram')) {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              let body = {};
              if (bodyStr && (req.method === 'POST' || req.method === 'PUT')) {
                try {
                  body = JSON.parse(bodyStr);
                } catch {
                  body = {};
                }
              }

              const result = await serverHandler.handleRequest({
                method: req.method,
                url: req.url,
                headers: req.headers,
                body
              });

              res.writeHead(result.status || 200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              });
              res.end(JSON.stringify(result.body || {}));
            } catch (err) {
              console.error('[Telegram Middleware Error]:', err.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Terjadi kesalahan sistem internal pada layanan Telegram.'
              }));
            }
          });

          req.on('error', err => {
            console.error('[Telegram Stream Error]:', err);
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
