# Hệ thống xác thực văn bằng trên Blockchain (bản đơn giản)

Đồ án môn **Hệ thống ảo và Khả năng mở rộng** — Trường Đại học Sài Gòn.

Blockchain tự viết bằng Node.js **không dùng thư viện ngoài** (chỉ `http`, `crypto`), giao diện web **HTML + CSS + JavaScript thuần**, mỗi vai trò một trang riêng. Mỗi trường là một máy ảo giữ bản sao chain; gateway nginx phục vụ giao diện và chia tải xác minh; một **node backup trên VPS** giữ thêm một bản sao ngoài mạng của các trường.

**Tài liệu hướng dẫn đầy đủ cho người mới:** [`docs/Huong-dan-he-thong-van-bang.docx`](docs/Huong-dan-he-thong-van-bang.docx) — đọc kèm [`docs/Huong-dan-phien-ban-2.docx`](docs/Huong-dan-phien-ban-2.docx) (giao diện theo vai trò, thu hồi có bằng chứng và duyệt, node backup trên VPS).

## Giao diện theo vai trò

| Trang | Vai trò | Làm gì |
|---|---|---|
| `index.html` | — | Trang chủ: chọn vai trò |
| `bo.html` | Bộ GD&ĐT | Cấp / gỡ quyền phát hành của các trường |
| `truong.html` | Trường đại học | Chọn trường, cấp và thu hồi văn bằng, xem văn bằng đã cấp |
| `sinh-vien.html` | Sinh viên | Tra văn bằng bằng mã SV, tạo link + QR |
| `tuyen-dung.html` | Nhà tuyển dụng | Xác minh bằng file PDF hoặc mã văn bằng (mở thẳng từ link/QR) |
| `explorer.html` | Kỹ thuật | Chain trên từng máy: 3 trường + backup |

## Chạy thử trên một máy

Cần Node.js 22 trở lên. Không cần `npm install`.

```
node tools/setup.js local     # sinh khóa, genesis, cấu hình 3 trường + node backup
node tools/make-pdf.js        # PDF văn bằng mẫu vào web/samples/
node tools/start-local.js     # chạy 4 node; mở http://localhost:3001
```

Cửa sổ khác: `node tools/check.js` (6 kịch bản demo qua API), `node --test` (20 bài kiểm thử).

## Chạy trên máy ảo + VPS

| Máy | IP | Vai trò |
|---|---|---|
| gateway (VM) | 192.168.56.10 | nginx: giao diện, cân bằng tải (`deploy/nginx-vb.conf`), đo tải (`deploy/bench.sh`) |
| node1–3 (VM) | 192.168.56.11–13 | Đại học A (+ khóa Admin), B, C |
| VPS | mặc định 192.168.56.1:3100 = chính máy thật (chạy thử) | node backup |

Làm tay: Phần D của tài liệu. Tự động (VirtualBox + Vagrant):

```
node tools/setup.js vm                     # VPS thật: thêm --backup http://IP_VPS:3100
node tools/make-pdf.js
vagrant up --provision                     # mở http://192.168.56.10
node tools/check.js http://192.168.56.10
```

## Node backup trên VPS

Node backup giữ bản sao chain để phòng khi cả 3 trường mất dữ liệu. VPS không gọi vào được mạng riêng của các trường, nên **các trường tự gửi block và đẩy chain lên VPS** (`POST /chain`); khi một trường mất chain, nó kéo lại từ VPS. Node backup không giữ khóa nào và tắt giả lập tấn công. Trên gateway, nginx dùng nó làm máy dự phòng (`server … backup;`): chỉ khi cả 3 trường đều không trả lời mới chuyển yêu cầu xác minh sang VPS.

**Chạy thử với máy thật làm VPS** (Windows, cổng 3100 phải mở trên tường lửa):

```
mkdir C:\vb-vps\data\node
xcopy /E /I server C:\vb-vps\server
copy data\backup\config.json C:\vb-vps\data\node\config.json
cd C:\vb-vps
node server/node.js data/node
```

**VPS thật** (Ubuntu). Chạy `setup.js vm --backup http://IP_VPS:3100`, cài lại máy ảo, đổi `192.168.56.1` thành `IP_VPS` trong `deploy/nginx-vb.conf` trước khi provision gateway, rồi:

```
ssh root@IP_VPS "mkdir -p /opt/vb-backup/data/node"
scp -r server root@IP_VPS:/opt/vb-backup/
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
deploy/   nginx-vb.conf, vb-node.service, vb-backup.service (systemd), bench.sh (ab)
docs/     tài liệu Word, diagrams.html (nguồn các sơ đồ), img/
```

## Kết quả đo (trung vị 6 lần, `ab -n 2000 -c 50`, xác minh bằng PDF)

| Node phục vụ đọc | Yêu cầu/giây | Thời gian chờ TB |
|---|---|---|
| 1 | 217 | 232 ms |
| 2 | 346 | 149 ms |
| 3 | 499 | 115 ms |

Đo trước khi bỏ node chỉ đọc; cả các máy ảo chạy chung một laptop (Ryzen 5 4600H). Xem mục E4 của tài liệu.

## Hạn chế

- Khóa riêng nằm trong file cấu hình trên máy ảo; khóa Admin chỉ ở node 1.
- PoA luân phiên: node tới lượt bị tắt thì giao dịch mới phải chờ (xác minh vẫn chạy).
- Gateway là điểm lỗi duy nhất; đồng bộ gửi cả chain mỗi 3 giây — chỉ hợp với mạng nhỏ.
