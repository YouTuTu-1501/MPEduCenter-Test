import React, { useState } from "react";
import { MathRenderer } from "./MathRenderer";
import { useToast } from "../context/ToastContext";
import confetti from "canvas-confetti";
import {
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  ArrowRight,
  HelpCircle,
  Check,
  Send,
} from "lucide-react";

export interface WrongQuestionItem {
  id: string;
  title: string;
  type: string;
  content: string;
  options?: Array<{ label: string; text: string; isCorrect: boolean }>;
  tfItems?: Array<{ label: string; text: string; isCorrect: boolean }>;
  correctAnswer?: string;
  explanation?: string;
  studentAnswer?: any;
  earnedScore?: number;
  maxScore?: number;
}

export interface RemedialQuestion {
  id: string;
  originalQuestionTitle: string;
  targetConcept: string;
  type: "single_choice" | "true_false" | "short_answer" | "essay";
  content: string;
  options?: Array<{ label: string; text: string; isCorrect: boolean }>;
  tfItems?: Array<{ label: string; text: string; isCorrect: boolean }>;
  correctAnswer: string;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  tips?: string;
}

export interface RemedialData {
  diagnostic: string;
  weakTopics: string[];
  remedialQuestions: RemedialQuestion[];
}

interface StudentRemedialSectionProps {
  examTitle: string;
  grade?: string;
  subject?: string;
  wrongQuestions: WrongQuestionItem[];
}

export const StudentRemedialSection: React.FC<StudentRemedialSectionProps> = ({
  examTitle,
  grade = "Lớp 12",
  subject = "Toán học",
  wrongQuestions,
}) => {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [remedialData, setRemedialData] = useState<RemedialData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái làm bài tương tác cho từng câu bổ trợ
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [checkedResults, setCheckedResults] = useState<
    Record<string, { isChecked: boolean; isCorrect: boolean; message: string }>
  >({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  // Gọi Gemini API để sinh câu hỏi tương tự & bài tập bổ trợ
  const handleGenerateRemedial = async () => {
    if (wrongQuestions.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/remedial-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examTitle,
          grade,
          subject,
          wrongQuestions,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Không thể tạo bài tập bổ trợ lúc này.");
      }

      const data: RemedialData = await res.json();
      setRemedialData(data);
      setUserAnswers({});
      setCheckedResults({});
      setRevealedExplanations({});

      toast.success(
        "Tạo bài tập bổ trợ thành công!",
        `Google Gemini đã phân tích ${wrongQuestions.length} câu làm sai và thiết kế ${
          data.remedialQuestions?.length || 0
        } bài tập tương tự để bạn rèn luyện.`
      );
    } catch (err: any) {
      console.error("Lỗi AI Remedial:", err);
      setError(err.message || "Đã xảy ra lỗi khi kết nối với Gemini AI.");
      toast.error("Lỗi tạo bài tập bổ trợ", err.message || "Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý chọn đáp án cho câu hỏi trắc nghiệm đơn
  const handleSelectOption = (qId: string, label: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: label,
    }));
  };

  // Xử lý chọn Đúng / Sai cho từng ý
  const handleSelectTF = (qId: string, itemIdx: number, val: boolean) => {
    setUserAnswers((prev) => {
      const cur = prev[qId] || {};
      return {
        ...prev,
        [qId]: {
          ...cur,
          [itemIdx]: val,
        },
      };
    });
  };

  // Xử lý kiểm tra đáp án của câu hỏi bổ trợ
  const handleCheckAnswer = (q: RemedialQuestion) => {
    const ans = userAnswers[q.id];
    let isCorrect = false;
    let message = "";

    if (q.type === "single_choice") {
      if (!ans) {
        toast.warning("Chưa chọn đáp án", "Vui lòng chọn 1 phương án trước khi kiểm tra.");
        return;
      }
      isCorrect =
        String(ans).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();
      message = isCorrect
        ? "Chính xác tuyệt vời! Bạn đã vượt qua câu hỏi tương tự này."
        : `Chưa chính xác. Đáp án chuẩn là ${q.correctAnswer}. Hãy đọc lời giải chi tiết bên dưới.`;
    } else if (q.type === "true_false") {
      const tfState = ans || {};
      if (!q.tfItems || q.tfItems.length === 0) {
        isCorrect = true;
      } else {
        let allAnswered = true;
        let allRight = true;
        q.tfItems.forEach((item, idx) => {
          if (tfState[idx] === undefined) allAnswered = false;
          if (tfState[idx] !== item.isCorrect) allRight = false;
        });

        if (!allAnswered) {
          toast.warning("Chưa hoàn thành", "Vui lòng chọn Đúng hoặc Sai cho tất cả các ý.");
          return;
        }
        isCorrect = allRight;
        message = isCorrect
          ? "Chính xác cả 4 ý Đúng / Sai! Kỹ năng đọc hiểu mệnh đề rất tốt."
          : "Một số ý chưa chính xác. Xem bảng đáp án và phân tích chi tiết bên dưới.";
      }
    } else if (q.type === "short_answer") {
      if (!ans || String(ans).trim() === "") {
        toast.warning("Chưa nhập đáp án", "Vui lòng điền kết quả vào ô trống.");
        return;
      }
      const cleanUser = String(ans).trim().replace(/\s+/g, "").replace(/,/g, ".");
      const cleanCorrect = String(q.correctAnswer).trim().replace(/\s+/g, "").replace(/,/g, ".");
      isCorrect = cleanUser === cleanCorrect;
      message = isCorrect
        ? "Chính xác! Kết quả tính toán chuẩn xác."
        : `Chưa khớp. Đáp án đúng là: ${q.correctAnswer}`;
    } else {
      // essay
      isCorrect = true;
      message = "Đã lưu câu trả lời tự luận. Hãy so sánh với barem lời giải mẫu bên dưới.";
    }

    if (isCorrect) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

    setCheckedResults((prev) => ({
      ...prev,
      [q.id]: {
        isChecked: true,
        isCorrect,
        message,
      },
    }));

    // Tự động mở lời giải chi tiết
    setRevealedExplanations((prev) => ({
      ...prev,
      [q.id]: true,
    }));
  };

  // Làm lại câu hỏi bổ trợ
  const handleResetQuestion = (qId: string) => {
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    setCheckedResults((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
  };

  // Sao chép danh sách bài tập bổ trợ
  const handleCopyRemedial = () => {
    if (!remedialData) return;
    const textLines = [
      `BÀI TẬP BỔ TRỢ TỰ ĐỘNG (GOOGLE GEMINI AI)`,
      `Đề kiểm tra: ${examTitle} - Môn: ${subject} (${grade})`,
      `Chẩn đoán: ${remedialData.diagnostic}`,
      `Chuyên đề cần củng cố: ${remedialData.weakTopics.join(", ")}`,
      "",
      ...remedialData.remedialQuestions.map((q, idx) => {
        let content = `Bài ${idx + 1} (Bổ trợ ${q.originalQuestionTitle} - ${q.targetConcept}):\n${q.content}\n`;
        if (q.options) {
          content += q.options.map((o) => `${o.label}. ${o.text}`).join("\n") + "\n";
        }
        if (q.tfItems) {
          content += q.tfItems.map((it) => `${it.label}) ${it.text} [${it.isCorrect ? "Đúng" : "Sai"}]`).join("\n") + "\n";
        }
        content += `Đáp án đúng: ${q.correctAnswer}\nLời giải: ${q.explanation}\n`;
        return content;
      }),
    ];

    navigator.clipboard.writeText(textLines.join("\n"));
    toast.success("Đã sao chép!", "Nội dung bài tập bổ trợ đã được sao chép vào bộ nhớ đệm.");
  };

  // In bài tập bổ trợ
  const handlePrintRemedial = () => {
    window.print();
  };

  return (
    <div
      id="gemini-remedial-section"
      className="my-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl border border-indigo-500/30 overflow-hidden relative"
    >
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-indigo-700/40">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
            <span>Trợ Lý Gia Sư Google Gemini</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>Bài Tập Bổ Trợ & Luyện Lại Lỗi Sai</span>
          </h3>
          <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed max-w-2xl">
            Hệ thống sử dụng AI Gemini phân tích các câu bạn đã làm sai, phát hiện lỗ hổng kiến thức
            và tự động biên soạn các câu hỏi tương đương theo chuẩn chương trình GDPT 2018 để bạn
            khắc phục ngay.
          </p>
        </div>

        {/* Nút hành động chính */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {wrongQuestions.length === 0 ? (
            <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Đạt điểm tối đa - Không có câu sai!</span>
            </div>
          ) : !remedialData ? (
            <button
              id="btn-generate-remedial"
              type="button"
              onClick={handleGenerateRemedial}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-purple-500/25 flex items-center gap-2 transition disabled:opacity-50"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>
                {isLoading ? "Gemini đang phân tích..." : `✨ Đề xuất bài tập bổ trợ (${wrongQuestions.length} câu sai)`}
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGenerateRemedial}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-indigo-800/80 hover:bg-indigo-700/80 text-white font-bold text-xs flex items-center gap-1.5 border border-indigo-600/50 transition"
                title="Tạo lại bộ câu hỏi khác"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isLoading ? "Đang tạo..." : "Tạo bài mới"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyRemedial}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                title="Sao chép câu hỏi và lời giải"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép</span>
              </button>

              <button
                type="button"
                onClick={handlePrintRemedial}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                title="In bài tập bổ trợ ra giấy"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In bài tập</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center relative">
            <Sparkles className="w-7 h-7 text-purple-300 animate-spin" />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-white">
              Google Gemini đang phân tích lỗ hổng kiến thức...
            </h4>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-md">
              AI đang rà soát từng bước biến đổi, xác định nguyên nhân sai và biên soạn 2-4 câu hỏi
              toán học tương đương chuẩn LaTeX.
            </p>
          </div>
        </div>
      )}

      {/* Báo lỗi nếu có */}
      {error && !isLoading && (
        <div className="my-4 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <b className="font-bold block">Không thể tạo câu hỏi bổ trợ lúc này:</b>
            <span className="opacity-90">{error}</span>
            <div className="mt-2">
              <button
                type="button"
                onClick={handleGenerateRemedial}
                className="px-3 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 font-bold text-[11px]"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hiển thị kết quả chẩn đoán và bài tập bổ trợ */}
      {remedialData && !isLoading && (
        <div className="mt-6 space-y-6 relative z-10">
          {/* Card Chẩn đoán của Gemini */}
          <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-purple-200">
                  Chẩn đoán năng lực & Lỗi sai từ Gemini:
                </h4>
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                  {remedialData.diagnostic}
                </p>

                {/* Các chuyên đề cần củng cố */}
                {remedialData.weakTopics && remedialData.weakTopics.length > 0 && (
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-indigo-300">
                      Chuyên đề cần rèn luyện:
                    </span>
                    {remedialData.weakTopics.map((topic, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 font-semibold text-xs"
                      >
                        🎯 {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danh sách các câu hỏi bổ trợ tương đương */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-indigo-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>
                  Danh sách bài tập tương đương rèn luyện ({remedialData.remedialQuestions.length}{" "}
                  câu):
                </span>
              </h4>
              <span className="text-[11px] text-indigo-300/80">
                Làm thử và bấm &quot;Kiểm tra đáp án&quot; để nhận phản hồi tức thì
              </span>
            </div>

            {remedialData.remedialQuestions.map((q, idx) => {
              const check = checkedResults[q.id];
              const isRevealed = revealedExplanations[q.id];
              const curAnswer = userAnswers[q.id];

              return (
                <div
                  key={q.id || idx}
                  className="p-5 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-md transition space-y-4"
                >
                  {/* Header câu hỏi bổ trợ */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-extrabold text-xs">
                        Bài Bổ Trợ #{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-semibold text-xs border border-purple-200">
                        Bổ trợ cho: {q.originalQuestionTitle}
                      </span>
                      {q.difficulty && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            q.difficulty === "easy"
                              ? "bg-emerald-100 text-emerald-800"
                              : q.difficulty === "hard"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {q.difficulty === "easy"
                            ? "Mức độ: Dễ"
                            : q.difficulty === "hard"
                            ? "Mức độ: Vận dụng"
                            : "Mức độ: Vừa sức"}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-500 font-semibold italic">
                      Dạng: {q.targetConcept}
                    </span>
                  </div>

                  {/* Nội dung đề bài chuẩn LaTeX */}
                  <div className="text-sm font-semibold text-slate-800 leading-relaxed">
                    <MathRenderer content={q.content} />
                  </div>

                  {/* Khu vực tương tác theo dạng câu hỏi */}
                  {q.type === "single_choice" && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {q.options.map((opt) => {
                        const isSelected = curAnswer === opt.label;
                        const isCorrectOption =
                          check?.isChecked &&
                          String(opt.label).toUpperCase() === String(q.correctAnswer).toUpperCase();
                        const isWrongSelected =
                          check?.isChecked &&
                          isSelected &&
                          String(opt.label).toUpperCase() !== String(q.correctAnswer).toUpperCase();

                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.label)}
                            className={`p-3 rounded-xl border text-left text-xs font-medium transition flex items-start gap-2.5 ${
                              isCorrectOption
                                ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold"
                                : isWrongSelected
                                ? "bg-rose-50 border-rose-400 text-rose-950"
                                : isSelected
                                ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-2xs"
                                : "bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-800"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isCorrectOption
                                  ? "bg-emerald-600 text-white"
                                  : isWrongSelected
                                  ? "bg-rose-600 text-white"
                                  : isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-white border border-slate-300 text-slate-700"
                              }`}
                            >
                              {opt.label}
                            </span>
                            <div className="pt-0.5 leading-relaxed">
                              <MathRenderer content={opt.text} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Dạng Đúng / Sai (true_false) */}
                  {q.type === "true_false" && q.tfItems && (
                    <div className="space-y-2 pt-2">
                      {q.tfItems.map((item, itemIdx) => {
                        const curItemVal = curAnswer ? curAnswer[itemIdx] : undefined;
                        const isChecked = check?.isChecked;
                        const isItemRight = isChecked && curItemVal === item.isCorrect;
                        const isItemWrong = isChecked && curItemVal !== undefined && curItemVal !== item.isCorrect;

                        return (
                          <div
                            key={item.label || itemIdx}
                            className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                              isItemRight
                                ? "bg-emerald-50/60 border-emerald-300"
                                : isItemWrong
                                ? "bg-rose-50/60 border-rose-300"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-slate-700 shrink-0">
                                {item.label})
                              </span>
                              <div className="font-medium text-slate-800">
                                <MathRenderer content={item.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleSelectTF(q.id, itemIdx, true)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  curItemVal === true
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                              >
                                Đúng
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectTF(q.id, itemIdx, false)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  curItemVal === false
                                    ? "bg-rose-600 text-white"
                                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                }`}
                              >
                                Sai
                              </button>
                              {isChecked && (
                                <span className="ml-1 text-[11px] font-bold">
                                  {isItemRight ? (
                                    <span className="text-emerald-600">✓ Chuẩn</span>
                                  ) : (
                                    <span className="text-rose-600">
                                      ✗ (Đáp án: {item.isCorrect ? "Đúng" : "Sai"})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Dạng Trả lời ngắn (short_answer) */}
                  {q.type === "short_answer" && (
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={curAnswer || ""}
                        onChange={(e) => handleSelectOption(q.id, e.target.value)}
                        placeholder="Nhập kết quả số hoặc phân số (ví dụ: 12 hoặc -3/4)..."
                        className="flex-1 py-2 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 font-bold text-xs text-slate-900 outline-none"
                      />
                      {check?.isChecked && (
                        <span className="text-xs font-bold text-slate-600">
                          Đáp án đúng: <b className="text-indigo-600">{q.correctAnswer}</b>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Thanh nút kiểm tra / làm lại */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCheckAnswer(q)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Kiểm tra đáp án</span>
                      </button>

                      {check?.isChecked && (
                        <button
                          type="button"
                          onClick={() => handleResetQuestion(q.id)}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Làm lại</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setRevealedExplanations((prev) => ({
                          ...prev,
                          [q.id]: !isRevealed,
                        }))
                      }
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                    >
                      <span>{isRevealed ? "Ẩn lời giải" : "💡 Xem lời giải chi tiết"}</span>
                      {isRevealed ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Thông báo kết quả kiểm tra */}
                  {check?.isChecked && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        check.isCorrect
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : "bg-rose-50 text-rose-900 border border-rose-200"
                      }`}
                    >
                      {check.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-bold">{check.message}</span>
                    </div>
                  )}

                  {/* Lời giải chi tiết & Mẹo giải nhanh */}
                  {isRevealed && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 animate-fadeIn">
                      <div>
                        <b className="text-blue-700 flex items-center gap-1 mb-1 font-bold">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          Lời giải chi tiết từng bước:
                        </b>
                        <div className="text-slate-700 leading-relaxed pl-1">
                          <MathRenderer content={q.explanation} />
                        </div>
                      </div>

                      {q.tips && (
                        <div className="pt-2 border-t border-slate-200/80">
                          <b className="text-purple-700 flex items-center gap-1 mb-0.5 font-bold">
                            <Target className="w-3.5 h-3.5 text-purple-600" />
                            Bí quyết tránh bẫy & Mẹo giải nhanh:
                          </b>
                          <p className="text-slate-600 italic pl-1">{q.tips}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
