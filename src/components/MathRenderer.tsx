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
 * Hàm giải mã các HTML entities lọt vào công thức LaTeX
 */
function decodeHtmlEntitiesInMath(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, " \\\\ ");
}

/**
 * Hàm làm sạch và chuẩn hóa công thức toán trước khi truyền vào KaTeX
 */
function cleanMath(raw: string): string {
  if (!raw) return "";
  let m = decodeHtmlEntitiesInMath(raw.trim());

  // Chuẩn hóa vector macro
  m = m.replace(/\\underrightarrow\{([^}]+)\}/g, "\\overrightarrow{$1}");
  m = m.replace(/\\vect\{([^}]+)\}/g, "\\overrightarrow{$1}");
  m = m.replace(/\\vec\{([^}]+)\}/g, "\\overrightarrow{$1}");
  m = m.replace(/\\vec\s+([a-zA-Z0-9])/g, "\\overrightarrow{$1}");

  // Chuẩn hóa các ký hiệu mũi tên thường gặp trong bảng biến thiên
  m = m.replace(/\\nearrow/g, "\\nearrow");
  m = m.replace(/\\searrow/g, "\\searrow");
  m = m.replace(/\\uparrow/g, "\\uparrow");
  m = m.replace(/\\downarrow/g, "\\downarrow");

  // Chuẩn hóa vạch kép trong array bảng biến thiên nếu cần
  m = m.replace(/\\parallel/g, "\\parallel");

  // Dọn dẹp các dấu xuống dòng kép thừa trước \end{array}
  m = m.replace(/\\\\\s*\\end\{array\}/g, "\\end{array}");
  m = m.replace(/\\\\\s*\\end\{matrix\}/g, "\\end{matrix}");
  m = m.replace(/\\\\\s*\\end\{aligned\}/g, "\\end{aligned}");

  return m;
}

/**
 * Component render nội dung chứa công thức Toán học LaTeX, Bảng biểu (Tabular, tkz-tab, Bảng xét dấu/biến thiên/thống kê),
 * TikZ Vector Graphics và các macro chuyên sâu trong SGK GDPT 2018.
 * Hỗ trợ inline: $...$ hoặc \(...\)
 * Hỗ trợ block/display: $$...$$ hoặc \[...\]
 * Hỗ trợ môi trường array, tabular, tkz-tab, tikzpicture
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
    const mathList: string[] = [];

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
    // 1. TRÍCH XUẤT CÁC LOẠI BẢNG TOÁN HỌC (tkz-tab, Tabular)
    // =========================================================================

    // 1.1. Xử lý bảng tkz-tab bên trong tikzpicture (có hoặc không có \begin{center})
    text = text.replace(
      /(?:\\begin\{center\}\s*)?\\begin\{tikzpicture\}[\s\S]*?\\tkzTabInit[\s\S]*?\\end\{tikzpicture\}(?:\s*\\end\{center\})?/g,
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

    // 1.2. Xử lý \begin{center}\begin{tabular} ... \end{tabular}\end{center}
    text = text.replace(
      /\\begin\{center\}\s*(\\begin\{tabular\}[\s\S]*?\\end\{tabular\})\s*\\end\{center\}/g,
      (_, tabularCode) => {
        const idx = tableList.length;
        const html = parseLatexTabular(tabularCode);
        tableList.push(html);
        return `%%%TABLE_PLACEHOLDER_${idx}%%%`;
      }
    );

    // 1.3. Xử lý \begin{table} ... \begin{tabular} ... \end{tabular} ... \end{table}
    text = text.replace(
      /\\begin\{table\}(?:\[[^\]]*\])?[\s\S]*?(\\begin\{tabular\}[\s\S]*?\\end\{tabular\})[\s\S]*?\\end\{table\}/g,
      (_, tabularCode) => {
        const idx = tableList.length;
        const html = parseLatexTabular(tabularCode);
        tableList.push(html);
        return `%%%TABLE_PLACEHOLDER_${idx}%%%`;
      }
    );

    // 1.4. Xử lý \begin{tabular} ... \end{tabular} độc lập
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
    // 2. TRÍCH XUẤT HÌNH VẼ TIKZ (\begin{tikzpicture} ... \end{tikzpicture})
    // =========================================================================
    const detectedLibs: string[] = [];
    text = text.replace(/\\usetikzlibrary\{([^}]+)\}/gi, (_, libs) => {
      libs.split(",").forEach((l: string) => detectedLibs.push(l.trim()));
      return "";
    });
    text = text.replace(/\\usepackage(?:\s*\[[^\]]*\])?\{([^}]+)\}/gi, "");

    text = text.replace(
      /\\begin\{center\}\s*(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})\s*\\end\{center\}/g,
      (_, tikz) => {
        const idx = tikzList.length;
        const svg = renderTikzWithPackages(tikz, detectedLibs);
        tikzList.push(svg);
        return `%%%TIKZ_PLACEHOLDER_${idx}%%%`;
      }
    );

    text = text.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, (tikz) => {
      const idx = tikzList.length;
      const svg = renderTikzWithPackages(tikz, detectedLibs);
      tikzList.push(svg);
      return `%%%TIKZ_PLACEHOLDER_${idx}%%%`;
    });

    // =========================================================================
    // 3. XỬ LÝ ĐẶC BIỆT: \begin{array} NẰM NGOÀI DẤU $$ HOẶC $
    // =========================================================================
    text = text.replace(
      /(?<!\$|\(|\[)\\begin\{array\}\{([\s\S]*?)\}([\s\S]*?)\\end\{array\}(?!\$|\)|\])/g,
      (match) => `$$${match}$$`
    );

    // =========================================================================
    // 4. TRÍCH XUẤT VÀ RENDER CÁC KHỐI TOÁN HỌC KATEX
    // =========================================================================
    // Regex chuẩn xác bắt: $$...$$, \[...\], $...$, \(...\)
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;

    text = text.replace(mathRegex, (match) => {
      let isDisplay = false;
      let rawMath = "";

      if (match.startsWith("$$") && match.endsWith("$$")) {
        isDisplay = true;
        rawMath = match.slice(2, -2);
      } else if (match.startsWith("\\[") && match.endsWith("\\]")) {
        isDisplay = true;
        rawMath = match.slice(2, -2);
      } else if (match.startsWith("$") && match.endsWith("$")) {
        isDisplay = false;
        rawMath = match.slice(1, -1);
      } else if (match.startsWith("\\(") && match.endsWith("\\)")) {
        isDisplay = false;
        rawMath = match.slice(2, -2);
      } else {
        return match;
      }

      const cleaned = cleanMath(rawMath);
      let rendered = "";

      try {
        rendered = katex.renderToString(cleaned, {
          displayMode: isDisplay,
          throwOnError: false,
          strict: false,
        });
      } catch {
        // Fallback lần 2 nếu có lỗi cú pháp nhẹ
        try {
          const simplified = cleaned
            .replace(/\\;/g, " ")
            .replace(/\\,/g, " ")
            .replace(/\\quad/g, " ");
          rendered = katex.renderToString(simplified, {
            displayMode: isDisplay,
            throwOnError: false,
            strict: false,
          });
        } catch {
          rendered = `<span class="text-rose-500 font-mono text-xs">${match}</span>`;
        }
      }

      const idx = mathList.length;
      mathList.push(rendered);
      return `%%%MATH_PLACEHOLDER_${idx}%%%`;
    });

    // =========================================================================
    // 5. CHUẨN HÓA VĂN BẢN PLAIN TEXT (Sau khi đã bảo vệ toàn bộ Math/TikZ/Tables)
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
    text = text.replace(/\\faCompass\\?\s*/g, `<span class="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400 mr-1.5">🧭 </span>`);
    text = text.replace(/\\faEdit\\?\s*/g, `<span class="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400 mr-1.5">📝 </span>`);
    text = text.replace(/\\faExclamationTriangle\\?\s*/g, `<span class="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 mr-1.5">⚠️ </span>`);

    // Chuyển đổi môi trường itemchoice thành danh sách ý a), b), c), d)
    if (text.includes("\\begin{itemchoice}")) {
      text = text.replace(/\\begin\{itemchoice\}([\s\S]*?)\\end\{itemchoice\}/g, (_, inner) => {
        const items = inner.split("\\item").filter((s: string) => s.trim().length > 0);
        const letters = ["a", "b", "c", "d", "e", "f"];
        const listHtml = items
          .map((itemText: string, idx: number) => {
            const letter = letters[idx] || (idx + 1).toString();
            return `<div class="my-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800"><b class="text-indigo-600 dark:text-indigo-400 font-bold">${letter})</b> ${itemText.trim()}</div>`;
          })
          .join("");
        return `<div class="my-2 space-y-1">${listHtml}</div>`;
      });
    }

    // Chuyển đổi enumerate & itemize cơ bản
    text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, inner) => {
      const items = inner.split("\\item").filter((s: string) => s.trim().length > 0);
      const listHtml = items
        .map((it: string, idx: number) => `<li class="my-1 pl-1"><span class="font-bold text-slate-700 dark:text-slate-200 mr-1.5">${idx + 1}.</span>${it.trim()}</li>`)
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
    text = text.replace(/\\mathrm{\\s*\\,N}/g, " N");
    text = text.replace(/\\mathrm{\\s*N}/g, " N");

    // Thay thế xuống dòng và khoảng trắng CHỈ trên phần plain text
    text = text.replace(/\\\\/g, "<br/>");
    text = text.replace(/\\ /g, "&nbsp;");
    text = text.replace(/\n/g, "<br/>");

    // =========================================================================
    // 6. PHỤC HỒI TOÀN BỘ CÔNG THỨC TOÁN, BẢNG TABLE VÀO ĐÚNG VỊ TRÍ
    // =========================================================================
    // Phục hồi Math
    mathList.forEach((mathHtml, idx) => {
      text = text.replace(`%%%MATH_PLACEHOLDER_${idx}%%%`, mathHtml);
    });

    // Phục hồi Table
    tableList.forEach((tblHtml, idx) => {
      text = text.replace(`%%%TABLE_PLACEHOLDER_${idx}%%%`, tblHtml);
    });

    // Phân tách thành các phân đoạn chứa TikZ hoặc HTML thông thường
    const segs = text.split(/(%%%TIKZ_PLACEHOLDER_\d+%%%)/g);

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

