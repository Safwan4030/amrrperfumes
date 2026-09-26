import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          const [pathname, queryString] = (req.url || '').split('?');
          
          // Map /api/xyz or /api/delhivery/xyz to /api/xyz.ts or /api/delhivery/xyz.ts
          const modulePath = `${pathname}.ts`;

          // Parse query params
          const queryParams: Record<string, string> = {};
          if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            searchParams.forEach((val, key) => {
              queryParams[key] = val;
            });
          }

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              let reqBody: any = {};
              if (body) {
                try {
                  reqBody = JSON.parse(body);
                } catch {
                  reqBody = body;
                }
              }

              const { default: handler } = await server.ssrLoadModule(modulePath);
              if (!handler) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: `API route handler not found for ${pathname}` }));
                return;
              }

              const mockReq: any = {
                method: req.method,
                headers: req.headers,
                query: queryParams,
                body: reqBody
              };

              const mockRes: any = {
                statusCode: 200,
                headers: {},
                setHeader(k: string, v: string) { this.headers[k] = v; res.setHeader(k, v); },
                status(code: number) { this.statusCode = code; res.statusCode = code; return this; },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = this.statusCode || 200;
                  res.end(JSON.stringify(data));
                  return this;
                },
                end(data?: any) { 
                  if (data) res.write(data);
                  res.end(); 
                }
              };

              await handler(mockReq, mockRes);
            } catch (err: any) {
              console.error(`Error in API route ${pathname}:`, err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message || 'API internal error' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
    },
  };
});
