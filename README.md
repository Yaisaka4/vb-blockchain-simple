# Hệ thống xác thực văn bằng trên Blockchain (EduChain)

Đồ án môn **Hệ thống ảo và Khả năng mở rộng dữ liệu** — Trường Đại học Sài Gòn.

Hệ thống xây dựng mạng **Blockchain liên trường riêng** bằng **Node.js thuần** (chỉ dùng các module có sẵn `crypto`, `http`, `fs`, `node:test` — không phụ thuộc thư viện blockchain hay JWT bên ngoài), kết hợp giao diện web một trang (**React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui**), kiểm tra dữ liệu đầu vào bằng **Zod** và quản lý phiên xác thực **JWT Access Token + Refresh Token Rotation**.

Mạng demo local chạy trên một máy gồm **3 nút trường đại học** (luân phiên đóng khối theo cơ chế **Proof of Authority — PoA**) và **1 nút dự phòng chỉ đọc (Backup Node)** giữ bản sao chuỗi để phục vụ tra cứu khi các nút trường gặp sự cố.

- **Tài liệu hướng dẫn hệ thống & đọc hiểu mã nguồn:** [`docs/Huong-dan-he-thong-van-bang.docx`](docs/Huong-dan-he-thong-van-bang.docx) *(bản đồng bộ: [`docs/Huong-dan-he-thong-van-bang-MOI.docx`](docs/Huong-dan-he-thong-van-bang-MOI.docx))*
- **Kịch bản trình diễn (Demo local 7 bước):** [`docs/Kich-ban-demo.docx`](docs/Kich-ban-demo.docx)

---

## Giao diện React & Phân quyền theo Vai trò

| Đường dẫn | Phân quyền | Chức năng chính |
|---|---|---|
| `/` | Công khai | Trang tổng quan, theo dõi trực tuyến 4 nút mạng, lối vào các phân hệ |
| `/login` | Công khai | Đăng nhập JWT (`HS256` + xoay vòng Refresh Token), chọn nhanh tài khoản mẫu, chế độ demo 20 giây |
| `/ministry` | Vai trò `ministry` (`bo.gddt`) | Bộ GD&ĐT: cấp / gỡ quyền phát hành văn bằng của các trường trên Node 1 (khóa Admin) |
| `/university` | Vai trò `university` (`daihoc.a..c`) | Khóa chặt vào đúng Node của trường: ký cấp văn bằng PDF (`ISSUE`), đề xuất & bỏ phiếu thu hồi đa chữ ký 2/3 |
| `/student` | Vai trò `student` (`sv001`, `sv002`…) | Hồ sơ văn bằng cá nhân gắn cứng theo mã sinh viên đăng nhập, tạo liên kết chia sẻ & mã QR SVG |
| `/verify` | Công khai (không cần đăng nhập) | Nhà tuyển dụng xác minh tệp PDF gốc bằng mã băm `SHA-256` hoặc tra cứu nhanh qua liên kết / mã QR (`?cert=...`) |
| `/explorer` | Công khai (không cần đăng nhập) | Block Explorer thời gian thực của 4 nút, soi `SHA-256`, `merkleRoot`, JSON giao dịch & mô phỏng tự khôi phục khi dữ liệu bị sửa |

### Tài khoản Demo mặc định (Mật khẩu chung: `Password@123`)

- **Bộ Giáo dục & Đào tạo:** `bo.gddt` (hoặc `admin`)
- **3 Trường đại học:** `daihoc.a` (Node 1), `daihoc.b` (Node 2), `daihoc.c` (Node 3)
- **Sinh viên:** `sv001` (Nguyễn Văn An — `SV001`), `sv002` (Trần Thị Bình — `SV002`), hoặc bất kỳ mã `sv...` nào vừa được cấp văn bằng

---

## Hướng dẫn chạy Local (2 Terminal)

Yêu cầu cài đặt **Node.js 22 trở lên**.

### Terminal 1 — Khởi tạo mạng & chạy 4 Node Blockchain (tại thư mục gốc)

```bash
node tools/setup.js           # sinh khóa ECDSA, genesis, salt và cấu hình 4 node vào data/ + web/config.js
node tools/make-pdf.js        # sinh 5 tệp PDF văn bằng & biên bản mẫu vào web/samples/
node tools/start-local.js     # khởi chạy 4 node REST API tại cổng 3001, 3002, 3003 và 3100
```

> **Lưu ý:**
> - `node tools/setup.js` chỉ chạy **lần đầu tiên** hoặc khi muốn đặt lại mạng trống từ `Block #0` (chạy lại lệnh này sẽ xóa toàn bộ chuỗi và khóa cũ trong `data/`). Những lần bật lại sau chỉ cần chạy `node tools/start-local.js`.
> - Cần chạy `node tools/make-pdf.js` ít nhất một lần để tạo thư mục `web/samples/` phục vụ các nút tải nhanh tệp PDF mẫu trên giao diện `/university` và `/verify`.

### Terminal 2 — Chạy giao diện React trên Vite

```bash
cd web
npm install                   # hoặc npm ci (chỉ cần chạy lần đầu)
npm run dev                   # mở trình duyệt tại http://localhost:5173
```

*(Tuỳ chọn)* Nếu muốn chính tiến trình Node phục vụ trực tiếp giao diện React mà không cần bật Vite dev server: chạy `cd web && npm run build` để xuất bản tĩnh vào `web/dist/`, sau đó mở trực tiếp từ cổng nút (ví dụ `http://localhost:3001` hoặc `http://localhost:3100/verify`).

### Các nút trong mạng Local

| Nút | Địa chỉ | Vai trò & Khóa nắm giữ |
|---|---|---|
| `node1` | `http://localhost:3001` | Đại học A + Khóa Admin của Bộ GD&ĐT |
| `node2` | `http://localhost:3002` | Đại học B |
| `node3` | `http://localhost:3003` | Đại học C |
| `backup` | `http://localhost:3100` | Bản sao dự phòng chỉ đọc (`readonly`), không giữ khóa ký, tắt giả lập sửa dữ liệu (`noDebug`) |

---

## Kiểm thử Hệ thống

### 1. Kiểm thử tự động bằng dòng lệnh

```bash
node --test server/chain.test.js   # 24/24 bài kiểm thử đơn vị lõi blockchain (SHA-256, Merkle, ECDSA, PoA, thu hồi 2/3)
node tools/check.js                # 7/7 kịch bản tích hợp qua REST API (yêu cầu đang bật 4 node ở Terminal 1)
```

### 2. Luồng kiểm thử nhanh 7 bước trên giao diện (`http://localhost:5173`)

1. **Xác thực JWT & Xoay vòng Refresh Token:** Tại `/login`, chọn thẻ `Bộ GD&ĐT (bo.gddt)`, bật công tắc **Demo xoay vòng JWT nhanh (20 giây)** → Đăng nhập. Mở menu góc phải trên → **Phiên JWT & Refresh**, quan sát đồng hồ đếm ngược tự động xoay vòng cấp cặp token mới và tăng bộ đếm.
2. **Cấp quyền phát hành & Chặn trường chưa có quyền:** Tại `/ministry`, bấm **Cấp quyền phát hành** cho **Đại học A** (chờ ~5 giây đóng Block PoA). Chuyển sang tài khoản **Đại học C (`daihoc.c`)** → thấy cảnh báo chưa có quyền và nút phát hành bị khóa (**Chưa được Bộ GD&ĐT cấp quyền**).
3. **Kiểm tra biểu mẫu Zod & Cấp văn bằng (`ISSUE`):** Đăng nhập **Đại học A (`daihoc.a`)**, thử nhập `@#$` vào ô mã văn bằng để kiểm tra báo lỗi Zod tức thì. Nhập chuẩn `VB2026-001`, mã sinh viên `SV001`, đính kèm tệp mẫu `VB2026-001.pdf` → bấm **Ký số & Ghi nhận bởi Đại học A** → chờ ~5 giây sang tab **Đã cấp (1)** thấy trạng thái **Hợp lệ**.
4. **Phân quyền Sinh viên & Chia sẻ Mã QR:** Đăng nhập **Nguyễn Văn An (`sv001`)** tại `/student` → giao diện khóa cứng mã `SV001`, hiển thị thẻ `VB2026-001`. Bấm **Tạo Liên kết & Mã QR** → **Mở trang Xác minh** (`/verify?cert=VB2026-001`).
5. **Nhà tuyển dụng xác minh công khai (không cần đăng nhập):** Trên `/verify?cert=VB2026-001`, xem kết quả tra cứu mã tự động; tiếp tục kéo thả vào **Cách 1 (PDF)** lần lượt `VB2026-001.pdf` (báo xanh **Văn bằng Hợp lệ & Nguyên vẹn**) và `VB2026-001-da-sua.pdf` (sửa GPA → báo đỏ **Không tìm thấy trên Blockchain**).
6. **Thu hồi đa chữ ký 2/3 liên trường:** Đăng nhập `daihoc.a` → tab **Thu hồi & Phê duyệt 2/3**, chọn `VB2026-001`, đính kèm `bien-ban-gian-lan.pdf` → **Gửi Yêu cầu Thu hồi** (trạng thái `1/2 trường`, xác minh vẫn hợp lệ kèm cảnh báo chờ duyệt). Chuyển sang **Đại học B (`daihoc.b`)** → bấm tên tệp biên bản để xem bằng chứng gốc rồi bấm **Chấp nhận** → xác minh lại `VB2026-001.pdf` chuyển sang màu vàng cam **Văn bằng Đã bị Thu hồi** (ghi rõ `Đại học B` đồng thuận).
7. **Block Explorer & Tự khôi phục khi dữ liệu bị sửa trộm:** Mở `/explorer`, bấm vào một Block để soi `SHA-256`, `prevHash`, `merkleRoot` và JSON giao dịch. Bật **Demo Kiểm thử Tự phục hồi** → bấm **Giả lập Sửa trộm Dữ liệu** ở thẻ **Đại học B** → thẻ hóa ĐỎ (**Bị sửa!** do lệch Merkle root), sau khoảng 6–10 giây tự động đồng bộ lại chuỗi hợp lệ từ các nút lành và hóa XANH (**Đồng bộ**) trở lại.

---

## Node Backup (Dự phòng chỉ đọc)

Node backup (`localhost:3100`) giữ bản sao chuỗi để đảm bảo khả năng tra cứu/xác minh khi các nút trường ngừng hoạt động và giúp các nút trường khôi phục chuỗi khi mất dữ liệu cục bộ:

- **Mô hình đẩy (Push):** Các nút trường chủ động phát tán khối mới (`POST /blocks`) và đẩy chuỗi đầy đủ (`POST /chain`) sang nút backup, nên nút backup đặt ngoài Internet (VPS) không cần mở kết nối ngược vào mạng nội bộ của các trường.
- **Không cần đặt niềm tin vào nút backup:** Nút backup không giữ khóa riêng nào; mọi nút khi nhận chuỗi từ backup đều tự kiểm tra lại từ `genesis`, `prevHash`, `merkleRoot` và chữ ký ECDSA của từng khối/giao dịch.
- **Thử nghiệm dự phòng trên Local:** Sau khi đã có dữ liệu đồng bộ ở cả 4 nút (và đã chạy `cd web && npm run build`), có thể dừng 3 tiến trình trường (`node1..3`), chỉ giữ riêng `node server/node.js data/backup` rồi mở `http://localhost:3100/verify` — việc xác minh văn bằng vẫn hoạt động bình thường.

**Triển khai mẫu nút backup trên VPS Ubuntu (tuỳ chọn):**
Chạy `node tools/setup.js --backup http://IP_VPS:3100` và `cd web && npm run build` ở máy khởi tạo, sau đó:

```bash
ssh root@IP_VPS "mkdir -p /opt/vb-backup/data/node"
scp -r server web root@IP_VPS:/opt/vb-backup/
scp data/backup/config.json root@IP_VPS:/opt/vb-backup/data/node/config.json
scp deploy/vb-backup.service root@IP_VPS:/etc/systemd/system/
# Trên VPS Ubuntu:
node -v || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs)
useradd -r -s /usr/sbin/nologin vbbackup 2>/dev/null; chown -R vbbackup /opt/vb-backup
ufw allow 3100/tcp
systemctl daemon-reload && systemctl enable --now vb-backup
journalctl -u vb-backup -n 5
```

---

## Cấu trúc Thư mục

```text
server/   chain.js (lõi blockchain: SHA-256, canonical JSON, ECDSA, Merkle, PoA, luật giao dịch)
          node.js (máy chủ HTTP/REST, mempool, đồng bộ 3 chiều, JWT Auth & Refresh Rotation)
          chain.test.js (24 bài kiểm thử đơn vị lõi)
web/      Ứng dụng giao diện React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui:
          src/pages/ (HomePage, LoginPage, MinistryPage, UniversityPage, StudentPage, VerifyPage, ExplorerPage)
          src/components/ (AppLayout, ProtectedRoute, CertificateResultCard, BlockWaitBanner, UI primitives)
          src/contexts/AuthContext.tsx (quản lý phiên JWT & tự động xoay vòng token)
          src/lib/ (api.ts, network.ts, schemas.ts — 6 lược đồ Zod, notify.ts, utils.ts)
tools/    setup.js (sinh khóa & genesis), make-pdf.js (tạo PDF mẫu), start-local.js (chạy 4 node), check.js (7 test tích hợp)
deploy/   vb-backup.service (tệp dịch vụ systemd mẫu cho nút dự phòng trên Ubuntu)
docs/     Tài liệu hướng dẫn (.docx), kịch bản demo (.docx), diagrams.html (nguồn sơ đồ SVG), img/
```

---

## Hạn chế hiện tại & Hướng phát triển

- **Môi trường mạng demo:** Bốn nút hiện chạy chung trên một máy local qua HTTP thuần; khóa riêng lưu trong `data/*/config.json` (đã loại trừ khỏi Git qua `.gitignore`). Khi triển khai thực tế cần tách máy vật lý/VPS riêng cho từng trường, bật HTTPS/TLS qua reverse proxy và bảo vệ khóa trong HSM/KMS.
- **Đồng thuận PoA luân phiên:** Chưa có cơ chế timeout bỏ lượt tự động — nếu nút trường đang tới lượt đóng khối bị tắt, giao dịch ghi mới sẽ chờ trong mempool tới khi nút đó hoạt động lại (luồng đọc và xác minh công khai vẫn hoạt động bình thường).
- **Phân quyền ở tầng API & quản lý phiên:** Giao diện React đã kiểm soát truy cập bằng JWT + `ProtectedRoute`, tuy nhiên các endpoint nghiệp vụ ở máy chủ cần bổ sung middleware bắt buộc kiểm tra vai trò JWT, đồng thời chuyển danh sách thu hồi `refreshToken` từ bộ nhớ RAM từng nút sang kho lưu trữ dùng chung.
