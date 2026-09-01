import React, { useState, useRef, useEffect } from "react";
import { Exam } from "../../types/exam";
import { checkExamAccessStatus } from "../../types/exam";
import { useToast } from "../../context/ToastContext";
import {
  Presentation,
  Edit,
  BarChart2,
  Calendar,
  Lock,
  Unlock,
  KeyRound,
  Download,
  Trash2,
  Copy,
  Check,
  Clock,
  FileCode,
  Bookmark,
  MoreVertical,
  Globe,
  Radio,
} from "lucide-react";

interface BankTableViewProps {
  exams: Exam[];
  onSelectExam: (exam: Exam, mode: "presentation" | "exam" | "analytics" | "live") => void;
  onDeleteExam: (examId: string) => void;
  onEditMetadata: (exam: Exam) => void;
  onToggleLock?: (exam: Exam) => void;
  onOpenSchedule?: (exam: Exam) => void;
  handleDownloadLatex: (exam: Exam) => void;
  handleDownloadPresentationHtml: (exam: Exam) => void;
  getGradeBadgeStyle: (grade: string) => string;
  submissionCountByExamId?: Record<string, number>;
}

export const BankTableView: React.FC<BankTableViewProps> = ({
  exams,
  onSelectExam,
  onDeleteExam,
  onEditMetadata,
  onToggleLock,
  onOpenSchedule,
  handleDownloadLatex,
  handleDownloadPresentationHtml,
  getGradeBadgeStyle,
  submissionCountByExamId = {},
}) => {
  const { toast } = useToast();
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeMenuExamId, setActiveMenuExamId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuExamId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyCode = (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(exam.code);
    setCopiedCodeId(exam.id);
    toast.success("Đã sao chép mã đề", `Mã giao đề: ${exam.code}`);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-visible w-full min-w-0">
      <div className="overflow-x-auto w-full min-h-[360px] pb-20">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3.5 whitespace-nowrap">Mã Đề</th>
              <th className="py-3 px-4 min-w-[200px]">Tên Đề & Chuyên Đề</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Khối / Lớp</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Thời Lượng</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Cấu Trúc Câu</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Trạng Thái</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Lượt Nộp</th>
              <th className="py-3 px-4 whitespace-nowrap text-right sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">
                Tác Vụ Đầy Đủ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {exams.map((exam, index) => {
              const accessStatus = checkExamAccessStatus(exam);
              const p1 = exam.questions.filter((q) => q.part === "part_1").length;
              const p2 = exam.questions.filter((q) => q.part === "part_2").length;
              const p3 = exam.questions.filter((q) => q.part === "part_3").length;
              const p4 = exam.questions.filter((q) => q.part === "part_4").length;
              const subs = submissionCountByExamId[exam.id] || submissionCountByExamId[exam.code] || 0;
              const isMenuOpen = activeMenuExamId === exam.id;
              // Nếu là 2 dòng cuối của danh sách có từ 3 đề trở lên, xổ menu lên trên
              const isNearBottom = index >= Math.max(0, exams.length - 2) && exams.length >= 3;

              return (
                <tr
                  key={exam.id}
                  className={`transition-colors group relative ${
                    isMenuOpen ? "bg-indigo-50/60 z-30" : "hover:bg-indigo-50/30"
                  }`}
                >
                  {/* Cột 1: Mã Đề */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(exam, e)}
                      className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-200/80 flex items-center gap-1.5 transition"
                      title="Bấm để sao chép mã đề"
                    >
                      <KeyRound className="w-3 h-3 text-indigo-500" />
                      <span>{exam.code}</span>
                      {copiedCodeId === exam.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-indigo-400 opacity-60 group-hover:opacity-100" />
                      )}
                    </button>
                  </td>

                  {/* Cột 2: Tên Đề & Chuyên Đề */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                      {exam.title}
                    </div>
                    {exam.chapter && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium truncate mt-0.5 max-w-sm">
                        <Bookmark className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{exam.chapter}</span>
                      </div>
                    )}
                  </td>

                  {/* Cột 3: Khối / Lớp */}
                  <td className="py-3 px-3 whitespace-nowrap text-center">
                    <div className="inline-flex flex-col gap-0.5 items-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${getGradeBadgeStyle(
                          exam.grade
                        )}`}
                      >
                        {exam.grade}
                      </span>
                      {exam.targetClass && exam.targetClass !== "Tất cả các lớp" && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          Lớp {exam.targetClass}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cột 4: Thời Lượng */}
                  <td className="py-3 px-3 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-bold text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {exam.durationMinutes || 90}'
                    </span>
                  </td>

                  {/* Cột 5: Cấu trúc câu hỏi 4 dạng */}
                  <td className="py-3 px-3 whitespace-nowrap text-center">
                    <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-extrabold text-slate-700">
                      <span title="Phần I: 4 Lựa chọn">P1:{p1}</span>
                      <span className="text-slate-300">•</span>
                      <span title="Phần II: Đúng/Sai">P2:{p2}</span>
                      <span className="text-slate-300">•</span>
                      <span title="Phần III: Trả lời ngắn">P3:{p3}</span>
                      <span className="text-slate-300">•</span>
                      <span title="Phần IV: Tự luận" className="text-amber-700 font-black">
                        P4:{p4}
                      </span>
                    </div>
                  </td>

                  {/* Cột 6: Trạng thái Mở/Khóa */}
                  <td className="py-3 px-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${accessStatus.badgeColor}`}
                    >
                      {exam.isLocked ? (
                        <Lock className="w-2.5 h-2.5" />
                      ) : exam.scheduleEnabled ? (
                        <Clock className="w-2.5 h-2.5" />
                      ) : (
                        <Unlock className="w-2.5 h-2.5" />
                      )}
                      <span>{accessStatus.badgeLabel}</span>
                    </span>
                  </td>

                  {/* Cột 7: Lượt Nộp */}
                  <td className="py-3 px-3 whitespace-nowrap text-center font-bold text-slate-800">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                      {subs}
                    </span>
                  </td>

                  {/* Cột 8: Tác Vụ CỐ ĐỊNH (STICKY RIGHT) VỚI CÁC NÚT NHANH + MENU THAO TÁC TOÀN DIỆN */}
                  <td
                    className={`py-3 px-4 whitespace-nowrap text-right sticky right-0 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)] ${
                      isMenuOpen
                        ? "z-30 bg-white"
                        : "z-10 bg-white group-hover:bg-slate-50/90"
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {/* 1. Nút Trình Chiếu Nhanh */}
                      <button
                        type="button"
                        onClick={() => onSelectExam(exam, "presentation")}
                        className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-bold text-[11px] flex items-center gap-1 transition shadow-2xs"
                        title="Trình chiếu Slide bài giảng tương tác"
                      >
                        <Presentation className="w-3.5 h-3.5 text-indigo-500 group-hover:text-inherit" />
                        <span className="hidden xl:inline">Chiếu</span>
                      </button>

                      {/* 2. Nút Vào Thi Nhanh */}
                      <button
                        type="button"
                        onClick={() => onSelectExam(exam, "exam")}
                        className="px-2 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-[11px] flex items-center gap-1 transition shadow-2xs border border-indigo-200/60"
                        title="Vào làm bài thi thử nghiệm hoặc kiểm tra"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-600 group-hover:text-inherit" />
                        <span className="hidden xl:inline">Thi</span>
                      </button>

                      {/* 3. Nút Thống Kê & Chấm Điểm */}
                      <button
                        type="button"
                        onClick={() => onSelectExam(exam, "analytics")}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 transition"
                        title="Xem thống kê phổ điểm & Chấm bài tự luận"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>

                      {/* 4. Menu Thao Tác Mở Rộng Toàn Bộ Chức Năng */}
                      <div className={`relative ${isMenuOpen ? "z-40" : ""}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuExamId(isMenuOpen ? null : exam.id);
                          }}
                          className={`p-1.5 rounded-lg border transition ${
                            isMenuOpen
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                          }`}
                          title="Tất cả chức năng & tác vụ mở rộng"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu Chức Năng Đầy Đủ */}
                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className={`absolute right-0 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10 ${
                              isNearBottom ? "bottom-full mb-2" : "top-full mt-2"
                            }`}
                          >
                            <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Tác Vụ Đề Thi: {exam.code}
                            </div>

                            {/* Trình chiếu */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                onSelectExam(exam, "presentation");
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition text-left"
                            >
                              <Presentation className="w-4 h-4 text-indigo-500" />
                              <span>Trình chiếu Slide bài giảng</span>
                            </button>

                            {/* Vào thi */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                onSelectExam(exam, "exam");
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition text-left"
                            >
                              <Edit className="w-4 h-4 text-indigo-600" />
                              <span>Vào làm bài thi (Thí sinh)</span>
                            </button>

                            {/* Phòng thi trực tiếp (Live) */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                onSelectExam(exam, "live");
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition text-left"
                            >
                              <Radio className="w-4 h-4 text-rose-500" />
                              <span>Phòng thi trực tuyến Realtime</span>
                            </button>

                            {/* Thống kê & Chấm điểm */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                onSelectExam(exam, "analytics");
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition text-left"
                            >
                              <BarChart2 className="w-4 h-4 text-emerald-600" />
                              <span>Phân tích phổ điểm & Chấm bài</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            {/* Hẹn giờ giao đề */}
                            {onOpenSchedule && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuExamId(null);
                                  onOpenSchedule(exam);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition text-left"
                              >
                                <Calendar className="w-4 h-4 text-amber-500" />
                                <span>Hẹn giờ giao đề & Phân lớp</span>
                              </button>
                            )}

                            {/* Khóa/Mở khóa đề */}
                            {onToggleLock && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuExamId(null);
                                  onToggleLock(exam);
                                }}
                                className={`w-full px-3 py-2 text-xs font-bold flex items-center gap-2.5 transition text-left ${
                                  exam.isLocked
                                    ? "text-emerald-700 hover:bg-emerald-50"
                                    : "text-rose-700 hover:bg-rose-50"
                                }`}
                              >
                                {exam.isLocked ? (
                                  <>
                                    <Unlock className="w-4 h-4 text-emerald-600" />
                                    <span>Mở khóa đề thi cho học sinh</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-4 h-4 text-rose-600" />
                                    <span>Khóa đề thi (Ngưng truy cập)</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Chỉnh sửa toàn diện */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                onEditMetadata(exam);
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition text-left"
                            >
                              <FileCode className="w-4 h-4 text-blue-600" />
                              <span>Chỉnh sửa nội dung & Cấu trúc</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            {/* Tải LaTeX (.tex) */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                handleDownloadLatex(exam);
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition text-left"
                            >
                              <Download className="w-4 h-4 text-indigo-500" />
                              <span>Tải mã nguồn LaTeX (.tex)</span>
                            </button>

                            {/* Tải Presentation HTML Offline */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                handleDownloadPresentationHtml(exam);
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 transition text-left"
                            >
                              <Globe className="w-4 h-4 text-sky-500" />
                              <span>Tải Slide HTML Offline</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            {/* Xóa đề */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuExamId(null);
                                if (
                                  confirm(
                                    `Bạn có chắc chắn muốn xóa đề thi "${exam.title}" (Mã: ${exam.code}) khỏi ngân hàng?`
                                  )
                                ) {
                                  onDeleteExam(exam.id);
                                }
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition text-left"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                              <span>Xóa vĩnh viễn đề thi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

