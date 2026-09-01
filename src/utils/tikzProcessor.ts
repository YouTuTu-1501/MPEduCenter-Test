import {
  ensureTikzPackages,
  renderTikzWithPackages,
  detectRequiredTikzPackages,
  DEFAULT_TIKZ_PACKAGES,
} from "./tikzParser";

export interface TikzProcessorOptions {
  includePgfplots?: boolean;
  include3D?: boolean;
  includeAngles?: boolean;
  includePerspective?: boolean;
  includeGeometry?: boolean;
  extraLibraries?: string[];
  compatVersion?: string;
  autoInject3DOpts?: boolean;
  defaultAngleRadius?: string;
  defaultAngleEccentricity?: number;
}

/**
 * Danh sách các thư viện TikZ chuẩn cho hình học không gian 3D, giải tích và đại số
 */
export const STANDARD_TIKZ_3D_LIBRARIES: readonly string[] = [
  "3d",
  "perspective",
  "tikz-3dplot",
  "calc",
  "angles",
  "quotes",
  "arrows.meta",
  "positioning",
  "patterns",
  "patterns.meta",
  "shapes.geometric",
  "shapes.misc",
  "intersections",
  "through",
  "math",
  "decorations.pathmorphing",
  "decorations.markings",
  "backgrounds",
  "fit",
  "tkz-euclide",
] as const;

/**
 * Kiểm tra xem một chuỗi văn bản hoặc mã LaTeX có chứa khối hình vẽ TikZ hay không
 */
export function containsTikzCode(text: string): boolean {
  if (!text) return false;
  return (
    /\\begin\{tikzpicture\}/i.test(text) ||
    /\\tikz\s*[\{\[]/i.test(text) ||
    /\\begin\{tikzpicture\*?\}/i.test(text)
  );
}

/**
 * Tạo khối header chứa \usepackage{pgfplots}, \pgfplotsset, \usepackage{tikz-3dplot}
 * và \usetikzlibrary{...} hoàn chỉnh bao gồm 3d, perspective, angles, calc, quotes
 */
export function buildTikzPreambleHeader(
  neededLibraries: string[] = [],
  options: TikzProcessorOptions = {}
): string {
  const libs = new Set<string>([
    ...STANDARD_TIKZ_3D_LIBRARIES,
    ...neededLibraries,
    ...(options.extraLibraries || []),
  ]);

  const standalonePackages: string[] = [];
  const tikzLibraries: string[] = [];

  // Phân loại các package độc lập và thư viện \usetikzlibrary
  standalonePackages.push("\\usepackage{pgfplots}");
  standalonePackages.push(`\\pgfplotsset{compat=${options.compatVersion || "1.18"}}`);
  standalonePackages.push("\\usepackage{tikz-3dplot}");
  standalonePackages.push("\\usepackage{tkz-euclide}");

  libs.forEach((lib) => {
    if (
      lib !== "pgfplots" &&
      lib !== "tikz-3dplot" &&
      lib !== "tkz-euclide" &&
      !lib.startsWith("pgfplots.")
    ) {
      tikzLibraries.push(lib);
    }
  });

  let header = standalonePackages.join("\n") + "\n";
  if (tikzLibraries.length > 0) {
    header += `\\usetikzlibrary{${tikzLibraries.join(", ")}}\n`;
  }
  return header;
}

/**
 * Tự động chèn và chuẩn hóa các cấu hình '3d', 'angles', 'perspective' vào môi trường \begin{tikzpicture}[...]
 * Giúp các hình vẽ không gian 3D, đo góc và phép chiếu hiển thị đồng nhất, mượt mà và ổn định.
 */
export function configureTikzPictureEnvironment(
  tikzCode: string,
  options: TikzProcessorOptions = {}
): string {
  if (!tikzCode) return "";

  // Danh sách các tùy chọn cấu hình mặc định nhằm tăng cường độ nét và độ ổn định đồ họa
  const defaultStyles: string[] = [
    "line join=round",
    "line cap=round",
    ">={Stealth[scale=1.1]}",
  ];

  // Nếu chứa góc hoặc nhãn góc \pic, bổ sung cấu hình góc mặc định
  const hasAngles = /pic\s*\[|angle\s*=|\\tkzMarkAngle/i.test(tikzCode);
  if (hasAngles || options.includeAngles !== false) {
    const radius = options.defaultAngleRadius || "6mm";
    const ecc = options.defaultAngleEccentricity || 1.3;
    defaultStyles.push(`angle radius=${radius}`);
    defaultStyles.push(`angle eccentricity=${ecc}`);
  }

  // Regex phát hiện \begin{tikzpicture} có hoặc không có [options]
  const tikzEnvRegex = /\\begin\{tikzpicture\*?\}(\s*\[([\s\S]*?)\])?/i;
  const match = tikzCode.match(tikzEnvRegex);

  if (!match) {
    return tikzCode;
  }

  const existingOptionsStr = match[2] ? match[2].trim() : "";
  let mergedOptions: string[] = [];

  if (existingOptionsStr) {
    // Tách các option hiện có nhưng giữ nguyên các block ngoặc nhọn {...} hoặc ngoặc tròn (...)
    mergedOptions = [existingOptionsStr];
    // Bổ sung các style chưa có
    for (const style of defaultStyles) {
      const key = style.split("=")[0].trim();
      if (!existingOptionsStr.includes(key)) {
        mergedOptions.push(style);
      }
    }
  } else {
    mergedOptions = [...defaultStyles];
  }

  const newBeginBlock = `\\begin{tikzpicture}[${mergedOptions.join(", ")}]`;
  return tikzCode.replace(tikzEnvRegex, newBeginBlock);
}

/**
 * Chuẩn hóa và làm sạch mã nguồn TikZ, sửa các lỗi gõ/dán phổ biến
 */
export function sanitizeTikzSource(code: string): string {
  if (!code) return "";
  let sanitized = code;

  // 1. Sửa lỗi thiếu dấu \ trước node / ode khi dán mã từ PDF hoặc web
  sanitized = sanitized.replace(/(?:^|\n|\r|;)\s*ode\s*\[/g, "\n\\node[");
  sanitized = sanitized.replace(/(?:^|\n|\r|;)\s*node\s*\[/g, "\n\\node[");

  // 2. Chuẩn hóa các dấu nháy kép cho nhãn quote góc ví dụ: "$60^\circ$"
  sanitized = sanitized.replace(/“|”/g, '"');

  // 3. Chuẩn hóa góc và hàm lượng giác ngược asin, acos, atan
  sanitized = sanitized.replace(/\\pgfmathsetmacro\s*\\g\s*\{\s*asin\(([^)]+)\)\s*\}/g, (m, val) => {
    return `\\pgfmathsetmacro\\g{asin(${val})}`;
  });

  return sanitized;
}

/**
 * Xử lý và tiền biên dịch một khối mã TikZ đơn lẻ:
 * - Tự động bổ sung các thư viện '3d', 'angles', 'perspective', 'calc', 'quotes', 'pgfplots'
 * - Cấu hình trực tiếp môi trường \begin{tikzpicture}[...] với các tham số 3D, đo góc và phép chiếu tối ưu
 * - Khử lỗi cú pháp và chuẩn hóa vector cơ sở 3D
 */
export function preprocessTikzCode(
  rawTikzCode: string,
  options: TikzProcessorOptions = {}
): string {
  if (!rawTikzCode) return "";

  const clean = sanitizeTikzSource(rawTikzCode);

  // 1. Cấu hình trực tiếp các thuộc tính '3d', 'angles', 'perspective' vào \begin{tikzpicture}[...]
  const configured = configureTikzPictureEnvironment(clean, options);

  // 2. Nếu yêu cầu xuất thành tài liệu LaTeX độc lập (standalone), nạp đầy đủ header
  if (options.includePgfplots || options.extraLibraries?.length) {
    const detected = detectRequiredTikzPackages(configured);
    const combinedLibraries = Array.from(
      new Set([
        ...DEFAULT_TIKZ_PACKAGES,
        ...STANDARD_TIKZ_3D_LIBRARIES,
        "3d",
        "angles",
        "perspective",
        "calc",
        "quotes",
        ...detected,
        ...(options.extraLibraries || []),
      ])
    );
    const { processedCode } = ensureTikzPackages(configured, combinedLibraries);
    return processedCode;
  }

  return configured;
}

/**
 * Tiền xử lý toàn bộ văn bản LaTeX:
 * Quét tất cả các môi trường \begin{tikzpicture}...\end{tikzpicture},
 * cấu hình môi trường \begin{tikzpicture}[...] với các thiết lập 3D, angles, perspective tối ưu,
 * đồng thời loại bỏ triệt để các khai báo preamble rò rỉ (như \pgfplotsset, \usepgfplotslibrary, \usepackage, \usetikzlibrary)
 * ngoài văn bản để đảm bảo hiển thị sạch đẹp, không bị lỗi chữ thô trên màn hình.
 */
export function preprocessTikzInLatex(
  latexContent: string,
  options: TikzProcessorOptions = {}
): string {
  if (!latexContent) return "";

  let result = latexContent;

  // 1. Loại bỏ các khai báo preamble LaTeX không thuộc nội dung hiển thị của câu hỏi
  result = result.replace(/\\pgfplotsset\{[\s\S]*?\}/gi, "");
  result = result.replace(/\\usepgfplotslibrary\{[^}]+\}/gi, "");
  result = result.replace(/\\usetikzlibrary\{[^}]+\}/gi, "");
  result = result.replace(/\\usepackage(?:\s*\[[^\]]*\])?\{[^}]+\}/gi, "");
  result = result.replace(/\\tikzset\{[\s\S]*?\}/gi, "");
  result = result.replace(/\\tikzstyle\{[\s\S]*?\}/gi, "");

  // Nếu không chứa TikZ thì trả về kết quả đã làm sạch
  if (!containsTikzCode(result)) {
    return result;
  }

  // 2. Quét và tiền xử lý môi trường \begin{center}\begin{tikzpicture}...\end{tikzpicture}\end{center}
  result = result.replace(
    /\\begin\{center\}\s*(\\begin\{tikzpicture\*?\}[\s\S]*?\\end\{tikzpicture\*?\})\s*\\end\{center\}/gi,
    (match, innerTikz) => {
      const processed = preprocessTikzCode(innerTikz, options);
      return `\\begin{center}\n${processed}\n\\end{center}`;
    }
  );

  // 3. Quét và tiền xử lý môi trường \begin{tikzpicture}...\end{tikzpicture} độc lập
  result = result.replace(
    /\\begin\{tikzpicture\*?\}[\s\S]*?\\end\{tikzpicture\*?\}/gi,
    (match) => {
      return preprocessTikzCode(match, options);
    }
  );

  return result;
}

/**
 * Trích xuất tất cả các khối TikZ từ văn bản LaTeX cùng với vị trí và mã đã xử lý
 */
export function extractTikzBlocks(
  latexContent: string,
  options: TikzProcessorOptions = {}
): Array<{ raw: string; processed: string; startIndex: number; endIndex: number }> {
  if (!latexContent) return [];

  const blocks: Array<{ raw: string; processed: string; startIndex: number; endIndex: number }> = [];
  const regex = /\\begin\{tikzpicture\*?\}[\s\S]*?\\end\{tikzpicture\*?\}/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(latexContent)) !== null) {
    const raw = match[0];
    const processed = preprocessTikzCode(raw, options);
    blocks.push({
      raw,
      processed,
      startIndex: match.index,
      endIndex: match.index + raw.length,
    });
  }

  return blocks;
}

/**
 * Tiện ích kết xuất trực tiếp mã TikZ sang đồ họa vector SVG an toàn
 */
export function renderProcessedTikzToSvg(
  tikzCode: string,
  options: TikzProcessorOptions = {}
): string {
  if (!tikzCode) return "";
  const preprocessed = preprocessTikzCode(tikzCode, options);
  return renderTikzWithPackages(preprocessed, STANDARD_TIKZ_3D_LIBRARIES);
}
