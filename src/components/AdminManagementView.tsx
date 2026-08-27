import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import {
  User,
  UserRole,
  ROLE_LABELS,
  PermissionKey,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSIONS,
} from "../types/auth";
import { Exam, StudentSubmission, STANDARD_CLASSES } from "../types/exam";
import { ExamEditorModal } from "./ExamEditorModal";
import { useToast } from "../context/ToastContext";
import { useFilter } from "../context/FilterContext";
import { wipeAndResetAllData, clearAllSubmissions, clearAllExams } from "../services/firestoreService";
import {
  ShieldCheck,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  Upload,
  Settings,
  Sparkles,
  BookOpen,
  Activity,
  Layers,
  Award,
  GraduationCap,
  Save,
  RotateCcw,
  Eye,
  AlertTriangle,
  FileText,
  KeyRound,
  Check,
  Sliders,
  SlidersHorizontal,
  CheckSquare,
  Square,
  UserCheck,
  ShieldAlert,
  ListChecks,
  ChevronDown,
  Zap,
  CheckCheck,
  Copy,
  Printer,
  Wand2,
  FileDown,
  Camera,
  Smile,
  Share2,
  X,
} from "lucide-react";

interface AdminManagementViewProps {
  exams: Exam[];
  submissions: StudentSubmission[];
  onSelectExam: (exam: Exam, mode: "presentation" | "exam" | "analytics" | "live") => void;
  onDeleteExam: (examId: string) => void;
  onSaveExam: (exam: Exam) => void;
  selectedClassFilter?: string;
  onSelectClassFilter?: (cls: string) => void;
}

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  exams,
  submissions,
  onSelectExam,
  onDeleteExam,
  onSaveExam,
  selectedClassFilter: propClassFilter,
  onSelectClassFilter,
}) => {
  const { toast } = useToast();
  const {
    currentUser,
    users,
    addUser,
    addUsersBatch,
    updateUser,
    updateUserAvatar,
    deleteUser,
    deleteUsersBatch,
    toggleUserStatus,
    resetUsers,
    setUserRole,
    updateUserPermissions,
    getUserPermissions,
  } = useAuth();

  const {
    selectedClassFilter,
    setSelectedClassFilter,
    userRoleFilter,
    setUserRoleFilter,
    userStatusFilter,
    setUserStatusFilter,
    searchQuery,
    setSearchQuery,
    openFilterDrawer,
    activeFilterBadges,
    activeFiltersCount,
    resetAllFilters,
  } = useFilter();

  const adminClassFilter = selectedClassFilter;
  const roleFilter = userRoleFilter;
  const setRoleFilter = setUserRoleFilter;
  const statusFilter = userStatusFilter;
  const setStatusFilter = setUserStatusFilter;

  const handleClassChange = (cls: string) => {
    setSelectedClassFilter(cls);
    if (onSelectClassFilter) {
      onSelectClassFilter(cls);
    }
  };

  const [activeTab, setActiveTab] = useState<"users" | "exams" | "settings">("users");

  // State chỉnh sửa đề thi
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Chọn người dùng hàng loạt (Batch Selection)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modal Thêm / Cấp tài khoản đơn lẻ
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formPassword, setFormPassword] = useState<string>("123456");
  const [formRole, setFormRole] = useState<UserRole>("student");
  const [formClass, setFormClass] = useState<string>("");
  const [formSubject, setFormSubject] = useState<string>("Toán học THPT");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formAvatar, setFormAvatar] = useState<string>("");

  // Modal Cấp tài khoản hàng loạt (Batch Provisioning)
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchInputMode, setBatchInputMode] = useState<"excel" | "text">("excel");
  const [parsedExcelUsers, setParsedExcelUsers] = useState<
    Array<{
      name: string;
      email: string;
      password?: string;
      role: UserRole;
      schoolClass?: string;
      subject?: string;
      phone?: string;
      status: "active" | "locked";
    }>
  >([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState<boolean>(false);
  const [batchNamesText, setBatchNamesText] = useState<string>("");
  const [batchRole, setBatchRole] = useState<UserRole>("student");
  const [batchClass, setBatchClass] = useState<string>("");
  const [batchSubject, setBatchSubject] = useState<string>("Toán học THPT");
  const [batchPasswordRule, setBatchPasswordRule] = useState<"default" | "random" | "custom">("default");
  const [batchCustomPass, setBatchCustomPass] = useState<string>("123456");
  const [batchDomain, setBatchDomain] = useState<string>("@student.vn");

  // Modal Xuất phiếu cấp tài khoản (Export Credentials Cards / CSV)
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportClassFilter, setExportClassFilter] = useState<string>("all");

  // State các Modal Xác nhận (In-App Confirmations - tránh lỗi confirm() trong iframe)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<boolean>(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [showClearAllExamsConfirm, setShowClearAllExamsConfirm] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Helper chuyển tên tiếng Việt sang email không dấu
  const slugifyVietnamese = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  };

  const generateEmailFromName = (name: string, domain: string, existingList: string[] = []): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return `user${Date.now()}${domain}`;
    const lastName = slugifyVietnamese(parts[parts.length - 1]);
    const initials = parts.slice(0, -1).map((p) => slugifyVietnamese(p)[0] || "").join("");
    let base = `${lastName}.${initials}`;
    if (!initials) base = lastName;
    let email = `${base}${domain}`;
    let counter = 1;
    while (existingList.includes(email)) {
      email = `${base}${counter}${domain}`;
      counter++;
    }
    return email;
  };

  // Sao chép thông tin tài khoản nhanh
  const handleCopyCredentials = (user: User) => {
    const text = `Họ tên: ${user.name}\nEmail/Tài khoản: ${user.email}\nMật khẩu: ${user.password || "123456"}\nVai trò: ${ROLE_LABELS[user.role].title}${user.schoolClass ? `\nLớp: ${user.schoolClass}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép!", `Thông tin đăng nhập của ${user.name} đã được lưu vào bộ nhớ tạm.`);
  };

  // Modal Phân quyền chi tiết (Granular Permission Modal)
  const [permissionTargetUser, setPermissionTargetUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  // Cài đặt hệ thống
  const [schoolName, setSchoolName] = useState<string>("Trường THPT Chuyên Chất Lượng Cao");
  const [schoolYear, setSchoolYear] = useState<string>("2024 - 2025");
  const [allowPublicPractice, setAllowPublicPractice] = useState<boolean>(true);
  const [enableAiGrading, setEnableAiGrading] = useState<boolean>(true);
  const [maxExamTimeLimit, setMaxExamTimeLimit] = useState<number>(90);

  // Thống kê tổng hợp
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === "admin").length;
    const teacherCount = users.filter((u) => u.role === "teacher").length;
    const studentCount = users.filter((u) => u.role === "student").length;
    const activeUsers = users.filter((u) => u.status === "active").length;

    const validUserIds = new Set(users.map((u) => u.id));
    const validEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const validNames = new Set(users.map((u) => u.name.trim().toLowerCase()));

    // Chỉ tính bài nộp thuộc về học sinh hiện có trong danh sách tài khoản
    const validSubmissions =
      studentCount === 0
        ? []
        : submissions.filter((s) => {
            if (!s || !s.id) return false;
            return (
              (s.studentId && validUserIds.has(s.studentId)) ||
              (s.studentEmail && validEmails.has(s.studentEmail.toLowerCase())) ||
              (s.studentName && validNames.has(s.studentName.trim().toLowerCase()))
            );
          });

    const totalSubmissions = validSubmissions.length;
    const avgScore =
      totalSubmissions > 0
        ? (validSubmissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissions).toFixed(2)
        : "0.00";

    return {
      totalUsers,
      adminCount,
      teacherCount,
      studentCount,
      activeUsers,
      totalExams: exams.length,
      totalSubmissions,
      avgScore,
    };
  }, [users, exams, submissions]);

  // Lọc danh sách người dùng
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      const matchClass =
        adminClassFilter === "all" ||
        (u.schoolClass && u.schoolClass === adminClassFilter) ||
        (adminClassFilter === "Lớp 12" && u.schoolClass?.startsWith("12")) ||
        (adminClassFilter === "Lớp 11" && u.schoolClass?.startsWith("11")) ||
        (adminClassFilter === "Lớp 10" && u.schoolClass?.startsWith("10"));
      const matchSearch =
        searchQuery === "" ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.schoolClass && u.schoolClass.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.subject && u.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.phone && u.phone.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchRole && matchStatus && matchClass && matchSearch;
    });
  }, [users, roleFilter, statusFilter, adminClassFilter, searchQuery]);

  // Danh sách các lớp thực tế từ người dùng
  const userClasses = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.schoolClass && u.schoolClass.trim()) {
        set.add(u.schoolClass.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [users]);

  // Badges bộ lọc đang áp dụng cho bảng Người dùng
  const activeUserFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];

    if (adminClassFilter !== "all") {
      badges.push({
        id: "class",
        label: `Lớp: ${adminClassFilter}`,
        onRemove: () => handleClassChange("all"),
      });
    }

    if (roleFilter !== "all") {
      const rLabel = ROLE_LABELS[roleFilter as UserRole]?.title || roleFilter;
      badges.push({
        id: "role",
        label: `Vai trò: ${rLabel}`,
        onRemove: () => setRoleFilter("all"),
      });
    }

    if (statusFilter !== "all") {
      badges.push({
        id: "status",
        label: `Trạng thái: ${statusFilter === "active" ? "Hoạt động" : "Đã khóa"}`,
        onRemove: () => setStatusFilter("all"),
      });
    }

    if (searchQuery.trim() !== "") {
      badges.push({
        id: "search",
        label: `Tìm: "${searchQuery}"`,
        onRemove: () => setSearchQuery(""),
      });
    }

    return badges;
  }, [adminClassFilter, roleFilter, statusFilter, searchQuery]);

  const handleResetUserFilters = () => {
    handleClassChange("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  // Lọc danh sách đề thi theo lớp được Admin chọn
  const filteredExams = useMemo(() => {
    if (adminClassFilter === "all") return exams;
    return exams.filter((e) => {
      if (e.targetClass && e.targetClass === adminClassFilter) return true;
      if (e.grade === adminClassFilter) return true;
      if (adminClassFilter === "Lớp 12" && (e.grade === "Lớp 12" || e.targetClass?.startsWith("12"))) return true;
      if (adminClassFilter === "Lớp 11" && (e.grade === "Lớp 11" || e.targetClass?.startsWith("11"))) return true;
      if (adminClassFilter === "Lớp 10" && (e.grade === "Lớp 10" || e.targetClass?.startsWith("10"))) return true;
      return false;
    });
  }, [exams, adminClassFilter]);

  // Xử lý chọn tất cả trong bảng
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Cấp vai trò hàng loạt (Batch Role Change)
  const handleBatchSetRole = (role: UserRole) => {
    if (selectedUserIds.length === 0) return;
    const roleName = role === "admin" ? "Admin" : role === "teacher" ? "Giáo viên" : "Học sinh";
    selectedUserIds.forEach((id) => {
      setUserRole(id, role);
    });
    toast.success(
      "Cấp quyền hàng loạt thành công!",
      `Đã chuyển ${selectedUserIds.length} người dùng sang vai trò ${roleName}.`
    );
    setSelectedUserIds([]);
  };

  // Mở modal thêm người dùng
  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("123456");
    setFormRole("student");
    setFormClass("");
    setFormSubject("Toán học THPT");
    setFormPhone("");
    setFormAvatar("");
    setShowUserModal(true);
  };

  // Tự động sinh Email khi nhập tên
  const handleAutoFillEmail = () => {
    if (!formName.trim()) {
      toast.info("Vui lòng nhập họ tên trước", "Hệ thống sẽ dựa vào họ tên để tạo email chuẩn.");
      return;
    }
    const domain = formRole === "student" ? "@student.vn" : "@edulink.vn";
    const existing = users.map((u) => u.email.toLowerCase());
    const generated = generateEmailFromName(formName, domain, existing);
    setFormEmail(generated);
    toast.info("Đã tạo email!", `Email đề xuất: ${generated}`);
  };

  // Tạo mật khẩu ngẫu nhiên
  const handleGenerateRandomPass = () => {
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    setFormPassword(random);
    toast.info("Mật khẩu mới", `Đã tạo mật khẩu ngẫu nhiên 6 chữ số: ${random}`);
  };

  // Mở modal sửa thông tin người dùng
  const handleOpenEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(user.password || "123456");
    setFormRole(user.role);
    setFormClass(user.schoolClass || "");
    setFormSubject(user.subject || "Toán học THPT");
    setFormPhone(user.phone || "");
    setFormAvatar(user.avatar || "");
    setShowUserModal(true);
  };

  // Tải file mẫu Excel (.xlsx) để cấp tài khoản hàng loạt
  const handleDownloadExcelTemplate = () => {
    // Sheet 1: Dữ liệu mẫu (Data template)
    const templateData = [
      {
        "STT": 1,
        "Họ và tên (*)": "Nguyễn Văn An",
        "Lớp": "12A1",
        "Vai trò": "Học sinh",
        "Email": "an.nv@student.vn",
        "Mật khẩu": "123456",
        "Số điện thoại": "0912345678",
        "Môn phụ trách (GV)": "",
        "Ghi chú": "Học sinh lớp 12A1",
      },
      {
        "STT": 2,
        "Họ và tên (*)": "Trần Thị Bích",
        "Lớp": "12A1",
        "Vai trò": "Học sinh",
        "Email": "",
        "Mật khẩu": "",
        "Số điện thoại": "",
        "Môn phụ trách (GV)": "",
        "Ghi chú": "Để trống email/pass để hệ thống tự sinh tự động",
      },
      {
        "STT": 3,
        "Họ và tên (*)": "Lê Hoàng Cường",
        "Lớp": "12A2",
        "Vai trò": "Học sinh",
        "Email": "cuong.lh@student.vn",
        "Mật khẩu": "123456",
        "Số điện thoại": "0987654321",
        "Môn phụ trách (GV)": "",
        "Ghi chú": "",
      },
      {
        "STT": 4,
        "Họ và tên (*)": "Phạm Minh Đức",
        "Lớp": "11B1",
        "Vai trò": "Học sinh",
        "Email": "",
        "Mật khẩu": "654321",
        "Số điện thoại": "",
        "Môn phụ trách (GV)": "",
        "Ghi chú": "",
      },
      {
        "STT": 5,
        "Họ và tên (*)": "Thầy Trần Đình Phương",
        "Lớp": "",
        "Vai trò": "Giáo viên",
        "Email": "phuong.td@edulink.vn",
        "Mật khẩu": "123456",
        "Số điện thoại": "0901234567",
        "Môn phụ trách (GV)": "Toán học THPT",
        "Ghi chú": "Giáo viên bộ môn Toán",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Đặt độ rộng các cột
    ws["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 10 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 45 },
    ];

    // Sheet 2: Hướng dẫn chi tiết
    const guideData = [
      { "Cột dữ liệu": "STT", "Bắt buộc": "Không", "Mô tả / Hướng dẫn": "Số thứ tự dòng (1, 2, 3...)" },
      { "Cột dữ liệu": "Họ và tên (*)", "Bắt buộc": "Có", "Mô tả / Hướng dẫn": "Họ và tên đầy đủ của học sinh hoặc giáo viên (Bắt buộc phải có)." },
      { "Cột dữ liệu": "Lớp", "Bắt buộc": "Tùy chọn", "Mô tả / Hướng dẫn": "Ví dụ: 12A1, 12A2, 11B1... (Nếu để trống sẽ dùng lớp mặc định chọn trên hệ thống)." },
      { "Cột dữ liệu": "Vai trò", "Bắt buộc": "Tùy chọn", "Mô tả / Hướng dẫn": "Điền: 'Học sinh', 'Giáo viên', 'Quản trị viên' (Mặc định là Học sinh)." },
      { "Cột dữ liệu": "Email", "Bắt buộc": "Tùy chọn", "Mô tả / Hướng dẫn": "Nếu để trống, hệ thống sẽ tự động tạo email không dấu theo tên (VD: an.nv@student.vn)." },
      { "Cột dữ liệu": "Mật khẩu", "Bắt buộc": "Tùy chọn", "Mô tả / Hướng dẫn": "Nếu để trống, hệ thống sẽ áp dụng mật khẩu mặc định (123456) hoặc 6 số ngẫu nhiên." },
      { "Cột dữ liệu": "Số điện thoại", "Bắt buộc": "Tùy chọn", "Mô tả / Hướng dẫn": "Số điện thoại liên lạc của học sinh hoặc phụ huynh." },
      { "Cột dữ liệu": "Môn phụ trách", "Bắt buộc": "Tùy chọn", "Mô tả / Hướng dẫn": "Dành cho Giáo viên (VD: Toán học THPT, Vật lý 12...)." },
    ];

    const wsGuide = XLSX.utils.json_to_sheet(guideData);
    wsGuide["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 75 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Mau");
    XLSX.utils.book_append_sheet(wb, wsGuide, "Huong_Dan_Nhap");

    XLSX.writeFile(wb, "Mau_Danh_Sach_Cap_Tai_Khoan_MPEduCenter.xlsx");
    toast.success("Đã tải file mẫu Excel!", "File Mau_Danh_Sach_Cap_Tai_Khoan_MPEduCenter.xlsx đã được lưu về máy.");
  };

  // Đọc và phân tích file Excel / CSV tải lên
  const handleExcelFileUpload = (file: File) => {
    setIsUploadingExcel(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!jsonData || jsonData.length === 0) {
          toast.error("File trống", "Không tìm thấy dòng dữ liệu nào trong file tải lên.");
          setIsUploadingExcel(false);
          return;
        }

        const existingEmails = users.map((u) => u.email.toLowerCase());
        const parsed: Array<{
          name: string;
          email: string;
          password?: string;
          role: UserRole;
          schoolClass?: string;
          subject?: string;
          phone?: string;
          status: "active" | "locked";
        }> = [];

        for (const row of jsonData) {
          // Tìm cột Họ tên
          const nameKey = Object.keys(row).find((k) => {
            const l = k.toLowerCase().trim();
            return l.includes("họ") || l.includes("tên") || l.includes("name") || l.includes("fullname");
          });

          const rawName = nameKey ? String(row[nameKey]).trim() : "";
          if (!rawName) continue;

          // Tìm cột Lớp
          const classKey = Object.keys(row).find((k) => {
            const l = k.toLowerCase().trim();
            return l === "lớp" || l === "lop" || l === "class" || l.includes("lớp học");
          });
          const rawClass = classKey && row[classKey] ? String(row[classKey]).trim() : batchClass;

          // Tìm cột Vai trò
          const roleKey = Object.keys(row).find((k) => {
            const l = k.toLowerCase().trim();
            return l.includes("vai trò") || l.includes("role") || l.includes("loại");
          });
          let rawRole: UserRole = batchRole;
          if (roleKey && row[roleKey]) {
            const rStr = String(row[roleKey]).toLowerCase();
            if (rStr.includes("giáo") || rStr.includes("teacher") || rStr.includes("gv")) {
              rawRole = "teacher";
            } else if (rStr.includes("admin") || rStr.includes("quản")) {
              rawRole = "admin";
            } else {
              rawRole = "student";
            }
          }

          // Tìm cột Email
          const emailKey = Object.keys(row).find((k) => {
            const l = k.toLowerCase().trim();
            return l.includes("email") || l.includes("mail") || l.includes("tài khoản");
          });
          let rawEmail = emailKey && row[emailKey] ? String(row[emailKey]).trim() : "";
          if (!rawEmail || !rawEmail.includes("@")) {
            rawEmail = generateEmailFromName(rawName, batchDomain, existingEmails);
          }
          existingEmails.push(rawEmail.toLowerCase());

          // Tìm cột Mật khẩu
          const passKey = Object.keys(row).find((k) => {
            const l = k.toLowerCase().trim();
            return l.includes("mật khẩu") || l.includes("pass") || l.includes("password");
          });
          let rawPass = passKey && row[passKey] ? String(row[passKey]).trim() : "";
          if (!rawPass) {
            if (batchPasswordRule === "random") {
              rawPass = Math.floor(100000 + Math.random() * 900000).toString();
            } else if (batchPasswordRule === "custom" && batchCustomPass.trim()) {
              rawPass = batchCustomPass.trim();
            } else {
              rawPass = "123456";
            }
          }

          // Tìm cột Số điện thoại
          const phoneKey = Object.keys(row).find((k) => {
            const l = k.toLowerCase().trim();
            return l.includes("sđt") || l.includes("phone") || l.includes("điện thoại");
          });
          const rawPhone = phoneKey && row[phoneKey] ? String(row[phoneKey]).trim() : "";

          // Tìm cột Môn học
          const subjectKey = Object.keys(row).find((k) => {
            const l = k.toLowerCase().trim();
            return l.includes("môn") || l.includes("subject");
          });
          const rawSubject = subjectKey && row[subjectKey] ? String(row[subjectKey]).trim() : (rawRole === "teacher" ? batchSubject : undefined);

          parsed.push({
            name: rawName,
            email: rawEmail,
            password: rawPass,
            role: rawRole,
            schoolClass: rawRole === "student" ? rawClass : undefined,
            subject: rawRole === "teacher" ? rawSubject : undefined,
            phone: rawPhone || undefined,
            status: "active",
          });
        }

        if (parsed.length === 0) {
          toast.error("Không trích xuất được", "Không tìm thấy cột Họ và tên hợp lệ trong file.");
        } else {
          setParsedExcelUsers(parsed);
          setUploadedFileName(file.name);
          toast.success("Đọc file thành công!", `Đã trích xuất ${parsed.length} tài khoản từ file ${file.name}.`);
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Lỗi đọc file", "Không thể đọc định dạng file này. Vui lòng kiểm tra lại file Excel hoặc CSV.");
      } finally {
        setIsUploadingExcel(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Xóa 1 hàng khỏi danh sách Excel vừa parse
  const handleRemoveParsedRow = (index: number) => {
    setParsedExcelUsers((prev) => prev.filter((_, i) => i !== index));
  };

  // Xử lý cấp tài khoản hàng loạt
  const handleExecuteBatchProvision = () => {
    let newUsersToCreate: any[] = [];

    if (batchInputMode === "excel") {
      if (parsedExcelUsers.length === 0) {
        toast.error("Chưa có dữ liệu", "Vui lòng tải lên file Excel hoặc chuyển sang tab Nhập danh sách văn bản.");
        return;
      }
      newUsersToCreate = parsedExcelUsers.map((u) => ({
        ...u,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
      }));
    } else {
      const rawNames = batchNamesText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (rawNames.length === 0) {
        toast.error("Danh sách trống", "Vui lòng nhập ít nhất một tên người dùng.");
        return;
      }

      const existingEmails = users.map((u) => u.email.toLowerCase());
      newUsersToCreate = rawNames.map((name) => {
        const generatedEmail = generateEmailFromName(name, batchDomain, existingEmails);
        existingEmails.push(generatedEmail.toLowerCase());

        let pass = "123456";
        if (batchPasswordRule === "random") {
          pass = Math.floor(100000 + Math.random() * 900000).toString();
        } else if (batchPasswordRule === "custom" && batchCustomPass.trim()) {
          pass = batchCustomPass.trim();
        }

        return {
          name,
          email: generatedEmail,
          password: pass,
          role: batchRole,
          schoolClass: batchRole === "student" ? batchClass : undefined,
          subject: batchRole === "teacher" ? batchSubject : undefined,
          status: "active" as const,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        };
      });
    }

    addUsersBatch(newUsersToCreate);
    setShowBatchModal(false);
    setParsedExcelUsers([]);
    setUploadedFileName(null);
    toast.success("Cấp tài khoản thành công!", `Đã cấp thành công ${newUsersToCreate.length} tài khoản vào hệ thống.`);
  };

  // Xuất file Excel (.xlsx) danh sách tài khoản
  const handleExportExcel = (userList: User[]) => {
    const exportData = userList.map((u, i) => ({
      "STT": i + 1,
      "Họ và tên": u.name,
      "Email / Tên đăng nhập": u.email,
      "Mật khẩu": u.password || "123456",
      "Vai trò": ROLE_LABELS[u.role].title,
      "Lớp / Bộ môn": u.schoolClass || u.subject || "",
      "Số điện thoại": u.phone || "",
      "Trạng thái": u.status === "active" ? "Hoạt động" : "Đã khóa",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Tai_Khoan");
    XLSX.writeFile(wb, `Danh_sach_tai_khoan_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Đã tải xuống!", "File Excel danh sách tài khoản đã được tải về máy.");
  };

  // Xuất file CSV danh sách tài khoản
  const handleExportCSV = (userList: User[]) => {
    const headers = "STT,Họ và tên,Email / Tên đăng nhập,Mật khẩu,Vai trò,Lớp / Bộ môn,Số điện thoại,Trạng thái\n";
    const rows = userList
      .map((u, i) => {
        const roleLabel = ROLE_LABELS[u.role].title;
        const cls = u.schoolClass || u.subject || "";
        const phone = u.phone || "";
        const status = u.status === "active" ? "Hoạt động" : "Đã khóa";
        return `${i + 1},"${u.name}","${u.email}","${u.password || "123456"}","${roleLabel}","${cls}","${phone}","${status}"`;
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_tai_khoan_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã tải xuống!", "File CSV danh sách tài khoản đã được tải về máy.");
  };

  // Lưu thông tin người dùng
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Thiếu thông tin", "Vui lòng nhập họ tên và email hợp lệ.");
      return;
    }

    if (editingUserId) {
      updateUser(editingUserId, {
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword.trim() || "123456",
        role: formRole,
        schoolClass: formRole === "student" ? formClass.trim() : undefined,
        subject: formRole === "teacher" ? formSubject.trim() : undefined,
        phone: formPhone.trim(),
        avatar: formAvatar || undefined,
      });
    } else {
      addUser({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword.trim() || "123456",
        role: formRole,
        schoolClass: formRole === "student" ? formClass.trim() : undefined,
        subject: formRole === "teacher" ? formSubject.trim() : undefined,
        phone: formPhone.trim(),
        status: "active",
        avatar: formAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formName.trim())}`,
      });
    }
    setShowUserModal(false);
  };

  // Mở modal phân quyền chi tiết cho 1 tài khoản
  const handleOpenPermissionModal = (user: User) => {
    setPermissionTargetUser(user);
    const activePerms = getUserPermissions(user);
    setSelectedPermissions(activePerms);
  };

  // Bật/tắt quyền trong Modal
  const handleTogglePermissionInModal = (perm: PermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // Lưu quyền chi tiết từ Modal
  const handleSavePermissions = () => {
    if (!permissionTargetUser) return;
    updateUserPermissions(permissionTargetUser.id, selectedPermissions);
    setPermissionTargetUser(null);
  };

  // Nạp quyền theo Mẫu định sẵn (Presets)
  const handleApplyPreset = (presetType: "default" | "full_teacher" | "ta" | "class_president") => {
    if (!permissionTargetUser) return;
    if (presetType === "default") {
      setSelectedPermissions(ROLE_PERMISSIONS[permissionTargetUser.role] || []);
      toast.info("Đã nạp mẫu", `Đã đặt về quyền mặc định của vai trò ${ROLE_LABELS[permissionTargetUser.role].badge}.`);
    } else if (presetType === "full_teacher") {
      const fullTeacherPerms: PermissionKey[] = [
        "create_edit_exams",
        "delete_exams",
        "approve_exams",
        "manage_all_exams",
        "presentation_mode",
        "host_live_room",
        "view_analytics",
        "grade_essays",
        "take_exams",
      ];
      setSelectedPermissions(fullTeacherPerms);
      toast.success("Đã áp dụng mẫu", "Cấp toàn quyền Soạn đề, Duyệt đề, Phòng thi Live & Chấm thi.");
    } else if (presetType === "ta") {
      const taPerms: PermissionKey[] = [
        "create_edit_exams",
        "presentation_mode",
        "grade_essays",
        "view_analytics",
        "take_exams",
        "view_student_portal",
      ];
      setSelectedPermissions(taPerms);
      toast.success("Đã áp dụng mẫu", "Cấp quyền Trợ giảng: Soạn đề, Trình chiếu & Chấm điểm tự luận.");
    } else if (presetType === "class_president") {
      const studentLeaderPerms: PermissionKey[] = [
        "take_exams",
        "view_student_portal",
        "presentation_mode",
        "host_live_room",
      ];
      setSelectedPermissions(studentLeaderPerms);
      toast.success("Đã áp dụng mẫu", "Cấp quyền Ban cán sự: Luyện thi, Cổng HS & Hỗ trợ mở phòng thi Live.");
    }
  };

  // Xuất file sao lưu người dùng
  const handleExportUsersJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `edulink_users_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Xuất file sao lưu thành công", "Đã tải xuống danh sách người dùng toàn hệ thống.");
  };

  // Xuất file sao lưu toàn bộ ngân hàng đề
  const handleExportExamsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exams, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `edulink_exams_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Sao lưu ngân hàng đề thành công", `Đã lưu ${exams.length} bộ đề thi sang file JSON.`);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Admin Hero Header - Bento Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>Admin Master Portal</span>
              </span>
              <span className="text-xs text-slate-400">
                Phiên đăng nhập: <strong>{currentUser.name}</strong> ({currentUser.email})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Trung tâm Quản trị & Phân quyền Trực tiếp
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Xem danh sách người dùng toàn trường, trực tiếp cấp đổi vai trò và phân bổ quyền hạn chi tiết (Soạn đề, Trình chiếu, Phòng Live, Chấm thi) cho Giáo viên & Học sinh.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleOpenAddUser}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm người dùng mới</span>
            </button>
            <button
              type="button"
              onClick={handleExportUsersJson}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Xuất dữ liệu</span>
            </button>
          </div>
        </div>

        {/* Thống kê Bento Grid mini trong Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Tổng tài khoản</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {metrics.totalUsers}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
              {metrics.activeUsers} đang hoạt động
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Giáo viên phụ trách</span>
              <Award className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-1">
              {metrics.teacherCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Được cấp quyền soạn & chấm đề
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Học sinh trực tuyến</span>
              <GraduationCap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">
              {metrics.studentCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Phân bổ theo khối 10, 11, 12
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Lượt thi & Điểm TB</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {metrics.totalSubmissions}{" "}
              <span className="text-sm font-normal text-slate-400">lượt</span>
            </div>
            <div className="text-[11px] text-amber-300 font-bold mt-0.5">
              ĐTB: {metrics.avgScore}/10đ
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === "users"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Bảng Người dùng & Cấp quyền Trực tiếp ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("exams")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === "exams"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Quản trị Ngân hàng đề thi ({exams.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu hình Toàn trường</span>
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT TABLE WITH DIRECT PERMISSION GRANTING */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Controls bar with Integrated Class Filter & Search */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
            {/* Hàng 1: Tìm kiếm + Lọc Lớp + Lọc Vai trò + Lọc Trạng thái + Nút Thao tác */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Nút mở Sidebar Bộ lọc Dùng chung (Global Drawer Trigger) */}
                <button
                  type="button"
                  onClick={openFilterDrawer}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                    activeFiltersCount > 0
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  }`}
                  title="Mở bảng điều khiển lọc dữ liệu đa chiều"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bộ lọc</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* 1. Tìm kiếm */}
                <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên, email, lớp, môn, SĐT..."
                    className="w-full pl-9 pr-7 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. Lọc Lớp / Khối (Tích hợp trực tiếp tại đây) */}
                <div className="flex items-center gap-1.5 bg-amber-50/90 border border-amber-200/90 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs">
                  <GraduationCap className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-amber-900 shrink-0">Lớp:</span>
                  <select
                    value={adminClassFilter}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="bg-transparent text-amber-950 font-black text-xs outline-none cursor-pointer pr-1"
                  >
                    <option value="all">🏫 Tất cả các lớp ({users.length})</option>
                    <optgroup label="Theo Khối">
                      <option value="Lớp 12">Khối 12 ({users.filter((u) => u.schoolClass?.startsWith("12")).length} hs)</option>
                      <option value="Lớp 11">Khối 11 ({users.filter((u) => u.schoolClass?.startsWith("11")).length} hs)</option>
                      <option value="Lớp 10">Khối 10 ({users.filter((u) => u.schoolClass?.startsWith("10")).length} hs)</option>
                    </optgroup>
                    {userClasses.length > 0 && (
                      <optgroup label="Danh sách Lớp học">
                        {userClasses.map((cls) => {
                          const cnt = users.filter((u) => u.schoolClass === cls).length;
                          return (
                            <option key={cls} value={cls}>
                              Lớp {cls} {cnt > 0 ? `(${cnt} tài khoản)` : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* 3. Lọc Vai trò */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setRoleFilter("all")}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      roleFilter === "all" ? "bg-white text-indigo-600 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("teacher")}
                    className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                      roleFilter === "teacher" ? "bg-white text-indigo-600 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    👨‍🏫 Giáo viên ({users.filter((u) => u.role === "teacher").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("student")}
                    className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                      roleFilter === "student" ? "bg-white text-emerald-600 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🎓 Học sinh ({users.filter((u) => u.role === "student").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("admin")}
                    className={`px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                      roleFilter === "admin" ? "bg-white text-rose-600 shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    👑 Admin ({users.filter((u) => u.role === "admin").length})
                  </button>
                </div>

                {/* 4. Lọc Trạng thái */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="all">Mọi trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Đang bị khóa</option>
                </select>
              </div>

              {/* Nhóm nút hành động */}
              <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAddUser}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  title="Cấp tài khoản mới cho học sinh, giáo viên hoặc quản trị"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cấp tài khoản mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                  title="Cấp tài khoản hàng loạt theo danh sách lớp học"
                >
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Cấp hàng loạt (Batch)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                  title="In hoặc xuất danh sách tài khoản & mật khẩu cho học sinh"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Xuất phiếu / In</span>
                </button>

                <button
                  type="button"
                  onClick={resetUsers}
                  className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition flex items-center gap-1"
                  title="Khôi phục danh sách tài khoản mẫu ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Hàng 2: Badges bộ lọc đang kích hoạt */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1 shrink-0">
                  <Filter className="w-3 h-3 text-indigo-600" />
                  Đang lọc:
                </span>

                {activeUserFilterBadges.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    Hiển thị toàn bộ ({users.length} tài khoản)
                  </span>
                ) : (
                  activeUserFilterBadges.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold"
                    >
                      <span>{b.label}</span>
                      <button
                        type="button"
                        onClick={b.onRemove}
                        className="w-3.5 h-3.5 rounded-full hover:bg-indigo-200 flex items-center justify-center text-indigo-900 transition"
                        title="Bỏ lọc tiêu chí này"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))
                )}

                {activeUserFilterBadges.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetUserFilters}
                    className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition flex items-center gap-1"
                    title="Xóa tất cả các bộ lọc đang kích hoạt"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa bộ lọc</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] font-bold text-slate-500">
                Tìm thấy <strong className="text-indigo-600 font-black">{filteredUsers.length}</strong> / {users.length} tài khoản
              </div>
            </div>
          </div>

          {/* Thanh tác vụ hàng loạt khi có người dùng được chọn (Batch Action Bar) */}
          {selectedUserIds.length > 0 && (
            <div className="bg-indigo-900 text-white p-3.5 rounded-2xl shadow-lg border border-indigo-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs sm:text-sm font-bold">
                  Đã chọn <strong>{selectedUserIds.length}</strong> người dùng
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-indigo-200 font-medium hidden sm:inline">
                  Cấp quyền hàng loạt thành:
                </span>
                <button
                  type="button"
                  onClick={() => handleBatchSetRole("teacher")}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Giáo viên</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetRole("student")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Học sinh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const validCount = selectedUserIds.filter((id) => id !== currentUser.id).length;
                    if (validCount === 0) {
                      toast.error("Không thể xóa", "Bạn không thể tự xóa tài khoản của chính mình.");
                      return;
                    }
                    setBatchDeleteConfirm(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Xóa các tài khoản đã chọn vĩnh viễn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa đã chọn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserIds([])}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* BẢNG NGƯỜI DÙNG & CẤP QUYỀN TRỰC TIẾP */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredUsers.length > 0 &&
                          selectedUserIds.length === filteredUsers.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Chọn tất cả"
                      />
                    </th>
                    <th className="py-3.5 px-4">Tài khoản & Thông tin</th>
                    <th className="py-3.5 px-4">Cấp quyền Vai trò (Trực tiếp)</th>
                    <th className="py-3.5 px-4">Quyền hạn chi tiết</th>
                    <th className="py-3.5 px-4">Lớp / Bộ môn</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isLocked = user.status === "locked";
                    const isSelected = selectedUserIds.includes(user.id);
                    const userPerms = getUserPermissions(user);
                    const isCustomized = Boolean(user.customPermissions && user.customPermissions.length > 0);

                    return (
                      <tr
                        key={user.id}
                        className={`transition ${
                          isSelected
                            ? "bg-indigo-50/60"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(user.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Người dùng */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative group shrink-0">
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shadow-2xs group-hover:opacity-80 transition"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(user)}
                                className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition"
                                title="Đổi hình đại diện"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-2 py-0.2 bg-indigo-100 text-indigo-700 font-extrabold rounded-md">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                                <span>{user.email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredentials(user)}
                                  className="text-slate-400 hover:text-indigo-600 transition"
                                  title="Sao chép tài khoản & mật khẩu"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              {user.phone && (
                                <div className="text-slate-400 text-[10px] font-mono mt-0.5">
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Dropdown Cấp quyền Vai trò trực tiếp (Admin có thể đổi trực tiếp ngay trên Table) */}
                        <td className="py-3.5 px-4">
                          <div className="relative inline-block w-44">
                            <select
                              value={user.role}
                              onChange={(e) => {
                                const newRole = e.target.value as UserRole;
                                setUserRole(user.id, newRole);
                              }}
                              className={`w-full text-xs font-extrabold px-3 py-1.5 rounded-xl border appearance-none cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                user.role === "admin"
                                  ? "bg-rose-50 border-rose-200 text-rose-800"
                                  : user.role === "teacher"
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
                              }`}
                              title="Bấm để trực tiếp chuyển đổi vai trò cho người dùng này"
                            >
                              <option value="student">🎓 Học sinh</option>
                              <option value="teacher">👨‍🏫 Giáo viên</option>
                              <option value="admin">👑 Quản trị viên</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </td>

                        {/* Quyền hạn chi tiết & Nút Phân quyền nhanh */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5 max-w-xs">
                            <div className="flex flex-wrap gap-1 items-center">
                              {userPerms.slice(0, 3).map((p) => {
                                const def = PERMISSION_DEFINITIONS[p];
                                return (
                                  <span
                                    key={p}
                                    className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200 whitespace-nowrap"
                                  >
                                    {def?.tag || p}
                                  </span>
                                );
                              })}
                              {userPerms.length > 3 && (
                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                                  +{userPerms.length - 3} quyền
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenPermissionModal(user)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                              title="Xem và chỉnh sửa từng quyền cụ thể"
                            >
                              <Sliders className="w-3 h-3 text-indigo-500" />
                              <span>
                                {isCustomized ? "⚡ Quyền tùy chỉnh" : "Phân quyền chi tiết"} ({userPerms.length}/12)
                              </span>
                            </button>
                          </div>
                        </td>

                        {/* Lớp / Môn học */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {user.role === "student" ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 font-bold text-xs">
                              {user.schoolClass ? `Lớp ${user.schoolClass}` : "Chưa xếp lớp"}
                            </span>
                          ) : (
                            <span className="text-slate-700 font-semibold">
                              {user.subject || (user.role === "admin" ? "Toàn trường" : "Toán THPT")}
                            </span>
                          )}
                        </td>

                        {/* Trạng thái hoạt động */}
                        <td className="py-3.5 px-4">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3" />
                              <span>Đã khóa</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Hoạt động</span>
                            </span>
                          )}
                        </td>

                        {/* Thao tác tài khoản */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Sao chép thông tin đăng nhập */}
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(user)}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                              title="Sao chép tài khoản & mật khẩu cấp cho người dùng"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Phân quyền chi tiết */}
                            <button
                              type="button"
                              onClick={() => handleOpenPermissionModal(user)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition border border-transparent hover:border-indigo-200"
                              title="Cấp quyền và phân bổ chức năng"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>

                            {/* Khóa / Mở khóa */}
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => toggleUserStatus(user.id)}
                                className={`p-2 rounded-xl transition ${
                                  isLocked
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-amber-600 hover:bg-amber-50"
                                }`}
                                title={isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                              >
                                {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </button>
                            )}

                            {/* Sửa thông tin */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(user)}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                              title="Chỉnh sửa thông tin tài khoản"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Xóa tài khoản */}
                            {!isSelf && (
                              <button
                                id={`btn-delete-user-${user.id}`}
                                type="button"
                                onClick={() => setUserToDelete(user)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Không tìm thấy người dùng nào phù hợp với bộ lọc tìm kiếm.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXAMS GOVERNANCE */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Toàn bộ Ngân hàng Đề thi THPT ({exams.length} đề)
              </h3>
              <p className="text-xs text-slate-500">
                Admin có quyền duyệt đề, sao lưu đề và phân bổ đề thi cho học sinh toàn trường.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {exams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllExamsConfirm(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Xóa toàn bộ đề thi ({exams.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportExamsJson}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Sao lưu toàn bộ ngân hàng đề (JSON)</span>
              </button>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Chưa có đề thi nào trong hệ thống</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ngân hàng đề thi đang trống sạch. Giáo viên hoặc Admin có thể thêm mới hoặc nhập file đề từ giao diện Ngân hàng đề thi.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExams.map((exam) => {
                const questionCount = exam.questions.length;
                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-md border border-indigo-100">
                            {exam.grade || "Lớp 12"} • Mã: {exam.code}
                          </span>
                          {exam.targetClass && exam.targetClass !== "Tất cả các lớp" && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-md border border-amber-200">
                              Lớp: {exam.targetClass}
                            </span>
                          )}
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Đã phê duyệt</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2">{exam.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {exam.description || exam.chapter || "Đề kiểm tra chuẩn cấu trúc GDPT"}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                        <span>
                          ⏱ <strong>{exam.durationMinutes}</strong> phút
                        </span>
                        <span>
                          📝 <strong>{questionCount}</strong> câu hỏi
                        </span>
                        <span>
                          🎯 <strong>{exam.totalScore || 10}</strong> điểm
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingExam(exam)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1 border border-amber-200/60"
                          title="Chỉnh sửa toàn diện đề thi (Mã đề, Thời gian, Nội dung, Câu hỏi...)"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Sửa đề</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectExam(exam, "presentation")}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                          title="Xem chế độ Trình chiếu"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Trình chiếu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectExam(exam, "exam")}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1"
                          title="Thi trực tuyến"
                        >
                          <span>Thi thử</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExamToDelete(exam)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Xóa đề thi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Cấu hình Hệ thống & Phân quyền Toàn trường</h3>
            <p className="text-xs text-slate-500">
              Thiết lập các tham số vận hành cho toàn bộ giáo viên và học sinh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên đơn vị / Trường học</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Niên khóa áp dụng</label>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời lượng làm bài tối đa mặc định (phút)
                </label>
                <input
                  type="number"
                  value={maxExamTimeLimit}
                  onChange={(e) => setMaxExamTimeLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Tự do luyện thi ngoài giờ</div>
                    <div className="text-[11px] text-slate-500">
                      Cho phép học sinh tự do chọn đề làm bài mà không cần giáo viên mở phòng thi
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowPublicPractice}
                    onChange={(e) => setAllowPublicPractice(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Trợ lý AI chấm tự luận thông minh</div>
                    <div className="text-[11px] text-slate-500">
                      Hỗ trợ giáo viên chấm bài tự luận qua barem và nhận diện hình vẽ/bài viết
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableAiGrading}
                    onChange={(e) => setEnableAiGrading(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Khu vực Nguy hiểm & Quản lý Dữ liệu</span>
                </div>
                <p className="text-[11px] text-rose-600">
                  Thực hiện làm sạch lượt làm bài thi hoặc khôi phục toàn bộ hệ thống về cài đặt ban đầu.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await clearAllSubmissions();
                        toast.success("Đã xóa sạch lượt thi", "Toàn bộ bài nộp và điểm số đã được đưa về 0.");
                      } catch {
                        toast.error("Lỗi", "Không thể xóa bài nộp.");
                      }
                    }}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa toàn bộ lượt thi (Về 0 lượt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Khôi phục toàn bộ dữ liệu gốc</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => toast.success("Đã lưu cài đặt", "Cấu hình hệ thống đã được cập nhật thành công.")}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi cài đặt</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: PHÂN QUYỀN CHI TIẾT CHO NGƯỜI DÙNG (GRANULAR PERMISSION MODAL) */}
      {permissionTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={permissionTargetUser.avatar}
                  alt={permissionTargetUser.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base">
                      Cấp quyền chi tiết: {permissionTargetUser.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                        ROLE_LABELS[permissionTargetUser.role].color
                      }`}
                    >
                      {ROLE_LABELS[permissionTargetUser.role].badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {permissionTargetUser.email} •{" "}
                    {permissionTargetUser.role === "student"
                      ? permissionTargetUser.schoolClass ? `Lớp ${permissionTargetUser.schoolClass}` : "Chưa xếp lớp"
                      : permissionTargetUser.subject || "Toán THPT"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPermissionTargetUser(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Nạp mẫu nhanh:</span>
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset("default")}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition"
                  title="Đặt lại quyền theo vai trò ban đầu"
                >
                  🔄 Mặc định vai trò
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("full_teacher")}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition"
                  title="Cấp toàn quyền Soạn, Duyệt, Live, Chấm thi"
                >
                  ⭐ Toàn quyền Giáo viên
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("ta")}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition"
                  title="Quyền Trợ giảng: Soạn đề & Chấm tự luận"
                >
                  ✨ Trợ giảng / Bộ môn
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("class_president")}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 transition"
                  title="Quyền Ban cán sự học tập"
                >
                  🎯 Ban cán sự lớp
                </button>
              </div>
            </div>

            {/* Danh sách các quyền có thể bật/tắt */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Nhóm 1: Quản trị & Soạn thảo Đề thi */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-700">
                  <BookOpen className="w-4 h-4" />
                  <span>1. Quản lý & Soạn thảo Đề thi (Exam Engine)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(["create_edit_exams", "delete_exams", "approve_exams", "manage_all_exams"] as PermissionKey[]).map((pKey) => {
                    const def = PERMISSION_DEFINITIONS[pKey];
                    const isChecked = selectedPermissions.includes(pKey);
                    return (
                      <div
                        key={pKey}
                        onClick={() => handleTogglePermissionInModal(pKey)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-300 text-indigo-950"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{def.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{def.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nhóm 2: Giảng dạy, Phòng thi & Chấm điểm */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-700">
                  <Layers className="w-4 h-4" />
                  <span>2. Giảng dạy, Phòng thi Live & Chấm thi</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(["presentation_mode", "host_live_room", "view_analytics", "grade_essays"] as PermissionKey[]).map((pKey) => {
                    const def = PERMISSION_DEFINITIONS[pKey];
                    const isChecked = selectedPermissions.includes(pKey);
                    return (
                      <div
                        key={pKey}
                        onClick={() => handleTogglePermissionInModal(pKey)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-300 text-indigo-950"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{def.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{def.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nhóm 3: Luyện thi & Cổng học sinh */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-700">
                  <GraduationCap className="w-4 h-4" />
                  <span>3. Luyện thi & Cổng Học sinh (Student Workspace)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(["take_exams", "view_student_portal"] as PermissionKey[]).map((pKey) => {
                    const def = PERMISSION_DEFINITIONS[pKey];
                    const isChecked = selectedPermissions.includes(pKey);
                    return (
                      <div
                        key={pKey}
                        onClick={() => handleTogglePermissionInModal(pKey)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer pointer-events-none"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{def.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{def.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nhóm 4: Quản trị Hệ thống */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-rose-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>4. Quản trị Cấp cao (System & Admin)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(["manage_users", "system_settings"] as PermissionKey[]).map((pKey) => {
                    const def = PERMISSION_DEFINITIONS[pKey];
                    const isChecked = selectedPermissions.includes(pKey);
                    return (
                      <div
                        key={pKey}
                        onClick={() => handleTogglePermissionInModal(pKey)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? "bg-rose-50/70 border-rose-300 text-rose-950"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer pointer-events-none"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{def.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{def.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-bold">
                Đã kích hoạt: <strong className="text-indigo-600">{selectedPermissions.length}</strong> / 12 quyền
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionTargetUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Áp dụng phân quyền</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM / SỬA THÔNG TIN NGƯỜI DÙNG */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingUserId ? "Chỉnh sửa thông tin tài khoản" : "Tạo tài khoản người dùng mới"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Hình đại diện (Avatar) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Hình đại diện (Avatar)</label>
                <div className="flex items-center gap-3">
                  <img
                    src={
                      formAvatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formName || "User")}`
                    }
                    alt="Preview"
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                  />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {[
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formName || "Edu")}`,
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(formName || "Robot")}`,
                      ].map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormAvatar(url)}
                          className={`w-7 h-7 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                            formAvatar === url ? "border-indigo-600 scale-105" : "border-slate-200 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={formAvatar}
                        onChange={(e) => setFormAvatar(e.target.value)}
                        placeholder="Dán URL ảnh hoặc để trống lấy avatar tự động"
                        className="flex-1 px-3 py-1.5 text-[11px] rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormAvatar(
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formName || Date.now().toString())}`
                          )
                        }
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition shrink-0 flex items-center gap-1"
                        title="Tạo avatar ngẫu nhiên từ tên"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Đổi mẫu</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và Tên (*)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFillEmail}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs transition shrink-0 flex items-center gap-1"
                    title="Tự động tạo email chuẩn từ họ tên"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Sinh Email</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ Email / Tên đăng nhập (*)</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ví dụ: an.nv@student.vn"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Mật khẩu đăng nhập (*)</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPass}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Tạo 6 số ngẫu nhiên</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Mật khẩu (mặc định: 123456)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cấp quyền Vai trò (*)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["student", "teacher", "admin"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormRole(r)}
                      className={`py-2 px-2.5 rounded-xl font-bold border transition text-center ${
                        formRole === r
                          ? `${ROLE_LABELS[r].color} border-transparent shadow-xs font-black`
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {ROLE_LABELS[r].badge}
                    </button>
                  ))}
                </div>
              </div>

              {formRole === "student" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lớp học</label>
                  <input
                    type="text"
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    placeholder="Ví dụ: 12A1, 12A2, 11B1..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {formRole === "teacher" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Môn học phụ trách</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Ví dụ: Toán THPT (Khối 12)..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ví dụ: 0912 345 678"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUserId ? "Lưu cập nhật" : "Cấp tài khoản"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CẤP TÀI KHOẢN HÀNG LOẠT (BATCH PROVISIONING) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-800/80 flex items-center justify-center text-indigo-300">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Cấp tài khoản đồng loạt (Batch Provisioning)</h3>
                  <p className="text-xs text-indigo-300">Tải file mẫu Excel, upload danh sách hoặc dán danh sách họ tên tự động sinh email & mật khẩu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Mode switcher tabs */}
            <div className="px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBatchInputMode("excel")}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 border-t border-x transition ${
                  batchInputMode === "excel"
                    ? "bg-white text-indigo-700 border-slate-200 shadow-2xs -mb-px pb-3"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Upload File Excel / CSV (.xlsx, .csv)</span>
                {parsedExcelUsers.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                    {parsedExcelUsers.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBatchInputMode("text")}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 border-t border-x transition ${
                  batchInputMode === "text"
                    ? "bg-white text-indigo-700 border-slate-200 shadow-2xs -mb-px pb-3"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Dán danh sách Họ tên trực tiếp</span>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              {/* Default Settings Toolbar */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cấu hình mặc định (Áp dụng khi dữ liệu trong file hoặc danh sách để trống)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1 text-[11px]">Vai trò mặc định</label>
                    <select
                      value={batchRole}
                      onChange={(e) => setBatchRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                    >
                      <option value="student">🎓 Học sinh</option>
                      <option value="teacher">👨‍🏫 Giáo viên</option>
                      <option value="admin">👑 Quản trị viên</option>
                    </select>
                  </div>

                  {batchRole === "student" && (
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-[11px]">Lớp học mặc định</label>
                      <input
                        type="text"
                        value={batchClass}
                        onChange={(e) => setBatchClass(e.target.value)}
                        placeholder="12A1"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                      />
                    </div>
                  )}

                  {batchRole === "teacher" && (
                    <div>
                      <label className="block font-bold text-slate-600 mb-1 text-[11px]">Môn học phụ trách</label>
                      <input
                        type="text"
                        value={batchSubject}
                        onChange={(e) => setBatchSubject(e.target.value)}
                        placeholder="Toán học THPT"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-600 mb-1 text-[11px]">Tên miền Email tự sinh</label>
                    <select
                      value={batchDomain}
                      onChange={(e) => setBatchDomain(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                    >
                      <option value="@student.vn">@student.vn (Học sinh)</option>
                      <option value="@edulink.vn">@edulink.vn (Trường học)</option>
                      <option value="@school.edu.vn">@school.edu.vn (Khối GD)</option>
                    </select>
                  </div>
                </div>

                {/* Password rule */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-4 text-[11px]">
                  <span className="font-bold text-slate-600">Mật khẩu ban đầu:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="batchPassRule"
                      checked={batchPasswordRule === "default"}
                      onChange={() => setBatchPasswordRule("default")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mặc định (<strong>123456</strong>)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="batchPassRule"
                      checked={batchPasswordRule === "random"}
                      onChange={() => setBatchPasswordRule("random")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>6 số ngẫu nhiên</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="batchPassRule"
                      checked={batchPasswordRule === "custom"}
                      onChange={() => setBatchPasswordRule("custom")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tùy chỉnh:</span>
                    {batchPasswordRule === "custom" && (
                      <input
                        type="text"
                        value={batchCustomPass}
                        onChange={(e) => setBatchCustomPass(e.target.value)}
                        className="px-2 py-0.5 rounded-lg border border-slate-300 w-24 text-xs font-mono font-bold text-indigo-700 ml-1"
                      />
                    )}
                  </label>
                </div>
              </div>

              {/* TAB 1: EXCEL / CSV UPLOAD */}
              {batchInputMode === "excel" && (
                <div className="space-y-4">
                  {/* Action Banner: Download Template + Upload Zone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Card 1: Download Template */}
                    <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1">
                          <Download className="w-4 h-4 text-emerald-700" />
                          <span>Bước 1: Tải File Excel mẫu chuẩn</span>
                        </div>
                        <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                          Tải về file Excel mẫu đã chuẩn hóa sẵn các cột: <strong>Họ và tên, Lớp, Vai trò, Email, Mật khẩu, SĐT, Môn</strong> kèm hướng dẫn chi tiết.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadExcelTemplate}
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-xs"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Tải File Excel Mẫu (.xlsx)</span>
                      </button>
                    </div>

                    {/* Card 2: Upload Zone */}
                    <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1">
                          <Upload className="w-4 h-4 text-indigo-700" />
                          <span>Bước 2: Tải lên danh sách học sinh / GV</span>
                        </div>
                        <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                          Chọn hoặc kéo thả file <strong>.xlsx, .xls hoặc .csv</strong> từ máy tính. Hệ thống sẽ tự động đọc dữ liệu và đối soát tài khoản.
                        </p>
                      </div>

                      <label className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingExcel ? "Đang xử lý..." : "Chọn File Excel tải lên"}</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleExcelFileUpload(file);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Upload Status / Drag Box */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleExcelFileUpload(file);
                      }
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-4 text-center transition cursor-pointer"
                  >
                    <label className="cursor-pointer block">
                      <FileSpreadsheet className="w-8 h-8 text-indigo-500 mx-auto mb-1.5" />
                      <div className="font-bold text-slate-800 text-xs">
                        {uploadedFileName ? (
                          <span className="text-emerald-700">
                            ✓ Đã nạp file: <strong>{uploadedFileName}</strong> ({parsedExcelUsers.length} tài khoản)
                          </span>
                        ) : (
                          "Kéo & thả file Excel (.xlsx / .csv) vào đây hoặc bấm để duyệt file"
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Hỗ trợ cả file Excel có dấu hoặc không dấu. Nếu để trống email/mật khẩu, hệ thống sẽ tự sinh tự động.
                      </p>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleExcelFileUpload(file);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Parsed Users Table Preview */}
                  {parsedExcelUsers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            Danh sách trích xuất ({parsedExcelUsers.length} tài khoản sẵn sàng cấp):
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setParsedExcelUsers([]);
                            setUploadedFileName(null);
                          }}
                          className="text-[11px] text-rose-600 hover:underline font-bold"
                        >
                          Xóa và tải lại file khác
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">STT</th>
                              <th className="py-2 px-3">Họ và tên</th>
                              <th className="py-2 px-3">Vai trò</th>
                              <th className="py-2 px-3">Lớp / Môn</th>
                              <th className="py-2 px-3">Email (Tên đăng nhập)</th>
                              <th className="py-2 px-3">Mật khẩu</th>
                              <th className="py-2 px-3 text-center">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white font-medium">
                            {parsedExcelUsers.map((u, idx) => (
                              <tr key={idx} className="hover:bg-indigo-50/30 transition">
                                <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{u.name}</td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      u.role === "teacher"
                                        ? "bg-indigo-100 text-indigo-800"
                                        : u.role === "admin"
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {ROLE_LABELS[u.role].title}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-600 font-bold">
                                  {u.schoolClass || u.subject || "-"}
                                </td>
                                <td className="py-2 px-3 font-mono text-indigo-600">{u.email}</td>
                                <td className="py-2 px-3 font-mono font-bold text-slate-700">
                                  {u.password || "123456"}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParsedRow(idx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="Xóa dòng này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-2xl flex items-start gap-2 text-amber-900 text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Mẹo nhập danh sách:</strong> Bạn có thể tải file Excel mẫu ở nút trên, điền danh sách học sinh của lớp và tải lên. Cột <strong>Họ và tên</strong> là bắt buộc, các cột khác hệ thống sẽ tự động bù đắp theo cấu hình.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TEXT LIST */}
              {batchInputMode === "text" && (
                <div className="space-y-4">
                  {/* Danh sách họ tên */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700">
                        Danh sách họ tên (mỗi học sinh 1 dòng)
                      </label>
                      <span className="text-[11px] text-indigo-600 font-bold">
                        {batchNamesText.split("\n").filter((l) => l.trim().length > 0).length} người dùng
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={batchNamesText}
                      onChange={(e) => setBatchNamesText(e.target.value)}
                      placeholder="Nhập hoặc dán danh sách học sinh (Nguyễn Văn A&#10;Trần Thị B...)"
                      className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Xem trước mẫu (Preview) */}
                  <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
                    <div className="font-bold text-indigo-900 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Xem trước danh sách tài khoản sẽ được cấp:</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {batchNamesText
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .slice(0, 5)
                        .map((name, i) => {
                          const email = generateEmailFromName(name, batchDomain, []);
                          return (
                            <div key={i} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-indigo-100">
                              <span className="font-bold text-slate-900">{name}</span>
                              <span className="text-indigo-600 font-mono">{email}</span>
                              <span className="text-slate-500 font-mono font-bold">
                                PW: {batchPasswordRule === "default" ? "123456" : batchPasswordRule === "random" ? "••••••" : batchCustomPass}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Sẵn sàng cấp cho{" "}
                <strong className="text-indigo-600">
                  {batchInputMode === "excel"
                    ? parsedExcelUsers.length
                    : batchNamesText.split("\n").filter((l) => l.trim().length > 0).length}
                </strong>{" "}
                tài khoản
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBatchProvision}
                  disabled={batchInputMode === "excel" && parsedExcelUsers.length === 0}
                  className={`px-5 py-2 rounded-xl font-bold transition shadow-sm flex items-center gap-1.5 text-xs ${
                    batchInputMode === "excel" && parsedExcelUsers.length === 0
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Xác nhận Cấp tài khoản</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: XUẤT PHIẾU CẤP TÀI KHOẢN & TẢI FILE CSV / EXCEL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base">Xuất phiếu cấp tài khoản & Danh sách đăng nhập</h3>
                  <p className="text-xs text-slate-400">In phiếu phát cho học sinh hoặc xuất file Excel (.xlsx) / CSV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Lọc theo lớp/nhóm:</span>
                <select
                  value={exportClassFilter}
                  onChange={(e) => setExportClassFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Tất cả ({users.length} tài khoản)</option>
                  {userClasses.map((c) => (
                    <option key={c} value={c}>Lớp {c}</option>
                  ))}
                  <option value="teacher">Chỉ Giáo viên</option>
                  <option value="student">Chỉ Học sinh</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const list = users.filter((u) => {
                      if (exportClassFilter === "all") return true;
                      if (exportClassFilter === "teacher") return u.role === "teacher";
                      if (exportClassFilter === "student") return u.role === "student";
                      return u.schoolClass === exportClassFilter;
                    });
                    const fullText = list
                      .map(
                        (u, i) =>
                          `${i + 1}. Họ tên: ${u.name} | Email: ${u.email} | Mật khẩu: ${u.password || "123456"} | Vai trò: ${ROLE_LABELS[u.role].title}${u.schoolClass ? ` | Lớp: ${u.schoolClass}` : ""}`
                      )
                      .join("\n");
                    navigator.clipboard.writeText(fullText);
                    toast.success("Đã sao chép!", `Đã sao chép thông tin ${list.length} tài khoản.`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sao chép toàn bộ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const list = users.filter((u) => {
                      if (exportClassFilter === "all") return true;
                      if (exportClassFilter === "teacher") return u.role === "teacher";
                      if (exportClassFilter === "student") return u.role === "student";
                      return u.schoolClass === exportClassFilter;
                    });
                    handleExportExcel(list);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tải File Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const list = users.filter((u) => {
                      if (exportClassFilter === "all") return true;
                      if (exportClassFilter === "teacher") return u.role === "teacher";
                      if (exportClassFilter === "student") return u.role === "student";
                      return u.schoolClass === exportClassFilter;
                    });
                    handleExportCSV(list);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold transition flex items-center gap-1 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tải CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In phiếu ngay</span>
                </button>
              </div>
            </div>

            {/* Cards Grid Preview */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/70">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {users
                  .filter((u) => {
                    if (exportClassFilter === "all") return true;
                    if (exportClassFilter === "teacher") return u.role === "teacher";
                    if (exportClassFilter === "student") return u.role === "student";
                    return u.schoolClass === exportClassFilter;
                  })
                  .map((u) => (
                    <div
                      key={u.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <img src={u.avatar} alt="" className="w-8 h-8 rounded-xl object-cover border border-slate-200" />
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                              {ROLE_LABELS[u.role].title} {u.schoolClass ? `• Lớp ${u.schoolClass}` : ""}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(u)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition"
                          title="Sao chép"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-sans">Tài khoản:</span>
                          <span className="font-bold text-slate-800">{u.email}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-sans">Mật khẩu:</span>
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {u.password || "123456"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA TÀI KHOẢN ĐƠN LẺ */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tài khoản</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={userToDelete.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userToDelete.name)}`}
                  alt={userToDelete.name}
                  className="w-10 h-10 rounded-xl object-cover bg-slate-200 border border-slate-200"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">{userToDelete.name}</div>
                  <div className="text-xs text-slate-500">{userToDelete.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">Vai trò:</span>
                <span className="font-bold text-slate-700">
                  {userToDelete.role === "admin" ? "Quản trị viên" : userToDelete.role === "teacher" ? "Giáo viên" : "Học sinh"}
                </span>
                {userToDelete.schoolClass && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">Lớp:</span>
                    <span className="font-bold text-indigo-600">{userToDelete.schoolClass}</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong className="text-slate-900">{userToDelete.name}</strong>? Toàn bộ thông tin tài khoản và phân quyền sẽ bị gỡ bỏ khỏi hệ thống.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-user"
                type="button"
                onClick={() => {
                  const idToDelete = userToDelete.id;
                  deleteUser(idToDelete);
                  setUserToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA HÀNG LOẠT */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xóa hàng loạt tài khoản</h3>
                <p className="text-xs text-slate-500">Xóa đồng thời nhiều tài khoản đã chọn</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn <strong className="text-rose-600 font-bold">{selectedUserIds.filter(id => id !== currentUser.id).length}</strong> tài khoản đã chọn? Dữ liệu người dùng sẽ được gỡ bỏ hoàn toàn.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBatchDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-batch-users"
                type="button"
                onClick={() => {
                  deleteUsersBatch(selectedUserIds);
                  setSelectedUserIds([]);
                  setBatchDeleteConfirm(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa tất cả</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA ĐỀ THI */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa đề thi</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa đề thi <strong className="text-slate-900">{examToDelete.title}</strong> khỏi hệ thống?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-exam"
                type="button"
                onClick={() => {
                  onDeleteExam(examToDelete.id);
                  setExamToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa đề thi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA TẤT CẢ ĐỀ THI */}
      {showClearAllExamsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xóa toàn bộ ngân hàng đề thi</h3>
                <p className="text-xs text-slate-500">Xác nhận dọn dẹp sạch sẽ</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ <strong>{exams.length} đề thi</strong> khỏi cơ sở dữ liệu Firebase và bộ nhớ hệ thống? Hành động này sẽ đưa ngân hàng đề về trạng thái trống hoàn toàn và không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllExamsConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-clear-all-exams"
                type="button"
                onClick={async () => {
                  try {
                    await clearAllExams();
                    toast.success("Đã xóa sạch ngân hàng đề", "Toàn bộ đề thi đã được dọn dẹp khỏi cơ sở dữ liệu.");
                  } catch (e) {
                    toast.error("Lỗi khi xóa", "Không thể xóa đề thi. Vui lòng thử lại.");
                  }
                  setShowClearAllExamsConfirm(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa sạch {exams.length} đề</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN KHÔI PHỤC DỮ LIỆU GỐC */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Khôi phục dữ liệu gốc</h3>
                <p className="text-xs text-slate-500">Khu vực nhạy cảm</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn khôi phục toàn bộ hệ thống về cài đặt ban đầu? Toàn bộ phiên lưu trữ cục bộ sẽ được dọn dẹp và trang sẽ được tải lại.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-reset-system"
                type="button"
                onClick={async () => {
                  try {
                    await wipeAndResetAllData();
                  } catch {}
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Xác nhận khôi phục & Xóa sạch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA TOÀN DIỆN ĐỀ THI TRONG ADMIN */}
      {editingExam && (
        <ExamEditorModal
          isOpen={!!editingExam}
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={(updatedExam) => {
            onSaveExam(updatedExam);
            setEditingExam(null);
          }}
          onDelete={(id) => {
            onDeleteExam(id);
            setEditingExam(null);
          }}
        />
      )}
    </div>
  );
};
