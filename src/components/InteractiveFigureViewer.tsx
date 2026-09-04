import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Move,
  Grid,
  X,
  Sparkles,
  HelpCircle,
  Eye,
} from "lucide-react";

interface InteractiveFigureViewerProps {
  src?: string; // Image URL / Data URL
  svgHtml?: string; // TikZ rendered SVG string
  children?: React.ReactNode;
  alt?: string;
  caption?: string;
  className?: string;
  defaultZoom?: number;
  showControls?: boolean;
}

export const InteractiveFigureViewer: React.FC<InteractiveFigureViewerProps> = ({
  src,
  svgHtml,
  children,
  alt = "Hình vẽ đề bài",
  caption,
  className = "",
  defaultZoom = 1,
  showControls = true,
}) => {
  const [scale, setScale] = useState<number>(defaultZoom);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isFullscreenModal, setIsFullscreenModal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Xử lý cử chỉ cảm ứng trên điện thoại (iPhone/Safari, iPad, Android)
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);

  // Xử lý Phóng to / Thu nhỏ
  const handleZoomIn = () => {
    setScale((prev) => Math.min(4.0, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.4, Number((prev - 0.25).toFixed(2))));
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Kéo chuột di chuyển (Pan) khi zoom > 1
  const handleMouseDown = (e: React.MouseEvent) => {
    // Chỉ kích hoạt pan khi click chuột trái
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Xử lý cảm ứng Touch Events trên iPhone/Safari & màn hình cảm ứng
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Chạm 1 ngón: Di chuyển hình vẽ (Pan)
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    } else if (e.touches.length === 2) {
      // Chạm 2 ngón: Kích hoạt Pinch-to-Zoom (Thu phóng cảm ứng)
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      // Khi phóng to hoặc xem toàn màn hình, chặn cuộn trang để di chuyển hình vẽ
      if (scale > 1 || isFullscreenModal) {
        if (e.cancelable) e.preventDefault();
      }
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      // Phóng to / thu nhỏ mượt mà bằng 2 ngón tay
      if (e.cancelable) e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchStartDistRef.current;
      const nextScale = Math.max(0.4, Math.min(4.0, Number((touchStartScaleRef.current * ratio).toFixed(2))));
      setScale(nextScale);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDistRef.current = null;
  };

  // Cuộn chuột để zoom nhanh
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || isFullscreenModal) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setScale((prev) => {
        const next = Math.max(0.4, Math.min(4.0, Number((prev + delta).toFixed(2))));
        return next;
      });
    }
  };

  // Phím tắt bàn phím (Esc đóng modal, +/- zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullscreenModal) {
        if (e.key === "Escape") {
          setIsFullscreenModal(false);
        } else if (e.key === "+" || e.key === "=") {
          handleZoomIn();
        } else if (e.key === "-") {
          handleZoomOut();
        } else if (e.key === "0") {
          handleReset();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenModal]);

  // Render nội dung bên trong (SVG / Image / Children)
  const renderContent = (isModal: boolean = false) => {
    const transformStyle: React.CSSProperties = {
      transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale}) rotate(${rotation}deg)`,
      transformOrigin: "center center",
      transition: isDragging ? "none" : "transform 0.15s ease-out",
      WebkitBackfaceVisibility: "hidden",
      backfaceVisibility: "hidden",
      WebkitUserSelect: "none",
      userSelect: "none",
    };

    return (
      <div
        style={transformStyle}
        className={`inline-block select-none max-w-full ${isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-default"}`}
      >
        {svgHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: svgHtml }}
            className="flex items-center justify-center max-w-full [&>div]:!my-0 [&>div]:!border-0 [&>div]:!bg-transparent [&>div]:!shadow-none [&>svg]:!max-w-full"
          />
        ) : src ? (
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-w-full h-auto object-contain rounded-xl pointer-events-none"
          />
        ) : (
          children
        )}
      </div>
    );
  };

  // Thanh công cụ điều khiển Zoom
  const renderToolbar = (isModal: boolean = false) => (
    <div
      className={`flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-md ${
        isModal ? "shadow-xl" : ""
      }`}
    >
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={scale <= 0.4}
        className="p-1.5 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 disabled:opacity-30 transition"
        title="Thu nhỏ hình vẽ (-25%)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {/* Hiển thị tỷ lệ phần trăm */}
      <button
        type="button"
        onClick={handleReset}
        className="px-2 py-0.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition min-w-[50px] text-center"
        title="Bấm để đưa về 100%"
      >
        {Math.round(scale * 100)}%
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={scale >= 4.0}
        className="p-1.5 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 disabled:opacity-30 transition"
        title="Phóng to hình vẽ (+25%)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

      <button
        type="button"
        onClick={handleRotate}
        className="p-1.5 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition"
        title="Xoay hình 90°"
      >
        <RotateCw className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setShowGrid((prev) => !prev)}
        className={`p-1.5 rounded-xl transition ${
          showGrid
            ? "bg-indigo-600 text-white"
            : "hover:bg-indigo-50 text-slate-700 hover:text-indigo-600"
        }`}
        title="Bật/tắt lưới tọa độ phụ trợ"
      >
        <Grid className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleReset}
        className="p-1.5 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition"
        title="Đặt lại kích thước ban đầu"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

      {!isModal ? (
        <button
          type="button"
          onClick={() => setIsFullscreenModal(true)}
          className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition flex items-center gap-1"
          title="Mở toàn màn hình để soi chi tiết"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="text-[11px] hidden sm:inline">Xem to</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsFullscreenModal(false)}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
          title="Đóng toàn màn hình"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`relative my-3 flex flex-col items-center group ${className}`}
      id="interactive-figure-container"
    >
      {/* Khung chứa hình vẽ chính */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          touchAction: scale > 1 ? "none" : "pan-y",
          WebkitOverflowScrolling: "touch",
        }}
        className={`relative w-full overflow-hidden rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-center min-h-[220px] transition-shadow ${
          showGrid
            ? "bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"
            : ""
        } ${isDragging ? "select-none" : ""}`}
      >
        {renderContent(false)}

        {/* Thanh công cụ Zoom nổi ở góc trên bên phải */}
        {showControls && (
          <div className="absolute top-2.5 right-2.5 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
            {renderToolbar(false)}
          </div>
        )}

        {/* Ghi chú gợi ý thao tác khi zoom */}
        {scale > 1 && (
          <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[10.5px] font-medium backdrop-blur-xs flex items-center gap-1.5 pointer-events-none shadow-sm">
            <Move className="w-3 h-3 text-indigo-400" />
            <span>Kéo hoặc chạm 2 ngón để di chuyển ({Math.round(scale * 100)}%)</span>
          </div>
        )}
      </div>

      {/* Chú thích hình ảnh nếu có */}
      {caption && (
        <p className="text-xs font-semibold text-slate-500 mt-1.5 text-center italic">
          {caption}
        </p>
      )}

      {/* ================= MODAL FULLSCREEN LIGHTBOX CHI TIẾT ================= */}
      {isFullscreenModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setIsFullscreenModal(false)}
        >
          {/* Header Modal */}
          <div
            className="flex items-center justify-between pb-3 px-2 text-white z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 font-bold text-xs border border-indigo-400/30 uppercase tracking-wider">
                CHẾ ĐỘ SOI CHI TIẾT HÌNH VẼ
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline">
                (Chạm 2 ngón để zoom • Kéo để di chuyển • Phím Esc để thoát)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {renderToolbar(true)}
              <button
                type="button"
                onClick={() => setIsFullscreenModal(false)}
                className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition ml-2"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Vùng canvas tương tác trong Modal */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onWheel={handleWheel}
            onClick={(e) => e.stopPropagation()}
            style={{
              touchAction: "none",
              WebkitOverflowScrolling: "touch",
            }}
            className={`flex-1 relative w-full overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center ${
              showGrid
                ? "bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:24px_24px]"
                : ""
            }`}
          >
            <div className="p-4 sm:p-8 bg-white/5 rounded-3xl backdrop-blur-xs border border-white/10 max-w-full flex items-center justify-center">
              {renderContent(true)}
            </div>

            {/* Badge thông tin tỷ lệ zoom */}
            <div className="absolute bottom-4 left-4 z-20 px-3.5 py-1.5 rounded-xl bg-slate-800/80 text-white text-xs font-semibold backdrop-blur-md border border-slate-700/50 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Tỷ lệ: <b>{Math.round(scale * 100)}%</b></span>
              {rotation > 0 && <span>• Xoay: <b>{rotation}°</b></span>}
              <span className="hidden sm:inline">• Kéo hoặc chạm 2 ngón để điều khiển</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
