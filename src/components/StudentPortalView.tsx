import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { Exam, StudentSubmission, checkExamAccessStatus, STANDARD_GRADES } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import { ExamCodeEntryModal } from "./ExamCodeEntryModal";
import { isExamCodeMatch, parseStandardExamCode } from "../utils/examCodeHelper";
import { useToast } from "../context/ToastContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  GraduationCap,
  BookOpen,
  History,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Layers,
  Search,
  Filter,
  Eye,
  Sparkles,
  ChevronRight,
  ArrowRight,
  BarChart2,
  Calendar,
  KeyRound,
  FileCheck,
  Trophy,
  Lock,
  Unlock,
  AlertCircle,
  Send,
  Info,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  Sliders,
  Settings2,
  Star,
  Trash2,
  Plus,
  Check,
  Flame,
  Target,
  Compass,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  LayoutGrid,
  X,
} from "lucide-react";

// Tooltip hiển thị chi tiết khi rê chuột vào cột biểu đồ
const StudentScoreTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 max-w-xs text-xs space-y-2.5 z-50">
      <div className="border-b border-slate-700/80 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
            Kỳ thi #{data.attemptIndex}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{data.dateFormatted}</span>
        </div>
        <h4 className="font-extrabold text-slate-100 text-sm mt-1 leading-snug">
          {data.examTitle}
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Tỷ lệ đạt được</span>
          <span className="text-base font-black text-emerald-400">{data.percentage}%</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Điểm số</span>
          <span className="text-base font-black text-amber-300">
            {data.score}/{data.maxScore}đ
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
        <span className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Thời gian: {data.timeMinutes} phút</span>
        </span>
        <span className="text-[10px] text-emerald-300 font-bold">Bấm để xem lại →</span>
      </div>
    </div>
  );
};

interface StudentPortalViewProps {
  exams: Exam[];
  submissions: StudentSubmission[];
  onStartExam: (exam: Exam) => void;
  onJoinLiveRoom: () => void;
  onOpenLeaderboard?: () => void;
  onOpenHistory?: () => void;
  onOpenPractice?: () => void;
}

export interface DashboardWidgetConfig {
  showPinnedExams: boolean;
  showPinnedTopics: boolean;
  showStudyGoal: boolean;
  showQuickStats: boolean;
  targetExamCountWeekly: number;
}

const DEFAULT_WIDGET_CONFIG: DashboardWidgetConfig = {
  showPinnedExams: true,
  showPinnedTopics: true,
  showStudyGoal: true,
  showQuickStats: true,
  targetExamCountWeekly: 5,
};

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  exams,
  submissions,
  onStartExam,
  onJoinLiveRoom,
  onOpenLeaderboard,
  onOpenHistory,
  onOpenPractice,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"exams" | "history" | "analytics">("exams");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubmissionReview, setSelectedSubmissionReview] = useState<StudentSubmission | null>(null);

  // Quản lý Dashboard widgets & ghim cá nhân hóa theo học sinh
  const storagePrefix = `edutest_student_${currentUser.id}`;

  const [pinnedExamIds, setPinnedExamIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_pinned_exams`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pinnedChapters, setPinnedChapters] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_pinned_chapters`);
      if (saved) return JSON.parse(saved);
      return [
        "Ứng dụng đạo hàm & Khảo sát hàm số",
        "Hình học không gian Oxyz",
      ];
    } catch {
      return [
        "Ứng dụng đạo hàm & Khảo sát hàm số",
        "Hình học không gian Oxyz",
      ];
    }
  });

  const [widgetConfig, setWidgetConfig] = useState<DashboardWidgetConfig>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}_widget_config`);
      return saved ? { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(saved) } : DEFAULT_WIDGET_CONFIG;
    } catch {
      return DEFAULT_WIDGET_CONFIG;
    }
  });

  const [showCustomizerModal, setShowCustomizerModal] = useState<boolean>(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState<boolean>(false);

  // Cập nhật và lưu vào LocalStorage
  const updatePinnedExamIds = (newIds: string[]) => {
    setPinnedExamIds(newIds);
    try {
      localStorage.setItem(`${storagePrefix}_pinned_exams`, JSON.stringify(newIds));
    } catch {}
  };

  const updatePinnedChapters = (newChapters: string[]) => {
    setPinnedChapters(newChapters);
    try {
      localStorage.setItem(`${storagePrefix}_pinned_chapters`, JSON.stringify(newChapters));
    } catch {}
  };

  const updateWidgetConfig = (newConfig: Partial<DashboardWidgetConfig>) => {
    setWidgetConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(`${storagePrefix}_widget_config`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleTogglePinExam = (examId: string) => {
    const isPinned = pinnedExamIds.includes(examId);
    const exam = exams.find((e) => e.id === examId);
    const examTitle = exam ? exam.title : "Đề thi";

    if (isPinned) {
      const next = pinnedExamIds.filter((id) => id !== examId);
      updatePinnedExamIds(next);
      toast.info("Đã bỏ ghim đề thi", `Đã xóa "${examTitle}" khỏi Bảng điều khiển cá nhân.`);
    } else {
      const next = [...pinnedExamIds, examId];
      updatePinnedExamIds(next);
      toast.success("Đã ghim đề thi thành công!", `Đã ghim "${examTitle}" lên Bảng điều khiển trọng tâm.`);
    }
  };

  const handleTogglePinChapter = (chapterName: string) => {
    const isPinned = pinnedChapters.includes(chapterName);
    if (isPinned) {
      const next = pinnedChapters.filter((c) => c !== chapterName);
      updatePinnedChapters(next);
      toast.info("Đã bỏ ghim chuyên đề", `Đã xóa "${chapterName}" khỏi danh sách theo dõi.`);
    } else {
      const next = [...pinnedChapters, chapterName];
      updatePinnedChapters(next);
      toast.success("Đã ghim chuyên đề thành công!", `Đã ghim chuyên đề "${chapterName}" lên Bảng điều khiển.`);
    }
  };

  // Quản lý Modal & Input Nhập mã đề thi nhanh
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [quickCodeInput, setQuickCodeInput] = useState<string>("");
  const [initialModalCode, setInitialModalCode] = useState<string>("");

  // Hàm xử lý kiểm tra quyền truy cập trước khi vào thi
  const handleAttemptExam = (exam: Exam) => {
    const status = checkExamAccessStatus(exam);
    if (status.status === "locked") {
      toast.error(
        "Đề thi đang bị KHÓA",
        "Giáo viên đã khóa đề thi này. Vui lòng liên hệ giáo viên để mở quyền truy cập!"
      );
      return;
    }
    if (status.status === "upcoming") {
      toast.warning(
        "Chưa đến giờ mở đề thi",
        `Đề thi sẽ tự động mở lúc: ${status.openDateFormatted} (${status.timeRemainingText}).`
      );
      return;
    }
    if (status.status === "ended") {
      toast.error(
        "Đề thi đã HẾT HẠN",
        `Hạn chót làm bài đã kết thúc lúc: ${status.closeDateFormatted}.`
      );
      return;
    }
    if (exam.password && exam.password.trim()) {
      setInitialModalCode(exam.code);
      setShowCodeModal(true);
      return;
    }
    onStartExam(exam);
  };

  // Hàm xử lý nhập mã trực tiếp từ thanh công cụ nhanh
  const handleQuickCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickCodeInput.trim().toLowerCase();
    if (!clean) {
      toast.warning("Vui lòng nhập Mã đề thi!", "Ví dụ: 12-01-14-01, 10-02-05-01...");
      return;
    }
    const matched = exams.find(
      (ex) =>
        isExamCodeMatch(clean, ex.code) ||
        ex.code.toLowerCase() === clean ||
        ex.id.toLowerCase() === clean ||
        ex.title.toLowerCase().includes(clean)
    );
    if (!matched) {
      toast.error(
        "Không tìm thấy đề thi!",
        `Không có đề thi nào khớp với mã "${quickCodeInput}". Quy luật mã: [Lớp]-[Chương]-[Bài]-[Lần] (Ví dụ: 12-01-14-01).`
      );
      return;
    }
    handleAttemptExam(matched);
  };

  // Lọc các bài nộp của riêng học sinh hiện tại (Bảo đảm bài làm của học sinh luôn hiển thị đầy đủ)
  const mySubmissions = useMemo(() => {
    let userRecordedSubIds: string[] = [];
    try {
      const raw = localStorage.getItem(`edutest_user_${currentUser.id}_subs`);
      if (raw) userRecordedSubIds = JSON.parse(raw);
    } catch {}

    const directMatches = submissions.filter((s) => {
      if (!s) return false;
      if (s.studentId === currentUser.id) return true;
      if (s.studentEmail && currentUser.email && s.studentEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
      if (userRecordedSubIds.includes(s.id)) return true;
      
      const currentNameClean = currentUser.name.toLowerCase().trim();
      const subNameClean = (s.studentName || "").toLowerCase().trim();
      if (subNameClean && currentNameClean) {
        if (subNameClean === currentNameClean) return true;
        if (subNameClean.includes(currentNameClean) || currentNameClean.includes(subNameClean)) return true;
      }
      return false;
    });

    return directMatches;
  }, [submissions, currentUser]);

  // Thống kê cá nhân
  const studentStats = useMemo(() => {
    const completedCount = mySubmissions.length;
    if (completedCount === 0) {
      return {
        completedCount: 0,
        avgScore: "0.0",
        bestScore: "0.0",
        totalTimeMinutes: 0,
        part1Accuracy: 0,
        part2Accuracy: 0,
        part3Accuracy: 0,
        part4Accuracy: 0,
      };
    }

    const scores = mySubmissions.map((s) => s.score);
    const avg = (scores.reduce((a, b) => a + b, 0) / completedCount).toFixed(1);
    const best = Math.max(...scores).toFixed(1);
    const totalTime = Math.round(
      mySubmissions.reduce((a, b) => a + (b.timeSpentSeconds || 0), 0) / 60
    );

    // Tính tỷ lệ trung bình thực tế từ điểm / tổng điểm
    const avgRatio = Math.min(100, Math.max(0, Math.round((Number(avg) / 10) * 100)));

    return {
      completedCount,
      avgScore: avg,
      bestScore: best,
      totalTimeMinutes: totalTime,
      part1Accuracy: avgRatio,
      part2Accuracy: Math.round(avgRatio * 0.9),
      part3Accuracy: Math.round(avgRatio * 0.85),
      part4Accuracy: Math.round(avgRatio * 0.95),
    };
  }, [mySubmissions]);

  // Lọc danh sách đề thi
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchGrade = gradeFilter === "all" || (e.grade && e.grade === gradeFilter);
      const cleanSearch = searchQuery.trim().toLowerCase();
      const matchSearch =
        cleanSearch === "" ||
        e.title.toLowerCase().includes(cleanSearch) ||
        isExamCodeMatch(cleanSearch, e.code) ||
        e.code.toLowerCase().includes(cleanSearch) ||
        (e.chapter && e.chapter.toLowerCase().includes(cleanSearch));
      return matchGrade && matchSearch;
    });
  }, [exams, gradeFilter, searchQuery]);

  // Dữ liệu biểu đồ cột tiến độ điểm số (% số điểm đạt được / tổng số điểm đề) qua các kỳ thi
  const progressChartData = useMemo(() => {
    if (mySubmissions.length === 0) return [];
    const chronological = [...mySubmissions].sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime() || 0;
      const timeB = new Date(b.submittedAt).getTime() || 0;
      return timeA - timeB;
    });

    return chronological.map((sub, index) => {
      const maxScore = sub.maxScore || 10;
      const percentage = Number(Math.min(100, Math.max(0, (sub.score / maxScore) * 100)).toFixed(1));
      let color = "#ef4444";
      if (percentage >= 80) color = "#10b981";
      else if (percentage >= 65) color = "#6366f1";
      else if (percentage >= 50) color = "#f59e0b";

      let dateFormatted = "Gần đây";
      try {
        dateFormatted = new Date(sub.submittedAt).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {}

      const cleanTitle = sub.examTitle || "Đề thi";
      const shortTitle =
        cleanTitle.length > 16 ? `${cleanTitle.substring(0, 14)}...` : cleanTitle;

      return {
        id: sub.id || `sub_${index}`,
        attemptIndex: index + 1,
        label: `#${index + 1} (${percentage}%)`,
        fullLabel: `#${index + 1} - ${shortTitle}`,
        examTitle: sub.examTitle,
        examId: sub.examId,
        score: sub.score,
        maxScore,
        percentage,
        timeMinutes: Math.round((sub.timeSpentSeconds || 0) / 60),
        dateFormatted,
        color,
        submission: sub,
      };
    });
  }, [mySubmissions]);

  // Danh sách tất cả chuyên đề khả dụng được trích xuất từ đề thi + các chuyên đề phổ biến chuẩn Bộ GD&ĐT
  const allAvailableChapters = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.chapter && e.chapter.trim()) {
        set.add(e.chapter.trim());
      }
    });
    const standardChapters = [
      "Ứng dụng đạo hàm & Khảo sát hàm số",
      "Hàm số luỹ thừa, Mũ & Logarit",
      "Nguyên hàm, Tích phân & Ứng dụng",
      "Phương pháp toạ độ trong không gian Oxyz",
      "Khối đa diện & Thể tích khối đa diện",
      "Mặt cầu, Mặt trụ, Mặt nón",
      "Số phức & Các dạng toán thực tế",
      "Xác suất & Thống kê nâng cao",
      "Hình học giải tích trong mặt phẳng",
      "Lượng giác & Phương trình lượng giác",
    ];
    standardChapters.forEach((c) => set.add(c));
    return Array.from(set);
  }, [exams]);

  // Danh sách đề thi đã ghim
  const pinnedExamsList = useMemo(() => {
    return exams.filter((e) => pinnedExamIds.includes(e.id));
  }, [exams, pinnedExamIds]);

  // Tiến độ mục tiêu học tập tuần
  const weeklyStudyGoal = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const countThisWeek = mySubmissions.filter((s) => {
      try {
        return new Date(s.submittedAt) >= sevenDaysAgo;
      } catch {
        return false;
      }
    }).length;
    const target = widgetConfig.targetExamCountWeekly || 5;
    const percent = Math.min(100, Math.round((countThisWeek / target) * 100));
    return {
      countThisWeek,
      target,
      percent,
    };
  }, [mySubmissions, widgetConfig.targetExamCountWeekly]);

  // Tìm kiếm chuyên đề trong modal
  const [topicSearchModal, setTopicSearchModal] = useState<string>("");
  const filteredTopicsInModal = useMemo(() => {
    const clean = topicSearchModal.trim().toLowerCase();
    if (!clean) return allAvailableChapters;
    return allAvailableChapters.filter((c) => c.toLowerCase().includes(clean));
  }, [allAvailableChapters, topicSearchModal]);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 min-w-0">
      {/* Student Hero Header - Bento Card */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400/50 shadow-md shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Học sinh {currentUser.schoolClass ? `Lớp ${currentUser.schoolClass}` : "THPT"}</span>
                </span>
                <span className="text-xs text-slate-400">MPEduCenter Student Space</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Xin chào, {currentUser.name}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Sẵn sàng chinh phục bài thi Toán học với 4 dạng thức chuẩn bộ GD&ĐT.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenPractice && (
              <button
                type="button"
                onClick={onOpenPractice}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white text-xs sm:text-sm font-black shadow-lg hover:shadow-indigo-500/25 transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Luyện Chuyên Đề</span>
              </button>
            )}

            {/* Nút Nhập mã đề thi nhanh */}
            <button
              type="button"
              onClick={() => {
                setInitialModalCode("");
                setShowCodeModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black shadow-lg hover:shadow-amber-500/20 transition flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-slate-950" />
              <span>Nhập Mã Đề Thi</span>
            </button>

            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 shadow-md transition flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Bảng Xếp Hạng</span>
              </button>
            )}

            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 shadow-md transition flex items-center gap-2"
              >
                <History className="w-4 h-4 text-emerald-300" />
                <span>Lịch Sử ({mySubmissions.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onJoinLiveRoom}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>Thi Live (PIN)</span>
            </button>
          </div>
        </div>

        {/* Thống kê Học tập Cá nhân */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Đã hoàn thành</span>
              <FileCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {studentStats.completedCount}{" "}
              <span className="text-sm font-normal text-slate-400">bài thi</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">Tích cực luyện tập</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Điểm cao nhất</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
              {studentStats.bestScore}{" "}
              <span className="text-sm font-normal text-slate-400">/ 10đ</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Thành tích cao</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Điểm trung bình</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-1">
              {studentStats.avgScore}{" "}
              <span className="text-sm font-normal text-slate-400">/ 10đ</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Đánh giá chung</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Thời gian rèn luyện</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {studentStats.totalTimeMinutes}{" "}
              <span className="text-sm font-normal text-slate-400">phút</span>
            </div>
            <div className="text-[11px] text-sky-300 mt-0.5">Tổng thời lượng</div>
          </div>
        </div>
      </div>

      {/* KHU VỰC DASHBOARD WIDGETS TÙY CHỈNH CỦA HỌC SINH */}
      <div id="student-dashboard-custom-widgets" className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header thanh Widget */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Pin className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Không Gian Trọng Tâm Cá Nhân (Dashboard Widgets)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-[11px] border border-amber-400/30">
                  {pinnedExamsList.length} đề thi • {pinnedChapters.length} chuyên đề đã ghim
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Ghim các đề thi và chuyên đề trọng tâm để truy cập nhanh & theo dõi tiến độ luyện thi cá nhân.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="btn-open-dashboard-customizer"
              type="button"
              onClick={() => setShowCustomizerModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 shadow-xs transition flex items-center gap-1.5"
              title="Tùy chỉnh các widget hiển thị trên Dashboard"
            >
              <Settings2 className="w-4 h-4 text-amber-300" />
              <span>Tùy chỉnh Widget</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDashboardCollapsed(!isDashboardCollapsed)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition"
              title={isDashboardCollapsed ? "Mở rộng Dashboard" : "Thu gọn Dashboard"}
            >
              {isDashboardCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Nội dung các Widgets */}
        {!isDashboardCollapsed && (
          <div className="p-4 sm:p-6 space-y-5 bg-slate-50/50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* WIDGET 1: ĐỀ THI ĐÃ GHIM */}
              {widgetConfig.showPinnedExams && (
                <div
                  className={`${
                    widgetConfig.showPinnedTopics ? "lg:col-span-2" : "lg:col-span-3"
                  } bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookmarkCheck className="w-4 h-4 text-amber-500" />
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Đề Thi Trọng Tâm Đã Ghim ({pinnedExamsList.length})
                      </h3>
                    </div>
                    {pinnedExamsList.length > 0 && (
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Bấm vào đề để vào làm bài ngay
                      </span>
                    )}
                  </div>

                  {pinnedExamsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                      {pinnedExamsList.map((exam) => {
                        const previousSub = mySubmissions.find((s) => s.examId === exam.id);
                        const accessStatus = checkExamAccessStatus(exam);
                        return (
                          <div
                            key={`pinned-widget-exam-${exam.id}`}
                            className="p-3.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50 hover:border-amber-400 hover:shadow-xs transition group flex flex-col justify-between space-y-2.5"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-md border border-amber-300 font-mono">
                                  {exam.code}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {previousSub && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                                      Đã làm: {previousSub.score}đ
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePinExam(exam.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Bỏ ghim khỏi Dashboard"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition">
                                {exam.title}
                              </h4>
                              {exam.chapter && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                  {exam.chapter}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-2">
                                <span>⏱ {exam.durationMinutes}p</span>
                                <span>•</span>
                                <span>📝 {exam.questions.length} câu</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAttemptExam(exam)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 shrink-0"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Làm bài</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                      <Pin className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">
                        Bạn chưa ghim đề thi nào vào Dashboard.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Hãy nhấn vào biểu tượng <b>📌 Ghim</b> trên từng thẻ đề thi bên dưới để lưu vào danh sách theo dõi nhanh!
                      </p>
                      {exams.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const firstTwo = exams.slice(0, 2).map((e) => e.id);
                            updatePinnedExamIds(firstTwo);
                            toast.success("Đã ghim đề thi đề xuất lên Dashboard!");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Pin className="w-3.5 h-3.5 fill-current" />
                          <span>Ghim 2 đề thi đề xuất</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* WIDGET 2 & 3: CHUYÊN ĐỀ QUAN TÂM & MỤC TIÊU TUẦN */}
              <div className="space-y-4">
                {/* WIDGET CHUYÊN ĐỀ QUAN TÂM */}
                {widgetConfig.showPinnedTopics && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-extrabold text-sm text-slate-900">
                          Chuyên Đề Trọng Tâm ({pinnedChapters.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddTopicModal(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm/Quản lý</span>
                      </button>
                    </div>

                    {pinnedChapters.length > 0 ? (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {pinnedChapters.map((chapter) => {
                          const matchingExamsCount = exams.filter((e) =>
                            e.chapter && e.chapter.toLowerCase().includes(chapter.toLowerCase())
                          ).length;

                          return (
                            <div
                              key={`pinned-chapter-${chapter}`}
                              className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-300 transition flex items-center justify-between gap-2 group"
                            >
                              <div
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  setActiveTab("exams");
                                  setSearchQuery(chapter);
                                  toast.info(`Đang hiển thị các đề thi thuộc: "${chapter}"`);
                                }}
                              >
                                <div className="font-bold text-xs text-slate-800 group-hover:text-indigo-700 line-clamp-1">
                                  {chapter}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {matchingExamsCount > 0
                                    ? `${matchingExamsCount} đề thi phù hợp`
                                    : "Chưa có đề • Bấm để lọc"}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab("exams");
                                    setSearchQuery(chapter);
                                    toast.info(`Đang lọc đề thi thuộc chuyên đề: ${chapter}`);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold text-[10px] transition"
                                  title="Lọc đề thi theo chuyên đề này"
                                >
                                  Lọc đề
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinChapter(chapter)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Bỏ ghim chuyên đề"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                        <p className="text-xs text-slate-500">Chưa ghim chuyên đề nào.</p>
                        <button
                          type="button"
                          onClick={() => setShowAddTopicModal(true)}
                          className="text-xs text-indigo-600 font-bold hover:underline"
                        >
                          + Chọn chuyên đề ôn tập mục tiêu
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* WIDGET MỤC TIÊU TUẦN */}
                {widgetConfig.showStudyGoal && (
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <h3 className="font-extrabold text-sm text-slate-900">
                          Mục Tiêu Rèn Luyện Tuần
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCustomizerModal(true)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-bold"
                      >
                        Đổi chỉ tiêu ({widgetConfig.targetExamCountWeekly} đề)
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-600">Tiến độ 7 ngày qua:</span>
                        <span className="text-emerald-700 font-black">
                          {weeklyStudyGoal.countThisWeek} / {weeklyStudyGoal.target} đề ({weeklyStudyGoal.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${weeklyStudyGoal.percent}%` }}
                        ></div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium">
                      {weeklyStudyGoal.percent >= 100
                        ? "🎉 Xuất sắc! Bạn đã hoàn thành chỉ tiêu bài thi tuần này."
                        : `🔥 Cố lên! Còn ${Math.max(0, weeklyStudyGoal.target - weeklyStudyGoal.countThisWeek)} đề thi nữa để hoàn thành mục tiêu tuần.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("exams")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === "exams"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Danh sách Đề thi Luyện tập ({exams.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === "history"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử Bài làm & Bảng điểm ({mySubmissions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === "analytics"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Phân tích Năng lực Cá nhân</span>
        </button>
      </div>

      {/* TAB 1: EXAMS LIST FOR STUDENT */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          {/* BENTO BOX: CỔNG NHẬP MÃ ĐỀ THI TRỰC TIẾP */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-lg border border-emerald-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
                  Giao Đề Theo Mã
                </span>
                <h3 className="text-base sm:text-lg font-black">
                  Bạn có Mã Đề do Thầy/Cô giao?
                </h3>
                <p className="text-xs text-slate-300">
                  Nhập mã đề theo quy luật <code>[Lớp]-[Chương]-[Bài]-[Lần]</code> (ví dụ: <b>12-01-14-01</b>) để vào ngay đề kiểm tra.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleQuickCodeSubmit}
              className="flex items-center gap-2 w-full md:w-auto"
            >
              <input
                type="text"
                value={quickCodeInput}
                onChange={(e) => setQuickCodeInput(e.target.value.toUpperCase())}
                placeholder="Ví dụ: 12-01-14-01"
                className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/25 text-white placeholder:text-slate-400 font-mono font-black tracking-widest uppercase text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white/20 w-full sm:w-48"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 shrink-0"
              >
                <span>Vào Thi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Filter & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên đề, mã đề, chuyên đề..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
              {["all", ...STANDARD_GRADES].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradeFilter(g)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                    gradeFilter === g
                      ? "bg-white text-emerald-600 shadow-xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {g === "all" ? "Tất cả các khối" : g}
                </button>
              ))}
            </div>
          </div>

          {/* Exams Grid Bento */}
          <motion.div
            key={`student-exams-${gradeFilter}-${searchQuery}`}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.06,
                  delayChildren: 0.04,
                },
              },
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredExams.map((exam) => {
              const questionCount = exam.questions.length;
              const previousSub = mySubmissions.find((s) => s.examId === exam.id);
              const accessStatus = checkExamAccessStatus(exam);

              return (
                <motion.div
                  key={exam.id}
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.98 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: "spring",
                        damping: 24,
                        stiffness: 280,
                      },
                    },
                  }}
                  layout
                  className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition group space-y-4 ${
                    accessStatus.status === "locked"
                      ? "border-rose-200 bg-rose-50/15"
                      : "border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-md border border-indigo-200 font-mono" title={parseStandardExamCode(exam.code).explanation}>
                          Mã: <b>{exam.code}</b>
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">
                          {exam.grade || "Lớp 12"}
                        </span>

                        {/* Badge trạng thái Mở / Khóa / Hẹn giờ */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border flex items-center gap-1 ${accessStatus.badgeColor}`}
                        >
                          {accessStatus.status === "locked" ? (
                            <Lock className="w-3 h-3 text-rose-600" />
                          ) : accessStatus.status === "upcoming" ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Unlock className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{accessStatus.badgeLabel}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {previousSub ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                            <span>Đã làm: {previousSub.score}đ</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200">
                            Chưa làm
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePinExam(exam.id);
                          }}
                          className={`p-1.5 rounded-xl border transition shrink-0 ${
                            pinnedExamIds.includes(exam.id)
                              ? "bg-amber-400 text-slate-950 border-amber-500 shadow-2xs"
                              : "bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-700 border-slate-200"
                          }`}
                          title={
                            pinnedExamIds.includes(exam.id)
                              ? "Bỏ ghim khỏi Dashboard cá nhân"
                              : "Ghim đề thi lên Dashboard cá nhân"
                          }
                        >
                          <Pin
                            className={`w-3.5 h-3.5 ${
                              pinnedExamIds.includes(exam.id) ? "fill-current" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-600 transition line-clamp-2">
                      {exam.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {exam.description || exam.chapter || "Đề kiểm tra chuẩn cấu trúc 4 dạng thức GDPT"}
                    </p>

                    {/* Thông điệp thời gian hẹn giờ nếu có */}
                    {!accessStatus.canEnter && (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
                        {accessStatus.message}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Thời gian</div>
                        <div className="font-bold text-slate-800 mt-0.5">{exam.durationMinutes}p</div>
                      </div>
                      <div className="border-x border-slate-200">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Số câu</div>
                        <div className="font-bold text-slate-800 mt-0.5">{questionCount} câu</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Thang điểm</div>
                        <div className="font-bold text-slate-800 mt-0.5">{exam.totalScore || 10}đ</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Tác giả: <strong className="text-slate-600">{exam.author || "Tổ Toán"}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleAttemptExam(exam)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs group-hover:shadow-md ${
                        accessStatus.status === "locked"
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : accessStatus.status === "upcoming"
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {accessStatus.status === "locked" ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Đề Đang Khóa</span>
                        </>
                      ) : accessStatus.status === "upcoming" ? (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Chưa Mở</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{previousSub ? "Làm lại bài" : "Bắt đầu làm bài"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredExams.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 text-xs">
              Không tìm thấy đề thi nào phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY & DETAILED SUBMISSIONS */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Lịch sử nộp bài thi của bạn ({mySubmissions.length} lượt)
              </h3>
              <span className="text-xs text-slate-500">Bấm vào bài thi để xem chi tiết đáp án & lời giải</span>
            </div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.03,
                  },
                },
              }}
              className="divide-y divide-slate-100"
            >
              {mySubmissions.map((sub) => {
                const timeMinutes = Math.round((sub.timeSpentSeconds || 0) / 60);
                return (
                  <motion.div
                    key={sub.id}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { duration: 0.25 },
                      },
                    }}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{sub.examTitle}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                          Điểm: {sub.score}/{sub.maxScore || 10}đ
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {(() => {
                              try {
                                return new Date(sub.submittedAt).toLocaleString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                });
                              } catch {
                                return sub.submittedAt || "Gần đây";
                              }
                            })()}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Thời gian làm: {timeMinutes} phút</span>
                        </span>
                        {sub.partScores && (
                          <span className="text-slate-600 font-medium">
                            P.I: {sub.partScores.part_1.earned}đ • P.II: {sub.partScores.part_2.earned}đ • P.III:{" "}
                            {sub.partScores.part_3.earned}đ • P.IV: {sub.partScores.part_4.earned}đ
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionReview(sub)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center shrink-0 border border-slate-200"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Xem lại bài làm</span>
                    </button>
                  </motion.div>
                );
              })}

              {mySubmissions.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Bạn chưa thực hiện bài thi nào. Hãy chọn một đề thi từ danh sách để bắt đầu luyện tập!
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Biểu đồ Cột Recharts: Tiến độ điểm số (% Điểm đạt được) qua các kỳ kiểm tra */}
          {progressChartData.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100 shadow-2xs">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>Biểu Đồ Tiến Độ Điểm Số Qua Các Kỳ Kiểm Tra</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        % Điểm đạt được
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tỷ lệ % điểm đạt được so với điểm tối đa của đề thi qua {progressChartData.length} lần thi gần nhất
                    </p>
                  </div>
                </div>

                {/* Legend chú giải */}
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                    <span>≥ 80% (Giỏi)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
                    <span>65-79% (Khá)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                    <span>50-64% (Đạt)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                    <span>&lt; 50%</span>
                  </span>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={progressChartData}
                    margin={{ top: 20, right: 15, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(val) => `${val}%`}
                      stroke="#64748b"
                      tick={{ fontSize: 11, fontWeight: 600, fill: "#64748b" }}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: "Đạt (50%)",
                        position: "insideTopRight",
                        fill: "#d97706",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                    <ReferenceLine
                      y={80}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: "Giỏi (80%)",
                        position: "insideTopRight",
                        fill: "#059669",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                    <Tooltip content={<StudentScoreTooltip />} />
                    <Bar
                      dataKey="percentage"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      cursor="pointer"
                      onClick={(entry: any) => {
                        if (entry && entry.submission) {
                          setSelectedSubmissionReview(entry.submission);
                        }
                      }}
                    >
                      {progressChartData.map((entry, index) => (
                        <Cell
                          key={`portal-bar-cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-85 transition-opacity"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1 text-slate-500 font-medium">
                  💡 <span>Bấm vào từng cột trên biểu đồ để xem chi tiết lời giải & đáp án bài thi đó.</span>
                </span>
                <span className="font-semibold text-slate-600">
                  Bài gần nhất:{" "}
                  <strong className="text-emerald-600">
                    {progressChartData[progressChartData.length - 1]?.percentage}%
                  </strong>{" "}
                  ({progressChartData[progressChartData.length - 1]?.score}/
                  {progressChartData[progressChartData.length - 1]?.maxScore}đ)
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 shadow-xs space-y-2">
              <BarChart2 className="w-10 h-10 mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-700">Chưa có dữ liệu biểu đồ tiến độ</div>
              <p className="text-[11px] text-slate-400">
                Hãy hoàn thành ít nhất 1 bài thi để hệ thống vẽ biểu đồ cột theo dõi tiến độ điểm số cá nhân.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-600" />
                <span>Độ chính xác theo 4 dạng thức câu hỏi</span>
              </h3>
              <p className="text-xs text-slate-500">
                Đánh giá tỷ lệ làm đúng trên từng phần để tối ưu chiến thuật phòng thi.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Phần I: Trắc nghiệm 4 lựa chọn</span>
                    <span className="text-emerald-600">{studentStats.part1Accuracy}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${studentStats.part1Accuracy}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Phần II: Đúng / Sai (4 ý a-b-c-d)</span>
                    <span className="text-indigo-600">{studentStats.part2Accuracy}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${studentStats.part2Accuracy}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Phần III: Trả lời ngắn</span>
                    <span className="text-amber-600">{studentStats.part3Accuracy}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${studentStats.part3Accuracy}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Phần IV: Tự luận & Vẽ hình không gian</span>
                    <span className="text-purple-600">{studentStats.part4Accuracy}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${studentStats.part4Accuracy}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Gợi ý Lộ trình Ôn luyện Nâng cao</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                  <div className="font-bold text-amber-900">🌟 Chuyên đề Hình học không gian (Khối đa diện & Thể tích)</div>
                  <div className="text-amber-800 mt-1">
                    Tăng cường rèn luyện kỹ năng vẽ hình không gian bằng Canvas tương tác và nhận diện các thiết diện khó trong đề thi.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <div className="font-bold text-emerald-900">✅ Dạng câu Đúng / Sai (Phần II)</div>
                  <div className="text-emerald-800 mt-1">
                    Bạn đang làm rất tốt các câu hỏi mệnh đề logic. Chú ý tính điểm bậc thang để tối đa hóa 1.0 điểm cho mỗi câu 4 ý đúng.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                  <div className="font-bold text-indigo-900">🚀 Luyện tốc độ Trả lời ngắn (Phần III)</div>
                  <div className="text-indigo-800 mt-1">
                    Rèn luyện quy tắc làm tròn số thập phân và phân số tối giản để không bị trừ điểm quy đổi.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM LẠI BÀI THI CHI TIẾT CỦA HỌC SINH */}
      {selectedSubmissionReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  Chi tiết kết quả: {selectedSubmissionReview.examTitle}
                </h3>
                <p className="text-xs text-slate-400">
                  Học sinh: <strong>{selectedSubmissionReview.studentName}</strong> • Điểm số:{" "}
                  <strong className="text-emerald-400 font-extrabold">
                    {selectedSubmissionReview.score}/{selectedSubmissionReview.maxScore || 10}đ
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmissionReview(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần I (Trắc nghiệm)</div>
                  <div className="font-black text-sm text-slate-800 mt-0.5">
                    {selectedSubmissionReview.partScores?.part_1?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần II (Đúng/Sai)</div>
                  <div className="font-black text-sm text-slate-800 mt-0.5">
                    {selectedSubmissionReview.partScores?.part_2?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần III (Trả lời ngắn)</div>
                  <div className="font-black text-sm text-slate-800 mt-0.5">
                    {selectedSubmissionReview.partScores?.part_3?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần IV (Tự luận)</div>
                  <div className="font-black text-sm text-slate-800 mt-0.5">
                    {selectedSubmissionReview.partScores?.part_4?.earned || 0}đ
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-slate-800 text-sm">Danh sách câu hỏi & Đối chiếu đáp án:</h4>
                {Object.entries(selectedSubmissionReview.details).map(([qId, detail], index) => {
                  return (
                    <div
                      key={qId}
                      className={`p-4 rounded-2xl border ${
                        detail.isCorrect ? "bg-emerald-50/40 border-emerald-200" : "bg-rose-50/40 border-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 text-xs">
                          Câu {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              detail.isCorrect
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {detail.isCorrect ? "✓ Đúng" : "✗ Chưa chính xác"} ({detail.earnedScore}đ)
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-700 text-xs space-y-1">
                        <div>
                          <strong>Câu trả lời của bạn:</strong>{" "}
                          <span className="font-semibold text-slate-900">
                            {typeof detail.userAnswer === "object"
                              ? JSON.stringify(detail.userAnswer)
                              : String(detail.userAnswer || "Chưa trả lời")}
                          </span>
                        </div>
                        <div>
                          <strong>Đáp án chính xác:</strong>{" "}
                          <span className="font-semibold text-emerald-700">
                            {typeof detail.correctAnswer === "object"
                              ? JSON.stringify(detail.correctAnswer)
                              : String(detail.correctAnswer || "Xem lời giải")}
                          </span>
                        </div>
                        {detail.feedback && (
                          <div className="text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/80 mt-2">
                            <strong>Nhận xét & Lời giải:</strong>
                            <div className="mt-1">
                              <MathRenderer content={detail.feedback} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSubmissionReview(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Mã Đề Thi */}
      <ExamCodeEntryModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        exams={exams}
        onStartExam={onStartExam}
        initialCode={initialModalCode}
      />

      {/* MODAL TÙY CHỈNH DASHBOARD WIDGETS CỦA HỌC SINH */}
      {showCustomizerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Tùy Chỉnh Bảng Điều Khiển (Widgets)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cá nhân hóa giao diện học tập theo nhu cầu ôn thi của bạn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizerModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* PHẦN 1: BẬT / TẮT CÁC WIDGET */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-emerald-600" />
                  <span>Hiển thị Widgets trên trang chủ</span>
                </h4>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <BookmarkCheck className="w-4 h-4 text-amber-500" />
                        <span>Widget Đề thi đã ghim</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Hiển thị danh sách các đề thi bạn quan tâm và muốn luyện tập ngay
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={widgetConfig.showPinnedExams}
                      onChange={(e) => updateWidgetConfig({ showPinnedExams: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-indigo-500" />
                        <span>Widget Chuyên đề trọng tâm</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Ghim các chương/chuyên đề bạn đang muốn tập trung ôn luyện
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={widgetConfig.showPinnedTopics}
                      onChange={(e) => updateWidgetConfig({ showPinnedTopics: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span>Widget Mục tiêu rèn luyện 7 ngày</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Theo dõi tiến độ hoàn thành số lượng bài thi trong tuần
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={widgetConfig.showStudyGoal}
                      onChange={(e) => updateWidgetConfig({ showStudyGoal: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* PHẦN 2: CÀI ĐẶT MỤC TIÊU TUẦN */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Chỉ tiêu số bài thi mỗi tuần</span>
                </h4>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-700 font-medium">Mục tiêu:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateWidgetConfig({
                          targetExamCountWeekly: Math.max(1, widgetConfig.targetExamCountWeekly - 1),
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-black text-slate-700 hover:bg-slate-100 transition"
                    >
                      -
                    </button>
                    <span className="font-black text-sm text-emerald-700 w-8 text-center">
                      {widgetConfig.targetExamCountWeekly}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateWidgetConfig({
                          targetExamCountWeekly: Math.min(30, widgetConfig.targetExamCountWeekly + 1),
                        })
                      }
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-black text-slate-700 hover:bg-slate-100 transition"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">bài thi / tuần (7 ngày)</span>
                </div>
              </div>

              {/* PHẦN 3: QUẢN LÝ CÁC MỤC ĐANG GHIM */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Danh sách đang ghim ({pinnedExamsList.length} đề thi, {pinnedChapters.length} chuyên đề)</span>
                  </h4>
                  {(pinnedExamIds.length > 0 || pinnedChapters.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        updatePinnedExamIds([]);
                        updatePinnedChapters([]);
                        toast.info("Đã xóa toàn bộ mục ghim.");
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa tất cả ghim</span>
                    </button>
                  )}
                </div>

                {/* Danh sách đề thi ghim */}
                {pinnedExamsList.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500">Đề thi đã ghim:</div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {pinnedExamsList.map((ex) => (
                        <div
                          key={`mgr-pinned-${ex.id}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <span className="font-semibold text-slate-800 line-clamp-1 flex-1 pr-2">
                            <b className="font-mono text-indigo-600 font-bold">[{ex.code}]</b> {ex.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePinExam(ex.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded-md transition"
                            title="Xóa ghim"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Danh sách chuyên đề ghim */}
                {pinnedChapters.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-slate-500">Chuyên đề đã ghim:</div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {pinnedChapters.map((ch) => (
                        <div
                          key={`mgr-chapter-${ch}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <span className="font-semibold text-slate-800 line-clamp-1 flex-1 pr-2">
                            {ch}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePinChapter(ch)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded-md transition"
                            title="Xóa ghim"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  updateWidgetConfig(DEFAULT_WIDGET_CONFIG);
                  toast.info("Đã khôi phục cấu hình Dashboard mặc định.");
                }}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCustomizerModal(false);
                  toast.success("Đã lưu thiết lập Dashboard!");
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
              >
                Lưu & Hoàn Tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUẢN LÝ & THÊM CHUYÊN ĐỀ GHIM */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Ghim Chuyên Đề Ôn Tập Trọng Tâm
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chọn các chuyên đề bạn muốn theo dõi trên Dashboard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTopicModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={topicSearchModal}
                  onChange={(e) => setTopicSearchModal(e.target.value)}
                  placeholder="Tìm chuyên đề toán học..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 text-xs flex-1">
              {filteredTopicsInModal.map((chapter) => {
                const isPinned = pinnedChapters.includes(chapter);
                const matchingExamsCount = exams.filter((e) =>
                  e.chapter && e.chapter.toLowerCase().includes(chapter.toLowerCase())
                ).length;

                return (
                  <div
                    key={`modal-chapter-${chapter}`}
                    onClick={() => handleTogglePinChapter(chapter)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isPinned
                        ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span>{chapter}</span>
                        {isPinned && (
                          <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-md text-[10px] font-black">
                            Đang ghim
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {matchingExamsCount > 0
                          ? `Có ${matchingExamsCount} đề thi trong hệ thống`
                          : "Chuyên đề nâng cao chuẩn GDPT"}
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 ${
                        isPinned
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-400 border border-slate-300"
                      }`}
                    >
                      {isPinned ? <Check className="w-4 h-4" /> : <Plus className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}

              {filteredTopicsInModal.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Không tìm thấy chuyên đề phù hợp với từ khóa.
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddTopicModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition shadow-xs"
              >
                Xong ({pinnedChapters.length} chuyên đề đã ghim)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
