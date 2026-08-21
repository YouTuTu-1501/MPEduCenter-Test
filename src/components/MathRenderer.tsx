import React, { useMemo } from "react";
import katex from "katex";
import { renderTikzWithPackages } from "../utils/tikzParser";
import { parseTkzTab, parseLatexTabular } from "../utils/tableParser";
import { InteractiveFigureViewer } from "./InteractiveFigureViewer";

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Component render nội dung chứa công thức Toán học LaTeX, Bảng biểu (Tabular, tkz-tab, Bảng xét dấu/biến thiên/thống kê),
 * TikZ Vector Graphics và các macro chuyên sâu trong SGK GDPT 2018.
 * Hỗ trợ inline: $...$ hoặc \(...\)
 * Hỗ trợ block/display: $$...$$ hoặc \[...\]
 * Hỗ trợ các macro: \faCompass, \faEdit, \faExclamationTriangle, \textbf, \textit, itemchoice
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  content = "",
  className = "",
  inline = false,
}) => {
  const { segments, tikzBlocks, hasTikz } = useMemo(() => {
    if (!content) return { segments: [], tikzBlocks: [], hasTikz: false };

    let text = content;
    const tableList: string[] = [];
    const tikzList: string[] = [];

    // =========================================================================
    // 0. CHUẨN HÓA & BÓC TÁCH CÁC MACRO ĐẶC BIỆT (\loigiai, \begin{loigiai})
    // =========================================================================
    text = text.replace(/^\\loigiai\s*\{([\s\S]*)\}\s*$/i, "$1");
    text = text.replace(/\\begin\{loigiai\}([\s\S]*?)\\end\{loigiai\}/gi, "$1");
    text = text.replace(/\\loigiai\s*\{/gi, "");
    text = text.replace(/\\begin\{loigiai\}/gi, "");
    text = text.replace(/\\end\{loigiai\}/gi, "");
    text = text.replace(/\\loigiai\b(?:\s*\[[^\]]*\])?/gi, "");

    // =========================================================================
    // 0.1. XỬ LÝ CÁC LOẠI BẢNG TOÁN HỌC (Tabular, tkz-tab, Bảng xét dấu, Bảng biến thiên, Bảng thống kê)
    // =========================================================================

    // 0.1.1. Xử lý bảng tkz-tab bên trong tikzpicture
    text = text.replace(
      /\\begin\{tikzpicture\}[\s\S]*?\\tkzTabInit[\s\S]*?\\end\{tikzpicture\}/g,
      (match) => {
        const parsed = parseTkzTab(match);
        if (parsed) {
          const idx = tableList.length;
          tableList.push(parsed);
          return `%%%TABLE_PLACEHOLDER_${idx}%%%`;
        }
        return match;
      }
    );

    // 0.2. Xử lý \begin{center}\begin{tabular} ... \end{tabular}\end{center}
    text = text.replace(
      /\\begin\{center\}\s*(\\begin\{tabular\}[\s\S]*?\\end\{tabular\})\s*\\end\{center\}/g,
      (_, tabularCode) => {
        const idx = tableList.length;
        const html = parseLatexTabular(tabularCode);
        tableList.push(html);
        return `%%%TABLE_PLACEHOLDER_${idx}%%%`;
      }
    );

    // 0.3. Xử lý \begin{table} ... \begin{tabular} ... \end{tabular} ... \end{table}
    text = text.replace(
      /\\begin\{table\}(?:\[[^\]]*\])?[\s\S]*?(\\begin\{tabular\}[\s\S]*?\\end\{tabular\})[\s\S]*?\\end\{table\}/g,
      (_, tabularCode) => {
        const idx = tableList.length;
        const html = parseLatexTabular(tabularCode);
        tableList.push(html);
        return `%%%TABLE_PLACEHOLDER_${idx}%%%`;
      }
    );

    // 0.4. Xử lý \begin{tabular} ... \end{tabular} độc lập
    text = text.replace(
      /\\begin\{tabular\}(?:\[[^\]]*\])?\{[^}]+\}[\s\S]*?\\end\{tabular\}/g,
      (tabularCode) => {
        const idx = tableList.length;
        const html = parseLatexTabular(tabularCode);
        tableList.push(html);
        return `%%%TABLE_PLACEHOLDER_${idx}%%%`;
      }
    );

    // =========================================================================
    // 1. XỬ LÝ HÌNH VẼ TIKZ HÌNH HỌC KHÔNG GIAN, ĐỒ THỊ (\begin{tikzpicture} ... \end{tikzpicture})
    // =========================================================================
    text = text.replace(
      /\\begin\{center\}\s*(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})\s*\\end\{center\}/g,
      (_, tikz) => {
        const idx = tikzList.length;
        const svg = renderTikzWithPackages(tikz);
        tikzList.push(svg);
        return `%%%TIKZ_PLACEHOLDER_${idx}%%%`;
      }
    );

    text = text.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, (tikz) => {
      const idx = tikzList.length;
      const svg = renderTikzWithPackages(tikz);
      tikzList.push(svg);
      return `%%%TIKZ_PLACEHOLDER_${idx}%%%`;
    });

    // =========================================================================
    // 2. CHUẨN HÓA MÔI TRƯỜNG CĂN CHỈNH & LIST CỦA LATEX
    // =========================================================================
    // Chuẩn hóa \begin{center} ... \end{center} còn lại
    text = text.replace(
      /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
      `<div class="flex flex-col items-center justify-center my-3 text-center w-full">$1</div>`
    );

    // Chuẩn hóa \begin{flushleft} & \begin{flushright}
    text = text.replace(
      /\\begin\{flushleft\}([\s\S]*?)\\end\{flushleft\}/g,
      `<div class="text-left my-2">$1</div>`
    );
    text = text.replace(
      /\\begin\{flushright\}([\s\S]*?)\\end\{flushright\}/g,
      `<div class="text-right my-2">$1</div>`
    );

    // Chuẩn hóa các icon FontAwesome trong LaTeX
    text = text.replace(/\\faCompass\\?\s*/g, `<span class="inline-flex items-center gap-1 font-bold text-indigo-700 mr-1.5">🧭 </span>`);
    text = text.replace(/\\faEdit\\?\s*/g, `<span class="inline-flex items-center gap-1 font-bold text-indigo-700 mr-1.5">📝 </span>`);
    text = text.replace(/\\faExclamationTriangle\\?\s*/g, `<span class="inline-flex items-center gap-1 font-bold text-amber-600 mr-1.5">⚠️ </span>`);

    // Chuyển đổi môi trường itemchoice thành danh sách ý a), b), c), d)
    if (text.includes("\\begin{itemchoice}")) {
      text = text.replace(/\\begin\{itemchoice\}([\s\S]*?)\\end\{itemchoice\}/g, (_, inner) => {
        const items = inner.split("\\item").filter((s: string) => s.trim().length > 0);
        const letters = ["a", "b", "c", "d", "e", "f"];
        const listHtml = items
          .map((itemText: string, idx: number) => {
            const letter = letters[idx] || (idx + 1).toString();
            return `<div class="my-1.5 pl-3 border-l-2 border-indigo-200"><b class="text-indigo-600 font-bold">${letter})</b> ${itemText.trim()}</div>`;
          })
          .join("");
        return `<div class="my-2 space-y-1">${listHtml}</div>`;
      });
    }

    // Chuyển đổi enumerate & itemize cơ bản
    text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, inner) => {
      const items = inner.split("\\item").filter((s: string) => s.trim().length > 0);
      const listHtml = items
        .map((it: string, idx: number) => `<li class="my-1 pl-1"><span class="font-bold text-slate-700 mr-1.5">${idx + 1}.</span>${it.trim()}</li>`)
        .join("");
      return `<ul class="my-2 pl-4 list-none">${listHtml}</ul>`;
    });

    text = text.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, inner) => {
      const items = inner.split("\\item").filter((s: string) => s.trim().length > 0);
      const listHtml = items
        .map((it: string) => `<li class="my-1 pl-1 flex items-start gap-1.5"><span class="text-indigo-500 font-black">•</span><span>${it.trim()}</span></li>`)
        .join("");
      return `<ul class="my-2 pl-3 list-none">${listHtml}</ul>`;
    });

    // Chuẩn hóa định dạng văn bản cơ bản
    text = text.replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>");
    text = text.replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>");
    text = text.replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>");
    text = text.replace(/\\textsf\{([^}]+)\}/g, '<span class="font-sans">$1</span>');
    text = text.replace(/\\mathrm{\\s*\\,N}/g, "\\text{ N}");
    text = text.replace(/\\mathrm{\\s*N}/g, "\\text{ N}");
    text = text.replace(/\\ /g, "&nbsp;");
    text = text.replace(/\\\\/g, "<br/>");

    // =========================================================================
    // 3. TÁCH VÀ RENDER CÁC ĐOẠN CÔNG THỨC KATEX
    // =========================================================================
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
    const parts = text.split(regex);

    const cleanMath = (raw: string) => {
      let m = raw;
      m = m.replace(/\\underrightarrow\{([^}]+)\}/g, "\\overrightarrow{$1}");
      m = m.replace(/\\vect\{([^}]+)\}/g, "\\overrightarrow{$1}");
      m = m.replace(/\\vec\{([^}]+)\}/g, "\\overrightarrow{$1}");
      m = m.replace(/\\vec\s+([a-zA-Z0-9])/g, "\\overrightarrow{$1}");
      return m;
    };

    const formattedParts = parts.map((part) => {
      if (!part) return "";

      // Block math $$
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const math = cleanMath(part.slice(2, -2).trim());
        try {
          return katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
        } catch {
          return `<span class="text-red-500 font-mono">${part}</span>`;
        }
      }

      // Block math \[ \]
      if (part.startsWith("\\[") && part.endsWith("\\]")) {
        const math = cleanMath(part.slice(2, -2).trim());
        try {
          return katex.renderToString(math, { displayMode: true, throwOnError: false, strict: false });
        } catch {
          return `<span class="text-red-500 font-mono">${part}</span>`;
        }
      }

      // Inline math $ $
      if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
        const math = cleanMath(part.slice(1, -1).trim());
        try {
          return katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
        } catch {
          return `<span class="text-red-500 font-mono">${part}</span>`;
        }
      }

      // Inline math \( \)
      if (part.startsWith("\\(") && part.endsWith("\\)")) {
        const math = cleanMath(part.slice(2, -2).trim());
        try {
          return katex.renderToString(math, { displayMode: false, throwOnError: false, strict: false });
        } catch {
          return `<span class="text-red-500 font-mono">${part}</span>`;
        }
      }

      // Plain text (xử lý xuống dòng)
      return part.replace(/\n/g, "<br/>");
    });

    let combinedHtml = formattedParts.join("");

    // =========================================================================
    // 4. PHỤC HỒI CÁC BẢNG TABLE VÀ TIKZ VÀO ĐÚNG VỊ TRÍ
    // =========================================================================
    // Phục hồi Table
    tableList.forEach((tblHtml, idx) => {
      combinedHtml = combinedHtml.replace(`%%%TABLE_PLACEHOLDER_${idx}%%%`, tblHtml);
    });

    // Phân tách thành các phân đoạn chứa TikZ hoặc HTML thông thường
    const segs = combinedHtml.split(/(%%%TIKZ_PLACEHOLDER_\d+%%%)/g);

    return {
      segments: segs,
      tikzBlocks: tikzList,
      hasTikz: tikzList.length > 0,
    };
  }, [content]);

  // Nếu không có TikZ
  if (!hasTikz) {
    const rawHtml = segments.join("");
    if (inline) {
      return (
        <span
          className={`math-content inline ${className}`}
          dangerouslySetInnerHTML={{ __html: rawHtml }}
        />
      );
    }
    return (
      <div
        className={`math-content ${className}`}
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    );
  }

  // Nếu có hình vẽ TikZ: render từng phần và bao bọc hình vẽ bằng InteractiveFigureViewer
  return (
    <div className={`math-content ${className}`}>
      {segments.map((seg, sIdx) => {
        const match = seg.match(/^%%%TIKZ_PLACEHOLDER_(\d+)%%%$/);
        if (match) {
          const tikzIdx = parseInt(match[1], 10);
          const svg = tikzBlocks[tikzIdx];
          if (!svg) return null;
          return (
            <InteractiveFigureViewer
              key={`tikz-viewer-${sIdx}`}
              svgHtml={svg}
              caption="Hình vẽ minh họa (TikZ Vector) • Dùng công cụ để Phóng to / Thu nhỏ / Xoay"
            />
          );
        }

        if (!seg.trim()) return null;

        return (
          <span
            key={`seg-${sIdx}`}
            dangerouslySetInnerHTML={{ __html: seg }}
          />
        );
      })}
    </div>
  );
};
