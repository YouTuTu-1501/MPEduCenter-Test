import React, { useState, useMemo } from "react";
import { Exam, StudentSubmission, STANDARD_CLASSES } from "../types/exam";
import { User } from "../types/auth";
import { MathRenderer } from "./MathRenderer";
import {
  matchSearchQuery,
  SCORE_TIERS,
  ScoreTierKey,
  isScoreInTier,
} from "../utils/filterUtils";
import { useFilter } from "../context/FilterContext";
import { getDeletedUserIds } from "../services/firestoreService";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Search,
  BrainCircuit,
  Eye,
  CheckCircle,
  XCircle,
  BarChart3,
  ListOrdered,
  Download,
  Paperclip,
  X,
  GraduationCap,
  Filter,
  Trophy,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  BookOpen,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  LineChart as LineChartIcon,
  Minus,
} from "lucide-react";

interface TeacherAnalyticsViewProps {
  exam: Exam;
  submissions: StudentSubmission[];
  onBack: () => void;
  selectedClassFilter?: string;
  onSelectClassFilter?: (cls: string) => void;
  allExams?: Exam[];
  onSelectExam?: (exam: Exam) => void;
  onOpenLeaderboard?: () => void;
  onOpenStudentHistory?: (studentId: string, studentName: string) => void;
  users?: User[];
}

// Custom Tooltip cho Recharts Line Chart
const CustomProgressTooltip = ({
  active,
  payload,
  label,
  progressChartMode,
  activeProgressStudent,
  studentsProgressSummary,
  MULTI_STUDENT_COLORS,
}: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700/80 max-w-xs text-xs space-y-2.5 z-50">
      <div className="border-b border-slate-700/80 pb-2">
        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[10px] border border-indigo-500/30">
          {data.examCode || "Đề thi"}
        </span>
        <h4 className="font-extrabold text-slate-100 text-sm mt-1 leading-snug">
          {data.examTitle}
        </h4>
      </div>

      {progressChartMode === "student_vs_class" && activeProgressStudent && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
              {activeProgressStudent.studentName}:
            </span>
            <span className="text-sm font-black text-amber-300">
              {data.studentScore !== null ? `${data.studentScore} / 10đ` : "Chưa làm đề này"}
            </span>
          </div>

          {data.studentSub && (
            <div className="bg-slate-800/90 rounded-xl p-2 text-[11px] grid grid-cols-2 gap-1 font-semibold text-slate-300 border border-slate-700/50">
              <div>Phần I: <strong className="text-white">{data.studentSub.partScores.part_1.earned}đ</strong></div>
              <div>Phần II: <strong className="text-white">{data.studentSub.partScores.part_2.earned}đ</strong></div>
              <div>Phần III: <strong className="text-white">{data.studentSub.partScores.part_3.earned}đ</strong></div>
              <div>Phần IV: <strong className="text-white">{data.studentSub.partScores.part_4.earned}đ</strong></div>
            </div>
          )}

          {data.classAvg !== null && (
            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                Trung bình lớp:
              </span>
              <strong className="text-emerald-400 font-bold">{data.classAvg}đ</strong>
            </div>
          )}

          {data.studentScore !== null && data.classAvg !== null && (
            <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between pt-1">
              <span>So sánh với TB lớp:</span>
              <span
                className={
                  data.studentScore >= data.classAvg
                    ? "text-emerald-400 font-extrabold"
                    : "text-rose-400 font-extrabold"
                }
              >
                {data.studentScore >= data.classAvg
                  ? `+${(data.studentScore - data.classAvg).toFixed(2)}đ (Cao hơn)`
                  : `${(data.studentScore - data.classAvg).toFixed(2)}đ (Thấp hơn)`}
              </span>
            </div>
          )}
        </div>
      )}

      {progressChartMode === "cohort_trend" && (
        <div className="space-y-1.5 text-slate-300">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              Điểm TB lớp:
            </span>
            <strong className="text-emerald-400 font-black">{data.classAvg ?? "N/A"}đ</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              Điểm cao nhất:
            </span>
            <strong className="text-amber-400 font-bold">{data.maxScore ?? "N/A"}đ</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              Điểm thấp nhất:
            </span>
            <strong className="text-rose-400 font-bold">{data.minScore ?? "N/A"}đ</strong>
          </div>
          <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800 flex justify-between">
            <span>Tổng số bài đã nộp:</span>
            <strong className="text-white">{data.totalExamsCount} học sinh</strong>
          </div>
        </div>
      )}

      {progressChartMode === "multi_students" && (
        <div className="space-y-1.5 text-[11px]">
          {studentsProgressSummary?.slice(0, 5).map((st: any, i: number) => {
            const sc = data[`student_${st.studentId}`];
            return (
              <div key={st.studentId} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: MULTI_STUDENT_COLORS[i % MULTI_STUDENT_COLORS.length] }}
                  />
                  {st.studentName}:
                </span>
                <strong className="text-white font-extrabold">{sc !== null && sc !== undefined ? `${sc}đ` : "—"}</strong>
              </div>
            );
          })}
          {data.classAvg !== null && (
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-slate-400">
              <span>Trung bình lớp:</span>
              <strong className="text-emerald-400">{data.classAvg}đ</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TeacherAnalyticsView: React.FC<TeacherAnalyticsViewProps> = ({
  exam,
  submissions,
  onBack,
  selectedClassFilter: propClassFilter,
  onSelectClassFilter,
  allExams = [],
  onSelectExam,
  onOpenLeaderboard,
  onOpenStudentHistory,
  users = [],
}) => {
  const {
    selectedClassFilter,
    setSelectedClassFilter,
    selectedExamFilter,
    setSelectedExamFilter,
    itemPartFilter,
    setItemPartFilter,
    itemDifficultyFilter,
    setItemDifficultyFilter,
    studentScoreTier,
    setStudentScoreTier,
    studentSortBy,
    setStudentSortBy,
    searchKeyword,
    setSearchKeyword,
    openFilterDrawer,
    activeFilterBadges,
    activeFiltersCount,
    resetAllFilters,
  } = useFilter();

  const activeClass = selectedClassFilter;

  const handleClassChange = (cls: string) => {
    setSelectedClassFilter(cls);
    if (onSelectClassFilter) {
      onSelectClassFilter(cls);
    }
  };

  const [activeTab, setActiveTab] = useState<"overview" | "items" | "students">("overview");
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [teacherPreviewImage, setTeacherPreviewImage] = useState<string | null>(null);

  // Xác định chế độ: Tất cả đề thi hay một đề cụ thể
  const isAllExamsMode = selectedExamFilter === "all";

  const activeExam = useMemo(() => {
    if (isAllExamsMode) return null;
    return (
      allExams.find(
        (e) => e.id === selectedExamFilter || e.code === selectedExamFilter
      ) || exam
    );
  }, [isAllExamsMode, selectedExamFilter, allExams, exam]);

  // Đồng bộ hóa toàn bộ danh sách bài nộp với danh sách người dùng thực tế (users)
  // và loại bỏ vĩnh viễn các học sinh đã bị xóa
  const syncedSubmissions = useMemo(() => {
    const deletedUserIds = getDeletedUserIds();
    const studentUsers = (users || []).filter((u) => u.role === "student" || !u.role);
    const validUserIds = new Set((users || []).map((u) => u.id));
    const validEmails = new Set((users || []).map((u) => u.email.toLowerCase()));
    const validNames = new Set((users || []).map((u) => u.name.trim().toLowerCase()));

    // Nếu hệ thống không có học sinh nào (chỉ có Admin), danh sách bài nộp sẽ là 0
    if (users && users.length > 0 && studentUsers.length === 0) {
      return [];
    }

    return submissions
      .filter((s) => {
        if (!s || !s.id) return false;
        if (s.studentId && deletedUserIds.has(s.studentId)) return false;
        if (users && users.length > 0) {
          const isMatched =
            (s.studentId && validUserIds.has(s.studentId)) ||
            (s.studentEmail && validEmails.has(s.studentEmail.toLowerCase())) ||
            (s.studentName && validNames.has(s.studentName.trim().toLowerCase()));
          if (!isMatched) return false;
        }
        return true;
      })
      .map((s) => {
        const matchedUser = users?.find(
          (u) =>
            (s.studentId && u.id === s.studentId) ||
            (u.email && s.studentEmail && u.email.toLowerCase() === s.studentEmail.toLowerCase()) ||
            (u.name && s.studentName && u.name.trim().toLowerCase() === s.studentName.trim().toLowerCase())
        );
        if (matchedUser) {
          return {
            ...s,
            studentId: matchedUser.id,
            studentName: matchedUser.name,
            studentClass: matchedUser.schoolClass || s.studentClass || "",
            studentEmail: matchedUser.email || s.studentEmail,
            studentAvatar: matchedUser.avatar || s.studentAvatar,
          };
        }
        return s;
      });
  }, [submissions, users]);

  // Danh sách các lớp thực tế có bài làm hoặc tài khoản học sinh
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    syncedSubmissions.forEach((s) => {
      if (s.studentClass && s.studentClass.trim()) classSet.add(s.studentClass.trim());
    });
    (users || []).forEach((u) => {
      if (u.schoolClass && u.schoolClass.trim()) classSet.add(u.schoolClass.trim());
    });
    return Array.from(classSet).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [syncedSubmissions, users]);

  // 1. Lọc theo Đề thi
  const filteredSubmissionsByExam = useMemo(() => {
    if (isAllExamsMode) return syncedSubmissions;
    const targetExam = activeExam || exam;
    return syncedSubmissions.filter((s) => {
      return (
        s.examId === targetExam.id ||
        s.examId === targetExam.code ||
        (!!s.examTitle && !!targetExam.title && s.examTitle.trim().toLowerCase() === targetExam.title.trim().toLowerCase())
      );
    });
  }, [syncedSubmissions, isAllExamsMode, activeExam, exam]);

  // 2. Lọc theo Lớp được Admin/Giáo viên chọn
  const filteredSubmissionsByClass = useMemo(() => {
    if (activeClass === "all") return filteredSubmissionsByExam;
    return filteredSubmissionsByExam.filter((sub) => {
      if (!sub.studentClass) return true;
      if (sub.studentClass === activeClass) return true;
      if (activeClass === "Lớp 12" && sub.studentClass.startsWith("12")) return true;
      if (activeClass === "Lớp 11" && sub.studentClass.startsWith("11")) return true;
      if (activeClass === "Lớp 10" && sub.studentClass.startsWith("10")) return true;
      return false;
    });
  }, [filteredSubmissionsByExam, activeClass]);

  // Thống kê tổng quan dựa trên danh sách đã lọc đồng bộ
  const stats = useMemo(() => {
    const count = filteredSubmissionsByClass.length;
    const uniqueStudents = new Set(
      filteredSubmissionsByClass.map((s) => s.studentId || s.studentName)
    ).size;

    if (count === 0) {
      return {
        total: 0,
        totalStudents: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        passRate: 0,
        distribution: [
          { range: "0 - 2đ", count: 0 },
          { range: "2 - 4đ", count: 0 },
          { range: "4 - 6đ", count: 0 },
          { range: "6 - 8đ", count: 0 },
          { range: "8 - 10đ", count: 0 },
        ],
      };
    }

    const scores = filteredSubmissionsByClass.map((s) => s.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Number((sum / count).toFixed(2));
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = scores.filter((s) => s >= 5.0).length;
    const passRate = Number(((passCount / count) * 100).toFixed(1));

    // Phổ điểm theo dải: 0-2, 2-4, 4-6, 6-8, 8-10
    const distribution = [
      { range: "0 - 2đ", count: scores.filter((s) => s < 2).length },
      { range: "2 - 4đ", count: scores.filter((s) => s >= 2 && s < 4).length },
      { range: "4 - 6đ", count: scores.filter((s) => s >= 4 && s < 6).length },
      { range: "6 - 8đ", count: scores.filter((s) => s >= 6 && s < 8).length },
      { range: "8 - 10đ", count: scores.filter((s) => s >= 8).length },
    ];

    return {
      total: count,
      totalStudents: uniqueStudents,
      avgScore: avg,
      maxScore: max,
      minScore: min,
      passRate,
      distribution,
    };
  }, [filteredSubmissionsByClass]);

  // ===================== PHÂN TÍCH TIẾN BỘ ĐIỂM SỐ QUA CÁC ĐỀ THI (RECHARTS LINE CHART) =====================
  const [progressChartMode, setProgressChartMode] = useState<
    "student_vs_class" | "multi_students" | "cohort_trend"
  >("student_vs_class");
  const [selectedProgressStudentId, setSelectedProgressStudentId] = useState<string>("");

  const MULTI_STUDENT_COLORS = [
    "#4f46e5", // Indigo
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Purple
  ];

  // 1. Toàn bộ bài làm của các học sinh thuộc lớp đang chọn (không giới hạn ở 1 đề thi)
  const crossExamSubmissions = useMemo(() => {
    if (activeClass === "all") return syncedSubmissions;
    return syncedSubmissions.filter((sub) => {
      if (!sub.studentClass) return true;
      if (sub.studentClass === activeClass) return true;
      if (activeClass === "Lớp 12" && sub.studentClass.startsWith("12")) return true;
      if (activeClass === "Lớp 11" && sub.studentClass.startsWith("11")) return true;
      if (activeClass === "Lớp 10" && sub.studentClass.startsWith("10")) return true;
      return false;
    });
  }, [syncedSubmissions, activeClass]);

  // 2. Danh sách tất cả các đề thi theo trình tự thời gian
  const chronologicalExams = useMemo(() => {
    const examMap = new Map<string, { id: string; code: string; title: string; orderDate: number }>();

    allExams.forEach((e, idx) => {
      const d = e.createdAt ? new Date(e.createdAt).getTime() : Date.now() - (allExams.length - idx) * 86400000;
      examMap.set(e.id, {
        id: e.id,
        code: e.code || `Đề ${idx + 1}`,
        title: e.title || `Đề thi ${e.code || idx + 1}`,
        orderDate: d,
      });
    });

    // Thêm các đề có trong syncedSubmissions nhưng chưa có trong allExams
    syncedSubmissions.forEach((s) => {
      if (s.examId && !examMap.has(s.examId)) {
        examMap.set(s.examId, {
          id: s.examId,
          code: s.examId.startsWith("exam_") ? s.examId.replace("exam_", "Đề ") : s.examId,
          title: s.examTitle || `Đề thi ${s.examId}`,
          orderDate: s.submittedAt ? new Date(s.submittedAt).getTime() : Date.now(),
        });
      }
    });

    return Array.from(examMap.values()).sort((a, b) => a.orderDate - b.orderDate);
  }, [allExams, syncedSubmissions]);

  // 3. Danh sách học sinh cùng tiến độ qua các đề thi
  const studentsProgressSummary = useMemo(() => {
    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentClass: string;
        studentAvatar?: string;
        submissions: StudentSubmission[];
      }
    >();

    crossExamSubmissions.forEach((sub) => {
      const sId = sub.studentId || sub.studentName;
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          studentName: sub.studentName,
          studentClass: sub.studentClass || "",
          studentAvatar: sub.studentAvatar,
          submissions: [],
        });
      }
      studentMap.get(sId)!.submissions.push(sub);
    });

    const summaryList = Array.from(studentMap.values()).map((st) => {
      const sortedSubs = [...st.submissions].sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      );
      const scores = sortedSubs.map((s) => s.score);
      const firstScore = scores[0] ?? 0;
      const latestScore = scores[scores.length - 1] ?? 0;
      const bestScore = Math.max(...scores);
      const avgScore = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      const delta = Number((latestScore - firstScore).toFixed(2));

      return {
        ...st,
        totalExamsTaken: sortedSubs.length,
        firstScore,
        latestScore,
        bestScore,
        avgScore,
        delta,
        sortedSubs,
      };
    });

    return summaryList.sort((a, b) => b.totalExamsTaken - a.totalExamsTaken || b.latestScore - a.latestScore);
  }, [crossExamSubmissions]);

  // Học sinh đang được chọn theo dõi tiến bộ
  const activeProgressStudent = useMemo(() => {
    if (studentsProgressSummary.length === 0) return null;
    const found = studentsProgressSummary.find((s) => s.studentId === selectedProgressStudentId);
    return found || studentsProgressSummary[0];
  }, [studentsProgressSummary, selectedProgressStudentId]);


  // 4. Dữ liệu chuẩn hóa cho Recharts Line Chart
  const scoreProgressChartData = useMemo(() => {
    if (chronologicalExams.length === 0) return [];

    return chronologicalExams.map((examItem, index) => {
      const examSubs = crossExamSubmissions.filter(
        (s) =>
          s.examId === examItem.id ||
          s.examId === examItem.code ||
          (!!s.examTitle && !!examItem.title && s.examTitle.trim().toLowerCase() === examItem.title.trim().toLowerCase())
      );

      const count = examSubs.length;
      let classAvg: number | null = null;
      let maxScore: number | null = null;
      let minScore: number | null = null;

      if (count > 0) {
        const scores = examSubs.map((s) => s.score);
        classAvg = Number((scores.reduce((a, b) => a + b, 0) / count).toFixed(2));
        maxScore = Math.max(...scores);
        minScore = Math.min(...scores);
      }

      let studentScore: number | null = null;
      let studentSub: StudentSubmission | undefined = undefined;

      if (activeProgressStudent) {
        studentSub = activeProgressStudent.sortedSubs.find(
          (s) =>
            s.examId === examItem.id ||
            s.examId === examItem.code ||
            (!!s.examTitle && !!examItem.title && s.examTitle.trim().toLowerCase() === examItem.title.trim().toLowerCase())
        );
        if (studentSub) {
          studentScore = studentSub.score;
        }
      }

      const multiScores: Record<string, number | null> = {};
      studentsProgressSummary.slice(0, 5).forEach((st) => {
        const sub = st.sortedSubs.find(
          (s) =>
            s.examId === examItem.id ||
            s.examId === examItem.code ||
            (!!s.examTitle && !!examItem.title && s.examTitle.trim().toLowerCase() === examItem.title.trim().toLowerCase())
        );
        multiScores[`student_${st.studentId}`] = sub ? sub.score : null;
      });

      const shortTitle = examItem.code ? `${examItem.code}` : `Đề ${index + 1}`;

      return {
        examId: examItem.id,
        examCode: examItem.code,
        examTitle: examItem.title,
        shortTitle,
        fullLabel: `${examItem.code ? `[${examItem.code}] ` : ""}${examItem.title}`,
        classAvg,
        maxScore,
        minScore,
        studentScore,
        studentSub,
        totalExamsCount: count,
        ...multiScores,
      };
    });
  }, [chronologicalExams, crossExamSubmissions, activeProgressStudent, studentsProgressSummary]);

  // Đề thi dùng cho việc phân tích câu hỏi
  const [selectedExamForAnalysis, setSelectedExamForAnalysis] = useState<string>(
    exam.id
  );

  const currentQuestionsExam = useMemo(() => {
    if (activeExam) return activeExam;
    return (
      allExams.find(
        (e) => e.id === selectedExamForAnalysis || e.code === selectedExamForAnalysis
      ) || exam
    );
  }, [activeExam, allExams, selectedExamForAnalysis, exam]);

  // Phân tích câu hỏi (Item Analysis)
  const itemAnalysis = useMemo(() => {
    if (!currentQuestionsExam || !currentQuestionsExam.questions) return [];

    const examSubs = filteredSubmissionsByClass.filter((s) => {
      return (
        s.examId === currentQuestionsExam.id ||
        s.examId === currentQuestionsExam.code ||
        (!!s.examTitle && !!currentQuestionsExam.title && s.examTitle.trim().toLowerCase() === currentQuestionsExam.title.trim().toLowerCase())
      );
    });

    let list = currentQuestionsExam.questions.map((q, idx) => {
      let correctCount = 0;
      let totalAttempts = examSubs.length;

      examSubs.forEach((sub) => {
        const detail = sub.details[q.id];
        if (detail && detail.isCorrect) {
          correctCount++;
        }
      });

      const correctRate =
        totalAttempts > 0
          ? Number(((correctCount / totalAttempts) * 100).toFixed(1))
          : 0;

      return {
        questionId: q.id,
        index: idx + 1,
        title: q.title,
        partName: q.partName,
        type: q.type,
        content: q.content,
        score: q.score,
        correctCount,
        totalAttempts,
        correctRate,
        isHard: correctRate < 50,
      };
    });

    // Lọc theo Phần thi
    if (itemPartFilter !== "all") {
      list = list.filter((item) => {
        if (itemPartFilter === "part_1") return item.partName.includes("Phần 1") || item.partName.includes("Phần I");
        if (itemPartFilter === "part_2") return item.partName.includes("Phần 2") || item.partName.includes("Phần II");
        if (itemPartFilter === "part_3") return item.partName.includes("Phần 3") || item.partName.includes("Phần III");
        if (itemPartFilter === "part_4") return item.partName.includes("Phần 4") || item.partName.includes("Phần IV");
        return true;
      });
    }

    // Lọc theo Mức độ đạt
    if (itemDifficultyFilter === "hard") {
      list = list.filter((item) => item.correctRate < 50);
    } else if (itemDifficultyFilter === "standard") {
      list = list.filter((item) => item.correctRate >= 50 && item.correctRate < 80);
    } else if (itemDifficultyFilter === "easy") {
      list = list.filter((item) => item.correctRate >= 80);
    }

    return list;
  }, [currentQuestionsExam, filteredSubmissionsByClass, itemPartFilter, itemDifficultyFilter]);

  // Danh sách học sinh lọc theo từ khóa tìm kiếm (Accent-insensitive) + Mức điểm + Sắp xếp
  const filteredStudents = useMemo(() => {
    let list = filteredSubmissionsByClass;

    // 1. Lọc từ khóa tìm kiếm (không dấu)
    if (searchKeyword.trim()) {
      list = list.filter((s) =>
        matchSearchQuery(searchKeyword, s.studentName, s.studentId, s.studentClass, s.studentEmail)
      );
    }

    // 2. Lọc mức điểm
    if (studentScoreTier !== "all") {
      list = list.filter((s) => isScoreInTier(s.score, studentScoreTier));
    }

    // 3. Sắp xếp danh sách
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (studentSortBy === "score_desc") {
        return b.score - a.score;
      }
      if (studentSortBy === "score_asc") {
        return a.score - b.score;
      }
      if (studentSortBy === "name") {
        return a.studentName.localeCompare(b.studentName, "vi");
      }
      if (studentSortBy === "sbd") {
        return a.studentId.localeCompare(b.studentId);
      }
      if (studentSortBy === "time_desc") {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      return 0;
    });

    return sorted;
  }, [filteredSubmissionsByClass, searchKeyword, studentScoreTier, studentSortBy]);

  // In bảng điểm
  const handlePrint = () => {
    window.print();
  };

  // Xuất CSV bảng điểm có thông tin Lớp
  const handleExportCSV = () => {
    let csv = "\uFEFFSBD,Họ và tên,Lớp,Điểm tổng,Phần I,Phần II,Phần III,Phần IV,Thời gian nộp\n";
    filteredSubmissionsByClass.forEach((s) => {
      csv += `"${s.studentId}","${s.studentName}","${s.studentClass || ""}",${s.score},${s.partScores.part_1.earned},${s.partScores.part_2.earned},${s.partScores.part_3.earned},${s.partScores.part_4.earned},"${new Date(s.submittedAt).toLocaleString("vi-VN")}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const classTag = activeClass !== "all" ? `_Lop_${activeClass}` : "_Tat_ca_lop";
    link.setAttribute("download", `bang_diem_${exam.code}${classTag}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Dashboard Bento */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-100">
                BẢNG ĐIỀU KHIỂN GIÁO VIÊN
              </span>
              {isAllExamsMode ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-xs border border-amber-200">
                  TẤT CẢ ĐỀ THI ({allExams.length || 1})
                </span>
              ) : (
                <>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                    {activeExam?.grade || exam.grade}
                  </span>
                  {(activeExam?.chapter || exam.chapter) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 font-medium text-xs border border-slate-200 truncate max-w-xs">
                      {activeExam?.chapter || exam.chapter}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-semibold">
                    Mã: {activeExam?.code || exam.code}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap mt-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isAllExamsMode
                  ? "Báo Cáo & Phân Tích: Tất Cả Đề Thi"
                  : `Phân Tích & Báo Cáo: ${activeExam?.title || exam.title}`}
              </h1>

              {/* Bộ chọn chuyển đổi nhanh Đề thi */}
              {allExams.length > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <select
                    value={selectedExamFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedExamFilter(val);
                      if (val !== "all" && onSelectExam) {
                        const found = allExams.find((ex) => ex.id === val || ex.code === val);
                        if (found) onSelectExam(found);
                      }
                    }}
                    className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer max-w-[220px] truncate"
                    title="Chọn đề thi để phân tích"
                  >
                    <option value="all">📊 Tất cả đề thi ({allExams.length})</option>
                    {allExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        [{ex.code}] {ex.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium">
              {isAllExamsMode
                ? `Tổng số đề thi: ${allExams.length || 1} • Tổng lượt làm bài: ${filteredSubmissionsByClass.length} • Học sinh đã thi: ${stats.totalStudents}`
                : `Số câu hỏi: ${(activeExam || exam).questions.length} • Tổng điểm chuẩn: ${(activeExam || exam).totalScore}đ • Thời lượng: ${(activeExam || exam).durationMinutes} phút`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Bảng Xếp Hạng Điểm</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>In bảng điểm</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              Quay lại
            </button>
          </div>
        </div>

        {/* ================= FLOATING ACTION & ACTIVE FILTERS BAR ================= */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-3">
          {/* Top Row: Drawer Trigger + Search */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Nút mở Sidebar Bộ lọc Dùng chung (Global Drawer Trigger) */}
            <button
              type="button"
              onClick={openFilterDrawer}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs ${
                activeFiltersCount > 0
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
              }`}
              title="Mở bảng điều khiển lọc dữ liệu đa chiều (Lớp, Dạng thức, Độ khó, Điểm số)"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-300" />
              <span>Bảng điều khiển lọc</span>
              {activeFiltersCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                  {activeFiltersCount}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold">(Tất cả)</span>
              )}
            </button>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tên, SBD, lớp..."
                className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium shadow-2xs"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Active Filter Badges Strip */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3 text-indigo-600" />
                Bộ lọc đang áp dụng:
              </span>

              {activeFilterBadges.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                  Đang hiển thị toàn bộ ({filteredSubmissionsByClass.length} bài nộp)
                </span>
              ) : (
                activeFilterBadges.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold animate-fadeIn"
                  >
                    <span>{b.label}</span>
                    <button
                      type="button"
                      onClick={b.onRemove}
                      className="w-3.5 h-3.5 rounded-full hover:bg-indigo-200 flex items-center justify-center text-indigo-900 transition"
                      title="Xóa bộ lọc này"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition flex items-center gap-1"
                  title="Xóa tất cả các bộ lọc đang kích hoạt"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa tất cả ({activeFiltersCount})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-500 shrink-0">
              Đang phân tích: <strong className="text-indigo-600 font-black">{filteredSubmissionsByClass.length}</strong> bài nộp
            </div>
          </div>
        </div>

        {/* 4 Khối Thống Kê Tổng Quan Bento Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500">Số bài nộp</span>
              <p className="text-2xl font-bold text-slate-900">{stats.total} bài</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500">Điểm trung bình</span>
              <p className="text-2xl font-bold text-emerald-600">{stats.avgScore}đ</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500">Cao nhất / Thấp nhất</span>
              <p className="text-2xl font-bold text-slate-900">{stats.maxScore} / {stats.minScore}đ</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500">Tỷ lệ Đạt (≥5.0đ)</span>
              <p className="text-2xl font-bold text-indigo-700">{stats.passRate}%</p>
            </div>
          </div>
        </div>

        {/* Tab chuyển đổi phân hệ Bento */}
        <div className="flex gap-2">
          {[
            { id: "overview", label: "Phổ điểm & Biểu đồ", icon: BarChart3 },
            { id: "items", label: "Phân tích câu hỏi khó", icon: AlertTriangle },
            { id: "students", label: "Danh sách bảng điểm", icon: ListOrdered },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: PHỔ ĐIỂM & TIẾN BỘ ĐIỂM SỐ QUA CÁC ĐỀ THI BENTO */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KHỐI 1: BIỂU ĐỒ ĐƯỜNG TIẾN BỘ ĐIỂM SỐ QUA CÁC ĐỀ THI (RECHARTS LINE CHART) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-5">
              {/* Header của biểu đồ đường tiến bộ */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                      <LineChartIcon className="w-5 h-5" />
                    </span>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                      Biểu đồ đường: Sự tiến bộ điểm số qua các đề thi
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Theo dõi hành trình tăng trưởng điểm số của học sinh qua từng đề thi, đối chiếu với mức điểm trung bình của lớp.
                  </p>
                </div>

                {/* Chuyển đổi chế độ biểu đồ */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 self-stretch sm:self-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setProgressChartMode("student_vs_class")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                      progressChartMode === "student_vs_class"
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Cá nhân vs TB Lớp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProgressChartMode("cohort_trend")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                      progressChartMode === "cohort_trend"
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Xu hướng toàn lớp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProgressChartMode("multi_students")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                      progressChartMode === "multi_students"
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Top 5 học sinh</span>
                  </button>
                </div>
              </div>

              {/* Chế độ 1: Chọn học sinh và Thẻ tóm tắt chỉ số tiến bộ */}
              {progressChartMode === "student_vs_class" && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <span className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        Chọn học sinh theo dõi:
                      </span>
                      <select
                        value={activeProgressStudent?.studentId || ""}
                        onChange={(e) => setSelectedProgressStudentId(e.target.value)}
                        disabled={studentsProgressSummary.length === 0}
                        className="flex-1 md:w-64 px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-900 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {studentsProgressSummary.length === 0 ? (
                          <option value="">Chưa có dữ liệu học sinh</option>
                        ) : (
                          studentsProgressSummary.map((st) => {
                            const cleanName = st.studentName.replace(/\s*-\s*\d{1,2}[A-Z]\d*/, "");
                            return (
                              <option key={st.studentId} value={st.studentId}>
                                {cleanName} ({st.studentClass}) - {st.totalExamsTaken} bài thi
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>

                    {activeProgressStudent && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">Đánh giá tiến độ:</span>
                        {activeProgressStudent.delta > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Tiến bộ +{activeProgressStudent.delta}đ
                          </span>
                        ) : activeProgressStudent.delta < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-xs">
                            <TrendingDown className="w-3.5 h-3.5" />
                            Giảm {activeProgressStudent.delta}đ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-extrabold text-xs">
                            <Minus className="w-3.5 h-3.5" />
                            Giữ vững phong độ
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4 Thống kê nhanh của học sinh đang chọn */}
                  {activeProgressStudent && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Bài đầu → Bài mới nhất</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm font-bold text-slate-600">{activeProgressStudent.firstScore}đ</span>
                          <span className="text-slate-400 font-bold">→</span>
                          <span className="text-base font-extrabold text-indigo-600">{activeProgressStudent.latestScore}đ</span>
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Điểm cao nhất</span>
                        <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                          {activeProgressStudent.bestScore}đ
                        </p>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Điểm trung bình (GPA)</span>
                        <p className="text-base font-extrabold text-slate-900 mt-0.5">
                          {activeProgressStudent.avgScore}đ
                        </p>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Số đề thi đã hoàn thành</span>
                        <p className="text-base font-extrabold text-indigo-700 mt-0.5">
                          {activeProgressStudent.totalExamsTaken} / {chronologicalExams.length} đề
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chế độ 2: Chú thích so sánh Top học sinh */}
              {progressChartMode === "multi_students" && (
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex-wrap">
                  <span className="text-xs font-bold text-slate-700">Đang hiển thị so sánh:</span>
                  {studentsProgressSummary.slice(0, 5).map((st, idx) => (
                    <span
                      key={st.studentId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: MULTI_STUDENT_COLORS[idx % MULTI_STUDENT_COLORS.length] }}
                      />
                      <span>{st.studentName}</span>
                      <span className="text-slate-400 text-[10px]">({st.latestScore}đ)</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Chế độ 3: Chú thích Xu hướng toàn lớp */}
              {progressChartMode === "cohort_trend" && (
                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3 flex-wrap text-xs font-semibold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Tổng quan chất lượng làm bài của toàn bộ học sinh {activeClass !== "all" ? `Lớp ${activeClass}` : "các lớp"} qua {chronologicalExams.length} đề thi.
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    Nét liền: Điểm TB • Nét chấm cam: Điểm cao nhất • Nét đứt đỏ: Điểm thấp nhất
                  </span>
                </div>
              )}

              {/* VÙNG VẼ BIỂU ĐỒ ĐƯỜNG RECHARTS */}
              {scoreProgressChartData.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-semibold text-xs">
                  Chưa có đủ dữ liệu bài nộp để tạo biểu đồ đường tiến bộ.
                </div>
              ) : (
                <div className="w-full h-84 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={scoreProgressChartData}
                      margin={{ top: 15, right: 30, left: -10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="shortTitle"
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: "#cbd5e1" }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 8, 10]}
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: "#cbd5e1" }}
                        unit="đ"
                      />
                      <Tooltip
                        content={
                          <CustomProgressTooltip
                            progressChartMode={progressChartMode}
                            activeProgressStudent={activeProgressStudent}
                            studentsProgressSummary={studentsProgressSummary}
                            MULTI_STUDENT_COLORS={MULTI_STUDENT_COLORS}
                          />
                        }
                      />
                      <ReferenceLine
                        y={5.0}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{
                          value: "Đạt chuẩn (5.0đ)",
                          fill: "#64748b",
                          fontSize: 10,
                          position: "insideBottomRight",
                        }}
                      />
                      <ReferenceLine
                        y={8.0}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{
                          value: "Giỏi (8.0đ)",
                          fill: "#10b981",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />

                      {progressChartMode === "student_vs_class" && (
                        <>
                          <Line
                            type="monotone"
                            dataKey="classAvg"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            strokeDasharray="5 5"
                            dot={{ r: 4, fill: "#10b981", strokeWidth: 1, stroke: "#fff" }}
                            name="Điểm Trung Bình Lớp"
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="studentScore"
                            stroke="#4f46e5"
                            strokeWidth={3.5}
                            dot={{ r: 6, fill: "#4f46e5", strokeWidth: 2.5, stroke: "#fff" }}
                            activeDot={{ r: 8, stroke: "#4f46e5", strokeWidth: 3, fill: "#fbbf24" }}
                            name={activeProgressStudent ? `${activeProgressStudent.studentName}` : "Học sinh"}
                            connectNulls
                          />
                        </>
                      )}

                      {progressChartMode === "cohort_trend" && (
                        <>
                          <Line
                            type="monotone"
                            dataKey="maxScore"
                            stroke="#f59e0b"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#f59e0b" }}
                            name="Điểm Cao Nhất"
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="classAvg"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 5, fill: "#10b981" }}
                            name="Điểm Trung Bình Lớp"
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="minScore"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 4, fill: "#f43f5e" }}
                            name="Điểm Thấp Nhất"
                            connectNulls
                          />
                        </>
                      )}

                      {progressChartMode === "multi_students" && (
                        <>
                          <Line
                            type="monotone"
                            dataKey="classAvg"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            name="TB Lớp"
                            connectNulls
                          />
                          {studentsProgressSummary.slice(0, 5).map((st, idx) => (
                            <Line
                              key={st.studentId}
                              type="monotone"
                              dataKey={`student_${st.studentId}`}
                              stroke={MULTI_STUDENT_COLORS[idx % MULTI_STUDENT_COLORS.length]}
                              strokeWidth={3}
                              dot={{
                                r: 5,
                                fill: MULTI_STUDENT_COLORS[idx % MULTI_STUDENT_COLORS.length],
                                stroke: "#fff",
                                strokeWidth: 2,
                              }}
                              name={st.studentName}
                              connectNulls
                            />
                          ))}
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* KHỐI 2: BIỂU ĐỒ PHÂN BỐ PHỔ ĐIỂM (RECHARTS BAR CHART) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Biểu đồ phân bố phổ điểm học sinh
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thống kê số lượng học sinh theo từng thang khoảng điểm (Dưới 2đ, 2-4đ, 4-6đ, 6-8đ, 8-10đ)
                  </p>
                </div>
              </div>

              {stats.total === 0 ? (
                <div className="py-16 text-center text-slate-400 font-semibold text-xs">
                  Chưa có học sinh nào nộp bài thi cho đề này.
                </div>
              ) : (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.distribution} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderRadius: "16px",
                          color: "#fff",
                          border: "none",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="count" fill="#4f46e5" radius={[12, 12, 0, 0]} name="Số học sinh" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PHÂN TÍCH CÂU HỎI KHÓ (ITEM ANALYSIS) */}
        {activeTab === "items" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <span>Phân tích độ khó & tỷ lệ đúng từng câu hỏi ({itemAnalysis.length} câu)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Giúp giáo viên nhận biết các câu hỏi có tỷ lệ sai cao để củng cố kiến thức cho học sinh.
                </p>
              </div>

              {/* Bộ lọc cho Phần & Độ khó */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Lọc theo phần */}
                <select
                  value={itemPartFilter}
                  onChange={(e) => setItemPartFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả các phần (I, II, III, IV)</option>
                  <option value="part_1">Phần I (Trắc nghiệm nhiều lựa chọn)</option>
                  <option value="part_2">Phần II (Trắc nghiệm Đúng/Sai)</option>
                  <option value="part_3">Phần III (Trả lời ngắn)</option>
                  <option value="part_4">Phần IV (Tự luận)</option>
                </select>

                {/* Lọc theo độ khó */}
                <select
                  value={itemDifficultyFilter}
                  onChange={(e) => setItemDifficultyFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="hard">⚠️ Học sinh hay sai (&lt; 50% đúng)</option>
                  <option value="standard">⚡ Đạt chuẩn trung bình (50 - 79%)</option>
                  <option value="easy">✓ Dễ / Tỷ lệ đúng cao (≥ 80%)</option>
                </select>

                {(itemPartFilter !== "all" || itemDifficultyFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemPartFilter("all");
                      setItemDifficultyFilter("all");
                    }}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1"
                    title="Đặt lại bộ lọc"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase bg-slate-50">
                    <th className="p-3">Câu</th>
                    <th className="p-3">Phần</th>
                    <th className="p-3">Nội dung tóm tắt</th>
                    <th className="p-3 text-center">Đúng/Tổng</th>
                    <th className="p-3 text-center">Tỷ lệ đúng</th>
                    <th className="p-3 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {itemAnalysis.map((item) => (
                    <tr key={item.questionId} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-blue-600">{item.title}</td>
                      <td className="p-3 text-slate-500">{item.partName.split(" ")[1] || item.partName}</td>
                      <td className="p-3 max-w-xs truncate">
                        <MathRenderer content={item.content.substring(0, 75) + "..."} inline />
                      </td>
                      <td className="p-3 text-center">
                        {item.correctCount} / {item.totalAttempts}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-extrabold ${
                            item.correctRate >= 70
                              ? "text-emerald-600"
                              : item.correctRate >= 40
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.correctRate}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.isHard ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">
                            Học sinh hay sai ⚠️
                          </span>
                        ) : item.correctRate >= 80 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                            Tốt (≥80%) ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">
                            Đạt chuẩn ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DANH SÁCH BẢNG ĐIỂM HỌC SINH */}
        {activeTab === "students" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
            {/* Filter Bar for Students */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-800 shrink-0">
                  Danh sách kết quả ({filteredStudents.length} học sinh)
                </h3>
                {(searchKeyword || studentScoreTier !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKeyword("");
                      setStudentScoreTier("all");
                      setStudentSortBy("score_desc");
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 border border-rose-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa lọc</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Score Tier Filter */}
                <select
                  value={studentScoreTier}
                  onChange={(e) => setStudentScoreTier(e.target.value as ScoreTierKey)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="all">🎯 Tất cả mức điểm (0 - 10đ)</option>
                  {SCORE_TIERS.map((tier) => (
                    <option key={tier.key} value={tier.key}>
                      {tier.shortLabel}
                    </option>
                  ))}
                </select>

                {/* Sắp xếp */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <select
                    value={studentSortBy}
                    onChange={(e) => setStudentSortBy(e.target.value as any)}
                    className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="score_desc">Điểm cao → thấp</option>
                    <option value="score_asc">Điểm thấp → cao</option>
                    <option value="name">Họ tên A → Z</option>
                    <option value="sbd">Số báo danh (SBD)</option>
                    <option value="time_desc">Nộp bài mới nhất</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm tên, SBD, lớp..."
                    className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Không tìm thấy bài nộp nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase bg-slate-50">
                      <th className="p-3">SBD</th>
                      <th className="p-3">Học sinh</th>
                      <th className="p-3 text-center">Lớp</th>
                      <th className="p-3 text-center">Phần I</th>
                      <th className="p-3 text-center">Phần II</th>
                      <th className="p-3 text-center">Phần III</th>
                      <th className="p-3 text-center">Phần IV</th>
                      <th className="p-3 text-center">Tổng điểm</th>
                      <th className="p-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredStudents.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="p-3 font-extrabold text-slate-500">{sub.studentId}</td>
                        <td className="p-3 font-black text-slate-900">
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenStudentHistory) {
                                onOpenStudentHistory(sub.studentId, sub.studentName);
                              } else {
                                setSelectedSubmission(sub);
                              }
                            }}
                            className="hover:text-indigo-600 font-extrabold text-left transition flex items-center gap-1.5 cursor-pointer"
                            title="Bấm để xem tất cả các lần làm bài của học sinh này"
                          >
                            <span>{sub.studentName}</span>
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200">
                            {sub.studentClass || "Chưa phân lớp"}
                          </span>
                        </td>
                        <td className="p-3 text-center">{sub.partScores.part_1.earned}đ</td>
                        <td className="p-3 text-center">{sub.partScores.part_2.earned}đ</td>
                        <td className="p-3 text-center">{sub.partScores.part_3.earned}đ</td>
                        <td className="p-3 text-center">{sub.partScores.part_4.earned}đ</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-black text-xs ${
                              sub.score >= 8
                                ? "bg-emerald-100 text-emerald-800"
                                : sub.score >= 5
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {sub.score} / {sub.maxScore}đ
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProgressStudentId(sub.studentId);
                                setProgressChartMode("student_vs_class");
                                setActiveTab("overview");
                                window.scrollTo({ top: 350, behavior: "smooth" });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition flex items-center gap-1 text-[11px] cursor-pointer"
                              title="Xem biểu đồ đường tiến bộ điểm số của học sinh qua các đề thi"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Tiến bộ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedSubmission(sub)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 font-bold transition flex items-center gap-1 text-[11px]"
                              title="Xem chi tiết bài nộp này"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem bài</span>
                            </button>
                            {onOpenStudentHistory && (
                              <button
                                type="button"
                                onClick={() => onOpenStudentHistory(sub.studentId, sub.studentName)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition text-[11px]"
                                title="Xem toàn bộ lịch sử thi của học sinh"
                              >
                                <span>Lịch sử</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Xem chi tiết bài làm của học sinh */}
        {selectedSubmission && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSubmission(null)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-xl text-slate-900">
                    Bài làm của: {selectedSubmission.studentName} ({selectedSubmission.studentId})
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Tổng điểm: <b className="text-blue-700">{selectedSubmission.score}đ</b> • Thời gian: {Math.floor(selectedSubmission.timeSpentSeconds / 60)} phút
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  ✕
                </button>
              </div>

              {/* Rà soát các câu */}
              {(() => {
                const subExam =
                  allExams.find(
                    (e) =>
                      e.id === selectedSubmission.examId ||
                      e.code === selectedSubmission.examId ||
                      (!!selectedSubmission.examTitle && !!e.title && e.title.trim().toLowerCase() === selectedSubmission.examTitle.trim().toLowerCase())
                  ) || activeExam || exam;

                return (
                  <div className="space-y-4">
                    {subExam.questions.map((q) => {
                      const detail = selectedSubmission.details[q.id];
                      const ans = detail?.userAnswer;

                      return (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex justify-between font-bold mb-1">
                            <span>{q.title} ({q.partName}):</span>
                            <span className={detail?.isCorrect ? "text-emerald-600 font-black" : "text-red-600 font-black"}>
                              {detail?.earnedScore} / {detail?.maxScore}đ
                            </span>
                          </div>
                          <MathRenderer content={q.content} className="mb-2" />
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                            <div>
                              <b className="text-slate-600 block mb-1">Học sinh trả lời:</b>
                              {q.type === "essay" && typeof ans === "object" && ans !== null ? (
                                <div className="space-y-2">
                                  {ans.text && (
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-800 font-medium">
                                      <MathRenderer content={ans.text} />
                                    </div>
                                  )}
                                  {ans.attachments && ans.attachments.length > 0 && (
                                    <div>
                                      <span className="text-[11px] font-bold text-slate-500 block mb-1">
                                        📎 Tệp đính kèm ({ans.attachments.length}):
                                      </span>
                                      <div className="flex flex-wrap gap-2">
                                        {ans.attachments.map((att: any) => (
                                          <div
                                            key={att.id}
                                            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                                          >
                                            {att.type === "image" ? (
                                              <div
                                                onClick={() => setTeacherPreviewImage(att.dataUrl)}
                                                className="w-6 h-6 rounded overflow-hidden border border-slate-300 cursor-pointer flex-shrink-0"
                                                title="Xem ảnh"
                                              >
                                                <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                                              </div>
                                            ) : att.type === "pdf" ? (
                                              <span className="px-1 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[9px]">PDF</span>
                                            ) : (
                                              <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[9px]">DOC</span>
                                            )}
                                            <span className="font-semibold text-slate-700 max-w-[130px] truncate" title={att.name}>
                                              {att.name}
                                            </span>
                                            {att.type === "image" && (
                                              <button
                                                type="button"
                                                onClick={() => setTeacherPreviewImage(att.dataUrl)}
                                                className="p-0.5 hover:text-indigo-600 cursor-pointer"
                                                title="Xem ảnh phóng to"
                                              >
                                                <Eye className="w-3 h-3" />
                                              </button>
                                            )}
                                            <a
                                              href={att.dataUrl}
                                              download={att.name}
                                              className="p-0.5 hover:text-indigo-600"
                                              title="Tải tệp"
                                            >
                                              <Download className="w-3 h-3" />
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {!ans.text && (!ans.attachments || ans.attachments.length === 0) && (
                                    <span className="text-slate-400 italic">(Trống)</span>
                                  )}
                                </div>
                              ) : q.type === "true_false" && typeof ans === "object" && ans !== null ? (
                                <span className="font-semibold text-slate-800">
                                  {Object.entries(ans)
                                    .map(([k, v]) => `${k}: ${v ? "Đúng" : "Sai"}`)
                                    .join(" • ") || "(Chưa chọn)"}
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-800">
                                  {typeof ans === "string" ? <MathRenderer content={ans} inline /> : JSON.stringify(ans || "(Trống)")}
                                </span>
                              )}
                            </div>
                            <p className="text-emerald-700 pt-1 border-t border-slate-100">
                              <b>Đáp án / Lời giải chuẩn:</b> {q.explanation}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Đóng
                </button>
              </div>

              {/* Lightbox ảnh phóng to cho giáo viên */}
              {teacherPreviewImage && (
                <div
                  className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                  onClick={() => setTeacherPreviewImage(null)}
                >
                  <div
                    className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-full flex justify-between items-center px-3 py-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Ảnh chụp bài làm tự luận của học sinh</span>
                      <button
                        type="button"
                        onClick={() => setTeacherPreviewImage(null)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-2 overflow-auto max-h-[75vh] flex justify-center">
                      <img
                        src={teacherPreviewImage}
                        alt="Ảnh chụp bài làm"
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
