# Hệ thống xác thực văn bằng trên Blockchain (bản đơn giản)

Đồ án môn **Hệ thống ảo và Khả năng mở rộng** — Trường Đại học Sài Gòn.

Blockchain tự viết bằng Node.js **không dùng thư viện ngoài** (chỉ `http`, `crypto`), giao diện web **HTML + CSS + JavaScript thuần**, mỗi vai trò một trang riêng. Cả mạng chạy trên một máy: mỗi trường là một node giữ bản sao chain ở một cổng riêng, thêm một **node backup** giữ bản sao dự phòng.

**Tài liệu hướng dẫn đầy đủ cho người mới:** [`docs/Huong-dan-he-thong-van-bang.docx`](docs/Huong-dan-he-thong-van-bang.docx).

## Giao diện React (Apple Design + shadcn/ui + Zod + JWT Auth)

| Đường dẫn | Phân quyền | Chức năng |
|---|---|---|
| `/` | Công khai | Trang tổng quan, trạng thái trực tuyến 4 node, lối vào các phân hệ |
| `/login` | Công khai | Đăng nhập JWT (`accessToken` + `refreshToken` rotation), chọn nhanh tài khoản demo |
| `/ministry` | Role `ministry` (`bo.gddt`) | Bộ GD&ĐT: cấp / gỡ quyền phát hành của các trường trên Node 1 |
| `/university` | Role `university` (`daihoc.a..c`) | Khóa chặt theo đúng Node của trường: cấp bằng PDF, đề xuất & phê duyệt thu hồi 2/3 |
| `/student` | Role `student` (`sv001`, `sv002`...) | Hồ sơ văn bằng cá nhân, tạo link chia sẻ & mã QR SVG |
| `/verify` | Công khai (không cần đăng nhập) | Nhà tuyển dụng xác minh PDF gốc (SHA-256) hoặc mở thẳng từ QR (`?cert=...`) |
| `/explorer` | Công khai (không cần đăng nhập) | Block Explorer thời gian thực 4 node, soi chi tiết Block & giả lập tự khôi phục |

### Tài khoản Demo mặc định (Mật khẩu chung: `Password@123`)
- **Bộ GD&ĐT:** `bo.gddt` (hoặc `admin`)
- **3 Trường đại học:** `daihoc.a` (Node 1), `daihoc.b` (Node 2), `daihoc.c` (Node 3)
- **Sinh viên:** `sv001`, `sv002` (hoặc bất kỳ mã `sv...` nào mới được cấp bằng)

## Chạy

Cần Node.js 22 trở lên.

**Bước 1 — Khởi tạo và chạy 4 Node Blockchain (Cửa sổ 1):**
```bash
node tools/setup.js           # sinh khóa, genesis, cấu hình 3 trường + node backup (chạy lại là xóa dữ liệu cũ)
node tools/make-pdf.js        # tạo PDF văn bằng mẫu vào web/samples/
node tools/start-local.js     # chạy 4 node REST API ở cổng 3001, 3002, 3003, 3100
```

**Bước 2 — Chạy giao diện React trên Vite (Cửa sổ 2):**
```bash
cd web
npm install                   # chỉ cần chạy lần đầu
npm run dev                   # mở http://localhost:5173
```

Kiểm thử tự động: `node tools/check.js` (7 kịch bản tích hợp qua API), `node --test` (24 bài kiểm thử lõi).

| Node | Địa chỉ | Vai trò |
|---|---|---|
| node1 | localhost:3001 | Đại học A + khóa Admin của Bộ |
| node2 | localhost:3002 | Đại học B |
| node3 | localhost:3003 | Đại học C |
| backup | localhost:3100 | Bản sao dự phòng, không có khóa |

## Node backup

Node backup giữ bản sao chain để phòng khi cả 3 trường mất dữ liệu. **Các trường tự gửi block và đẩy chain lên nó** (`POST /chain`), vì đặt trên VPS thì nó không gọi vào được máy của các trường; khi một trường mất chain, nó kéo lại từ backup rồi tự kiểm tra toàn bộ. Node backup không giữ khóa nào và tắt giả lập tấn công. Các trường đều tắt thì mở trang xác minh từ chính nó: `http://localhost:3100/tuyen-dung.html`.

**Đặt trên VPS thật** (Ubuntu, chưa chạy thử). Chạy `node tools/setup.js --backup http://IP_VPS:3100`, rồi:

```
ssh root@IP_VPS "mkdir -p /opt/vb-backup/data/node"
scp -r server web root@IP_VPS:/opt/vb-backup/
scp data/backup/config.json root@IP_VPS:/opt/vb-backup/data/node/config.json
scp deploy/vb-backup.service root@IP_VPS:/etc/systemd/system/
# trên VPS:
node -v || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs)
useradd -r -s /usr/sbin/nologin vbbackup 2>/dev/null; chown -R vbbackup /opt/vb-backup
ufw allow 3100/tcp
systemctl daemon-reload && systemctl enable --now vb-backup
journalctl -u vb-backup -n 5     # vài giây sau phải thấy "Nhận chain được đẩy tới"
```

## Cấu trúc

```
server/   chain.js (lõi blockchain), node.js (một node: API, mempool, PoA, đồng bộ HTTP), chain.test.js
web/      index.html + 5 trang vai trò (*.html, *.js), common.js, style.css, vendor/qrcode.js (thư viện QR, MIT)
tools/    setup.js, make-pdf.js, start-local.js, check.js
deploy/   vb-backup.service (systemd, cho VPS thật)
docs/     tài liệu Word, diagrams.html (nguồn các sơ đồ), img/
```

## Hạn chế

- Cả mạng trên một máy: máy hỏng là mất hết các node, trừ khi node backup nằm trên VPS.
- Khóa riêng nằm trong file cấu hình; khóa Admin chỉ ở node 1.
- PoA luân phiên: node tới lượt bị tắt thì giao dịch mới phải chờ (xác minh vẫn chạy).
- Không có cân bằng tải; đồng bộ gửi cả chain mỗi 3 giây — chỉ hợp với mạng nhỏ.
