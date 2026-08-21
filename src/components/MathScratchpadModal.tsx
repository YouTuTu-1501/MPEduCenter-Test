import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Pencil,
  Highlighter,
  Eraser,
  Trash2,
  Undo2,
  Redo2,
  Grid,
  X,
  Maximize2,
  Minimize2,
  Download,
  Square,
  Circle,
  Slash,
  Palette,
} from "lucide-react";

interface MathScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

type BackgroundTheme = "white" | "grid" | "blackboard" | "yellow_pad";

interface ScratchPoint {
  x: number;
  y: number;
}

interface FullStroke {
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  lineWidth: number;
  opacity: number;
  points: ScratchPoint[];
}

const PALETTE = [
  { color: "#2563eb", name: "Xanh dương" },
  { color: "#dc2626", name: "Đỏ" },
  { color: "#16a34a", name: "Xanh lá" },
  { color: "#1e293b", name: "Đen chì" },
  { color: "#ea580c", name: "Cam" },
  { color: "#9333ea", name: "Tím" },
  { color: "#ffffff", name: "Trắng" },
];

export const MathScratchpadModal: React.FC<MathScratchpadModalProps> = ({
  isOpen,
  onClose,
  title = "Bảng Nháp Toán Học",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [color, setColor] = useState<string>("#2563eb");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [theme, setTheme] = useState<BackgroundTheme>("grid");

  const [strokes, setStrokes] = useState<FullStroke[]>([]);
  const [redoStack, setRedoStack] = useState<FullStroke[]>([]);

  const isDrawing = useRef<boolean>(false);
  const currentStroke = useRef<FullStroke | null>(null);

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((st) => {
      if (st.points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (st.tool === "pen") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.lineWidth;
        ctx.globalAlpha = st.opacity || 1;
      } else if (st.tool === "highlighter") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.lineWidth * 4;
        ctx.globalAlpha = 0.35;
      } else if (st.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = st.lineWidth * 7;
        ctx.globalAlpha = 1;
      }

      ctx.moveTo(st.points[0].x, st.points[0].y);
      for (let i = 1; i < st.points.length; i++) {
        ctx.lineTo(st.points[i].x, st.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [strokes]);

  // Resize canvas when modal opens or window resizes
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redraw();
      }
    }
  }, [redraw]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(handleResize, 50);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isOpen, handleResize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Automatic color change for blackboard theme
  useEffect(() => {
    if (theme === "blackboard" && color === "#1e293b") {
      setColor("#ffffff");
    } else if (theme !== "blackboard" && color === "#ffffff") {
      setColor("#2563eb");
    }
  }, [theme]);

  if (!isOpen) return null;

  const getCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): ScratchPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let cx = 0;
    let cy = 0;

    if ("touches" in e) {
      if (e.touches.length > 0) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      }
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }

    return {
      x: cx - rect.left,
      y: cy - rect.top,
    };
  };

  const handleStart = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    isDrawing.current = true;
    const pt = getCoords(e);
    const newSt: FullStroke = {
      tool,
      color,
      lineWidth: strokeWidth,
      opacity: tool === "highlighter" ? 0.35 : 1,
      points: [pt],
    };
    currentStroke.current = newSt;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1;
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 4;
      ctx.globalAlpha = 0.35;
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = strokeWidth * 7;
      ctx.globalAlpha = 1;
    }

    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
  };

  const handleDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing.current || !currentStroke.current) return;
    const pt = getCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = currentStroke.current.points;
    const last = points[points.length - 1];

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1;
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 4;
      ctx.globalAlpha = 0.35;
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = strokeWidth * 7;
      ctx.globalAlpha = 1;
    }

    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    currentStroke.current.points.push(pt);
  };

  const handleStop = () => {
    if (!isDrawing.current || !currentStroke.current) {
      isDrawing.current = false;
      return;
    }
    isDrawing.current = false;
    if (currentStroke.current.points.length > 0) {
      setStrokes((prev) => [...prev, currentStroke.current!]);
      setRedoStack([]);
    }
    currentStroke.current = null;
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const r = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, r]);
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div
      id="modal-scratchpad-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="modal-scratchpad-dialog"
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header toolbar */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
              📝
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Nháp tự do các phép toán, vẽ hình học, đồ thị hàm số
              </p>
            </div>
          </div>

          {/* Công cụ vẽ & Màu sắc */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                tool === "pen"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Bút vẽ"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden md:inline">Bút</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("highlighter")}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                tool === "highlighter"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Bút dạ quang"
            >
              <Highlighter className="w-4 h-4" />
              <span className="hidden md:inline">Dạ quang</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                tool === "eraser"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Tẩy"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden md:inline">Tẩy</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Màu sắc */}
            {tool !== "eraser" && (
              <div className="flex items-center gap-1 px-1">
                {PALETTE.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      color === c.color
                        ? "border-slate-900 dark:border-white scale-125 shadow-xs"
                        : "border-slate-300 dark:border-slate-600 hover:scale-110"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Cỡ nét */}
            <div className="flex items-center gap-1">
              {[2, 4, 8].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setStrokeWidth(size)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                    strokeWidth === size
                      ? "bg-slate-200 dark:bg-slate-700 font-bold"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  title={`Cỡ nét ${size}px`}
                >
                  <span
                    className="rounded-full bg-slate-800 dark:bg-slate-200"
                    style={{ width: `${size + 1}px`, height: `${size + 1}px` }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Chọn loại nền (Giấy ô ly, Bảng trắng, Bảng đen) */}
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTheme("grid")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                theme === "grid"
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Ô ly
            </button>
            <button
              type="button"
              onClick={() => setTheme("white")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                theme === "white"
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Trắng
            </button>
            <button
              type="button"
              onClick={() => setTheme("blackboard")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                theme === "blackboard"
                  ? "bg-slate-900 text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Bảng đen
            </button>
            <button
              type="button"
              onClick={() => setTheme("yellow_pad")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                theme === "yellow_pad"
                  ? "bg-amber-100 text-amber-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Giấy vàng
            </button>
          </div>

          {/* Điều khiển Undo/Redo/Clear/Close */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs transition"
              title="Hoàn tác (Undo)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs transition"
              title="Làm lại (Redo)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition shadow-2xs"
              title="Xóa trắng bảng nháp"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xóa hết</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Đóng bảng nháp"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Khung vẽ Canvas */}
        <div
          ref={containerRef}
          className={`flex-1 relative cursor-crosshair overflow-hidden select-none ${
            theme === "blackboard"
              ? "bg-slate-900 text-white"
              : theme === "yellow_pad"
              ? "bg-amber-50"
              : "bg-white"
          }`}
          style={
            theme === "grid"
              ? {
                  backgroundImage: `
                    linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                    linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
                  `,
                  backgroundSize: "24px 24px",
                }
              : theme === "yellow_pad"
              ? {
                  backgroundImage: `
                    linear-gradient(to bottom, #fde68a 1px, transparent 1px)
                  `,
                  backgroundSize: "100% 28px",
                }
              : {}
          }
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleStart}
            onMouseMove={handleDraw}
            onMouseUp={handleStop}
            onMouseLeave={handleStop}
            onTouchStart={handleStart}
            onTouchMove={handleDraw}
            onTouchEnd={handleStop}
          />
        </div>
      </div>
    </div>
  );
};
