import React, { useState, useEffect, useRef, useCallback } from "react";
import { Exam, Question } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import { DrawingCanvas } from "./DrawingCanvas";
import { InteractiveFigureViewer } from "./InteractiveFigureViewer";
import { cleanQuestionContent } from "../utils/latexParser";
import { preprocessTikzInLatex } from "../utils/tikzProcessor";
import { playSound } from "../utils/audio";
import { normalizeShortAnswer } from "../utils/scoring";
import {
  ZoomIn,
  ZoomOut,
  Clock,
  PenTool,
  Eraser,
  Trash2,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lightbulb,
  CheckCircle2,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";

interface PresentationViewProps {
  exam: Exam;
  onExit: () => void;
  initialQuestionIndex?: number;
}

export const PresentationView: React.FC<PresentationViewProps> = ({
  exam,
  onExit,
  initialQuestionIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialQuestionIndex);
  const [fontSizeDelta, setFontSizeDelta] = useState(0);

  // Trạng thái vẽ
  const [drawTool, setDrawTool] = useState<"pen" | "eraser" | "none">("none");
  const [penColor, setPenColor] = useState<string>("#ef4444");

  // Trạng thái Timer
  const [timerDuration, setTimerDuration] = useState<number>(60);
  const [timerRemaining, setTimerRemaining] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showTimerModal, setShowTimerModal] = useState<boolean>(false);
  const [timerModalInput, setTimerModalInput] = useState<string>("01:00");
  const [timerModalError, setTimerModalError] = useState<string>("");

  // Trạng thái tương tác với câu hỏi hiện tại
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedTF, setSelectedTF] = useState<Record<string, boolean>>({});
  const [shortInput, setShortInput] = useState<string>("");
  const [shortChecked, setShortChecked] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Popup thông báo vui nhộn
  const [feedbackPopup, setFeedbackPopup] = useState<{
    show: boolean;
    isCorrect: boolean;
    text: string;
    emoji: string;
  } | null>(null);

  // Toàn màn hình
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentQ: Question | undefined = exam.questions[currentIndex];

  const positiveMessages = ["Xuất sắc!", "Chính xác 100%!", "Quá đỉnh!", "Tuyệt vời!", "10 Điểm!"];
  const encouragementMessages = ["Cố lên nhé!", "Chưa chính xác!", "Hãy thử lại!", "Suýt đúng rồi!"];

  const showFeedback = (isCorrect: boolean) => {
    const list = isCorrect ? positiveMessages : encouragementMessages;
    const randomMsg = list[Math.floor(Math.random() * list.length)];
    const emoji = isCorrect ? "🎉" : "💪";
    setFeedbackPopup({ show: true, isCorrect, text: randomMsg, emoji });
    setTimeout(() => {
      setFeedbackPopup(null);
    }, 1600);
  };

  // Format giây -> mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Parse chuỗi mm:ss -> số giây
  const parseTimeString = (str: string): number | null => {
    const trimmed = str.trim();
    if (/^\d{1,3}:\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split(":");
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (s < 60) return m * 60 + s;
    }
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 0) return num;
    return null;
  };

  // Đổi câu hỏi
  const goToQuestion = useCallback(
    (index: number) => {
      if (index < 0 || index >= exam.questions.length) return;
      setCurrentIndex(index);
      setSelectedOption(null);
      setSelectedTF({});
      setShortInput("");
      setShortChecked(null);
      setRevealed(false);
      setShowExplanation(false);

      // Reset timer về mặc định của câu
      setIsTimerRunning(false);
      setTimerRemaining(timerDuration);

      // Xóa nét vẽ cũ nếu cần
      if ((window as any).__clearSlideDrawing) {
        (window as any).__clearSlideDrawing();
      }
    },
    [exam.questions.length, timerDuration]
  );

  const nextQuestion = () => goToQuestion(currentIndex + 1);
  const prevQuestion = () => goToQuestion(currentIndex - 1);

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 6 && prev > 1) {
            playSound("tick");
          }
          if (prev <= 1) {
            setIsTimerRunning(false);
            playSound("timeup");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerRemaining]);

  // Phím tắt mũi tên trái/phải
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight") nextQuestion();
      if (e.key === "ArrowLeft") prevQuestion();
      if (e.key === "Escape" && showTimerModal) setShowTimerModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, showTimerModal]);

  // Toggle Toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Áp dụng Timer từ Modal
  const applyTimer = (applyAll: boolean) => {
    const parsed = parseTimeString(timerModalInput);
    if (!parsed || parsed <= 0) {
      setTimerModalError("Vui lòng nhập đúng định dạng mm:ss (ví dụ: 01:30 hoặc 05:00)");
      return;
    }
    setTimerDuration(parsed);
    setTimerRemaining(parsed);
    setIsTimerRunning(false);
    setShowTimerModal(false);
    setTimerModalError("");
  };

  if (!currentQ) return null;

  return (
    <div
      ref={containerRef}
      id="presentation-container"
      className="relative w-full min-h-screen bg-[#0f172a] flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto"
    >
      {/* Khung Slide chính Bento */}
      <div
        id="slide-card-main"
        className="relative w-full max-w-[1500px] min-h-[calc(100vh-24px)] bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col p-4 sm:p-7 text-slate-900 my-auto"
      >
        {/* Header điều khiển Bento */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200 z-30">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              id="part-badge-display"
              className="px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs sm:text-sm uppercase tracking-wider border border-indigo-100"
            >
              {currentQ.partName}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
              {exam.grade}
            </span>
            {exam.chapter && (
              <span className="hidden md:inline px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 font-medium text-xs border border-slate-200 truncate max-w-[260px]" title={exam.chapter}>
                {exam.chapter}
              </span>
            )}
            <span className="text-xs sm:text-sm font-semibold text-slate-400">
              Mã: {exam.code}
            </span>
          </div>

          {/* Công cụ tiện ích: Cỡ chữ, Bút vẽ, Timer, Fullscreen, Thoát */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Phóng to / thu nhỏ chữ */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                id="btn-font-decrease"
                type="button"
                onClick={() => setFontSizeDelta((prev) => Math.max(-6, prev - 2))}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white font-bold text-xs shadow-xs transition"
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <button
                id="btn-font-increase"
                type="button"
                onClick={() => setFontSizeDelta((prev) => Math.min(10, prev + 2))}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-white font-bold text-xs shadow-xs transition"
                title="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>

            {/* Công cụ vẽ / Cục tẩy */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
              <button
                id="btn-tool-pen"
                type="button"
                onClick={() => setDrawTool((prev) => (prev === "pen" ? "none" : "pen"))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  drawTool === "pen"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-white"
                }`}
                title="Bút vẽ trực tiếp"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vẽ</span>
              </button>

              <button
                id="btn-tool-eraser"
                type="button"
                onClick={() => setDrawTool((prev) => (prev === "eraser" ? "none" : "eraser"))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  drawTool === "eraser"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-700 hover:bg-white"
                }`}
                title="Cục tẩy"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tẩy</span>
              </button>

              {/* Bảng chọn màu */}
              {drawTool === "pen" && (
                <div className="flex items-center gap-1 pl-1">
                  {[
                    { color: "#4f46e5", title: "Indigo" },
                    { color: "#ef4444", title: "Đỏ" },
                    { color: "#10b981", title: "Xanh lá" },
                    { color: "#f59e0b", title: "Vàng" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setPenColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-5 h-5 rounded-full border-2 transition ${
                        penColor === c.color ? "border-slate-900 scale-110" : "border-white"
                      }`}
                      title={c.title}
                    />
                  ))}
                </div>
              )}

              <button
                id="btn-tool-clear"
                type="button"
                onClick={() => {
                  if ((window as any).__clearSlideDrawing) {
                    (window as any).__clearSlideDrawing();
                  }
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-white transition"
                title="Xóa toàn bộ nét vẽ"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cài đặt thời gian mm:ss Modal */}
            <button
              id="btn-timer-modal-open"
              type="button"
              onClick={() => {
                setTimerModalInput(formatTime(timerDuration));
                setShowTimerModal(true);
              }}
              className="w-9 h-9 rounded-2xl flex items-center justify-center bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200 font-bold transition shadow-xs"
              title="Thiết lập thời gian câu hỏi"
            >
              <Clock className="w-4 h-4 text-indigo-600" />
            </button>

            {/* Nút bấm giờ chạy / dừng */}
            <button
              id="btn-timer-toggle"
              type="button"
              onClick={() => setIsTimerRunning((prev) => !prev)}
              className={`px-4 py-1.5 rounded-full font-bold text-xs border flex items-center gap-1.5 transition shadow-xs ${
                isTimerRunning
                  ? "bg-red-50 text-red-700 border-red-300 animate-pulse"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              }`}
              title="Click để Chạy / Tạm dừng đồng hồ"
            >
              <span>⏳</span>
              <span>{isTimerRunning ? formatTime(timerRemaining) : `Bắt đầu (${formatTime(timerRemaining)})`}</span>
            </button>

            {/* Toàn màn hình */}
            <button
              id="btn-fullscreen-toggle"
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-2xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              title="Chế độ toàn màn hình"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Nút Thoát */}
            <button
              id="btn-presentation-exit"
              type="button"
              onClick={onExit}
              className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
              title="Thoát trình chiếu"
            >
              <X className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* Nội dung câu hỏi và khu vực tương tác */}
        <div
          id="slide-content-scroll"
          className="flex-grow overflow-y-auto pr-2 relative z-10"
          style={{ fontSize: `${24 + fontSizeDelta}px` }}
        >
          {/* Tiêu đề và nội dung câu hỏi */}
          <div className="font-semibold text-slate-800 leading-relaxed text-justify mb-4">
            <span
              id="question-badge-label"
              className="inline-flex items-center justify-center px-3.5 py-1 mr-2 rounded-full text-white font-extrabold text-sm sm:text-base shadow-sm bg-gradient-to-r from-amber-500 to-orange-500"
            >
              {currentQ.title}:
            </span>
            <MathRenderer content={preprocessTikzInLatex(cleanQuestionContent(currentQ.content))} inline />
          </div>

          {/* Ảnh minh họa nếu có */}
          {currentQ.image && (
            <InteractiveFigureViewer
              src={currentQ.image}
              alt="Hình minh họa đề bài"
              caption="Hình vẽ minh họa đề bài • Dùng thanh công cụ hoặc cuộn chuột để Phóng to / Thu nhỏ"
              className="my-4 max-w-2xl mx-auto"
            />
          )}

          {/* Dạng 1: Trắc nghiệm 4 lựa chọn */}
          {currentQ.type === "single_choice" && currentQ.options && (
            <div
              id="mc-options-grid"
              className={`grid gap-3.5 my-4 ${
                currentQ.options.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {currentQ.options.map((opt) => {
                const isSelected = selectedOption === opt.label;
                const isCorrectOpt = opt.isCorrect;
                const showAsCorrect = revealed && isCorrectOpt;
                const showAsWrong = isSelected && !isCorrectOpt;

                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setSelectedOption(opt.label);
                      if (opt.isCorrect) {
                        playSound("correct");
                        showFeedback(true);
                      } else {
                        playSound("wrong");
                        showFeedback(false);
                      }
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left font-semibold flex items-center gap-3.5 transition transform active:scale-98 shadow-sm ${
                      showAsCorrect || (isSelected && isCorrectOpt)
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-emerald-100"
                        : showAsWrong
                        ? "bg-red-50 border-red-400 text-red-900"
                        : "bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm ${
                        showAsCorrect || (isSelected && isCorrectOpt)
                          ? "bg-emerald-600"
                          : showAsWrong
                          ? "bg-red-600"
                          : "bg-gradient-to-br from-emerald-500 to-green-600"
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="flex-1 text-slate-800">
                      <MathRenderer content={preprocessTikzInLatex(opt.text)} inline />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Dạng 2: Đúng / Sai 4 ý */}
          {currentQ.type === "true_false" && currentQ.tfItems && (
            <div id="tf-items-list" className="flex flex-col gap-3 my-4">
              {currentQ.tfItems.map((item) => {
                const userChoice = selectedTF[item.label];
                const isUserCorrect = userChoice !== undefined && userChoice === item.isCorrect;
                const isUserWrong = userChoice !== undefined && userChoice !== item.isCorrect;

                return (
                  <div
                    key={item.label}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-b from-white to-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <div className="flex-1 font-semibold text-slate-800">
                      <span className="font-extrabold text-blue-700 mr-2">{item.label})</span>
                      <MathRenderer content={preprocessTikzInLatex(item.text)} inline />
                    </div>

                    <div className="flex items-center gap-2 min-w-[160px] self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTF((prev) => ({ ...prev, [item.label]: true }));
                          if (item.isCorrect === true) {
                            playSound("correct");
                            showFeedback(true);
                          } else {
                            playSound("wrong");
                            showFeedback(false);
                          }
                        }}
                        className={`flex-1 py-2 rounded-xl font-black text-base border transition shadow-sm ${
                          revealed && item.isCorrect
                            ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                            : userChoice === true
                            ? isUserCorrect
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-red-600 text-white border-red-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        ĐÚNG
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTF((prev) => ({ ...prev, [item.label]: false }));
                          if (item.isCorrect === false) {
                            playSound("correct");
                            showFeedback(true);
                          } else {
                            playSound("wrong");
                            showFeedback(false);
                          }
                        }}
                        className={`flex-1 py-2 rounded-xl font-black text-base border transition shadow-sm ${
                          revealed && !item.isCorrect
                            ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                            : userChoice === false
                            ? isUserCorrect
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-red-600 text-white border-red-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        SAI
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dạng 3: Trả lời ngắn */}
          {currentQ.type === "short_answer" && (
            <div id="short-answer-container" className="flex flex-col items-center my-6">
              <div className="relative w-full max-w-md">
                <input
                  id="short-answer-input"
                  type="text"
                  value={shortInput}
                  onChange={(e) => {
                    setShortInput(e.target.value);
                    setShortChecked(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const isCorrect =
                        normalizeShortAnswer(shortInput) ===
                        normalizeShortAnswer(currentQ.correctAnswer || "");
                      setShortChecked(isCorrect);
                      if (isCorrect) {
                        playSound("correct");
                        showFeedback(true);
                      } else {
                        playSound("wrong");
                        showFeedback(false);
                      }
                    }
                  }}
                  placeholder="Nhập kết quả (số hoặc phân số)..."
                  className={`w-full py-3.5 px-6 rounded-2xl border-2 text-center font-extrabold text-2xl outline-none shadow-sm transition ${
                    shortChecked === true
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : shortChecked === false
                      ? "border-red-500 bg-red-50 text-red-900"
                      : "border-slate-300 focus:border-blue-400 bg-slate-50 focus:bg-white text-slate-800"
                  }`}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const isCorrect =
                      normalizeShortAnswer(shortInput) ===
                      normalizeShortAnswer(currentQ.correctAnswer || "");
                    setShortChecked(isCorrect);
                    if (isCorrect) {
                      playSound("correct");
                      showFeedback(true);
                    } else {
                      playSound("wrong");
                      showFeedback(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>KIỂM TRA</span>
                </button>
              </div>
            </div>
          )}

          {/* Dạng 4: Tự luận */}
          {currentQ.type === "essay" && (
            <div id="essay-box-display" className="my-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-bold text-blue-700 mb-2">
                📌 Hướng dẫn làm bài tự luận:
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Thí sinh trình bày chi tiết các bước biến đổi hình học, tính toán vectơ hoặc tọa độ
                theo barem chuẩn. Giáo viên có thể bấm &quot;XEM LỜI GIẢI&quot; để đối chiếu barem điểm.
              </p>
            </div>
          )}

          {/* Khung Lời giải chi tiết Bento */}
          {showExplanation && (
            <div
              id="explanation-box-content"
              className="mt-6 p-6 rounded-3xl bg-indigo-50/70 border border-indigo-200 shadow-xs animate-fadeIn"
            >
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-base sm:text-lg mb-3">
                <Lightbulb className="w-5 h-5 text-indigo-600" />
                <span>LỜI GIẢI CHI TIẾT & BAREM ĐIỂM:</span>
              </div>
              <div className="text-slate-800 leading-relaxed text-sm sm:text-base font-medium">
                <MathRenderer content={preprocessTikzInLatex(currentQ.explanation)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer: Điều hướng & Nút chức năng Bento */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-auto border-t border-slate-200 z-30">
          <button
            id="btn-prev-slide"
            type="button"
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Câu trước</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Nút Hiện đáp án */}
            <button
              id="btn-reveal-answer"
              type="button"
              onClick={() => {
                setRevealed((prev) => !prev);
                if (currentQ.type === "short_answer") {
                  setShortInput(currentQ.correctAnswer || "");
                  setShortChecked(true);
                }
              }}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              <span>{revealed ? "ẨN ĐÁP ÁN" : "HIỆN ĐÁP ÁN"}</span>
            </button>

            {/* Bộ chọn câu hỏi nhanh */}
            <select
              id="select-question-index"
              value={currentIndex}
              onChange={(e) => goToQuestion(Number(e.target.value))}
              className="px-3 py-2 rounded-2xl bg-slate-100 border border-slate-300 font-bold text-xs sm:text-sm text-slate-800 outline-none cursor-pointer"
            >
              {exam.questions.map((q, idx) => (
                <option key={q.id} value={idx}>
                  Câu {idx + 1} ({q.partName.split(" ")[1] || q.partName})
                </option>
              ))}
            </select>

            {/* Nút Xem lời giải */}
            <button
              id="btn-toggle-explanation"
              type="button"
              onClick={() => setShowExplanation((prev) => !prev)}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5"
            >
              <Lightbulb className="w-4 h-4" />
              <span>{showExplanation ? "ẨN LỜI GIẢI" : "XEM LỜI GIẢI"}</span>
            </button>
          </div>

          <button
            id="btn-next-slide"
            type="button"
            onClick={nextQuestion}
            disabled={currentIndex === exam.questions.length - 1}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm flex items-center gap-1 transition shadow"
          >
            <span>Câu sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Lớp vẽ Canvas */}
        <DrawingCanvas
          isActive={drawTool !== "none"}
          tool={drawTool}
          color={penColor}
          lineWidth={3}
        />
      </div>

      {/* Modal Cài đặt Thời Gian (mm:ss) */}
      {showTimerModal && (
        <div
          id="modal-timer-backdrop"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowTimerModal(false)}
        >
          <div
            id="modal-timer-dialog"
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-xl flex items-center gap-2 text-slate-800">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Thiết lập thời gian</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Nhập thời gian đếm ngược dạng <b>mm:ss</b> (ví dụ <b>01:00</b>, <b>03:00</b>, <b>00:45</b>).
            </p>

            <div className="flex items-center gap-3 my-3">
              <input
                id="modal-timer-input-field"
                type="text"
                value={timerModalInput}
                onChange={(e) => {
                  setTimerModalInput(e.target.value);
                  setTimerModalError("");
                }}
                placeholder="mm:ss"
                className="flex-1 text-center py-3 px-4 rounded-2xl border-2 border-slate-300 focus:border-blue-500 font-black text-3xl text-slate-800 outline-none"
              />
            </div>

            {timerModalError && (
              <p className="text-xs font-bold text-red-600 mb-3">{timerModalError}</p>
            )}

            {/* Các nút chọn nhanh */}
            <div className="flex flex-wrap gap-2 my-4">
              {[
                { label: "30 giây", val: "00:30" },
                { label: "1 phút", val: "01:00" },
                { label: "2 phút", val: "02:00" },
                { label: "3 phút", val: "03:00" },
                { label: "5 phút", val: "05:00" },
              ].map((q) => (
                <button
                  key={q.val}
                  type="button"
                  onClick={() => {
                    setTimerModalInput(q.val);
                    setTimerModalError("");
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-bold border border-slate-200 transition"
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                id="btn-timer-apply-current"
                type="button"
                onClick={() => applyTimer(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow"
              >
                Áp dụng câu này
              </button>
              <button
                id="btn-timer-apply-all"
                type="button"
                onClick={() => applyTimer(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
              >
                Áp dụng tất cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup thông báo kết quả động viên */}
      {feedbackPopup && (
        <div
          id="popup-feedback-anim"
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center backdrop-blur-md border-4 animate-bounce ${
            feedbackPopup.isCorrect
              ? "bg-white/95 border-emerald-400 text-emerald-800"
              : "bg-white/95 border-red-400 text-red-800"
          }`}
        >
          <span className="text-6xl mb-2">{feedbackPopup.emoji}</span>
          <span className="text-2xl font-black">{feedbackPopup.text}</span>
        </div>
      )}
    </div>
  );
};
