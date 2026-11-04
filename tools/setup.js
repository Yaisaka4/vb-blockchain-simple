// SINH KHÓA + GENESIS + CẤU HÌNH CHO CẢ MẠNG (chạy MỘT lần, rồi chép thư mục data/ sang các máy)
//   node tools/setup.js local  → 3 node trường + node backup chạy chung trên 1 máy (cổng 3001-3003, 3100)
//   node tools/setup.js vm     → 3 node trường trên máy ảo 192.168.56.11-13 (cổng 3000)
//                                + node backup trên "VPS" = máy thật 192.168.56.1:3100
//   node tools/setup.js vm --backup http://<IP VPS thật>:3100   → node backup trên VPS thật
const fs = require('fs');
const bc = require('../server/chain');

const mode = process.argv[2];
if (mode !== 'local' && mode !== 'vm') { console.log('Cách chạy: node tools/setup.js local | vm [--backup http://IP:3100]'); process.exit(1); }

const schools = ['Đại học A', 'Đại học B', 'Đại học C'];
const schoolUrls = mode === 'vm'
  ? ['192.168.56.11', '192.168.56.12', '192.168.56.13'].map((ip) => `http://${ip}:3000`)
  : [3001, 3002, 3003].map((port) => `http://localhost:${port}`);
const flag = process.argv.indexOf('--backup');
const backupUrl = flag > 0 ? process.argv[flag + 1] : mode === 'vm' ? 'http://192.168.56.1:3100' : 'http://localhost:3100';

const admin = bc.generateKeys();
const keys = schools.map(() => bc.generateKeys());
const genesis = bc.createGenesis(admin.publicKey, schools.map((name, i) => ({ name, publicKey: keys[i].publicKey })));
const salt = bc.sha256(String(Math.random())); // dùng để băm mã sinh viên, giống nhau ở mọi node

fs.rmSync('data', { recursive: true, force: true });
function writeConfig(folder, config) {
  fs.mkdirSync('data/' + folder, { recursive: true });
  fs.writeFileSync(`data/${folder}/config.json`, JSON.stringify({ ...config, salt, genesis }, null, 2));
}

schools.forEach((name, i) => writeConfig('node' + (i + 1), {
  name, port: mode === 'vm' ? 3000 : 3001 + i,
  peers: [...schoolUrls.filter((u, j) => j !== i), backupUrl], // gửi block + đẩy chain lên cả node backup
  privateKey: keys[i].privateKey,
  ...(i === 0 ? { adminKey: admin.privateKey } : {}), // chỉ node 1 (máy của Bộ GD&ĐT) giữ khóa Admin
}));

// Node backup (trên VPS): không khóa, không peer — nó không gọi vào được mạng riêng của các trường,
// các trường tự gửi block và đẩy chain lên cho nó. Tắt giả lập tấn công vì nó nằm trên Internet.
writeConfig('backup', { name: 'Backup VPS', readonly: true, noDebug: true, port: Number(new URL(backupUrl).port) || 3100, peers: [] });

// Địa chỉ các node cho giao diện web. Trên máy ảo, trang web gọi qua nginx (/n1, /api, /bk) nên dùng đường dẫn tương đối.
const web = mode === 'vm'
  ? { api: '/api', schools: ['/n1', '/n2', '/n3'], backup: '/bk' }
  : { api: schoolUrls[0], schools: schoolUrls, backup: backupUrl };
fs.writeFileSync('web/config.js', `// Sinh bởi tools/setup.js ${mode}\nconst NET = ${JSON.stringify(web, null, 2)};\n`);

console.log(`Đã tạo data/ (chế độ ${mode}) và web/config.js — node backup: ${backupUrl}`);
console.log(fs.readdirSync('data').map((f) => '  data/' + f).join('\n'));
