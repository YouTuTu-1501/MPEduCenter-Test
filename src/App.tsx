import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Exam, StudentSubmission } from "./types/exam";
import { User } from "./types/auth";
import { defaultExam001, initialSampleExams } from "./data/defaultExam";
import { Navbar, ActiveView } from "./components/Navbar";
import { BankManagerView } from "./components/BankManagerView";
import { PresentationView } from "./components/PresentationView";
import { StudentExamView } from "./components/StudentExamView";
import { TeacherAnalyticsView } from "./components/TeacherAnalyticsView";
import { RealtimeLiveRoomView } from "./components/RealtimeLiveRoomView";
import { AdminManagementView } from "./components/AdminManagementView";
import { StudentPortalView } from "./components/StudentPortalView";
import { AuthModal } from "./components/AuthModal";
import { UserProfileModal } from "./components/UserProfileModal";
import { StudentResultHistoryModal } from "./components/StudentResultHistoryModal";
import { ClassLeaderboardModal } from "./components/ClassLeaderboardModal";
import { LeaderboardView } from "./components/LeaderboardView";
import { LoginScreen } from "./components/LoginScreen";
import { ToastProvider, useToast } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FilterProvider, useFilter } from "./context/FilterContext";
import { GlobalFilterDrawer } from "./components/GlobalFilterDrawer";
import {
  subscribeExams,
  saveExamToFirestore,
  deleteExamFromFirestore,
  subscribeSubmissions,
  saveSubmissionToFirestore,
  getLocalSubmissions,
  saveUserToFirestore,
  getDeletedExamIds,
  getDeletedSubmissionIds,
  getDeletedUserIds,
  clearOrphanedData,
  cleanupOrphanedSubmissions,
} from "./services/firestoreService";
import { RotateCcw, Home, Sparkles } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-lg shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-white">Đã phát hiện lỗi tương tác</h2>
            <p className="text-xs text-slate-400">
              Hệ thống đã tự động bảo vệ trạng thái của bạn. Hãy bấm nút dưới đây để khôi phục và tiếp tục sử dụng bình thường.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("edutest_exams");
                    localStorage.removeItem("edutest_submissions");
                    localStorage.removeItem("edutest_deleted_exams");
                    localStorage.removeItem("edutest_deleted_submissions");
                    localStorage.removeItem("mpeducenter_deleted_users");
                    localStorage.removeItem("mpeducenter_users");
                    localStorage.removeItem("mpeducenter_auth_session");
                  } catch {}
                  window.location.reload();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Khôi phục dữ liệu gốc</span>
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <FilterProvider>
            <AppRoot />
            <AuthModal />
            <UserProfileModal />
          </FilterProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

function AppRoot() {
  const { isAuthenticated, currentUser } = useAuth();

  // Bắt buộc người dùng phải đăng nhập mới xem được nội dung trang web
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen />;
  }

  return <MainApp currentUser={currentUser} />;
}

function MainApp({ currentUser }: { currentUser: User }) {
  const { toast } = useToast();
  const { users, isAdmin, isTeacher, isStudent } = useAuth();
  const { selectedClassFilter, setSelectedClassFilter, selectedExamFilter, setSelectedExamFilter } = useFilter();
  const [exams, setExams] = useState<Exam[]>(() => {
    const deleted = getDeletedExamIds();
    try {
      const saved = localStorage.getItem("edutest_exams");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((e: Exam) => e && e.id && !deleted.has(e.id));
        }
      }
    } catch {}
    return initialSampleExams.filter((e) => !deleted.has(e.id));
  });
  const [selectedExam, setSelectedExam] = useState<Exam>(() => {
    const deleted = getDeletedExamIds();
    const available = initialSampleExams.filter((e) => !deleted.has(e.id));
    return available[0] || defaultExam001;
  });
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    return isStudent ? "student_portal" : "bank";
  });
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() =>
    getLocalSubmissions()
  );

  // Trạng thái mở Modal Bảng xếp hạng và Modal Lịch sử kết quả học sinh
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyTargetUser, setHistoryTargetUser] = useState<User | null>(null);

  // 1. Quét và loại bỏ vĩnh viễn các bản ghi submission không thuộc về userId nào đang tồn tại
  useEffect(() => {
    clearOrphanedData().catch(() => {});
  }, []);

  // Tự động điều chỉnh tab điều hướng khi đổi vai trò (RBAC Route Guard)
  useEffect(() => {
    if (isStudent && (activeView === "bank" || activeView === "presentation" || activeView === "analytics" || activeView === "admin")) {
      setActiveView("student_portal");
    } else if (isTeacher && (activeView === "admin" || activeView === "student_portal")) {
      setActiveView("bank");
    }
  }, [currentUser.role]);

  // Đồng bộ Ngân hàng đề thi và Kết quả thi từ Firestore theo thời gian thực
  useEffect(() => {
    // 1. Subscribe Đề thi
    const unsubExams = subscribeExams((firestoreExams) => {
      if (firestoreExams) {
        const deleted = getDeletedExamIds();
        const filtered = firestoreExams.filter((e) => e && e.id && !deleted.has(e.id));
        setExams(filtered);
        setSelectedExam((current) => {
          const match = filtered.find((e) => e.id === current?.id);
          return match || filtered[0] || defaultExam001;
        });
      }
    });

    // 2. Subscribe Bài nộp
    const unsubSubs = subscribeSubmissions((firestoreSubs) => {
      if (firestoreSubs) {
        const deletedSubs = getDeletedSubmissionIds();
        const filtered = firestoreSubs.filter((s) => s && s.id && !deletedSubs.has(s.id));
        setSubmissions(filtered);
      }
    });

    return () => {
      unsubExams();
      unsubSubs();
    };
  }, []);

  // Tự động quét và dọn dẹp các bài nộp không thuộc về bất kỳ tài khoản học sinh nào hiện có
  useEffect(() => {
    if (users && users.length > 0) {
      clearOrphanedData(users).catch(() => {});
    }
  }, [users]);

  // Lọc danh sách bài nộp hợp lệ: chỉ giữ lại bài nộp của học sinh thực tế còn tồn tại trong hệ thống
  const validSubmissions = React.useMemo(() => {
    const deletedUserIds = getDeletedUserIds();
    const deletedSubs = getDeletedSubmissionIds();
    const studentUsers = users.filter((u) => u.role === "student" || !u.role);
    const validUserIds = new Set(users.map((u) => u.id));
    const validEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const validNames = new Set(users.map((u) => u.name.trim().toLowerCase()));

    // Nếu hệ thống không có học sinh nào, danh sách lượt thi chắc chắn là 0
    if (users.length > 0 && studentUsers.length === 0) {
      return [];
    }

    return submissions.filter((s) => {
      if (!s || !s.id || deletedSubs.has(s.id)) return false;
      if (s.studentId && deletedUserIds.has(s.studentId)) return false;
      if (users.length > 0) {
        const isMatched =
          (s.studentId && validUserIds.has(s.studentId)) ||
          (s.studentEmail && validEmails.has(s.studentEmail.toLowerCase())) ||
          (s.studentName && validNames.has(s.studentName.trim().toLowerCase()));
        return Boolean(isMatched);
      }
      return true;
    });
  }, [submissions, users]);

  // Đảm bảo selectedExam luôn hợp lệ
  const safeSelectedExam = selectedExam || exams[0] || defaultExam001;

  // Lưu đề thi vào danh sách & đẩy lên Firestore
  const handleSaveExam = (newExam: Exam) => {
    let isExisting = false;
    setExams((prev) => {
      const idx = prev.findIndex((e) => e.id === newExam.id);
      let updated: Exam[];
      if (idx >= 0) {
        isExisting = true;
        updated = [...prev];
        updated[idx] = newExam;
      } else {
        updated = [newExam, ...prev];
      }
      try {
        localStorage.setItem("edutest_exams", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSelectedExam(newExam);
    saveExamToFirestore(newExam).catch((e) => console.warn(e));

    if (isExisting) {
      toast.success(
        "Cập nhật đề thi thành công!",
        `Đề thi "${newExam.title}" (Mã: ${newExam.code}) đã được đồng bộ lên Firebase.`
      );
    } else {
      toast.success(
        "Thêm đề thi mới thành công!",
        `Đã nạp đề "${newExam.title}" gồm ${newExam.questions.length} câu hỏi lên Firebase.`
      );
    }
  };

  // Xóa đề thi khỏi Firestore
  const handleDeleteExam = (examId: string) => {
    const target = exams.find((e) => e.id === examId);
    setExams((prev) => {
      const updated = prev.filter((e) => e.id !== examId);
      try {
        localStorage.setItem("edutest_exams", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (safeSelectedExam.id === examId) {
      const remaining = exams.filter((e) => e.id !== examId);
      if (remaining.length > 0) {
        setSelectedExam(remaining[0]);
      }
    }
    deleteExamFromFirestore(examId).catch((e) => console.warn(e));
    toast.info(
      "Đã xóa đề thi khỏi hệ thống",
      target ? `Đề thi "${target.title}" đã được gỡ bỏ khỏi Firebase.` : undefined
    );
  };

  // Chọn đề và chuyển thẳng vào phân hệ mong muốn
  const handleSelectExam = (
    exam: Exam,
    mode: "presentation" | "exam" | "analytics" | "live"
  ) => {
    setSelectedExam(exam);
    setActiveView(mode);
  };

  // Học sinh bắt đầu làm bài thi
  const handleStudentStartExam = (exam: Exam) => {
    setSelectedExam(exam);
    setActiveView("exam");
  };

  // Lưu kết quả nộp bài thi lên Firestore & LocalStorage
  const handleSubmissionComplete = (sub: StudentSubmission) => {
    setSubmissions((prev) => {
      const filtered = prev.filter((s) => s.id !== sub.id);
      const updated = [sub, ...filtered];
      try {
        localStorage.setItem("edutest_submissions", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    saveSubmissionToFirestore(sub).catch((e) => console.warn(e));
  };

  // Tự động tạo và đồng bộ hồ sơ người dùng nếu học sinh chưa có trong danh bạ users nhưng có bài nộp
  const autoRegisterUnknownStudent = (
    studentId: string,
    studentName: string,
    matchingSub?: StudentSubmission
  ): User => {
    const cleanId = (studentId || `usr_stu_${Date.now()}`).trim();
    const cleanName = (studentName || "Học sinh").trim();
    const cleanClass = matchingSub?.studentClass || "";
    const cleanEmail =
      matchingSub?.studentEmail ||
      `${cleanId.toLowerCase().replace(/[^a-z0-9]/g, "") || "student"}@student.vn`;
    const cleanAvatar =
      matchingSub?.studentAvatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`;

    const newUser: User = {
      id: cleanId,
      name: cleanName,
      email: cleanEmail,
      password: "password" in { password: "" } ? "123456" : "123456",
      role: "student",
      avatar: cleanAvatar,
      schoolClass: cleanClass,
      phone: "0900 000 000",
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
      lastLogin: "Vừa xong",
      bio: `Học sinh Lớp ${cleanClass} - Hồ sơ tự động tạo từ kết quả bài nộp`,
    };

    // 1. Đồng bộ lên Firestore
    saveUserToFirestore(newUser).catch((e) =>
      console.warn("Lỗi lưu auto-registered user vào Firestore:", e)
    );

    // 2. Lưu vào LocalStorage cache để Quản lý Tài khoản & Bảng xếp hạng cập nhật tức thì
    try {
      const savedUsersStr = localStorage.getItem("mpeducenter_users");
      const currentUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      if (
        !currentUsers.some(
          (u) =>
            u.id === newUser.id ||
            u.email.toLowerCase() === newUser.email.toLowerCase()
        )
      ) {
        const updatedUsers = [newUser, ...currentUsers];
        localStorage.setItem("mpeducenter_users", JSON.stringify(updatedUsers));
      }
    } catch {}

    return newUser;
  };

  // Mở lịch sử thi của một học sinh cụ thể
  const handleOpenStudentHistory = (studentId: string, studentName: string) => {
    // 1. Kiểm tra đối chiếu với danh sách users hệ thống
    const existingUser = users.find(
      (u) =>
        (u.id && u.id.trim() === studentId.trim()) ||
        (u.name && u.name.toLowerCase().trim() === studentName.toLowerCase().trim())
    );

    // 2. Tìm bài nộp liên quan để trích xuất thêm avatar và lớp chuẩn
    const matchingSub = submissions.find(
      (s) =>
        s.studentId === studentId ||
        s.studentName.toLowerCase().includes(studentName.toLowerCase()) ||
        studentName.toLowerCase().includes(s.studentName.toLowerCase())
    );

    // 3. Nếu chưa có trong users nhưng có bài nộp (hoặc click từ BXH), kích hoạt autoRegisterUnknownStudent
    const target: User =
      existingUser ||
      autoRegisterUnknownStudent(studentId, studentName, matchingSub);

    setHistoryTargetUser(target);
    setShowHistoryModal(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800 font-sans">
      {/* Ẩn Navbar khi đang ở chế độ Trình chiếu toàn màn hình để tối đa không gian */}
      {activeView !== "presentation" && (
        <Navbar
          activeView={activeView}
          setActiveView={setActiveView}
          examTitle={safeSelectedExam.title}
          examCode={safeSelectedExam.code}
          selectedClassFilter={selectedClassFilter}
          onSelectClassFilter={setSelectedClassFilter}
          onOpenLeaderboard={() => setActiveView("leaderboard")}
          onOpenHistory={() => {
            setHistoryTargetUser(currentUser);
            setShowHistoryModal(true);
          }}
        />
      )}

      {/* Phân hệ 1: Quản lý Ngân hàng đề thi (Dành cho Admin & Giáo viên) */}
      {activeView === "bank" && (
        <BankManagerView
          exams={exams}
          onSelectExam={handleSelectExam}
          onSaveExam={handleSaveExam}
          onDeleteExam={handleDeleteExam}
          selectedClassFilter={selectedClassFilter}
          onSelectClassFilter={setSelectedClassFilter}
          submissions={validSubmissions}
        />
      )}

      {/* Phân hệ 2: Trình chiếu câu hỏi chuyên nghiệp (Admin & Giáo viên) */}
      {activeView === "presentation" && (
        <PresentationView
          exam={safeSelectedExam}
          onExit={() => setActiveView(isStudent ? "student_portal" : "bank")}
        />
      )}

      {/* Phân hệ 3: Làm bài thi trực tuyến cho Học sinh (4 dạng thức) */}
      {activeView === "exam" && (
        <StudentExamView
          exam={safeSelectedExam}
          onExit={() => setActiveView(isStudent ? "student_portal" : "bank")}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}

      {/* Phân hệ 4: Bảng điều khiển phân tích & Chấm thi cho Giáo viên / Admin */}
      {activeView === "analytics" && (
        <TeacherAnalyticsView
          exam={safeSelectedExam}
          submissions={validSubmissions}
          onBack={() => setActiveView(isStudent ? "student_portal" : "bank")}
          selectedClassFilter={selectedClassFilter}
          onSelectClassFilter={setSelectedClassFilter}
          allExams={exams}
          onSelectExam={(exam) => {
            handleSelectExam(exam, "analytics");
            setSelectedExamFilter(exam.id);
          }}
          onOpenLeaderboard={() => setActiveView("leaderboard")}
          onOpenStudentHistory={handleOpenStudentHistory}
          users={users}
        />
      )}

      {/* Phân hệ 5: Bảng Xếp Hạng Điểm Số Học Sinh (Toàn bộ các lớp / Theo từng khối) */}
      {activeView === "leaderboard" && (
        <LeaderboardView
          exams={exams}
          submissions={validSubmissions}
          users={users}
          defaultClassFilter={selectedClassFilter}
          defaultExamId={selectedExamFilter}
          onViewStudentHistory={handleOpenStudentHistory}
          onBack={() => setActiveView(isStudent ? "student_portal" : "bank")}
        />
      )}

      {/* Phân hệ 6: Phòng thi trực tiếp đồng bộ thời gian thực */}
      {activeView === "live" && (
        <RealtimeLiveRoomView
          exam={safeSelectedExam}
          onExit={() => setActiveView(isStudent ? "student_portal" : "bank")}
        />
      )}

      {/* Phân hệ 7: Quản trị Toàn diện & Phân quyền Người dùng (Dành riêng cho Admin) */}
      {activeView === "admin" && (
        <AdminManagementView
          exams={exams}
          submissions={validSubmissions}
          onSelectExam={handleSelectExam}
          onDeleteExam={handleDeleteExam}
          onSaveExam={handleSaveExam}
          selectedClassFilter={selectedClassFilter}
          onSelectClassFilter={setSelectedClassFilter}
        />
      )}

      {/* Phân hệ 8: Cổng Thông tin & Luyện thi Cá nhân (Dành cho Học sinh) */}
      {activeView === "student_portal" && (
        <StudentPortalView
          exams={exams}
          submissions={validSubmissions}
          onStartExam={handleStudentStartExam}
          onJoinLiveRoom={() => setActiveView("live")}
          onOpenLeaderboard={() => setActiveView("leaderboard")}
          onOpenHistory={() => {
            setHistoryTargetUser(currentUser);
            setShowHistoryModal(true);
          }}
        />
      )}

      {/* Modal 1: Lịch sử & Bảng điểm tất cả các lần làm bài thi của học sinh */}
      <StudentResultHistoryModal
        user={historyTargetUser || currentUser}
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setHistoryTargetUser(null);
        }}
        submissions={validSubmissions}
      />

      {/* Modal 2: Bảng Xếp Hạng Điểm Số Học Sinh Theo Lớp & Theo Từng Đề Thi */}
      <ClassLeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        exams={exams}
        submissions={validSubmissions}
        users={users}
        defaultClassFilter={selectedClassFilter}
        defaultExamId={selectedExamFilter}
        onViewStudentHistory={handleOpenStudentHistory}
      />

      {/* Global Filter Drawer (Sidebar Lọc Dùng Chung Toàn Hệ Thống) */}
      <GlobalFilterDrawer
        totalSubmissions={validSubmissions.length}
        totalUsers={users.length}
      />
    </div>
  );
}
