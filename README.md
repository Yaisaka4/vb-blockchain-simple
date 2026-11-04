# Hệ thống xác thực văn bằng trên Blockchain (bản đơn giản)

Đồ án môn **Hệ thống ảo và Khả năng mở rộng** — Trường Đại học Sài Gòn.

Blockchain tự viết bằng Node.js **không dùng thư viện ngoài** (chỉ `http`, `crypto`), giao diện **HTML + CSS + JavaScript thuần**. Mỗi trường là một máy ảo giữ bản sao chain; gateway nginx phục vụ giao diện và chia tải xác minh; mở rộng bằng cách clone thêm máy ảo node chỉ đọc.

**Tài liệu hướng dẫn đầy đủ cho người mới:** [`docs/Huong-dan-he-thong-van-bang.docx`](docs/Huong-dan-he-thong-van-bang.docx)

## Chạy thử trên một máy

Cần Node.js 22 trở lên. Không cần `npm install`.

```
node tools/setup.js local     # sinh khóa, genesis, cấu hình 3 trường + 2 node chỉ đọc
node tools/make-pdf.js        # PDF văn bằng mẫu vào web/samples/
node tools/start-local.js     # chạy 5 node; mở http://localhost:3001
```

Cửa sổ khác: `node tools/check.js` (6 kịch bản demo qua API), `node --test` (20 bài kiểm thử).

## Chạy trên máy ảo

| Máy ảo | IP | Vai trò |
|---|---|---|
| gateway | 192.168.56.10 | nginx: giao diện, cân bằng tải (`deploy/nginx-vb.conf`), đo tải (`deploy/bench.sh`) |
| node1–3 | 192.168.56.11–13 | Đại học A (+ khóa Admin), B, C |
| reader1–2 | 192.168.56.21–22 | node chỉ đọc khi mở rộng |

Làm tay: Phần D của tài liệu. Tự động (VirtualBox + Vagrant):

```
node tools/setup.js vm
node tools/make-pdf.js
vagrant up gateway node1 node2 node3    # mở http://192.168.56.10
vagrant up reader1 reader2              # mở rộng, rồi thêm IP vào upstream trên gateway
node tools/check.js http://192.168.56.10
```

## Node backup trên VPS

Một node chỉ đọc chạy trên VPS ngoài Internet, giữ bản sao chain để phòng khi cả 3 trường mất dữ liệu. VPS không gọi vào được mạng riêng của các trường, nên **các trường tự gửi block và đẩy chain lên VPS** (`POST /chain`); khi một trường mất chain, nó kéo lại từ VPS. Node backup không giữ khóa nào và tắt giả lập tấn công.

```
# 1. Trên laptop: sinh cấu hình có node backup (thay IP_VPS), rồi cài lại các máy ảo
node tools/setup.js vm --backup http://IP_VPS:3100
vagrant up gateway node1 node2 node3 --provision

# 2. Chép code + cấu hình backup lên VPS
ssh root@IP_VPS "mkdir -p /opt/vb-backup/data/node"
scp -r server root@IP_VPS:/opt/vb-backup/
scp data/backup/config.json root@IP_VPS:/opt/vb-backup/data/node/config.json
scp deploy/vb-backup.service root@IP_VPS:/etc/systemd/system/

# 3. Trên VPS (ssh root@IP_VPS)
node -v || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs)
useradd -r -s /usr/sbin/nologin vbbackup 2>/dev/null; chown -R vbbackup /opt/vb-backup
ufw allow 3100/tcp
systemctl daemon-reload && systemctl enable --now vb-backup
journalctl -u vb-backup -n 5     # vài giây sau phải thấy "Nhận chain được đẩy tới"
```

Trên gateway, bỏ dấu `#` ở 2 dòng `IP_VPS` trong `/etc/nginx/sites-available/vb` (dòng `server IP_VPS:3100 backup;` — nginx chỉ chuyển sang VPS khi mọi node trong máy ảo đều không trả lời; và `location /bk/` để Block Explorer hiện cột "Backup VPS"), rồi `sudo nginx -s reload`.

## Cấu trúc

```
server/   chain.js (lõi blockchain), node.js (một node: API, mempool, PoA, đồng bộ HTTP), chain.test.js
web/      index.html, style.css, app.js, vendor/qrcode.js (thư viện QR, MIT)
tools/    setup.js, make-pdf.js, start-local.js, check.js
deploy/   nginx-vb.conf, vb-node.service (systemd), bench.sh (ab)
docs/     tài liệu Word, diagrams.html (nguồn các sơ đồ), img/
```

## Kết quả đo (trung vị 6 lần, `ab -n 2000 -c 50`, xác minh bằng PDF)

| Node phục vụ đọc | Yêu cầu/giây | Thời gian chờ TB |
|---|---|---|
| 1 | 217 | 232 ms |
| 2 | 346 | 149 ms |
| 3 | 499 | 115 ms |
| 3 + 2 chỉ đọc | 571 | 88 ms |

Cả 6 máy ảo chạy chung một laptop (Ryzen 5 4600H), nên từ 4 node trở lên số liệu dao động; xem mục E4 của tài liệu.

## Hạn chế

- Khóa riêng nằm trong file cấu hình trên máy ảo; khóa Admin chỉ ở node 1.
- PoA luân phiên: node tới lượt bị tắt thì giao dịch mới phải chờ (xác minh vẫn chạy).
- Gateway là điểm lỗi duy nhất; đồng bộ gửi cả chain mỗi 3 giây — chỉ hợp với mạng nhỏ.
