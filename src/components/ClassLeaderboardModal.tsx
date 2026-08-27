import React, { useState, useMemo, useEffect } from "react";
import { Exam, StudentSubmission, STANDARD_CLASSES, STANDARD_GRADES } from "../types/exam";
import { User } from "../types/auth";
import { MathRenderer } from "./MathRenderer";
import {
  matchSearchQuery,
  SCORE_TIERS,
  ScoreTierKey,
  isScoreInTier,
  extractGradeFromClass,
} from "../utils/filterUtils";
import { getDeletedUserIds } from "../services/firestoreService";
import {
  Trophy,
  Award,
  Medal,
  Crown,
  Search,
  Filter,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  TrendingUp,
  X,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Users,
  ChevronRight,
  Flame,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

interface ClassLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  submissions: StudentSubmission[];
  users?: User[];
  defaultClassFilter?: string;
  defaultExamId?: string;
  onViewStudentHistory?: (studentId: string, studentName: string) => void;
}

export const ClassLeaderboardModal: React.FC<ClassLeaderboardModalProps> = ({
  isOpen,
  onClose,
  exams,
  submissions,
  users = [],
  defaultClassFilter = "all",
  defaultExamId = "all",
  onViewStudentHistory,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassFilter);
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId);
  const [selectedScoreTier, setSelectedScoreTier] = useState<ScoreTierKey>("all");
  const [sortBy, setSortBy] = useState<"best_score" | "avg_score" | "attempts" | "fastest" | "latest" | "name_asc">("best_score");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedSubmissionReview, setSelectedSubmissionReview] = useState<StudentSubmission | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Đồng bộ bộ lọc khi modal mở
  useEffect(() => {
    if (isOpen) {
      if (defaultExamId !== undefined) setSelectedExamId(defaultExamId);
      if (defaultClassFilter !== undefined) setSelectedClass(defaultClassFilter);
    }
  }, [isOpen, defaultExamId, defaultClassFilter]);

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
      if (u.schoolClass && u.schoolClass.trim()) {
        classSet.add(u.schoolClass.trim());
      }
    });

    const all = Array.from(classSet).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
    if (selectedGrade === "all") return all;
    return all.filter((c) => extractGradeFromClass(c) === selectedGrade || c.startsWith(selectedGrade.replace("Lớp ", "")));
  }, [syncedSubmissions, users, selectedGrade]);

  // Danh sách đề thi được lọc theo Khối
  const filteredExamsByGrade = useMemo(() => {
    if (selectedGrade === "all") return exams;
    return exams.filter((e) => e.grade === selectedGrade || (e.targetClass && extractGradeFromClass(e.targetClass) === selectedGrade));
  }, [exams, selectedGrade]);

  // Danh sách các bộ lọc đang kích hoạt kèm nhãn và hàm xóa
  const activeFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; icon?: string; onRemove: () => void }[] = [];

    if (selectedGrade !== "all") {
      badges.push({
        id: "grade",
        label: `Khối: ${selectedGrade}`,
        onRemove: () => setSelectedGrade("all"),
      });
    }

    if (selectedClass !== "all") {
      badges.push({
        id: "class",
        label: `Lớp: ${selectedClass}`,
        onRemove: () => setSelectedClass("all"),
      });
    }

    if (selectedExamId !== "all") {
      const ex = exams.find((e) => e.id === selectedExamId);
      badges.push({
        id: "exam",
        label: `Đề: ${ex?.code ? `[${ex.code}] ` : ""}${ex?.title ? (ex.title.length > 20 ? ex.title.slice(0, 20) + "..." : ex.title) : selectedExamId}`,
        onRemove: () => setSelectedExamId("all"),
      });
    }

    if (selectedScoreTier !== "all") {
      const tier = SCORE_TIERS.find((t) => t.key === selectedScoreTier);
      badges.push({
        id: "scoreTier",
        label: `Điểm: ${tier?.shortLabel || selectedScoreTier}`,
        onRemove: () => setSelectedScoreTier("all"),
      });
    }

    if (searchKeyword.trim() !== "") {
      badges.push({
        id: "search",
        label: `Tìm: "${searchKeyword}"`,
        onRemove: () => setSearchKeyword(""),
      });
    }

    if (sortBy !== "best_score") {
      const sortMap: Record<string, string> = {
        avg_score: "Điểm TB cao",
        attempts: "Lượt thi nhiều",
        fastest: "Làm nhanh nhất",
        latest: "Mới nộp",
        name_asc: "Tên A→Z",
      };
      badges.push({
        id: "sort",
        label: `Xếp: ${sortMap[sortBy] || sortBy}`,
        onRemove: () => setSortBy("best_score"),
      });
    }

    return badges;
  }, [selectedGrade, selectedClass, selectedExamId, selectedScoreTier, searchKeyword, sortBy, exams]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = activeFilterBadges.length;

  // Reset tất cả bộ lọc
  const handleResetFilters = () => {
    setSelectedGrade("all");
    setSelectedClass("all");
    setSelectedExamId("all");
    setSelectedScoreTier("all");
    setSearchKeyword("");
    setSortBy("best_score");
  };

  // Lọc và tính toán bảng xếp hạng
  const leaderboardData = useMemo(() => {
    // 1. Lọc theo Khối lớp
    let filteredSubs = syncedSubmissions;
    if (selectedGrade !== "all") {
      filteredSubs = filteredSubs.filter((s) => {
        const gradeFromSubClass = extractGradeFromClass(s.studentClass);
        const examObj = exams.find((e) => e.id === s.examId);
        return gradeFromSubClass === selectedGrade || examObj?.grade === selectedGrade;
      });
    }

    // 2. Lọc theo bài kiểm tra (nếu có chọn đề cụ thể)
    if (selectedExamId !== "all") {
      const targetExam = exams.find((e) => e.id === selectedExamId || e.code === selectedExamId);
      filteredSubs = filteredSubs.filter((s) => {
        if (!targetExam) return s.examId === selectedExamId;
        return (
          s.examId === targetExam.id ||
          s.examId === targetExam.code ||
          (!!s.examTitle && !!targetExam.title && s.examTitle.trim().toLowerCase() === targetExam.title.trim().toLowerCase())
        );
      });
    }

    // 3. Lọc theo Lớp
    if (selectedClass !== "all") {
      filteredSubs = filteredSubs.filter((s) => {
        if (!s.studentClass) return false;
        if (s.studentClass === selectedClass) return true;
        if (selectedClass === "Lớp 12" && s.studentClass.startsWith("12")) return true;
        if (selectedClass === "Lớp 11" && s.studentClass.startsWith("11")) return true;
        if (selectedClass === "Lớp 10" && s.studentClass.startsWith("10")) return true;
        return false;
      });
    }

    // 4. Lọc theo từ khóa tìm kiếm (Accent-insensitive)
    if (searchKeyword.trim()) {
      filteredSubs = filteredSubs.filter((s) =>
        matchSearchQuery(
          searchKeyword,
          s.studentName,
          s.studentId,
          s.studentClass,
          s.studentEmail,
          s.examTitle
        )
      );
    }

    // 5. Nếu chọn một đề kiểm tra cụ thể: xếp hạng theo điểm số của lần nộp tốt nhất của học sinh đó ở đề này
    if (selectedExamId !== "all") {
      // Nhóm theo từng học sinh để lấy điểm cao nhất của đề đó
      const studentBestMap = new Map<string, StudentSubmission>();
      filteredSubs.forEach((sub) => {
        const key = `${sub.studentId}_${sub.examId}`;
        const existing = studentBestMap.get(key);
        if (!existing || sub.score > existing.score || (sub.score === existing.score && sub.timeSpentSeconds < existing.timeSpentSeconds)) {
          studentBestMap.set(key, sub);
        }
      });

      let list = Array.from(studentBestMap.values());

      // Lọc theo mức điểm (Score Tier)
      if (selectedScoreTier !== "all") {
        list = list.filter((item) => isScoreInTier(item.score, selectedScoreTier));
      }

      // Sắp xếp linh hoạt theo tiêu chí
      list.sort((a, b) => {
        if (sortBy === "best_score" || sortBy === "avg_score") {
          if (b.score !== a.score) return b.score - a.score;
          if (a.timeSpentSeconds !== b.timeSpentSeconds) return a.timeSpentSeconds - b.timeSpentSeconds;
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        }
        if (sortBy === "fastest") {
          return a.timeSpentSeconds - b.timeSpentSeconds;
        }
        if (sortBy === "latest") {
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        }
        if (sortBy === "name_asc") {
          return a.studentName.localeCompare(b.studentName, "vi");
        }
        return b.score - a.score;
      });

      return list.map((item, idx) => ({
        rank: idx + 1,
        studentId: item.studentId,
        studentName: item.studentName,
        studentClass: item.studentClass || "",
        studentAvatar:
          item.studentAvatar ||
          users.find((u) => u.id === item.studentId || u.name === item.studentName)?.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.studentName)}`,
        examId: item.examId,
        examTitle: item.examTitle,
        score: item.score,
        maxScore: item.maxScore || 10,
        timeSpentSeconds: item.timeSpentSeconds,
        submittedAt: item.submittedAt,
        partScores: item.partScores,
        submission: item,
        attemptsCount: submissions.filter((s) => s.studentId === item.studentId && s.examId === item.examId).length,
      }));
    }

    // 6. Nếu chọn "Tất cả đề thi": Xếp hạng tổng hợp học sinh theo Điểm Trung Bình hoặc Tổng điểm tích lũy
    const studentAggMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentClass: string;
        studentAvatar?: string;
        scores: number[];
        totalTime: number;
        subs: StudentSubmission[];
        latestSubmit: string;
      }
    >();

    filteredSubs.forEach((sub) => {
      const key = sub.studentId || sub.studentName;
      const cur = studentAggMap.get(key);
      if (!cur) {
        studentAggMap.set(key, {
          studentId: sub.studentId,
          studentName: sub.studentName,
          studentClass: sub.studentClass || "",
          studentAvatar: sub.studentAvatar,
          scores: [sub.score],
          totalTime: sub.timeSpentSeconds || 0,
          subs: [sub],
          latestSubmit: sub.submittedAt,
        });
      } else {
        cur.scores.push(sub.score);
        cur.totalTime += sub.timeSpentSeconds || 0;
        cur.subs.push(sub);
        if (new Date(sub.submittedAt).getTime() > new Date(cur.latestSubmit).getTime()) {
          cur.latestSubmit = sub.submittedAt;
        }
      }
    });

    let aggList = Array.from(studentAggMap.values()).map((st) => {
      const avgScore = Number((st.scores.reduce((a, b) => a + b, 0) / st.scores.length).toFixed(2));
      const maxScore = Math.max(...st.scores);
      const userObj = users.find(
        (u) =>
          u.id === st.studentId ||
          u.name.trim().toLowerCase() === st.studentName.trim().toLowerCase() ||
          (st.subs[0]?.studentEmail && u.email.toLowerCase() === st.subs[0].studentEmail.toLowerCase())
      );

      return {
        studentId: st.studentId,
        studentName: userObj?.name || st.studentName,
        studentClass: userObj?.schoolClass || st.studentClass,
        studentAvatar:
          userObj?.avatar ||
          st.studentAvatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(st.studentName)}`,
        avgScore,
        maxScore,
        attemptsCount: st.scores.length,
        totalTime: st.totalTime,
        latestSubmit: st.latestSubmit,
        lastSubmission: st.subs[0],
      };
    });

    // Lọc theo mức điểm
    if (selectedScoreTier !== "all") {
      aggList = aggList.filter((item) => isScoreInTier(item.avgScore, selectedScoreTier));
    }

    // Sắp xếp linh hoạt
    aggList.sort((a, b) => {
      if (sortBy === "best_score") {
        if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
        return b.avgScore - a.avgScore;
      }
      if (sortBy === "avg_score") {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        return b.attemptsCount - a.attemptsCount;
      }
      if (sortBy === "attempts") {
        if (b.attemptsCount !== a.attemptsCount) return b.attemptsCount - a.attemptsCount;
        return b.avgScore - a.avgScore;
      }
      if (sortBy === "fastest") {
        return a.totalTime - b.totalTime;
      }
      if (sortBy === "latest") {
        return new Date(b.latestSubmit).getTime() - new Date(a.latestSubmit).getTime();
      }
      if (sortBy === "name_asc") {
        return a.studentName.localeCompare(b.studentName, "vi");
      }
      return b.avgScore - a.avgScore;
    });

    return aggList.map((item, idx) => ({
      rank: idx + 1,
      studentId: item.studentId,
      studentName: item.studentName,
      studentClass: item.studentClass,
      studentAvatar: item.studentAvatar,
      score: sortBy === "best_score" ? item.maxScore : item.avgScore,
      maxScore: 10,
      bestScore: item.maxScore,
      avgScore: item.avgScore,
      attemptsCount: item.attemptsCount,
      timeSpentSeconds: item.totalTime,
      submittedAt: item.latestSubmit,
      submission: item.lastSubmission,
    }));
  }, [submissions, selectedGrade, selectedClass, selectedExamId, selectedScoreTier, sortBy, searchKeyword, users, exams]);

  // Thống kê nhanh của bảng xếp hạng
  const classStats = useMemo(() => {
    if (leaderboardData.length === 0) {
      return { totalStudents: 0, avgScore: 0, topScore: 0, passRate: 0 };
    }
    const scores = leaderboardData.map((d) => d.score);
    const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
    const top = Math.max(...scores);
    const passCount = scores.filter((s) => s >= 5.0).length;
    const passRate = Number(((passCount / scores.length) * 100).toFixed(1));

    return {
      totalStudents: leaderboardData.length,
      avgScore: avg,
      topScore: top,
      passRate,
    };
  }, [leaderboardData]);

  // Xuất file bảng xếp hạng
  const handleExportCSV = () => {
    const isSpecificExam = selectedExamId !== "all";
    let csv = "\uFEFFXếp hạng,SBD,Họ và tên,Lớp,Điểm số,Số lượt thi,Thời gian làm (phút),Ngày nộp mới nhất\n";
    leaderboardData.forEach((row) => {
      const minutes = Math.round(row.timeSpentSeconds / 60);
      csv += `"${row.rank}","${row.studentId}","${row.studentName}","${row.studentClass}",${row.score},${row.attemptsCount},${minutes},"${new Date(row.submittedAt).toLocaleString("vi-VN")}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const classTag = selectedClass !== "all" ? `_Lop_${selectedClass}` : "_Tat_ca_lop";
    link.setAttribute("download", `bang_xep_hang_${classTag}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Bento */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shadow-inner">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-xl flex items-center gap-2">
                <span>Bảng Xếp Hạng Điểm Số Học Sinh Theo Lớp</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                  Top Điểm Cao
                </span>
              </h3>
              <p className="text-xs text-amber-100/90 flex items-center gap-2 flex-wrap mt-0.5">
                <span>Vinh danh thành tích học tập môn Toán học</span>
                <span>•</span>
                <span>Tự động cập nhật theo thời gian thực</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
              title="Xuất bảng xếp hạng ra Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= FLOATING ACTION & ACTIVE FILTERS BAR ================= */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
          {/* Top Row: Filter Trigger Button, Search & Quick Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Nút mở Bảng điều khiển Lọc (Filter Sidebar Drawer Toggle) */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs ${
                  activeFiltersCount > 0
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                    : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                }`}
                title="Mở bảng điều khiển lọc đa chiều"
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

              {/* Quick Class Chips */}
              <div className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedClass("all")}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedClass === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Tất cả lớp
                </button>
                {availableClasses.slice(0, 5).map((c) => {
                  const isSel = selectedClass === c;
                  const cnt = submissions.filter((s) => s.studentClass === c).length;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedClass(c)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                        isSel
                          ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                          : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
                      }`}
                    >
                      <span>Lớp {c}</span>
                      {cnt > 0 && (
                        <span className={`text-[10px] px-1 rounded-full ${isSel ? "bg-black/20" : "bg-slate-100 text-slate-600"}`}>
                          {cnt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Search + Sort selector */}
            <div className="flex items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm tên, SBD, lớp..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium shadow-2xs"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sắp xếp nhanh */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-2xs shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer"
                >
                  <option value="best_score">Thủ khoa (Điểm cao)</option>
                  <option value="avg_score">Điểm TB cao</option>
                  <option value="attempts">Lượt thi nhiều</option>
                  <option value="fastest">Làm nhanh nhất</option>
                  <option value="latest">Mới nộp</option>
                  <option value="name_asc">Tên (A → Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Row: Active Filter Badges Strip (Hiển thị các bộ lọc đang kích hoạt) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3 text-indigo-600" />
                Bộ lọc đang áp dụng:
              </span>

              {activeFilterBadges.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  Đang hiển thị toàn bộ ({submissions.length} bài nộp)
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
                  onClick={handleResetFilters}
                  className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition flex items-center gap-1"
                  title="Xóa tất cả các bộ lọc đang kích hoạt"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa tất cả ({activeFiltersCount})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-600 shrink-0">
              Kết quả: <strong className="text-indigo-600 font-black">{leaderboardData.length}</strong> học sinh
            </div>
          </div>
        </div>

        {/* ================= SIDEBAR FILTER DRAWER (SLIDE-OVER PANEL) ================= */}
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
            {/* Backdrop click to close */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsFilterDrawerOpen(false)}
            />

            {/* Sidebar Content Panel */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight overflow-hidden">
              {/* Drawer Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white flex items-center gap-2">
                      <span>Bảng Điều Khiển Lọc</span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      {activeFiltersCount > 0
                        ? `${activeFiltersCount} tiêu chí đang được áp dụng`
                        : "Tùy chỉnh phân loại bảng xếp hạng"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body - Scrollable */}
              <div className="p-5 overflow-y-auto flex-1 space-y-6">
                {/* 1. Khối & Lớp học */}
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>1. Khối & Lớp học</span>
                  </label>

                  {/* Khối */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "all", label: "Tất cả khối" },
                      { id: "Lớp 12", label: "Khối 12" },
                      { id: "Lớp 11", label: "Khối 11" },
                      { id: "Lớp 10", label: "Khối 10" },
                    ].map((gr) => {
                      const isSel = selectedGrade === gr.id;
                      return (
                        <button
                          key={gr.id}
                          type="button"
                          onClick={() => {
                            setSelectedGrade(gr.id);
                            setSelectedClass("all");
                            setSelectedExamId("all");
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                            isSel
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>{gr.label}</span>
                          {isSel && <span className="text-amber-300 font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lớp học */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-500 mb-1.5 block">Chọn lớp cụ thể:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedClass("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          selectedClass === "all"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        Tất cả các lớp ({submissions.length})
                      </button>
                      {availableClasses.map((cls) => {
                        const count = submissions.filter((s) => s.studentClass === cls).length;
                        const isSel = selectedClass === cls;
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setSelectedClass(cls)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                              isSel
                                ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                                : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
                            }`}
                          >
                            <span>Lớp {cls}</span>
                            {count > 0 && (
                              <span className={`text-[10px] px-1.5 rounded-full ${isSel ? "bg-black/20" : "bg-slate-100 text-slate-600"}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Đề kiểm tra */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>2. Đề kiểm tra</span>
                  </label>

                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                  >
                    <option value="all">🏆 Tất cả đề thi (Tổng hợp thành tích)</option>
                    <optgroup label={selectedGrade === "all" ? "Danh sách đề kiểm tra" : `Đề thi ${selectedGrade}`}>
                      {filteredExamsByGrade.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.grade || "Lớp 12"} • {exam.title} ({exam.code})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* 3. Phân loại mức điểm số */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>3. Phân loại mức điểm số</span>
                  </label>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedScoreTier("all")}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                        selectedScoreTier === "all"
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>🎯 Tất cả mức điểm (0 - 10đ)</span>
                      {selectedScoreTier === "all" && <span className="text-amber-300">✓</span>}
                    </button>

                    {SCORE_TIERS.map((tier) => {
                      const isSel = selectedScoreTier === tier.key;
                      return (
                        <button
                          key={tier.key}
                          type="button"
                          onClick={() => setSelectedScoreTier(tier.key)}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                            isSel
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{tier.label}</span>
                          </div>
                          {isSel && <span className="text-amber-300 font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Tiêu chí xếp hạng */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-amber-600" />
                    <span>4. Tiêu chí xếp hạng & Sắp xếp</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "best_score", label: "Thủ khoa (Điểm cao)" },
                      { key: "avg_score", label: "Điểm TB cao" },
                      { key: "attempts", label: "Số lượt thi nhiều" },
                      { key: "fastest", label: "Làm nhanh nhất" },
                      { key: "latest", label: "Nộp mới nhất" },
                      { key: "name_asc", label: "Họ tên (A → Z)" },
                    ].map((item) => {
                      const isSel = sortBy === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSortBy(item.key as any)}
                          className={`p-2 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                            isSel
                              ? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>{item.label}</span>
                          {isSel && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Áp dụng ({leaderboardData.length} học sinh)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Học sinh xếp hạng</div>
              <div className="text-base font-black text-slate-900">{classStats.totalStudents} em</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm trung bình</div>
              <div className="text-base font-black text-emerald-600">{classStats.avgScore}đ</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm cao nhất (Thủ khoa)</div>
              <div className="text-base font-black text-indigo-600">{classStats.topScore}đ</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ Đạt (≥5.0)</div>
              <div className="text-base font-black text-sky-600">{classStats.passRate}%</div>
            </div>
          </div>
        </div>

        {/* Podium Top 3 (Vinh danh Top 3 học sinh xuất sắc) */}
        {leaderboardData.length >= 3 && !searchKeyword && (
          <div className="bg-gradient-to-b from-amber-50/50 to-white px-6 py-4 border-b border-slate-200">
            <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wider text-center mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Vinh danh Top 3 học sinh xuất sắc nhất</span>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto items-end">
              {/* Rank 2 (Hạng Nhì - Bạc) */}
              <div
                onClick={() => {
                  if (onViewStudentHistory) {
                    onViewStudentHistory(leaderboardData[1].studentId, leaderboardData[1].studentName);
                  }
                }}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-1.5 order-1 hover:border-slate-400 cursor-pointer hover:shadow-sm transition group"
                title="Bấm để xem lịch sử làm bài thi"
              >
                <div className="relative">
                  <img
                    src={leaderboardData[1].studentAvatar}
                    alt={leaderboardData[1].studentName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-300 bg-white group-hover:scale-105 transition"
                  />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center shadow-xs">
                    2
                  </span>
                </div>
                <div className="font-extrabold text-xs text-slate-800 truncate max-w-full group-hover:text-indigo-600">
                  {leaderboardData[1].studentName}
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                  Lớp {leaderboardData[1].studentClass}
                </span>
                <div className="text-sm font-black text-slate-700">
                  {leaderboardData[1].score} điểm
                </div>
              </div>

              {/* Rank 1 (Hạng Nhất - Vàng - Thủ khoa) */}
              <div
                onClick={() => {
                  if (onViewStudentHistory) {
                    onViewStudentHistory(leaderboardData[0].studentId, leaderboardData[0].studentName);
                  }
                }}
                className="bg-gradient-to-b from-amber-50 to-white rounded-2xl p-4 border-2 border-amber-400 shadow-md flex flex-col items-center text-center space-y-1.5 order-2 -translate-y-2 hover:shadow-lg cursor-pointer transition group"
                title="Bấm để xem lịch sử làm bài thi"
              >
                <div className="relative">
                  <Crown className="w-5 h-5 text-amber-500 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                  <img
                    src={leaderboardData[0].studentAvatar}
                    alt={leaderboardData[0].studentName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 bg-white shadow-sm group-hover:scale-105 transition"
                  />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                    1
                  </span>
                </div>
                <div className="font-black text-xs sm:text-sm text-amber-950 truncate max-w-full group-hover:text-amber-600">
                  {leaderboardData[0].studentName}
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300">
                  Lớp {leaderboardData[0].studentClass}
                </span>
                <div className="text-base font-black text-amber-600">
                  {leaderboardData[0].score} điểm 🏆
                </div>
              </div>

              {/* Rank 3 (Hạng Ba - Đồng) */}
              <div
                onClick={() => {
                  if (onViewStudentHistory) {
                    onViewStudentHistory(leaderboardData[2].studentId, leaderboardData[2].studentName);
                  }
                }}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-1.5 order-3 hover:border-amber-700 cursor-pointer hover:shadow-sm transition group"
                title="Bấm để xem lịch sử làm bài thi"
              >
                <div className="relative">
                  <img
                    src={leaderboardData[2].studentAvatar}
                    alt={leaderboardData[2].studentName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-700/50 bg-white group-hover:scale-105 transition"
                  />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    3
                  </span>
                </div>
                <div className="font-extrabold text-xs text-slate-800 truncate max-w-full group-hover:text-amber-800">
                  {leaderboardData[2].studentName}
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                  Lớp {leaderboardData[2].studentClass}
                </span>
                <div className="text-sm font-black text-amber-800">
                  {leaderboardData[2].score} điểm
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Leaderboard Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {leaderboardData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Trophy className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Chưa có dữ liệu bài nộp cho bộ lọc này.</p>
              <p className="text-[11px] text-slate-400">
                Hãy chuyển bộ lọc sang "Tất cả các lớp" hoặc chọn một đề thi khác.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase bg-slate-50/80">
                    <th className="p-3 text-center w-14">Hạng</th>
                    <th className="p-3">Học sinh</th>
                    <th className="p-3 text-center">Lớp</th>
                    <th className="p-3 text-center">
                      {selectedExamId !== "all" ? "Điểm số" : "Điểm Trung Bình"}
                    </th>
                    <th className="p-3 text-center">Số lượt làm</th>
                    <th className="p-3 text-center">Thời gian</th>
                    <th className="p-3 text-center">Lần nộp mới nhất</th>
                    <th className="p-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {leaderboardData.map((row) => {
                    const isTop1 = row.rank === 1;
                    const isTop2 = row.rank === 2;
                    const isTop3 = row.rank === 3;

                    return (
                      <tr
                        key={`${row.studentId}_${row.rank}`}
                        className={`hover:bg-slate-50 transition ${
                          isTop1 ? "bg-amber-50/40" : isTop2 ? "bg-slate-50/30" : ""
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="p-3 text-center font-black">
                          {isTop1 ? (
                            <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 inline-flex items-center justify-center shadow-xs font-black">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="w-7 h-7 rounded-xl bg-slate-300 text-slate-800 inline-flex items-center justify-center shadow-xs font-black">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="w-7 h-7 rounded-xl bg-amber-700 text-white inline-flex items-center justify-center shadow-xs font-black">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">#{row.rank}</span>
                          )}
                        </td>

                        {/* Student Info */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={row.studentAvatar}
                              alt={row.studentName}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                            />
                            <div>
                              <div
                                onClick={() => {
                                  if (onViewStudentHistory) {
                                    onViewStudentHistory(row.studentId, row.studentName);
                                  }
                                }}
                                className="font-extrabold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5 transition"
                                title="Bấm để xem tất cả các lần làm bài của học sinh này"
                              >
                                <span>{row.studentName}</span>
                                <Eye className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100" />
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                SBD: {row.studentId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Class */}
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-200">
                            {row.studentClass}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="p-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-xl font-black text-xs sm:text-sm inline-flex items-center gap-1 ${
                              row.score >= 8
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : row.score >= 5
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <span>{row.score}đ</span>
                            {row.score === 10 && <span>🔥</span>}
                          </span>
                        </td>

                        {/* Attempts */}
                        <td className="p-3 text-center font-bold text-slate-600">
                          {row.attemptsCount} lần
                        </td>

                        {/* Time */}
                        <td className="p-3 text-center text-slate-500 font-medium">
                          {Math.round(row.timeSpentSeconds / 60)} phút
                        </td>

                        {/* Date */}
                        <td className="p-3 text-center text-slate-500 text-[11px]">
                          {(() => {
                            try {
                              return new Date(row.submittedAt).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              });
                            } catch {
                              return row.submittedAt || "Gần đây";
                            }
                          })()}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (onViewStudentHistory) {
                                onViewStudentHistory(row.studentId, row.studentName);
                              } else if (row.submission) {
                                setSelectedSubmissionReview(row.submission);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold transition flex items-center gap-1 mx-auto text-[11px]"
                            title="Xem lịch sử tất cả bài làm của học sinh này"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lịch sử thi</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>Bấm vào tên học sinh hoặc nút "Lịch sử thi" để xem kết quả chi tiết từng lần làm bài.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Review Modal if clicked */}
      {selectedSubmissionReview && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-60 flex items-center justify-center p-4"
          onClick={() => setSelectedSubmissionReview(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-white">
                  Bài làm: {selectedSubmissionReview.examTitle}
                </h4>
                <p className="text-xs text-slate-400">
                  Học sinh: <strong>{selectedSubmissionReview.studentName}</strong> • Điểm:{" "}
                  <strong className="text-emerald-400 font-bold">{selectedSubmissionReview.score}đ</strong>
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

            <div className="p-6 overflow-y-auto space-y-3 text-xs flex-1">
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần I</div>
                  <div className="font-black text-sm text-slate-800">
                    {selectedSubmissionReview.partScores?.part_1?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần II</div>
                  <div className="font-black text-sm text-slate-800">
                    {selectedSubmissionReview.partScores?.part_2?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần III</div>
                  <div className="font-black text-sm text-slate-800">
                    {selectedSubmissionReview.partScores?.part_3?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần IV</div>
                  <div className="font-black text-sm text-slate-800">
                    {selectedSubmissionReview.partScores?.part_4?.earned || 0}đ
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSubmissionReview(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
