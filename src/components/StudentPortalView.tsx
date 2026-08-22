import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Exam, StudentSubmission } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
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
} from "lucide-react";

interface StudentPortalViewProps {
  exams: Exam[];
  submissions: StudentSubmission[];
  onStartExam: (exam: Exam) => void;
  onJoinLiveRoom: () => void;
  onOpenLeaderboard?: () => void;
  onOpenHistory?: () => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  exams,
  submissions,
  onStartExam,
  onJoinLiveRoom,
  onOpenLeaderboard,
  onOpenHistory,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"exams" | "history" | "analytics">("exams");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubmissionReview, setSelectedSubmissionReview] = useState<StudentSubmission | null>(null);

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
        part1Accuracy: 85,
        part2Accuracy: 75,
        part3Accuracy: 70,
        part4Accuracy: 80,
      };
    }

    const scores = mySubmissions.map((s) => s.score);
    const avg = (scores.reduce((a, b) => a + b, 0) / completedCount).toFixed(1);
    const best = Math.max(...scores).toFixed(1);
    const totalTime = Math.round(
      mySubmissions.reduce((a, b) => a + (b.timeSpentSeconds || 0), 0) / 60
    );

    return {
      completedCount,
      avgScore: avg,
      bestScore: best,
      totalTimeMinutes: totalTime,
      part1Accuracy: 88,
      part2Accuracy: 78,
      part3Accuracy: 72,
      part4Accuracy: 85,
    };
  }, [mySubmissions]);

  // Lọc danh sách đề thi
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchGrade = gradeFilter === "all" || (e.grade && e.grade === gradeFilter);
      const matchSearch =
        searchQuery === "" ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.chapter && e.chapter.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchGrade && matchSearch;
    });
  }, [exams, gradeFilter, searchQuery]);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
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
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-md transition flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Bảng Xếp Hạng Điểm Lớp</span>
              </button>
            )}

            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 shadow-md transition flex items-center gap-2"
              >
                <History className="w-4 h-4 text-emerald-300" />
                <span>Xem Kết Quả ({mySubmissions.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onJoinLiveRoom}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>Vào phòng thi Live (Mã PIN)</span>
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
              {["all", "Lớp 12", "Lớp 11", "Lớp 10"].map((g) => (
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
                  {g === "all" ? "Tất cả các lớp" : g}
                </button>
              ))}
            </div>
          </div>

          {/* Exams Grid Bento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => {
              const questionCount = exam.questions.length;
              // Kiểm tra xem học sinh đã làm đề này chưa
              const previousSub = mySubmissions.find((s) => s.examId === exam.id);

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-300 transition group space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">
                        {exam.grade || "Lớp 12"} • Mã: {exam.code}
                      </span>
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
                    </div>

                    <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-600 transition line-clamp-2">
                      {exam.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {exam.description || exam.chapter || "Đề kiểm tra chuẩn cấu trúc 4 dạng thức GDPT"}
                    </p>

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
                      onClick={() => onStartExam(exam)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs group-hover:shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{previousSub ? "Làm lại bài" : "Bắt đầu làm bài"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

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

            <div className="divide-y divide-slate-100">
              {mySubmissions.map((sub) => {
                const timeMinutes = Math.round((sub.timeSpentSeconds || 0) / 60);
                return (
                  <div
                    key={sub.id}
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
                  </div>
                );
              })}

              {mySubmissions.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Bạn chưa thực hiện bài thi nào. Hãy chọn một đề thi từ danh sách để bắt đầu luyện tập!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL ANALYTICS */}
      {activeTab === "analytics" && (
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
    </div>
  );
};
