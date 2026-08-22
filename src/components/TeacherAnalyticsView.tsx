import React, { useState, useMemo } from "react";
import { Exam, StudentSubmission, STANDARD_CLASSES } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Award,
  TrendingUp,
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
}

export const TeacherAnalyticsView: React.FC<TeacherAnalyticsViewProps> = ({
  exam,
  submissions,
  onBack,
  selectedClassFilter = "all",
  onSelectClassFilter,
  allExams = [],
  onSelectExam,
  onOpenLeaderboard,
  onOpenStudentHistory,
}) => {
  const [internalClassFilter, setInternalClassFilter] = useState<string>(selectedClassFilter);
  const activeClass = selectedClassFilter !== "all" ? selectedClassFilter : internalClassFilter;

  const handleClassChange = (cls: string) => {
    setInternalClassFilter(cls);
    if (onSelectClassFilter) {
      onSelectClassFilter(cls);
    }
  };

  const [activeTab, setActiveTab] = useState<"overview" | "items" | "students">("overview");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [teacherPreviewImage, setTeacherPreviewImage] = useState<string | null>(null);

  // Lọc bài nộp theo Lớp được Admin/Giáo viên chọn
  const filteredSubmissionsByClass = useMemo(() => {
    if (activeClass === "all") return submissions;
    return submissions.filter((sub) => {
      if (!sub.studentClass) return true;
      if (sub.studentClass === activeClass) return true;
      if (activeClass === "Lớp 12" && sub.studentClass.startsWith("12")) return true;
      if (activeClass === "Lớp 11" && sub.studentClass.startsWith("11")) return true;
      if (activeClass === "Lớp 10" && sub.studentClass.startsWith("10")) return true;
      return false;
    });
  }, [submissions, activeClass]);

  // Thống kê tổng quan dựa trên Lớp được lọc
  const stats = useMemo(() => {
    const count = filteredSubmissionsByClass.length;
    if (count === 0) {
      return {
        total: 0,
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
      avgScore: avg,
      maxScore: max,
      minScore: min,
      passRate,
      distribution,
    };
  }, [filteredSubmissionsByClass]);

  // Phân tích câu hỏi (Item Analysis): Tỷ lệ đúng/sai từng câu theo lớp
  const itemAnalysis = useMemo(() => {
    return exam.questions.map((q, idx) => {
      let correctCount = 0;
      let totalAttempts = filteredSubmissionsByClass.length;

      filteredSubmissionsByClass.forEach((sub) => {
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
  }, [exam.questions, filteredSubmissionsByClass]);

  // Danh sách học sinh lọc theo từ khóa tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!searchKeyword) return filteredSubmissionsByClass;
    const kw = searchKeyword.toLowerCase();
    return filteredSubmissionsByClass.filter(
      (s) =>
        s.studentName.toLowerCase().includes(kw) ||
        s.studentId.toLowerCase().includes(kw) ||
        (s.studentClass && s.studentClass.toLowerCase().includes(kw))
    );
  }, [filteredSubmissionsByClass, searchKeyword]);

  // In bảng điểm
  const handlePrint = () => {
    window.print();
  };

  // Xuất CSV bảng điểm có thông tin Lớp
  const handleExportCSV = () => {
    let csv = "\uFEFFSBD,Họ và tên,Lớp,Điểm tổng,Phần I,Phần II,Phần III,Phần IV,Thời gian nộp\n";
    filteredSubmissionsByClass.forEach((s) => {
      csv += `"${s.studentId}","${s.studentName}","${s.studentClass || "12A1"}",${s.score},${s.partScores.part_1.earned},${s.partScores.part_2.earned},${s.partScores.part_3.earned},${s.partScores.part_4.earned},"${new Date(s.submittedAt).toLocaleString("vi-VN")}"\n`;
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
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-100">
                BẢNG ĐIỀU KHIỂN GIÁO VIÊN
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                {exam.grade}
              </span>
              {exam.chapter && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 font-medium text-xs border border-slate-200 truncate max-w-xs">
                  {exam.chapter}
                </span>
              )}
              <span className="text-xs text-slate-400 font-semibold">
                Mã: {exam.code}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
              Phân Tích & Báo Cáo: {exam.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Số câu hỏi: {exam.questions.length} • Tổng điểm chuẩn: {exam.totalScore}đ • Thời lượng: {exam.durationMinutes} phút
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Bảng Xếp Hạng Điểm</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>In bảng điểm</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
            >
              Quay lại
            </button>
          </div>
        </div>

        {/* ================= THANH CHỌN LỚP DÀNH CHO ADMIN & GIÁO VIÊN ================= */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 shrink-0 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Chọn Lớp xem dữ liệu:
            </span>

            {/* Quick Class Selector Chips */}
            <button
              type="button"
              onClick={() => handleClassChange("all")}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 transition ${
                activeClass === "all"
                  ? "bg-slate-900 text-white shadow-xs font-extrabold"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Tất cả các lớp ({submissions.length})
            </button>

            {["12A1", "12A2", "11A1", "10A1"].map((cls) => {
              const count = submissions.filter((s) => s.studentClass === cls).length;
              const isSelected = activeClass === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => handleClassChange(cls)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 shadow-xs font-extrabold"
                      : "bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/60"
                  }`}
                >
                  <span>Lớp {cls}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? "bg-black/20 text-slate-950" : "bg-amber-200/80 text-amber-950"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">Bộ lọc chi tiết:</span>
            <select
              value={activeClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
            >
              <option value="all">🏫 Tất cả các lớp ({submissions.length} bài)</option>
              <optgroup label="Danh sách Lớp học">
                {STANDARD_CLASSES.map((cls) => {
                  const cnt = submissions.filter((s) => s.studentClass === cls).length;
                  return (
                    <option key={cls} value={cls}>
                      Lớp {cls} ({cnt} bài nộp)
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="Theo Khối">
                <option value="Lớp 12">Khối 12 ({submissions.filter((s) => s.studentClass?.startsWith("12")).length} bài)</option>
                <option value="Lớp 11">Khối 11 ({submissions.filter((s) => s.studentClass?.startsWith("11")).length} bài)</option>
                <option value="Lớp 10">Khối 10 ({submissions.filter((s) => s.studentClass?.startsWith("10")).length} bài)</option>
              </optgroup>
            </select>
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

        {/* TAB 1: PHỔ ĐIỂM & BIỂU ĐỒ BENTO */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-4">
              Biểu đồ phân bố phổ điểm học sinh
            </h3>

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
        )}

        {/* TAB 2: PHÂN TÍCH CÂU HỎI KHÓ (ITEM ANALYSIS) */}
        {activeTab === "items" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200">
            <div className="mb-4">
              <h3 className="font-black text-base text-slate-800">
                Phân tích độ khó & tỷ lệ đúng từng câu hỏi
              </h3>
              <p className="text-xs text-slate-500">
                Giúp giáo viên nhận biết các câu hỏi có tỷ lệ sai cao để củng cố kiến thức cho học sinh.
              </p>
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
                      <td className="p-3 text-slate-500">{item.partName.split(" ")[1]}</td>
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
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
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
          <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <h3 className="font-black text-base text-slate-800">
                Danh sách kết quả học sinh ({filteredStudents.length})
              </h3>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm tên hoặc SBD..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold outline-none"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Không tìm thấy bài nộp nào phù hợp.
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
                            {sub.studentClass || "12A1"}
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
                              onClick={() => setSelectedSubmission(sub)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-indigo-700 font-bold transition flex items-center gap-1 text-[11px]"
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
              <div className="space-y-4">
                {exam.questions.map((q) => {
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
                                            className="p-0.5 hover:text-indigo-600"
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
