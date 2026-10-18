import React, { useState, useMemo, useRef } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  Plus,
  Trash2,
  TrendingUp,
  Sliders,
  Eye,
  Layers,
  ArrowRight,
  Maximize2,
  HelpCircle,
} from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import { useToast } from "../context/ToastContext";

export interface LinearInequality {
  id: string;
  a: number; // Hệ số của x
  b: number; // Hệ số của y
  op: "<=" | ">=" | "<" | ">";
  c: number; // Hằng số vế phải
  name?: string; // Tên đường thẳng bờ, ví dụ: d1, d2
  color?: string; // Màu đường thẳng
}

interface Point {
  x: number;
  y: number;
  label?: string;
}

interface InequalityDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLatex?: (latexCode: string) => void;
}

// Preset bài toán SGK GDPT 2018 (Chương II Toán 10)
const PRESETS: {
  id: string;
  title: string;
  description: string;
  inequalities: LinearInequality[];
  objective?: { a: number; b: number; name: string };
}[] = [
  {
    id: "quad_classic",
    title: "Miền Tứ Giác Chuẩn SGK Toán 10",
    description: "Miền nghiệm là miền tứ giác giới hạn bởi 4 đường thẳng trong góc phần tư thứ nhất.",
    inequalities: [
      { id: "1", a: 1, b: 1, op: "<=", c: 4, name: "d_1", color: "#3b82f6" },
      { id: "2", a: 1, b: -1, op: "<=", c: 2, name: "d_2", color: "#10b981" },
      { id: "3", a: 1, b: 0, op: ">=", c: 0, name: "Oy", color: "#64748b" },
      { id: "4", a: 0, b: 1, op: ">=", c: 0, name: "Ox", color: "#64748b" },
    ],
    objective: { a: 2, b: 3, name: "F(x, y) = 2x + 3y" },
  },
  {
    id: "linear_programming",
    title: "Bài Toán Kinh Tế / Tối Ưu Lợi Nhuận",
    description: "Kế hoạch sản xuất hai loại sản phẩm A và B để đạt doanh thu / lợi nhuận cao nhất.",
    inequalities: [
      { id: "1", a: 2, b: 1, op: "<=", c: 14, name: "d_1", color: "#3b82f6" },
      { id: "2", a: 1, b: 1, op: "<=", c: 9, name: "d_2", color: "#8b5cf6" },
      { id: "3", a: 1, b: 2, op: "<=", c: 16, name: "d_3", color: "#ec4899" },
      { id: "4", a: 1, b: 0, op: ">=", c: 0, name: "Oy", color: "#64748b" },
      { id: "5", a: 0, b: 1, op: ">=", c: 0, name: "Ox", color: "#64748b" },
    ],
    objective: { a: 4, b: 3, name: "F(x, y) = 4x + 3y" },
  },
  {
    id: "triangle_integer",
    title: "Miền Tam Giác Có Đỉnh Tọa Độ Nguyên",
    description: "Miền nghiệm tam giác giới hạn bởi 3 bất phương trình bậc nhất hai ẩn.",
    inequalities: [
      { id: "1", a: 2, b: -1, op: ">=", c: -2, name: "d_1", color: "#ef4444" },
      { id: "2", a: 1, b: 1, op: "<=", c: 4, name: "d_2", color: "#3b82f6" },
      { id: "3", a: 1, b: -2, op: "<=", c: 2, name: "d_3", color: "#10b981" },
    ],
    objective: { a: 1, b: -1, name: "F(x, y) = x - y" },
  },
  {
    id: "pentagon_bounded",
    title: "Miền Ngũ Giác (5 Đỉnh)",
    description: "Miền nghiệm đa giác 5 cạnh lồi với giới hạn tải trọng và nguyên vật liệu.",
    inequalities: [
      { id: "1", a: 1, b: 0, op: ">=", c: 0, name: "Oy", color: "#64748b" },
      { id: "2", a: 0, b: 1, op: ">=", c: 0, name: "Ox", color: "#64748b" },
      { id: "3", a: 1, b: 0, op: "<=", c: 4, name: "x=4", color: "#f59e0b" },
      { id: "4", a: 0, b: 1, op: "<=", c: 5, name: "y=5", color: "#06b6d4" },
      { id: "5", a: 1, b: 1, op: "<=", c: 7, name: "d_5", color: "#3b82f6" },
    ],
    objective: { a: 3, b: 2, name: "F(x, y) = 3x + 2y" },
  },
];

const COLOR_PALETTE = [
  "#3b82f6", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
];

// Định dạng số đẹp (rút gọn số thập phân hoặc phân số cơ bản)
function formatCoord(val: number): string {
  if (Math.abs(val - Math.round(val)) < 1e-4) {
    return Math.round(val).toString();
  }
  return Number(val.toFixed(2)).toString();
}

export const InequalityDomainModal: React.FC<InequalityDomainModalProps> = ({
  isOpen,
  onClose,
  onInsertLatex,
}) => {
  const { toast } = useToast();
  const [inequalities, setInequalities] = useState<LinearInequality[]>(PRESETS[0].inequalities);
  const [renderMode, setRenderMode] = useState<"fill_domain" | "hatch_discard" | "hatch_domain">("fill_domain");
  const [showGrid, setShowGrid] = useState(true);
  const [showProjections, setShowProjections] = useState(true);
  const [showVertexLabels, setShowVertexLabels] = useState(true);
  const [showLineLabels, setShowLineLabels] = useState(true);

  // Hàm mục tiêu F(x, y) = a*x + b*y
  const [objA, setObjA] = useState<number>(2);
  const [objB, setObjB] = useState<number>(3);
  const [enableObjective, setEnableObjective] = useState<boolean>(true);

  const [copiedTikz, setCopiedTikz] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);

  // Tính toán hình học: tìm các giao điểm và lọc đỉnh của miền nghiệm
  const { vertices, area, objectiveResults, extrema, boundingBox } = useMemo(() => {
    const lines = inequalities;
    const rawIntersections: Point[] = [];
    const EPS = 1e-5;

    // 1. Tìm mọi giao điểm giữa các cặp đường thẳng bờ: a1*x + b1*y = c1 và a2*x + b2*y = c2
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const l1 = lines[i];
        const l2 = lines[j];
        const det = l1.a * l2.b - l2.a * l1.b;
        if (Math.abs(det) > 1e-7) {
          const x = (l1.c * l2.b - l2.c * l1.b) / det;
          const y = (l1.a * l2.c - l2.a * l1.c) / det;
          rawIntersections.push({ x, y });
        }
      }
    }

    // 2. Lọc các giao điểm thỏa mãn TOÀN BỘ hệ bất phương trình
    const validPoints: Point[] = [];
    for (const pt of rawIntersections) {
      let isFeasible = true;
      for (const ineq of lines) {
        const val = ineq.a * pt.x + ineq.b * pt.y;
        if (ineq.op === "<=" || ineq.op === "<") {
          if (val > ineq.c + EPS) {
            isFeasible = false;
            break;
          }
        } else if (ineq.op === ">=" || ineq.op === ">") {
          if (val < ineq.c - EPS) {
            isFeasible = false;
            break;
          }
        }
      }

      if (isFeasible) {
        // Kiểm tra xem điểm này đã được thêm chưa (chống trùng lặp)
        const alreadyExists = validPoints.some(
          (p) => Math.abs(p.x - pt.x) < 1e-4 && Math.abs(p.y - pt.y) < 1e-4
        );
        if (!alreadyExists) {
          validPoints.push(pt);
        }
      }
    }

    // 3. Sắp xếp các đỉnh theo thứ tự góc cực (Polar angle) quanh trọng tâm để tạo đa giác lồi
    let sortedVertices: Point[] = [];
    let polyArea = 0;

    if (validPoints.length >= 3) {
      const cx = validPoints.reduce((acc, p) => acc + p.x, 0) / validPoints.length;
      const cy = validPoints.reduce((acc, p) => acc + p.y, 0) / validPoints.length;

      sortedVertices = [...validPoints].sort((p1, p2) => {
        const a1 = Math.atan2(p1.y - cy, p1.x - cx);
        const a2 = Math.atan2(p2.y - cy, p2.x - cx);
        return a1 - a2;
      });

      // Gán nhãn cho các đỉnh: O, A, B, C, D...
      const labels = ["O", "A", "B", "C", "D", "E", "F", "G"];
      sortedVertices.forEach((p, idx) => {
        if (Math.abs(p.x) < 1e-4 && Math.abs(p.y) < 1e-4) {
          p.label = "O";
        } else {
          p.label = labels[idx] || `P_{${idx + 1}}`;
        }
      });

      // Tính diện tích theo công thức Gauss (Shoelace Formula)
      let sum = 0;
      const n = sortedVertices.length;
      for (let i = 0; i < n; i++) {
        const pCur = sortedVertices[i];
        const pNext = sortedVertices[(i + 1) % n];
        sum += pCur.x * pNext.y - pNext.x * pCur.y;
      }
      polyArea = Math.abs(sum) / 2;
    } else {
      sortedVertices = validPoints;
    }

    // 4. Tính giá trị hàm mục tiêu F(x, y) = a*x + b*y tại các đỉnh
    const objList: { point: Point; value: number }[] = [];
    let minVal = Infinity;
    let maxVal = -Infinity;
    let minPoint: Point | null = null;
    let maxPoint: Point | null = null;

    if (sortedVertices.length > 0) {
      sortedVertices.forEach((pt) => {
        const val = objA * pt.x + objB * pt.y;
        objList.push({ point: pt, value: val });
        if (val < minVal) {
          minVal = val;
          minPoint = pt;
        }
        if (val > maxVal) {
          maxVal = val;
          maxPoint = pt;
        }
      });
    }

    // 5. Xác định bounding box của khung đồ họa Oxy
    const allX = sortedVertices.map((p) => p.x).concat([0]);
    const allY = sortedVertices.map((p) => p.y).concat([0]);
    const minX = Math.min(...allX, -1);
    const maxX = Math.max(...allX, 5);
    const minY = Math.min(...allY, -1);
    const maxY = Math.max(...allY, 5);

    const pad = 1.8;
    return {
      vertices: sortedVertices,
      area: polyArea,
      objectiveResults: objList,
      extrema: { minVal, maxVal, minPoint, maxPoint },
      boundingBox: {
        minX: Math.floor(minX - pad),
        maxX: Math.ceil(maxX + pad),
        minY: Math.floor(minY - pad),
        maxY: Math.ceil(maxY + pad),
      },
    };
  }, [inequalities, objA, objB]);

  // Sinh mã LaTeX hệ bất phương trình
  const generatedLatexSystem = useMemo(() => {
    const lines = inequalities.map((ineq) => {
      let termX = "";
      if (ineq.a === 1) termX = "x";
      else if (ineq.a === -1) termX = "-x";
      else if (ineq.a !== 0) termX = `${ineq.a}x`;

      let termY = "";
      if (ineq.b === 1) termY = termX ? " + y" : "y";
      else if (ineq.b === -1) termY = termX ? " - y" : "-y";
      else if (ineq.b > 0) termY = termX ? ` + ${ineq.b}y` : `${ineq.b}y`;
      else if (ineq.b < 0) termY = termX ? ` - ${Math.abs(ineq.b)}y` : `-${Math.abs(ineq.b)}y`;

      const lhs = (termX + termY).trim() || "0";
      const opSym = ineq.op === "<=" ? "\\le" : ineq.op === ">=" ? "\\ge" : ineq.op;
      return `${lhs} ${opSym} ${ineq.c}`;
    });

    return `\\begin{cases}\n${lines.join(" \\\\\n")}\n\\end{cases}`;
  }, [inequalities]);

  // Sinh mã TikZ hoàn chỉnh tương thích 100% với MathRenderer
  const generatedTikzCode = useMemo(() => {
    const { minX, maxX, minY, maxY } = boundingBox;
    const lines: string[] = [];

    lines.push(`\\begin{tikzpicture}[>=stealth,scale=0.85]`);
    lines.push(`% 1. Khung tọa độ Oxy`);
    lines.push(`\\draw[->,thick] (${minX},0) -- (${maxX + 0.6},0) node[below] {$x$};`);
    lines.push(`\\draw[->,thick] (0,${minY}) -- (0,${maxY + 0.6}) node[left] {$y$};`);
    lines.push(`\\draw (0,0) node[below left] {$O$};`);

    if (showGrid) {
      lines.push(`% Vạch chia đơn vị`);
      lines.push(`\\foreach \\x in {${Math.max(1, minX)},...,${maxX}} \\draw (\\x,0.1) -- (\\x,-0.1) node[below,scale=0.8] {$\\x$};`);
      lines.push(`\\foreach \\y in {${Math.max(1, minY)},...,${maxY}} \\draw (0.1,\\y) -- (-0.1,\\y) node[left,scale=0.8] {$\\y$};`);
    }

    // Các đường thẳng bờ
    lines.push(`% 2. Các đường thẳng bờ`);
    inequalities.forEach((ineq, idx) => {
      // Tìm 2 điểm đại diện để vẽ đường thẳng cắt qua khung
      if (Math.abs(ineq.b) > 1e-4) {
        const y1 = (ineq.c - ineq.a * minX) / ineq.b;
        const y2 = (ineq.c - ineq.a * maxX) / ineq.b;
        lines.push(`\\draw[thick,${ineq.color ? "blue!80!black" : "black"}] (${minX},${formatCoord(y1)}) -- (${maxX},${formatCoord(y2)}) node[above right,scale=0.85] {$${ineq.name || `d_{${idx + 1}}`}$};`);
      } else if (Math.abs(ineq.a) > 1e-4) {
        const xVal = ineq.c / ineq.a;
        lines.push(`\\draw[thick,${ineq.color ? "blue!80!black" : "black"}] (${formatCoord(xVal)},${minY}) -- (${formatCoord(xVal)},${maxY}) node[above,scale=0.85] {$${ineq.name || `d_{${idx + 1}}`}$};`);
      }
    });

    // Vẽ miền nghiệm (Đa giác nghiệm)
    if (vertices.length >= 3) {
      lines.push(`% 3. Biểu diễn miền nghiệm`);
      const polyCoords = vertices.map((v) => `(${formatCoord(v.x)},${formatCoord(v.y)})`).join(" -- ");

      if (renderMode === "fill_domain") {
        lines.push(`\\fill[blue!20,opacity=0.4] ${polyCoords} -- cycle;`);
        lines.push(`\\draw[very thick,blue!80!black] ${polyCoords} -- cycle;`);
      } else if (renderMode === "hatch_domain") {
        lines.push(`\\fill[pattern=north west lines,pattern color=blue!70] ${polyCoords} -- cycle;`);
        lines.push(`\\draw[very thick,blue!80!black] ${polyCoords} -- cycle;`);
      } else {
        lines.push(`% Gạch sọc nửa mặt phẳng loại bỏ`);
        lines.push(`\\fill[pattern=north west lines,pattern color=gray!50] ${polyCoords} -- cycle;`);
        lines.push(`\\draw[very thick,indigo!80] ${polyCoords} -- cycle;`);
      }

      // Đánh dấu các đỉnh của miền nghiệm
      lines.push(`% 4. Các đỉnh của miền nghiệm`);
      vertices.forEach((v) => {
        const labelText = v.label || "";
        lines.push(`\\fill (${formatCoord(v.x)},${formatCoord(v.y)}) circle (2pt) node[above right,scale=0.9] {$${labelText}(${formatCoord(v.x)};${formatCoord(v.y)})$};`);
        if (showProjections && (Math.abs(v.x) > 1e-4 || Math.abs(v.y) > 1e-4)) {
          lines.push(`\\draw[dashed,gray] (${formatCoord(v.x)},0) -- (${formatCoord(v.x)},${formatCoord(v.y)}) -- (0,${formatCoord(v.y)});`);
        }
      });
    }

    lines.push(`\\end{tikzpicture}`);
    return lines.join("\n");
  }, [boundingBox, inequalities, vertices, renderMode, showGrid, showProjections]);

  // Điều phối kích thước và scale SVG hiển thị trực tiếp
  const svgWidth = 560;
  const svgHeight = 440;
  const { minX, maxX, minY, maxY } = boundingBox;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleX = (svgWidth - 80) / rangeX;
  const scaleY = (svgHeight - 80) / rangeY;
  const toScreenX = (x: number) => 40 + (x - minX) * scaleX;
  const toScreenY = (y: number) => svgHeight - 40 - (y - minY) * scaleY;

  // Thêm bất phương trình mới
  const handleAddInequality = () => {
    const nextColor = COLOR_PALETTE[inequalities.length % COLOR_PALETTE.length];
    setInequalities((prev) => [
      ...prev,
      {
        id: "ineq_" + Date.now(),
        a: 1,
        b: 1,
        op: "<=",
        c: 5,
        name: `d_{${prev.length + 1}}`,
        color: nextColor,
      },
    ]);
  };

  const handleUpdateInequality = (id: string, updates: Partial<LinearInequality>) => {
    setInequalities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteInequality = (id: string) => {
    if (inequalities.length <= 1) {
      toast.warning("Hệ tối thiểu 1 bất phương trình", "Cần giữ lại ít nhất một điều kiện.");
      return;
    }
    setInequalities((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyPreset = (presetId: string) => {
    const p = PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    setInequalities(p.inequalities);
    if (p.objective) {
      setObjA(p.objective.a);
      setObjB(p.objective.b);
    }
    toast.info("Đã nạp bài toán mẫu", p.title);
  };

  const handleCopyTikz = () => {
    navigator.clipboard.writeText(generatedTikzCode);
    setCopiedTikz(true);
    setTimeout(() => setCopiedTikz(false), 2000);
    toast.success("Đã sao chép mã TikZ", "Bạn có thể dán vào nội dung câu hỏi hoặc phần lời giải.");
  };

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(`$${generatedLatexSystem}$`);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
    toast.success("Đã sao chép hệ BPT", "Đã lưu công thức LaTeX vào bộ nhớ tạm.");
  };

  const handleInsert = () => {
    if (onInsertLatex) {
      const fullInsert = `Cho hệ bất phương trình bậc nhất hai ẩn:\n$${generatedLatexSystem}$\n\n${generatedTikzCode}`;
      onInsertLatex(fullInsert);
      toast.success("Đã chèn miền nghiệm vào đề thi", "Hệ bất phương trình và đồ họa TikZ đã được đưa vào đề.");
      onClose();
    } else {
      handleCopyTikz();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/70 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Biểu Diễn Miền Nghiệm Hệ Bất Phương Trình Bậc Nhất Hai Ẩn
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  Toán 10 GDPT
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động tìm giao điểm, xác định đa giác miền nghiệm, tính diện tích & tìm cực trị hàm mục tiêu F(x, y).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung chính Modal: 2 Cột (Trái: Cấu hình hệ & Thông số, Phải: Live Graphic Canvas & Mã TeX) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (5 Cột): Danh mục preset, Thiết lập hệ BPT, Hàm mục tiêu F(x,y) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Presets SGK */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Dạng bài tập mẫu SGK Toán 10:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-left transition flex flex-col gap-0.5 group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {preset.title}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Danh sách các bất phương trình trong hệ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Các bất phương trình trong hệ (ax + by ≤ c):
                </span>
                <button
                  type="button"
                  onClick={handleAddInequality}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm BPT</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {inequalities.map((ineq, idx) => (
                  <div
                    key={ineq.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center gap-2 flex-wrap sm:flex-nowrap"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: ineq.color || "#3b82f6" }}
                      title={`Đường thẳng ${ineq.name || `d${idx + 1}`}`}
                    />

                    {/* Hệ số a (của x) */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={ineq.a}
                        onChange={(e) => handleUpdateInequality(ineq.id, { a: parseFloat(e.target.value) || 0 })}
                        className="w-13 p-1 rounded-md border border-slate-300 dark:border-slate-600 font-mono text-xs text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900"
                        title="Hệ số của x"
                      />
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">x</span>
                    </div>

                    <span className="text-xs font-mono text-slate-400">+</span>

                    {/* Hệ số b (của y) */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={ineq.b}
                        onChange={(e) => handleUpdateInequality(ineq.id, { b: parseFloat(e.target.value) || 0 })}
                        className="w-13 p-1 rounded-md border border-slate-300 dark:border-slate-600 font-mono text-xs text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900"
                        title="Hệ số của y"
                      />
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">y</span>
                    </div>

                    {/* Toán tử so sánh */}
                    <select
                      value={ineq.op}
                      onChange={(e) =>
                        handleUpdateInequality(ineq.id, {
                          op: e.target.value as "<=" | ">=" | "<" | ">",
                        })
                      }
                      className="px-1.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-slate-50 dark:bg-slate-900 outline-none"
                    >
                      <option value="<=">≤</option>
                      <option value=">=">≥</option>
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                    </select>

                    {/* Hằng số c */}
                    <input
                      type="number"
                      value={ineq.c}
                      onChange={(e) => handleUpdateInequality(ineq.id, { c: parseFloat(e.target.value) || 0 })}
                      className="w-13 p-1 rounded-md border border-slate-300 dark:border-slate-600 font-mono text-xs text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900"
                      title="Hằng số vế phải"
                    />

                    {/* Xóa BPT */}
                    <button
                      type="button"
                      onClick={() => handleDeleteInequality(ineq.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ml-auto"
                      title="Xóa bất phương trình này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Thiết lập hàm mục tiêu F(x, y) = ax + by để tìm Max / Min */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableObjective}
                    onChange={(e) => setEnableObjective(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Khảo sát hàm mục tiêu F(x, y) = ax + by (Tìm Max / Min):</span>
                </label>
              </div>

              {enableObjective && (
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">a =</span>
                    <input
                      type="number"
                      value={objA}
                      onChange={(e) => setObjA(parseFloat(e.target.value) || 0)}
                      className="w-16 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 font-mono text-xs font-bold text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">b =</span>
                    <input
                      type="number"
                      value={objB}
                      onChange={(e) => setObjB(parseFloat(e.target.value) || 0)}
                      className="w-16 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 font-mono text-xs font-bold text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 ml-auto">
                    F = {objA}x + {objB}y
                  </div>
                </div>
              )}
            </div>

            {/* 4. Tùy chọn hiển thị đồ thị */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Tùy chọn phong cách biểu diễn:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { mode: "fill_domain", label: "Tô màu nghiệm" },
                  { mode: "hatch_discard", label: "Gạch bỏ nửa mp" },
                  { mode: "hatch_domain", label: "Gạch sọc nghiệm" },
                ].map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => setRenderMode(opt.mode as any)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition ${
                      renderMode === opt.mode
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-1 flex-wrap text-xs text-slate-700 dark:text-slate-300 font-medium">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Vạch chia Oxy</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProjections}
                    onChange={(e) => setShowProjections(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Dóng tọa độ đứt đoạn</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVertexLabels}
                    onChange={(e) => setShowVertexLabels(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Tên đỉnh A, B...</span>
                </label>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (7 Cột): Trình trực quan hóa Live SVG Canvas, Tọa độ các đỉnh & Cực trị */}
          <div className="lg:col-span-7 space-y-4 flex flex-col">
            {/* Live Interactive SVG Canvas */}
            <div className="flex-1 min-h-[380px] p-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-inner flex flex-col relative overflow-hidden select-none">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Mặt phẳng tọa độ Oxy trực tiếp
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {vertices.length >= 3
                    ? `Miền đa giác: ${vertices.length} đỉnh (S = ${formatCoord(area)})`
                    : "Đang dựng miền nghiệm..."}
                </span>
              </div>

              {/* Khung vẽ SVG */}
              <div className="flex-1 flex items-center justify-center py-2 overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full max-h-[360px]"
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    <pattern id="modal-pat-nw" patternUnits="userSpaceOnUse" width="8" height="8">
                      <line x1="0" y1="0" x2="8" y2="8" stroke="#94a3b8" strokeWidth="1.2" />
                    </pattern>
                    <marker
                      id="axis-arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#cbd5e1" />
                    </marker>
                  </defs>

                  {/* 1. Lưới tọa độ (Grid lines) */}
                  {showGrid && (
                    <g opacity="0.15">
                      {Array.from({ length: rangeX + 1 }).map((_, i) => {
                        const xVal = minX + i;
                        return (
                          <line
                            key={`grid-x-${i}`}
                            x1={toScreenX(xVal)}
                            y1={0}
                            x2={toScreenX(xVal)}
                            y2={svgHeight}
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                        );
                      })}
                      {Array.from({ length: rangeY + 1 }).map((_, i) => {
                        const yVal = minY + i;
                        return (
                          <line
                            key={`grid-y-${i}`}
                            x1={0}
                            y1={toScreenY(yVal)}
                            x2={svgWidth}
                            y2={toScreenY(yVal)}
                            stroke="#ffffff"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </g>
                  )}

                  {/* 2. Hai trục tọa độ Ox và Oy */}
                  {/* Trục Ox */}
                  <line
                    x1={0}
                    y1={toScreenY(0)}
                    x2={svgWidth}
                    y2={toScreenY(0)}
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                    markerEnd="url(#axis-arrow)"
                  />
                  <text
                    x={svgWidth - 15}
                    y={toScreenY(0) + 18}
                    fill="#cbd5e1"
                    fontSize="13"
                    fontStyle="italic"
                    fontWeight="bold"
                  >
                    x
                  </text>

                  {/* Trục Oy */}
                  <line
                    x1={toScreenX(0)}
                    y1={svgHeight}
                    x2={toScreenX(0)}
                    y2={0}
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                    markerEnd="url(#axis-arrow)"
                  />
                  <text
                    x={toScreenX(0) - 18}
                    y={16}
                    fill="#cbd5e1"
                    fontSize="13"
                    fontStyle="italic"
                    fontWeight="bold"
                  >
                    y
                  </text>

                  {/* Gốc tọa độ O */}
                  <text
                    x={toScreenX(0) - 15}
                    y={toScreenY(0) + 16}
                    fill="#cbd5e1"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    O
                  </text>

                  {/* Vạch số trên 2 trục */}
                  {showGrid && (
                    <g fill="#94a3b8" fontSize="10" textAnchor="middle">
                      {Array.from({ length: rangeX + 1 }).map((_, i) => {
                        const xVal = minX + i;
                        if (xVal === 0 || xVal < minX || xVal > maxX) return null;
                        return (
                          <text key={`tick-x-${i}`} x={toScreenX(xVal)} y={toScreenY(0) + 14}>
                            {xVal}
                          </text>
                        );
                      })}
                      {Array.from({ length: rangeY + 1 }).map((_, i) => {
                        const yVal = minY + i;
                        if (yVal === 0 || yVal < minY || yVal > maxY) return null;
                        return (
                          <text key={`tick-y-${i}`} x={toScreenX(0) - 12} y={toScreenY(yVal) + 4}>
                            {yVal}
                          </text>
                        );
                      })}
                    </g>
                  )}

                  {/* 3. Các đường thẳng bờ */}
                  {inequalities.map((ineq, i) => {
                    if (Math.abs(ineq.b) > 1e-4) {
                      const y1 = (ineq.c - ineq.a * minX) / ineq.b;
                      const y2 = (ineq.c - ineq.a * maxX) / ineq.b;
                      const x1Screen = toScreenX(minX);
                      const y1Screen = toScreenY(y1);
                      const x2Screen = toScreenX(maxX);
                      const y2Screen = toScreenY(y2);

                      return (
                        <g key={`line-${ineq.id}`}>
                          <line
                            x1={x1Screen}
                            y1={y1Screen}
                            x2={x2Screen}
                            y2={y2Screen}
                            stroke={ineq.color || "#60a5fa"}
                            strokeWidth="2"
                          />
                          {showLineLabels && (
                            <text
                              x={toScreenX(Math.min(maxX - 0.5, (minX + maxX) / 2 + i * 0.8))}
                              y={toScreenY(
                                (ineq.c - ineq.a * Math.min(maxX - 0.5, (minX + maxX) / 2 + i * 0.8)) / ineq.b
                              ) - 8}
                              fill={ineq.color || "#60a5fa"}
                              fontSize="11"
                              fontWeight="bold"
                            >
                              {ineq.name || `d${i + 1}`}
                            </text>
                          )}
                        </g>
                      );
                    } else if (Math.abs(ineq.a) > 1e-4) {
                      const xVal = ineq.c / ineq.a;
                      return (
                        <g key={`line-v-${ineq.id}`}>
                          <line
                            x1={toScreenX(xVal)}
                            y1={toScreenY(minY)}
                            x2={toScreenX(xVal)}
                            y2={toScreenY(maxY)}
                            stroke={ineq.color || "#60a5fa"}
                            strokeWidth="2"
                          />
                          {showLineLabels && (
                            <text
                              x={toScreenX(xVal) + 6}
                              y={toScreenY(maxY) + 20 + i * 15}
                              fill={ineq.color || "#60a5fa"}
                              fontSize="11"
                              fontWeight="bold"
                            >
                              {ineq.name || `x=${formatCoord(xVal)}`}
                            </text>
                          )}
                        </g>
                      );
                    }
                    return null;
                  })}

                  {/* 4. Miền nghiệm (Đa giác nghiệm) */}
                  {vertices.length >= 3 && (
                    <polygon
                      points={vertices
                        .map((v) => `${toScreenX(v.x).toFixed(1)},${toScreenY(v.y).toFixed(1)}`)
                        .join(" ")}
                      fill={
                        renderMode === "hatch_domain"
                          ? "url(#modal-pat-nw)"
                          : "rgba(99, 102, 241, 0.35)"
                      }
                      stroke="#818cf8"
                      strokeWidth="2.5"
                    />
                  )}

                  {/* 5. Đường dóng đứt đoạn đến 2 trục Ox, Oy */}
                  {showProjections &&
                    vertices.map((v, i) => {
                      if (Math.abs(v.x) < 1e-4 && Math.abs(v.y) < 1e-4) return null;
                      return (
                        <g key={`proj-${i}`} stroke="#64748b" strokeDasharray="3 3" strokeWidth="1">
                          <line x1={toScreenX(v.x)} y1={toScreenY(0)} x2={toScreenX(v.x)} y2={toScreenY(v.y)} />
                          <line x1={toScreenX(0)} y1={toScreenY(v.y)} x2={toScreenX(v.x)} y2={toScreenY(v.y)} />
                        </g>
                      );
                    })}

                  {/* 6. Các điểm đỉnh của miền nghiệm */}
                  {vertices.map((v, i) => {
                    const sx = toScreenX(v.x);
                    const sy = toScreenY(v.y);
                    const isMin = extrema.minPoint && Math.abs(v.x - extrema.minPoint.x) < 1e-4 && Math.abs(v.y - extrema.minPoint.y) < 1e-4;
                    const isMax = extrema.maxPoint && Math.abs(v.x - extrema.maxPoint.x) < 1e-4 && Math.abs(v.y - extrema.maxPoint.y) < 1e-4;

                    return (
                      <g key={`vertex-${i}`}>
                        <circle
                          cx={sx}
                          cy={sy}
                          r={isMax ? "6" : isMin ? "5.5" : "4.5"}
                          fill={isMax ? "#f59e0b" : isMin ? "#10b981" : "#ffffff"}
                          stroke="#1e293b"
                          strokeWidth="2"
                        />
                        {showVertexLabels && (
                          <text
                            x={sx + 8}
                            y={sy - 8}
                            fill="#ffffff"
                            fontSize="12"
                            fontWeight="bold"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                          >
                            {v.label || `P${i + 1}`}({formatCoord(v.x)}; {formatCoord(v.y)})
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Bảng phân tích: Tọa độ các đỉnh & Giá trị hàm mục tiêu F(x, y) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Tọa độ các đỉnh & Diện tích */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Tọa độ các đỉnh miền nghiệm:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                    S = {formatCoord(area)} đvdt
                  </span>
                </div>
                <div className="space-y-1">
                  {vertices.length === 0 ? (
                    <span className="text-slate-400 italic">Hệ vô nghiệm hoặc miền nghiệm không giới hạn.</span>
                  ) : (
                    vertices.map((v, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-0.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-mono text-[11px]"
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {v.label || `Đỉnh ${idx + 1}`}:
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          ({formatCoord(v.x)}; {formatCoord(v.y)})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Khảo sát cực trị F(x,y) */}
              {enableObjective && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                      Giá trị F(x, y) = {objA}x + {objB}y:
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {objectiveResults.map((res, idx) => {
                      const isMin = extrema.minPoint === res.point;
                      const isMax = extrema.maxPoint === res.point;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between py-0.5 px-2 rounded-lg border ${
                            isMax
                              ? "bg-amber-100/80 dark:bg-amber-950/60 border-amber-300 text-amber-900 dark:text-amber-200 font-bold"
                              : isMin
                              ? "bg-emerald-100/80 dark:bg-emerald-950/60 border-emerald-300 text-emerald-900 dark:text-emerald-200 font-bold"
                              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span>
                            F({res.point.label}):
                          </span>
                          <span>
                            {formatCoord(res.value)} {isMax ? "(MAX)" : isMin ? "(MIN)" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {extrema.maxPoint && (
                    <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium pt-1">
                      💡 <strong>Kết luận:</strong> Max F = <strong>{formatCoord(extrema.maxVal)}</strong> tại{" "}
                      <strong>{extrema.maxPoint.label}({formatCoord(extrema.maxPoint.x)}; {formatCoord(extrema.maxPoint.y)})</strong>; Min F ={" "}
                      <strong>{formatCoord(extrema.minVal)}</strong>.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLatex}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copiedLatex ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>Chép mã Hệ BPT</span>
            </button>
            <button
              type="button"
              onClick={handleCopyTikz}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copiedTikz ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>Chép mã TikZ hình vẽ</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Chèn Vào Đề Thi / Câu Hỏi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
