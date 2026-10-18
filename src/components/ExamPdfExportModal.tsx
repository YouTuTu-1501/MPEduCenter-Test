import React, { useState, useRef, useEffect, useMemo } from "react";
import html2pdf from "html2pdf.js";
import { Exam, Question } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import { cleanQuestionContent } from "../utils/latexParser";
import { useToast } from "../context/ToastContext";
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle,
  Eye,
  Sliders,
  Settings,
  HelpCircle,
  Copy,
  BookOpen,
  School,
  FileCheck2,
} from "lucide-react";

interface ExamPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
}

type PrintMode = "student" | "teacher" | "key_only";
type FontSizeOption = "compact" | "standard" | "large";
type FontFamilyOption = "serif" | "sans";

export const ExamPdfExportModal: React.FC<ExamPdfExportModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const { toast } = useToast();
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  // Cấu hình xuất & in ấn
  const [printMode, setPrintMode] = useState<PrintMode>("student");
  const [fontSize, setFontSize] = useState<FontSizeOption>("standard");
  const [fontFamily, setFontFamily] = useState<FontFamilyOption>("serif");
  const [showScores, setShowScores] = useState<boolean>(true);
  const [showAnswerKeyTable, setShowAnswerKeyTable] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Thông tin tiêu đề trường học tùy chỉnh (lưu cache để giáo viên không cần gõ lại)
  const [schoolHeader, setSchoolHeader] = useState<string>(() => {
    return localStorage.getItem("edutest_pdf_school_header") || "SỞ GD&ĐT TP. HỒ CHÍ MINH\nTRƯỜNG THPT CHUYÊN";
  });
  const [examCategoryTitle, setExamCategoryTitle] = useState<string>(() => {
    return (
      localStorage.getItem("edutest_pdf_exam_category") ||
      "ĐỀ KIỂM TRA ĐỊNH KỲ NĂM HỌC 2024 - 2025"
    );
  });

  useEffect(() => {
    localStorage.setItem("edutest_pdf_school_header", schoolHeader);
  }, [schoolHeader]);

  useEffect(() => {
    localStorage.setItem("edutest_pdf_exam_category", examCategoryTitle);
  }, [examCategoryTitle]);

  // Phân loại câu hỏi theo các phần chuẩn GDPT 2018
  const { part1Questions, part2Questions, part3Questions, part4Questions } = useMemo(() => {
    const p1: Question[] = [];
    const p2: Question[] = [];
    const p3: Question[] = [];
    const p4: Question[] = [];

    (exam.questions || []).forEach((q) => {
      if (q.part === "part_1" || (!q.part && q.type === "single_choice")) {
        p1.push(q);
      } else if (q.part === "part_2" || (!q.part && q.type === "true_false")) {
        p2.push(q);
      } else if (q.part === "part_3" || (!q.part && q.type === "short_answer")) {
        p3.push(q);
      } else {
        p4.push(q);
      }
    });

    return {
      part1Questions: p1,
      part2Questions: p2,
      part3Questions: p3,
      part4Questions: p4,
    };
  }, [exam]);

  // Xử lý in trực tiếp qua trình duyệt với thiết lập A4 chuẩn
  const handleDirectPrint = () => {
    if (!printAreaRef.current) return;
    window.print();
  };

  // Xử lý xuất tệp PDF qua html2pdf.js
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsExportingPdf(true);
    toast.info(
      "Đang tạo tệp PDF...",
      "Hệ thống đang kết xuất các công thức toán KaTeX và đồ thị sang PDF chất lượng cao."
    );

    try {
      const element = printAreaRef.current;
      const cleanExamTitle = exam.title.replace(/[/\\?%*:|"<>]/g, "_");
      const modeSuffix =
        printMode === "student" ? "DeThi" : printMode === "teacher" ? "DeKemLoiGiai" : "BangDapAn";
      const filename = `${exam.code}_${cleanExamTitle}_${modeSuffix}.pdf`;

      const opt: any = {
        margin: [10, 10, 12, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".avoid-page-break", ".pdf-question-card", ".answer-key-box"],
        },
      };

      await (html2pdf() as any).from(element).set(opt).save();

      toast.success(
        "Xuất file PDF thành công!",
        `Tệp "${filename}" đã được tải về máy của bạn.`
      );
    } catch (err: any) {
      console.error("Lỗi xuất PDF:", err);
      toast.error(
        "Lỗi xuất PDF",
        err?.message || "Không thể tạo file PDF. Bạn có thể sử dụng nút 'In đề thi ngay' và chọn 'Lưu dưới dạng PDF'."
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  // Lớp CSS cho kích thước và phông chữ
  const fontClass =
    fontFamily === "serif"
      ? "font-serif font-['Times_New_Roman',_Times,_serif]"
      : "font-sans font-['Plus_Jakarta_Sans',_system-ui,_sans-serif]";

  const fontSizeClass =
    fontSize === "compact"
      ? "text-[12px] leading-relaxed"
      : fontSize === "large"
      ? "text-[14.5px] leading-loose"
      : "text-[13px] leading-relaxed";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-100 rounded-3xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ================= MODAL HEADER & CONTROLS ================= */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-slate-900 line-clamp-1">
                  Xuất Đề Thi PDF & In Ấn: {exam.title}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black text-xs">
                  {exam.code}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Chuẩn định dạng A4 GDPT 2018 Bộ GD&ĐT • Giữ nguyên tuyệt đối công thức LaTeX & đồ thị TikZ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Mở hộp thoại in ấn của hệ điều hành (Ctrl + P)"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>In đề thi ngay (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-200"
              title="Tải tệp tin .pdf về máy tính"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? "Đang kết xuất..." : "Tải file PDF (.pdf)"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= OPTIONS TOOLBAR ================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 no-print">
          {/* Chế độ in */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Chế độ xuất:
            </span>
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 border border-slate-300">
              <button
                type="button"
                onClick={() => setPrintMode("student")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  printMode === "student"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📝 Đề thi học sinh
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("teacher")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  printMode === "teacher"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💡 Đề + Lời giải chi tiết
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("key_only")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  printMode === "key_only"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📊 Bảng đáp án nhanh
              </button>
            </div>
          </div>

          {/* Tùy chỉnh hiển thị */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Cỡ chữ */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Cỡ chữ:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as FontSizeOption)}
                className="py-1 px-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 outline-none"
              >
                <option value="compact">Gọn nhẹ (12pt)</option>
                <option value="standard">Chuẩn Bộ GD (13pt)</option>
                <option value="large">Rộng rãi (14.5pt)</option>
              </select>
            </div>

            {/* Phông chữ */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Phông chữ:</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as FontFamilyOption)}
                className="py-1 px-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 outline-none"
              >
                <option value="serif">Times New Roman (Serif chuẩn)</option>
                <option value="sans">Sans-Serif (Hiện đại)</option>
              </select>
            </div>

            {/* Checkboxes */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold select-none">
              <input
                type="checkbox"
                checked={showScores}
                onChange={(e) => setShowScores(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Hiện điểm câu</span>
            </label>

            {printMode !== "key_only" && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={showAnswerKeyTable}
                  onChange={(e) => setShowAnswerKeyTable(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Kèm bảng đáp án ở cuối</span>
              </label>
            )}
          </div>
        </div>

        {/* ================= LIVE PREVIEW & PRINTABLE CONTAINER ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/70">
          {/* Khổ giấy A4 Preview */}
          <div
            ref={printAreaRef}
            id="exam-pdf-printable-document"
            className={`w-full max-w-[850px] min-h-[1120px] bg-white text-black p-8 sm:p-12 shadow-xl rounded-sm border border-slate-300 ${fontClass} ${fontSizeClass}`}
            style={{
              boxSizing: "border-box",
            }}
          >
            {/* ========== TRANG IN: HEADER ĐỀ THI TIÊU CHUẨN BỘ GD&ĐT ========== */}
            <div className="border-b-2 border-black pb-4 mb-6 avoid-page-break">
              <div className="grid grid-cols-12 gap-4 items-start">
                {/* Cột trái: Đơn vị & Mã đề */}
                <div className="col-span-5 text-center space-y-1">
                  <div className="font-bold text-[13px] uppercase tracking-wide whitespace-pre-line leading-tight">
                    {schoolHeader}
                  </div>
                  <div className="text-[12px] font-semibold text-slate-800">
                    TỔ CHUYÊN MÔN TOÁN
                  </div>
                  <div className="pt-2">
                    <div className="inline-block border-2 border-black px-4 py-1 font-bold text-[13px] bg-slate-50 uppercase">
                      MÃ ĐỀ THI: {exam.code}
                    </div>
                  </div>
                </div>

                {/* Cột phải: Kỳ thi & Môn học */}
                <div className="col-span-7 text-center space-y-1">
                  <div className="font-bold text-[13px] uppercase tracking-wide leading-tight">
                    {examCategoryTitle}
                  </div>
                  <div className="font-extrabold text-[15px] uppercase tracking-wide text-black leading-tight pt-0.5">
                    MÔN: {exam.subject || "TOÁN HỌC"} - {exam.grade.toUpperCase()}
                  </div>
                  <div className="text-[12px] italic text-slate-800">
                    Thời gian làm bài: <b>{exam.durationMinutes || 90} phút</b> (không kể thời gian phát đề)
                  </div>
                  <div className="text-[11px] text-slate-600 pt-0.5">
                    (Đề thi gồm <b>{exam.questions.length}</b> câu hỏi trắc nghiệm & tự luận)
                  </div>
                </div>
              </div>

              {/* Thông tin thí sinh (ở chế độ học sinh) */}
              {printMode === "student" && (
                <div className="mt-4 pt-3 border-t border-dashed border-slate-400 grid grid-cols-12 gap-3 text-[12px]">
                  <div className="col-span-7">
                    Họ và tên thí sinh: .......................................................................................
                  </div>
                  <div className="col-span-5">
                    Số báo danh: .................................................
                  </div>
                  <div className="col-span-4">
                    Lớp: .........................................
                  </div>
                  <div className="col-span-8">
                    Phòng thi: .................................................................................................
                  </div>
                </div>
              )}

              {/* Bảng chấm điểm dành cho giáo viên */}
              {printMode === "student" && (
                <div className="mt-3 border border-black p-2 bg-slate-50/50 flex items-center justify-between text-center text-[11px] font-semibold">
                  <div className="w-1/3 border-r border-black pr-2">
                    <div className="text-slate-600">ĐIỂM SỐ</div>
                    <div className="h-7"></div>
                  </div>
                  <div className="w-2/3 pl-2 text-left">
                    <div className="text-slate-600 text-center font-bold">NHẬN XÉT CỦA GIÁM KHẢO</div>
                    <div className="h-7"></div>
                  </div>
                </div>
              )}
            </div>

            {/* ========== CHẾ ĐỘ CHỈ XUẤT BẢNG ĐÁP ÁN ========== */}
            {printMode === "key_only" ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="font-extrabold text-base uppercase text-black">
                    BẢNG ĐÁP ÁN VÀ THANG ĐIỂM CHUẨN
                  </h3>
                  <p className="text-xs italic text-slate-600">
                    Áp dụng cho Mã đề: <b>{exam.code}</b> • {exam.title}
                  </p>
                </div>
                <AnswerKeySummaryTable exam={exam} />
              </div>
            ) : (
              /* ========== NỘI DUNG ĐỀ THI (4 PHẦN CHUẨN BỘ GD&ĐT) ========== */
              <div className="space-y-6">
                {/* PHẦN I: TRẮC NGHIỆM 4 PHƯƠNG ÁN */}
                {part1Questions.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-slate-100 p-2 border-l-4 border-black font-bold text-[13.5px] uppercase tracking-wide">
                      PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn
                    </div>
                    <p className="italic text-[12px] text-slate-700">
                      Thí sinh trả lời từ câu 1 đến câu {part1Questions.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
                    </p>

                    <div className="space-y-5">
                      {part1Questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="pdf-question-card avoid-page-break pt-1 space-y-2 border-b border-slate-100 pb-3"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold whitespace-nowrap">
                              Câu {idx + 1}.
                              {showScores && (
                                <span className="text-[11px] font-normal text-slate-600 ml-1">
                                  ({q.score || 0.25}đ)
                                </span>
                              )}
                            </span>
                            <div className="flex-1">
                              <MathRenderer content={cleanQuestionContent(q.content || "")} />
                            </div>
                          </div>

                          {/* 4 phương án lựa chọn A, B, C, D */}
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 pl-4">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = opt.isCorrect || q.correctAnswer === opt.label;
                                const showHighlight = printMode === "teacher" && isCorrect;

                                return (
                                  <div
                                    key={oIdx}
                                    className={`flex items-start gap-1.5 p-1 rounded ${
                                      showHighlight
                                        ? "bg-emerald-50 text-emerald-950 font-bold border border-emerald-400"
                                        : ""
                                    }`}
                                  >
                                    <span
                                      className={`font-bold inline-block min-w-5 ${
                                        showHighlight ? "text-emerald-700 underline" : ""
                                      }`}
                                    >
                                      {opt.label}.
                                    </span>
                                    <div className="flex-1">
                                      <MathRenderer content={opt.text} />
                                    </div>
                                    {showHighlight && (
                                      <span className="text-emerald-600 text-xs font-black">✓</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Lời giải chi tiết (ở chế độ giáo viên) */}
                          {printMode === "teacher" && q.explanation && (
                            <div className="mt-2.5 p-3 bg-amber-50/70 border-l-2 border-amber-500 text-[12px] rounded-r-md">
                              <div className="font-bold text-amber-900 mb-1 flex items-center gap-1">
                                <span>💡 Lời giải chi tiết:</span>
                                {q.correctAnswer && (
                                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[11px] font-mono font-bold">
                                    Đáp án đúng: {q.correctAnswer}
                                  </span>
                                )}
                              </div>
                              <MathRenderer content={cleanQuestionContent(q.explanation)} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PHẦN II: TRẮC NGHIỆM ĐÚNG SAI */}
                {part2Questions.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-300">
                    <div className="bg-slate-100 p-2 border-l-4 border-black font-bold text-[13.5px] uppercase tracking-wide">
                      PHẦN II. Câu trắc nghiệm đúng sai
                    </div>
                    <p className="italic text-[12px] text-slate-700">
                      Thí sinh trả lời từ câu 1 đến câu {part2Questions.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
                    </p>

                    <div className="space-y-5">
                      {part2Questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="pdf-question-card avoid-page-break pt-1 space-y-2 border-b border-slate-100 pb-3"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold whitespace-nowrap">
                              Câu {idx + 1}.
                              {showScores && (
                                <span className="text-[11px] font-normal text-slate-600 ml-1">
                                  ({q.score || 1.0}đ)
                                </span>
                              )}
                            </span>
                            <div className="flex-1">
                              <MathRenderer content={cleanQuestionContent(q.content || "")} />
                            </div>
                          </div>

                          {/* 4 Mệnh đề a), b), c), d) */}
                          {q.tfItems && q.tfItems.length > 0 && (
                            <div className="pl-4 space-y-1.5 pt-1">
                              {q.tfItems.map((item, tIdx) => {
                                const isCorrectTrue = item.isCorrect;
                                return (
                                  <div
                                    key={tIdx}
                                    className="flex items-start justify-between gap-3 text-[12.5px] py-0.5"
                                  >
                                    <div className="flex items-start gap-1.5 flex-1">
                                      <span className="font-bold min-w-6">{item.label})</span>
                                      <div className="flex-1">
                                        <MathRenderer content={item.text} />
                                      </div>
                                    </div>

                                    {/* Cột Đúng / Sai */}
                                    <div className="shrink-0 flex items-center gap-2">
                                      {printMode === "teacher" ? (
                                        <span
                                          className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                                            isCorrectTrue
                                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                              : "bg-rose-100 text-rose-800 border border-rose-300"
                                          }`}
                                        >
                                          {isCorrectTrue ? "ĐÚNG" : "SAI"}
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                                          <span>[  ] Đúng</span>
                                          <span>[  ] Sai</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Lời giải chi tiết */}
                          {printMode === "teacher" && q.explanation && (
                            <div className="mt-2.5 p-3 bg-amber-50/70 border-l-2 border-amber-500 text-[12px] rounded-r-md">
                              <div className="font-bold text-amber-900 mb-1">
                                💡 Lời giải chi tiết:
                              </div>
                              <MathRenderer content={cleanQuestionContent(q.explanation)} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PHẦN III: TRẢ LỜI NGẮN */}
                {part3Questions.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-300">
                    <div className="bg-slate-100 p-2 border-l-4 border-black font-bold text-[13.5px] uppercase tracking-wide">
                      PHẦN III. Câu trắc nghiệm trả lời ngắn
                    </div>
                    <p className="italic text-[12px] text-slate-700">
                      Thí sinh trả lời từ câu 1 đến câu {part3Questions.length}.
                    </p>

                    <div className="space-y-5">
                      {part3Questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="pdf-question-card avoid-page-break pt-1 space-y-2 border-b border-slate-100 pb-3"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold whitespace-nowrap">
                              Câu {idx + 1}.
                              {showScores && (
                                <span className="text-[11px] font-normal text-slate-600 ml-1">
                                  ({q.score || 0.5}đ)
                                </span>
                              )}
                            </span>
                            <div className="flex-1">
                              <MathRenderer content={cleanQuestionContent(q.content || "")} />
                            </div>
                          </div>

                          {/* Ô đáp số cho học sinh / đáp án cho giáo viên */}
                          <div className="pl-4 pt-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[12px]">Đáp số:</span>
                              {printMode === "teacher" && q.correctAnswer ? (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 font-mono font-bold text-[13px] rounded">
                                  {q.correctAnswer}
                                </span>
                              ) : (
                                <span className="inline-block border-b-2 border-dotted border-black w-36 h-6"></span>
                              )}
                            </div>
                          </div>

                          {/* Lời giải chi tiết */}
                          {printMode === "teacher" && q.explanation && (
                            <div className="mt-2.5 p-3 bg-amber-50/70 border-l-2 border-amber-500 text-[12px] rounded-r-md">
                              <div className="font-bold text-amber-900 mb-1">
                                💡 Lời giải chi tiết:
                              </div>
                              <MathRenderer content={cleanQuestionContent(q.explanation)} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PHẦN IV: TỰ LUẬN (NẾU CÓ) */}
                {part4Questions.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-300">
                    <div className="bg-slate-100 p-2 border-l-4 border-black font-bold text-[13.5px] uppercase tracking-wide">
                      PHẦN IV. Câu hỏi tự luận
                    </div>

                    <div className="space-y-6">
                      {part4Questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="pdf-question-card avoid-page-break pt-1 space-y-2 border-b border-slate-100 pb-4"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold whitespace-nowrap">
                              Câu {idx + 1}.
                              {showScores && (
                                <span className="text-[11px] font-normal text-slate-600 ml-1">
                                  ({q.score || 2.0}đ)
                                </span>
                              )}
                            </span>
                            <div className="flex-1">
                              <MathRenderer content={cleanQuestionContent(q.content || "")} />
                            </div>
                          </div>

                          {/* Không gian làm bài của học sinh */}
                          {printMode === "student" && (
                            <div className="mt-3 pl-4 border border-dashed border-slate-300 rounded p-4 text-center text-slate-400 text-xs italic min-h-[90px] flex items-center justify-center">
                              (Thí sinh trình bày bài làm tự luận vào khoảng trống hoặc tờ giấy thi)
                            </div>
                          )}

                          {/* Hướng dẫn giải & thang điểm chi tiết */}
                          {printMode === "teacher" && q.explanation && (
                            <div className="mt-2.5 p-3 bg-amber-50/70 border-l-2 border-amber-500 text-[12px] rounded-r-md">
                              <div className="font-bold text-amber-900 mb-1">
                                💡 Hướng dẫn chấm & Lời giải:
                              </div>
                              <MathRenderer content={cleanQuestionContent(q.explanation)} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chân trang kết thúc đề thi */}
                <div className="pt-6 text-center text-[12px] font-bold text-slate-700 border-t-2 border-black avoid-page-break">
                  ---------- HẾT ----------
                  <p className="text-[11px] font-normal italic text-slate-500 pt-1">
                    Cán bộ coi thi không giải thích gì thêm. Thí sinh không được sử dụng tài liệu ngoài danh mục quy định.
                  </p>
                </div>

                {/* BẢNG ĐÁP ÁN TỔNG HỢP Ở CUỐI ĐỀ (NẾU ĐƯỢC CHỌN) */}
                {showAnswerKeyTable && (
                  <div className="pt-8 mt-8 border-t-2 border-dashed border-slate-400 avoid-page-break space-y-3">
                    <div className="text-center">
                      <h4 className="font-bold text-[13px] uppercase tracking-wider text-black">
                        BẢNG ĐÁP ÁN THAM KHẢO (MÃ ĐỀ: {exam.code})
                      </h4>
                    </div>
                    <AnswerKeySummaryTable exam={exam} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Mẹo in ấn:</span>
            <span>
              Để có bản in sắc nét nhất, chọn cỡ giấy <b>A4</b> và tỉ lệ <b>100% (Default)</b> trong hộp thoại In.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>In trực tiếp (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component Bảng đáp án tổng hợp nhanh cho đề thi
const AnswerKeySummaryTable: React.FC<{ exam: Exam }> = ({ exam }) => {
  const p1 = (exam.questions || []).filter((q) => q.part === "part_1" || q.type === "single_choice");
  const p2 = (exam.questions || []).filter((q) => q.part === "part_2" || q.type === "true_false");
  const p3 = (exam.questions || []).filter((q) => q.part === "part_3" || q.type === "short_answer");

  return (
    <div className="space-y-4 text-[12px] font-sans">
      {/* Phần 1 */}
      {p1.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-bold text-slate-900">
            PHẦN I: Trắc nghiệm 4 lựa chọn ({p1.length} câu)
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1 text-center">
            {p1.map((q, idx) => (
              <div key={idx} className="border border-slate-300 rounded p-1 bg-slate-50">
                <div className="text-[10px] text-slate-500 font-semibold">{idx + 1}</div>
                <div className="font-bold text-indigo-700 text-xs">
                  {q.correctAnswer || (q.options?.find((o) => o.isCorrect)?.label) || "?"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phần 2 */}
      {p2.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-bold text-slate-900">
            PHẦN II: Trắc nghiệm Đúng/Sai ({p2.length} câu)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {p2.map((q, idx) => (
              <div key={idx} className="border border-slate-300 rounded p-1.5 bg-slate-50 text-[11px]">
                <div className="font-bold text-slate-700 text-center border-b border-slate-200 pb-0.5 mb-1">
                  Câu {idx + 1}
                </div>
                <div className="grid grid-cols-4 gap-0.5 text-center font-bold">
                  {(q.tfItems || []).map((item, iIdx) => (
                    <span
                      key={iIdx}
                      className={item.isCorrect ? "text-emerald-700" : "text-rose-700"}
                      title={`Ý ${item.label}: ${item.isCorrect ? "Đúng" : "Sai"}`}
                    >
                      {item.label}: {item.isCorrect ? "Đ" : "S"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phần 3 */}
      {p3.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-bold text-slate-900">
            PHẦN III: Trả lời ngắn ({p3.length} câu)
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-1.5 text-center">
            {p3.map((q, idx) => (
              <div key={idx} className="border border-slate-300 rounded p-1 bg-slate-50">
                <div className="text-[10px] text-slate-500 font-semibold">Câu {idx + 1}</div>
                <div className="font-mono font-bold text-indigo-700 text-xs truncate" title={q.correctAnswer}>
                  {q.correctAnswer || "---"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
