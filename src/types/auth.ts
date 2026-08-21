export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  schoolClass?: string; // Ví dụ: "12A1", "12A2", "11B1" dành cho Học sinh
  subject?: string;     // Ví dụ: "Toán THPT", "Hình học không gian" dành cho Giáo viên
  phone?: string;
  status: "active" | "locked";
  createdAt: string;
  lastLogin?: string;
  bio?: string;
  customPermissions?: PermissionKey[]; // Quyền bổ sung được Admin cấp trực tiếp
}

export type PermissionKey =
  | "manage_users"
  | "manage_all_exams"
  | "create_edit_exams"
  | "delete_exams"
  | "presentation_mode"
  | "host_live_room"
  | "view_analytics"
  | "grade_essays"
  | "take_exams"
  | "view_student_portal"
  | "system_settings"
  | "approve_exams";

export const PERMISSION_DEFINITIONS: Record<
  PermissionKey,
  {
    title: string;
    desc: string;
    category: "exam" | "teaching" | "system" | "student";
    tag: string;
  }
> = {
  manage_users: {
    title: "Quản lý Người dùng & Tài khoản",
    desc: "Thêm, sửa, xóa, khóa và cấp quyền tài khoản người dùng",
    category: "system",
    tag: "Quản trị",
  },
  manage_all_exams: {
    title: "Quản trị toàn bộ Ngân hàng đề thi",
    desc: "Xem, chỉnh sửa, gán lớp và sao lưu mọi đề thi trong hệ thống",
    category: "exam",
    tag: "Đề thi",
  },
  create_edit_exams: {
    title: "Soạn thảo & Chỉnh sửa Đề thi",
    desc: "Tạo mới, nhập đề LaTeX/Word/PDF và sửa cấu trúc 4 dạng thức",
    category: "exam",
    tag: "Soạn đề",
  },
  delete_exams: {
    title: "Xóa Đề thi khỏi Ngân hàng",
    desc: "Quyền gỡ bỏ đề thi khỏi cơ sở dữ liệu",
    category: "exam",
    tag: "Xóa đề",
  },
  approve_exams: {
    title: "Phê duyệt & Xuất bản Đề thi",
    desc: "Kiểm duyệt chất lượng và cấp phép đề thi vào kỳ thi chính thức",
    category: "exam",
    tag: "Duyệt đề",
  },
  presentation_mode: {
    title: "Trình chiếu Câu hỏi Giảng dạy",
    desc: "Chế độ bảng chiếu toàn màn hình tương tác với học sinh trên lớp",
    category: "teaching",
    tag: "Trình chiếu",
  },
  host_live_room: {
    title: "Chủ trì Phòng thi Live (Mã PIN)",
    desc: "Mở phòng thi trực tiếp, cấp mã PIN và điều khiển nhịp độ thi",
    category: "teaching",
    tag: "Live Room",
  },
  view_analytics: {
    title: "Báo cáo Thống kê & Phổ điểm",
    desc: "Xem ma trận điểm số, phân tích câu hỏi và xuất bảng điểm Excel",
    category: "teaching",
    tag: "Thống kê",
  },
  grade_essays: {
    title: "Chấm điểm Tự luận & Vẽ hình",
    desc: "Chấm bài tự luận Phần IV và bài vẽ hình không gian của học sinh",
    category: "teaching",
    tag: "Chấm thi",
  },
  take_exams: {
    title: "Làm bài thi Trực tuyến (4 Dạng)",
    desc: "Truy cập phòng thi, nộp bài 4 dạng thức và nhận kết quả tức thì",
    category: "student",
    tag: "Làm bài",
  },
  view_student_portal: {
    title: "Cổng Luyện thi & Lịch sử cá nhân",
    desc: "Xem bảng thành tích cá nhân, lộ trình ôn tập và lời giải chi tiết",
    category: "student",
    tag: "Cổng HS",
  },
  system_settings: {
    title: "Cấu hình Thông số Kỹ thuật",
    desc: "Cài đặt thông tin trường, niên khóa, AI Assistant và chế độ luyện thi",
    category: "system",
    tag: "Hệ thống",
  },
};

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    "manage_users",
    "manage_all_exams",
    "create_edit_exams",
    "delete_exams",
    "presentation_mode",
    "host_live_room",
    "view_analytics",
    "grade_essays",
    "take_exams",
    "view_student_portal",
    "system_settings",
    "approve_exams",
  ],
  teacher: [
    "create_edit_exams",
    "presentation_mode",
    "host_live_room",
    "view_analytics",
    "grade_essays",
    "take_exams",
  ],
  student: [
    "take_exams",
    "view_student_portal",
  ],
};

export const ROLE_LABELS: Record<UserRole, { title: string; badge: string; color: string; bgLight: string; textDark: string; border: string; desc: string }> = {
  admin: {
    title: "Quản trị viên",
    badge: "Admin",
    color: "bg-rose-500 text-white",
    bgLight: "bg-rose-50",
    textDark: "text-rose-700",
    border: "border-rose-200",
    desc: "Toàn quyền quản lý hệ thống, người dùng, ngân hàng đề thi và cấu hình toàn trường.",
  },
  teacher: {
    title: "Giáo viên",
    badge: "Giáo viên",
    color: "bg-indigo-600 text-white",
    bgLight: "bg-indigo-50",
    textDark: "text-indigo-700",
    border: "border-indigo-200",
    desc: "Soạn thảo đề thi, trình chiếu tương tác, mở phòng thi trực tiếp và chấm điểm/báo cáo phân tích.",
  },
  student: {
    title: "Học sinh",
    badge: "Học sinh",
    color: "bg-emerald-600 text-white",
    bgLight: "bg-emerald-50",
    textDark: "text-emerald-700",
    border: "border-emerald-200",
    desc: "Luyện thi trực tuyến, tham gia phòng thi đấu thời gian thực và theo dõi tiến độ điểm số cá nhân.",
  },
};

export const INITIAL_USERS: User[] = [
  {
    id: "usr_admin_01",
    name: "Nguyễn Quản Trị",
    email: "admin@edulink.vn",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    phone: "0901 234 567",
    status: "active",
    createdAt: "2025-01-01",
    lastLogin: "Vừa xong",
    bio: "Quản trị viên trưởng hệ thống MPEduCenter-Test",
  },
  {
    id: "usr_teacher_01",
    name: "ThS. Trần Văn Toán",
    email: "toan.tran@edulink.vn",
    role: "teacher",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    subject: "Toán học THPT (Lớp 12 & 11)",
    phone: "0912 345 678",
    status: "active",
    createdAt: "2025-01-10",
    lastLogin: "10 phút trước",
    bio: "Tổ trưởng chuyên môn Toán học - Trường THPT Chuyên",
  },
  {
    id: "usr_teacher_02",
    name: "Cô Lê Thị Mai",
    email: "mai.le@edulink.vn",
    role: "teacher",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    subject: "Toán học (Lớp 10 & 11)",
    phone: "0934 567 890",
    status: "active",
    createdAt: "2025-02-01",
    lastLogin: "Hôm qua",
    bio: "Giáo viên bộ môn Toán - Phụ trách khối 10 & 11",
  },
  {
    id: "usr_student_01",
    name: "Nguyễn Hoàng Nam",
    email: "nam.nh@student.vn",
    role: "student",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    schoolClass: "12A1",
    phone: "0988 123 456",
    status: "active",
    createdAt: "2025-02-15",
    lastLogin: "5 phút trước",
    bio: "Học sinh Lớp 12A1 - Định hướng Khối A00 & A01",
  },
  {
    id: "usr_student_02",
    name: "Trần Bảo Ngọc",
    email: "ngoc.tb@student.vn",
    role: "student",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    schoolClass: "12A1",
    phone: "0977 234 567",
    status: "active",
    createdAt: "2025-02-15",
    lastLogin: "1 giờ trước",
    bio: "Học sinh Lớp 12A1 - Lớp phó học tập",
  },
  {
    id: "usr_student_03",
    name: "Lê Minh Quân",
    email: "quan.lm@student.vn",
    role: "student",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    schoolClass: "12A2",
    phone: "0966 345 678",
    status: "active",
    createdAt: "2025-02-20",
    lastLogin: "Hôm qua",
    bio: "Học sinh Lớp 12A2",
  },
];
