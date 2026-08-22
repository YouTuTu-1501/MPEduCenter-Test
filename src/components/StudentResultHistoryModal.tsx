import React, { useState, useMemo } from "react";
import { User } from "../types/auth";
import { StudentSubmission } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import {
  History,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter,
  BarChart2,
  BookOpen,
  TrendingUp,
  X,
  FileCheck,
  ChevronRight,
} from "lucide-react";

interface StudentResultHistoryModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  submissions: StudentSubmission[];
}

export const StudentResultHistoryModal: React.FC<StudentResultHistoryModalProps> = ({
  user,
  isOpen,
  onClose,
  submissions,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  // Lọc toàn bộ bài nộp của học sinh này một cách linh hoạt & thông minh
  const studentSubmissions = useMemo(() => {
    if (!user) return [];

    let userRecordedSubIds: string[] = [];
    try {
      const raw = localStorage.getItem(`edutest_user_${user.id}_subs`);
      if (raw) userRecordedSubIds = JSON.parse(raw);
    } catch {}

    const cleanUserRawName = (user.name || "").toLowerCase().trim();
    // Bỏ phần "- 11A4" hoặc "(12A1)" nếu có trong tên
    const cleanUserBaseName = cleanUserRawName.split("-")[0].split("(")[0].trim();

    const directMatches = submissions.filter((s) => {
      if (!s) return false;
      // 1. Khớp chính xác ID học sinh hoặc SBD
      if (s.studentId && user.id && s.studentId.trim() === user.id.trim()) return true;

      // 2. Khớp theo email
      if (s.studentEmail && user.email && s.studentEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) return true;

      // 3. Khớp theo danh sách đã lưu cục bộ
      if (userRecordedSubIds.includes(s.id)) return true;

      // 4. Khớp theo họ tên học sinh
      const subNameRaw = (s.studentName || "").toLowerCase().trim();
      const subNameBase = subNameRaw.split("-")[0].split("(")[0].trim();

      if (subNameRaw && cleanUserRawName) {
        if (subNameRaw === cleanUserRawName) return true;
        if (subNameBase && cleanUserBaseName && subNameBase === cleanUserBaseName) return true;
        if (subNameRaw.includes(cleanUserBaseName) || cleanUserRawName.includes(subNameBase)) return true;
      }

      return false;
    });

    // Sắp xếp theo ngày thi mới nhất
    return directMatches.sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime() || 0;
      const timeB = new Date(b.submittedAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [submissions, user]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = studentSubmissions.length;
    if (total === 0) {
      return { total: 0, avgScore: 0, maxScore: 0, minScore: 0, totalMinutes: 0 };
    }
    const scores = studentSubmissions.map((s) => s.score);
    const avg = Number((scores.reduce((a, b) => a + b, 0) / total).toFixed(2));
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const totalMinutes = Math.round(
      studentSubmissions.reduce((a, b) => a + (b.timeSpentSeconds || 0), 0) / 60
    );

    return { total, avgScore: avg, maxScore: max, minScore: min, totalMinutes };
  }, [studentSubmissions]);

  // Lọc theo tìm kiếm và mức điểm
  const filteredSubmissions = useMemo(() => {
    return studentSubmissions.filter((sub) => {
      const matchSearch =
        searchQuery === "" ||
        sub.examTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.examId.toLowerCase().includes(searchQuery.toLowerCase());

      let matchScore = true;
      if (scoreFilter === "high") matchScore = sub.score >= 8.0;
      else if (scoreFilter === "medium") matchScore = sub.score >= 5.0 && sub.score < 8.0;
      else if (scoreFilter === "low") matchScore = sub.score < 5.0;

      return matchSearch && matchScore;
    });
  }, [studentSubmissions, searchQuery, scoreFilter]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md bg-white shrink-0"
            />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Lịch Sử & Bảng Điểm Các Lần Làm Bài Thi</span>
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-amber-300">{user.name}</span>
                <span>•</span>
                <span className="text-slate-300 font-semibold">
                  {user.role === "student" ? `Lớp ${user.schoolClass || "12A1"}` : user.email}
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-bold">{studentSubmissions.length} lượt thi đã nộp</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition shadow-xs"
            title="Đóng / Quay lại"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bento Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>Tổng số lượt thi</span>
              <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.total} bài</div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>Điểm trung bình</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{stats.avgScore}đ</div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>Điểm cao nhất</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-amber-600 mt-0.5">{stats.maxScore}đ</div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>Thời gian làm bài</span>
              <Clock className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-xl font-extrabold text-sky-600 mt-0.5">{stats.totalMinutes} phút</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên đề thi..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all", label: "Tất cả" },
              { id: "high", label: "Điểm Giỏi (≥ 8.0)" },
              { id: "medium", label: "Trung bình - Khá (5 - 8)" },
              { id: "low", label: "Chưa đạt (< 5.0)" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setScoreFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  scoreFilter === f.id
                    ? "bg-white text-indigo-600 shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions List Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold">Chưa có kết quả bài làm nào phù hợp.</p>
              <p className="text-[11px] text-slate-400">
                Hãy hoàn thành các bài thi trong ngân hàng đề để tích lũy bảng điểm và xếp hạng.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub, idx) => {
                const timeMinutes = Math.round((sub.timeSpentSeconds || 0) / 60);
                const isPassed = sub.score >= 5.0;

                return (
                  <div
                    key={sub.id || idx}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition">
                          {sub.examTitle}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg font-black text-xs ${
                            sub.score >= 8
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : sub.score >= 5
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {sub.score}/{sub.maxScore || 10} điểm
                        </span>
                        <span className="text-[10px] text-slate-400">
                          #{idx + 1}
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
                          <span>Thời gian: {timeMinutes} phút</span>
                        </span>

                        {sub.partScores && (
                          <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            P.I: {sub.partScores.part_1.earned}đ • P.II: {sub.partScores.part_2.earned}đ • P.III:{" "}
                            {sub.partScores.part_3.earned}đ • P.IV: {sub.partScores.part_4.earned}đ
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(sub)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center shrink-0 border border-indigo-200 group-hover:border-indigo-600"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem chi tiết bài làm</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Hiển thị {filteredSubmissions.length} trên tổng số {studentSubmissions.length} lượt nộp bài
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal Xem chi tiết bài làm (Review Popup) */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[80] flex items-center justify-center p-4"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-white">
                  Chi tiết bài làm: {selectedSubmission.examTitle}
                </h4>
                <p className="text-xs text-slate-400">
                  Học sinh: <strong className="text-white">{selectedSubmission.studentName}</strong> • Điểm:{" "}
                  <strong className="text-emerald-400 font-black">{selectedSubmission.score}đ</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
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
                    {selectedSubmission.partScores?.part_1?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần II (Đúng/Sai)</div>
                  <div className="font-black text-sm text-slate-800 mt-0.5">
                    {selectedSubmission.partScores?.part_2?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần III (Trả lời ngắn)</div>
                  <div className="font-black text-sm text-slate-800 mt-0.5">
                    {selectedSubmission.partScores?.part_3?.earned || 0}đ
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phần IV (Tự luận)</div>
                  <div className="font-black text-sm text-slate-800 mt-0.5">
                    {selectedSubmission.partScores?.part_4?.earned || 0}đ
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h5 className="font-bold text-slate-800 text-sm">Đối chiếu câu trả lời & đáp án chuẩn:</h5>
                {Object.entries(selectedSubmission.details || {}).map(([qId, detail], index) => {
                  return (
                    <div
                      key={qId}
                      className={`p-4 rounded-2xl border ${
                        detail.isCorrect
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-rose-50/40 border-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 text-xs">
                          Câu {index + 1}
                        </span>
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

                      <div className="text-slate-700 text-xs space-y-1.5">
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
                          <div className="text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/80 mt-2">
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
                onClick={() => setSelectedSubmission(null)}
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
