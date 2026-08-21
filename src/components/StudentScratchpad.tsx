import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Pencil,
  Highlighter,
  Eraser,
  Trash2,
  Undo2,
  Redo2,
  Grid,
  Eye,
  EyeOff,
  Palette,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export type DrawingTool = "pen" | "highlighter" | "eraser" | "none";

interface StudentScratchpadProps {
  questionId: string;
  isDrawingActive: boolean;
  onToggleDrawingActive: (active: boolean) => void;
  className?: string;
}

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  tool: DrawingTool;
  color: string;
  lineWidth: number;
  opacity: number;
  points: StrokePoint[];
}

const PEN_COLORS = [
  { color: "#2563eb", name: "Xanh dương" },
  { color: "#dc2626", name: "Đỏ" },
  { color: "#16a34a", name: "Xanh lá" },
  { color: "#1e293b", name: "Đen chì" },
  { color: "#9333ea", name: "Tím" },
];

const HIGHLIGHTER_COLORS = [
  { color: "#facc15", name: "Vàng dạ quang" },
  { color: "#4ade80", name: "Xanh neon" },
  { color: "#f472b6", name: "Hồng phấn" },
  { color: "#38bdf8", name: "Xanh ngọc" },
];

// Lưu trữ bộ nét vẽ theo từng câu hỏi trong session
const questionStrokesMemory: Record<string, Stroke[]> = {};

export const StudentScratchpad: React.FC<StudentScratchpadProps> = ({
  questionId,
  isDrawingActive,
  onToggleDrawingActive,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<DrawingTool>("pen");
  const [penColor, setPenColor] = useState<string>("#2563eb");
  const [highlighterColor, setHighlighterColor] = useState<string>("#facc15");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isScratchpadVisible, setIsScratchpadVisible] = useState<boolean>(true);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  // Danh sách các nét vẽ của câu hỏi hiện tại
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoHistory, setRedoHistory] = useState<Stroke[]>([]);

  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Tải nét vẽ của câu hỏi khi đổi questionId
  useEffect(() => {
    const savedStrokes = questionStrokesMemory[questionId] || [];
    setStrokes(savedStrokes);
    setRedoHistory([]);
  }, [questionId]);

  // Lưu nét vẽ vào bộ nhớ khi strokes thay đổi
  useEffect(() => {
    questionStrokesMemory[questionId] = strokes;
  }, [strokes, questionId]);

  // Vẽ lại toàn bộ strokes lên canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isScratchpadVisible) return;

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "pen") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;
        ctx.globalAlpha = stroke.opacity || 1;
      } else if (stroke.tool === "highlighter") {
        ctx.globalCompositeOperation = "multiply";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth * 4;
        ctx.globalAlpha = stroke.opacity || 0.4;
      } else if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = stroke.lineWidth * 6;
        ctx.globalAlpha = 1;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [strokes, isScratchpadVisible]);

  // Resize canvas theo kích thước thẻ cha
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current?.parentElement;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
      }
    }
  }, [redrawCanvas]);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    const interval = setInterval(handleResize, 1000);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(interval);
    };
  }, [handleResize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingActive || activeTool === "none" || !isScratchpadVisible) return;
    isDrawingRef.current = true;
    const startPoint = getCanvasCoords(e);

    const newStroke: Stroke = {
      tool: activeTool,
      color: activeTool === "highlighter" ? highlighterColor : penColor,
      lineWidth: strokeWidth,
      opacity: activeTool === "highlighter" ? 0.4 : 1,
      points: [startPoint],
    };

    currentStrokeRef.current = newStroke;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (activeTool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1;
    } else if (activeTool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = strokeWidth * 4;
      ctx.globalAlpha = 0.4;
    } else if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = strokeWidth * 6;
      ctx.globalAlpha = 1;
    }

    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(startPoint.x, startPoint.y);
    ctx.stroke();
    ctx.restore();
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (
      !isDrawingRef.current ||
      !isDrawingActive ||
      activeTool === "none" ||
      !currentStrokeRef.current ||
      !isScratchpadVisible
    )
      return;

    const currentPoint = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = currentStrokeRef.current.points;
    const lastPoint = points[points.length - 1];

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (activeTool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1;
    } else if (activeTool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = strokeWidth * 4;
      ctx.globalAlpha = 0.4;
    } else if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = strokeWidth * 6;
      ctx.globalAlpha = 1;
    }

    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    ctx.restore();

    currentStrokeRef.current.points.push(currentPoint);
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) {
      isDrawingRef.current = false;
      return;
    }
    isDrawingRef.current = false;

    if (currentStrokeRef.current.points.length > 0) {
      setStrokes((prev) => [...prev, currentStrokeRef.current!]);
      setRedoHistory([]);
    }
    currentStrokeRef.current = null;
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setRedoHistory((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const restored = redoHistory[redoHistory.length - 1];
    setRedoHistory((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, restored]);
  };

  const handleClearAll = () => {
    if (strokes.length === 0) return;
    setStrokes([]);
    setRedoHistory([]);
    questionStrokesMemory[questionId] = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    >
      {/* Lưới ô ly toán học (khi bật) */}
      {showGrid && isDrawingActive && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #3b82f6 1px, transparent 1px),
              linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />
      )}

      {/* Lớp Canvas vẽ */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${
          isDrawingActive && isScratchpadVisible
            ? activeTool === "eraser"
              ? "pointer-events-auto cursor-[cell] z-20"
              : activeTool === "highlighter"
              ? "pointer-events-auto cursor-crosshair z-20"
              : "pointer-events-auto cursor-crosshair z-20"
            : "pointer-events-none z-10"
        }`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* THANH CÔNG CỤ VẼ NHÁP NỔI (Floating Floating Bento Toolbar) */}
      <div
        className={`absolute top-3 right-3 z-30 pointer-events-auto flex flex-col items-end gap-2 transition-all duration-200`}
      >
        {/* Nút bật/tắt chính và thông báo trạng thái */}
        <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              const next = !isDrawingActive;
              onToggleDrawingActive(next);
              if (next && activeTool === "none") {
                setActiveTool("pen");
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs ${
              isDrawingActive
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                : "bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200"
            }`}
            title={
              isDrawingActive
                ? "Đang bật chế độ viết nháp (Bấm để tắt và thao tác đáp án)"
                : "Bật chế độ viết vẽ nháp trực tiếp trên màn hình"
            }
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isDrawingActive ? "Đang viết nháp" : "Viết vẽ nháp"}</span>
            {strokes.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-black">
                {strokes.length}
              </span>
            )}
          </button>

          {isDrawingActive && (
            <button
              type="button"
              onClick={() => setIsToolbarCollapsed((prev) => !prev)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isToolbarCollapsed ? "Mở rộng công cụ vẽ" : "Thu gọn công cụ vẽ"}
            >
              {isToolbarCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Thanh công cụ chi tiết khi đang ở chế độ viết nháp */}
        {isDrawingActive && !isToolbarCollapsed && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 max-w-[340px] animate-fadeIn">
            {/* Hàng 1: Các công cụ chính (Bút thường, Dạ quang, Tẩy, Ẩn/Hiện, Lưới) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
              {/* Bút chì / Bút bi */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool("pen");
                  setShowColorPicker(true);
                }}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  activeTool === "pen"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="Bút viết / vẽ thông thường"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Bút</span>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-600 ml-0.5"
                  style={{ backgroundColor: penColor }}
                />
              </button>

              {/* Bút dạ quang tô sáng */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool("highlighter");
                  setShowColorPicker(true);
                }}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  activeTool === "highlighter"
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="Bút dạ quang (Tô sáng từ khóa, mốc điểm trên đề bài)"
              >
                <Highlighter className="w-4 h-4" />
                <span className="hidden sm:inline">Dạ quang</span>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-600 ml-0.5 opacity-80"
                  style={{ backgroundColor: highlighterColor }}
                />
              </button>

              {/* Cục tẩy */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool("eraser");
                  setShowColorPicker(false);
                }}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  activeTool === "eraser"
                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="Cục tẩy nét vẽ"
              >
                <Eraser className="w-4 h-4" />
                <span className="hidden sm:inline">Tẩy</span>
              </button>

              <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-0.5" />

              {/* Lưới ô ly */}
              <button
                type="button"
                onClick={() => setShowGrid((prev) => !prev)}
                className={`p-2 rounded-lg text-xs font-bold transition ${
                  showGrid
                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title={showGrid ? "Tắt lưới ô ly giấy nháp" : "Bật lưới ô ly giấy nháp toán học"}
              >
                <Grid className="w-4 h-4" />
              </button>

              {/* Ẩn / Hiện nét vẽ */}
              <button
                type="button"
                onClick={() => setIsScratchpadVisible((prev) => !prev)}
                className={`p-2 rounded-lg text-xs font-bold transition ${
                  !isScratchpadVisible
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title={isScratchpadVisible ? "Tạm ẩn nét nháp" : "Hiện lại nét nháp"}
              >
                {isScratchpadVisible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4 text-amber-600" />
                )}
              </button>
            </div>

            {/* Hàng 2: Chọn màu sắc & Độ dày nét vẽ */}
            {showColorPicker && activeTool !== "eraser" && (
              <div className="flex items-center justify-between gap-2 px-1">
                {/* Bảng màu */}
                <div className="flex items-center gap-1.5">
                  {(activeTool === "pen" ? PEN_COLORS : HIGHLIGHTER_COLORS).map((c) => {
                    const isSelected =
                      activeTool === "pen" ? penColor === c.color : highlighterColor === c.color;
                    return (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => {
                          if (activeTool === "pen") setPenColor(c.color);
                          else setHighlighterColor(c.color);
                        }}
                        style={{ backgroundColor: c.color }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          isSelected
                            ? "border-slate-900 dark:border-white scale-125 shadow-sm"
                            : "border-white dark:border-slate-700 hover:scale-110"
                        }`}
                        title={c.name}
                      />
                    );
                  })}
                </div>

                {/* Độ dày nét vẽ */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  {[2, 4, 8].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setStrokeWidth(size)}
                      className={`w-6 h-6 rounded flex items-center justify-center transition ${
                        strokeWidth === size
                          ? "bg-white dark:bg-slate-700 shadow-xs"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      title={`Nét ${size === 2 ? "Mảnh" : size === 4 ? "Vừa" : "Đậm"}`}
                    >
                      <span
                        className="rounded-full bg-slate-800 dark:bg-slate-200"
                        style={{ width: `${size + 1}px`, height: `${size + 1}px` }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hàng 3: Hoàn tác, Làm lại, Xóa nháp câu hiện tại */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 transition"
                  title="Hoàn tác nét vẽ (Undo)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hoàn tác</span>
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoHistory.length === 0}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1 transition"
                  title="Làm lại nét vẽ (Redo)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Làm lại</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={strokes.length === 0}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 flex items-center gap-1 transition"
                title="Xóa toàn bộ nét nháp của câu này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa nháp câu này</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
