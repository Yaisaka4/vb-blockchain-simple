// CHẠY CẢ MẠNG TRÊN 1 MÁY: node tools/start-local.js
// Cần chạy "node tools/setup.js" trước. Ctrl+C để tắt hết.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

function setupRequired(message) {
  console.error(message);
  console.error('Tại thư mục dự án, chạy lần lượt:\n  node tools/setup.js\n  node tools/start-local.js');
  console.error('Lưu ý: setup.js sinh khóa và cấu hình mới, đồng thời xóa dữ liệu blockchain cũ.');
  process.exit(1);
}

if (!fs.existsSync(dataDir)) {
  setupRequired('Chưa có thư mục data/. Cần khởi tạo mạng blockchain trước khi chạy.');
}

const folders = fs.readdirSync(dataDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
if (!folders.length) setupRequired('Thư mục data/ chưa có cấu hình node.');

const missing = folders.filter((folder) => !fs.existsSync(path.join(dataDir, folder, 'config.json')));
if (missing.length) {
  setupRequired('Thiếu cấu hình: ' + missing.map((folder) => `data/${folder}/config.json`).join(', '));
}

for (const folder of folders) {
  const child = spawn(process.execPath, ['server/node.js', path.join(dataDir, folder)], { cwd: rootDir });
  const print = (d) => d.toString().trim().split('\n').forEach((line) => console.log(folder.padEnd(8) + '| ' + line));
  child.stdout.on('data', print);
  child.stderr.on('data', print);
}
if (!fs.existsSync(path.join(rootDir, 'web', 'samples', 'VB2026-001.pdf'))) {
  spawn(process.execPath, ['tools/make-pdf.js'], { cwd: rootDir, stdio: 'inherit' });
}
console.log('Giao diện React: chạy npm run dev trong thư mục web, rồi mở http://localhost:5173');
