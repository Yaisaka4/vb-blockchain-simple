import path from 'node:path';
import fs from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function vbRuntimeAssetsPlugin(): Plugin {
  const rootDir = __dirname;
  const fallbackConfig = `const NET = {\n  "schools": [\n    "http://localhost:3001",\n    "http://localhost:3002",\n    "http://localhost:3003"\n  ],\n  "backup": "http://localhost:3100"\n};\n`;

  const attachMiddleware = (middlewares: {
    use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; statusCode: number; end: (b?: string | Buffer) => void }, next: () => void) => void) => void;
  }) => {
    middlewares.use((req, res, next) => {
      const urlPath = (req.url || '').split('?')[0];
      if (urlPath === '/config.js') {
        const cfgFile = path.join(rootDir, 'config.js');
        const content = fs.existsSync(cfgFile) ? fs.readFileSync(cfgFile, 'utf8') : fallbackConfig;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.statusCode = 200;
        res.end(`${content}\nif (typeof window !== 'undefined') window.NET = NET;\n`);
        return;
      }
      if (urlPath.startsWith('/samples/')) {
        const safeName = path.basename(decodeURIComponent(urlPath));
        const sampleFile = path.join(rootDir, 'samples', safeName);
        if (fs.existsSync(sampleFile) && fs.statSync(sampleFile).isFile()) {
          res.setHeader('Content-Type', 'application/pdf');
          res.statusCode = 200;
          res.end(fs.readFileSync(sampleFile));
          return;
        }
      }
      next();
    });
  };

  return {
    name: 'vb-runtime-assets',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), vbRuntimeAssetsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
