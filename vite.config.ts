import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

/**
 * Vite Plugin: Tự động chạy tất cả Serverless Functions trong thư mục api/
 * Không cần cài đặt hay chạy server.ts độc lập.
 * Kết nối trực tiếp vào Supabase và trả dữ liệu JSON ngay lập tức!
 */
function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost:5173');
          const pathname = urlObj.pathname;

          // Đọc body dữ liệu với các method POST / PUT / PATCH / DELETE
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
            const bodyStr = await new Promise<string>((resolve) => {
              let acc = '';
              req.on('data', (chunk: Buffer) => (acc += chunk.toString()));
              req.on('end', () => resolve(acc));
              req.on('error', () => resolve(''));
            });
            if (bodyStr.trim()) {
              try {
                req.body = JSON.parse(bodyStr);
              } catch {
                req.body = bodyStr;
              }
            } else {
              req.body = {};
            }
          } else {
            req.body = {};
          }

          // Gán query parameters
          req.query = Object.fromEntries(urlObj.searchParams.entries());

          // Polyfill cho VercelRequest / VercelResponse
          res.status = function (code: number) {
            res.statusCode = code;
            return res;
          };
          res.json = function (data: any) {
            if (!res.writableEnded) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(data));
            }
            return res;
          };

          const cleanPath = pathname.replace(/^\/api\/?/, '');
          const parts = cleanPath.split('/').filter(Boolean);

          let targetFile: string | null = null;

          // 1. Khớp file tĩnh: ví dụ /api/pricing -> api/pricing.ts
          const directFile = path.resolve(__dirname, 'api', ...parts) + '.ts';
          if (fs.existsSync(directFile)) {
            targetFile = directFile;
          } else {
            // 2. Khớp index: ví dụ /api/pricing/index.ts
            const indexFile = path.resolve(__dirname, 'api', ...parts, 'index.ts');
            if (fs.existsSync(indexFile)) {
              targetFile = indexFile;
            } else if (parts.length === 3 && parts[0] === 'orders' && parts[2] === 'status') {
              // 3. Khớp dynamic route: /api/orders/:orderCode/status
              targetFile = path.resolve(__dirname, 'api/orders/[orderCode]/status.ts');
              req.query.orderCode = parts[1];
            } else if (parts.length === 4 && parts[0] === 'admin' && parts[1] === 'users' && parts[3] === 'extend') {
              // 4. Khớp /api/admin/users/:id/extend
              targetFile = path.resolve(__dirname, 'api/admin/users/[id]/extend.ts');
              req.query.id = parts[2];
            } else if (parts.length === 4 && parts[0] === 'admin' && parts[1] === 'users' && parts[3] === 'status') {
              // 5. Khớp /api/admin/users/:id/status
              targetFile = path.resolve(__dirname, 'api/admin/users/[id]/status.ts');
              req.query.id = parts[2];
            } else if (parts.length === 3 && parts[0] === 'admin' && parts[1] === 'users') {
              // 6. Khớp /api/admin/users/:id
              targetFile = path.resolve(__dirname, 'api/admin/users/[id].ts');
              req.query.id = parts[2];
            }
          }

          if (!targetFile || !fs.existsSync(targetFile)) {
            res.status(404).json({ status: false, message: `Không tìm thấy API route: ${pathname}` });
            return;
          }

          // Nạp module trực tiếp bằng Vite SSR
          const mod = await server.ssrLoadModule(targetFile);
          const handler = mod.default || mod.handler;

          if (typeof handler === 'function') {
            await handler(req, res);
          } else {
            res.status(500).json({ status: false, message: `File ${targetFile} không export default handler` });
          }
        } catch (err: any) {
          console.error('[API Dev Error]:', err);
          if (!res.writableEnded) {
            res.status(500).json({ status: false, message: err.message || 'Lỗi xử lý API' });
          }
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
    sourcemap: false, // Tắt source map ở môi trường production
    },
  };
});
