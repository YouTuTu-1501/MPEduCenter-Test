import React, { useState } from "react";
import { Exam } from "../../types/exam";
import { checkExamAccessStatus } from "../../types/exam";
import { parseStandardExamCode } from "../../utils/examCodeHelper";
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
  Layers,
  FileCode,
  Bookmark,
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

  const handleCopyCode = (exam: Exam, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(exam.code);
    setCopiedCodeId(exam.id);
    toast.success("Đã sao chép mã đề", `Mã giao đề: ${exam.code}`);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Mã Đề</th>
              <th className="py-3 px-4">Tên Đề & Chuyên Đề</th>
              <th className="py-3 px-3">Khối / Lớp</th>
              <th className="py-3 px-3 text-center">Thời Lượng</th>
              <th className="py-3 px-3 text-center">Cấu Trúc Câu Hỏi</th>
              <th className="py-3 px-3 text-center">Trạng Thái</th>
              <th className="py-3 px-3 text-center">Lượt Nộp</th>
              <th className="py-3 px-4 text-right">Tác Vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {exams.map((exam) => {
              const accessStatus = checkExamAccessStatus(exam);
              const p1 = exam.questions.filter((q) => q.part === "part_1").length;
              const p2 = exam.questions.filter((q) => q.part === "part_2").length;
              const p3 = exam.questions.filter((q) => q.part === "part_3").length;
              const p4 = exam.questions.filter((q) => q.part === "part_4").length;
              const subs = submissionCountByExamId[exam.id] || submissionCountByExamId[exam.code] || 0;

              return (
                <tr
                  key={exam.id}
                  className="hover:bg-indigo-50/30 transition-colors group"
                >
                  {/* Cột 1: Mã Đề */}
                  <td className="py-3 px-4 whitespace-nowrap">
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
                  <td className="py-3 px-4 min-w-[220px]">
                    <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                      {exam.title}
                    </div>
                    {exam.chapter && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        <Bookmark className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{exam.chapter}</span>
                      </div>
                    )}
                  </td>

                  {/* Cột 3: Khối / Lớp */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${getGradeBadgeStyle(
                          exam.grade
                        )}`}
                      >
                        {exam.grade}
                      </span>
                      {exam.targetClass && exam.targetClass !== "Tất cả các lớp" && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                          Lớp: {exam.targetClass}
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
                      <span title="Phần I - 4 Lựa chọn">P1:{p1}</span>
                      <span className="text-slate-300">•</span>
                      <span title="Phần II - Đúng/Sai">P2:{p2}</span>
                      <span className="text-slate-300">•</span>
                      <span title="Phần III - Trả lời ngắn">P3:{p3}</span>
                      <span className="text-slate-300">•</span>
                      <span title="Phần IV - Tự luận" className="text-amber-700 font-black">
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

                  {/* Cột 8: Tác Vụ */}
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Trình chiếu */}
                      <button
                        type="button"
                        onClick={() => onSelectExam(exam, "presentation")}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition"
                        title="Trình chiếu Slide bài giảng"
                      >
                        <Presentation className="w-3.5 h-3.5" />
                      </button>

                      {/* Vào thi */}
                      <button
                        type="button"
                        onClick={() => onSelectExam(exam, "exam")}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 transition"
                        title="Vào làm bài thi thử nghiệm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Phân tích */}
                      <button
                        type="button"
                        onClick={() => onSelectExam(exam, "analytics")}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 transition"
                        title="Xem thống kê & Chấm điểm"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Hẹn giờ */}
                      {onOpenSchedule && (
                        <button
                          type="button"
                          onClick={() => onOpenSchedule(exam)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition"
                          title="Hẹn giờ giao đề thi"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Khóa/Mở */}
                      {onToggleLock && (
                        <button
                          type="button"
                          onClick={() => onToggleLock(exam)}
                          className={`p-1.5 rounded-lg transition ${
                            exam.isLocked
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          }`}
                          title={exam.isLocked ? "Mở khóa đề" : "Khóa đề"}
                        >
                          {exam.isLocked ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Sửa */}
                      <button
                        type="button"
                        onClick={() => onEditMetadata(exam)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Chỉnh sửa toàn diện đề thi"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>

                      {/* Tải file TeX */}
                      <button
                        type="button"
                        onClick={() => handleDownloadLatex(exam)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition"
                        title="Tải mã nguồn .tex"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Xóa */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa đề thi "${exam.title}"?`)) {
                            onDeleteExam(exam.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                        title="Xóa đề thi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
