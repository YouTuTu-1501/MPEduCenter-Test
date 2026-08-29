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

  // Thử render trực tiếp qua KaTeX nếu có ký hiệu toán học
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

    // Render trực tiếp qua KaTeX
    try {
      return katex.renderToString(text, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return `<span class="font-mono text-xs">${text}</span>`;
    }
  }

  // Thử render số hoặc biểu thức ngắn qua KaTeX
  if (
    /^(?:-?\d+(?:\.\d+)?|[a-zA-Z]|f'\([a-zA-Z]\)|y'|\[[\d\s;,]+\]|\([\d\s;,]+\)|\[[\d\s;,]+\)|\([\d\s;,]+\])$/.test(
      text
    ) ||
    /^[a-zA-Z0-9+\-*\/_^\\]+$/.test(text)
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
 * Trích xuất nội dung của một cặp ngoặc nhọn { ... } có cân bằng (hỗ trợ ngoặc nhọn lồng nhau như \frac{a}{b})
 */
export function extractBalancedBraces(
  str: string,
  searchStart: number = 0
): { content: string; startIndex: number; endIndex: number } | null {
  const openIndex = str.indexOf("{", searchStart);
  if (openIndex === -1) return null;

  let depth = 0;
  let inMath = false;

  for (let i = openIndex; i < str.length; i++) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : "";

    // Bỏ qua ký tự escaped: \{ hoặc \}
    if (prev === "\\") continue;

    if (ch === "$" && prev !== "\\") {
      inMath = !inMath;
    }

    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return {
          content: str.substring(openIndex + 1, i),
          startIndex: openIndex,
          endIndex: i,
        };
      }
    }
  }

  return null;
}

/**
 * Tách một chuỗi theo ký tự phân cách (delimiter) nhưng bỏ qua các dấu phân cách nằm trong { ... } hoặc $ ... $
 */
export function splitTopLevel(str: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let braceDepth = 0;
  let inDollar = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : "";

    if (ch === "$" && prev !== "\\") {
      inDollar = !inDollar;
      current += ch;
      continue;
    }

    if (ch === "{" && prev !== "\\") {
      braceDepth++;
      current += ch;
      continue;
    }

    if (ch === "}" && prev !== "\\") {
      if (braceDepth > 0) braceDepth--;
      current += ch;
      continue;
    }

    if (ch === delimiter && braceDepth === 0 && !inDollar) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim().length > 0 || str.endsWith(delimiter)) {
    result.push(current.trim());
  }

  return result;
}

/**
 * Render mũi tên biến thiên dạng vector SVG chuẩn xác nối từ mức độ cao nguồn sang mức độ cao đích
 */
function renderSvgVariationArrow(
  fromHeight: "high" | "low" | "mid",
  toHeight: "high" | "low" | "mid",
  arrowId: string
): string {
  const yMap = {
    high: 13,
    mid: 30,
    low: 47,
  };
  const y1 = yMap[fromHeight] ?? 30;
  const y2 = yMap[toHeight] ?? 30;

  // Xác định xu hướng: tăng (đồng biến), giảm (nghịch biến), ngang
  let strokeClass = "text-indigo-600 dark:text-indigo-400";
  let strokeColor = "#4f46e5";
  if (y1 < y2) {
    // Từ trên xuống dưới -> nghịch biến (giảm)
    strokeClass = "text-rose-600 dark:text-rose-400";
    strokeColor = "#e11d48";
  } else if (y1 === y2) {
    // Ngang
    strokeClass = "text-slate-400 dark:text-slate-500";
    strokeColor = "#94a3b8";
  }

  const markerId = `bbt-arr-${arrowId}`;

  return `
    <div class="w-full min-w-[56px] sm:min-w-[72px] h-14 sm:h-16 flex items-center justify-center px-1">
      <svg class="w-full h-full overflow-visible ${strokeClass}" viewBox="0 0 100 60" preserveAspectRatio="none">
        <defs>
          <marker
            id="${markerId}"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" />
          </marker>
        </defs>
        <line
          x1="6"
          y1="${y1}"
          x2="90"
          y2="${y2}"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          marker-end="url(#${markerId})"
        />
      </svg>
    </div>
  `;
}

/**
 * Xử lý môi trường tkz-tab (bảng biến thiên / bảng xét dấu tạo bởi gói tkz-tab)
 */
export function parseTkzTab(tkzCode: string): string | null {
  if (!tkzCode.includes("\\tkzTabInit")) return null;

  try {
    // 1. Phân tích \tkzTabInit[options]{row_defs}{x_defs} sử dụng balanced brace extraction
    const initIdx = tkzCode.indexOf("\\tkzTabInit");
    if (initIdx === -1) return null;

    // Tìm cặp ngoặc nhọn thứ nhất: rowDefs
    const rowDefsArg = extractBalancedBraces(tkzCode, initIdx);
    if (!rowDefsArg) return null;

    // Tìm cặp ngoặc nhọn thứ hai: colHeaders
    const colHeadersArg = extractBalancedBraces(tkzCode, rowDefsArg.endIndex + 1);
    if (!colHeadersArg) return null;

    // Phân tích các hàng định nghĩa: ví dụ {$x$ /0.7, $y'$ /0.7} hoặc {$x$/1, $f'(x)$/1, $y$/2}
    const rawRowDefs = splitTopLevel(rowDefsArg.content, ",").filter((s) => s.length > 0);

    const rowDefs = rawRowDefs.map((s) => {
      const parts = splitTopLevel(s, "/");
      return {
        label: parts[0] || "",
        height: parts[1] ? parseFloat(parts[1]) : 1,
      };
    });

    // Phân tích các mốc $x$: ví dụ {$-\infty$, $-2$, $+\infty$}
    const colHeaders = splitTopLevel(colHeadersArg.content, ",").filter((s) => s.length > 0);

    if (colHeaders.length === 0) return null;

    const numPoints = colHeaders.length;
    const numCols = 2 * numPoints - 1; // Số cột dữ liệu: xen kẽ Điểm và Khoảng

    // Trích xuất toàn bộ các khối \tkzTabLine và \tkzTabVar bằng balanced brace
    const lineContents: string[] = [];
    let searchPos = 0;
    while (true) {
      const linePos = tkzCode.indexOf("\\tkzTabLine", searchPos);
      if (linePos === -1) break;
      const arg = extractBalancedBraces(tkzCode, linePos);
      if (!arg) break;
      lineContents.push(arg.content);
      searchPos = arg.endIndex + 1;
    }

    const varContents: string[] = [];
    searchPos = 0;
    while (true) {
      const varPos = tkzCode.indexOf("\\tkzTabVar", searchPos);
      if (varPos === -1) break;
      const arg = extractBalancedBraces(tkzCode, varPos);
      if (!arg) break;
      varContents.push(arg.content);
      searchPos = arg.endIndex + 1;
    }

    let lineIdx = 0;
    let varIdx = 0;
    const tableUid = Math.random().toString(36).substring(2, 7);

    const renderedRowsHtml: string[] = [];

    // =========================================================================
    // HÀNG 1: Hàng biến số x
    // =========================================================================
    const xCells: string[] = [];
    for (let i = 0; i < numPoints; i++) {
      // Cột mốc điểm x_i
      const valHtml = renderCellMath(colHeaders[i]);
      xCells.push(
        `<td class="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap min-w-[36px]">${valHtml}</td>`
      );
      // Cột khoảng giữa x_i và x_{i+1}
      if (i < numPoints - 1) {
        xCells.push(
          `<td class="py-2.5 px-4 text-center text-slate-400 text-xs sm:text-sm min-w-[56px] sm:min-w-[72px]">&nbsp;</td>`
        );
      }
    }

    const xLabel = renderCellMath(rowDefs[0]?.label || "$x$");
    renderedRowsHtml.push(`
      <tr class="border-b border-slate-300 dark:border-slate-600">
        <th class="py-2.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-r-2 border-slate-300 dark:border-slate-600 whitespace-nowrap text-xs sm:text-sm w-20 min-w-[70px]">
          ${xLabel}
        </th>
        ${xCells.join("")}
      </tr>
    `);

    // =========================================================================
    // CÁC HÀNG TIẾP THEO (y', f'(x), y, f(x)...)
    // =========================================================================
    for (let r = 1; r < rowDefs.length; r++) {
      const rowDef = rowDefs[r];
      const rowLabel = rowDef.label;
      const labelHtml = renderCellMath(rowLabel);

      // Kiểm tra xem hàng này là bảng xét dấu (\tkzTabLine) hay bảng biến thiên (\tkzTabVar)
      const isSignLine =
        rowLabel.includes("'") ||
        rowLabel.toLowerCase().includes("f'") ||
        rowLabel.toLowerCase().includes("y'") ||
        (lineIdx < lineContents.length && varIdx >= varContents.length);

      if (isSignLine && lineIdx < lineContents.length) {
        // Xử lý \tkzTabLine{,+,0,-,0,+,}
        const lineContent = lineContents[lineIdx];
        lineIdx++;

        const rawTokens = splitTopLevel(lineContent, ",").map((t) => t.trim());

        // Chuẩn hóa token cho đủ numCols (2N - 1)
        const tokens: string[] = [];
        if (rawTokens.length === numCols) {
          tokens.push(...rawTokens);
        } else if (rawTokens.length === numPoints - 1) {
          // Chỉ có các dấu khoảng (+, -, +)
          for (let i = 0; i < numPoints; i++) {
            tokens.push(""); // điểm
            if (i < numPoints - 1) {
              tokens.push(rawTokens[i] || ""); // khoảng
            }
          }
        } else {
          // Bổ sung hoặc cắt bớt cho vừa vặn
          for (let c = 0; c < numCols; c++) {
            tokens.push(rawTokens[c] ?? "");
          }
        }

        const cellsHtml: string[] = tokens.map((tok, cIdx) => {
          const isPointCol = cIdx % 2 === 0;
          let content = "";
          let extraClass = "";

          if (tok === "d" || tok === "||" || tok === "| |" || tok === "\\parallel" || tok === "D") {
            content = `
              <div class="flex items-center justify-center h-full py-0.5">
                <div class="w-1.5 h-6 sm:h-7 flex justify-between border-l-2 border-r-2 border-slate-700 dark:border-slate-300 select-none"></div>
              </div>
            `;
          } else if (tok === "t" || tok === "|") {
            content = `
              <div class="flex items-center justify-center h-full py-0.5">
                <div class="w-px h-6 sm:h-7 bg-slate-400 dark:bg-slate-500 select-none"></div>
              </div>
            `;
          } else if (tok === "z" || tok === "0" || tok === "$0$") {
            content = `<span class="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm select-none font-mono">0</span>`;
          } else if (tok === "+" || tok === "$+$" || tok === "\\text{+}") {
            content = `<span class="font-black text-indigo-600 dark:text-indigo-400 text-sm sm:text-base select-none font-mono">+</span>`;
          } else if (tok === "-" || tok === "$-$" || tok === "–" || tok === "\\text{-}") {
            content = `<span class="font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base select-none font-mono">−</span>`;
          } else if (tok === "h" || tok === "H") {
            content = `<span class="text-slate-300 dark:text-slate-600 select-none font-bold">///</span>`;
          } else if (tok) {
            content = renderCellMath(tok);
          }

          const minWidthClass = isPointCol ? "min-w-[36px]" : "min-w-[56px] sm:min-w-[72px]";
          return `<td class="py-2.5 px-3 text-center text-xs sm:text-sm whitespace-nowrap ${minWidthClass} ${extraClass}">${content || "&nbsp;"}</td>`;
        });

        const isLastRow = r === rowDefs.length - 1;
        const borderBottomClass = isLastRow ? "" : "border-b border-slate-300 dark:border-slate-600";

        renderedRowsHtml.push(`
          <tr class="${borderBottomClass}">
            <th class="py-2.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-r-2 border-slate-300 dark:border-slate-600 whitespace-nowrap text-xs sm:text-sm w-20 min-w-[70px]">
              ${labelHtml}
            </th>
            ${cellsHtml.join("")}
          </tr>
        `);
      } else if (varIdx < varContents.length) {
        // Xử lý \tkzTabVar{ -/$\frac{5}{2}$ / , +D-/ $+\infty$ /$-\infty$  , +/ $\frac{5}{2}$/}
        const varContent = varContents[varIdx];
        varIdx++;

        // Tách các phần tử của \tkzTabVar bằng splitTopLevel (bỏ qua dấu phẩy trong công thức)
        const rawVarItems = splitTopLevel(varContent, ",").filter((s) => s.length > 0);

        interface ParsedVarItem {
          type:
            | "high"
            | "low"
            | "mid"
            | "disc_high_low"
            | "disc_low_high"
            | "disc_high_high"
            | "disc_low_low"
            | "disc";
          val1: string;
          val2?: string;
          exitHeight: "high" | "low" | "mid";
          entryHeight: "high" | "low" | "mid";
        }

        const parsedItems: ParsedVarItem[] = rawVarItems.map((itemStr) => {
          let str = itemStr.trim();

          // Nhận diện tiền tố biến thiên: ví dụ +D-, -D+, +D+, -D-, +DH-, -DH+, +CD-, -CD+, +V-, -V+, +, -, R, D...
          // Hỗ trợ cả trường hợp có khoảng trắng giữa các ký tự tiền tố (ví dụ: + D - / hoặc + /)
          const prefixMatch = str.match(/^([+\-RCVDH\s]+)\s*\/\s*(.*)$/s);
          if (prefixMatch) {
            const prefix = prefixMatch[1].replace(/\s+/g, "");
            const rest = prefixMatch[2].trim();
            const parts = splitTopLevel(rest, "/").map((p) => p.trim());

            if (prefix === "+D-" || prefix === "+DH-" || prefix === "+CD-" || prefix === "+V-") {
              return {
                type: "disc_high_low",
                val1: parts[0] || "",
                val2: parts[1] || "",
                entryHeight: "high",
                exitHeight: "low",
              };
            }
            if (prefix === "-D+" || prefix === "-DH+" || prefix === "-CD+" || prefix === "-V+") {
              return {
                type: "disc_low_high",
                val1: parts[0] || "",
                val2: parts[1] || "",
                entryHeight: "low",
                exitHeight: "high",
              };
            }
            if (prefix === "+D+" || prefix === "+DH+") {
              return {
                type: "disc_high_high",
                val1: parts[0] || "",
                val2: parts[1] || "",
                entryHeight: "high",
                exitHeight: "high",
              };
            }
            if (prefix === "-D-" || prefix === "-DH-") {
              return {
                type: "disc_low_low",
                val1: parts[0] || "",
                val2: parts[1] || "",
                entryHeight: "low",
                exitHeight: "low",
              };
            }
            if (prefix === "D" || prefix === "DH" || prefix === "V") {
              return {
                type: "disc",
                val1: parts[0] || "",
                val2: parts[1] || "",
                entryHeight: "mid",
                exitHeight: "mid",
              };
            }
            if (prefix === "+") {
              return {
                type: "high",
                val1: parts[0] || "",
                entryHeight: "high",
                exitHeight: "high",
              };
            }
            if (prefix === "-") {
              return {
                type: "low",
                val1: parts[0] || "",
                entryHeight: "low",
                exitHeight: "low",
              };
            }
            if (prefix === "R" || prefix === "C") {
              return {
                type: "mid",
                val1: parts[0] || "",
                entryHeight: "mid",
                exitHeight: "mid",
              };
            }
          }

          // Fallback nếu không khớp prefix regex
          if (str.startsWith("+/")) {
            const sub = str.substring(2).trim();
            const val = splitTopLevel(sub, "/")[0] || "";
            return { type: "high", val1: val, entryHeight: "high", exitHeight: "high" };
          }
          if (str.startsWith("-/")) {
            const sub = str.substring(2).trim();
            const val = splitTopLevel(sub, "/")[0] || "";
            return { type: "low", val1: val, entryHeight: "low", exitHeight: "low" };
          }
          return { type: "mid", val1: str, entryHeight: "mid", exitHeight: "mid" };
        });

        // Tạo các ô cho hàng biến thiên: xen kẽ Điểm và Mũi tên khoảng
        const cellsHtml: string[] = [];
        for (let i = 0; i < numPoints; i++) {
          const item = parsedItems[i] || {
            type: "mid",
            val1: "",
            entryHeight: "mid",
            exitHeight: "mid",
          };
          const val1Html = renderCellMath(item.val1);
          const val2Html = item.val2 ? renderCellMath(item.val2) : "";

          let pointCellContent = "";
          if (item.type === "high") {
            pointCellContent = `
              <div class="flex flex-col items-center justify-start h-14 sm:h-16 pt-1">
                <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val1Html}</span>
              </div>
            `;
          } else if (item.type === "low") {
            pointCellContent = `
              <div class="flex flex-col items-center justify-end h-14 sm:h-16 pb-1">
                <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val1Html}</span>
              </div>
            `;
          } else if (item.type === "disc_high_low") {
            pointCellContent = `
              <div class="flex items-stretch justify-center gap-1.5 h-14 sm:h-16 px-1">
                <div class="flex flex-col items-center justify-start pt-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val1Html}</span>
                </div>
                <div class="flex items-center justify-center px-0.5">
                  <div class="w-1.5 h-12 sm:h-14 flex justify-between border-l-2 border-r-2 border-slate-700 dark:border-slate-300 select-none"></div>
                </div>
                <div class="flex flex-col items-center justify-end pb-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val2Html}</span>
                </div>
              </div>
            `;
          } else if (item.type === "disc_low_high") {
            pointCellContent = `
              <div class="flex items-stretch justify-center gap-1.5 h-14 sm:h-16 px-1">
                <div class="flex flex-col items-center justify-end pb-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val1Html}</span>
                </div>
                <div class="flex items-center justify-center px-0.5">
                  <div class="w-1.5 h-12 sm:h-14 flex justify-between border-l-2 border-r-2 border-slate-700 dark:border-slate-300 select-none"></div>
                </div>
                <div class="flex flex-col items-center justify-start pt-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val2Html}</span>
                </div>
              </div>
            `;
          } else if (item.type === "disc_high_high") {
            pointCellContent = `
              <div class="flex items-stretch justify-center gap-1.5 h-14 sm:h-16 px-1">
                <div class="flex flex-col items-center justify-start pt-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val1Html}</span>
                </div>
                <div class="flex items-center justify-center px-0.5">
                  <div class="w-1.5 h-12 sm:h-14 flex justify-between border-l-2 border-r-2 border-slate-700 dark:border-slate-300 select-none"></div>
                </div>
                <div class="flex flex-col items-center justify-start pt-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val2Html}</span>
                </div>
              </div>
            `;
          } else if (item.type === "disc_low_low") {
            pointCellContent = `
              <div class="flex items-stretch justify-center gap-1.5 h-14 sm:h-16 px-1">
                <div class="flex flex-col items-center justify-end pb-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val1Html}</span>
                </div>
                <div class="flex items-center justify-center px-0.5">
                  <div class="w-1.5 h-12 sm:h-14 flex justify-between border-l-2 border-r-2 border-slate-700 dark:border-slate-300 select-none"></div>
                </div>
                <div class="flex flex-col items-center justify-end pb-1 min-w-[20px]">
                  <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val2Html}</span>
                </div>
              </div>
            `;
          } else if (item.type === "disc") {
            pointCellContent = `
              <div class="flex items-center justify-center h-14 sm:h-16 px-1">
                <div class="w-1.5 h-12 sm:h-14 flex justify-between border-l-2 border-r-2 border-slate-700 dark:border-slate-300 select-none"></div>
              </div>
            `;
          } else {
            pointCellContent = `
              <div class="flex items-center justify-center h-14 sm:h-16">
                <span class="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap">${val1Html}</span>
              </div>
            `;
          }

          cellsHtml.push(
            `<td class="py-1 px-3 text-center align-middle whitespace-nowrap min-w-[36px]">${pointCellContent}</td>`
          );

          // Cột Mũi tên giữa 2 điểm (sử dụng SVG vector chuẩn xác)
          if (i < numPoints - 1) {
            const nextItem = parsedItems[i + 1] || {
              type: "mid",
              val1: "",
              entryHeight: "mid",
              exitHeight: "mid",
            };
            const arrowSvg = renderSvgVariationArrow(
              item.exitHeight,
              nextItem.entryHeight,
              `${tableUid}-${r}-${i}`
            );

            cellsHtml.push(
              `<td class="py-1 px-1 text-center align-middle min-w-[56px] sm:min-w-[72px]">${arrowSvg}</td>`
            );
          }
        }

        const isLastRow = r === rowDefs.length - 1;
        const borderBottomClass = isLastRow ? "" : "border-b border-slate-300 dark:border-slate-600";

        renderedRowsHtml.push(`
          <tr class="${borderBottomClass}">
            <th class="py-2.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-r-2 border-slate-300 dark:border-slate-600 whitespace-nowrap text-xs sm:text-sm w-20 min-w-[70px]">
              ${labelHtml}
            </th>
            ${cellsHtml.join("")}
          </tr>
        `);
      }
    }

    return `
<div class="my-4 w-full flex flex-col items-center justify-center overflow-x-auto select-text scrollbar-thin scrollbar-thumb-slate-300">
  <div class="inline-block max-w-full rounded-2xl shadow-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden">
    <table class="border-collapse text-xs sm:text-sm text-slate-800 dark:text-slate-200 table-auto m-0">
      <tbody>
        ${renderedRowsHtml.join("")}
      </tbody>
    </table>
  </div>
</div>
    `.trim();
  } catch (error) {
    console.error("Lỗi parseTkzTab:", error);
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
