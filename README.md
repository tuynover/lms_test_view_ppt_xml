# WebPPT - Universal Client-Side PowerPoint Presentation Viewer

Trình duyệt và phát bài giảng PowerPoint (.pptx, .zip) trực tiếp 100% trên trình duyệt bằng đồ họa Vector SVG & WebAssembly, không cần máy chủ chuyển đổi sang HTML5 tĩnh.

![WebPPT Banner](https://img.shields.io/badge/Engine-WebAssembly%20%2B%20DrawingML-38bdf8)
![Zero Server](https://img.shields.io/badge/Backend-Zero%20Server%20(Pure%20Client)-10b981)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue)

---

## 🌟 Điểm nổi bật & Tính năng

1. **100% Client-Side (Pure Browser):**
   - Phân tích gói OOXML (Open Packaging Conventions) hoàn toàn trong RAM trình duyệt thông qua Web Worker và JSZip.
   - Không upload file lên bất kỳ máy chủ nào — bảo mật tuyệt đối 100% cho bài giảng và tài liệu nội bộ.

2. **Dựng hình học Vector SVG chuẩn 1:1:**
   - Hỗ trợ đầy đủ 144 presets hình học ECMA-376 DrawingML và đường cong Bézier tự do (`<a:custGeom>`).
   - Tự động tính toán ma trận xoay góc, lồng nhóm khối (`<p:grpSp>`), khắc phục hoàn toàn tình trạng vỡ layout hoặc méo khối.

3. **Tự động giải nén Font nhúng (.fntdata):**
   - Tích hợp `mtx-decompressor` giải nén trực tiếp font nén MicroType Express của Microsoft thành TrueType (.ttf) trong bộ nhớ và nạp vào `@font-face`.
   - Giữ nguyên 100% font chữ thiết kế gốc tiếng Việt mà không cần cài font lên hệ điều hành.

4. **Phát Video MP4 & Audio trực tiếp:**
   - Tự động trích xuất stream media nhúng trong bài giảng thành Blob URL.
   - Nhúng trình phát `<video controls>` lồng trong `<foreignObject>` SVG, hỗ trợ phát mượt mà chất lượng cao (H.264 phần cứng).

5. **Giao diện hiện đại & Đầy đủ tính năng trình chiếu:**
   - Thanh dock nổi (Floating Dock): Chuyển slide trước/sau, chạy animation theo từng bước (`Space`), toàn màn hình (`F`), nhảy nhanh tới slide có Media.
   - Sidebar danh sách slide thu gọn / mở rộng linh hoạt.
   - Hỗ trợ kéo & thả (Drag and Drop) bất kỳ file PPTX/ZIP nào từ thiết bị.

---

## 🚀 Hướng Dẫn Deploy Lên GitHub Pages

Dự án đã được cấu hình sẵn GitHub Actions workflow tại [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Bước 1: Kích hoạt GitHub Pages trên Repository
1. Truy cập vào repository của bạn trên GitHub: `https://github.com/tuynover/test_log`
2. Vào tab **Settings** ➔ Mục **Pages** (ở menu bên trái).
3. Tại phần **Build and deployment** ➔ **Source**: Chọn **`GitHub Actions`**.

### Bước 2: Đẩy code lên nhánh `main`
Mỗi khi bạn commit và push lên nhánh `main`, GitHub Actions sẽ tự động cài đặt dependency, build ứng dụng và deploy lên GitHub Pages:

```bash
git add .
git commit -m "feat: deploy modern WebPPT viewer to GitHub Pages"
git push origin main
```

### Bước 3: Truy cập ứng dụng trực tuyến
Sau khi GitHub Actions chạy xong (~1 phút), trang web sẽ sẵn sàng tại:
```
https://tuynover.github.io/test_log/
```

---

## 💻 Hướng Dẫn Chạy & Phát Triển Cục Bộ (Local)

### Cài đặt môi trường:
Yêu cầu Node.js >= 18.

```bash
# Di chuyển vào thư mục viewer
cd viewer-webppt

# Cài đặt thư viện
npm install

# Khởi chạy server phát triển (Dev server)
npm run dev
```
Trình duyệt sẽ tự động mở tại `http://localhost:5173/`.

### Build sản phẩm tĩnh (Production Build):
```bash
npm run build
```
Thư mục `dist/` chứa toàn bộ mã nguồn tĩnh (HTML, CSS, JS, Assets và bài giảng mẫu) sẵn sàng tải lên bất kỳ host tĩnh nào (GitHub Pages, Vercel, Netlify, Cloudflare Pages, S3).

---

## ⌨️ Phím Tắt Trình Chiếu

| Phím | Chức năng |
| :--- | :--- |
| <kbd>Space</kbd> / <kbd>→</kbd> / <kbd>PageDown</kbd> | Chạy bước animation kế tiếp / Chuyển slide sau |
| <kbd>←</kbd> / <kbd>PageUp</kbd> | Quay lại slide trước |
| <kbd>F</kbd> / <kbd>F11</kbd> | Bật / tắt chế độ toàn màn hình (Fullscreen) |
| <kbd>Esc</kbd> | Thoát toàn màn hình / Đóng modal trợ giúp |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions workflow tự động deploy lên GitHub Pages
├── viewer-webppt/          # Ứng dụng WebPPT Client
│   ├── index.html          # Giao diện chính (Welcome Screen + Presentation Stage)
│   ├── vite.config.js      # Cấu hình Vite với base relative './' cho GitHub Pages
│   ├── package.json        # Dependencies (@web-ppt/core, mtx-decompressor, ...)
│   ├── public/samples/     # Các bài giảng mẫu siêu nhẹ (<50KB)
│   │   ├── sample-media.pptx       # Mẫu kèm Video MP4 & Audio
│   │   └── showcase-shapes.pptx    # Mẫu kiểm thử 144 Presets hình khối
│   └── src/
│       ├── main.js         # Logic parser, decompressor, viewer controls & events
│       └── style.css       # Giao diện Dark-Mode SaaS UI hiện đại
└── README.md
```
