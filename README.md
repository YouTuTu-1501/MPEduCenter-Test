# 🐝 MPEduCenter-Test - Hệ Thống Thi & Kiểm Tra Trực Tuyến Chuyên Sâu Toán Học

Hệ thống kiểm tra trực tuyến MPEduCenter-Test, phân quyền 3 cấp (Admin, Giáo viên, Học sinh), hỗ trợ 4 dạng thức câu hỏi chuẩn chương trình GDPT mới, trình chiếu tương tác, vẽ nháp trực tiếp, AI chấm điểm tự luận, đồng bộ phòng thi thời gian thực và lưu trữ dữ liệu vĩnh viễn trên **Google Firebase Cloud Firestore**.

---

## 🚀 Các Phương Thức Triển Khai Tự Động Trực Tiếp

### 🌟 Cách 1: Tự Động Triển Khai Miễn Phí 100% Qua GitHub Pages (Không Cần Render.com)

Dự án đã tích hợp sẵn kịch bản **GitHub Actions** (`.github/workflows/deploy-github-pages.yml`). Khi bạn đẩy code lên GitHub, GitHub sẽ tự động build và chạy trang web miễn phí.

**Cách bật GitHub Pages chỉ trong 3 bước:**
1. Xuất mã nguồn lên GitHub: Tại AI Studio, bấm **Settings (Bánh răng)** ➡️ chọn **Export to GitHub**.
2. Mở Repository trên GitHub của bạn ➡️ vào tab **Settings** ➡️ chọn mục **Pages** ở thanh menu bên trái.
3. Ở phần **Build and deployment** ➡️ **Source**, chọn **GitHub Actions**.
4. 🎉 **Xong!** Mỗi lần bạn cập nhật mã nguồn, GitHub sẽ tự động build và tạo đường dẫn web trực tiếp dạng:
   `https://<ten-tai-khoan-github>.github.io/<ten-repo>/`

---

### 🌟 Cách 2: Triển Khai Qua Firebase Hosting (Google Cloud)
1. Cài đặt Firebase CLI trên máy tính: `npm install -g firebase-tools`
2. Đăng nhập tài khoản Google: `firebase login`
3. Đóng gói ứng dụng: `npm run build`
4. Triển khai: `firebase deploy --only hosting,firestore:rules`
5. Trang web của bạn sẽ hoạt động ngay tại tên miền Google: `https://gen-lang-client-0415726760.web.app`

---

### 🌟 Cách 3: Triển Khai Full-Stack Trên Render / Cloud Run / Vercel (Tùy chọn)
Nếu cần chạy song song backend Node.js Server và AI Gemini server-side, bạn có thể kết nối GitHub với Render.com qua file `render.yaml` có sẵn.

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
- `.github/workflows/deploy-github-pages.yml`: Tự động build và deploy lên GitHub Pages miễn phí.
- `firebase-applet-config.json`: Cấu hình kết nối Firebase Firestore.
- `firestore.rules`: Luật bảo mật và phân quyền truy cập dữ liệu trên đám mây.
- `src/services/firestoreService.ts`: Lớp dịch vụ đồng bộ thời gian thực cho Đề thi, Người dùng, Bài nộp và Phòng thi.
- `Dockerfile` & `render.yaml` & `railway.json`: Các tệp hỗ trợ triển khai đa nền tảng.
