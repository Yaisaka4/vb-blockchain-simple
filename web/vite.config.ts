import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function vbRuntimeAssetsPlugin(): Plugin {
  const rootDir = __dirname;
  const repoRoot = path.resolve(rootDir, '..');
  const samplesDir = path.join(rootDir, 'samples');
  const makePdfScript = path.join(repoRoot, 'tools', 'make-pdf.js');
  const fallbackConfig = `const NET = {\n  "schools": [\n    "http://localhost:3001",\n    "http://localhost:3002",\n    "http://localhost:3003"\n  ],\n  "backup": "http://localhost:3100"\n};\n`;

  const ensureSamplePdfs = () => {
    const markerFile = path.join(samplesDir, 'VB2026-001.pdf');
    if (fs.existsSync(markerFile)) return;
    if (!fs.existsSync(makePdfScript)) return;
    try {
      execFileSync(process.execPath, [makePdfScript], { cwd: repoRoot, stdio: 'ignore' });
    } catch {
      // ignore if invoked in an isolated environment without tools/
    }
  };

  const resolveRuntimeConfigJs = () => {
    const cfgFile = path.join(rootDir, 'config.js');
    const content = fs.existsSync(cfgFile) ? fs.readFileSync(cfgFile, 'utf8') : fallbackConfig;
    return `${content}\nif (typeof window !== 'undefined') window.NET = NET;\n`;
  };

  const attachMiddleware = (middlewares: {
    use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; statusCode: number; end: (b?: string | Buffer) => void }, next: () => void) => void) => void;
  }) => {
    ensureSamplePdfs();
    middlewares.use((req, res, next) => {
      const urlPath = (req.url || '').split('?')[0];
      if (urlPath === '/config.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.statusCode = 200;
        res.end(resolveRuntimeConfigJs());
        return;
      }
      if (urlPath.startsWith('/samples/')) {
        ensureSamplePdfs();
        const safeName = path.basename(decodeURIComponent(urlPath));
        const sampleFile = path.join(samplesDir, safeName);
        if (fs.existsSync(sampleFile) && fs.statSync(sampleFile).isFile()) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Cache-Control', 'no-store');
          res.statusCode = 200;
          res.end(fs.readFileSync(sampleFile));
          return;
        }
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Không tìm thấy tệp PDF mẫu. Hãy chạy: node tools/make-pdf.js');
        return;
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
    closeBundle() {
      ensureSamplePdfs();
      const distDir = path.join(rootDir, 'dist');
      if (!fs.existsSync(distDir)) return;

      // Đóng gói kèm /config.js mặc định và /samples/*.pdf vào bản build tĩnh web/dist
      fs.writeFileSync(path.join(distDir, 'config.js'), resolveRuntimeConfigJs(), 'utf8');

      if (fs.existsSync(samplesDir)) {
        const distSamples = path.join(distDir, 'samples');
        fs.mkdirSync(distSamples, { recursive: true });
        for (const name of fs.readdirSync(samplesDir)) {
          const src = path.join(samplesDir, name);
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, path.join(distSamples, name));
          }
        }
      }
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
