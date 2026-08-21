import katex from "katex";

/**
 * Interface biểu diễn cấu trúc của một bảng LaTeX Tabular được phân tích
 */
export interface ParsedLatexTable {
  alignments: Array<"left" | "center" | "right">;
  verticalBorders: boolean[]; // border bên trái mỗi cột + border ngoài cùng bên phải
  rows: ParsedTableRow[];
}

export interface ParsedTableRow {
  cells: ParsedTableCell[];
  isHeader?: boolean;
  hasTopBorder?: boolean;
  hasBottomBorder?: boolean;
}

export interface ParsedTableCell {
  content: string;
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
  isDoubleLine?: boolean; // Cho vạch kép || (không xác định)
  isArrowUp?: boolean;    // Mũi tên biến thiên đi lên
  isArrowDown?: boolean;  // Mũi tên biến thiên đi xuống
}

/**
 * Hàm helper chuẩn hóa và render một đoạn toán nhỏ bên trong cell
 */
export function renderCellMath(raw: string): string {
  if (!raw || !raw.trim()) return "";
  let text = raw.trim();

  // Xử lý các ký hiệu đặc biệt thường gặp trong bảng xét dấu / bảng biến thiên
  if (
    text === "||" ||
    text === "\\parallel" ||
    text === "|||" ||
    text === "| |" ||
    text === "$||$" ||
    text === "$\\parallel$"
  ) {
    return `<span class="inline-block px-1 font-black text-slate-700 dark:text-slate-200 tracking-tighter select-none font-mono text-sm">||</span>`;
  }
  if (
    text === "+" ||
    text === "$+$" ||
    text === "\\text{+}" ||
    text === "\\text{\\textbf{+}}"
  ) {
    return `<span class="inline-flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-sm select-none font-mono">+</span>`;
  }
  if (
    text === "-" ||
    text === "$-$" ||
    text === "\\text{-}" ||
    text === "–" ||
    text === "\\text{\\textbf{-}}"
  ) {
    return `<span class="inline-flex items-center justify-center font-black text-rose-600 dark:text-rose-400 text-sm select-none font-mono">−</span>`;
  }
  if (text === "0" || text === "$0$") {
    return `<span class="inline-flex items-center justify-center font-bold text-slate-800 dark:text-slate-100 text-sm select-none font-mono">0</span>`;
  }
  if (
    text === "\\nearrow" ||
    text === "$\\nearrow$" ||
    text === "↗" ||
    text === "->" ||
    text === "\\to"
  ) {
    return `<span class="inline-flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-base font-black select-none transform hover:scale-125 transition">↗</span>`;
  }
  if (
    text === "\\searrow" ||
    text === "$\\searrow$" ||
    text === "↘" ||
    text === "<-"
  ) {
    return `<span class="inline-flex items-center justify-center text-rose-500 dark:text-rose-400 text-base font-black select-none transform hover:scale-125 transition">↘</span>`;
  }
  if (text === "\\uparrow" || text === "$\\uparrow$" || text === "↑") {
    return `<span class="inline-flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-base font-bold select-none">↑</span>`;
  }
  if (text === "\\downarrow" || text === "$\\downarrow$" || text === "↓") {
    return `<span class="inline-flex items-center justify-center text-rose-500 dark:text-rose-400 text-base font-bold select-none">↓</span>`;
  }

  // Nếu đã chứa thẻ HTML
  if (text.startsWith("<") && text.endsWith(">")) {
    return text;
  }

  // Chuẩn hóa $-\infty$ hoặc $-\infty$ khi thiếu dấu $
  if (text === "-\\infty" || text === "+\\infty" || text === "\\infty") {
    try {
      return katex.renderToString(text, { displayMode: false, throwOnError: false, strict: false });
    } catch {
      return text;
    }
  }

  // Tách và render công thức Toán học $...$ hoặc render toàn bộ qua KaTeX nếu có ký hiệu toán
  const hasMathDelim =
    /\$|\\\(|\\\[|\\frac|\\sqrt|\\infty|\\alpha|\\beta|\\pi|\\lim|_|\^|\\mathbf|\\mathrm/i.test(
      text
    );

  if (hasMathDelim) {
    // Nếu cả cell được bọc bởi $...$
    if (text.startsWith("$") && text.endsWith("$") && text.length >= 2) {
      const mathOnly = text.slice(1, -1).trim();
      try {
        return katex.renderToString(mathOnly, {
          displayMode: false,
          throwOnError: false,
          strict: false,
        });
      } catch {
        return `<span class="font-mono text-xs">${text}</span>`;
      }
    }

    // Nếu có chứa $...$ ở giữa
    if (text.includes("$")) {
      const parts = text.split(/(\$[^\$]+\$)/g);
      return parts
        .map((p) => {
          if (p.startsWith("$") && p.endsWith("$")) {
            const math = p.slice(1, -1).trim();
            try {
              return katex.renderToString(math, {
                displayMode: false,
                throwOnError: false,
                strict: false,
              });
            } catch {
              return p;
            }
          }
          return p;
        })
        .join("");
    }

    // Thử render trực tiếp như math nếu chứa các ký tự toán như \infty, -\infty, +
    if (
      /^[a-zA-Z0-9+\-*\/_^\\]+$/.test(text) ||
      text.includes("\\infty") ||
      text.includes("f'(") ||
      text.includes("y'")
    ) {
      try {
        return katex.renderToString(text, {
          displayMode: false,
          throwOnError: false,
          strict: false,
        });
      } catch {
        return text;
      }
    }
  }

  // Kiểm tra nếu là biểu thức toán ngắn không có $ (ví dụ: x, y, -1, 2, f'(x), y', [0; 2), 5, 12...)
  if (
    /^(?:-?\d+(?:\.\d+)?|[a-zA-Z]|f'\([a-zA-Z]\)|y'|\[[\d\s;,]+\]|\([\d\s;,]+\)|\[[\d\s;,]+\)|\([\d\s;,]+\])$/.test(
      text
    )
  ) {
    try {
      return katex.renderToString(text, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return text;
    }
  }

  return text;
}

/**
 * Phân tích chuỗi định nghĩa cột của tabular: ví dụ "|c|cccccc|", "|l|c|r|", "ccc", "|p{3cm}|c|"
 */
export function parseColumnSpec(specStr: string): {
  alignments: Array<"left" | "center" | "right">;
  verticalBorders: boolean[];
} {
  const clean = (specStr || "").trim();
  const alignments: Array<"left" | "center" | "right"> = [];
  const verticalBorders: boolean[] = [];

  let currentBorder = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "|") {
      currentBorder = true;
    } else if (char === "c" || char === "l" || char === "r") {
      verticalBorders.push(currentBorder);
      currentBorder = false;
      alignments.push(char === "l" ? "left" : char === "r" ? "right" : "center");
    } else if (char === "p" || char === "m" || char === "b") {
      // Cột cố định độ rộng p{...}
      verticalBorders.push(currentBorder);
      currentBorder = false;
      alignments.push("left");
      const closeBrace = clean.indexOf("}", i);
      if (closeBrace !== -1) {
        i = closeBrace;
      }
    }
  }
  // Border bên phải ngoài cùng
  verticalBorders.push(currentBorder);

  // Fallback nếu không parse được
  if (alignments.length === 0) {
    return {
      alignments: ["center", "center", "center", "center", "center", "center", "center", "center"],
      verticalBorders: [true, true, true, true, true, true, true, true, true],
    };
  }

  return { alignments, verticalBorders };
}

/**
 * Phân tích nội dung bên trong môi trường \begin{tabular} ... \end{tabular}
 */
export function parseLatexTabular(tabularCode: string): string {
  const match = tabularCode.match(
    /\\begin\{tabular\}(?:\[[^\]]*\])?\{([^}]+)\}([\s\S]*?)\\end\{tabular\}/
  );
  if (!match) return tabularCode;

  const specStr = match[1];
  let body = match[2];

  const { alignments, verticalBorders } = parseColumnSpec(specStr);

  // Tiền xử lý thông minh để chuẩn hóa các dòng:
  // 1. Nếu \hline xuất hiện sau nội dung dòng mà thiếu \\ thì chèn \\ trước \hline
  body = body.replace(/([^\\])\s*\\hline/g, "$1 \\\\ \\hline");

  // 2. Tách các hàng theo \\, \tabularnewline, hoặc \cr
  let rawRows = body.split(/\\\\|\\tabularnewline|\\cr/);

  // Nếu vẫn chỉ có 1 hàng mà có nhiều dòng chứa dấu &, tách theo \n
  if (rawRows.length <= 1) {
    rawRows = body.split("\n").filter((l) => l.includes("&") || l.includes("\\hline"));
  }

  const parsedRows: ParsedTableRow[] = [];

  for (let r = 0; r < rawRows.length; r++) {
    const rawRow = rawRows[r].trim();
    if (!rawRow) continue;

    const hasTopHline = rawRow.startsWith("\\hline");
    const cleanRow = rawRow
      .replace(/\\hline/g, "")
      .replace(/\\cline\{[^}]+\}/g, "")
      .trim();

    if (!cleanRow && hasTopHline) {
      if (parsedRows.length > 0) {
        parsedRows[parsedRows.length - 1].hasBottomBorder = true;
      }
      continue;
    }

    if (!cleanRow) continue;

    // Tách các ô trong hàng bằng dấu &
    const cellStrings = splitRowCells(cleanRow);
    const cells: ParsedTableCell[] = [];

    for (let c = 0; c < cellStrings.length; c++) {
      let cellRaw = cellStrings[c].trim();
      let colSpan = 1;
      let align = alignments[c] || "center";

      // Kiểm tra \multicolumn{n}{align}{content}
      const mcMatch = cellRaw.match(/\\multicolumn\{(\d+)\}\{([^}]+)\}\{([\s\S]*)\}/);
      if (mcMatch) {
        colSpan = parseInt(mcMatch[1], 10) || 1;
        const mcAlign = mcMatch[2];
        align = mcAlign.includes("l") ? "left" : mcAlign.includes("r") ? "right" : "center";
        cellRaw = mcMatch[3].trim();
      }

      cells.push({
        content: cellRaw,
        colSpan,
        align,
      });
    }

    parsedRows.push({
      cells,
      hasTopBorder: hasTopHline,
      hasBottomBorder: true,
    });
  }

  if (parsedRows.length === 0) return tabularCode;

  // Render ra bảng HTML
  return renderParsedTableToHtml(parsedRows, alignments, verticalBorders);
}

/**
 * Tách các cell trong một dòng bằng dấu & mà không bị ảnh hưởng bởi \&
 */
function splitRowCells(rowStr: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inMath = false;
  let braceDepth = 0;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];

    if (char === "\\") {
      current += char;
      if (i + 1 < rowStr.length) {
        current += rowStr[i + 1];
        i++;
      }
      continue;
    }

    if (char === "$") {
      inMath = !inMath;
      current += char;
      continue;
    }

    if (char === "{") {
      braceDepth++;
      current += char;
      continue;
    }

    if (char === "}") {
      if (braceDepth > 0) braceDepth--;
      current += char;
      continue;
    }

    if (char === "&" && !inMath && braceDepth === 0) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

/**
 * Render bảng từ dữ liệu đã parse sang cấu trúc HTML chuẩn mực
 */
function renderParsedTableToHtml(
  rows: ParsedTableRow[],
  colAlignments: Array<"left" | "center" | "right">,
  verticalBorders: boolean[]
): string {
  const maxCells = Math.max(...rows.map((r) => r.cells.length));

  const tableRowsHtml = rows
    .map((row, rIdx) => {
      const cellsHtml = row.cells
        .map((cell, cIdx) => {
          const renderedContent = renderCellMath(cell.content);
          const alignClass =
            cell.align === "left"
              ? "text-left"
              : cell.align === "right"
              ? "text-right"
              : "text-center";

          const hasRightBorder = verticalBorders[cIdx + 1] ?? true;
          const borderRightClass = hasRightBorder
            ? "border-r border-slate-300 dark:border-slate-600"
            : "";
          const borderLeftClass =
            cIdx === 0 && (verticalBorders[0] ?? true)
              ? "border-l border-slate-300 dark:border-slate-600"
              : "";

          const isHeaderCol = cIdx === 0;
          const isFirstRow = rIdx === 0;

          const bgClass = isHeaderCol
            ? "bg-indigo-50/70 dark:bg-slate-800/90 font-bold text-indigo-950 dark:text-indigo-200"
            : isFirstRow
            ? "bg-slate-50/50 dark:bg-slate-800/50 font-semibold text-slate-900 dark:text-slate-100"
            : "bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 font-medium";

          const colSpanAttr =
            cell.colSpan && cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : "";
          const rowSpanAttr =
            cell.rowSpan && cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : "";

          return `<td${colSpanAttr}${rowSpanAttr} class="py-2 px-3 border-b border-slate-300 dark:border-slate-600 ${borderRightClass} ${borderLeftClass} ${alignClass} ${bgClass} transition-colors whitespace-nowrap min-w-[38px] text-xs sm:text-sm select-text">${
            renderedContent || "&nbsp;"
          }</td>`;
        })
        .join("");

      return `<tr class="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition">${cellsHtml}</tr>`;
    })
    .join("");

  return `
<div class="my-3.5 w-full flex flex-col items-center justify-center overflow-x-auto select-text scrollbar-thin scrollbar-thumb-slate-300">
  <div class="inline-block max-w-full rounded-xl shadow-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden">
    <table class="border-collapse text-xs sm:text-sm text-slate-800 dark:text-slate-200 table-auto m-0">
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  </div>
</div>
  `.trim();
}

/**
 * Xử lý môi trường tkz-tab (bảng biến thiên / bảng xét dấu tạo bởi gói tkz-tab)
 */
export function parseTkzTab(tkzCode: string): string | null {
  if (!tkzCode.includes("\\tkzTabInit")) return null;

  try {
    const initMatch = tkzCode.match(/\\tkzTabInit(?:\[[^\]]*\])?\{([^}]+)\}\{([^}]+)\}/);
    if (!initMatch) return null;

    const rowDefs = initMatch[1].split(",").map((s) => {
      const parts = s.trim().split("/");
      return {
        label: parts[0]?.trim() || "",
        height: parts[1] ? parseFloat(parts[1]) : 1,
      };
    });

    const colHeaders = initMatch[2].split(",").map((s) => s.trim());
    const lineMatches = Array.from(tkzCode.matchAll(/\\tkzTabLine\{([^}]+)\}/g));
    const varMatches = Array.from(tkzCode.matchAll(/\\tkzTabVar\{([^}]+)\}/g));

    const rows: ParsedTableRow[] = [];

    // Hàng 1: Hàng $x$
    const xCells: ParsedTableCell[] = [
      { content: rowDefs[0]?.label || "$x$", align: "center" },
    ];
    colHeaders.forEach((h) => {
      xCells.push({ content: h, align: "center" });
    });
    rows.push({ cells: xCells, hasBottomBorder: true });

    let lineIdx = 0;
    let varIdx = 0;

    for (let r = 1; r < rowDefs.length; r++) {
      const rowDef = rowDefs[r];
      const rowLabel = rowDef.label;

      if (
        lineIdx < lineMatches.length &&
        (rowLabel.includes("'") || rowLabel.includes("f'") || rowLabel.includes("y'"))
      ) {
        const lineContent = lineMatches[lineIdx][1];
        lineIdx++;

        const tokens = lineContent.split(",").map((t) => t.trim());
        const cells: ParsedTableCell[] = [{ content: rowLabel, align: "center" }];

        tokens.forEach((tok) => {
          if (tok === "d" || tok === "||" || tok === "| |") {
            cells.push({ content: "||", align: "center" });
          } else if (tok === "z" || tok === "0") {
            cells.push({ content: "0", align: "center" });
          } else if (tok === "+" || tok === "-") {
            cells.push({ content: tok, align: "center" });
          } else if (tok === "") {
            cells.push({ content: "", align: "center" });
          } else {
            cells.push({ content: tok, align: "center" });
          }
        });

        rows.push({ cells, hasBottomBorder: true });
      } else if (varIdx < varMatches.length) {
        const varContent = varMatches[varIdx][1];
        varIdx++;

        const varTokens = varContent.split(",").map((t) => t.trim());
        const cells: ParsedTableCell[] = [{ content: rowLabel, align: "center" }];

        varTokens.forEach((vt) => {
          if (vt.startsWith("+/")) {
            const val = vt.substring(2).trim();
            cells.push({
              content: `<div class="text-center"><span class="text-xs text-indigo-600 block">▲</span>${renderCellMath(
                val
              )}</div>`,
              align: "center",
            });
          } else if (vt.startsWith("-/")) {
            const val = vt.substring(2).trim();
            cells.push({
              content: `<div class="text-center">${renderCellMath(
                val
              )}<span class="text-xs text-rose-500 block">▼</span></div>`,
              align: "center",
            });
          } else if (vt.startsWith("R/")) {
            cells.push({ content: "→", align: "center" });
          } else {
            cells.push({ content: renderCellMath(vt), align: "center" });
          }
        });

        rows.push({ cells, hasBottomBorder: true });
      }
    }

    const colCount = Math.max(...rows.map((r) => r.cells.length), colHeaders.length + 1);
    const aligns: Array<"left" | "center" | "right"> = Array(colCount).fill("center");
    const borders: boolean[] = Array(colCount + 1).fill(true);

    return renderParsedTableToHtml(rows, aligns, borders);
  } catch {
    return null;
  }
}

/**
 * Hàm tổng xử lý toàn bộ các khối bảng LaTeX trong một đoạn văn bản
 */
export function processAllLatexTables(text: string): string {
  if (!text) return "";
  let result = text;

  // 1. Xử lý tkz-tab trước
  result = result.replace(
    /\\begin\{tikzpicture\}[\s\S]*?\\tkzTabInit[\s\S]*?\\end\{tikzpicture\}/g,
    (match) => {
      const parsed = parseTkzTab(match);
      return parsed || match;
    }
  );

  // 2. Xử lý \begin{center}\begin{tabular}...\end{tabular}\end{center}
  result = result.replace(
    /\\begin\{center\}\s*(\\begin\{tabular\}[\s\S]*?\\end\{tabular\})\s*\\end\{center\}/g,
    (_, tabularCode) => {
      return parseLatexTabular(tabularCode);
    }
  );

  // 3. Xử lý \begin{table}...\begin{tabular}...\end{tabular}...\end{table}
  result = result.replace(
    /\\begin\{table\}(?:\[[^\]]*\])?[\s\S]*?(\\begin\{tabular\}[\s\S]*?\\end\{tabular\})[\s\S]*?\\end\{table\}/g,
    (_, tabularCode) => {
      return parseLatexTabular(tabularCode);
    }
  );

  // 4. Xử lý độc lập \begin{tabular}...\end{tabular}
  result = result.replace(
    /\\begin\{tabular\}(?:\[[^\]]*\])?\{[^}]+\}[\s\S]*?\\end\{tabular\}/g,
    (tabularCode) => {
      return parseLatexTabular(tabularCode);
    }
  );

  // 5. Chuẩn hóa các thẻ \begin{center} ... \end{center} còn lại (nếu chứa nội dung khác)
  result = result.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    `<div class="flex flex-col items-center justify-center my-3 text-center w-full">$1</div>`
  );

  return result;
}
