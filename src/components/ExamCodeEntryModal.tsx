import React, { useState, useMemo } from "react";
import { Exam, checkExamAccessStatus } from "../types/exam";
import { useToast } from "../context/ToastContext";
import {
  KeyRound,
  Search,
  ArrowRight,
  Lock,
  Unlock,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";

interface ExamCodeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  onStartExam: (exam: Exam) => void;
  initialCode?: string;
}

export const ExamCodeEntryModal: React.FC<ExamCodeEntryModalProps> = ({
  isOpen,
  onClose,
  exams,
  onStartExam,
  initialCode = "",
}) => {
  const { toast } = useToast();
  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [inputPassword, setInputPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (!isOpen) return null;

  // Tìm đề thi tương ứng với mã học sinh nhập
  const matchedExam = useMemo(() => {
    const clean = inputCode.trim().toLowerCase();
    if (!clean) return null;
    return exams.find(
      (e) =>
        e.code.toLowerCase() === clean ||
        e.id.toLowerCase() === clean ||
        e.title.toLowerCase().includes(clean)
    );
  }, [exams, inputCode]);

  // Kiểm tra trạng thái đề nếu tìm thấy
  const accessStatus = matchedExam ? checkExamAccessStatus(matchedExam) : null;

  // Xử lý vào thi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!inputCode.trim()) {
      setErrorMessage("Vui lòng nhập Mã đề thi do giáo viên cung cấp!");
      return;
    }

    if (!matchedExam) {
      setErrorMessage(
        `Không tìm thấy đề thi với mã "${inputCode.trim()}". Vui lòng kiểm tra lại mã giáo viên đã giao!`
      );
      return;
    }

    const status = checkExamAccessStatus(matchedExam);

    // 1. Nếu đề bị khóa
    if (status.status === "locked") {
      setErrorMessage(
        "🚫 Đề thi này đang bị KHÓA bởi giáo viên. Vui lòng liên hệ giáo viên để được mở quyền thi!"
      );
      return;
    }

    // 2. Nếu chưa đến giờ mở
    if (status.status === "upcoming") {
      setErrorMessage(
        `⏳ Đề thi chưa đến giờ mở! Thời gian mở dự kiến: ${status.openDateFormatted} (${status.timeRemainingText}).`
      );
      return;
    }

    // 3. Nếu đã hết hạn
    if (status.status === "ended") {
      setErrorMessage(
        `⛔ Đề thi đã HẾT HẠN nộp bài vào lúc ${status.closeDateFormatted}.`
      );
      return;
    }

    // 4. Nếu có mật khẩu
    if (matchedExam.password && matchedExam.password.trim()) {
      if (inputPassword.trim() !== matchedExam.password.trim()) {
        setErrorMessage("🔒 Mật khẩu đề thi không chính xác. Vui lòng thử lại!");
        return;
      }
    }

    // Hợp lệ -> Vào thi
    toast.success(
      "Xác thực mã đề thành công!",
      `Đang vào đề thi: ${matchedExam.title} (Mã: ${matchedExam.code})`
    );
    onClose();
    onStartExam(matchedExam);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-200 text-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                Cổng Vào Thi Nhanh
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Nhập Mã Đề Thi
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition shrink-0"
          >
            ✕
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Nhập <b>Mã đề thi (Access Code)</b> do giáo viên cung cấp để vào đúng đề kiểm tra được giao.
        </p>

        {/* Form nhập mã */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Mã Đề Thi / Access Code:
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setErrorMessage("");
                }}
                placeholder="Ví dụ: 001, 102, TOAN12..."
                autoFocus
                className="w-full pl-11 pr-4 py-3.5 text-base sm:text-lg font-black tracking-widest uppercase rounded-2xl border-2 border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition bg-slate-50 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Mật khẩu nếu đề yêu cầu */}
          {matchedExam?.password && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu phòng thi (Do giáo viên cấp):
              </label>
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-300 focus:border-emerald-500 outline-none bg-white"
              />
            </div>
          )}

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Xem trước đề thi nhận diện được */}
          {matchedExam && accessStatus && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Đề thi tìm thấy:
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${accessStatus.badgeColor}`}
                >
                  {accessStatus.badgeLabel}
                </span>
              </div>

              <div className="font-extrabold text-sm text-slate-900 line-clamp-1">
                {matchedExam.title}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{matchedExam.grade}</span>
                <span>• {matchedExam.durationMinutes} phút</span>
                <span>• {matchedExam.questions.length} câu hỏi</span>
                <span>• Tác giả: {matchedExam.author || "Tổ Toán"}</span>
              </div>

              <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-200/80">
                {accessStatus.message}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Vào Làm Bài Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Gợi ý các mã đề đang mở */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-xs font-bold text-slate-500">
            💡 Gợi ý mã đề thi đang mở sẵn:
          </div>
          <div className="flex flex-wrap gap-2">
            {exams.slice(0, 4).map((ex) => {
              const st = checkExamAccessStatus(ex);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setInputCode(ex.code);
                    setErrorMessage("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    st.canEnter
                      ? "bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 border-slate-200"
                      : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
                  }`}
                >
                  <span>Mã: <b>{ex.code}</b></span>
                  <span className="text-[10px] text-slate-400">({ex.grade})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
