import React, { useState, useMemo } from "react";
import { Exam, StudentSubmission, STANDARD_CLASSES, STANDARD_GRADES } from "../types/exam";
import { User } from "../types/auth";
import { MathRenderer } from "./MathRenderer";
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
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassFilter);
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedSubmissionReview, setSelectedSubmissionReview] = useState<StudentSubmission | null>(null);

  // Danh sách các lớp thực tế có bài làm hoặc danh mục chuẩn
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    STANDARD_CLASSES.forEach((c) => classSet.add(c));
    submissions.forEach((s) => {
      if (s.studentClass) classSet.add(s.studentClass);
    });
    return Array.from(classSet);
  }, [submissions]);

  // Lọc và tính toán bảng xếp hạng
  const leaderboardData = useMemo(() => {
    // 1. Lọc theo bài kiểm tra (nếu có chọn đề cụ thể)
    let filteredSubs = submissions;
    if (selectedExamId !== "all") {
      filteredSubs = filteredSubs.filter((s) => s.examId === selectedExamId);
    }

    // 2. Lọc theo Lớp
    if (selectedClass !== "all") {
      filteredSubs = filteredSubs.filter((s) => {
        if (!s.studentClass) return selectedClass === "12A1";
        if (s.studentClass === selectedClass) return true;
        if (selectedClass === "Lớp 12" && s.studentClass.startsWith("12")) return true;
        if (selectedClass === "Lớp 11" && s.studentClass.startsWith("11")) return true;
        if (selectedClass === "Lớp 10" && s.studentClass.startsWith("10")) return true;
        return false;
      });
    }

    // 3. Lọc theo từ khóa tìm kiếm
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase().trim();
      filteredSubs = filteredSubs.filter(
        (s) =>
          s.studentName.toLowerCase().includes(kw) ||
          s.studentId.toLowerCase().includes(kw) ||
          (s.studentClass && s.studentClass.toLowerCase().includes(kw)) ||
          s.examTitle.toLowerCase().includes(kw)
      );
    }

    // 4. Nếu chọn một đề kiểm tra cụ thể: xếp hạng theo điểm số của lần nộp tốt nhất của học sinh đó ở đề này
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

      const list = Array.from(studentBestMap.values());
      // Sắp xếp: Điểm cao trước, thời gian làm ít hơn trước, ngày nộp mới hơn trước
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.timeSpentSeconds !== b.timeSpentSeconds) return a.timeSpentSeconds - b.timeSpentSeconds;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });

      return list.map((item, idx) => ({
        rank: idx + 1,
        studentId: item.studentId,
        studentName: item.studentName,
        studentClass: item.studentClass || "12A1",
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

    // 5. Nếu chọn "Tất cả đề thi": Xếp hạng tổng hợp học sinh theo Điểm Trung Bình hoặc Tổng điểm tích lũy
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
          studentClass: sub.studentClass || "12A1",
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

    const aggList = Array.from(studentAggMap.values()).map((st) => {
      const avgScore = Number((st.scores.reduce((a, b) => a + b, 0) / st.scores.length).toFixed(2));
      const maxScore = Math.max(...st.scores);
      const userObj = users.find((u) => u.id === st.studentId || u.name === st.studentName);

      return {
        studentId: st.studentId,
        studentName: st.studentName,
        studentClass: st.studentClass,
        studentAvatar:
          st.studentAvatar ||
          userObj?.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(st.studentName)}`,
        avgScore,
        maxScore,
        attemptsCount: st.scores.length,
        totalTime: st.totalTime,
        latestSubmit: st.latestSubmit,
        lastSubmission: st.subs[0],
      };
    });

    // Sắp xếp theo điểm trung bình cao nhất, sau đó số bài làm nhiều hơn
    aggList.sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.attemptsCount !== a.attemptsCount) return b.attemptsCount - a.attemptsCount;
      return a.totalTime - b.totalTime;
    });

    return aggList.map((item, idx) => ({
      rank: idx + 1,
      studentId: item.studentId,
      studentName: item.studentName,
      studentClass: item.studentClass,
      studentAvatar: item.studentAvatar,
      score: item.avgScore,
      maxScore: 10,
      bestScore: item.maxScore,
      attemptsCount: item.attemptsCount,
      timeSpentSeconds: item.totalTime,
      submittedAt: item.latestSubmit,
      submission: item.lastSubmission,
    }));
  }, [submissions, selectedClass, selectedExamId, searchKeyword, users]);

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

        {/* Filter Controls Bar (Phân loại theo Lớp & theo Đề thi) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Bộ lọc 1: Phân loại theo Đề kiểm tra */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Phân loại theo Đề kiểm tra:</span>
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
              >
                <option value="all">🏆 Tất cả các đề thi (Điểm trung bình tích lũy)</option>
                <optgroup label="Từng Đề Kiểm Tra Cụ Thể">
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.grade || "Lớp 12"} • {exam.title} (Mã: {exam.code})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Bộ lọc 2: Phân loại theo Lớp học */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                <span>Phân loại theo Lớp học:</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
              >
                <option value="all">🏫 Tất cả các lớp ({submissions.length} lượt thi)</option>
                <optgroup label="Từng Lớp Học">
                  {availableClasses.map((cls) => {
                    const cnt = submissions.filter((s) => s.studentClass === cls).length;
                    return (
                      <option key={cls} value={cls}>
                        Lớp {cls} ({cnt} bài nộp)
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="Theo Khối">
                  <option value="Lớp 12">Toàn khối 12</option>
                  <option value="Lớp 11">Toàn khối 11</option>
                  <option value="Lớp 10">Toàn khối 10</option>
                </optgroup>
              </select>
            </div>

            {/* Tìm kiếm học sinh */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Tìm kiếm học sinh / SBD:</span>
              </label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Nhập tên học sinh, số báo danh..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* Quick Select Class Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Chọn nhanh:</span>
            <button
              type="button"
              onClick={() => setSelectedClass("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                selectedClass === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              Tất cả các lớp
            </button>
            {["12A1", "12A2", "12A3", "11A1", "10A1"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedClass(c)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                  selectedClass === c
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "bg-white text-amber-900 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                Lớp {c}
              </button>
            ))}
          </div>
        </div>

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
