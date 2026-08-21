# 🐝 MPEduCenter-Test - Hệ Thống Thi & Kiểm Tra Trực Tuyến Chuyên Sâu Toán Học

Hệ thống kiểm tra trực tuyến MPEduCenter-Test, phân quyền 3 cấp (Admin, Giáo viên, Học sinh), hỗ trợ 4 dạng thức câu hỏi chuẩn chương trình GDPT mới, trình chiếu tương tác, vẽ nháp trực tiếp, AI chấm điểm tự luận, đồng bộ phòng thi thời gian thực và lưu trữ dữ liệu vĩnh viễn trên **Google Firebase Cloud Firestore**.

---

## 🚀 Hướng Dẫn Triển Khai Tự Động Từ AI Studio ➡️ GitHub ➡️ Firebase

Dự án đã được tích hợp đầy đủ hệ sinh thái Google (Firebase Firestore, Security Rules, GitHub Actions, Docker, Render/Cloud Run).

### Cách 1: Triển Khai Trực Tiếp Từ AI Studio Lên GitHub
1. Tại giao diện Google AI Studio, bấm vào biểu tượng **Settings (Bánh răng)** ở góc trên bên phải.
2. Chọn **Export to GitHub**.
3. Đăng nhập tài khoản GitHub và chọn tên repository (ví dụ: `edutest-pro`).
4. Bấm **Export**. Toàn bộ mã nguồn đã cấu hình sẵn Firebase và CI/CD sẽ được đồng bộ lên GitHub của bạn.

---

### Cách 2: Triển Khai Tự Động Với Render.com (Khuyên Dùng - Tự động 100% khi Push code)
1. Đăng nhập [Render.com](https://render.com) bằng tài khoản GitHub.
2. Bấm **New +** ➡️ Chọn **Blueprint** (hoặc **Web Service**).
3. Chọn kho chứa GitHub `edutest-pro` của bạn.
4. Render sẽ tự động phát hiện `render.yaml` và cấu hình lệnh build:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Trong mục **Environment Variables**, điền `GEMINI_API_KEY` (Lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey)).
6. Bấm **Apply**. Mỗi lần bạn sửa code hoặc cập nhật trên GitHub, Render sẽ **tự động deploy bản mới nhất trong 1-2 phút**!

---

### Cách 3: Triển Khai Lên Firebase Hosting
1. Cài đặt Firebase CLI trên máy tính: `npm install -g firebase-tools`
2. Đăng nhập: `firebase login`
3. Đóng gói ứng dụng: `npm run build`
4. Triển khai: `firebase deploy --only hosting,firestore:rules`
5. Trang web của bạn sẽ hoạt động ngay tại `https://gen-lang-client-0415726760.web.app`

---

## 🛠️ Phát Triển Cục Bộ (Local Development)

```bash
# 1. Cài đặt các thư viện
npm install

# 2. Tạo tệp cấu hình môi trường từ mẫu
cp .env.example .env

# 3. Chạy môi trường phát triển (Hỗ trợ hot reload)
npm run dev

# 4. Kiểm tra lỗi kiểu dữ liệu (TypeScript Lint)
npm run lint

# 5. Đóng gói bản Production
npm run build

# 6. Chạy bản đóng gói Production
npm start
```

---

## 📦 Các Tệp Cấu Hình Đã Chuẩn Bị
- `firebase-applet-config.json`: Cấu hình kết nối Firebase Firestore của dự án.
- `firestore.rules`: Luật bảo mật và phân quyền truy cập dữ liệu trên đám mây.
- `src/services/firestoreService.ts`: Lớp dịch vụ đồng bộ thời gian thực cho Đề thi, Người dùng, Bài nộp và Phòng thi.
- `.github/workflows/ci.yml`: Kịch bản GitHub Actions tự động kiểm tra code mỗi khi có commit.
- `.github/workflows/firebase-hosting-merge.yml`: Kịch bản tự động triển khai lên Firebase Hosting khi merge nhánh `main`.
- `Dockerfile` & `render.yaml` & `railway.json`: Các tệp hỗ trợ triển khai đa nền tảng.
