import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Exam, StudentSubmission } from "./types/exam";
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
import { ToastProvider, useToast } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  subscribeExams,
  saveExamToFirestore,
  deleteExamFromFirestore,
  subscribeSubmissions,
  saveSubmissionToFirestore,
  getLocalSubmissions,
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
          <MainApp />
          <AuthModal />
          <UserProfileModal />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

function MainApp() {
  const { toast } = useToast();
  const { currentUser, isAdmin, isTeacher, isStudent } = useAuth();
  const [exams, setExams] = useState<Exam[]>(initialSampleExams);
  const [selectedExam, setSelectedExam] = useState<Exam>(defaultExam001);
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    return isStudent ? "student_portal" : "bank";
  });
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() =>
    getLocalSubmissions()
  );

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
      if (firestoreExams && firestoreExams.length > 0) {
        setExams(firestoreExams);
        setSelectedExam((current) => {
          const match = firestoreExams.find((e) => e.id === current?.id);
          return match || firestoreExams[0];
        });
      }
    });

    // 2. Subscribe Bài nộp
    const unsubSubs = subscribeSubmissions((firestoreSubs) => {
      if (firestoreSubs) {
        setSubmissions(firestoreSubs);
      }
    });

    return () => {
      unsubExams();
      unsubSubs();
    };
  }, []);

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
        />
      )}

      {/* Phân hệ 1: Quản lý Ngân hàng đề thi (Dành cho Admin & Giáo viên) */}
      {activeView === "bank" && (
        <BankManagerView
          exams={exams.length > 0 ? exams : [defaultExam001]}
          onSelectExam={handleSelectExam}
          onSaveExam={handleSaveExam}
          onDeleteExam={handleDeleteExam}
          selectedClassFilter={selectedClassFilter}
          onSelectClassFilter={setSelectedClassFilter}
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
          submissions={submissions.filter((s) => s.examId === safeSelectedExam.id)}
          onBack={() => setActiveView(isStudent ? "student_portal" : "bank")}
          selectedClassFilter={selectedClassFilter}
          onSelectClassFilter={setSelectedClassFilter}
          allExams={exams}
          onSelectExam={(exam) => handleSelectExam(exam, "analytics")}
        />
      )}

      {/* Phân hệ 5: Phòng thi trực tiếp đồng bộ thời gian thực */}
      {activeView === "live" && (
        <RealtimeLiveRoomView
          exam={safeSelectedExam}
          onExit={() => setActiveView(isStudent ? "student_portal" : "bank")}
        />
      )}

      {/* Phân hệ 6: Quản trị Toàn diện & Phân quyền Người dùng (Dành riêng cho Admin) */}
      {activeView === "admin" && (
        <AdminManagementView
          exams={exams.length > 0 ? exams : [defaultExam001]}
          submissions={submissions}
          onSelectExam={handleSelectExam}
          onDeleteExam={handleDeleteExam}
          onSaveExam={handleSaveExam}
          selectedClassFilter={selectedClassFilter}
          onSelectClassFilter={setSelectedClassFilter}
        />
      )}

      {/* Phân hệ 7: Cổng Thông tin & Luyện thi Cá nhân (Dành cho Học sinh) */}
      {activeView === "student_portal" && (
        <StudentPortalView
          exams={exams.length > 0 ? exams : [defaultExam001]}
          submissions={submissions}
          onStartExam={handleStudentStartExam}
          onJoinLiveRoom={() => setActiveView("live")}
        />
      )}
    </div>
  );
}
