import React, { useMemo } from "react";
import katex from "katex";
import { renderTikzWithPackages, DEFAULT_TIKZ_PACKAGES, extractLatexMacros } from "../utils/tikzParser";
import {
  preprocessTikzCode,
  preprocessTikzInLatex,
  STANDARD_TIKZ_3D_LIBRARIES,
} from "../utils/tikzProcessor";
import { parseTkzTab, parseLatexTabular } from "../utils/tableParser";
import { InteractiveFigureViewer } from "./InteractiveFigureViewer";

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Danh mục macro KaTeX toàn cục hỗ trợ chương trình Toán học phổ thông & nâng cao
 */
const KATEX_GLOBAL_MACROS: Record<string, string> = {
  // Vi phân và tích phân
  "\\dd": "\\mathrm{d}",
  "\\d": "\\mathrm{d}",
  "\\dx": "\\mathrm{d}x",
  "\\dy": "\\mathrm{d}y",
  "\\dz": "\\mathrm{d}z",
  "\\dt": "\\mathrm{d}t",
  "\\du": "\\mathrm{d}u",
  "\\dv": "\\mathrm{d}v",
  "\\dr": "\\mathrm{d}r",
  "\\e": "\\mathrm{e}",
  "\\i": "\\mathrm{i}",

  // Vector và góc
  "\\vect": "\\overrightarrow{#1}",
  "\\vec": "\\overrightarrow{#1}",
  "\\vv": "\\overrightarrow{#1}",
  "\\va": "\\overrightarrow{#1}",
  "\\underrightarrow": "\\overrightarrow{#1}",
  "\\wideparen": "\\overset{\\frown}{#1}",
  "\\arc": "\\overset{\\frown}{#1}",
  "\\degree": "^{\\circ}",
  "\\deg": "^{\\circ}",
  "\\ang": "\\angle #1",

  // Quan hệ và so sánh
  "\\parallel": "\\mathrel{/\\mkern-5mu/}",
  "\\notparallel": "\\nparallel",
  "\\le": "\\leqslant",
  "\\ge": "\\geqslant",
  "\\leq": "\\leqslant",
  "\\geq": "\\geqslant",

  // Tập hợp số và tổ hợp
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\CC": "\\mathbb{C}",
  "\\C": "\\mathrm{C}",
  "\\A": "\\mathrm{A}",
  "\\P": "\\mathrm{P}",

  // Giới hạn và phân số
  "\\limx": "\\lim_{x \\to #1}",
  "\\limt": "\\lim_{t \\to #1}",
  "\\limn": "\\lim_{n \\to +\\infty}",
  "\\dfrac": "\\frac{#1}{#2}",
  "\\tbinom": "\\binom{#1}{#2}",
  "\\dbinom": "\\binom{#1}{#2}",

  // Trị tuyệt đối và chuẩn
  "\\abs": "\\left|#1\\right|",
  "\\norm": "\\left\\|#1\\right\\|",

  // Hàm lượng giác theo SGK GDPT
  "\\cot": "\\operatorname{cot}",
  "\\arccot": "\\operatorname{arccot}",
  "\\tg": "\\tan",
  "\\cotg": "\\operatorname{cot}",
  "\\arcsin": "\\operatorname{arcsin}",
  "\\arccos": "\\operatorname{arccos}",
  "\\arctan": "\\operatorname{arctan}",
  "\\sgn": "\\operatorname{sgn}",
  "\\gcd": "\\operatorname{gcd}",
  "\\lcm": "\\operatorname{lcm}",
  "\\mod": "\\pmod{#1}",

  // Hệ phương trình, bất phương trình và ký hiệu SGK GDPT
  "\\heva": "\\begin{cases}#1\\end{cases}",
  "\\hoac": "\\left[\\begin{array}{l}#1\\end{array}\\right.",
  "\\system": "\\begin{cases}#1\\end{cases}",
  "\\pt": "\\mathrm{pt}",
  "\\hpt": "\\mathrm{hpt}",
  "\\bpt": "\\mathrm{bpt}",
  "\\hbpt": "\\mathrm{hbpt}",
  "\\dang": "\\angle",

  // Ký hiệu bổ trợ và không gian
  "\\bm": "\\boldsymbol{#1}",
  "\\bold": "\\mathbf{#1}",
  "\\unit": "\\mathrm{#1}",
  "\\micro": "\\mu",
  "\\Oxyz": "Oxyz",
  "\\Oxy": "Oxy",
  "\\true": "\\text{Đúng}",
  "\\false": "\\text{Sai}",
};

/**
 * Hàm giải mã các HTML entities lọt vào công thức LaTeX
 */
function decodeHtmlEntitiesInMath(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&le;/gi, "\\le ")
    .replace(/&ge;/gi, "\\ge ")
    .replace(/&ne;/gi, "\\ne ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, " \\\\ ");
}

/**
 * Trích xuất và thay thế an toàn các macro có cặp ngoặc nhọn lồng nhau {...} (như \\heva{...}, \\hoac{...})
 */
function replaceBalancedMacro(
  input: string,
  macroName: string,
  transform: (inner: string) => string
): string {
  let result = "";
  let cursor = 0;
  const pattern = new RegExp(`\\\\${macroName}\\s*\\{`, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    const startIdx = match.index;
    result += input.substring(cursor, startIdx);
    const braceStart = pattern.lastIndex - 1;

    let depth = 1;
    let braceEnd = -1;
    for (let i = braceStart + 1; i < input.length; i++) {
      const char = input[i];
      if (char === "\\") {
        i++; // Bỏ qua escape
        continue;
      }
      if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) {
          braceEnd = i;
          break;
        }
      }
    }

    if (braceEnd !== -1) {
      const innerContent = input.substring(braceStart + 1, braceEnd);
      result += transform(innerContent);
      cursor = braceEnd + 1;
      pattern.lastIndex = cursor;
    } else {
      // Không đóng ngoặc: giữ nguyên
      result += input.substring(startIdx, pattern.lastIndex);
      cursor = pattern.lastIndex;
    }
  }

  result += input.substring(cursor);
  return result;
}

/**
 * Chuẩn hóa các dòng phương trình/bất phương trình trong hệ
 */
function formatSystemLines(inner: string): string[] {
  let normalized = inner;
  // Chuẩn hóa dấu \ đơn lẻ kèm khoảng trắng/tab/xuống dòng giữa các phương trình (kể cả cùng một dòng hoặc nhiều dòng) thành \\
  normalized = normalized.replace(/(?<=[^\\])\\\s+(?=\S)/g, " \\\\ ");
  normalized = normalized.replace(/(?<=[^\\])\\\s*(\n|$)/g, " \\\\ ");

  // Tách dòng bởi \\ hoặc \cr
  const rawLines = normalized.split(/\\\\|\\cr/g);
  const formatted: string[] = [];

  for (const raw of rawLines) {
    let line = raw.trim();
    if (!line) continue;
    // Chuẩn hóa & thừa ở đầu dòng nếu không phải căn lề 2 cột
    if (line.startsWith("&")) {
      line = line.replace(/^&\s*/, "");
    }
    // Xóa dấu phẩy hoặc chấm phẩy cuối dòng nếu đứng trước xuống dòng
    line = line.replace(/[,;]\s*$/, "");
    if (line) {
      formatted.push(line);
    }
  }
  return formatted;
}

/**
 * Hàm làm sạch và chuẩn hóa công thức toán trước khi truyền vào KaTeX
 */
function cleanMath(raw: string): string {
  if (!raw) return "";
  let m = decodeHtmlEntitiesInMath(raw.trim());

  // 0. Chuẩn hóa các dấu ngắt dòng trong môi trường hệ phương trình / bảng array / cases / aligned
  // Hỗ trợ trường hợp gõ nhầm 1 dấu \ trước khoảng trắng hoặc xuống dòng (ví dụ "0\ -x" hoặc "0\\\n")
  m = m.replace(
    /(\\begin\{(?:array|cases|aligned)\}(?:\{[^}]*\})?)([\s\S]*?)(\\end\{(?:array|cases|aligned)\})/gi,
    (match, open, body, close) => {
      let b = body;
      // Chuyển đổi dấu \ đơn lẻ kèm khoảng trắng/tab/xuống dòng giữa các phương trình thành \\
      b = b.replace(/(?<=[^\\])\\\s+(?=\S)/g, " \\\\ ");
      b = b.replace(/(?<=[^\\])\\\s*(\n|$)/g, " \\\\ ");

      // Tách dòng và bổ sung \\ nếu các phương trình nằm trên các dòng riêng mà thiếu \\
      const rawLines = b.split("\n");
      const newLines: string[] = [];
      for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i];
        if (!line.trim()) {
          newLines.push(line);
          continue;
        }
        if (
          !line.trim().endsWith("\\\\") &&
          !line.trim().endsWith("\\cr") &&
          i < rawLines.length - 1
        ) {
          const remaining = rawLines.slice(i + 1).some((l) => l.trim().length > 0);
          if (remaining) {
            line = line + " \\\\";
          }
        }
        newLines.push(line);
      }
      b = newLines.join("\n");
      // Dọn dẹp \\ thừa ở cuối body
      b = b.replace(/\\\\\s*$/g, "");
      return open + b + close;
    }
  );

  // Chuẩn hóa \ đơn lẻ trong \left\{ ... \right.
  m = m.replace(/(\\left[\{\[])([\s\S]*?)(\\right\.)/gi, (match, open, body, close) => {
    if (!body.includes("\\begin{")) {
      let b = body;
      b = b.replace(/(?<=[^\\])\\\s+(?=\S)/g, " \\\\ ");
      b = b.replace(/(?<=[^\\])\\\s*(\n|$)/g, " \\\\ ");
      return open + b + close;
    }
    return match;
  });

  // 1. Xử lý chuẩn xác các macro hệ phương trình \heva{...}, \system{...} bằng thuật toán đếm ngoặc
  m = replaceBalancedMacro(m, "heva", (inner) => {
    const lines = formatSystemLines(inner);
    return `\\begin{cases}${lines.join(" \\\\ ")}\\end{cases}`;
  });

  m = replaceBalancedMacro(m, "system", (inner) => {
    const lines = formatSystemLines(inner);
    return `\\begin{cases}${lines.join(" \\\\ ")}\\end{cases}`;
  });

  // 2. Xử lý macro ngoặc vuông hệ tuyển \hoac{...}
  m = replaceBalancedMacro(m, "hoac", (inner) => {
    const lines = formatSystemLines(inner);
    return `\\left[\\begin{array}{l}${lines.join(" \\\\ ")}\\end{array}\\right.`;
  });

  // 3. Chuẩn hóa vector macro
  m = m.replace(/\\underrightarrow\{([^}]+)\}/g, "\\overrightarrow{$1}");
  m = m.replace(/\\vect\{([^}]+)\}/g, "\\overrightarrow{$1}");
  m = m.replace(/\\vec\{([^}]+)\}/g, "\\overrightarrow{$1}");
  m = m.replace(/\\vec\s+([a-zA-Z0-9])/g, "\\overrightarrow{$1}");
  m = m.replace(/\\vv\{([^}]+)\}/g, "\\overrightarrow{$1}");

  // 4. Chuẩn hóa ký hiệu góc và cung
  m = m.replace(/\\wideparen\{([^}]+)\}/g, "\\overset{\\frown}{$1}");
  m = m.replace(/\\arc\{([^}]+)\}/g, "\\overset{\\frown}{$1}");
  m = m.replace(/\\dang\b/g, "\\angle");

  // 5. Chuẩn hóa các ký hiệu mũi tên thường gặp trong bảng biến thiên
  m = m.replace(/\\nearrow/g, "\\nearrow");
  m = m.replace(/\\searrow/g, "\\searrow");
  m = m.replace(/\\uparrow/g, "\\uparrow");
  m = m.replace(/\\downarrow/g, "\\downarrow");

  // 6. Dọn dẹp các dấu xuống dòng kép thừa trước các môi trường đóng
  m = m.replace(/\\\\\s*\\end\{array\}/g, "\\end{array}");
  m = m.replace(/\\\\\s*\\end\{matrix\}/g, "\\end{matrix}");
  m = m.replace(/\\\\\s*\\end\{pmatrix\}/g, "\\end{pmatrix}");
  m = m.replace(/\\\\\s*\\end\{bmatrix\}/g, "\\end{bmatrix}");
  m = m.replace(/\\\\\s*\\end\{aligned\}/g, "\\end{aligned}");
  m = m.replace(/\\\\\s*\\end\{cases\}/g, "\\end{cases}");

  // 7. Tự động kiểm tra và cân bằng \left và \right để tránh lỗi KaTeX parse error unclosed delimiter
  const leftMatches = m.match(/\\left(?:[\[\{\(\|\.]|\\\{)/g);
  const rightMatches = m.match(/\\right(?:[\]\}\)\|\.]|\\\})/g);
  const leftCount = leftMatches ? leftMatches.length : 0;
  const rightCount = rightMatches ? rightMatches.length : 0;
  if (leftCount > rightCount) {
    m += "\\right.".repeat(leftCount - rightCount);
  }

  return m;
}

/**
 * Component render nội dung chứa công thức Toán học LaTeX, Bảng biểu (Tabular, tkz-tab, Bảng xét dấu/biến thiên/thống kê),
 * TikZ Vector Graphics và các macro chuyên sâu trong SGK GDPT 2018.
 * Tích hợp cấu hình toàn cục các gói TikZ (pgfplots, tkz-euclide, 3d, perspective, angles, calc...)
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
    // 2. TRÍCH XUẤT HÌNH VẼ TIKZ (\begin{tikzpicture} ... \end{tikzpicture}) & XÓA PREAMBLE
    // =========================================================================
    const detectedLibs: string[] = [];
    text = text.replace(/\\usetikzlibrary\{([^}]+)\}/gi, (_, libs) => {
      libs.split(",").forEach((l: string) => detectedLibs.push(l.trim()));
      return "";
    });
    text = text.replace(/\\usepgfplotslibrary\{([^}]+)\}/gi, (_, libs) => {
      libs.split(",").forEach((l: string) => detectedLibs.push(l.trim()));
      return "";
    });
    text = text.replace(/\\usepackage(?:\s*\[[^\]]*\])?\{([^}]+)\}/gi, "");
    text = text.replace(/\\pgfplotsset\{[\s\S]*?\}/gi, "");
    text = text.replace(/\\tikzset\{[\s\S]*?\}/gi, "");
    text = text.replace(/\\tikzstyle\{[\s\S]*?\}/gi, "");
    text = text.replace(/\\shorthandoff\{[^}]+\}/gi, "");
    text = text.replace(/\\shorthandon\{[^}]+\}/gi, "");
    text = text.replace(/\\documentclass(?:\s*\[[^\]]*\])?\{[^}]+\}/gi, "");
    text = text.replace(/\\geometry\{[^}]+\}/gi, "");
    text = text.replace(/\\pagestyle\{[^}]+\}/gi, "");
    text = text.replace(/\\thispagestyle\{[^}]+\}/gi, "");
    text = text.replace(/\\begin\{document\}|\\end\{document\}/gi, "");

    // Thu thập các macro định nghĩa ngoài như \newcommand, \def, \pgfmathsetmacro (ví dụ \trucLG, \pointLG)
    const { cleaned: cleanedTextAfterMacros, macros: detectedMacros } = extractLatexMacros(text);
    text = cleanedTextAfterMacros;
    const macroHeader = detectedMacros.join("\n");

    // Hợp nhất toàn bộ gói thư viện TikZ/pgfplots/tkz-euclide/3d vào danh mục nạp
    const allGlobalPackages = Array.from(
      new Set([
        ...DEFAULT_TIKZ_PACKAGES,
        ...STANDARD_TIKZ_3D_LIBRARIES,
        "tkz-euclide",
        "pgfplots",
        "3d",
        "perspective",
        "tikz-3dplot",
        "calc",
        "angles",
        "quotes",
        "arrows.meta",
        "patterns",
        "positioning",
        "shapes.geometric",
        "plotmarks",
        ...detectedLibs,
      ])
    );

    text = text.replace(
      /\\begin\{center\}\s*(\\begin\{tikzpicture\*?\}[\s\S]*?\\end\{tikzpicture\*?\})\s*\\end\{center\}/gi,
      (_, tikz) => {
        const idx = tikzList.length;
        const codeWithMacros = macroHeader ? `${macroHeader}\n${tikz}` : tikz;
        const preprocessed = preprocessTikzCode(codeWithMacros, { extraLibraries: allGlobalPackages });
        const svg = renderTikzWithPackages(preprocessed, allGlobalPackages);
        tikzList.push(svg);
        return `%%%TIKZ_PLACEHOLDER_${idx}%%%`;
      }
    );

    text = text.replace(/\\begin\{tikzpicture\*?\}[\s\S]*?\\end\{tikzpicture\*?\}/gi, (tikz) => {
      const idx = tikzList.length;
      const codeWithMacros = macroHeader ? `${macroHeader}\n${tikz}` : tikz;
      const preprocessed = preprocessTikzCode(codeWithMacros, { extraLibraries: allGlobalPackages });
      const svg = renderTikzWithPackages(preprocessed, allGlobalPackages);
      tikzList.push(svg);
      return `%%%TIKZ_PLACEHOLDER_${idx}%%%`;
    });

    // Hàm tiện ích render KaTeX an toàn có fallback
    const renderKatexBlock = (rawMath: string, isDisplay: boolean, originalMatch: string): string => {
      const cleaned = cleanMath(rawMath);
      let rendered = "";
      try {
        rendered = katex.renderToString(cleaned, {
          displayMode: isDisplay,
          throwOnError: false,
          strict: false,
          macros: KATEX_GLOBAL_MACROS,
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
            macros: KATEX_GLOBAL_MACROS,
          });
        } catch {
          rendered = `<span class="text-rose-500 font-mono text-xs">${originalMatch}</span>`;
        }
      }
      return rendered;
    };

    // =========================================================================
    // 3. TRÍCH XUẤT VÀ RENDER CÁC KHỐI TOÁN ĐÃ CÓ DELIMITERS ($$, \[, \(, $)
    // =========================================================================
    // Regex chuẩn xác bắt: $$...$$, \[...\], \(...\), và $...$ (hỗ trợ xuống dòng trong hệ phương trình)
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\$)(?:[^\$\n]|(?<!\n)\n(?!\s*\n))+?\$)/g;

    text = text.replace(mathRegex, (match) => {
      let isDisplay = false;
      let rawMath = "";

      if (match.startsWith("$$") && match.endsWith("$$")) {
        isDisplay = true;
        rawMath = match.slice(2, -2);
      } else if (match.startsWith("\\[") && match.endsWith("\\]")) {
        isDisplay = true;
        rawMath = match.slice(2, -2);
      } else if (match.startsWith("\\(") && match.endsWith("\\)")) {
        isDisplay = false;
        rawMath = match.slice(2, -2);
      } else if (match.startsWith("$") && match.endsWith("$")) {
        // Công thức inline trong cặp dấu $...$ giữ displayMode = false để văn bản và dấu câu (như ?, ., :) không bị rớt dòng
        isDisplay = false;
        rawMath = match.slice(1, -1);
      } else {
        return match;
      }

      const rendered = renderKatexBlock(rawMath, isDisplay, match);
      const idx = mathList.length;
      mathList.push(rendered);
      return `%%%MATH_PLACEHOLDER_${idx}%%%`;
    });

    // =========================================================================
    // 4. XỬ LÝ CÁC MÔI TRƯỜNG TOÁN ĐỘC LẬP CÒN LẠI (Chưa có dấu $ bao quanh)
    // =========================================================================
    // 4.1. \begin{array}, \begin{cases}, \begin{aligned}, \begin{matrix}
    text = text.replace(
      /\\begin\{(array|cases|aligned|matrix|pmatrix|bmatrix)\}([\s\S]*?)\\end\{\1\}/g,
      (match) => {
        const rendered = renderKatexBlock(match, true, match);
        const idx = mathList.length;
        mathList.push(rendered);
        return `%%%MATH_PLACEHOLDER_${idx}%%%`;
      }
    );

    // 4.2. \heva{...}, \hoac{...}, \system{...}
    text = text.replace(
      /\\(?:heva|hoac|system)\s*\{([\s\S]*?)\}/g,
      (match) => {
        const rendered = renderKatexBlock(match, true, match);
        const idx = mathList.length;
        mathList.push(rendered);
        return `%%%MATH_PLACEHOLDER_${idx}%%%`;
      }
    );

    // 4.3. \left\{ ... \right. hoặc \left[ ... \right.
    text = text.replace(
      /\\left[\{\[]([\s\S]*?)\\right\./g,
      (match) => {
        const rendered = renderKatexBlock(match, true, match);
        const idx = mathList.length;
        mathList.push(rendered);
        return `%%%MATH_PLACEHOLDER_${idx}%%%`;
      }
    );

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
    text = text.replace(/\\\n/g, "&nbsp;<br/>");
    text = text.replace(/(?<!\\)\\(?:\s*)$/, ""); // Xóa dấu \ trơ trọi còn sót lại ở cuối chuỗi văn bản (do \ bị trim mất khoảng trắng)
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


