# HK RENDER TIME LOGGER - Web Edition

> Ứng dụng web chuyên dụng để đo thời gian render (Stopwatch / Timestamp logger), tự động tính toán các tỉ lệ hiệu năng, phân tích dữ liệu và đưa ra đề xuất tối ưu hóa quy trình render, hỗ trợ xuất file Excel chuẩn template HK RENDER TIME LOGGER.

---

## 🚀 Các Tính Năng Nổi Bật

1. **1-Click / Spacebar Fast Render Logger**:
   - **Click lần đầu (hoặc nhấn Spacebar)**: Ghi nhận thời điểm bắt đầu theo định dạng chuẩn `dd/mm/yyyy hh:mm:ss`, đồng hồ bấm giờ (Live Stopwatch) chạy trực tiếp từng tích tắc (100ms).
   - **Click lần sau (hoặc nhấn Spacebar)**: Ghi nhận thời điểm kết thúc, tự động tính ra số giây render chính xác cho từng file.
   - Thao tác nhanh cho từng dòng hoặc nút bấm tổng ở thanh Hero.
2. **Thống Kê & Tính Toán Tỉ Lệ Đầy Đủ**:
   - Số file đã hoàn tất / tổng số file.
   - Thời gian render trung bình (giây).
   - File render nhanh nhất (Min seconds) & File chậm nhất (Max seconds).
   - Tổng thời gian render tích lũy (giây & quy đổi ra Phút/Giờ làm việc).
   - Tỉ lệ phần trăm so với mức trung bình (+X% / -X% TB) trên từng file.
   - Điểm số ổn định quy trình render (Stability Score %).
   - Biểu đồ phân bổ thời gian: Siêu nhanh (<20s), Tiêu chuẩn (20-50s), Dài (50-100s), Nặng (>100s).
3. **Phân Tích File & Đề Xuất Thông Minh (Smart Suggestions)**:
   - Tự động phát hiện file bị nghẽn cổ chai (Bottleneck) khi vượt quá 40% thời gian trung bình.
   - Cảnh báo hiện tượng Thermal Throttling / Rò rỉ RAM (Memory Leak) nếu thời gian render các file sau tăng dần.
   - Dự báo thời gian hoàn thành (ETA Forecast) cho các file còn lại trong danh sách.
   - Lời khuyên thiết lập phần cứng (Hardware Acceleration NVENC/QuickSync/Metal, Cache Purge, Proxy workflow).
4. **Xuất File Excel Chuẩn Template**:
   - Xuất file `.xlsx` định dạng đẹp mắt theo đúng 100% template gốc **HK RENDER TIME LOGGER**:
     - Cột: STT, Enter BẮT ĐẦU, Thời điểm bắt đầu, Enter KẾT THÚC, Thời điểm kết thúc, Render (giây), Ghi chú.
     - Khối bảng thống kê tổng kết bên dưới.
     - Khối Hướng dẫn & Mã VBA tham khảo.
     - Thêm Sheet 2: "Phân Tích & Đề Xuất" chi tiết.
5. **Tự Động Lưu Trữ (Auto-save)**:
   - Dữ liệu lưu vào `localStorage`, không lo bị mất dữ liệu khi vô tình F5 hoặc tắt trình duyệt.
   - Có nút nạp Dữ liệu Demo trực quan và Nhập file CSV cũ.

---

## 🛠️ Hướng Dẫn Chạy Thử Trên Máy Local

1. Mở terminal tại thư mục `render-logger-web`:
   ```bash
   cd render-logger-web
   npm install
   npm run dev
   ```
2. Mở trình duyệt tại đường dẫn `http://localhost:5173`.

---

## 🌐 Hướng Dẫn Triển Khai (Deploy) Lên GitHub Pages

### Cách 1: Tự Động Hóa 100% Qua GitHub Actions (Khuyên dùng)
File workflow `.github/workflows/deploy.yml` đã được cấu hình sẵn. Bạn chỉ cần:
1. Đẩy code lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy HK Render Logger"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
   git push -u origin main
   ```
2. Trên GitHub, vào repository của bạn:
   - Vào **Settings** -> Mục bên trái chọn **Pages**.
   - Tại phần **Build and deployment** -> **Source**: Chọn **GitHub Actions**.
3. GitHub Actions sẽ tự động kích hoạt build và cấp link trang web tại:
   `https://<tai-khoan>.github.io/<ten-repo>/`

---

### Cách 2: Deploy Bằng 1 Lệnh CLI (`gh-pages`)
Nếu bạn muốn tự publish nhánh `gh-pages` từ máy tính:
1. Mở file `package.json`, sửa lại `"homepage"` khớp với username và repo của bạn:
   ```json
   "homepage": "https://<tai-khoan>.github.io/<ten-repo>"
   ```
2. Chạy lệnh deploy:
   ```bash
   npm run deploy
   ```
   *(Lệnh này sẽ tự động build ra thư mục `dist` và đẩy lên nhánh `gh-pages` của GitHub)*.
3. Vào **Settings** -> **Pages** trên GitHub -> Chọn nhánh **gh-pages** -> Nhấn **Save**.

---

## 🌐 Hướng Dẫn Triển Khai Lên Vercel Hoặc Render

### Cách 1: Triển Khai Lên Vercel (Khuyên dùng - Nhanh nhất)
1. Đẩy code lên GitHub repository của bạn:
   ```bash
   git init
   git add .
   git commit -m "HK Render Logger Web App"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
   git push -u origin main
   ```
2. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
3. Nhấn **Add New Project** -> Chọn repository vừa đẩy.
4. Cấu hình:
   - **Framework Preset**: Vite
   - **Root Directory**: `render-logger-web` (nếu bạn để repo ở thư mục ngoài) hoặc `./` (nếu repo là chính thư mục này).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Nhấn **Deploy** -> Chỉ sau 30 giây bạn sẽ có đường link web miễn phí vĩnh viễn (ví dụ: `https://hk-render-logger.vercel.app`).

*(File `vercel.json` đã được tạo sẵn để tránh lỗi 404).*

---

### Cách 2: Triển Khai Lên Render.com (Render Static Site)
1. Đăng nhập [render.com](https://render.com).
2. Nhấn **New +** -> Chọn **Static Site**.
3. Kết nối với GitHub repo của bạn.
4. Cấu hình các thông số:
   - **Name**: `hk-render-logger`
   - **Build Command**: `npm run build` (hoặc `npm install && npm run build`)
   - **Publish Directory**: `dist`
5. Nhấn **Create Static Site** -> Render sẽ tự động build và cung cấp link truy cập miễn phí dạng `https://hk-render-logger.onrender.com`.

*(File `render.yaml` đã được thiết lập sẵn trong mã nguồn).*
# test_log
