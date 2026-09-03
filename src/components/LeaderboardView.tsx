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
  Layers,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Building2,
  Download,
} from "lucide-react";

export type LeaderboardMode = "all_classes" | "by_grade";

interface LeaderboardViewProps {
  exams: Exam[];
  submissions: StudentSubmission[];
  users?: User[];
  defaultClassFilter?: string;
  defaultExamId?: string;
  onViewStudentHistory?: (studentId: string, studentName: string) => void;
  onBack?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  exams,
  submissions,
  users = [],
  defaultClassFilter = "all",
  defaultExamId = "all",
  onViewStudentHistory,
  onBack,
}) => {
  // Chế độ hiển thị: "all_classes" (Toàn bộ các lớp) hoặc "by_grade" (Theo từng khối)
  const [rankingMode, setRankingMode] = useState<LeaderboardMode>("all_classes");

  // Tab khối khi ở chế độ "by_grade": "Lớp 12" | "Lớp 11" | "Lớp 10" | "compare_all"
  const [activeGradeTab, setActiveGradeTab] = useState<string>("Lớp 12");

  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassFilter);
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId);
  const [selectedScoreTier, setSelectedScoreTier] = useState<ScoreTierKey>("all");
  const [sortBy, setSortBy] = useState<
    "best_score" | "avg_score" | "attempts" | "fastest" | "latest" | "name_asc"
  >("best_score");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedSubmissionReview, setSelectedSubmissionReview] = useState<StudentSubmission | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Đồng bộ khi default props thay đổi
  useEffect(() => {
    if (defaultExamId !== undefined) setSelectedExamId(defaultExamId);
    if (defaultClassFilter !== undefined && defaultClassFilter !== "all") {
      setSelectedClass(defaultClassFilter);
    }
  }, [defaultExamId, defaultClassFilter]);

  // Cập nhật selectedGrade khi chuyển activeGradeTab ở chế độ by_grade
  useEffect(() => {
    if (rankingMode === "by_grade") {
      if (activeGradeTab !== "compare_all") {
        setSelectedGrade(activeGradeTab);
        setSelectedClass("all");
      } else {
        setSelectedGrade("all");
        setSelectedClass("all");
      }
    } else {
      setSelectedGrade("all");
    }
  }, [rankingMode, activeGradeTab]);

  // Đồng bộ hóa toàn bộ danh sách bài nộp với danh sách người dùng thực tế (users)
  // và bảo toàn 100% bài làm của tất cả học sinh
  const syncedSubmissions = useMemo(() => {
    const deletedUserIds = getDeletedUserIds();

    return submissions
      .filter((s) => {
        if (!s || !s.id) return false;
        if (s.studentId && deletedUserIds.has(s.studentId)) return false;
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
    const targetGrade = rankingMode === "by_grade" && activeGradeTab !== "compare_all" ? activeGradeTab : selectedGrade;
    if (targetGrade === "all") return all;
    return all.filter(
      (c) =>
        extractGradeFromClass(c) === targetGrade ||
        c.startsWith(targetGrade.replace("Lớp ", ""))
    );
  }, [syncedSubmissions, users, selectedGrade, rankingMode, activeGradeTab]);

  // Danh sách đề thi được lọc theo Khối
  const filteredExamsByGrade = useMemo(() => {
    const targetGrade = rankingMode === "by_grade" && activeGradeTab !== "compare_all" ? activeGradeTab : selectedGrade;
    if (targetGrade === "all") return exams;
    return exams.filter(
      (e) =>
        e.grade === targetGrade ||
        (e.targetClass && extractGradeFromClass(e.targetClass) === targetGrade)
    );
  }, [exams, selectedGrade, rankingMode, activeGradeTab]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (rankingMode === "all_classes" && selectedGrade !== "all") count++;
    if (selectedClass !== "all") count++;
    if (selectedExamId !== "all") count++;
    if (selectedScoreTier !== "all") count++;
    if (searchKeyword.trim() !== "") count++;
    if (sortBy !== "best_score") count++;
    return count;
  }, [rankingMode, selectedGrade, selectedClass, selectedExamId, selectedScoreTier, searchKeyword, sortBy]);

  // Danh sách các bộ lọc đang kích hoạt kèm nhãn và hàm xóa
  const activeFilterBadges = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];

    if (rankingMode === "all_classes" && selectedGrade !== "all") {
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
      const ex = exams.find((e) => e.id === selectedExamId || e.code === selectedExamId);
      badges.push({
        id: "exam",
        label: `Đề: ${ex?.code ? `[${ex.code}] ` : ""}${
          ex?.title ? (ex.title.length > 20 ? ex.title.slice(0, 20) + "..." : ex.title) : selectedExamId
        }`,
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
  }, [rankingMode, selectedGrade, selectedClass, selectedExamId, selectedScoreTier, searchKeyword, sortBy, exams]);

  const handleResetFilters = () => {
    if (rankingMode === "all_classes") setSelectedGrade("all");
    setSelectedClass("all");
    setSelectedExamId("all");
    setSelectedScoreTier("all");
    setSortBy("best_score");
    setSearchKeyword("");
  };

  // Helper tính toán dữ liệu xếp hạng cho một tập bài nộp bất kỳ
  const computeLeaderboardRows = (subsList: StudentSubmission[], targetGradeConstraint: string = "all") => {
    // 1. Lọc theo Đề thi
    let list = subsList;
    if (selectedExamId !== "all") {
      const targetExam = exams.find((e) => e.id === selectedExamId || e.code === selectedExamId);
      list = list.filter((s) => {
        if (!s) return false;
        if (s.examId === selectedExamId) return true;
        if (targetExam) {
          if (s.examId === targetExam.id || s.examId === targetExam.code) return true;
          if (s.examTitle && targetExam.title && s.examTitle.trim().toLowerCase() === targetExam.title.trim().toLowerCase()) return true;
        }
        return false;
      });
    }

    // 2. Lọc theo Khối
    if (targetGradeConstraint !== "all") {
      list = list.filter((s) => {
        const cls = s.studentClass || "";
        const gr = extractGradeFromClass(cls);
        return gr === targetGradeConstraint || cls.startsWith(targetGradeConstraint.replace("Lớp ", ""));
      });
    }

    // 3. Lọc theo Lớp
    if (selectedClass !== "all") {
      list = list.filter((s) => {
        if (!s.studentClass) return false;
        if (s.studentClass === selectedClass) return true;
        const clsMatch = selectedClass.match(/\d+/);
        const sMatch = s.studentClass.match(/\d+/);
        if (clsMatch && sMatch && clsMatch[0] === sMatch[0] && selectedClass.startsWith("Lớp")) return true;
        return false;
      });
    }

    // 4. Nhóm theo từng Học sinh
    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentClass: string;
        studentAvatar: string;
        scores: number[];
        maxScores: number[];
        percentages: number[];
        timeSpents: number[];
        latestSubmission: StudentSubmission;
        bestSubmission: StudentSubmission;
        attemptsCount: number;
      }
    >();

    list.forEach((sub) => {
      const sId = (sub.studentId || sub.studentName || "unknown").trim();
      const userProfile = users.find(
        (u) =>
          u.id === sId ||
          (u.email && sub.studentEmail && u.email.toLowerCase() === sub.studentEmail.toLowerCase()) ||
          u.name.trim().toLowerCase() === (sub.studentName || "").trim().toLowerCase()
      );
      const sName = userProfile?.name || sub.studentName || "Học sinh";
      const sClass = userProfile?.schoolClass || sub.studentClass || "";
      const sAvatar = userProfile?.avatar || sub.studentAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sId)}`;
      const subMaxScore = sub.maxScore && sub.maxScore > 0 ? sub.maxScore : 10;
      const subPercentage = Number(Math.min(100, Math.max(0, (sub.score / subMaxScore) * 100)).toFixed(1));

      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          studentName: sName,
          studentClass: sClass,
          studentAvatar: sAvatar,
          scores: [sub.score],
          maxScores: [subMaxScore],
          percentages: [subPercentage],
          timeSpents: [sub.timeSpentSeconds || 0],
          latestSubmission: sub,
          bestSubmission: sub,
          attemptsCount: 1,
        });
      } else {
        const entry = studentMap.get(sId)!;
        entry.scores.push(sub.score);
        entry.maxScores.push(subMaxScore);
        entry.percentages.push(subPercentage);
        entry.timeSpents.push(sub.timeSpentSeconds || 0);
        entry.attemptsCount += 1;

        // Cập nhật bài mới nhất
        if (new Date(sub.submittedAt).getTime() > new Date(entry.latestSubmission.submittedAt).getTime()) {
          entry.latestSubmission = sub;
          entry.studentClass = sClass;
        }

        // Cập nhật bài có tỷ lệ % đạt cao nhất
        const currentBestPct = Number(
          Math.min(
            100,
            Math.max(0, (entry.bestSubmission.score / (entry.bestSubmission.maxScore || 10)) * 100)
          ).toFixed(1)
        );
        if (
          subPercentage > currentBestPct ||
          (subPercentage === currentBestPct &&
            (sub.timeSpentSeconds || 0) < (entry.bestSubmission.timeSpentSeconds || 0))
        ) {
          entry.bestSubmission = sub;
        }
      }
    });

    // 5. Tính toán chỉ số của từng học sinh với quy chuẩn tỷ lệ %
    let rows = Array.from(studentMap.values()).map((entry) => {
      const bestPercentage = Math.max(...entry.percentages);
      const avgPercentage = Number(
        (entry.percentages.reduce((a, b) => a + b, 0) / entry.percentages.length).toFixed(1)
      );
      const avgScore = Number((entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length).toFixed(2));
      const minTime = Math.min(...entry.timeSpents);

      // Khi chọn 1 đề cụ thể: lấy bài nộp của đề đó. Khi chọn Tất cả đề: lấy bài có kết quả tốt nhất.
      const representativeSub = selectedExamId !== "all" ? entry.latestSubmission : entry.bestSubmission;
      const mainScore = representativeSub.score;
      const mainMaxScore = representativeSub.maxScore || 10;
      const mainPercentage = Number(
        Math.min(100, Math.max(0, (mainScore / mainMaxScore) * 100)).toFixed(1)
      );

      const bestSubScore = entry.bestSubmission.score;
      const bestSubMaxScore = entry.bestSubmission.maxScore || 10;

      return {
        studentId: entry.studentId,
        studentName: entry.studentName,
        studentClass: entry.studentClass,
        studentAvatar: entry.studentAvatar,
        score: mainScore,
        maxScore: mainMaxScore,
        percentage: mainPercentage,
        bestScore: bestSubScore,
        bestMaxScore: bestSubMaxScore,
        bestPercentage,
        avgScore,
        avgPercentage,
        attemptsCount: entry.attemptsCount,
        timeSpentSeconds: minTime,
        submittedAt: entry.latestSubmission.submittedAt,
        submission: representativeSub,
      };
    });

    // 6. Lọc theo Mức điểm (Score Tier) - Quy chuẩn theo tỷ lệ % trên thang điểm tối đa
    if (selectedScoreTier !== "all") {
      rows = rows.filter((r) => isScoreInTier(r.score, selectedScoreTier, r.maxScore));
    }

    // 7. Lọc theo Từ khóa tìm kiếm
    if (searchKeyword.trim() !== "") {
      rows = rows.filter((r) => {
        return (
          matchSearchQuery(r.studentName, searchKeyword) ||
          matchSearchQuery(r.studentId, searchKeyword) ||
          matchSearchQuery(r.studentClass, searchKeyword)
        );
      });
    }

    // 8. Sắp xếp thứ hạng (ưu tiên quy đổi về phần trăm điểm đạt được để xếp hạng công bằng giữa các đề có thang điểm khác nhau)
    rows.sort((a, b) => {
      if (sortBy === "best_score") {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        if (a.timeSpentSeconds !== b.timeSpentSeconds) return a.timeSpentSeconds - b.timeSpentSeconds;
        if (b.attemptsCount !== a.attemptsCount) return b.attemptsCount - a.attemptsCount;
        return b.score - a.score;
      }
      if (sortBy === "avg_score") {
        if (b.avgPercentage !== a.avgPercentage) return b.avgPercentage - a.avgPercentage;
        return b.avgScore - a.avgScore;
      }
      if (sortBy === "attempts") return b.attemptsCount - a.attemptsCount;
      if (sortBy === "fastest") return a.timeSpentSeconds - b.timeSpentSeconds;
      if (sortBy === "latest") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      if (sortBy === "name_asc") return a.studentName.localeCompare(b.studentName, "vi");
      return 0;
    });

    // 9. Gán thứ hạng Rank
    return rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
  };

  // Dữ liệu bảng xếp hạng chính hiện tại
  const leaderboardData = useMemo(() => {
    const targetGrade = rankingMode === "by_grade" && activeGradeTab !== "compare_all" ? activeGradeTab : selectedGrade;
    return computeLeaderboardRows(syncedSubmissions, targetGrade);
  }, [syncedSubmissions, exams, selectedExamId, selectedGrade, selectedClass, selectedScoreTier, searchKeyword, sortBy, users, rankingMode, activeGradeTab]);

  // Thống kê bento cho bảng xếp hạng hiện tại
  const currentStats = useMemo(() => {
    if (leaderboardData.length === 0) {
      return {
        totalStudents: 0,
        avgScore: 0,
        avgPercentage: 0,
        topScore: 0,
        topPercentage: 0,
        passRate: 0,
      };
    }
    const scores = leaderboardData.map((d) => d.score);
    const percentages = leaderboardData.map((d) => d.percentage);
    const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
    const avgPct = Number((percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1));
    const top = Math.max(...scores);
    const topPct = Math.max(...percentages);
    const passCount = leaderboardData.filter((d) => d.percentage >= 50).length;
    const passRate = Number(((passCount / leaderboardData.length) * 100).toFixed(1));

    return {
      totalStudents: leaderboardData.length,
      avgScore: avg,
      avgPercentage: avgPct,
      topScore: top,
      topPercentage: topPct,
      passRate,
    };
  }, [leaderboardData]);

  // Thống kê so sánh các khối (dành cho chế độ Xếp hạng theo khối)
  const gradeComparisons = useMemo(() => {
    const grades = STANDARD_GRADES;
    return grades.map((g) => {
      const gRows = computeLeaderboardRows(syncedSubmissions, g);
      const total = gRows.length;
      if (total === 0) {
        return {
          grade: g,
          gradeNum: g.replace("Lớp ", ""),
          totalStudents: 0,
          avgScore: 0,
          avgPercentage: 0,
          topScore: 0,
          topPercentage: 0,
          topStudentName: "Chưa có",
          passRate: 0,
          topClass: "---",
          rows: [],
        };
      }
      const scores = gRows.map((r) => r.score);
      const percentages = gRows.map((r) => r.percentage);
      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      const avgPct = Number((percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1));
      const topScore = Math.max(...scores);
      const topPct = Math.max(...percentages);
      const topStudent = gRows[0];
      const passCount = gRows.filter((s) => s.percentage >= 50).length;
      const passRate = Number(((passCount / total) * 100).toFixed(1));

      // Lớp có thành tích tốt nhất trong khối (tính theo tỷ lệ % điểm trung bình)
      const classScores: Record<string, { pctSum: number; count: number }> = {};
      gRows.forEach((r) => {
        if (!classScores[r.studentClass]) classScores[r.studentClass] = { pctSum: 0, count: 0 };
        classScores[r.studentClass].pctSum += r.percentage;
        classScores[r.studentClass].count += 1;
      });
      let bestClass = "---";
      let maxClassAvgPct = -1;
      Object.entries(classScores).forEach(([cls, val]) => {
        const classAvgPct = val.pctSum / val.count;
        if (classAvgPct > maxClassAvgPct) {
          maxClassAvgPct = classAvgPct;
          bestClass = `Lớp ${cls} (${classAvgPct.toFixed(1)}%)`;
        }
      });

      return {
        grade: g,
        gradeNum: g.replace("Lớp ", ""),
        totalStudents: total,
        avgScore: avg,
        avgPercentage: avgPct,
        topScore,
        topPercentage: topPct,
        topStudentName: topStudent?.studentName || "Chưa có",
        topStudentAvatar: topStudent?.studentAvatar,
        passRate,
        topClass: bestClass,
        rows: gRows,
      };
    });
  }, [submissions, exams, selectedExamId, users]);

  // Xuất file CSV có đầy đủ thang điểm và tỷ lệ %
  const handleExportCSV = () => {
    let csv = "\uFEFFXếp hạng,SBD,Họ và tên,Lớp,Điểm đạt được,Thang điểm,Tỷ lệ %,Quy chuẩn thang 10,Điểm TB,Tỷ lệ TB %,Số lượt thi,Thời gian làm (phút),Ngày nộp mới nhất\n";
    leaderboardData.forEach((row) => {
      const minutes = Math.round(row.timeSpentSeconds / 60);
      const stdScore = Number(((row.score / row.maxScore) * 10).toFixed(2));
      csv += `"${row.rank}","${row.studentId}","${row.studentName}","${row.studentClass}",${row.score},${row.maxScore},"${row.percentage}%",${stdScore},${row.avgScore},"${row.avgPercentage}%",${row.attemptsCount},${minutes},"${new Date(row.submittedAt).toLocaleString("vi-VN")}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const modeTag = rankingMode === "by_grade" ? `_Khoi_${activeGradeTab}` : "_Toan_truong";
    const classTag = selectedClass !== "all" ? `_Lop_${selectedClass}` : "";
    link.setAttribute("download", `bang_xep_hang${modeTag}${classTag}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 bg-[#f8fafc] py-6 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ================= HEADER HERO BENTO ================= */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-extrabold text-xs uppercase tracking-wider border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                BẢNG XẾP HẠNG HỌC SINH
              </span>

              {rankingMode === "all_classes" ? (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-200">
                  🏆 TOÀN TRƯỜNG / TẤT CẢ CÁC LỚP
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                  🎓 THEO TỪNG KHỐI ({activeGradeTab === "compare_all" ? "So sánh 3 khối" : activeGradeTab})
                </span>
              )}

              {selectedExamId !== "all" && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                  Đề: {exams.find((e) => e.id === selectedExamId)?.code || selectedExamId}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {rankingMode === "all_classes"
                ? "Bảng Xếp Hạng Điểm Số: Toàn Bộ Các Lớp"
                : activeGradeTab === "compare_all"
                ? "Bảng So Sánh & Xếp Hạng Theo Từng Khối (10, 11, 12)"
                : `Bảng Xếp Hạng Điểm Số: ${activeGradeTab}`}
            </h1>

            <p className="text-xs text-slate-500 font-medium">
              Vinh danh thành tích học tập môn Toán học • Tự động cập nhật thứ hạng theo thời gian thực
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Xuất bảng điểm ra file Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="In danh sách bảng xếp hạng"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>In bảng điểm</span>
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Quay lại
              </button>
            )}
          </div>
        </div>

        {/* ================= 2 DẠNG BẢNG XẾP HẠNG: SEGMENTED CONTROLLER ================= */}
        <div className="bg-white rounded-2xl p-2 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main 2 Ranking Modes Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setRankingMode("all_classes");
                setSelectedGrade("all");
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                rankingMode === "all_classes"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>1. Xếp Hạng Toàn Bộ Các Lớp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRankingMode("by_grade");
                if (activeGradeTab === "compare_all") setActiveGradeTab("Lớp 12");
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                rankingMode === "by_grade"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>2. Xếp Hạng Theo Từng Khối</span>
            </button>
          </div>

          {/* Sub-selector for Mode 2: Từng khối / So sánh tất cả các khối */}
          {rankingMode === "by_grade" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                ...STANDARD_GRADES.map((gr) => ({
                  id: gr,
                  label: gr.replace("Lớp ", "Khối "),
                })),
                { id: "compare_all", label: "📊 So sánh tất cả Khối" },
              ].map((tab) => {
                const isSel = activeGradeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveGradeTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1 cursor-pointer ${
                      isSel
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= NẾU CHỌN CHẾ ĐỘ "SO SÁNH CÁC KHỐI" ================= */}
        {rankingMode === "by_grade" && activeGradeTab === "compare_all" ? (
          <div className="space-y-6">
            {/* Bento Cards Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {gradeComparisons.map((item) => (
                <div
                  key={item.grade}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                          {item.gradeNum}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900">{item.grade}</h3>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {item.totalStudents} thí sinh tham gia
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveGradeTab(item.grade)}
                        className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm trung bình</div>
                        <div className="text-lg font-black text-indigo-600">
                          {item.avgScore}đ{" "}
                          <span className="text-xs font-bold text-indigo-500">({item.avgPercentage}%)</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Thủ khoa khối</div>
                        <div className="text-lg font-black text-amber-600">
                          {item.topScore}đ{" "}
                          <span className="text-xs font-bold text-amber-500">({item.topPercentage}%)</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ đạt (≥50% điểm)</div>
                        <div className="text-base font-black text-emerald-600">{item.passRate}%</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Lớp dẫn đầu</div>
                        <div className="text-xs font-black text-slate-800 truncate" title={item.topClass}>
                          {item.topClass}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top 1 Student of Grade */}
                  {item.rows.length > 0 && (
                    <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 flex items-center gap-2.5">
                      <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-amber-800 uppercase">Thủ khoa:</div>
                        <div className="text-xs font-black text-amber-950 truncate">
                          {item.topStudentName} ({item.rows[0].studentClass}) • {item.rows[0].score}/{item.rows[0].maxScore}đ ({item.rows[0].percentage}%)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Overall Comparison Table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Bảng So Sánh Chỉ Số Toàn Diện Giữa 3 Khối</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase bg-slate-50">
                      <th className="p-3">Khối học</th>
                      <th className="p-3 text-center">Số học sinh</th>
                      <th className="p-3 text-center">Điểm TB & Tỷ lệ %</th>
                      <th className="p-3 text-center">Điểm Thủ Khoa</th>
                      <th className="p-3 text-center">Tỷ lệ Đạt (≥50% điểm)</th>
                      <th className="p-3">Lớp dẫn đầu khối</th>
                      <th className="p-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {gradeComparisons.map((g) => (
                      <tr key={g.grade} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <span className="font-black text-slate-900 text-sm">{g.grade}</span>
                        </td>
                        <td className="p-3 text-center font-bold">{g.totalStudents} em</td>
                        <td className="p-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-black">
                              {g.avgScore}đ
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold mt-0.5">
                              {g.avgPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-black">
                              {g.topScore}đ 🏆
                            </span>
                            <span className="text-[10px] text-amber-700 font-bold mt-0.5">
                              {g.topPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-600">{g.passRate}%</td>
                        <td className="p-3 font-bold text-slate-800">{g.topClass}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setActiveGradeTab(g.grade)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Xem BXH Khối {g.gradeNum}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ================= GIAO DIỆN BẢNG XẾP HẠNG CHÍNH (TOÀN TRƯỜNG HOẶC THEO 1 KHỐI CỤ THỂ) ================= */
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
            {/* Filter Bar & Active Filter Badges */}
            <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 space-y-3">
              {/* Top Row: Drawer button, Quick Class Chips, Search & Sort */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Slide-over Filter Drawer Button */}
                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer ${
                      activeFiltersCount > 0
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                        : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                    }`}
                    title="Mở bảng điều khiển lọc đa chiều"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                    <span>Bộ lọc nâng cao</span>
                    {activeFiltersCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                        {activeFiltersCount}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">(Tất cả)</span>
                    )}
                  </button>

                  {/* Quick Class Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-xl">
                    <button
                      type="button"
                      onClick={() => setSelectedClass("all")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        selectedClass === "all"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {rankingMode === "by_grade" ? `Toàn bộ ${activeGradeTab}` : "Tất cả các lớp"}
                    </button>
                    {availableClasses.slice(0, 7).map((c) => {
                      const isSel = selectedClass === c;
                      const cnt = submissions.filter((s) => s.studentClass === c).length;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedClass(c)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                            isSel
                              ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                              : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
                          }`}
                        >
                          <span>Lớp {c}</span>
                          {cnt > 0 && (
                            <span
                              className={`text-[10px] px-1 rounded-full ${
                                isSel ? "bg-black/20" : "bg-slate-100 text-slate-600"
                              }`}
                            >
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sắp xếp */}
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

              {/* Bottom Row: Active Filter Badges */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1 shrink-0">
                    <Filter className="w-3 h-3 text-indigo-600" />
                    Đang lọc:
                  </span>

                  {activeFilterBadges.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      Đang hiển thị toàn bộ ({submissions.length} bài nộp)
                    </span>
                  ) : (
                    activeFilterBadges.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold"
                      >
                        <span>{b.label}</span>
                        <button
                          type="button"
                          onClick={b.onRemove}
                          className="w-3.5 h-3.5 rounded-full hover:bg-indigo-200 flex items-center justify-center text-indigo-900 transition cursor-pointer"
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
                      className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Xóa tất cả bộ lọc"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đặt lại ({activeFiltersCount})</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-bold text-slate-600 shrink-0">
                  Tổng xếp hạng: <strong className="text-indigo-600 font-black">{leaderboardData.length}</strong> học sinh
                </div>
              </div>
            </div>

            {/* Quick Stats Bento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Học sinh xếp hạng</div>
                  <div className="text-base font-black text-slate-900">{currentStats.totalStudents} em</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm trung bình</div>
                  <div className="text-base font-black text-emerald-600">
                    {currentStats.avgScore}đ{" "}
                    <span className="text-xs font-bold text-emerald-500">({currentStats.avgPercentage}%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Thủ khoa điểm cao</div>
                  <div className="text-base font-black text-indigo-600">
                    {currentStats.topScore}đ{" "}
                    <span className="text-xs font-bold text-indigo-500">({currentStats.topPercentage}%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ Đạt (≥50% điểm)</div>
                  <div className="text-base font-black text-sky-600">{currentStats.passRate}%</div>
                </div>
              </div>
            </div>

            {/* Podium Top 3 (Vinh danh Top 3 học sinh xuất sắc) */}
            {leaderboardData.length >= 3 && !searchKeyword && (
              <div className="bg-gradient-to-b from-amber-50/40 via-white to-white px-6 py-6 border-b border-slate-200">
                <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wider text-center mb-4 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>
                    Vinh danh Top 3 học sinh xuất sắc nhất{" "}
                    {rankingMode === "by_grade" ? `(${activeGradeTab})` : "(Toàn trường)"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto items-end">
                  {/* Rank 2 (Hạng Nhì - Bạc) */}
                  <div
                    onClick={() => {
                      if (onViewStudentHistory) {
                        onViewStudentHistory(leaderboardData[1].studentId, leaderboardData[1].studentName);
                      }
                    }}
                    className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-1.5 order-1 hover:border-slate-400 cursor-pointer hover:shadow-md transition group"
                    title="Bấm để xem lịch sử làm bài thi"
                  >
                    <div className="relative">
                      <img
                        src={leaderboardData[1].studentAvatar}
                        alt={leaderboardData[1].studentName}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-300 bg-white group-hover:scale-105 transition"
                      />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center shadow-xs">
                        2
                      </span>
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-800 truncate max-w-full group-hover:text-indigo-600">
                      {leaderboardData[1].studentName}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      Lớp {leaderboardData[1].studentClass}
                    </span>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="text-xs sm:text-sm font-black text-slate-700">
                        {leaderboardData[1].score} / {leaderboardData[1].maxScore}đ
                      </div>
                      <span className="px-2 py-0.5 rounded-full font-black text-[10.5px] bg-slate-100 text-slate-700 border border-slate-200">
                        {leaderboardData[1].percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Rank 1 (Hạng Nhất - Vàng - Thủ khoa) */}
                  <div
                    onClick={() => {
                      if (onViewStudentHistory) {
                        onViewStudentHistory(leaderboardData[0].studentId, leaderboardData[0].studentName);
                      }
                    }}
                    className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-5 border-2 border-amber-400 shadow-md flex flex-col items-center text-center space-y-2 order-2 -translate-y-3 hover:shadow-xl cursor-pointer transition group"
                    title="Bấm để xem lịch sử làm bài thi"
                  >
                    <div className="relative">
                      <Crown className="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                      <img
                        src={leaderboardData[0].studentAvatar}
                        alt={leaderboardData[0].studentName}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 bg-white shadow-sm group-hover:scale-105 transition"
                      />
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                        1
                      </span>
                    </div>
                    <div className="font-black text-sm sm:text-base text-amber-950 truncate max-w-full group-hover:text-amber-600">
                      {leaderboardData[0].studentName}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-extrabold border border-amber-300">
                      Lớp {leaderboardData[0].studentClass}
                    </span>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="text-sm sm:text-base font-black text-amber-600">
                        {leaderboardData[0].score} / {leaderboardData[0].maxScore}đ 🏆
                      </div>
                      <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                        {leaderboardData[0].percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Rank 3 (Hạng Ba - Đồng) */}
                  <div
                    onClick={() => {
                      if (onViewStudentHistory) {
                        onViewStudentHistory(leaderboardData[2].studentId, leaderboardData[2].studentName);
                      }
                    }}
                    className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-1.5 order-3 hover:border-amber-700 cursor-pointer hover:shadow-md transition group"
                    title="Bấm để xem lịch sử làm bài thi"
                  >
                    <div className="relative">
                      <img
                        src={leaderboardData[2].studentAvatar}
                        alt={leaderboardData[2].studentName}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-700/50 bg-white group-hover:scale-105 transition"
                      />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        3
                      </span>
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-800 truncate max-w-full group-hover:text-amber-800">
                      {leaderboardData[2].studentName}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      Lớp {leaderboardData[2].studentClass}
                    </span>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="text-xs sm:text-sm font-black text-amber-800">
                        {leaderboardData[2].score} / {leaderboardData[2].maxScore}đ
                      </div>
                      <span className="px-2 py-0.5 rounded-full font-black text-[10.5px] bg-amber-50 text-amber-800 border border-amber-200">
                        {leaderboardData[2].percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Leaderboard Table */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              {leaderboardData.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Trophy className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Chưa có dữ liệu bài nộp phù hợp với tiêu chí lọc.</p>
                  <p className="text-[11px] text-slate-400">
                    Hãy bấm "Đặt lại" bộ lọc hoặc chọn một đề thi/lớp học khác.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase bg-slate-50/80">
                      <th className="p-3.5 text-center w-16">Hạng</th>
                      <th className="p-3.5">Học sinh</th>
                      <th className="p-3.5 text-center">Lớp</th>
                      <th className="p-3.5 text-center">
                        {selectedExamId !== "all" ? "Điểm & Tỷ lệ %" : "Điểm & Tỷ lệ % Tốt Nhất"}
                      </th>
                      <th className="p-3.5 text-center">Điểm TB & %</th>
                      <th className="p-3.5 text-center">Số lượt làm</th>
                      <th className="p-3.5 text-center">Thời gian</th>
                      <th className="p-3.5 text-center">Lần nộp mới nhất</th>
                      <th className="p-3.5 text-center">Thao tác</th>
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
                          className={`hover:bg-slate-50/90 transition ${
                            isTop1 ? "bg-amber-50/30 font-bold" : isTop2 ? "bg-slate-50/40" : ""
                          }`}
                        >
                          {/* Rank Badge */}
                          <td className="p-3.5 text-center font-black">
                            {isTop1 ? (
                              <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 inline-flex items-center justify-center shadow-xs font-black text-sm">
                                1
                              </span>
                            ) : isTop2 ? (
                              <span className="w-8 h-8 rounded-xl bg-slate-300 text-slate-800 inline-flex items-center justify-center shadow-xs font-black text-sm">
                                2
                              </span>
                            ) : isTop3 ? (
                              <span className="w-8 h-8 rounded-xl bg-amber-700 text-white inline-flex items-center justify-center shadow-xs font-black text-sm">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold">#{row.rank}</span>
                            )}
                          </td>

                          {/* Student Info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={row.studentAvatar}
                                alt={row.studentName}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white shrink-0 shadow-2xs"
                              />
                              <div>
                                <div
                                  onClick={() => {
                                    if (onViewStudentHistory) {
                                      onViewStudentHistory(row.studentId, row.studentName);
                                    }
                                  }}
                                  className="font-extrabold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5 transition text-xs sm:text-sm"
                                  title="Bấm để xem tất cả các lần làm bài của học sinh này"
                                >
                                  <span>{row.studentName}</span>
                                  <Eye className="w-3.5 h-3.5 text-indigo-400 opacity-60" />
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium">
                                  SBD: {row.studentId}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Class */}
                          <td className="p-3.5 text-center">
                            <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-900 font-extrabold text-xs border border-amber-200">
                              {row.studentClass}
                            </span>
                          </td>

                          {/* Main Score & Percentage */}
                          <td className="p-3.5 text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="font-black text-xs sm:text-sm text-slate-800 tracking-tight">
                                {row.score} / {row.maxScore}đ
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-black text-[10.5px] border inline-flex items-center gap-0.5 shadow-2xs ${
                                  row.percentage >= 80
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : row.percentage >= 65
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : row.percentage >= 50
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-rose-50 text-rose-800 border-rose-200"
                                }`}
                                title={`Đạt ${row.percentage}% trên tổng điểm ${row.maxScore}đ (Quy chuẩn hệ 10: ${((row.score / row.maxScore) * 10).toFixed(2)}đ)`}
                              >
                                <span>{row.percentage}%</span>
                                {row.percentage === 100 && <span>🔥</span>}
                              </span>
                            </div>
                          </td>

                          {/* Avg Score & Percentage */}
                          <td className="p-3.5 text-center font-bold text-slate-700">
                            <div>{row.avgScore}đ</div>
                            <div className="text-[10px] text-slate-400 font-semibold">({row.avgPercentage}%)</div>
                          </td>

                          {/* Attempts */}
                          <td className="p-3.5 text-center font-bold text-slate-600">
                            {row.attemptsCount} lần
                          </td>

                          {/* Time */}
                          <td className="p-3.5 text-center text-slate-500 font-medium">
                            {Math.round(row.timeSpentSeconds / 60)} phút
                          </td>

                          {/* Date */}
                          <td className="p-3.5 text-center text-slate-500 text-[11px]">
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
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (onViewStudentHistory) {
                                  onViewStudentHistory(row.studentId, row.studentName);
                                } else if (row.submission) {
                                  setSelectedSubmissionReview(row.submission);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold transition flex items-center gap-1 mx-auto text-xs cursor-pointer shadow-2xs"
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
              )}
            </div>
          </div>
        )}

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
                      <span>Bảng Điều Khiển Lọc Nâng Cao</span>
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
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "all", label: "Tất cả khối" },
                      ...STANDARD_GRADES.map((g) => ({
                        id: g,
                        label: g.replace("Lớp ", "Khối "),
                      })),
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
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              isSel
                                ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                                : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
                            }`}
                          >
                            <span>Lớp {cls}</span>
                            {count > 0 && (
                              <span
                                className={`text-[10px] px-1.5 rounded-full ${
                                  isSel ? "bg-black/20" : "bg-slate-100 text-slate-600"
                                }`}
                              >
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
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs cursor-pointer"
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
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
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
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
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
                          className={`p-2 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
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
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Áp dụng ({leaderboardData.length} học sinh)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xem bài làm chi tiết nếu có */}
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
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
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
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
