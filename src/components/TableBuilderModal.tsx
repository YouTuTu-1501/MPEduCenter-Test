import React, { useState, useMemo } from "react";
import { MathRenderer } from "./MathRenderer";
import { Table, Sparkles, Copy, Check, Plus, Trash2, ArrowUpDown, BarChart, HelpCircle, X } from "lucide-react";
import { useToast } from "../context/ToastContext";

interface TableBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLatex?: (latexCode: string) => void;
}

export type TablePresetType =
  | "sign_table_2_roots"
  | "sign_table_fraction_discontinuous"
  | "variation_cubic"
  | "variation_rational"
  | "grouped_frequency_table"
  | "probability_distribution"
  | "custom";

export const TableBuilderModal: React.FC<TableBuilderModalProps> = ({
  isOpen,
  onClose,
  onInsertLatex,
}) => {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<TablePresetType>("sign_table_2_roots");
  const [copied, setCopied] = useState(false);

  // Cấu hình tùy chỉnh
  const [customRows, setCustomRows] = useState<string[][]>([
    ["$x$", "$-\\infty$", "", "$-1$", "", "$2$", "", "$+\\infty$"],
    ["$f'(x)$", "", "$+$", "$0$", "$-$", "$0$", "$+$", ""],
  ]);
  const [customAlignSpec, setCustomAlignSpec] = useState<string>("|c|ccccccc|");

  // Sinh mã LaTeX dựa trên preset hoặc cấu hình
  const generatedLatex = useMemo(() => {
    switch (selectedPreset) {
      case "sign_table_2_roots":
        return `\\begin{center}
\\begin{tabular}{|c|ccccccc|}
\\hline
$x$ & $-\\infty$ & & $-1$ & & $2$ & & $+\\infty$ \\\\
\\hline
$f'(x)$ & & $+$ & $0$ & $-$ & $0$ & $+$ & \\\\
\\hline
\\end{tabular}
\\end{center}`;

      case "sign_table_fraction_discontinuous":
        return `\\begin{center}
\\begin{tabular}{|c|ccccccc|}
\\hline
$x$ & $-\\infty$ & & $1$ & & $3$ & & $+\\infty$ \\\\
\\hline
$x - 1$ & & $-$ & $0$ & $+$ & & $+$ & \\\\
\\hline
$x - 3$ & & $-$ & & $-$ & $0$ & $+$ & \\\\
\\hline
$f'(x)$ & & $+$ & $0$ & $-$ & $||$ & $+$ & \\\\
\\hline
\\end{tabular}
\\end{center}`;

      case "variation_cubic":
        return `\\begin{center}
\\begin{tabular}{|c|ccccccc|}
\\hline
$x$ & $-\\infty$ & & $-2$ & & $0$ & & $+\\infty$ \\\\
\\hline
$y'$ & & $+$ & $0$ & $-$ & $0$ & $+$ & \\\\
\\hline
$y$ & $-\\infty$ & $\\nearrow$ & $4$ & $\\searrow$ & $0$ & $\\nearrow$ & $+\\infty$ \\\\
\\hline
\\end{tabular}
\\end{center}`;

      case "variation_rational":
        return `\\begin{center}
\\begin{tabular}{|c|ccccc|}
\\hline
$x$ & $-\\infty$ & & $1$ & & $+\\infty$ \\\\
\\hline
$y'$ & & $-$ & $||$ & $-$ & \\\\
\\hline
$y$ & $2$ & $\\searrow$ & $-\\infty \\, || \\, +\\infty$ & $\\searrow$ & $2$ \\\\
\\hline
\\end{tabular}
\\end{center}`;

      case "grouped_frequency_table":
        return `\\begin{center}
\\begin{tabular}{|l|c|c|c|c|c|}
\\hline
\\textbf{Khoảng điểm} & $[0; 2)$ & $[2; 4)$ & $[4; 6)$ & $[6; 8)$ & $[8; 10]$ \\\\
\\hline
\\textbf{Giá trị đại diện} $x_i$ & $1$ & $3$ & $5$ & $7$ & $9$ \\\\
\\hline
\\textbf{Tần số} $m_i$ & $3$ & $7$ & $15$ & $18$ & $7$ \\\\
\\hline
\\textbf{Tần số tích lũy} $C_i$ & $3$ & $10$ & $25$ & $43$ & $50$ \\\\
\\hline
\\end{tabular}
\\end{center}`;

      case "probability_distribution":
        return `\\begin{center}
\\begin{tabular}{|c|c|c|c|c|}
\\hline
$X$ & $0$ & $1$ & $2$ & $3$ \\\\
\\hline
$P(X = x)$ & $0.125$ & $0.375$ & $0.375$ & $0.125$ \\\\
\\hline
\\end{tabular}
\\end{center}`;

      case "custom":
      default: {
        const rowsStr = customRows
          .map((row) => row.join(" & ") + " \\\\")
          .join("\n\\hline\n");
        return `\\begin{center}
\\begin{tabular}{${customAlignSpec}}
\\hline
${rowsStr}
\\hline
\\end{tabular}
\\end{center}`;
      }
    }
  }, [selectedPreset, customRows, customAlignSpec]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLatex);
    setCopied(true);
    toast.success("Đã sao chép mã bảng LaTeX", "Bạn có thể dán mã này vào câu hỏi hoặc tệp TeX.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (onInsertLatex) {
      onInsertLatex(generatedLatex);
      toast.success("Đã chèn bảng vào nội dung", "Bảng đã được thêm vào vị trí soạn thảo.");
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Công cụ Vẽ & Thiết kế Bảng Toán học (Table Generator)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tạo Bảng xét dấu, Bảng biến thiên, Bảng thống kê ghép nhóm chuẩn GDPT 2018
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Chọn Mẫu Bảng Chuẩn Toán THPT:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: "sign_table_2_roots",
                  name: "Bảng xét dấu 2 nghiệm",
                  desc: "Đạo hàm f'(x) có 2 mốc 0",
                  icon: "📊",
                },
                {
                  id: "sign_table_fraction_discontinuous",
                  name: "Bảng xét dấu có ||",
                  desc: "Điểm gián đoạn không xác định",
                  icon: "📉",
                },
                {
                  id: "variation_cubic",
                  name: "Bảng biến thiên bậc 3",
                  desc: "Đầy đủ 3 dòng x, y', y với ↗ ↘",
                  icon: "📈",
                },
                {
                  id: "variation_rational",
                  name: "Bảng biến thiên phân thức",
                  desc: "Có tiệm cận đứng || và tiệm cận ngang",
                  icon: "📐",
                },
                {
                  id: "grouped_frequency_table",
                  name: "Mẫu số liệu ghép nhóm",
                  desc: "Thống kê 12: Khoảng, Tần số, Tích lũy",
                  icon: "📋",
                },
                {
                  id: "probability_distribution",
                  name: "Phân bố xác suất",
                  desc: "Bảng giá trị X và P(X=x)",
                  icon: "🎲",
                },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPreset(p.id as TablePresetType)}
                  className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                    selectedPreset === p.id
                      ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{p.icon}</span>
                    <span className="font-bold text-xs">{p.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-indigo-600" />
                Xem trước Hiển thị (Live Preview):
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                ✓ Render chuẩn KaTeX & Tailwind
              </span>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[140px] shadow-inner">
              <MathRenderer content={generatedLatex} />
            </div>
          </div>

          {/* LaTeX Code View */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mã nguồn LaTeX sinh ra:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{copied ? "Đã sao chép" : "Sao chép mã TeX"}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={5}
              value={generatedLatex}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-emerald-400 font-mono text-xs outline-none select-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            💡 Mẹo: Có thể chèn trực tiếp vào câu hỏi trong Đề thi
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Đóng
            </button>
            {onInsertLatex && (
              <button
                type="button"
                onClick={handleInsert}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Chèn bảng vào câu hỏi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
