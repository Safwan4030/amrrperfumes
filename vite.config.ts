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
          
          // Parse query params
          const queryParams: Record<string, string> = {};
          if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            searchParams.forEach((val, key) => {
              queryParams[key] = val;
            });
          }

          // Map API routes to consolidated serverless handlers
          let targetPath = pathname;
          if (pathname === '/api/send-order-email') {
            targetPath = '/api/send-email';
            if (!queryParams['type']) queryParams['type'] = 'order';
          } else if (pathname === '/api/send-otp-email') {
            targetPath = '/api/send-email';
            if (!queryParams['type']) queryParams['type'] = 'otp';
          } else if (pathname.startsWith('/api/accounts')) {
            targetPath = '/api/accounts';
            if (pathname.includes('refund') && !queryParams['action']) queryParams['action'] = 'refund';
            else if (pathname.includes('summary') && !queryParams['action']) queryParams['action'] = 'summary';
          } else if (pathname.startsWith('/api/delhivery')) {
            targetPath = '/api/delhivery';
            const sub = pathname.replace('/api/delhivery', '').replace(/^\//, '');
            if (sub && !queryParams['action']) queryParams['action'] = sub;
          }

          const modulePath = `${targetPath}.ts`;

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
