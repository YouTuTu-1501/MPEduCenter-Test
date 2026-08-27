import React, { useState, useMemo } from "react";
import { Exam, STANDARD_CLASSES, getAvailableClassesForGrade, checkExamAccessStatus } from "../types/exam";
import { parseStandardExamCode } from "../utils/examCodeHelper";
import { useToast } from "../context/ToastContext";
import {
  Clock,
  Lock,
  Unlock,
  KeyRound,
  Calendar,
  Share2,
  Copy,
  Check,
  GraduationCap,
  Sparkles,
  AlertCircle,
  QrCode,
  Send,
  Users,
  ShieldAlert,
  Info,
} from "lucide-react";

interface ExamScheduleModalProps {
  exam: Exam;
  isOpen: boolean;
  onClose: () => void;
  onSaveExam: (updatedExam: Exam) => void;
}

export const ExamScheduleModal: React.FC<ExamScheduleModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSaveExam,
}) => {
  const { toast } = useToast();

  const [isLocked, setIsLocked] = useState<boolean>(exam.isLocked || false);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(
    exam.scheduleEnabled || false
  );
  const [scheduledOpenTime, setScheduledOpenTime] = useState<string>(
    exam.scheduledOpenTime || ""
  );
  const [scheduledCloseTime, setScheduledCloseTime] = useState<string>(
    exam.scheduledCloseTime || ""
  );
  const [targetClass, setTargetClass] = useState<string>(
    exam.targetClass || "Tất cả các lớp"
  );

  const scheduleAvailableClasses = useMemo(() => {
    return getAvailableClassesForGrade(exam.grade || "Lớp 12");
  }, [exam.grade]);
  const [examPassword, setExamPassword] = useState<string>(exam.password || "");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  if (!isOpen) return null;

  const parsedCode = parseStandardExamCode(exam.code);

  // Tạo đối tượng tạm thời để kiểm tra trạng thái preview
  const previewExam: Exam = {
    ...exam,
    isLocked,
    scheduleEnabled,
    scheduledOpenTime: scheduleEnabled ? scheduledOpenTime : undefined,
    scheduledCloseTime: scheduleEnabled ? scheduledCloseTime : undefined,
    targetClass,
    password: examPassword || undefined,
  };
  const accessStatus = checkExamAccessStatus(previewExam);

  // Sao chép Mã Đề
  const handleCopyCode = () => {
    navigator.clipboard.writeText(exam.code);
    setCopiedCode(true);
    toast.success("Đã sao chép mã đề thi", `Mã đề: ${exam.code}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Sao chép thông điệp giao đề chi tiết gửi Zalo / Lớp
  const handleCopyAssignmentSummary = () => {
    let timeInfo = "Làm bài tự do";
    if (scheduleEnabled) {
      const openStr = scheduledOpenTime
        ? new Date(scheduledOpenTime).toLocaleString("vi-VN")
        : "Ngay bây giờ";
      const closeStr = scheduledCloseTime
        ? new Date(scheduledCloseTime).toLocaleString("vi-VN")
        : "Không giới hạn";
      timeInfo = `Mở lúc: ${openStr} - Hạn chót: ${closeStr}`;
    }

    const message = `📢 THÔNG BÁO LÀM BÀI KIỂM TRA TOÁN HỌC
📝 Đề thi: ${exam.title}
🔑 MÃ ĐỀ THI: 👉 ${exam.code} 👈
📌 Quy luật mã: [Lớp]-[Chương]-[Bài]-[Lần] (${parsedCode.explanation})
🎓 Đối tượng: ${targetClass} (${exam.grade})
⏱️ Thời gian làm bài: ${exam.durationMinutes} phút (${exam.questions.length} câu)
⏰ Lịch mở đề: ${timeInfo}
${examPassword ? `🔒 Mật khẩu vào đề: ${examPassword}\n` : ""}
👉 HƯỚNG DẪN HỌC SINH:
1. Truy cập vào Cổng thi trực tuyến.
2. Chọn "Nhập Mã Đề Thi" và gõ đúng mã: ${exam.code}
3. Bấm "Vào làm bài" để bắt đầu tính giờ!`;

    navigator.clipboard.writeText(message);
    setCopiedSummary(true);
    toast.success(
      "Đã sao chép thông tin giao đề",
      "Bạn có thể dán trực tiếp vào nhóm Zalo / Messenger lớp học!"
    );
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Lưu thiết lập
  const handleSave = () => {
    const updated: Exam = {
      ...exam,
      isLocked,
      scheduleEnabled,
      scheduledOpenTime: scheduleEnabled && scheduledOpenTime ? scheduledOpenTime : undefined,
      scheduledCloseTime: scheduleEnabled && scheduledCloseTime ? scheduledCloseTime : undefined,
      targetClass,
      password: examPassword.trim() ? examPassword.trim() : undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveExam(updated);
    toast.success(
      "Cập nhật cài đặt giao đề thành công!",
      `Đề "${exam.title}" - Trạng thái: ${isLocked ? "Đã khóa" : "Đang mở"}`
    );
    onClose();
  };

  // Gợi ý nhanh giờ mở đề (Ví dụ: Ngay bây giờ, sau 15p, sáng mai 07:30, ...)
  const setQuickSchedule = (type: "now_to_tonight" | "tomorrow" | "weekend") => {
    setScheduleEnabled(true);
    setIsLocked(false);
    const now = new Date();
    if (type === "now_to_tonight") {
      const openIso = new Date(now.getTime() - 1000 * 60).toISOString().slice(0, 16);
      const tonight = new Date();
      tonight.setHours(23, 59, 0, 0);
      setScheduledOpenTime(openIso);
      setScheduledCloseTime(tonight.toISOString().slice(0, 16));
    } else if (type === "tomorrow") {
      const tomorrowOpen = new Date();
      tomorrowOpen.setDate(tomorrowOpen.getDate() + 1);
      tomorrowOpen.setHours(7, 30, 0, 0);
      const tomorrowClose = new Date(tomorrowOpen);
      tomorrowClose.setHours(17, 0, 0, 0);
      setScheduledOpenTime(tomorrowOpen.toISOString().slice(0, 16));
      setScheduledCloseTime(tomorrowClose.toISOString().slice(0, 16));
    } else if (type === "weekend") {
      const sat = new Date();
      sat.setDate(sat.getDate() + (6 - sat.getDay()));
      sat.setHours(8, 0, 0, 0);
      const sun = new Date(sat);
      sun.setDate(sun.getDate() + 1);
      sun.setHours(22, 0, 0, 0);
      setScheduledOpenTime(sat.toISOString().slice(0, 16));
      setScheduledCloseTime(sun.toISOString().slice(0, 16));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 text-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Quản Lý Mở / Khóa & Hẹn Giờ Giao Đề</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${accessStatus.badgeColor}`}
              >
                {accessStatus.badgeLabel}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 line-clamp-1">
              {exam.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {exam.grade} • {exam.durationMinutes} phút • {exam.questions.length} câu
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition shrink-0"
          >
            ✕
          </button>
        </div>

        {/* BENTO 1: MÃ ĐỀ THI & GIAO ĐỀ NHANH CHO HỌC SINH */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                Mã Đề Chuẩn Theo Quy Luật: [Lớp]-[Chương]-[Bài]-[Lần]
              </span>
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl font-black tracking-wider text-amber-400 font-mono bg-white/10 px-4 py-1.5 rounded-xl border border-white/20">
                  {exam.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? "Đã chép mã" : "Chép mã đề"}</span>
                </button>
              </div>

              {/* Giải thích chi tiết từng phần của mã đề */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-slate-200">
                  Lớp: <strong className="text-amber-300">{parsedCode.grade}</strong>
                </span>
                <span className="text-slate-400">•</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-slate-200">
                  Chương: <strong className="text-amber-300">{parsedCode.chapter}</strong>
                </span>
                <span className="text-slate-400">•</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-slate-200">
                  Bài: <strong className="text-amber-300">{parsedCode.lesson}</strong>
                </span>
                <span className="text-slate-400">•</span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-slate-200">
                  Lần kiểm tra: <strong className="text-amber-300">{parsedCode.attempt}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyAssignmentSummary}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition shrink-0"
            >
              {copiedSummary ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedSummary ? "Đã chép nội dung!" : "Sao chép gửi Zalo lớp"}</span>
            </button>
          </div>
        </div>

        {/* BENTO 2: TRẠNG THÁI MỞ / KHÓA ĐỀ (LOCK / UNLOCK) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isLocked
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isLocked ? "Đề thi đang BỊ KHÓA" : "Đề thi ĐANG MỞ TỰ DO"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isLocked
                    ? "Học sinh không thể vào làm bài, hệ thống sẽ báo đề đã bị khóa."
                    : "Học sinh có thể nhập mã và bắt đầu làm bài kiểm tra."}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs ${
                isLocked
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isLocked ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Mở Đề Thi Ngay</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Khóa Đề Thi Lại</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BENTO 3: HẸN GIỜ MỞ ĐỀ & ĐÓNG ĐỀ TỰ ĐỘNG */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Hẹn giờ Tự động Mở & Đóng Đề
                </h3>
                <p className="text-xs text-slate-500">
                  Tự động mở đề khi đến giờ và đóng đề khi hết hạn nộp bài.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Thiết lập thời gian khi bật Hẹn giờ */}
          {scheduleEnabled && (
            <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
              {/* Nút gợi ý nhanh */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">Gợi ý nhanh:</span>
                <button
                  type="button"
                  onClick={() => setQuickSchedule("now_to_tonight")}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200"
                >
                  Mở từ bây giờ đến hết hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSchedule("tomorrow")}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200"
                >
                  Mở ngày mai (07:30 - 17:00)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSchedule("weekend")}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200"
                >
                  Mở cuối tuần (Thứ 7 - CN)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Thời gian mở đề */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    🟢 Thời gian Bắt đầu Mở Đề:
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledOpenTime}
                    onChange={(e) => setScheduledOpenTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Trước giờ này học sinh nhập mã sẽ thấy đồng hồ đếm ngược.
                  </p>
                </div>

                {/* Thời gian đóng đề */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    🔴 Thời gian Đóng Đề (Hạn chót):
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledCloseTime}
                    onChange={(e) => setScheduledCloseTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sau giờ này đề thi tự động đóng và từ chối lượt thi mới.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BENTO 4: LỚP ĐƯỢC GIAO & MẬT KHẨU BẢO VỆ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Phân công lớp */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Lớp Áp Dụng:
            </label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Tất cả các lớp">🏫 Tất cả các lớp ({exam.grade || "Toàn khối"})</option>
              {scheduleAvailableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Mật khẩu bảo vệ (Tùy chọn) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              Mật khẩu phòng thi (Tùy chọn):
            </label>
            <input
              type="text"
              value={examPassword}
              onChange={(e) => setExamPassword(e.target.value)}
              placeholder="Để trống nếu không cần mật khẩu"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Thông báo trạng thái tổng quan */}
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-2 text-xs text-indigo-900">
          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <b>Trạng thái áp dụng:</b> {accessStatus.message}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
          >
            Lưu Thiết Lập & Giao Đề
          </button>
        </div>
      </div>
    </div>
  );
};
