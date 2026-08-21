import React, { useRef, useEffect, useState, useCallback } from "react";

interface DrawingCanvasProps {
  isActive: boolean;
  tool: "pen" | "eraser" | "none";
  color: string;
  lineWidth?: number;
  onClearRequest?: () => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isActive,
  tool,
  color,
  lineWidth = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas theo khung hiển thị
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Lưu ảnh tạm thời trước khi resize
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx && canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const ctx = canvas.getContext("2d");
    if (ctx && tempCanvas.width > 0) {
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive || tool === "none") return;
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasCoords(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !isActive || tool === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPointRef.current) return;

    const currentPoint = getCanvasCoords(e);

    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = lineWidth * 5;
    }

    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  // Expose clear function via ref or external method
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    (window as any).__clearSlideDrawing = clearCanvas;
    return () => {
      delete (window as any).__clearSlideDrawing;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${
        isActive && tool !== "none" ? "pointer-events-auto cursor-crosshair z-20" : "pointer-events-none z-10"
      }`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  );
};
