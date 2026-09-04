import katex from "katex";
import { parseTkzTab } from "./tableParser";

export interface Point2D {
  x: number;
  y: number;
}

export interface TikzNode {
  id: string;
  x: number;
  y: number;
  label: string;
  pos: string; // 'left' | 'right' | 'above' | 'below' | 'above left' | 'below right' | ...
  color?: string;
  isBadge?: boolean;
  isExplicitShifted?: boolean;
  isFixed?: boolean;
}

export interface TikzRectShape {
  id: string;
  x: number; // center x
  y: number; // center y
  width: number;
  height: number;
  pattern?: "north west lines" | "dots" | "crosshatch" | "grid" | "none";
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
}

export interface TikzPath {
  type: "line" | "circle" | "ellipse" | "arc" | "polygon" | "function" | "right_angle" | "angle_arc";
  points?: Point2D[];
  center?: Point2D;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  startAngle?: number;
  endAngle?: number;
  isDashed?: boolean;
  isDotted?: boolean;
  hasArrowEnd?: boolean;
  hasArrowStart?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  isCycle?: boolean;
  functionExpr?: string;
  doubleArc?: boolean;
}

export interface AngleMark {
  p1: Point2D;
  vertex: Point2D;
  p2: Point2D;
  size?: number;
  label?: string;
  isRightAngle?: boolean;
  doubleArc?: boolean;
  color?: string;
  fillColor?: string;
  hasDot?: boolean;
}

/**
 * Danh sách các gói (packages) và thư viện TikZ phổ biến được hỗ trợ tự động
 */
export const SUPPORTED_TIKZ_LIBRARIES = [
  "pgfplots",
  "pgfplots.groupplots",
  "pgfplots.polar",
  "pgfplots.statistics",
  "pgfplots.dateplot",
  "patterns",
  "patterns.meta",
  "angles",
  "quotes",
  "calc",
  "positioning",
  "arrows.meta",
  "shapes.geometric",
  "shapes.misc",
  "shapes.symbols",
  "intersections",
  "through",
  "math",
  "3d",
  "perspective",
  "tikz-3dplot",
  "decorations.pathmorphing",
  "decorations.markings",
  "backgrounds",
  "fit",
  "matrix",
  "scopes",
  "chains",
  "babel",
  "tkz-euclide",
  "tkz-tab",
  "tkz-fct",
  "shadings",
  "shadows",
  "fadings",
] as const;

/**
 * Cấu hình các gói mặc định luôn tự động được nạp trong trình biên dịch TikZ
 * Bao gồm pgfplots, các thư viện hình học không gian 3D, calc, angles, quotes, patterns...
 */
export const DEFAULT_TIKZ_PACKAGES: readonly string[] = [
  "pgfplots",
  "pgfplots.groupplots",
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
 * Hàm phát hiện các gói (packages) và thư viện TikZ cần thiết từ đoạn mã
 */
export function detectRequiredTikzPackages(tikzCode: string): string[] {
  if (!tikzCode) return [];
  const detected = new Set<string>();

  // 0. Gói pgfplots & groupplots cho vẽ đồ thị khoa học
  if (
    /\\begin\{axis\}|\\end\{axis\}|\\addplot|\\pgfplotsset|pgfplots|axis\s+cs:|rel\s+axis\s+cs:|\bxmin\s*=|\\addplot3|\bymin\s*=/i.test(
      tikzCode
    )
  ) {
    detected.add("pgfplots");
    if (/groupplot/i.test(tikzCode)) {
      detected.add("pgfplots.groupplots");
    }
    if (/polaraxis/i.test(tikzCode)) {
      detected.add("pgfplots.polar");
    }
    if (/boxplot|statistics/i.test(tikzCode)) {
      detected.add("pgfplots.statistics");
    }
  }

  // 1. Gói patterns / patterns.meta
  if (
    /pattern\s*=|pattern\s+color|north\s+west\s+lines|north\s+east\s+lines|crosshatch|dots|grid|vertical\s+lines|horizontal\s+lines/i.test(
      tikzCode
    )
  ) {
    detected.add("patterns");
    detected.add("patterns.meta");
  }

  // 2. Gói angles & quotes
  if (
    /pic\s*(?:\[|\{)|angle\s*=|angle\s+radius|angle\s+eccentricity|right\s+angle\s*=|\\tkzMarkAngle|\\tkzMarkRightAngle/i.test(
      tikzCode
    )
  ) {
    detected.add("angles");
    detected.add("quotes");
  }

  // 3. Gói quotes (dùng nhãn chuỗi dạng "label" trong pic hoặc edge)
  if (
    /pic\s*\[[^\]]*["'][^"']+["'][^\]]*\]|pic\s*["'][^"']+["']|edge\s*\[[^\]]*["']/i.test(
      tikzCode
    )
  ) {
    detected.add("quotes");
    detected.add("angles");
  }

  // 4. Gói calc
  if (
    /\(\s*\$\s*\(|!\s*[\d.]+\s*!|\)\s*[+-]\s*\(|\bcalc\b|\\coordinate[^(]*\(\s*\$/i.test(tikzCode)
  ) {
    detected.add("calc");
  }

  // 5. Gói arrows.meta
  if (
    /->|<-|<->|-stealth|stealth-|>=stealth|Stealth|Latex|arrows\.meta/i.test(tikzCode)
  ) {
    detected.add("arrows.meta");
  }

  // 6. Gói positioning
  if (
    /above\s+of|below\s+of|left\s+of|right\s+of|above\s*=\s*of|below\s*=\s*of|left\s*=\s*of|right\s*=\s*of|node\s*\[[^\]]*midway|node\s*\[[^\]]*pos=/i.test(
      tikzCode
    )
  ) {
    detected.add("positioning");
  }

  // 7. Gói intersections
  if (/name\s+path|intersection\s+of|name\s+intersections|by=/i.test(tikzCode)) {
    detected.add("intersections");
  }

  // 8. Thư viện hình học không gian 3D (3d, perspective, tikz-3dplot)
  if (
    /canvas\s+is|\b3d\b|perspective|xyz\s+cylindrical|xyz\s+spherical|\\tdplotsetmaincoords|tdplot_main_coords|tdplot_screen_coords|\\tdplotdrawarc|\\tdplotsetthetaplanecoords|tikz-3dplot|\bview\s*=|3d\s+view|\\addplot3|\bx\s*=\s*\{[^\}]*\},?\s*y\s*=\s*\{[^\}]*\}|\(\s*[-+0-9.]+\s*,\s*[-+0-9.]+\s*,\s*[-+0-9.]+\s*\)/i.test(
      tikzCode
    )
  ) {
    detected.add("3d");
    detected.add("perspective");
    detected.add("tikz-3dplot");
  }

  // 9. Thư viện tkz-euclide nếu chứa macro tkz
  if (/\\tkz[A-Z][a-zA-Z]+/i.test(tikzCode)) {
    detected.add("tkz-euclide");
  }

  // 10. Hình học shapes & decorations
  if (/cylinder|trapezium|ellipse|regular polygon|star\b|cloud|callout|decorate\b|decoration=/i.test(tikzCode)) {
    detected.add("shapes.geometric");
    detected.add("decorations.pathmorphing");
  }

  return Array.from(detected);
}

/**
 * Hàm kiểm tra, chuẩn hóa và tự động bổ sung các gói thư viện TikZ cần thiết (như pgfplots, 3d, tikz-3dplot, patterns, angles, quotes, calc)
 * Đảm bảo các đoạn mã TikZ phức tạp luôn ổn định và tương thích trước khi render
 */
export function ensureTikzPackages(
  tikzCode: string,
  extraRequiredPackages: readonly string[] = DEFAULT_TIKZ_PACKAGES
): {
  processedCode: string;
  detectedLibraries: string[];
  injectedHeader: string;
  hasAllEssentialPackages: boolean;
} {
  if (!tikzCode) {
    return {
      processedCode: "",
      detectedLibraries: [],
      injectedHeader: "",
      hasAllEssentialPackages: true,
    };
  }

  const detectedLibraries = detectRequiredTikzPackages(tikzCode);

  // Tập hợp tất cả thư viện cần có
  const allNeeded = new Set<string>([...extraRequiredPackages, ...detectedLibraries]);

  // Trích xuất các thư viện đã được khai báo sẵn trong mã (nếu có)
  const existingLibs = new Set<string>();
  const libMatches = tikzCode.matchAll(/\\usetikzlibrary\{([^}]+)\}/g);
  for (const m of libMatches) {
    m[1].split(",").forEach((lib) => existingLibs.add(lib.trim()));
  }

  const existingPkgs = new Set<string>();
  const pkgMatches = tikzCode.matchAll(/\\usepackage(?:\s*\[[^\]]*\])?\{([^}]+)\}/g);
  for (const m of pkgMatches) {
    m[1].split(",").forEach((pkg) => existingPkgs.add(pkg.trim()));
  }

  // Lọc các thư viện TikZ còn thiếu (ngoại trừ các gói độc lập như pgfplots, tikz-3dplot, tkz-euclide)
  const standalonePkgs = new Set(["pgfplots", "tikz-3dplot", "tkz-euclide", "tkz-tab", "tkz-fct"]);
  const missingLibs = Array.from(allNeeded).filter(
    (lib) => !existingLibs.has(lib) && !standalonePkgs.has(lib) && !lib.startsWith("pgfplots")
  );

  let injectedHeader = "";
  if (
    (allNeeded.has("pgfplots") || detectedLibraries.includes("pgfplots")) &&
    !existingPkgs.has("pgfplots") &&
    !tikzCode.includes("\\usepackage{pgfplots}") &&
    !tikzCode.includes("\\usepackage[")
  ) {
    injectedHeader += "\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n";
  }
  if (allNeeded.has("pgfplots.groupplots") && !tikzCode.includes("groupplots")) {
    injectedHeader += "\\usepgfplotslibrary{groupplots}\n";
  }
  if (allNeeded.has("pgfplots.polar") && !tikzCode.includes("polar")) {
    injectedHeader += "\\usepgfplotslibrary{polar}\n";
  }

  if (
    (allNeeded.has("tikz-3dplot") || detectedLibraries.includes("tikz-3dplot")) &&
    !existingPkgs.has("tikz-3dplot") &&
    !tikzCode.includes("tikz-3dplot")
  ) {
    injectedHeader += "\\usepackage{tikz-3dplot}\n";
  }

  if (
    (allNeeded.has("tkz-euclide") || detectedLibraries.includes("tkz-euclide")) &&
    !existingPkgs.has("tkz-euclide") &&
    !tikzCode.includes("tkz-euclide")
  ) {
    injectedHeader += "\\usepackage{tkz-euclide}\n";
  }

  if (missingLibs.length > 0) {
    injectedHeader += `\\usetikzlibrary{${missingLibs.join(", ")}}\n`;
  }

  let processedCode = tikzCode;

  // Chuẩn hóa và khắc phục các định dạng phức tạp phổ biến:
  // 1. Chuẩn hóa cú pháp quotes trong pic: pic["$30^\circ$", draw] -> hỗ trợ dấu nháy đơn hoặc kép
  // 2. Chuẩn hóa đơn vị đo góc và bán kính
  // 3. Đảm bảo có môi trường \begin{tikzpicture}...\end{tikzpicture}
  if (!processedCode.includes("\\begin{tikzpicture}") && !processedCode.includes("\\begin{center}")) {
    processedCode = `\\begin{tikzpicture}\n${processedCode}\n\\end{tikzpicture}`;
  }

  return {
    processedCode: injectedHeader + processedCode,
    detectedLibraries,
    injectedHeader,
    hasAllEssentialPackages: missingLibs.length === 0,
  };
}

/**
 * Hàm chuẩn hóa số thập phân và giải biểu thức số học toán học trong tọa độ LaTeX / TikZ
 * Hỗ trợ sqrt(), sin(), cos(), tan(), pi, phân số, độ, cm, pt, mm, mm/cm scale, .5, -.5...
 */
export function evaluateExpr(expr: string): number {
  if (!expr) return 0;
  let clean = expr.trim();
  if (!clean) return 0;

  // Bỏ đơn vị cm, pt, mm, in (1cm = 1.0 đơn vị toán học, 1mm = 0.1cm, 10pt = 0.35cm)
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*mm\b/g, "($1*0.1)");
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*pt\b/g, "($1*0.035)");
  clean = clean.replace(/cm|in|deg|\\degree/g, "").trim();

  // Chuẩn hóa ngoặc nhọn trong biểu thức {expr} -> (expr)
  clean = clean.replace(/\{([^{}]+)\}/g, "($1)");
  clean = clean.replace(/^\s*\{|\}\s*$/g, "").trim();

  // Chuẩn hóa số thập phân khuyết 0 ở đầu: .5 -> 0.5, -.5 -> -0.5
  clean = clean.replace(/(^|[\s,(\[+\-*\/])\.(\d+)/g, "$1 0.$2");
  clean = clean.replace(/(^|[\s,(\[+\-*\/])-\.(\d+)/g, "$1 -0.$2");

  // Thay thế các hàm & hằng số toán
  clean = clean.replace(/\\pi\b|(?<![a-zA-Z0-9_])pi(?![a-zA-Z0-9_])/g, "Math.PI");
  clean = clean.replace(/\\e\b|(?<![a-zA-Z0-9_])e(?![a-zA-Z0-9_])/g, "Math.E");
  clean = clean.replace(/\\sqrt\{([^}]+)\}/g, "Math.sqrt($1)");
  clean = clean.replace(/\bsqrt\(([^)]+)\)/g, "Math.sqrt($1)");

  // Hàm lượng giác ngược (TikZ asin, acos, atan, atan2 trả về độ)
  clean = clean.replace(/\\?asin\(([^)]+)\)/g, "(Math.asin($1) * 180 / Math.PI)");
  clean = clean.replace(/\\?acos\(([^)]+)\)/g, "(Math.acos($1) * 180 / Math.PI)");
  clean = clean.replace(/\\?atan2\(([^,]+),\s*([^)]+)\)/g, "(Math.atan2($1, $2) * 180 / Math.PI)");
  clean = clean.replace(/\\?atan\(([^)]+)\)/g, "(Math.atan($1) * 180 / Math.PI)");

  // Hàm lượng giác thông thường (đối số là độ trong TikZ)
  clean = clean.replace(/\\?sin\(([^)]+)\)/g, "Math.sin(($1) * Math.PI / 180)");
  clean = clean.replace(/\\?cos\(([^)]+)\)/g, "Math.cos(($1) * Math.PI / 180)");
  clean = clean.replace(/\\?tan\(([^)]+)\)/g, "Math.tan(($1) * Math.PI / 180)");

  // Các hàm toán học bổ sung
  clean = clean.replace(/\\?abs\(([^)]+)\)/g, "Math.abs($1)");
  clean = clean.replace(/\\?ln\(([^)]+)\)/g, "Math.log($1)");
  clean = clean.replace(/\\?exp\(([^)]+)\)/g, "Math.exp($1)");
  clean = clean.replace(/\\?round\(([^)]+)\)/g, "Math.round($1)");
  clean = clean.replace(/\\?floor\(([^)]+)\)/g, "Math.floor($1)");
  clean = clean.replace(/\\?ceil\(([^)]+)\)/g, "Math.ceil($1)");

  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "(($1)/($2))");
  clean = clean.replace(/\^/g, "**");

  // Nhân ẩn: 3(x) -> 3*(x), (x)(y) -> (x)*(y), )3 -> )*3
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*\(/g, "$1*(");
  clean = clean.replace(/\)\s*\(/g, ")*(");
  clean = clean.replace(/\)\s*(\d+(?:\.\d+)?)/g, ")*$1");
  // Nhân ẩn với Math: 3Math.cos -> 3*Math.cos
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*(Math\.[a-zA-Z0-9_]+)/g, "$1*$2");

  try {
    const fn = new Function(`return (${clean});`);
    const val = Number(fn());
    return isNaN(val) ? 0 : val;
  } catch {
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
}

/**
 * Hàm giải biểu thức hàm số toán học f(x) hoặc f(t) cho các lệnh plot trong TikZ & PGFPlots
 */
export function evaluateMathFunction(expr: string, xVal: number, varName: string = "x"): number {
  if (!expr) return NaN;
  let clean = expr.trim();

  // Bỏ dấu ngoặc nhọn ngoài cùng nếu có {expr}
  if (clean.startsWith("{") && clean.endsWith("}")) {
    clean = clean.substring(1, clean.length - 1).trim();
  }

  // Chuẩn hóa hàm mũ e^... trước khi thay thế biến
  clean = clean.replace(/e\s*\^\s*\{([^}]+)\}/gi, "Math.exp($1)");
  clean = clean.replace(/e\s*\^\s*\\?([a-zA-Z0-9_]+)/gi, "Math.exp($1)");

  // Thay thế biến (\x, \t, x, t) bằng giá trị số học
  const vRegex = new RegExp(`\\\\${varName}\\b|(?<![a-zA-Z_])${varName}(?![a-zA-Z_])`, "g");
  clean = clean.replace(vRegex, `(${xVal})`);
  // Hỗ trợ trường hợp biến khác x nếu có \x trong công thức
  clean = clean.replace(/\\x\b/g, `(${xVal})`);
  clean = clean.replace(/\\t\b/g, `(${xVal})`);

  // Phép nhân ẩn (Implicit multiplication): 3(x) -> 3*(x), (x)(y) -> (x)*(y), )( -> )*(, )3 -> )*3
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*\(/g, "$1*(");
  clean = clean.replace(/\)\s*\(/g, ")*(");
  clean = clean.replace(/\)\s*(\d+(?:\.\d+)?)/g, ")*$1");
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*Math\./g, "$1*Math.");

  // Chuẩn hóa lũy thừa và dấu +-
  clean = clean.replace(/\^/g, "**");
  clean = clean.replace(/\+-/g, "-");
  clean = clean.replace(/--/g, "+");

  // Chuẩn hóa lượng giác radian (sin(\x r)) và thông thường
  clean = clean.replace(/\bsin\s*\(([^)]+)\s*r\)/gi, "Math.sin($1)");
  clean = clean.replace(/\bcos\s*\(([^)]+)\s*r\)/gi, "Math.cos($1)");
  clean = clean.replace(/\btan\s*\(([^)]+)\s*r\)/gi, "Math.tan($1)");
  clean = clean.replace(/\bsin\s*\(([^)]+)\)/gi, "Math.sin($1)");
  clean = clean.replace(/\bcos\s*\(([^)]+)\)/gi, "Math.cos($1)");
  clean = clean.replace(/\btan\s*\(([^)]+)\)/gi, "Math.tan($1)");
  clean = clean.replace(/\\sin\b/gi, "Math.sin");
  clean = clean.replace(/\\cos\b/gi, "Math.cos");
  clean = clean.replace(/\\tan\b/gi, "Math.tan");

  // Căn bậc hai, logarit, hàm mũ, trị tuyệt đối
  clean = clean.replace(/\\sqrt\{([^}]+)\}/gi, "Math.sqrt($1)");
  clean = clean.replace(/\bsqrt\s*\(([^)]+)\)/gi, "Math.sqrt($1)");
  clean = clean.replace(/\\ln\s*\(([^)]+)\)/gi, "Math.log($1)");
  clean = clean.replace(/\bln\s*\(([^)]+)\)/gi, "Math.log($1)");
  clean = clean.replace(/\\log\s*\(([^)]+)\)/gi, "Math.log10($1)");
  clean = clean.replace(/\blog\s*\(([^)]+)\)/gi, "Math.log10($1)");
  clean = clean.replace(/\\exp\s*\(([^)]+)\)/gi, "Math.exp($1)");
  clean = clean.replace(/\bexp\s*\(([^)]+)\)/gi, "Math.exp($1)");
  clean = clean.replace(/\\abs\s*\(([^)]+)\)/gi, "Math.abs($1)");
  clean = clean.replace(/\babs\s*\(([^)]+)\)/gi, "Math.abs($1)");

  // Hằng số Pi và e
  clean = clean.replace(/\\pi\b|\bpi\b/gi, "Math.PI");
  clean = clean.replace(/\\e\b|(?<![a-zA-Z0-9_])e(?![a-zA-Z0-9_])/g, "Math.E");

  // Phân số LaTeX \frac{a}{b}
  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "(($1)/($2))");

  try {
    const fn = new Function(`return (${clean});`);
    const val = Number(fn());
    return isFinite(val) ? val : NaN;
  } catch {
    return NaN;
  }
}

/**
 * Phân tích và chuyển đổi màu sắc TikZ (gray!20, blue!50, red, v.v.) sang mã màu CSS / SVG
 */
export function parseTikzColor(colorStr: string, defaultColor = "#1e293b"): string {
  if (!colorStr) return defaultColor;
  const s = colorStr.toLowerCase().trim();

  if (s.includes("gray!10") || s.includes("black!10")) return "rgba(148, 163, 184, 0.2)";
  if (s.includes("gray!20") || s.includes("black!20")) return "rgba(148, 163, 184, 0.35)";
  if (s.includes("gray!30") || s.includes("black!30")) return "rgba(148, 163, 184, 0.5)";
  if (s.includes("gray!50") || s.includes("black!50")) return "rgba(100, 116, 139, 0.7)";
  if (s.includes("gray!80") || s.includes("black!80")) return "#475569";
  if (s.includes("gray") || s.includes("grey")) return "#64748b";

  if (s.includes("red!20")) return "rgba(239, 68, 68, 0.25)";
  if (s.includes("red!50")) return "rgba(239, 68, 68, 0.6)";
  if (s.includes("red")) return "#ef4444";

  if (s.includes("blue!20")) return "rgba(59, 130, 246, 0.25)";
  if (s.includes("blue!50")) return "rgba(59, 130, 246, 0.6)";
  if (s.includes("blue")) return "#2563eb";

  if (s.includes("green!20")) return "rgba(16, 185, 129, 0.25)";
  if (s.includes("green!50")) return "rgba(16, 185, 129, 0.6)";
  if (s.includes("green")) return "#10b981";

  if (s.includes("amber") || s.includes("orange")) return "#f59e0b";
  if (s.includes("purple") || s.includes("indigo")) return "#6366f1";
  if (s.includes("cyan") || s.includes("teal")) return "#06b6d4";
  if (s.includes("white")) return "#ffffff";
  if (s.includes("black")) return "#0f172a";

  return defaultColor;
}

/**
 * Tính góc (độ) từ vector (dx, dy)
 */
function getAngleDeg(dx: number, dy: number): number {
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Chuyển đổi các đơn vị đo kích thước TikZ (mm, cm, pt, in, ex, em) sang đơn vị tọa độ toán học
 */
export function parseTikzDimension(valStr: string, defaultVal: number): number {
  if (!valStr) return defaultVal;
  const s = valStr.trim().toLowerCase();
  const num = parseFloat(s);
  if (isNaN(num)) return defaultVal;
  if (s.endsWith("mm")) return num * 0.1;
  if (s.endsWith("cm")) return num;
  if (s.endsWith("pt")) return num / 28.45;
  if (s.endsWith("in") || s.endsWith("inch")) return num * 2.54;
  if (s.endsWith("ex")) return (num * 4) / 28.45;
  if (s.endsWith("em")) return (num * 10) / 28.45;

  // Trong PGF/TikZ, các key thuộc tính kích thước (như angle radius = 12, size = 15, inner sep = 5):
  // Nếu không có đơn vị rõ ràng và giá trị >= 2.0, đơn vị ngầm định của TeX/TikZ luôn là 'pt' (points).
  // 12pt = 12 / 28.45 ≈ 0.42 cm.
  if (num >= 2.0) {
    return num / 28.45;
  }
  return num;
}

/**
 * Trích xuất cặp ngoặc { ... } lồng nhau một cách chính xác
 */
export function extractBalancedBraces(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== "{") return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) {
        return {
          content: str.substring(startIndex + 1, i),
          endIndex: i,
        };
      }
    }
  }
  return null;
}

/**
 * Trích xuất cặp ngoặc tròn ( ... ) lồng nhau một cách chính xác
 */
export function extractBalancedParens(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== "(") return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "(") depth++;
    else if (str[i] === ")") {
      depth--;
      if (depth === 0) {
        return {
          content: str.substring(startIndex + 1, i),
          endIndex: i,
        };
      }
    }
  }
  return null;
}

/**
 * Trích xuất cặp ngoặc vuông [ ... ] lồng nhau một cách chính xác
 */
export function extractBalancedBrackets(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== "[") return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "[") depth++;
    else if (str[i] === "]") {
      depth--;
      if (depth === 0) {
        return {
          content: str.substring(startIndex + 1, i),
          endIndex: i,
        };
      }
    }
  }
  return null;
}

/**
 * Mở rộng và thay thế các định nghĩa biến, macro trong TikZ/LaTeX theo đúng thứ tự xuất hiện
 * Hỗ trợ:
 * - \def\a{2.5} hoặc \def\a {2.5}
 * - \pgfmathsetmacro\a{2.5} hoặc \pgfmathsetmacro{\a}{2.5}
 * - \pgfmathparse{2.5} -> \pgfmathresult
 * - \newcommand{\a}{2.5} hoặc \newcommand\a{2.5}
 * - \edef, \renewcommand, \let
 */
export function expandTikzMacros(code: string): string {
  let result = code;
  let iterations = 0;

  while (iterations < 40) {
    iterations++;

    interface MacroMatchCandidate {
      index: number;
      length: number;
      fullText: string;
      varName: string;
      rawVal: string;
      isMath: boolean;
      isPgfResult?: boolean;
    }

    const candidates: MacroMatchCandidate[] = [];

    // 1. \pgfmathsetmacro\var{val} hoặc \pgfmathsetmacro{\var}{val}
    const pgfMathRegex = /\\pgfmathsetmacro\s*(?:\{?\\?([a-zA-Z0-9_]+)\}?)\s*\{([^}]+)\}/gi;
    let pmMatch: RegExpExecArray | null;
    while ((pmMatch = pgfMathRegex.exec(result)) !== null) {
      candidates.push({
        index: pmMatch.index,
        length: pmMatch[0].length,
        fullText: pmMatch[0],
        varName: pmMatch[1],
        rawVal: pmMatch[2].trim(),
        isMath: true,
      });
    }

    // 2. \pgfmathparse{val}
    const pgfParseRegex = /\\pgfmathparse\s*\{([^}]+)\}/gi;
    let ppMatch: RegExpExecArray | null;
    while ((ppMatch = pgfParseRegex.exec(result)) !== null) {
      candidates.push({
        index: ppMatch.index,
        length: ppMatch[0].length,
        fullText: ppMatch[0],
        varName: "pgfmathresult",
        rawVal: ppMatch[1].trim(),
        isMath: true,
        isPgfResult: true,
      });
    }

    // 3. \def\var{val} hoặc \edef\var{val}
    const defRegex = /\\e?def\s*\\([a-zA-Z0-9_]+)\s*\{([^}]+)\}/gi;
    let defMatch: RegExpExecArray | null;
    while ((defMatch = defRegex.exec(result)) !== null) {
      candidates.push({
        index: defMatch.index,
        length: defMatch[0].length,
        fullText: defMatch[0],
        varName: defMatch[1],
        rawVal: defMatch[2].trim(),
        isMath: false,
      });
    }

    // 4. \newcommand{\var}{val} hoặc \renewcommand{\var}{val}
    const newcmdRegex = /\\(?:re)?newcommand\*?\s*(?:\{?\\?([a-zA-Z0-9_]+)\}?)\s*\{([^}]+)\}/gi;
    let ncMatch: RegExpExecArray | null;
    while ((ncMatch = newcmdRegex.exec(result)) !== null) {
      candidates.push({
        index: ncMatch.index,
        length: ncMatch[0].length,
        fullText: ncMatch[0],
        varName: ncMatch[1],
        rawVal: ncMatch[2].trim(),
        isMath: false,
      });
    }

    if (candidates.length === 0) break;

    // Chọn macro xuất hiện sớm nhất trong mã nguồn (theo thứ tự thực thi của LaTeX)
    candidates.sort((a, b) => a.index - b.index);
    const earliest = candidates[0];

    // Đánh giá giá trị biểu thức
    let valStr = earliest.rawVal;
    const numVal = evaluateExpr(earliest.rawVal);
    if (!isNaN(numVal) && (earliest.isMath || /^[+-]?[0-9.]+(?:\/[0-9.]+)?$/.test(earliest.rawVal) || /asin|acos|atan|sin|cos|tan|sqrt|\+|\-|\*|\//.test(earliest.rawVal))) {
      valStr = numVal.toString();
    }

    // Xóa định nghĩa macro khỏi chuỗi
    result = result.substring(0, earliest.index) + result.substring(earliest.index + earliest.length);

    // Thay thế biến trong phần mã còn lại
    const replaceRegex = new RegExp(`\\\\${earliest.varName}(?![a-zA-Z0-9_])`, "g");
    result = result.replace(replaceRegex, valStr);
  }

  return result;
}

/**
 * Phân tích danh sách giá trị trong \foreach \var in { ... }
 * Hỗ trợ:
 * - Dải số: {0,1,...,2}, {0, 1.1, ..., 5.5}, {1,...,6}, {5,4,...,1}
 * - Danh sách đơn: {A, B, C}
 * - Cặp biến: {A/-90, B/-90, C/90, H/-90}
 */
export function parseForeachList(rawList: string): string[] {
  const clean = rawList.trim();
  if (!clean) return [];

  // Kiểm tra nếu chứa dấu dải số "..." hoặc ".."
  if (clean.includes("..")) {
    const normalized = clean.replace(/,\s*\.{2,3}\s*,?/g, "...").replace(/\.{2,3}\s*,?/g, "...");
    const dotParts = normalized.split("...");
    if (dotParts.length === 2) {
      const leftPart = dotParts[0].trim();
      const rightPart = dotParts[1].trim();

      const leftItems = leftPart.split(",").map((s) => s.trim()).filter(Boolean);
      const endVal = evaluateExpr(rightPart);

      if (leftItems.length === 1) {
        const startVal = evaluateExpr(leftItems[0]);
        const step = endVal >= startVal ? 1 : -1;
        const res: string[] = [];
        if (step > 0) {
          for (let v = startVal; v <= endVal + 0.0001; v += step) {
            res.push(Number(v.toFixed(4)).toString());
          }
        } else {
          for (let v = startVal; v >= endVal - 0.0001; v += step) {
            res.push(Number(v.toFixed(4)).toString());
          }
        }
        return res;
      } else if (leftItems.length >= 2) {
        const startVal = evaluateExpr(leftItems[0]);
        const secondVal = evaluateExpr(leftItems[1]);
        const step = secondVal - startVal !== 0 ? secondVal - startVal : 1;
        const res: string[] = [];
        if (step > 0) {
          for (let v = startVal; v <= endVal + 0.0001; v += step) {
            res.push(Number(v.toFixed(4)).toString());
          }
        } else {
          for (let v = startVal; v >= endVal - 0.0001; v += step) {
            res.push(Number(v.toFixed(4)).toString());
          }
        }
        return res;
      }
    }
  }

  return clean.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Mở rộng vòng lặp \foreach trong TikZ
 * Hỗ trợ:
 * - \foreach \n in {0,1,...,2} { ... }
 * - \foreach \i/\g in {A/-90,B/-90,C/90,H/-90} \fill...;
 */
export function expandTikzForeach(code: string): string {
  let result = code;
  let hasForeach = true;
  let iterations = 0;

  while (hasForeach && iterations < 30) {
    iterations++;
    const matchIdx = result.search(/\\foreach\b/);
    if (matchIdx === -1) {
      hasForeach = false;
      break;
    }

    const sub = result.substring(matchIdx);
    const headerMatch = sub.match(/^\\foreach\s+([\\a-zA-Z0-9_\/,\s]+?)\s+in\s*/);
    if (!headerMatch) {
      break;
    }

    const rawVars = headerMatch[1].trim();
    const listStartIndex = matchIdx + headerMatch[0].length;
    if (result[listStartIndex] !== "{") {
      break;
    }

    const listBrace = extractBalancedBraces(result, listStartIndex);
    if (!listBrace) break;

    const rawList = listBrace.content.trim();
    let bodyStartIndex = listBrace.endIndex + 1;

    // Bỏ qua khoảng trắng
    while (bodyStartIndex < result.length && /\s/.test(result[bodyStartIndex])) {
      bodyStartIndex++;
    }

    let rawBody = "";
    let fullEndIndex = bodyStartIndex;

    if (result[bodyStartIndex] === "{") {
      const bodyBrace = extractBalancedBraces(result, bodyStartIndex);
      if (!bodyBrace) break;
      rawBody = bodyBrace.content;
      fullEndIndex = bodyBrace.endIndex + 1;
    } else {
      // Lấy đến dấu chấm phẩy ;
      const semiIdx = result.indexOf(";", bodyStartIndex);
      if (semiIdx === -1) break;
      rawBody = result.substring(bodyStartIndex, semiIdx + 1);
      fullEndIndex = semiIdx + 1;
    }

    // Phân tích danh sách biến: hỗ trợ \x\y\t, \a\b, \x/\y/\t, \i, \j, \pos, v.v.
    const varMatches = rawVars.match(/\\[a-zA-Z0-9_]+|[a-zA-Z0-9_]+/g);
    const varNames = varMatches
      ? varMatches.map((v) => v.replace(/^\\/, "").trim()).filter(Boolean)
      : [];

    // Phân tích danh sách giá trị lặp
    const items = parseForeachList(rawList);

    let expandedText = "";
    for (const item of items) {
      let currentBody = rawBody;
      const subVals = item.split("/").map((s) => s.trim());

      for (let i = 0; i < varNames.length; i++) {
        const vName = varNames[i];
        const vVal = subVals[i] !== undefined ? subVals[i] : subVals[0];

        // Thay thế macro \vName (ví dụ \x, \y, \t, \a, \b)
        const regexVar = new RegExp(`\\\\${vName}(?![a-zA-Z0-9_])`, "g");
        currentBody = currentBody.replace(regexVar, vVal);

        // Thay thế cả trường hợp trong dấu ngoặc ${\x}$ hoặc $\x$
        const regexVarMath = new RegExp(`\\$?\\{\\\\${vName}\\}\\$?|\\$?\\\\${vName}\\$?(?![a-zA-Z0-9_])`, "g");
        currentBody = currentBody.replace(regexVarMath, vVal);

        // Thay thế dạng (\vName) hoặc (vName)
        currentBody = currentBody.replace(new RegExp(`\\(\\\\?${vName}\\)`, "g"), `(${vVal})`);
      }

      // Đảm bảo lệnh kết thúc bằng dấu chấm phẩy nếu cần
      currentBody = currentBody.trim();
      if (currentBody && !currentBody.endsWith(";")) {
        currentBody += ";";
      }

      expandedText += "\n" + currentBody + "\n";
    }

    result = result.substring(0, matchIdx) + expandedText + result.substring(fullEndIndex);
  }

  return result;
}

/**
 * Hàm làm sạch dấu $, \$, và dấu ngoặc tròn ngoài cùng
 */
export function cleanCoordStr(rawStr: string): string {
  let s = rawStr.trim();
  let changed = true;
  while (changed) {
    changed = false;
    s = s.trim();
    if (s.startsWith("$") || s.startsWith("\\$")) {
      s = s.replace(/^(\\\$|\$)+/, "").trim();
      changed = true;
    }
    if (s.endsWith("$") || s.endsWith("\\$")) {
      s = s.replace(/(\\\$|\$)+$/, "").trim();
      changed = true;
    }
    if (s.startsWith("++")) {
      s = s.substring(2).trim();
      changed = true;
    } else if (s.startsWith("+")) {
      s = s.substring(1).trim();
      changed = true;
    }
    if (s.startsWith("(") && s.endsWith(")")) {
      const bal = extractBalancedParens(s, 0);
      if (bal && bal.endIndex === s.length - 1) {
        s = bal.content.trim();
        changed = true;
      }
    }
  }
  return s;
}

/**
 * Trích xuất độ dịch chuyển shift={(...)}, xshift=..., yshift=... từ chuỗi tùy chọn options của node
 */
export function parseNodeShift(optStr: string, coordsMap?: Map<string, Point2D>): { dx: number; dy: number; hasExplicitShift: boolean } {
  let dx = 0;
  let dy = 0;
  let hasExplicitShift = false;

  if (!optStr) return { dx: 0, dy: 0, hasExplicitShift: false };

  // 1. xshift
  const xshiftM = optStr.match(/xshift\s*=\s*\{?([^,\]}]+)\}?/i);
  if (xshiftM) {
    dx += evaluateExpr(xshiftM[1]);
    hasExplicitShift = true;
  }

  // 2. yshift
  const yshiftM = optStr.match(/yshift\s*=\s*\{?([^,\]}]+)\}?/i);
  if (yshiftM) {
    dy += evaluateExpr(yshiftM[1]);
    hasExplicitShift = true;
  }

  // 3. shift={...} hoặc shift=(...)
  const shiftM = optStr.match(/shift\s*=\s*\{?\s*\(([^)]+)\)\s*\}?/i) || optStr.match(/shift\s*=\s*\{([^}]+)\}/i);
  if (shiftM) {
    hasExplicitShift = true;
    const inner = shiftM[1].trim().replace(/^\(|\)$/g, "").trim();
    if (inner.includes(":") && !inner.includes("$")) {
      // Tọa độ cực (angle : dist)
      const parts = inner.split(":");
      if (parts.length === 2) {
        const angleDeg = evaluateExpr(parts[0]);
        const dist = evaluateExpr(parts[1]);
        if (!isNaN(angleDeg) && !isNaN(dist)) {
          const rad = (angleDeg * Math.PI) / 180;
          dx += dist * Math.cos(rad);
          dy += dist * Math.sin(rad);
        }
      }
    } else if (inner.includes(",")) {
      // Tọa độ Descartes (dx, dy)
      const parts = inner.split(",");
      if (parts.length === 2) {
        dx += evaluateExpr(parts[0]);
        dy += evaluateExpr(parts[1]);
      }
    } else if (coordsMap && coordsMap.has(inner)) {
      const pt = coordsMap.get(inner)!;
      dx += pt.x;
      dy += pt.y;
    }
  }

  return { dx, dy, hasExplicitShift };
}

/**
 * Parse tọa độ dạng (x,y), (x,y,z), (axis cs:x,y), (rel axis cs:rx,ry), (angle:radius), ($(A)!0.5!(B)$), ($(B)+(E)-(A)$), ($(O)+(0,5)$)...
 */
export function parseCoordinateValue(coordStr: string, coordsMap: Map<string, Point2D>): Point2D | null {
  if (!coordStr) return null;
  let str = cleanCoordStr(coordStr);
  if (!str) return null;

  // 0. Xử lý hệ tọa độ PGFPlots & Scientific Visualization
  if (/^current\s+axis\.origin$/i.test(str) || /^current\s+axis\.center$/i.test(str)) {
    return { x: 0, y: 0 };
  }
  if (/^current\s+axis\.left\s+of\s+origin$/i.test(str)) {
    const minX = coordsMap.get("__axis_min_x")?.x ?? -5;
    return { x: minX, y: 0 };
  }
  if (/^current\s+axis\.right\s+of\s+origin$/i.test(str)) {
    const maxX = coordsMap.get("__axis_max_x")?.x ?? 5;
    return { x: maxX, y: 0 };
  }
  if (/^current\s+axis\.above\s+origin$/i.test(str)) {
    const maxY = coordsMap.get("__axis_max_y")?.y ?? 5;
    return { x: 0, y: maxY };
  }
  if (/^current\s+axis\.below\s+origin$/i.test(str)) {
    const minY = coordsMap.get("__axis_min_y")?.y ?? -5;
    return { x: 0, y: minY };
  }

  // Tọa độ tương đối rel axis cs: rx, ry (0 -> 1)
  if (/^(?:rel\s+axis\s+cs|axis\s+description\s+cs)\s*:/i.test(str)) {
    const cleanInner = str.replace(/^(?:rel\s+axis\s+cs|axis\s+description\s+cs)\s*:/i, "").trim();
    const rParts = cleanInner.split(",").map((s) => evaluateExpr(s));
    if (rParts.length >= 2) {
      const rx = rParts[0];
      const ry = rParts[1];
      const minX = coordsMap.get("__axis_min_x")?.x ?? -5;
      const maxX = coordsMap.get("__axis_max_x")?.x ?? 5;
      const minY = coordsMap.get("__axis_min_y")?.y ?? -5;
      const maxY = coordsMap.get("__axis_max_y")?.y ?? 5;
      return {
        x: minX + rx * (maxX - minX),
        y: minY + ry * (maxY - minY),
      };
    }
  }

  // Tọa độ dữ liệu trục PGFPlots: axis cs: x, y hoặc axis direction cs: dx, dy
  if (/^axis\s+cs\s*:/i.test(str)) {
    str = str.replace(/^axis\s+cs\s*:/i, "").trim();
  } else if (/^axis\s+direction\s+cs\s*:/i.test(str)) {
    str = str.replace(/^axis\s+direction\s+cs\s*:/i, "").trim();
  }

  // 1. Tên tọa độ đã lưu: A hoặc B hoặc H
  if (coordsMap.has(str)) {
    return { ...coordsMap.get(str)! };
  }

  // 2. Phép toán tỉ lệ / trung điểm dạng (A)!ratio!(B) hoặc (A)!ratio!angle:(B) hoặc (A)!(P)!(B)
  const interpMatch = str.match(/^\(?\s*\(([^)]+)\)\s*!\s*([^!]+)\s*!\s*(?:([^:]+):)?\s*\(([^)]+)\)\s*\)?$/);
  if (interpMatch) {
    const p1 = parseCoordinateValue(interpMatch[1].trim(), coordsMap);
    const ratioStr = interpMatch[2].trim();
    const rotStr = interpMatch[3] ? interpMatch[3].trim() : null;
    const p2Str = interpMatch[4].trim();

    if (p1) {
      // Trường hợp chiếu điểm lên đoạn thẳng: (A)!(P)!(B)
      if (coordsMap.has(ratioStr) && coordsMap.has(p2Str)) {
        const pTarget = coordsMap.get(ratioStr)!;
        const p2 = coordsMap.get(p2Str)!;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 0) {
          const u = ((pTarget.x - p1.x) * dx + (pTarget.y - p1.y) * dy) / lenSq;
          return { x: p1.x + u * dx, y: p1.y + u * dy };
        }
      }

      const ratio = evaluateExpr(ratioStr);
      const p2 = parseCoordinateValue(p2Str, coordsMap);
      if (p2) {
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        if (rotStr) {
          const rotDeg = evaluateExpr(rotStr);
          const rad = (rotDeg * Math.PI) / 180;
          const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
          const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
          dx = rx;
          dy = ry;
        }
        return {
          x: p1.x + dx * ratio,
          y: p1.y + dy * ratio,
        };
      }
    }
  }

  // 3. Phép toán vector nhiều phần tử dạng $(B)+(E)-(A)$ hoặc $(O)+(0,5)$ hoặc $(A)-(0.8,-0.5)$
  const termRegex = /([+-]?)\s*(?:([0-9.]+|Math\.[a-zA-Z0-9_()]+)\s*\*)?\s*\(([^)]+)\)/g;
  const terms: { sign: number; factor: number; inner: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = termRegex.exec(str)) !== null) {
    const signStr = m[1].trim();
    const sign = signStr === "-" ? -1 : 1;
    const factor = m[2] ? evaluateExpr(m[2]) : 1.0;
    terms.push({ sign, factor, inner: m[3].trim() });
  }

  if (terms.length >= 2) {
    let sumX = 0;
    let sumY = 0;
    let valid = true;
    for (const term of terms) {
      const pt = parseCoordinateValue(`(${term.inner})`, coordsMap);
      if (!pt) {
        valid = false;
        break;
      }
      sumX += term.sign * term.factor * pt.x;
      sumY += term.sign * term.factor * pt.y;
    }
    if (valid) return { x: sumX, y: sumY };
  }

  // 4. Phép chiếu trực giao (A |- B) hoặc (A -| B)
  if (str.includes("|-")) {
    const [p1Name, p2Name] = str.split("|-").map((s) => s.trim().replace(/^\(|\)$/g, ""));
    const p1 = coordsMap.get(p1Name);
    const p2 = coordsMap.get(p2Name);
    if (p1 && p2) return { x: p1.x, y: p2.y };
  }
  if (str.includes("-|")) {
    const [p1Name, p2Name] = str.split("-|").map((s) => s.trim().replace(/^\(|\)$/g, ""));
    const p1 = coordsMap.get(p1Name);
    const p2 = coordsMap.get(p2Name);
    if (p1 && p2) return { x: p2.x, y: p1.y };
  }

  // 5. Tọa độ cực hoặc tọa độ trụ/cầu 3D: (angle:radius) hoặc (angle:radius:z) hoặc (-90:4mm)
  if (str.includes(":") && !str.includes("$")) {
    const parts = str.split(":");
    if (parts.length === 3) {
      const angleDeg = evaluateExpr(parts[0]);
      const r = evaluateExpr(parts[1]);
      const z = evaluateExpr(parts[2]);
      if (!isNaN(angleDeg) && !isNaN(r) && !isNaN(z)) {
        const rad = (angleDeg * Math.PI) / 180;
        const x3d = r * Math.cos(rad);
        const y3d = r * Math.sin(rad);
        const z3d = z;
        const bx = coordsMap.get("__basis_x") || { x: -0.35, y: -0.35 };
        const by = coordsMap.get("__basis_y") || { x: 1.0, y: 0.0 };
        const bz = coordsMap.get("__basis_z") || { x: 0.0, y: 1.0 };
        return {
          x: x3d * bx.x + y3d * by.x + z3d * bz.x,
          y: x3d * bx.y + y3d * by.y + z3d * bz.y,
        };
      }
    } else if (parts.length === 2 && !str.includes(",")) {
      const angleDeg = evaluateExpr(parts[0]);
      const r = evaluateExpr(parts[1]);
      if (!isNaN(angleDeg) && !isNaN(r)) {
        const canvasPlane = coordsMap.get("__canvas_plane") as any;
        if (canvasPlane) {
          const rad = (angleDeg * Math.PI) / 180;
          const u = r * Math.cos(rad);
          const v = r * Math.sin(rad);
          let x3d = u,
            y3d = v,
            z3d = canvasPlane.val ?? 0;
          if (canvasPlane.type === "xz" || canvasPlane.type === "zx") {
            x3d = u;
            y3d = canvasPlane.val ?? 0;
            z3d = v;
          } else if (canvasPlane.type === "yz" || canvasPlane.type === "zy") {
            x3d = canvasPlane.val ?? 0;
            y3d = u;
            z3d = v;
          }
          const bx = coordsMap.get("__basis_x") || { x: -0.35, y: -0.35 };
          const by = coordsMap.get("__basis_y") || { x: 1.0, y: 0.0 };
          const bz = coordsMap.get("__basis_z") || { x: 0.0, y: 1.0 };
          return {
            x: x3d * bx.x + y3d * by.x + z3d * bz.x,
            y: x3d * bx.y + y3d * by.y + z3d * bz.y,
          };
        }

        const rad = (angleDeg * Math.PI) / 180;
        return {
          x: r * Math.cos(rad),
          y: r * Math.sin(rad),
        };
      }
    }
  }

  // 6. Tọa độ Descartes: (x, y) hoặc (x, y, z)
  const parts = str.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    if (parts.length === 3) {
      const x3d = evaluateExpr(parts[0]);
      const y3d = evaluateExpr(parts[1]);
      const z3d = evaluateExpr(parts[2]);
      const bx = coordsMap.get("__basis_x") || { x: -0.35, y: -0.35 };
      const by = coordsMap.get("__basis_y") || { x: 1.0, y: 0.0 };
      const bz = coordsMap.get("__basis_z") || { x: 0.0, y: 1.0 };
      return {
        x: x3d * bx.x + y3d * by.x + z3d * bz.x,
        y: x3d * bx.y + y3d * by.y + z3d * bz.y,
      };
    }

    const u = evaluateExpr(parts[0]);
    const v = evaluateExpr(parts[1]);
    if (!isNaN(u) && !isNaN(v)) {
      const canvasPlane = coordsMap.get("__canvas_plane") as any;
      if (canvasPlane) {
        let x3d = u,
          y3d = v,
          z3d = canvasPlane.val ?? 0;
        if (canvasPlane.type === "xz" || canvasPlane.type === "zx") {
          x3d = u;
          y3d = canvasPlane.val ?? 0;
          z3d = v;
        } else if (canvasPlane.type === "yz" || canvasPlane.type === "zy") {
          x3d = canvasPlane.val ?? 0;
          y3d = u;
          z3d = v;
        }
        const bx = coordsMap.get("__basis_x") || { x: -0.35, y: -0.35 };
        const by = coordsMap.get("__basis_y") || { x: 1.0, y: 0.0 };
        const bz = coordsMap.get("__basis_z") || { x: 0.0, y: 1.0 };
        return {
          x: x3d * bx.x + y3d * by.x + z3d * bz.x,
          y: x3d * bx.y + y3d * by.y + z3d * bz.y,
        };
      }

      return {
        x: u,
        y: v,
      };
    }
  }

  return null;
}

export interface CoordToken {
  raw: string;
  full: string;
  startIndex: number;
  endIndex: number;
  isCircleRadius: boolean;
  pt: Point2D | null;
}

export interface TikzDot {
  name: string;
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
  radius?: number;
}

/**
 * Trích xuất toàn bộ các khối tọa độ (...) trong chuỗi lệnh, tự động nhận diện
 * các biểu thức tọa độ phức tạp, lồng nhau (như ($(B)+(90:3mm)$) hoặc ($(D)+(C)-(B)$))
 * và phân biệt với bán kính hình tròn circle (1.5pt)
 */
export function extractCoordinateTokens(text: string, coordsMap: Map<string, Point2D>): CoordToken[] {
  const tokens: CoordToken[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "(") {
      const bal = extractBalancedParens(text, i);
      if (bal) {
        const full = text.substring(i, bal.endIndex + 1);
        const raw = bal.content.trim();

        // Kiểm tra xem phía trước dấu ( có phải là lệnh circle hay không
        const prefix = text.substring(0, i).trim();
        const isCircleRadius = /circle\s*(?:\[[^\]]*\])?$/i.test(prefix);

        let pt: Point2D | null = null;
        if (!isCircleRadius) {
          pt = parseCoordinateValue(raw, coordsMap);
        }

        tokens.push({
          raw,
          full,
          startIndex: i,
          endIndex: bal.endIndex,
          isCircleRadius,
          pt,
        });

        i = bal.endIndex + 1;
        continue;
      }
    }
    i++;
  }
  return tokens;
}

/**
 * Giải mã thông số cung elip / đường tròn (arc) trong TikZ
 * Cú pháp hỗ trợ:
 * - arc (startAngle : endAngle : radius)
 * - arc (startAngle : endAngle : rx and ry)
 * - arc [start angle=..., end angle=..., radius=...]
 * - arc [start angle=..., end angle=..., x radius=..., y radius=...]
 */
export function generateTikzArcPoints(
  arcSpec: string,
  startPt: Point2D,
  coordsMap?: Map<string, Point2D>,
  rawStart2DPt?: Point2D
): { points: Point2D[]; endPt: Point2D } | null {
  let startAngle = 0;
  let endAngle = 0;
  let rx = 1.0;
  let ry = 1.0;

  const bracketMatch = arcSpec.match(/^\[([^\]]*)\]/);
  if (bracketMatch) {
    const optStr = bracketMatch[1];
    const saMatch = optStr.match(/start\s*angle\s*=\s*([^,\]]+)/i);
    const eaMatch = optStr.match(/end\s*angle\s*=\s*([^,\]]+)/i);
    const rMatch = optStr.match(/(?:^|[, ])radius\s*=\s*([^,\]]+)/i);
    const rxMatch = optStr.match(/x\s*radius\s*=\s*([^,\]]+)/i);
    const ryMatch = optStr.match(/y\s*radius\s*=\s*([^,\]]+)/i);

    if (saMatch) startAngle = evaluateExpr(saMatch[1]);
    if (eaMatch) endAngle = evaluateExpr(eaMatch[1]);
    if (rMatch) {
      rx = parseTikzDimension(rMatch[1], 1.0);
      ry = rx;
    }
    if (rxMatch) rx = parseTikzDimension(rxMatch[1], rx);
    if (ryMatch) ry = parseTikzDimension(ryMatch[1], ry);
  } else {
    // Dạng ngoặc tròn: (startAngle : endAngle : rx and ry) hoặc (startAngle : endAngle : r)
    let content = arcSpec.trim();
    if (content.startsWith("(") && content.endsWith(")")) {
      content = content.substring(1, content.length - 1).trim();
    } else {
      const parenMatch = arcSpec.match(/^\(([\s\S]+)\)$/);
      if (parenMatch) {
        content = parenMatch[1].trim();
      } else {
        return null;
      }
    }

    // Phân tách dấu 2 chấm `:` ở cấp ngoài cùng
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      if (ch === "(" || ch === "{" || ch === "[") depth++;
      else if (ch === ")" || ch === "}" || ch === "]") depth--;

      if (ch === ":" && depth === 0) {
        parts.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) {
      parts.push(current.trim());
    }

    if (parts.length >= 3) {
      startAngle = evaluateExpr(parts[0]);
      endAngle = evaluateExpr(parts[1]);
      const radStr = parts[2].trim();
      if (radStr.includes("and")) {
        const [rxStr, ryStr] = radStr.split("and").map((s) => s.trim());
        rx = parseTikzDimension(rxStr, 1.0);
        ry = parseTikzDimension(ryStr, 1.0);
      } else {
        rx = parseTikzDimension(radStr, 1.0);
        ry = rx;
      }
    } else if (parts.length === 2) {
      startAngle = evaluateExpr(parts[0]);
      endAngle = evaluateExpr(parts[1]);
    } else {
      return null;
    }
  }

  if (isNaN(rx) || rx <= 0) rx = 1.0;
  if (isNaN(ry) || ry <= 0) ry = 1.0;

  const canvasPlane = coordsMap?.get("__canvas_plane") as any;
  if (canvasPlane) {
    const bx = coordsMap?.get("__basis_x") || { x: -0.35, y: -0.35 };
    const by = coordsMap?.get("__basis_y") || { x: 1.0, y: 0.0 };
    const bz = coordsMap?.get("__basis_z") || { x: 0.0, y: 1.0 };

    const startRad = (startAngle * Math.PI) / 180;
    const rawU = rawStart2DPt ? rawStart2DPt.x : rx * Math.cos(startRad);
    const rawV = rawStart2DPt ? rawStart2DPt.y : ry * Math.sin(startRad);
    const cu = rawU - rx * Math.cos(startRad);
    const cv = rawV - ry * Math.sin(startRad);

    const samples = 48;
    const pts: Point2D[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const curAngle = startAngle + t * (endAngle - startAngle);
      const curRad = (curAngle * Math.PI) / 180;
      const u = cu + rx * Math.cos(curRad);
      const v = cv + ry * Math.sin(curRad);
      let x3d = u,
        y3d = v,
        z3d = canvasPlane.val ?? 0;
      if (canvasPlane.type === "xz" || canvasPlane.type === "zx") {
        x3d = u;
        y3d = canvasPlane.val ?? 0;
        z3d = v;
      } else if (canvasPlane.type === "yz" || canvasPlane.type === "zy") {
        x3d = canvasPlane.val ?? 0;
        y3d = u;
        z3d = v;
      }
      pts.push({
        x: x3d * bx.x + y3d * by.x + z3d * bz.x,
        y: x3d * bx.y + y3d * by.y + z3d * bz.y,
      });
    }

    const endRad = (endAngle * Math.PI) / 180;
    const endU = cu + rx * Math.cos(endRad);
    const endV = cv + ry * Math.sin(endRad);
    let endX3d = endU,
      endY3d = endV,
      endZ3d = canvasPlane.val ?? 0;
    if (canvasPlane.type === "xz" || canvasPlane.type === "zx") {
      endX3d = endU;
      endY3d = canvasPlane.val ?? 0;
      endZ3d = endV;
    } else if (canvasPlane.type === "yz" || canvasPlane.type === "zy") {
      endX3d = canvasPlane.val ?? 0;
      endY3d = endU;
      endZ3d = endV;
    }
    const endPt: Point2D = {
      x: endX3d * bx.x + endY3d * by.x + endZ3d * bz.x,
      y: endX3d * bx.y + endY3d * by.y + endZ3d * bz.y,
    };

    return { points: pts, endPt };
  }

  // Tính tâm elip từ startPt và startAngle
  const startRad = (startAngle * Math.PI) / 180;
  const cx = startPt.x - rx * Math.cos(startRad);
  const cy = startPt.y - ry * Math.sin(startRad);

  const samples = 36;
  const pts: Point2D[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const curAngle = startAngle + t * (endAngle - startAngle);
    const curRad = (curAngle * Math.PI) / 180;
    pts.push({
      x: cx + rx * Math.cos(curRad),
      y: cy + ry * Math.sin(curRad),
    });
  }

  const endRad = (endAngle * Math.PI) / 180;
  const endPt: Point2D = {
    x: cx + rx * Math.cos(endRad),
    y: cy + ry * Math.sin(endRad),
  };

  return { points: pts, endPt };
}

/**
 * Phân tích thân lệnh \draw, \fill, \filldraw thành các phân đoạn (subpaths)
 * Hỗ trợ liền mạch:
 * - Đoạn thẳng nối -- hoặc to
 * - Cung tròn / elip arc (...) hoặc arc [...]
 * - Chu trình khép kín -- cycle
 * - Tọa độ tương đối ++(...) và +(...)
 * - Đa phân đoạn (subpaths) trong cùng một lệnh
 */
export function parseDrawSubpaths(
  drawBody: string,
  coordsMap: Map<string, Point2D>
): { points: Point2D[]; isCycle: boolean }[] {
  const result: { points: Point2D[]; isCycle: boolean }[] = [];
  const cleaned = stripNodesAndPics(drawBody).trim();

  let cursor = 0;
  let currentSubpathPts: Point2D[] = [];
  let currentPt: Point2D | null = null;
  let rawCurrent2DPt: Point2D | null = null;
  let isCycle = false;

  const flushSubpath = () => {
    if (currentSubpathPts.length >= 2 || (currentSubpathPts.length === 1 && isCycle)) {
      result.push({
        points: [...currentSubpathPts],
        isCycle,
      });
    }
    currentSubpathPts = [];
    isCycle = false;
  };

  while (cursor < cleaned.length) {
    while (cursor < cleaned.length && /\s/.test(cleaned[cursor])) cursor++;
    if (cursor >= cleaned.length) break;

    const rest = cleaned.substring(cursor);

    // 1. Kiểm tra cycle
    const cycleMatch = rest.match(/^cycle\b/i);
    if (cycleMatch) {
      isCycle = true;
      cursor += cycleMatch[0].length;
      flushSubpath();
      currentPt = null;
      rawCurrent2DPt = null;
      continue;
    }

    // 2. Kiểm tra toán tử nối: -- hoặc to
    const opMatch = rest.match(/^(?:--|to\b)/);
    if (opMatch) {
      cursor += opMatch[0].length;
      continue;
    }

    // 3. Kiểm tra arc: arc (start:end:rad) hoặc arc [start angle=..., end angle=...]
    const arcMatch = rest.match(/^arc\b/i);
    if (arcMatch) {
      cursor += arcMatch[0].length;
      while (cursor < cleaned.length && /\s/.test(cleaned[cursor])) cursor++;

      let arcSpec = "";
      if (cleaned[cursor] === "(") {
        const bal = extractBalancedParens(cleaned, cursor);
        if (bal) {
          arcSpec = `(${bal.content})`;
          cursor = bal.endIndex + 1;
        }
      } else if (cleaned[cursor] === "[") {
        const closeIdx = cleaned.indexOf("]", cursor);
        if (closeIdx !== -1) {
          arcSpec = cleaned.substring(cursor, closeIdx + 1);
          cursor = closeIdx + 1;
        }
      }

      if (arcSpec && currentPt) {
        const arcResult = generateTikzArcPoints(arcSpec, currentPt, coordsMap, rawCurrent2DPt || undefined);
        if (arcResult) {
          for (let k = 1; k < arcResult.points.length; k++) {
            currentSubpathPts.push(arcResult.points[k]);
          }
          currentPt = arcResult.endPt;
        }
      }
      continue;
    }

    // 3.1. Kiểm tra rectangle: rectangle (P2) hoặc rectangle +(dx,dy) hoặc rectangle ++(dx,dy)
    const rectMatch = rest.match(/^rectangle\b/i);
    if (rectMatch) {
      cursor += rectMatch[0].length;
      while (cursor < cleaned.length && /\s/.test(cleaned[cursor])) cursor++;

      let p2: Point2D | null = null;
      let isAccum = false;
      const relM = cleaned.substring(cursor).match(/^(\+{1,2})\s*\(/);
      if (relM) {
        isAccum = relM[1] === "++";
        const parenStart = cursor + relM[0].length - 1;
        const bal = extractBalancedParens(cleaned, parenStart);
        if (bal) {
          cursor = bal.endIndex + 1;
          const delta = parseCoordinateValue(bal.content, coordsMap);
          if (delta && currentPt) {
            p2 = { x: currentPt.x + delta.x, y: currentPt.y + delta.y };
          }
        }
      } else if (cleaned[cursor] === "(") {
        const bal = extractBalancedParens(cleaned, cursor);
        if (bal) {
          cursor = bal.endIndex + 1;
          p2 = parseCoordinateValue(bal.content, coordsMap);
        }
      }

      if (currentPt && p2) {
        const p1 = currentPt;
        result.push({
          points: [
            { x: p1.x, y: p1.y },
            { x: p2.x, y: p1.y },
            { x: p2.x, y: p2.y },
            { x: p1.x, y: p2.y },
          ],
          isCycle: true,
        });
        currentSubpathPts = [];
        currentPt = p2;
      }
      continue;
    }

    // 4. Kiểm tra toạ độ tương đối ++(...) hoặc +(...)
    const relMatch = rest.match(/^(\+{1,2})\s*\(/);
    if (relMatch) {
      const isAccum = relMatch[1] === "++";
      const parenStart = cursor + relMatch[0].length - 1;
      const bal = extractBalancedParens(cleaned, parenStart);
      if (bal) {
        const beforeRel = cleaned.substring(0, cursor).trim();
        const hasConnectorBeforeRel = beforeRel.endsWith("--") || beforeRel.endsWith("to");
        cursor = bal.endIndex + 1;
        const delta = parseCoordinateValue(bal.content, coordsMap);
        if (delta) {
          const newPt: Point2D = currentPt
            ? { x: currentPt.x + delta.x, y: currentPt.y + delta.y }
            : delta;
          if (isAccum) {
            currentPt = newPt;
          }
          if (!hasConnectorBeforeRel && currentSubpathPts.length > 0) {
            flushSubpath();
          }
          currentSubpathPts.push(newPt);
        }
      } else {
        cursor++;
      }
      continue;
    }

    // 5. Kiểm tra toạ độ tuyệt đối (...)
    if (cleaned[cursor] === "(") {
      const bal = extractBalancedParens(cleaned, cursor);
      if (bal) {
        const coordContent = bal.content.trim();
        cursor = bal.endIndex + 1;

        // Nếu phía trước không có toán tử nối '--' và đã có điểm trong currentSubpathPts,
        // thì đây là bắt đầu của một subpath mới độc lập
        const beforeCoord = cleaned.substring(0, bal.endIndex - bal.content.length - 1).trim();
        const hasExplicitConnector = beforeCoord.endsWith("--") || beforeCoord.endsWith("to");

        if (!hasExplicitConnector && currentSubpathPts.length > 0) {
          flushSubpath();
        }

        // Lưu tọa độ thô 2D nếu là dạng cực hoặc Descartes 2 thành phần
        if (coordContent.includes(":") && !coordContent.includes("$")) {
          const cParts = coordContent.split(":");
          if (cParts.length === 2) {
            const aDeg = evaluateExpr(cParts[0]);
            const rVal = evaluateExpr(cParts[1]);
            if (!isNaN(aDeg) && !isNaN(rVal)) {
              const rRad = (aDeg * Math.PI) / 180;
              rawCurrent2DPt = { x: rVal * Math.cos(rRad), y: rVal * Math.sin(rRad) };
            }
          }
        } else if (coordContent.includes(",") && coordContent.split(",").length === 2) {
          const cParts = coordContent.split(",").map((s) => evaluateExpr(s));
          if (!isNaN(cParts[0]) && !isNaN(cParts[1])) {
            rawCurrent2DPt = { x: cParts[0], y: cParts[1] };
          }
        }

        const pt = parseCoordinateValue(coordContent, coordsMap);
        if (pt) {
          currentPt = pt;
          currentSubpathPts.push(pt);
        }
      } else {
        cursor++;
      }
      continue;
    }

    cursor++;
  }

  flushSubpath();
  return result;
}

/**
 * Loại bỏ các khối node[...] {...} và pic[...] {...} lồng nhau ra khỏi chuỗi lệnh TikZ
 */
export function stripNodesAndPics(cmd: string): string {
  let result = "";
  let i = 0;
  while (i < cmd.length) {
    const sub = cmd.substring(i);
    const nodePicMatch = sub.match(/^(?:\\?node|\\?pic)\b/i);
    if (nodePicMatch) {
      let cursor = i + nodePicMatch[0].length;
      let loop = true;
      while (loop && cursor < cmd.length) {
        while (cursor < cmd.length && /\s/.test(cmd[cursor])) cursor++;
        if (cmd[cursor] === "[") {
          const bal = extractBalancedBrackets(cmd, cursor);
          if (bal) {
            cursor = bal.endIndex + 1;
            continue;
          }
        }
        if (cmd[cursor] === "(") {
          const bal = extractBalancedParens(cmd, cursor);
          if (bal) {
            cursor = bal.endIndex + 1;
            continue;
          }
        }
        const atMatch = cmd.substring(cursor).match(/^at\s*/i);
        if (atMatch) {
          cursor += atMatch[0].length;
          continue;
        }
        loop = false;
      }
      while (cursor < cmd.length && /\s/.test(cmd[cursor])) cursor++;
      if (cmd[cursor] === "{") {
        const bal = extractBalancedBraces(cmd, cursor);
        if (bal) {
          i = bal.endIndex + 1;
          continue;
        }
      }
      i = cursor;
      continue;
    }
    result += cmd[i];
    i++;
  }
  return result;
}

/**
 * Phẳng hóa các khối \begin{scope}[...] ... \end{scope} trong TikZ
 * Kế thừa toàn bộ options của scope vào từng lệnh con bên trong
 */
export function flattenTikzScopes(code: string): string {
  let result = "";
  let cursor = 0;
  const scopeStack: string[] = [];

  while (cursor < code.length) {
    const rest = code.substring(cursor);
    const beginScopeMatch = rest.match(/^\\begin\{scope\}(?:\s*\[([^\]]*)\])?/i);
    if (beginScopeMatch) {
      const scopeOpts = (beginScopeMatch[1] || "").trim();
      scopeStack.push(scopeOpts);
      cursor += beginScopeMatch[0].length;
      continue;
    }

    const endScopeMatch = rest.match(/^\\end\{scope\}/i);
    if (endScopeMatch) {
      scopeStack.pop();
      cursor += endScopeMatch[0].length;
      continue;
    }

    const semiIdx = rest.indexOf(";");
    if (semiIdx !== -1) {
      let cmd = rest.substring(0, semiIdx + 1);
      if (scopeStack.length > 0) {
        const combinedScopeOpts = scopeStack.filter(Boolean).join(", ");
        if (combinedScopeOpts) {
          const cmdMatch = cmd.match(/^(\\(?:draw|fill|filldraw|path|node|coordinate|pic|clip|addplot3?|shade))(?:\s*\[([^\]]*)\])?/i);
          if (cmdMatch) {
            const verb = cmdMatch[1];
            const existingOpts = cmdMatch[2] ? cmdMatch[2].trim() : "";
            const mergedOpts = existingOpts ? `${combinedScopeOpts}, ${existingOpts}` : combinedScopeOpts;
            cmd = `${verb}[${mergedOpts}]` + cmd.substring(cmdMatch[0].length);
          }
        }
      }
      result += cmd;
      cursor += semiIdx + 1;
    } else {
      result += rest;
      break;
    }
  }

  return result;
}

/**
 * Trích xuất nhãn LaTeX và render qua KaTeX một cách an toàn
 */
export function renderLatexLabel(rawLabel: string): string {
  let label = rawLabel.trim();
  if (!label) return "";

  // Bỏ các lệnh chỉ định kích cỡ chữ LaTeX: \footnotesize, \small, \scriptsize, \tiny, \large, \Large, v.v.
  label = label.replace(/\\(?:footnotesize|scriptsize|tiny|small|normalsize|large|Large|LARGE|huge|Huge)\b/g, "").trim();

  // Xử lý các dạng như $30$m, $30$ m, 30m, 54^\circ, $54^\circ$
  label = label.replace(/\$([0-9.]+)\$\s*([a-zA-Z]+)/g, "$1\\text{ $2}");
  label = label.replace(/^([0-9.]+)\s*([a-zA-Z]+)$/g, "$1\\text{ $2}");

  // Chuẩn hóa định dạng góc: \widehat{BAC}, 56^\circ, 27\text{ m}, ...
  label = label.replace(/\\ang\{([^}]+)\}/g, "$1^\\circ");
  label = label.replace(/(\d+)\s*độ/gi, "$1^\\circ");
  label = label.replace(/\\text\{([^}]+)\}/g, "\\mathrm{$1}");
  label = label.replace(/\\mathrm\{([^}]+)\}/g, "\\text{$1}");

  let mathContent = label;
  if (mathContent.startsWith("$") && mathContent.endsWith("$")) {
    mathContent = mathContent.substring(1, mathContent.length - 1).trim();
  } else if (mathContent.startsWith("$$") && mathContent.endsWith("$$")) {
    mathContent = mathContent.substring(2, mathContent.length - 2).trim();
  } else if (mathContent.includes("$")) {
    // Chỉ loại bỏ dấu $ phân cách, giữ nguyên toàn bộ mã toán (ví dụ: \vec{F_1})
    mathContent = mathContent.replace(/\$/g, "").trim();
  }

  // Bỏ cặp ngoặc nhọn bao quanh đơn lẻ nếu có {x} -> x
  if (mathContent.startsWith("{") && mathContent.endsWith("}") && !mathContent.includes(" ")) {
    mathContent = mathContent.substring(1, mathContent.length - 1).trim();
  }

  try {
    return katex.renderToString(mathContent || label, {
      throwOnError: false,
      displayMode: false,
    });
  } catch {
    return label;
  }
}

/**
 * Chuyển đổi nhãn LaTeX toán học sang đồ họa vector SVG native (<text> + <tspan>)
 * Tương thích 100% với WebKit/Safari iOS trên iPhone & iPad, loại bỏ hoàn toàn lỗi vỡ layout của <foreignObject>
 */
export function formatLatexToSvgText(
  rawLabel: string,
  x: number,
  y: number,
  isBadge: boolean,
  nIdx: number
): string {
  let label = (rawLabel || "").trim();
  if (!label) return "";

  // 1. Loại bỏ các lệnh kích thước font chữ LaTeX
  label = label.replace(/\\(?:footnotesize|scriptsize|tiny|small|normalsize|large|Large|LARGE|huge|Huge)\b/g, "").trim();

  // 2. Chuẩn hóa góc và độ
  label = label.replace(/\\ang\{([^}]+)\}/g, "$1°");
  label = label.replace(/(\d+)\s*độ/gi, "$1°");
  label = label.replace(/\^\{\\circ\}/g, "°");
  label = label.replace(/\^\\circ/g, "°");
  label = label.replace(/\\circ/g, "°");

  // 3. Loại bỏ ký tự bao bọc $ hoặc $$ hoặc \( \)
  if (label.startsWith("$$") && label.endsWith("$$")) {
    label = label.slice(2, -2).trim();
  } else if (label.startsWith("$") && label.endsWith("$")) {
    label = label.slice(1, -1).trim();
  } else if (label.startsWith("\\(") && label.endsWith("\\)")) {
    label = label.slice(2, -2).trim();
  }
  // Loại bỏ các dấu $ còn sót lại bên trong nếu có
  label = label.replace(/\$/g, "");

  // Bỏ cặp ngoặc nhọn bao quanh đơn lẻ nếu có {x} -> x
  if (label.startsWith("{") && label.endsWith("}") && !label.includes(" ")) {
    label = label.slice(1, -1).trim();
  }

  // 4. Thay thế các ký tự Hy Lạp sang Unicode chuẩn
  const greekLetters: Record<string, string> = {
    "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ", "\\Delta": "Δ",
    "\\epsilon": "ε", "\\varepsilon": "ε", "\\zeta": "ζ", "\\eta": "η",
    "\\theta": "θ", "\\vartheta": "θ", "\\iota": "ι", "\\kappa": "κ",
    "\\lambda": "λ", "\\Lambda": "Λ", "\\mu": "μ", "\\nu": "ν",
    "\\xi": "ξ", "\\Xi": "Ξ", "\\pi": "π", "\\Pi": "Π",
    "\\rho": "ρ", "\\varrho": "ρ", "\\sigma": "σ", "\\Sigma": "Σ",
    "\\tau": "τ", "\\upsilon": "υ", "\\phi": "φ", "\\varphi": "φ", "\\Phi": "Φ",
    "\\chi": "χ", "\\psi": "ψ", "\\Psi": "Ψ", "\\omega": "ω", "\\Omega": "Ω",
  };
  for (const [tex, sym] of Object.entries(greekLetters)) {
    label = label.split(tex).join(sym);
  }

  // 5. Thay thế các ký hiệu toán học phổ biến sang Unicode chuẩn
  label = label.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, "$1√$2");
  label = label.replace(/\\sqrt\{([^}]+)\}/g, "√$1");
  label = label.replace(/\\sqrt\s*([0-9a-zA-Z])/g, "√$1");
  label = label.replace(/\\vec\{([a-zA-Z]+)\}/g, "$1⃗");
  label = label.replace(/\\overrightarrow\{([^}]+)\}/g, "$1⃗");
  label = label.replace(/\\widehat\{([^}]+)\}/g, "∠$1");
  label = label.replace(/\\angle\s*([a-zA-Z]+)/g, "∠$1");
  label = label.replace(/\\cdot/g, "·");
  label = label.replace(/\\times/g, "×");
  label = label.replace(/\\pm/g, "±");
  label = label.replace(/\\mp/g, "∓");
  label = label.replace(/\\approx/g, "≈");
  label = label.replace(/\\neq/g, "≠");
  label = label.replace(/\\le(q)?\b/g, "≤");
  label = label.replace(/\\ge(q)?\b/g, "≥");
  label = label.replace(/\\infty/g, "∞");
  label = label.replace(/\\parallel/g, "∥");
  label = label.replace(/\\perp/g, "⟂");
  label = label.replace(/\\in/g, "∈");
  label = label.replace(/\\notin/g, "∉");
  label = label.replace(/\\subset(eq)?\b/g, "⊆");
  label = label.replace(/\\cup/g, "∪");
  label = label.replace(/\\cap/g, "∩");
  label = label.replace(/\\emptyset/g, "∅");
  label = label.replace(/\\pmb\{([^}]+)\}/g, "$1");
  label = label.replace(/\\boldsymbol\{([^}]+)\}/g, "$1");

  // Dấu phẩy trên (Prime)
  label = label.replace(/'{3}/g, "‴");
  label = label.replace(/'{2}/g, "″");
  label = label.replace(/'/g, "′");

  // Chuẩn hóa phân số \frac{a}{b} -> a/b
  label = label.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2");

  // Loại bỏ các lệnh font text
  label = label.replace(/\\(?:text|mathrm|mathbf|mathit|textsf)\{([^}]+)\}/g, " $1");
  label = label.replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\quad/g, "  ").replace(/\\ /g, " ");

  // 6. Xử lý Subscripts (_) và Superscripts (^)
  const subMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
    "a": "ₐ", "e": "ₑ", "h": "ₕ", "i": "ᵢ", "j": "ⱼ", "k": "ₖ", "l": "ₗ", "m": "ₘ", "n": "ₙ", "o": "ₒ", "p": "ₚ", "r": "ᵣ", "s": "ₛ", "t": "ₜ", "u": "ᵤ", "v": "ᵥ", "x": "ₓ",
  };
  const supMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
    "n": "ⁿ", "i": "ⁱ", "x": "ˣ", "y": "ʸ",
  };

  label = label.replace(/\_\{([0-9a-z+-=()]+)\}/g, (_, inner) => {
    if ([...inner].every((c) => subMap[c])) {
      return [...inner].map((c) => subMap[c]).join("");
    }
    return `_${inner}_`;
  });
  label = label.replace(/\_([0-9a-z+-=()])/g, (_, c) => subMap[c] || `_${c}_`);

  label = label.replace(/\^\{([0-9a-z+-=()]+)\}/g, (_, inner) => {
    if ([...inner].every((c) => supMap[c])) {
      return [...inner].map((c) => supMap[c]).join("");
    }
    return `^${inner}^`;
  });
  label = label.replace(/\^([0-9a-z+-=()])/g, (_, c) => supMap[c] || `^${c}^`);

  // 7. Tạo danh sách các tspans cho các phần còn lại
  const tokens: Array<{ text: string; italic: boolean; isSub?: boolean; isSup?: boolean }> = [];
  const parts = label.split(/(_[a-zA-Z0-9]+_|\^[a-zA-Z0-9]+\^)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("_") && part.endsWith("_")) {
      tokens.push({ text: part.slice(1, -1), italic: false, isSub: true });
    } else if (part.startsWith("^") && part.endsWith("^")) {
      tokens.push({ text: part.slice(1, -1), italic: false, isSup: true });
    } else {
      let curr = "";
      let currItalic = false;
      for (const char of part) {
        const isLetter = /[a-zA-Z]/.test(char);
        if (curr === "") {
          curr = char;
          currItalic = isLetter;
        } else if (isLetter === currItalic) {
          curr += char;
        } else {
          tokens.push({ text: curr, italic: currItalic });
          curr = char;
          currItalic = isLetter;
        }
      }
      if (curr) {
        tokens.push({ text: curr, italic: currItalic });
      }
    }
  }

  let tspans = "";
  let approxCharCount = 0;
  for (const t of tokens) {
    approxCharCount += t.text.length;
    if (t.isSub) {
      tspans += `<tspan baseline-shift="sub" font-size="75%" font-style="normal">${t.text}</tspan>`;
    } else if (t.isSup) {
      tspans += `<tspan baseline-shift="super" font-size="75%" font-style="normal">${t.text}</tspan>`;
    } else if (t.italic) {
      tspans += `<tspan font-style="italic">${t.text}</tspan>`;
    } else {
      tspans += `<tspan font-style="normal">${t.text}</tspan>`;
    }
  }

  if (!tspans) {
    tspans = `<tspan font-style="italic">${label}</tspan>`;
    approxCharCount = label.length;
  }

  // 8. Nếu là Badge (nhãn hộp nổi bật cho hàm số, công thức, số đo độ dài)
  if (isBadge) {
    const boxW = Math.max(34, approxCharCount * 8.5 + 16);
    const boxH = 22;
    return `
      <g id="tikz-node-badge-${nIdx}" class="select-none pointer-events-none">
        <rect 
          x="${(x - boxW / 2).toFixed(1)}" 
          y="${(y - boxH / 2).toFixed(1)}" 
          width="${boxW.toFixed(1)}" 
          height="${boxH}" 
          rx="5" 
          ry="5" 
          fill="#ffffff" 
          fill-opacity="0.95" 
          stroke="#cbd5e1" 
          stroke-width="0.9" 
        />
        <text 
          x="${x.toFixed(1)}" 
          y="${y.toFixed(1)}" 
          text-anchor="middle" 
          dominant-baseline="central" 
          style="font-family: 'KaTeX_Math', 'Cambria Math', 'Times New Roman', Times, serif; font-size: 13px; font-weight: 600; fill: #1e293b;"
        >${tspans}</text>
      </g>`;
  }

  // 9. Nhãn điểm vector thông thường (Đỉnh A, B, C, S, gốc O, trục tọa độ x, y...)
  // Sử dụng viền trắng stroke halo (paint-order: stroke fill) để nhãn không bao giờ bị chìm hoặc che khuất bởi nét vẽ
  return `
    <text 
      id="tikz-node-label-${nIdx}" 
      x="${x.toFixed(1)}" 
      y="${y.toFixed(1)}" 
      text-anchor="middle" 
      dominant-baseline="central" 
      class="select-none pointer-events-none"
      style="font-family: 'KaTeX_Math', 'Cambria Math', 'Times New Roman', Times, serif; font-size: 14.5px; font-weight: 600; fill: #0f172a; paint-order: stroke fill; stroke: #ffffff; stroke-width: 3.5px; stroke-linejoin: round; stroke-linecap: round;"
    >${tspans}</text>`;
}

/**
 * Hàm phân tích và dựng hình từ mã TikZ / tkz-euclide sang SVG vector
 */
export function parseTikzToSvg(rawTikzCode: string): string {
  if (!rawTikzCode) return "";

  // 0. Nếu là bảng biến thiên / bảng xét dấu tkz-tab, phân tích bảng trực tiếp
  if (rawTikzCode.includes("\\tkzTabInit")) {
    const tableHtml = parseTkzTab(rawTikzCode);
    if (tableHtml) return tableHtml;
  }

  // 1. Mở rộng tất cả macro \def, \pgfmathsetmacro, \newcommand
  let preprocessedCode = expandTikzMacros(rawTikzCode);

  // Chuẩn hóa lỗi thiếu dấu \ trước node / ode khi dán văn bản
  preprocessedCode = preprocessedCode.replace(/(?:^|\n|\r|;)\s*ode\s*\[/g, "\n\\node[");
  preprocessedCode = preprocessedCode.replace(/(?:^|\n|\r|;)\s*node\s*\[/g, "\n\\node[");

  // 2. Mở rộng tất cả vòng lặp \foreach trước khi phân tích
  preprocessedCode = expandTikzForeach(preprocessedCode);

  // 3. Chuẩn hóa dòng, loại bỏ chú thích % (trừ \%)
  const cleanCode = expandTikzMacros(
    preprocessedCode
      .split("\n")
      .map((line) => {
        const commentIdx = line.search(/(?<!\\)%/);
        return commentIdx !== -1 ? line.substring(0, commentIdx) : line;
      })
      .join(" ")
  );

  // 3. Lấy scale từ [scale=0.8]
  let globalScale = 1.0;
  const scaleMatch = cleanCode.match(/scale\s*=\s*([0-9.]+)/);
  if (scaleMatch) {
    globalScale = parseFloat(scaleMatch[1]) || 1.0;
  }

  const coordsMap = new Map<string, Point2D>();
  const explicitDots = new Map<string, TikzDot>(); // Chỉ những điểm được \fill hoặc \draw circle mới chấm đen
  const nodes: TikzNode[] = [];
  const paths: TikzPath[] = [];
  const angleMarks: AngleMark[] = [];
  const rectShapes: TikzRectShape[] = [];

  // ==========================================
  // Khởi tạo vector cơ sở không gian 3D (3D Basis Vectors & Projections)
  // Hỗ trợ \tdplotsetmaincoords, 3d view, view={az}{el}, và x={...}, y={...}, z={...}
  // ==========================================
  let basisX: Point2D = { x: -0.35, y: -0.35 };
  let basisY: Point2D = { x: 1.0, y: 0.0 };
  let basisZ: Point2D = { x: 0.0, y: 1.0 };

  // 1. Phân tích \tdplotsetmaincoords{\theta}{\phi}
  const tdplotMatch = cleanCode.match(/\\tdplotsetmaincoords\s*\{([^}]+)\}\s*\{([^}]+)\}/i);
  if (tdplotMatch) {
    const thetaDeg = evaluateExpr(tdplotMatch[1]);
    const phiDeg = evaluateExpr(tdplotMatch[2]);
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const phiRad = (phiDeg * Math.PI) / 180;
    basisX = {
      x: -Math.sin(phiRad),
      y: -Math.cos(thetaRad) * Math.cos(phiRad),
    };
    basisY = {
      x: Math.cos(phiRad),
      y: -Math.cos(thetaRad) * Math.sin(phiRad),
    };
    basisZ = {
      x: 0,
      y: Math.sin(thetaRad),
    };
  }

  // 2. Phân tích 3d view hoặc view={az}{el}
  const viewMatch =
    cleanCode.match(/(?:3d\s+view|view)\s*=\s*\{?\s*([+-]?[0-9.]+)\s*\}?\s*(?:\{|\,)\s*([+-]?[0-9.]+)\s*\}?/i) ||
    cleanCode.match(/(?:3d\s+view|view)\s*=\s*\{?\s*([+-]?[0-9.]+)\s*\}?\s*\{?\s*([+-]?[0-9.]+)\s*\}?/i);
  if (viewMatch) {
    const azDeg = evaluateExpr(viewMatch[1]);
    const elDeg = evaluateExpr(viewMatch[2]);
    const azRad = (azDeg * Math.PI) / 180;
    const elRad = (elDeg * Math.PI) / 180;
    basisX = {
      x: -Math.sin(azRad),
      y: -Math.sin(elRad) * Math.cos(azRad),
    };
    basisY = {
      x: Math.cos(azRad),
      y: -Math.sin(elRad) * Math.sin(azRad),
    };
    basisZ = {
      x: 0,
      y: Math.cos(elRad),
    };
  }

  // 3. Phân tích tùy chọn trục tọa độ x={...}, y={...}, z={...}
  const customXMatch = cleanCode.match(/\bx\s*=\s*\{\s*\(([^)]+)\)\s*\}/);
  if (customXMatch) {
    const p = parseCoordinateValue(`(${customXMatch[1]})`, coordsMap);
    if (p) basisX = p;
  }
  const customYMatch = cleanCode.match(/\by\s*=\s*\{\s*\(([^)]+)\)\s*\}/);
  if (customYMatch) {
    const p = parseCoordinateValue(`(${customYMatch[1]})`, coordsMap);
    if (p) basisY = p;
  }
  const customZMatch = cleanCode.match(/\bz\s*=\s*\{\s*\(([^)]+)\)\s*\}/);
  if (customZMatch) {
    const p = parseCoordinateValue(`(${customZMatch[1]})`, coordsMap);
    if (p) basisZ = p;
  }

  coordsMap.set("__basis_x", basisX);
  coordsMap.set("__basis_y", basisY);
  coordsMap.set("__basis_z", basisZ);

  // ==========================================
  // A. PARSER CHO BỘ THƯ VIỆN TKZ-EUCLIDE
  // ==========================================

  // 1. \tkzDefPoints{0/0/A, 5/0/C, 2/3.5/B}
  const tkzDefPointsMatches = cleanCode.matchAll(/\\tkzDefPoints\{([^}]+)\}/g);
  for (const match of tkzDefPointsMatches) {
    const listStr = match[1];
    const items = listStr.split(",").map((s) => s.trim());
    for (const item of items) {
      const parts = item.split("/").map((s) => s.trim());
      if (parts.length >= 3) {
        const x = evaluateExpr(parts[0]);
        const y = evaluateExpr(parts[1]);
        const name = parts[2];
        coordsMap.set(name, { x, y });
      }
    }
  }

  // 2. \tkzDefPoint(x,y){A}
  const tkzDefPointMatches = cleanCode.matchAll(/\\tkzDefPoint(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*\{([^}]+)\}/g);
  for (const match of tkzDefPointMatches) {
    const optStr = match[1] || "";
    const coordStr = match[2];
    const name = match[3].trim();
    const pt = parseCoordinateValue(`(${coordStr})`, coordsMap);
    if (pt) {
      coordsMap.set(name, pt);
      if (optStr.includes("label=")) {
        const lblMatch = optStr.match(/label\s*=\s*(?:([^:]+):)?\{?([^}\]]+)\}?/);
        if (lblMatch) {
          nodes.push({
            id: name,
            x: pt.x,
            y: pt.y,
            pos: (lblMatch[1] || "above").trim(),
            label: lblMatch[2].trim(),
          });
        }
      }
    }
  }

  // 3. \tkzDrawPoints(A,B,C)
  const tkzDrawPointsMatches = cleanCode.matchAll(/\\tkzDrawPoints?(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g);
  for (const match of tkzDrawPointsMatches) {
    const names = match[2].split(",").map((s) => s.trim());
    for (const name of names) {
      const pt = coordsMap.get(name);
      if (pt) {
        explicitDots.set(name, {
          name,
          x: pt.x,
          y: pt.y,
          fill: "#1e293b",
          stroke: "#ffffff",
          radius: 2.8,
        });
      }
    }
  }

  // 4. \tkzDrawPolygon[...](A,B,C,...)
  const tkzPolyMatches = cleanCode.matchAll(/\\tkzDrawPolygon(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g);
  for (const match of tkzPolyMatches) {
    const optStr = match[1] || "";
    const pointNames = match[2].split(",").map((s) => s.trim());
    const pts: Point2D[] = [];
    for (const name of pointNames) {
      const pt = coordsMap.get(name);
      if (pt) pts.push(pt);
    }
    if (pts.length >= 3) {
      const isDashed = optStr.includes("dashed");
      paths.push({
        type: "polygon",
        points: pts,
        isDashed,
        strokeColor: "#1e293b",
        strokeWidth: 1.8,
        fillColor: "rgba(99, 102, 241, 0.08)",
        isCycle: true,
      });
    }
  }

  // 5. \tkzDrawSegments[...](A,B C,D)
  const tkzSegmentMatches = cleanCode.matchAll(/\\tkzDrawSegments?(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g);
  for (const match of tkzSegmentMatches) {
    const optStr = match[1] || "";
    const isDashed = optStr.includes("dashed");
    const isDotted = optStr.includes("dotted");
    const pairs = match[2].trim().split(/\s+/);
    for (const pair of pairs) {
      const pNames = pair.split(",").map((s) => s.trim());
      if (pNames.length === 2) {
        const p1 = coordsMap.get(pNames[0]);
        const p2 = coordsMap.get(pNames[1]);
        if (p1 && p2) {
          paths.push({
            type: "line",
            points: [p1, p2],
            isDashed,
            isDotted,
            strokeColor: "#1e293b",
            strokeWidth: 1.5,
          });
        }
      }
    }
  }

  // 6. \tkzLabelPoints[pos](A,B,C)
  const tkzLabelPointsMatches = cleanCode.matchAll(/\\tkzLabelPoints?(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g);
  for (const match of tkzLabelPointsMatches) {
    const pos = (match[1] || "above").trim();
    const names = match[2].split(",").map((s) => s.trim());
    for (const name of names) {
      const pt = coordsMap.get(name);
      if (pt) {
        nodes.push({
          id: name,
          x: pt.x,
          y: pt.y,
          pos,
          label: `$${name}$`,
        });
      }
    }
  }

  // 7. \tkzLabelSegment[pos](A,B){$text$}
  const tkzLabelSegRegex = /\\tkzLabelSegment(?:\s*\[([^\]]*)\])?\s*\(([^,]+),([^)]+)\)\s*/g;
  let tlsMatch: RegExpExecArray | null;
  while ((tlsMatch = tkzLabelSegRegex.exec(cleanCode)) !== null) {
    const pos = (tlsMatch[1] || "above").trim();
    const p1Name = tlsMatch[2].trim();
    const p2Name = tlsMatch[3].trim();
    const afterMatchIdx = tkzLabelSegRegex.lastIndex;

    const braceStart = cleanCode.indexOf("{", afterMatchIdx);
    if (braceStart !== -1) {
      const bal = extractBalancedBraces(cleanCode, braceStart);
      if (bal) {
        const label = bal.content.trim();
        tkzLabelSegRegex.lastIndex = bal.endIndex + 1;
        const p1 = coordsMap.get(p1Name);
        const p2 = coordsMap.get(p2Name);
        if (p1 && p2 && label) {
          nodes.push({
            id: `seg_${p1Name}_${p2Name}`,
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            pos,
            label,
            isBadge: true,
          });
        }
      }
    }
  }

  // 8. \tkzMarkAngle, \tkzMarkAngles, \tkzDrawAngle, \tkzDrawAngles
  const tkzMarkAngleRegex = /\\(?:tkzMarkAngles?|tkzDrawAngles?)(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g;
  let tkzAngleM: RegExpExecArray | null;
  while ((tkzAngleM = tkzMarkAngleRegex.exec(cleanCode)) !== null) {
    const optStr = tkzAngleM[1] || "";
    const rawArgs = tkzAngleM[2].trim();
    const tokens = rawArgs.replace(/[()]/g, " ").split(/[\s,]+/).filter(Boolean);

    for (let i = 0; i + 2 < tokens.length; i += 3) {
      const p1 = coordsMap.get(tokens[i]);
      const vertex = coordsMap.get(tokens[i + 1]);
      const p2 = coordsMap.get(tokens[i + 2]);
      if (p1 && vertex && p2) {
        const isDouble = optStr.includes("arc=ll") || optStr.includes("arc=2") || optStr.includes("double");
        let size = 0.65;
        const sizeMatch = optStr.match(/(?:size|radius)\s*=\s*([0-9.]+\s*(?:mm|cm|pt)?)/i);
        if (sizeMatch) size = parseTikzDimension(sizeMatch[1], 0.65);

        const strokeColor = parseTikzColor(optStr, "#475569");
        let fillColor: string | undefined = undefined;
        const fillMatch = optStr.match(/(?:^|[, ])fill\s*=\s*([a-zA-Z0-9!_]+)/i);
        if (fillMatch) fillColor = parseTikzColor(fillMatch[1], "rgba(99,102,241,0.15)");

        angleMarks.push({
          p1,
          vertex,
          p2,
          size,
          doubleArc: isDouble,
          color: strokeColor,
          fillColor,
        });
      }
    }
  }

  // 8.1. \tkzMarkRightAngle, \tkzMarkRightAngles, \tkzDrawRightAngle, \tkzDrawRightAngles
  const tkzRightAngleRegex = /\\(?:tkzMarkRightAngles?|tkzDrawRightAngles?)(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g;
  let tkzRightM: RegExpExecArray | null;
  while ((tkzRightM = tkzRightAngleRegex.exec(cleanCode)) !== null) {
    const optStr = tkzRightM[1] || "";
    const rawArgs = tkzRightM[2].trim();
    const tokens = rawArgs.replace(/[()]/g, " ").split(/[\s,]+/).filter(Boolean);

    for (let i = 0; i + 2 < tokens.length; i += 3) {
      const p1 = coordsMap.get(tokens[i]);
      const vertex = coordsMap.get(tokens[i + 1]);
      const p2 = coordsMap.get(tokens[i + 2]);
      if (p1 && vertex && p2) {
        let size = 0.3;
        const sizeMatch = optStr.match(/(?:size|radius)\s*=\s*([0-9.]+\s*(?:mm|cm|pt)?)/i);
        if (sizeMatch) size = parseTikzDimension(sizeMatch[1], 0.3);

        const hasDot = /german|dot/i.test(optStr);
        const strokeColor = parseTikzColor(optStr, "#1e293b");
        let fillColor: string | undefined = undefined;
        const fillMatch = optStr.match(/(?:^|[, ])fill\s*=\s*([a-zA-Z0-9!_]+)/i);
        if (fillMatch) fillColor = parseTikzColor(fillMatch[1], "rgba(99,102,241,0.15)");

        angleMarks.push({
          p1,
          vertex,
          p2,
          size,
          isRightAngle: true,
          hasDot,
          color: strokeColor,
          fillColor,
        });
      }
    }
  }

  // 8.2. \tkzLabelAngle & \tkzLabelAngles
  const tkzLabelAngleRegex = /\\(?:tkzLabelAngles?)(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*\{([^}]+)\}/g;
  let tkzLabelM: RegExpExecArray | null;
  while ((tkzLabelM = tkzLabelAngleRegex.exec(cleanCode)) !== null) {
    const optStr = tkzLabelM[1] || "";
    const rawArgs = tkzLabelM[2].trim();
    const label = tkzLabelM[3].trim();
    const tokens = rawArgs.replace(/[()]/g, " ").split(/[\s,]+/).filter(Boolean);

    let pos = 1.35;
    const posMatch = optStr.match(/pos\s*=\s*([0-9.]+)/i);
    if (posMatch) pos = parseFloat(posMatch[1]) || 1.35;

    for (let i = 0; i + 2 < tokens.length; i += 3) {
      const p1 = coordsMap.get(tokens[i]);
      const vertex = coordsMap.get(tokens[i + 1]);
      const p2 = coordsMap.get(tokens[i + 2]);
      if (p1 && vertex && p2) {
        const dx1 = p1.x - vertex.x;
        const dy1 = p1.y - vertex.y;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
        const dx2 = p2.x - vertex.x;
        const dy2 = p2.y - vertex.y;
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

        let bisX = dx1 / len1 + dx2 / len2;
        let bisY = dy1 / len1 + dy2 / len2;
        let bisLen = Math.sqrt(bisX * bisX + bisY * bisY);
        if (bisLen < 1e-4) {
          bisX = -dy1 / len1;
          bisY = dx1 / len1;
          bisLen = 1;
        }

        const labelPt: Point2D = {
          x: vertex.x + (bisX / bisLen) * (0.45 * pos),
          y: vertex.y + (bisY / bisLen) * (0.45 * pos),
        };

        nodes.push({
          id: `tkz_angle_lbl_${nodes.length}`,
          x: labelPt.x,
          y: labelPt.y,
          pos: "above",
          label,
          isBadge: true,
          isFixed: true,
          isExplicitShifted: true,
        });
      }
    }
  }

  // ==========================================
  // B1. PGFPLOTS: XỬ LÝ MÔI TRƯỜNG \begin{axis}[...] ... \end{axis}
  // ==========================================
  let clipWindow: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

  const axisEnvRegex = /\\begin\{axis\}\s*(?:\[([\s\S]*?)\])?([\s\S]*?)\\end\{axis\}/gi;
  let axisEnvMatch: RegExpExecArray | null;
  while ((axisEnvMatch = axisEnvRegex.exec(cleanCode)) !== null) {
    const optStr = axisEnvMatch[1] || "";

    // 1. Phân tích miền giá trị trục xmin, xmax, ymin, ymax
    let axMin = -5.0;
    let axMax = 5.0;
    let ayMin = -5.0;
    let ayMax = 5.0;

    const xminM = optStr.match(/xmin\s*=\s*([+-]?[0-9.]+)/i);
    if (xminM) axMin = parseFloat(xminM[1]);
    const xmaxM = optStr.match(/xmax\s*=\s*([+-]?[0-9.]+)/i);
    if (xmaxM) axMax = parseFloat(xmaxM[1]);
    const yminM = optStr.match(/ymin\s*=\s*([+-]?[0-9.]+)/i);
    if (yminM) ayMin = parseFloat(yminM[1]);
    const ymaxM = optStr.match(/ymax\s*=\s*([+-]?[0-9.]+)/i);
    if (ymaxM) ayMax = parseFloat(ymaxM[1]);

    coordsMap.set("__axis_min_x", { x: axMin, y: 0 });
    coordsMap.set("__axis_max_x", { x: axMax, y: 0 });
    coordsMap.set("__axis_min_y", { x: 0, y: ayMin });
    coordsMap.set("__axis_max_y", { x: 0, y: ayMax });

    clipWindow = { minX: axMin, maxX: axMax, minY: ayMin, maxY: ayMax };

    // 2. Lưới toạ độ (grid=both / grid=major)
    if (/grid\s*=\s*(?:both|major)/i.test(optStr)) {
      const stepX = 1.0;
      const stepY = 1.0;
      for (let x = Math.ceil(axMin); x <= axMax + 0.001; x += stepX) {
        paths.push({
          type: "line",
          points: [
            { x, y: ayMin },
            { x, y: ayMax },
          ],
          strokeColor: "rgba(148, 163, 184, 0.35)",
          strokeWidth: 0.65,
          isDashed: optStr.includes("grid style={dashed}") || optStr.includes("dashed"),
        });
      }
      for (let y = Math.ceil(ayMin); y <= ayMax + 0.001; y += stepY) {
        paths.push({
          type: "line",
          points: [
            { x: axMin, y },
            { x: axMax, y },
          ],
          strokeColor: "rgba(148, 163, 184, 0.35)",
          strokeWidth: 0.65,
          isDashed: optStr.includes("grid style={dashed}") || optStr.includes("dashed"),
        });
      }
    }

    // 3. Đường trục toạ độ (axis lines=middle / center / box)
    const hasMiddleAxes =
      /axis\s+lines\s*=\s*(?:middle|center)/i.test(optStr) ||
      !/axis\s+lines\s*=\s*(?:none|box)/i.test(optStr);
    if (hasMiddleAxes) {
      // Trục hoành Ox
      paths.push({
        type: "line",
        points: [
          { x: axMin - 0.2, y: 0 },
          { x: axMax + 0.5, y: 0 },
        ],
        strokeColor: "#1e293b",
        strokeWidth: 1.6,
        hasArrowEnd: true,
      });

      // Trục tung Oy
      paths.push({
        type: "line",
        points: [
          { x: 0, y: ayMin - 0.2 },
          { x: 0, y: ayMax + 0.5 },
        ],
        strokeColor: "#1e293b",
        strokeWidth: 1.6,
        hasArrowEnd: true,
      });

      // Tên trục xlabel, ylabel
      const xlabelM = optStr.match(/xlabel\s*=\s*(?:\{([^}]+)\}|([^\s,\]]+))/i);
      const xlabel = xlabelM ? (xlabelM[1] || xlabelM[2]).replace(/\$/g, "").trim() : "x";
      nodes.push({
        id: `pgf_xlabel_${nodes.length}`,
        x: axMax + 0.45,
        y: -0.25,
        pos: "right",
        label: `$${xlabel}$`,
        isBadge: false,
      });

      const ylabelM = optStr.match(/ylabel\s*=\s*(?:\{([^}]+)\}|([^\s,\]]+))/i);
      const ylabel = ylabelM ? (ylabelM[1] || ylabelM[2]).replace(/\$/g, "").trim() : "y";
      nodes.push({
        id: `pgf_ylabel_${nodes.length}`,
        x: -0.25,
        y: ayMax + 0.45,
        pos: "above",
        label: `$${ylabel}$`,
        isBadge: false,
      });

      // Gốc toạ độ O
      if (axMin <= 0 && axMax >= 0 && ayMin <= 0 && ayMax >= 0) {
        nodes.push({
          id: `pgf_origin_${nodes.length}`,
          x: -0.28,
          y: -0.28,
          pos: "below left",
          label: "$O$",
          isBadge: false,
        });
      }

      // Vạch chia toạ độ xtick, ytick nếu có
      const xtickM = optStr.match(/xtick\s*=\s*\{([^}]+)\}/i);
      if (xtickM) {
        const xTicks = xtickM[1]
          .split(",")
          .map((s) => evaluateExpr(s))
          .filter((n) => !isNaN(n) && n !== 0);
        for (const xt of xTicks) {
          paths.push({
            type: "line",
            points: [
              { x: xt, y: 0.1 },
              { x: xt, y: -0.1 },
            ],
            strokeColor: "#1e293b",
            strokeWidth: 1.0,
          });
          nodes.push({
            id: `xtick_${xt}_${nodes.length}`,
            x: xt,
            y: -0.25,
            pos: "below",
            label: `$${xt}$`,
            isBadge: false,
          });
        }
      }

      const ytickM = optStr.match(/ytick\s*=\s*\{([^}]+)\}/i);
      if (ytickM) {
        const yTicks = ytickM[1]
          .split(",")
          .map((s) => evaluateExpr(s))
          .filter((n) => !isNaN(n) && n !== 0);
        for (const yt of yTicks) {
          paths.push({
            type: "line",
            points: [
              { x: 0.1, y: yt },
              { x: -0.1, y: yt },
            ],
            strokeColor: "#1e293b",
            strokeWidth: 1.0,
          });
          nodes.push({
            id: `ytick_${yt}_${nodes.length}`,
            x: -0.25,
            y: yt,
            pos: "left",
            label: `$${yt}$`,
            isBadge: false,
          });
        }
      }
    }
  }

  // ==========================================
  // B2. PARSER CHO CÁC LỆNH TIKZ & PGFPLOTS
  // ==========================================

  const flattenedCode = flattenTikzScopes(cleanCode);

  const commands = flattenedCode
    .replace(/\\usetikzlibrary\{[^}]*\}/gi, "")
    .replace(/\\usepgfplotslibrary\{[^}]*\}/gi, "")
    .replace(/\\usepackage(?:\s*\[[^\]]*\])?\{[^}]*\}/gi, "")
    .replace(/\\pgfplotsset\{[^}]*\}/gi, "")
    .replace(/\\tikzset\{[^}]*\}/gi, "")
    .replace(/\\begin\{tikzpicture\}(?:\[[^\]]*\])?/gi, "")
    .replace(/\\end\{tikzpicture\}/gi, "")
    .replace(/\\begin\{axis\}(?:\[[^\]]*\])?/gi, "")
    .replace(/\\end\{axis\}/gi, "")
    .replace(/\\begin\{scope\}(?:\[[^\]]*\])?/gi, "")
    .replace(/\\end\{scope\}/gi, "")
    .replace(/\\begin\{[a-zA-Z*]+\}(?:\[[^\]]*\])?/gi, "")
    .replace(/\\end\{[a-zA-Z*]+\}/gi, "")
    .split(";")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd.length > 0);

  for (const cmd of commands) {
    let activeCoordsMap = coordsMap;
    const canvasMatch = cmd.match(/canvas\s+is\s+([a-zA-Z]+)\s+plane\s+at\s+([a-zA-Z0-9_]+)\s*=\s*([^,\]]+)/i);
    if (canvasMatch) {
      activeCoordsMap = new Map(coordsMap);
      activeCoordsMap.set("__canvas_plane", {
        type: canvasMatch[1].toLowerCase(),
        axis: canvasMatch[2].toLowerCase(),
        val: evaluateExpr(canvasMatch[3]),
      } as any);
    }
    // 0. Grid rendering: \draw[gray!20](-5,-10.5)grid(5,2.5); hoặc \draw (0,0) grid (4,4);
    const gridRegex = /(?:\\draw|\\path)\s*(?:\[([^\]]*)\])?\s*\(([^)]+)\)\s*grid\s*(?:\[([^\]]*)\])?\s*\(([^)]+)\)/i;
    const gridM = cmd.match(gridRegex);
    if (gridM) {
      const optStr = ((gridM[1] || "") + " " + (gridM[3] || "")).trim();
      const p1 = parseCoordinateValue(`(${gridM[2]})`, coordsMap);
      const p2 = parseCoordinateValue(`(${gridM[4]})`, coordsMap);
      if (p1 && p2) {
        const gxMin = Math.min(p1.x, p2.x);
        const gxMax = Math.max(p1.x, p2.x);
        const gyMin = Math.min(p1.y, p2.y);
        const gyMax = Math.max(p1.y, p2.y);

        let step = 1.0;
        const stepM = optStr.match(/step\s*=\s*([0-9.]+)/i);
        if (stepM) step = parseFloat(stepM[1]) || 1.0;

        const strokeColor = parseTikzColor(optStr, "rgba(148, 163, 184, 0.35)");
        const strokeWidth = optStr.includes("thin") ? 0.6 : optStr.includes("thick") ? 1.1 : 0.75;

        // Lưu góc lưới để đảm bảo kích thước canvas chuẩn xác
        coordsMap.set(`__grid_1_${coordsMap.size}`, { x: gxMin, y: gyMin });
        coordsMap.set(`__grid_2_${coordsMap.size}`, { x: gxMax, y: gyMax });

        // Tạo các đường lưới dọc
        const startX = Math.ceil(gxMin / step) * step;
        for (let x = startX; x <= gxMax + 0.001; x += step) {
          const curX = Math.round(x * 1000) / 1000;
          paths.push({
            type: "line",
            points: [
              { x: curX, y: gyMin },
              { x: curX, y: gyMax },
            ],
            strokeColor,
            strokeWidth,
            isDashed: optStr.includes("dashed"),
            isDotted: optStr.includes("dotted"),
          });
        }

        // Tạo các đường lưới ngang
        const startY = Math.ceil(gyMin / step) * step;
        for (let y = startY; y <= gyMax + 0.001; y += step) {
          const curY = Math.round(y * 1000) / 1000;
          paths.push({
            type: "line",
            points: [
              { x: gxMin, y: curY },
              { x: gxMax, y: curY },
            ],
            strokeColor,
            strokeWidth,
            isDashed: optStr.includes("dashed"),
            isDotted: optStr.includes("dotted"),
          });
        }
      }
      continue;
    }

    // 0.1. \clip và \draw rectangle: \clip (-5,-10.5) rectangle (5,2.5); hoặc \draw (E) rectangle +(0.3, 0.3); hoặc \draw[fill=...] (0,0) rectangle (4,3);
    const rectRegex = /\\(clip|draw|fill|filldraw|path)\s*(?:\[([^\]]*)\])?\s*\(([^)]+)\)\s*rectangle\s*(?:\[([^\]]*)\])?\s*(\+{1,2})?\s*\(([^)]+)\)/i;
    const rectM = cmd.match(rectRegex);
    if (rectM) {
      const isClip = rectM[1].toLowerCase() === "clip";
      const optStr = ((rectM[2] || "") + " " + (rectM[4] || "")).trim();
      const isRel = !!rectM[5];
      const p1 = parseCoordinateValue(`(${rectM[3]})`, coordsMap);
      let p2 = parseCoordinateValue(`(${rectM[6]})`, coordsMap);
      if (isRel && p1 && p2) {
        p2 = { x: p1.x + p2.x, y: p1.y + p2.y };
      }
      if (p1 && p2) {
        const rxMin = Math.min(p1.x, p2.x);
        const rxMax = Math.max(p1.x, p2.x);
        const ryMin = Math.min(p1.y, p2.y);
        const ryMax = Math.max(p1.y, p2.y);

        if (isClip) {
          clipWindow = { minX: rxMin, maxX: rxMax, minY: ryMin, maxY: ryMax };
          coordsMap.set(`__clip_1_${coordsMap.size}`, { x: rxMin, y: ryMin });
          coordsMap.set(`__clip_2_${coordsMap.size}`, { x: rxMax, y: ryMax });
        } else {
          const strokeColor = parseTikzColor(optStr, "#1e293b");
          const strokeWidth = optStr.includes("thick") ? 2.0 : optStr.includes("thin") ? 1.2 : 1.5;
          const isExplicitFill = rectM[1].toLowerCase() === "fill" || rectM[1].toLowerCase() === "filldraw";
          paths.push({
            type: "polygon",
            points: [
              { x: rxMin, y: ryMin },
              { x: rxMax, y: ryMin },
              { x: rxMax, y: ryMax },
              { x: rxMin, y: ryMax },
            ],
            strokeColor: rectM[1].toLowerCase() === "fill" ? "none" : strokeColor,
            strokeWidth,
            fillColor: isExplicitFill ? "rgba(99,102,241,0.1)" : "none",
            isCycle: true,
          });
        }
      }
      continue;
    }

    // 0.2. Lệnh \addplot / \addplot+ / \addplot3 của PGFPlots
    if (cmd.startsWith("\\addplot") || cmd.startsWith("addplot") || /\\addplot3?\+?\b/i.test(cmd)) {
      const addplotMatch = cmd.match(/\\?addplot3?\+?\s*(?:\[([^\]]*)\])?([\s\S]*)/i);
      if (addplotMatch) {
        const optStr = addplotMatch[1] || "";
        const rest = addplotMatch[2] || "";

        let samples = 150;
        const samplesM = optStr.match(/samples\s*=\s*([0-9]+)/i);
        if (samplesM) samples = Math.min(500, Math.max(20, parseInt(samplesM[1], 10)));

        let dMin = clipWindow ? clipWindow.minX : -5.0;
        let dMax = clipWindow ? clipWindow.maxX : 5.0;
        const domainM = optStr.match(/domain\s*=\s*([+-]?[0-9.]+)\s*:\s*([+-]?[0-9.]+)/i);
        if (domainM) {
          dMin = parseFloat(domainM[1]);
          dMax = parseFloat(domainM[2]);
        }

        let strokeColor = parseTikzColor(optStr, "#2563eb");
        let strokeWidth = 1.8;
        if (optStr.includes("thick")) strokeWidth = 2.2;
        else if (optStr.includes("thin")) strokeWidth = 1.2;

        const isDashed = optStr.includes("dashed");
        const isDotted = optStr.includes("dotted");

        // Case 1: \addplot[...] coordinates { (x1,y1) (x2,y2) ... }
        const coordBlockM = rest.match(/coordinates\s*\{([^}]+)\}/i);
        if (coordBlockM) {
          const rawPairs = Array.from(coordBlockM[1].matchAll(/\(([^)]+)\)/g));
          const coordPts: Point2D[] = [];
          for (const rp of rawPairs) {
            const pt = parseCoordinateValue(`(${rp[1]})`, coordsMap);
            if (pt) coordPts.push(pt);
          }
          if (coordPts.length >= 2) {
            paths.push({
              type: "line",
              points: coordPts,
              strokeColor,
              strokeWidth,
              isDashed,
              isDotted,
            });
          }
          if (optStr.includes("mark=") || optStr.includes("mark =") || optStr.includes("only marks")) {
            for (let i = 0; i < coordPts.length; i++) {
              const pt = coordPts[i];
              explicitDots.set(`addplot_pt_${explicitDots.size}`, {
                name: `P${i}`,
                x: pt.x,
                y: pt.y,
                fill: strokeColor,
                stroke: "#ffffff",
                radius: 3.0,
              });
            }
          }
          continue;
        }

        // Case 2: \addplot[...] {expr}; hoặc \addplot[...] expression {expr}; hoặc \addplot[...] (x, {expr});
        let expr = "";
        const braceM = rest.match(/(?:expression\s*)?\{([^}]+)\}/i);
        if (braceM) {
          expr = braceM[1].trim();
        } else {
          const parenM = rest.match(/\((?:\\?x|\w+)\s*,\s*\{?([^};)]+)\}?\)/i);
          if (parenM) expr = parenM[1].trim();
        }

        if (expr) {
          const ptsSegment: Point2D[] = [];
          const step = (dMax - dMin) / (samples - 1);
          const yMinBound = clipWindow ? clipWindow.minY - 2.0 : -100;
          const yMaxBound = clipWindow ? clipWindow.maxY + 2.0 : 100;

          for (let i = 0; i < samples; i++) {
            const curX = dMin + i * step;
            const curY = evaluateMathFunction(expr, curX, "x");
            if (isFinite(curY) && !isNaN(curY)) {
              if (curY >= yMinBound && curY <= yMaxBound) {
                if (ptsSegment.length > 0) {
                  const prev = ptsSegment[ptsSegment.length - 1];
                  if (Math.abs(curY - prev.y) > 15) {
                    if (ptsSegment.length >= 2) {
                      paths.push({
                        type: "line",
                        points: [...ptsSegment],
                        strokeColor,
                        strokeWidth,
                        isDashed,
                        isDotted,
                      });
                    }
                    ptsSegment.length = 0;
                  }
                }
                ptsSegment.push({ x: curX, y: curY });
              } else {
                if (ptsSegment.length >= 2) {
                  paths.push({
                    type: "line",
                    points: [...ptsSegment],
                    strokeColor,
                    strokeWidth,
                    isDashed,
                    isDotted,
                  });
                }
                ptsSegment.length = 0;
              }
            } else {
              if (ptsSegment.length >= 2) {
                paths.push({
                  type: "line",
                  points: [...ptsSegment],
                  strokeColor,
                  strokeWidth,
                  isDashed,
                  isDotted,
                });
              }
              ptsSegment.length = 0;
            }
          }

          if (ptsSegment.length >= 2) {
            paths.push({
              type: "line",
              points: ptsSegment,
              strokeColor,
              strokeWidth,
              isDashed,
              isDotted,
            });
          }
          continue;
        }
      }
    }

    // 0.3. Vẽ đồ thị hàm số TikZ tiêu chuẩn (Function Plot): \draw[...] plot (\x, {expr}); hoặc plot coordinates {...}
    if (cmd.includes("plot")) {
      const optMatch = cmd.match(/^\\(?:draw|fill|filldraw|path)\s*\[([^\]]*)\]/i);
      const optPlotMatch = cmd.match(/plot\s*\[([^\]]*)\]/i);
      const combinedOpts = ((optMatch ? optMatch[1] : "") + " " + (optPlotMatch ? optPlotMatch[1] : "")).trim();

      let samples = 150;
      const samplesM = combinedOpts.match(/samples\s*=\s*([0-9]+)/i);
      if (samplesM) samples = Math.min(500, Math.max(20, parseInt(samplesM[1], 10)));

      let dMin = -5.0;
      let dMax = 5.0;
      const domainM = combinedOpts.match(/domain\s*=\s*([+-]?[0-9.]+)\s*:\s*([+-]?[0-9.]+)/i);
      if (domainM) {
        dMin = parseFloat(domainM[1]);
        dMax = parseFloat(domainM[2]);
      } else if (clipWindow) {
        dMin = clipWindow.minX;
        dMax = clipWindow.maxX;
      }

      let varName = "x";
      const varM = combinedOpts.match(/variable\s*=\s*\\?([a-zA-Z0-9_]+)/i);
      if (varM) varName = varM[1].trim();

      let strokeColor = parseTikzColor(combinedOpts, "#1e293b");
      let strokeWidth = 1.6;
      if (combinedOpts.includes("thick")) strokeWidth = 2.0;
      else if (combinedOpts.includes("thin")) strokeWidth = 1.2;

      const isDashed = combinedOpts.includes("dashed");
      const isDotted = combinedOpts.includes("dotted");

      // Case A: plot coordinates { (0,0) (1,2) (2,1) }
      const coordBlockM = cmd.match(/plot\s*(?:\[[^\]]*\])?\s*coordinates\s*\{([^}]+)\}/i);
      if (coordBlockM) {
        const rawPairs = Array.from(coordBlockM[1].matchAll(/\(([^)]+)\)/g));
        const coordPts: Point2D[] = [];
        for (const rp of rawPairs) {
          const pt = parseCoordinateValue(`(${rp[1]})`, coordsMap);
          if (pt) coordPts.push(pt);
        }
        if (coordPts.length >= 2) {
          paths.push({
            type: "line",
            points: coordPts,
            strokeColor,
            strokeWidth,
            isDashed,
            isDotted,
          });
        }
        continue;
      }

      // Case B: plot (\x, {expr}) hoặc plot (\x, expr)
      const plotIdx = cmd.indexOf("plot");
      const afterPlot = cmd.substring(plotIdx + 4).trim();
      const parenIdx = afterPlot.indexOf("(");
      if (parenIdx !== -1) {
        const balParen = extractBalancedParens(afterPlot, parenIdx);
        if (balParen) {
          const inside = balParen.content.trim();
          const commaIdx = inside.indexOf(",");
          if (commaIdx !== -1) {
            const xArg = inside.substring(0, commaIdx).trim();
            const yExpr = inside.substring(commaIdx + 1).trim();

            const cleanXArg = xArg.replace(/^\\/, "").trim();
            if (cleanXArg) varName = cleanXArg;

            const ptsSegment: Point2D[] = [];
            const step = (dMax - dMin) / (samples - 1);

            const yMinBound = clipWindow ? clipWindow.minY - 1.5 : -100;
            const yMaxBound = clipWindow ? clipWindow.maxY + 1.5 : 100;

            for (let i = 0; i < samples; i++) {
              const curX = dMin + i * step;
              const curY = evaluateMathFunction(yExpr, curX, varName);

              if (isFinite(curY) && !isNaN(curY)) {
                if (curY >= yMinBound && curY <= yMaxBound) {
                  if (ptsSegment.length > 0) {
                    const prev = ptsSegment[ptsSegment.length - 1];
                    if (Math.abs(curY - prev.y) > 15) {
                      if (ptsSegment.length >= 2) {
                        paths.push({
                          type: "line",
                          points: [...ptsSegment],
                          strokeColor,
                          strokeWidth,
                          isDashed,
                          isDotted,
                        });
                      }
                      ptsSegment.length = 0;
                    }
                  }
                  ptsSegment.push({ x: curX, y: curY });
                } else {
                  if (ptsSegment.length >= 2) {
                    paths.push({
                      type: "line",
                      points: [...ptsSegment],
                      strokeColor,
                      strokeWidth,
                      isDashed,
                      isDotted,
                    });
                  }
                  ptsSegment.length = 0;
                }
              } else {
                if (ptsSegment.length >= 2) {
                  paths.push({
                    type: "line",
                    points: [...ptsSegment],
                    strokeColor,
                    strokeWidth,
                    isDashed,
                    isDotted,
                  });
                }
                ptsSegment.length = 0;
              }
            }

            if (ptsSegment.length >= 2) {
              paths.push({
                type: "line",
                points: ptsSegment,
                strokeColor,
                strokeWidth,
                isDashed,
                isDotted,
              });
            }
          }
        }
      }
      continue;
    }

    // 1. Phân tích toàn diện tất cả các định nghĩa coordinate / \coordinate trong lệnh
    // Hỗ trợ cả:
    // - \coordinate (Name) at (Coord)
    // - (Coord) coordinate (Name)
    // - \path (Coord1) coordinate (B) ++(Coord2) coordinate (C) ++(Coord3) coordinate (D) ($(B)+(D)-(C)$) coordinate (A)
    // - Chained relative movements ++(...) và +(...)
    if (cmd.includes("coordinate")) {
      let curPt: Point2D | null = null;
      let scanIdx = 0;

      while (scanIdx < cmd.length) {
        while (scanIdx < cmd.length && /\s/.test(cmd[scanIdx])) scanIdx++;
        if (scanIdx >= cmd.length) break;

        const rest = cmd.substring(scanIdx);

        // A. Từ khóa coordinate [opts] (Name)
        const coordWordM = rest.match(/^coordinate\b/i);
        if (coordWordM) {
          scanIdx += coordWordM[0].length;
          while (scanIdx < cmd.length && /\s/.test(cmd[scanIdx])) scanIdx++;

          let optStr = "";
          if (cmd[scanIdx] === "[") {
            const closeB = cmd.indexOf("]", scanIdx);
            if (closeB !== -1) {
              optStr = cmd.substring(scanIdx + 1, closeB).trim();
              scanIdx = closeB + 1;
            }
          }
          while (scanIdx < cmd.length && /\s/.test(cmd[scanIdx])) scanIdx++;

          if (cmd[scanIdx] === "(") {
            const bal = extractBalancedParens(cmd, scanIdx);
            if (bal) {
              const pointName = bal.content.trim();
              scanIdx = bal.endIndex + 1;

              // Kiểm tra xem phía sau có "at (Coord)" không
              const afterNameSub = cmd.substring(scanIdx);
              const atM = afterNameSub.match(/^\s*at\s*/i);
              if (atM) {
                const atCoordStart = scanIdx + atM[0].length;
                if (cmd[atCoordStart] === "(") {
                  const atBal = extractBalancedParens(cmd, atCoordStart);
                  if (atBal) {
                    const explicitAt = parseCoordinateValue(atBal.content, activeCoordsMap);
                    if (explicitAt) {
                      curPt = explicitAt;
                      scanIdx = atBal.endIndex + 1;
                    }
                  }
                } else {
                  const restSub = cmd.substring(atCoordStart).trim();
                  const endIdx = restSub.search(/[\s;]/);
                  const rawName = endIdx !== -1 ? restSub.substring(0, endIdx) : restSub;
                  const explicitAt = parseCoordinateValue(rawName, activeCoordsMap);
                  if (explicitAt) {
                    curPt = explicitAt;
                  }
                }
              }

              if (curPt) {
                coordsMap.set(pointName, { ...curPt });
                activeCoordsMap.set(pointName, { ...curPt });
                if (optStr.includes("label=")) {
                  const lblMatch = optStr.match(/label\s*=\s*(?:([^:]+):)?\{?([^}\]]+)\}?/);
                  if (lblMatch) {
                    nodes.push({
                      id: `coord_lbl_${pointName}`,
                      x: curPt.x,
                      y: curPt.y,
                      pos: (lblMatch[1] || "above").trim(),
                      label: lblMatch[2].trim(),
                    });
                  }
                }
              }
            }
          }
          continue;
        }

        // B. Tọa độ tương đối ++(...)
        const accumM = rest.match(/^\+\+\s*\(/);
        if (accumM) {
          const parenIdx = scanIdx + accumM[0].length - 1;
          const bal = extractBalancedParens(cmd, parenIdx);
          if (bal) {
            scanIdx = bal.endIndex + 1;
            const delta = parseCoordinateValue(bal.content, activeCoordsMap);
            if (delta) {
              curPt = curPt ? { x: curPt.x + delta.x, y: curPt.y + delta.y } : delta;
            }
          } else {
            scanIdx++;
          }
          continue;
        }

        // C. Tọa độ tương đối +(...)
        const relM = rest.match(/^\+\s*\(/);
        if (relM) {
          const parenIdx = scanIdx + relM[0].length - 1;
          const bal = extractBalancedParens(cmd, parenIdx);
          if (bal) {
            scanIdx = bal.endIndex + 1;
            const delta = parseCoordinateValue(bal.content, activeCoordsMap);
            if (delta) {
              curPt = curPt ? { x: curPt.x + delta.x, y: curPt.y + delta.y } : delta;
            }
          } else {
            scanIdx++;
          }
          continue;
        }

        // D. Tọa độ tuyệt đối (...)
        if (cmd[scanIdx] === "(") {
          const bal = extractBalancedParens(cmd, scanIdx);
          if (bal) {
            scanIdx = bal.endIndex + 1;
            const pt = parseCoordinateValue(bal.content, activeCoordsMap);
            if (pt) {
              curPt = pt;
            }
          } else {
            scanIdx++;
          }
          continue;
        }

        scanIdx++;
      }
    }

    // 3. \draw pic[...] {angle=C--B--A} hoặc \pic ["$30^\circ$", draw, angle radius=6mm] {angle=C--B--A} hoặc {right angle=c--O--b}
    const picRegex = /(?:\\draw\s+|\\path\s+|\\)?\bpic\b/gi;
    let picM: RegExpExecArray | null;
    while ((picM = picRegex.exec(cmd)) !== null) {
      let curIdx = picRegex.lastIndex;
      let optStr = "";
      let bodyStr = "";

      // Kiểm tra tên pic dạng (name) trước options hoặc sau options
      const nameBeforeM = cmd.substring(curIdx).match(/^\s*\(([^)]+)\)/);
      if (nameBeforeM) {
        curIdx += nameBeforeM[0].length;
      }

      // Trích xuất options [ ... ]
      const bracketIdx = cmd.indexOf("[", curIdx);
      if (bracketIdx !== -1 && /^\s*$/.test(cmd.substring(curIdx, bracketIdx))) {
        const bal = extractBalancedBrackets(cmd, bracketIdx);
        if (bal) {
          optStr = bal.content;
          curIdx = bal.endIndex + 1;
        }
      }

      // Kiểm tra tên pic dạng (name) hoặc vị trí at (...)
      const nameOrAtM = cmd.substring(curIdx).match(/^\s*(?:\(([^)]+)\)|at\s*\(([^)]+)\))/);
      if (nameOrAtM) {
        curIdx += nameOrAtM[0].length;
      }

      // Trích xuất body { ... }
      const braceIdx = cmd.indexOf("{", curIdx);
      if (braceIdx !== -1 && /^\s*$/.test(cmd.substring(curIdx, braceIdx))) {
        const bal = extractBalancedBraces(cmd, braceIdx);
        if (bal) {
          bodyStr = bal.content;
          curIdx = bal.endIndex + 1;
        }
      }

      if (bodyStr) {
        const angleMatch = bodyStr.match(/(?:(?:angle|angles|right\s*angle|right\s*angles)\s*=\s*)?([a-zA-Z0-9_'\\]+)\s*--\s*([a-zA-Z0-9_'\\]+)\s*--\s*([a-zA-Z0-9_'\\]+)/i);
        if (angleMatch) {
          const p1Name = angleMatch[1].replace(/^\\/, "").trim();
          const vertexName = angleMatch[2].replace(/^\\/, "").trim();
          const p2Name = angleMatch[3].replace(/^\\/, "").trim();

          const p1 = coordsMap.get(p1Name);
          const vertex = coordsMap.get(vertexName);
          const p2 = coordsMap.get(p2Name);

          if (p1 && vertex && p2) {
            const isRightAngle = /right\s*angle/i.test(optStr) || /right\s*angle/i.test(bodyStr);
            const isDouble = optStr.includes("double") || /arc\s*=\s*(?:ll|2)/i.test(optStr);
            const hasDot = /german|dot/i.test(optStr);
            const strokeColor = parseTikzColor(optStr, isRightAngle ? "#1e293b" : "#334155");

            let fillColor: string | undefined = undefined;
            const fillMatch = optStr.match(/(?:^|[, ])fill\s*=\s*([a-zA-Z0-9!_]+)/i);
            if (fillMatch) fillColor = parseTikzColor(fillMatch[1], "rgba(99,102,241,0.15)");

            let radius = isRightAngle ? 0.28 : 0.55;
            const radMatch = optStr.match(/(?:angle\s+radius|radius|size)\s*=\s*([0-9.]+\s*(?:mm|cm|pt|in)?)/i);
            if (radMatch) {
              radius = parseTikzDimension(radMatch[1], radius);
            }

            // Kiểm tra quotes label (gói quotes): ví dụ pic["$30^\circ$", draw] hoặc pic text={$30^\circ$}
            let quoteLabel: string | undefined = undefined;
            const quoteMatch = optStr.match(/["']([^"']+)["']/);
            if (quoteMatch) {
              quoteLabel = quoteMatch[1].trim();
            } else {
              const textMatch = optStr.match(/pic\s*text\s*=\s*\{?([^},\]]+)\}?/i);
              if (textMatch) quoteLabel = textMatch[1].trim();
            }

            angleMarks.push({
              p1,
              vertex,
              p2,
              size: radius,
              doubleArc: isDouble,
              isRightAngle,
              hasDot,
              label: quoteLabel,
              color: strokeColor,
              fillColor,
            });

            // Nếu có nhãn góc từ quotes library, đặt nhãn KaTeX ở phân giác góc
            if (quoteLabel) {
              const dx1 = p1.x - vertex.x;
              const dy1 = p1.y - vertex.y;
              const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
              const dx2 = p2.x - vertex.x;
              const dy2 = p2.y - vertex.y;
              const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

              let bisX = dx1 / len1 + dx2 / len2;
              let bisY = dy1 / len1 + dy2 / len2;
              let bisLen = Math.sqrt(bisX * bisX + bisY * bisY);
              if (bisLen < 1e-4) {
                bisX = -dy1 / len1;
                bisY = dx1 / len1;
                bisLen = 1;
              }

              let ecc = 1.35;
              const eccMatch = optStr.match(/angle\s+eccentricity\s*=\s*([0-9.]+)/i);
              if (eccMatch) ecc = parseFloat(eccMatch[1]) || 1.35;

              const labelDist = radius * ecc;
              const labelPt: Point2D = {
                x: vertex.x + (bisX / bisLen) * labelDist,
                y: vertex.y + (bisY / bisLen) * labelDist,
              };

              nodes.push({
                id: `angle_lbl_${nodes.length}`,
                x: labelPt.x,
                y: labelPt.y,
                pos: "above",
                label: quoteLabel,
                isBadge: true,
                isFixed: true,
                isExplicitShifted: true,
              });
            }
          }
        }
      }
    }

    // 4. Cú pháp \fill[black] (A) circle(1pt)+(-90:4mm)node[scale=1]{$A$}
    const fillPointLabelRegex = /\\(?:fill|draw)\s*(?:\[([^\]]*)\])?\s*\(([^)]+)\)\s*(?:circle\s*\([^)]+\))?\s*\+\s*\(\s*([^:]+)\s*:\s*([^)]+)\s*\)\s*node\b/g;
    let fplMatch: RegExpExecArray | null;
    while ((fplMatch = fillPointLabelRegex.exec(cmd)) !== null) {
      const ptName = fplMatch[2].trim();
      const angleDeg = evaluateExpr(fplMatch[3]);
      const dist = evaluateExpr(fplMatch[4]) || 0.4;
      const afterNodeIdx = fillPointLabelRegex.lastIndex;

      let optStr = "";
      let braceSearchIdx = afterNodeIdx;
      const optBracketMatch = cmd.substring(afterNodeIdx).match(/^\s*\[([^\]]*)\]/);
      if (optBracketMatch) {
        optStr = optBracketMatch[1].trim();
        braceSearchIdx = afterNodeIdx + optBracketMatch[0].length;
      }

      const braceStart = cmd.indexOf("{", braceSearchIdx);
      if (braceStart !== -1) {
        const bal = extractBalancedBraces(cmd, braceStart);
        if (bal) {
          const label = bal.content.trim();
          fillPointLabelRegex.lastIndex = bal.endIndex + 1;

          const basePt = parseCoordinateValue(ptName, coordsMap);
          if (basePt) {
            explicitDots.set(ptName, {
              name: ptName,
              x: basePt.x,
              y: basePt.y,
              fill: "#1e293b",
              stroke: "#ffffff",
              radius: 2.8,
            });
            const rad = (angleDeg * Math.PI) / 180;
            const nodePt: Point2D = {
              x: basePt.x + dist * Math.cos(rad),
              y: basePt.y + dist * Math.sin(rad),
            };

            let pos = "above";
            if (angleDeg <= -45 && angleDeg >= -135) pos = "below";
            else if (angleDeg > 45 && angleDeg < 135) pos = "above";
            else if (Math.abs(angleDeg) > 135) pos = "left";
            else if (Math.abs(angleDeg) < 45) pos = "right";

            nodes.push({
              id: `lbl_${ptName}_${nodes.length}`,
              x: nodePt.x,
              y: nodePt.y,
              pos,
              label,
            });
          }
        }
      }
    }

    // 5. \node [options] (Name) at (coord) [trailing_options] {$Label$}
    if (cmd.includes("\\node")) {
      const nodeRegex = /\\node\b/g;
      let match: RegExpExecArray | null;
      while ((match = nodeRegex.exec(cmd)) !== null) {
        let cursor = nodeRegex.lastIndex;
        let optParts: string[] = [];
        let explicitPt: Point2D | null = null;
        let nodeName = "";

        // Tên node tùy chọn dạng (node_name)
        const nameMatch = cmd.substring(cursor).match(/^\s*\(([^)]+)\)/);
        if (nameMatch && !cmd.substring(cursor).trim().startsWith("(0,") && !cmd.substring(cursor).trim().startsWith("(-") && !cmd.substring(cursor).trim().startsWith("(1") && !cmd.substring(cursor).trim().startsWith("(2") && !cmd.substring(cursor).trim().startsWith("(3") && !cmd.substring(cursor).trim().startsWith("(4")) {
          nodeName = nameMatch[1].trim();
          cursor += nameMatch[0].length;
        }

        // Lặp lấy options [...] và at (...)
        let loop = true;
        while (loop && cursor < cmd.length) {
          while (cursor < cmd.length && /\s/.test(cmd[cursor])) cursor++;
          if (cmd[cursor] === "[") {
            const bal = extractBalancedBrackets(cmd, cursor);
            if (bal) {
              optParts.push(bal.content.trim());
              cursor = bal.endIndex + 1;
              continue;
            }
          }

          const atM = cmd.substring(cursor).match(/^\s*at\s*/);
          if (atM) {
            cursor += atM[0].length;
            const atRest = cmd.substring(cursor);
            if (atRest.startsWith("(")) {
              const bal = extractBalancedParens(cmd, cursor);
              if (bal) {
                explicitPt = parseCoordinateValue(bal.content, activeCoordsMap);
                cursor = bal.endIndex + 1;
                continue;
              }
            } else {
              const ptNameM = atRest.match(/^([a-zA-Z0-9_']+)/);
              if (ptNameM) {
                explicitPt = parseCoordinateValue(ptNameM[1], activeCoordsMap);
                cursor += ptNameM[0].length;
                continue;
              }
            }
          }
          loop = false;
        }

        const optStr = optParts.join(",");
        const braceIdx = cmd.indexOf("{", cursor);
        let label = "";
        if (braceIdx !== -1) {
          const labelBrace = extractBalancedBraces(cmd, braceIdx);
          if (labelBrace) {
            label = labelBrace.content.trim();
            nodeRegex.lastIndex = labelBrace.endIndex + 1;
          }
        }

        if (explicitPt) {
          const { dx, dy, hasExplicitShift } = parseNodeShift(optStr, activeCoordsMap);
          if (hasExplicitShift) {
            explicitPt = { x: explicitPt.x + dx, y: explicitPt.y + dy };
          }

          if (optStr.includes("rectangle") || optStr.includes("minimum width") || optStr.includes("pattern=")) {
            let width = 1.0;
            let height = 1.0;
            const wMatch = optStr.match(/minimum width\s*=\s*([0-9.]+\s*(?:cm|mm|pt)?)/);
            if (wMatch) width = evaluateExpr(wMatch[1]) || 1.0;
            const hMatch = optStr.match(/minimum height\s*=\s*([0-9.]+\s*(?:cm|mm|pt)?)/);
            if (hMatch) height = evaluateExpr(hMatch[1]) || 1.0;

            let pattern: "north west lines" | "dots" | "crosshatch" | "grid" | "none" = "none";
            if (optStr.includes("pattern=north west lines") || optStr.includes("north west")) {
              pattern = "north west lines";
            } else if (optStr.includes("pattern=dots") || optStr.includes("dots")) {
              pattern = "dots";
            } else if (optStr.includes("pattern=crosshatch")) {
              pattern = "crosshatch";
            } else if (optStr.includes("pattern=grid")) {
              pattern = "grid";
            }

            rectShapes.push({
              id: nodeName || `rect_${rectShapes.length}`,
              x: explicitPt.x,
              y: explicitPt.y,
              width,
              height,
              pattern,
              strokeColor: optStr.includes("draw") ? "#1e293b" : undefined,
              strokeWidth: 1.2,
            });
          } else if (label) {
            nodes.push({
              id: nodeName || `node_${nodes.length}`,
              x: explicitPt.x,
              y: explicitPt.y,
              pos: optStr || "above",
              label,
              isExplicitShifted: hasExplicitShift,
              isFixed: hasExplicitShift,
            });
          }
        }
      }
    }

    // 6. Điểm chấm hoặc hình tròn dạng: \draw[fill=white](\i) circle (1.5pt); hoặc \fill[black] (A) circle (1pt);
    if (cmd.includes("circle")) {
      const circleMatches = cmd.matchAll(/\\(?:draw|fill|filldraw)\s*(?:\[([^\]]*)\])?\s*\(([^)]+)\)\s*circle\s*(?:\(([^)]+)\)|\{([^}]+)\})/g);
      for (const cm of circleMatches) {
        const drawOpt = (cm[1] || "").toLowerCase();
        const ptName = cm[2].trim();
        const radStr = cm[3] || cm[4] || "1.5pt";
        const rad = evaluateExpr(radStr);
        const pt = parseCoordinateValue(ptName, activeCoordsMap);
        if (pt) {
          if (rad <= 0.2 || (radStr.includes("pt") && rad <= 5)) {
            let fill = "#1e293b";
            let stroke = "#ffffff";
            if (drawOpt.includes("fill=white") || drawOpt.includes("fill = white") || drawOpt.includes("fill=none")) {
              fill = "#ffffff";
              stroke = "#1e293b";
            }
            explicitDots.set(ptName, {
              name: ptName,
              x: pt.x,
              y: pt.y,
              fill,
              stroke,
              radius: 2.8,
            });
          }
        }
      }
    }

    // 7. Inline / path nodes:
    // Hỗ trợ:
    // - \coordinate (A) at (0,0) node at (A) [left] {$A$};
    // - \coordinate (B) at (-1,-1) node at (B) [left] {$B$};
    // - \path (O)--(a) node[pos=0.5,left]{$\vec{F_1}$} (O)--(b) node[pos=0.5,above]{$\vec{F_2}$};
    // - \draw [<->](6,-.6)--(8,-.6)node[midway,below]{$30\text{m}$};
    // - \draw (A) to node[midway,above]{$\vec{v}$} (B);
    // - \draw (A) -- (B) node[midway,above]{$\vec{u}$};
    // - \draw[fill=white](\i) circle (1.5pt) ($(\i)+(\g:3mm)$) node[scale=1]{$\i$};
    if (cmd.includes("node") && !cmd.startsWith("\\node")) {
      let scanIdx = 0;
      while (scanIdx < cmd.length) {
        const nodeSub = cmd.substring(scanIdx);
        const nodeMatch = nodeSub.match(/\bnode\b/);
        if (!nodeMatch || nodeMatch.index === undefined) break;

        const nodePos = scanIdx + nodeMatch.index;
        const beforeNode = cmd.substring(0, nodePos).trim();
        let cursor = nodePos + 4; // length of 'node'

        let optParts: string[] = [];
        let explicitAtPt: Point2D | null = null;
        let nodeName = "";

        // Kiểm tra tên node tùy chọn (tên nhãn định danh)
        const nameM = cmd.substring(cursor).match(/^\s*\(([a-zA-Z0-9_']+)\)/);
        if (nameM && !cmd.substring(cursor).trim().startsWith("(0,") && !cmd.substring(cursor).trim().startsWith("(-") && !cmd.substring(cursor).trim().startsWith("(1") && !cmd.substring(cursor).trim().startsWith("(2") && !cmd.substring(cursor).trim().startsWith("(3") && !cmd.substring(cursor).trim().startsWith("(4")) {
          // Chỉ coi là tên nếu phía trước không có từ "at"
          nodeName = nameM[1].trim();
          cursor += nameM[0].length;
        }

        // Lặp trích xuất options [...] và at (...)
        let loop = true;
        while (loop && cursor < cmd.length) {
          while (cursor < cmd.length && /\s/.test(cmd[cursor])) cursor++;
          if (cmd[cursor] === "[") {
            const bal = extractBalancedBrackets(cmd, cursor);
            if (bal) {
              optParts.push(bal.content.trim());
              cursor = bal.endIndex + 1;
              continue;
            }
          }

          const atMatch = cmd.substring(cursor).match(/^\s*at\s*/);
          if (atMatch) {
            cursor += atMatch[0].length;
            const atRest = cmd.substring(cursor);
            if (atRest.startsWith("(")) {
              const bal = extractBalancedParens(cmd, cursor);
              if (bal) {
                explicitAtPt = parseCoordinateValue(bal.content, activeCoordsMap);
                cursor = bal.endIndex + 1;
                continue;
              }
            } else {
              const ptNameMatch = atRest.match(/^([a-zA-Z0-9_']+)/);
              if (ptNameMatch) {
                explicitAtPt = parseCoordinateValue(ptNameMatch[1], activeCoordsMap);
                cursor += ptNameMatch[0].length;
                continue;
              }
            }
          }
          loop = false;
        }

        const optStr = optParts.join(",");

        const braceStart = cmd.indexOf("{", cursor);
        if (braceStart === -1) {
          scanIdx = cursor + 1;
          continue;
        }

        const bal = extractBalancedBraces(cmd, braceStart);
        if (!bal) {
          scanIdx = braceStart + 1;
          continue;
        }

        const label = bal.content.trim();
        const afterBraceIdx = bal.endIndex + 1;
        scanIdx = afterBraceIdx;

        // Trích xuất các tọa độ trước và sau node (nếu không có explicit at)
        const prevTokens = extractCoordinateTokens(beforeNode, activeCoordsMap).filter(
          (t) => !t.isCircleRadius && t.pt !== null
        );
        const nextTokens = extractCoordinateTokens(cmd.substring(afterBraceIdx), activeCoordsMap).filter(
          (t) => !t.isCircleRadius && t.pt !== null
        );

        let posFactor = 0.5;
        const posMatch = optStr.match(/pos\s*=\s*([0-9.]+)/i);
        if (posMatch) {
          posFactor = parseFloat(posMatch[1]) || 0.5;
        }

        let nodePt: Point2D | null = explicitAtPt;

        // TH 1: Node nằm giữa (P1) -- node (P2) hoặc (P1) to node (P2)
        if (
          !nodePt &&
          (beforeNode.endsWith("--") ||
            beforeNode.endsWith("to") ||
            beforeNode.endsWith("-|") ||
            beforeNode.endsWith("|-"))
        ) {
          if (prevTokens.length > 0 && nextTokens.length > 0) {
            const p1 = prevTokens[prevTokens.length - 1].pt!;
            const p2 = nextTokens[0].pt!;
            nodePt = {
              x: p1.x + (p2.x - p1.x) * posFactor,
              y: p1.y + (p2.y - p1.y) * posFactor,
            };
          }
        }

        // TH 2: Node nằm sau đường nối: (P1) -- (P2) node[midway...]
        if (!nodePt && prevTokens.length >= 2 && (optStr.includes("midway") || optStr.includes("pos="))) {
          const p1 = prevTokens[prevTokens.length - 2].pt!;
          const p2 = prevTokens[prevTokens.length - 1].pt!;
          nodePt = {
            x: p1.x + (p2.x - p1.x) * posFactor,
            y: p1.y + (p2.y - p1.y) * posFactor,
          };
        }

        // TH 3: Node đặt trực tiếp tại một điểm / tọa độ: (P) node[...] hoặc ($(P)+(90:3mm)$) node[...]
        if (!nodePt && prevTokens.length >= 1) {
          const lastToken = prevTokens[prevTokens.length - 1];
          if (lastToken.pt) {
            nodePt = { ...lastToken.pt };
          }
        }

        if (nodePt && label) {
          const { dx, dy, hasExplicitShift } = parseNodeShift(optStr, activeCoordsMap);
          if (hasExplicitShift) {
            nodePt = { x: nodePt.x + dx, y: nodePt.y + dy };
          }

          nodes.push({
            id: nodeName || `path_node_${nodes.length}`,
            x: nodePt.x,
            y: nodePt.y,
            pos: optStr || "above",
            label,
            isBadge: optStr.includes("midway"),
            isExplicitShifted: hasExplicitShift,
            isFixed: hasExplicitShift,
          });
        }
      }
    }

    // 8. Standard \draw, \fill, \filldraw (Không vẽ đường nối cho \fill vẽ điểm nút hoặc \path thuần túy)
    const isPointDotCmd = (cmd.startsWith("\\fill") || cmd.startsWith("\\draw")) && cmd.includes("circle");
    const isExplicitDraw = (cmd.startsWith("\\draw") || cmd.startsWith("\\filldraw")) && (!isPointDotCmd || cmd.includes("--"));
    const isExplicitFill = cmd.startsWith("\\fill") && (!isPointDotCmd || cmd.includes("--"));
    const isDrawnPath = cmd.startsWith("\\path") && (cmd.includes("[draw") || cmd.includes(",draw"));

    if (isExplicitDraw || isExplicitFill || isDrawnPath) {
      const optMatch = cmd.match(/^\\(?:draw|fill|filldraw|path)\s*\[([^\]]*)\]/);
      const optStr = optMatch ? optMatch[1] : "";

      const isDashed = optStr.includes("dashed");
      const isDotted = optStr.includes("dotted");
      const hasArrowEnd = optStr.includes("->") || optStr.includes("-stealth") || optStr.includes(">=stealth") || optStr.includes("<->");
      const hasArrowStart = optStr.includes("<-") || optStr.includes("<->") || optStr.includes("stealth-");

      let strokeColor = "#1e293b";
      if (optStr.includes("red")) strokeColor = "#ef4444";
      else if (optStr.includes("blue")) strokeColor = "#3b82f6";
      else if (optStr.includes("green")) strokeColor = "#10b981";
      else if (optStr.includes("amber") || optStr.includes("orange")) strokeColor = "#f59e0b";
      else if (optStr.includes("gray")) strokeColor = "#64748b";

      let strokeWidth = 1.5;
      if (optStr.includes("thick")) strokeWidth = 2.0;
      else if (optStr.includes("thin")) strokeWidth = 1.2;

      const drawBody = cmd.replace(/^\\(?:draw|fill|filldraw|path)\s*(\[[^\]]*\])?/, "").trim();

      const hasFill = isExplicitFill || optStr.includes("fill") || optStr.includes("pattern");
      let fillColor = "none";
      if (hasFill) {
        fillColor = "rgba(99,102,241,0.08)";
        const fillMatch = optStr.match(/fill\s*=\s*([a-zA-Z0-9_!]+)/);
        if (fillMatch) {
          const fColor = fillMatch[1].toLowerCase();
          if (fColor.includes("red")) fillColor = "rgba(239, 68, 68, 0.15)";
          else if (fColor.includes("blue")) fillColor = "rgba(59, 130, 246, 0.15)";
          else if (fColor.includes("green")) fillColor = "rgba(16, 185, 129, 0.15)";
          else if (fColor.includes("yellow") || fColor.includes("amber")) fillColor = "rgba(245, 158, 11, 0.15)";
          else if (fColor.includes("white")) fillColor = "#ffffff";
          else if (fColor.includes("gray") || fColor.includes("grey")) fillColor = "rgba(100, 116, 139, 0.15)";
          else if (fColor.includes("black")) fillColor = "rgba(30, 41, 59, 0.9)";
        }
      }

      // Sử dụng parseDrawSubpaths để phân tích toàn diện tất cả các subpaths, cung elip/tròn arc, chu trình cycle và đường thẳng
      const parsedSubpaths = parseDrawSubpaths(drawBody, activeCoordsMap);

      for (const sp of parsedSubpaths) {
        if (sp.points.length >= 2) {
          paths.push({
            type: sp.isCycle ? "polygon" : "line",
            points: sp.points,
            isDashed,
            isDotted,
            hasArrowEnd,
            hasArrowStart,
            strokeColor,
            strokeWidth,
            fillColor: isExplicitFill || (hasFill && sp.isCycle) ? fillColor : "none",
            isCycle: sp.isCycle,
          });
        }
      }
    }
  }

  // Thu thập tất cả điểm hiển thị để tính Bounding Box
  const allPoints: Point2D[] = [];
  coordsMap.forEach((pt) => allPoints.push(pt));
  explicitDots.forEach((d) => allPoints.push({ x: d.x, y: d.y }));
  nodes.forEach((n) => allPoints.push({ x: n.x, y: n.y }));
  paths.forEach((p) => {
    if (p.points) p.points.forEach((pt) => allPoints.push(pt));
  });
  rectShapes.forEach((r) => {
    allPoints.push({ x: r.x - r.width / 2, y: r.y - r.height / 2 });
    allPoints.push({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  });
  angleMarks.forEach((m) => {
    allPoints.push(m.vertex);
    allPoints.push(m.p1);
    allPoints.push(m.p2);
  });

  if (allPoints.length === 0) {
    return `<div class="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 font-mono">TikZ không thể phân tích tọa độ</div>`;
  }

  // Tính Min/Max
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  allPoints.forEach((pt) => {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  });

  // Scale tọa độ lên pixel hiển thị (mỗi 1 đơn vị toán học = ~52px)
  const unitSize = 50 * Math.max(0.6, globalScale);
  const padding = 42;

  const width = Math.max(260, (maxX - minX) * unitSize + padding * 2);
  const height = Math.max(200, (maxY - minY) * unitSize + padding * 2);

  const toSvgX = (x: number) => padding + (x - minX) * unitSize;
  const toSvgY = (y: number) => height - padding - (y - minY) * unitSize;

  let svgElements = "";

  // 1. Render các khối chữ nhật tòa nhà (Rectangles with Pattern)
  rectShapes.forEach((rect, rIdx) => {
    const rx = toSvgX(rect.x - rect.width / 2);
    const ry = toSvgY(rect.y + rect.height / 2);
    const rw = rect.width * unitSize;
    const rh = rect.height * unitSize;

    let fillAttr = rect.fillColor || "#ffffff";
    if (rect.pattern === "north west lines") fillAttr = "url(#pat-nw-lines)";
    else if (rect.pattern === "dots") fillAttr = "url(#pat-dots)";
    else if (rect.pattern === "crosshatch") fillAttr = "url(#pat-crosshatch)";
    else if (rect.pattern === "grid") fillAttr = "url(#pat-grid)";

    svgElements += `
      <rect 
        id="tikz-rect-${rIdx}"
        x="${rx.toFixed(1)}" 
        y="${ry.toFixed(1)}" 
        width="${rw.toFixed(1)}" 
        height="${rh.toFixed(1)}" 
        fill="${fillAttr}" 
        stroke="${rect.strokeColor || "#1e293b"}" 
        stroke-width="${rect.strokeWidth || 1.2}"
      />`;
  });

  // 2. Render các cung đo góc (Angle Arcs & Double Arcs & Right Angles)
  angleMarks.forEach((m, mIdx) => {
    const vx = toSvgX(m.vertex.x);
    const vy = toSvgY(m.vertex.y);

    const dx1 = m.p1.x - m.vertex.x;
    const dy1 = m.p1.y - m.vertex.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
    const u1x = dx1 / len1;
    const u1y = dy1 / len1;

    const dx2 = m.p2.x - m.vertex.x;
    const dy2 = m.p2.y - m.vertex.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
    const u2x = dx2 / len2;
    const u2y = dy2 / len2;

    if (m.isRightAngle) {
      const s = (m.size || 0.28) * unitSize;
      const c1x = vx + s * u1x;
      const c1y = vy - s * u1y;
      const c2x = vx + s * u1x + s * u2x;
      const c2y = vy - (s * u1y + s * u2y);
      const c3x = vx + s * u2x;
      const c3y = vy - s * u2y;

      if (m.fillColor && m.fillColor !== "none") {
        svgElements += `
          <polygon 
            id="tikz-right-angle-fill-${mIdx}"
            points="${vx.toFixed(1)},${vy.toFixed(1)} ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${c3x.toFixed(1)},${c3y.toFixed(1)}"
            fill="${m.fillColor}" 
          />`;
      }

      svgElements += `
        <path 
          id="tikz-right-angle-${mIdx}"
          d="M ${c1x.toFixed(1)} ${c1y.toFixed(1)} L ${c2x.toFixed(1)} ${c2y.toFixed(1)} L ${c3x.toFixed(1)} ${c3y.toFixed(1)}"
          fill="none" 
          stroke="${m.color || "#1e293b"}" 
          stroke-width="1.4"
        />`;

      if (m.hasDot) {
        const dotX = vx + s * 0.45 * (u1x + u2x);
        const dotY = vy - s * 0.45 * (u1y + u2y);
        svgElements += `
          <circle 
            id="tikz-right-angle-dot-${mIdx}"
            cx="${dotX.toFixed(1)}" 
            cy="${dotY.toFixed(1)}" 
            r="1.8" 
            fill="${m.color || "#1e293b"}" 
          />`;
      }
      return;
    }

    const r = (m.size || 0.6) * unitSize;
    const angle1 = getAngleDeg(u1x, u1y);
    const angle2 = getAngleDeg(u2x, u2y);

    let diff = angle2 - angle1;
    while (diff < 0) diff += 360;
    while (diff >= 360) diff -= 360;

    // Trong TikZ (thư viện angles/tkz-euclide):
    // Cung góc luôn được vẽ theo chiều ngược chiều kim đồng hồ trong hệ tọa độ toán học (tăng góc từ angle1 đến angle2).
    // Trong hệ tọa độ màn hình SVG (với trục Y hướng xuống):
    // - Chiều tăng góc lượng giác toán học tương ứng với chiều NGƯỢC chiều kim đồng hồ trên màn hình (sweepFlag = 0).
    // - largeArcFlag = 1 nếu diff > 180 (góc phản xạ/lồi > 180°), ngược lại = 0.
    const largeArcFlag = diff > 180 ? 1 : 0;
    const sweepFlag = 0;

    const startX = vx + r * Math.cos((angle1 * Math.PI) / 180);
    const startY = vy - r * Math.sin((angle1 * Math.PI) / 180);
    const endX = vx + r * Math.cos((angle2 * Math.PI) / 180);
    const endY = vy - r * Math.sin((angle2 * Math.PI) / 180);

    if (m.fillColor && m.fillColor !== "none") {
      svgElements += `
        <path 
          id="tikz-angle-wedge-${mIdx}"
          d="M ${vx.toFixed(1)} ${vy.toFixed(1)} L ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(1)} ${endY.toFixed(1)} Z"
          fill="${m.fillColor}" 
          stroke="none"
        />`;
    }

    svgElements += `
      <path 
        id="tikz-angle-arc-${mIdx}"
        d="M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(1)} ${endY.toFixed(1)}"
        fill="none" 
        stroke="${m.color || "#334155"}" 
        stroke-width="1.5"
      />`;

    if (m.doubleArc) {
      const r2 = r * 0.82;
      const sX2 = vx + r2 * Math.cos((angle1 * Math.PI) / 180);
      const sY2 = vy - r2 * Math.sin((angle1 * Math.PI) / 180);
      const eX2 = vx + r2 * Math.cos((angle2 * Math.PI) / 180);
      const eY2 = vy - r2 * Math.sin((angle2 * Math.PI) / 180);
      svgElements += `
        <path 
          id="tikz-angle-arc-double-${mIdx}"
          d="M ${sX2.toFixed(1)} ${sY2.toFixed(1)} A ${r2.toFixed(1)} ${r2.toFixed(1)} 0 ${largeArcFlag} ${sweepFlag} ${eX2.toFixed(1)} ${eY2.toFixed(1)}"
          fill="none" 
          stroke="${m.color || "#334155"}" 
          stroke-width="1.3"
        />`;
    }
  });

  // 3. Render các đường nối (Paths & Segments)
  paths.forEach((path, pIdx) => {
    const strokeDash = path.isDashed ? 'stroke-dasharray="6,5"' : path.isDotted ? 'stroke-dasharray="2,3"' : "";
    const markerEnd = path.hasArrowEnd ? 'marker-end="url(#tikz-arrow)"' : "";
    const markerStart = path.hasArrowStart ? 'marker-start="url(#tikz-arrow-start)"' : "";

    if (path.points && path.points.length >= 2) {
      const d =
        path.points
          .map((pt, i) => `${i === 0 ? "M" : "L"} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.y).toFixed(1)}`)
          .join(" ") + (path.isCycle ? " Z" : "");

      svgElements += `
        <path 
          id="tikz-path-${pIdx}"
          d="${d}" 
          fill="${path.fillColor || "none"}" 
          stroke="${path.strokeColor}" 
          stroke-width="${path.strokeWidth}" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          ${strokeDash}
          ${markerEnd}
          ${markerStart}
        />`;
    }
  });

  // 4. Render các điểm chấm tròn rõ ràng (Explicit Dots)
  explicitDots.forEach((dot, name) => {
    const cx = toSvgX(dot.x);
    const cy = toSvgY(dot.y);
    const r = dot.radius || 2.8;
    const fill = dot.fill || "#1e293b";
    const stroke = dot.stroke || "#ffffff";
    svgElements += `<circle id="tikz-dot-${name}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1" />`;
  });

  // 5. Render các nhãn đỉnh và góc (Nodes & Labels) với thuật toán tự động gán tọa độ, kiểm tra khoảng cách tối thiểu & chống trùng đè
  // A. Khử trùng lặp node theo tọa độ hình học & nhãn
  const uniqueNodes: TikzNode[] = [];
  for (const n of nodes) {
    const isDuplicate = uniqueNodes.some(
      (un) =>
        Math.hypot(un.x - n.x, un.y - n.y) < 0.08 &&
        (un.label === n.label || un.label.replace(/[{}$]/g, "") === n.label.replace(/[{}$]/g, ""))
    );
    if (!isDuplicate) {
      uniqueNodes.push(n);
    }
  }

  // B. Khởi tạo vị trí & hướng vector offset ban đầu
  interface LayoutNode {
    id: string;
    origVx: number;
    origVy: number;
    initDx: number;
    initDy: number;
    x: number;
    y: number;
    label: string;
    isBadge?: boolean;
    isFixed?: boolean;
    isExplicitShifted?: boolean;
  }

  const layoutNodes: LayoutNode[] = uniqueNodes.map((node, idx) => {
    const vx = toSvgX(node.x);
    const vy = toSvgY(node.y);

    if (node.isFixed || node.isExplicitShifted) {
      return {
        id: node.id || `node_${idx}`,
        origVx: vx,
        origVy: vy,
        initDx: 0,
        initDy: 0,
        x: vx,
        y: vy,
        label: node.label,
        isBadge: node.isBadge,
        isFixed: true,
        isExplicitShifted: true,
      };
    }

    let offsetX = 0;
    let offsetY = 0;
    const pos = (node.pos || "").toLowerCase();

    const numAngle = parseFloat(pos);
    if (!isNaN(numAngle) && !pos.includes("above") && !pos.includes("below") && !pos.includes("left") && !pos.includes("right")) {
      const rad = (numAngle * Math.PI) / 180;
      offsetX = Math.cos(rad) * 17;
      offsetY = -Math.sin(rad) * 17;
    } else {
      if (pos.includes("left")) offsetX -= 17;
      if (pos.includes("right")) offsetX += 17;
      if (pos.includes("above")) offsetY -= 17;
      if (pos.includes("below")) offsetY += 17;

      // Nếu không có hướng rõ ràng, tìm hướng ra ngoài dựa trên các đường nối tới đỉnh
      if (offsetX === 0 && offsetY === 0) {
        let sumDx = 0;
        let sumDy = 0;
        let edgeCount = 0;
        paths.forEach((p) => {
          if (p.points) {
            for (let i = 0; i < p.points.length; i++) {
              const pt = p.points[i];
              if (Math.hypot(pt.x - node.x, pt.y - node.y) < 0.05) {
                if (i > 0) {
                  const prev = p.points[i - 1];
                  const dX = toSvgX(prev.x) - vx;
                  const dY = toSvgY(prev.y) - vy;
                  const len = Math.hypot(dX, dY) || 1;
                  sumDx += dX / len;
                  sumDy += dY / len;
                  edgeCount++;
                }
                if (i < p.points.length - 1) {
                  const next = p.points[i + 1];
                  const dX = toSvgX(next.x) - vx;
                  const dY = toSvgY(next.y) - vy;
                  const len = Math.hypot(dX, dY) || 1;
                  sumDx += dX / len;
                  sumDy += dY / len;
                  edgeCount++;
                }
              }
            }
          }
        });

        if (edgeCount > 0 && Math.hypot(sumDx, sumDy) > 0.05) {
          // Hướng ra phía ngoài ngược với các cạnh nối
          const len = Math.hypot(sumDx, sumDy);
          offsetX = -(sumDx / len) * 17;
          offsetY = -(sumDy / len) * 17;
        } else {
          offsetY = -17; // Mặc định phía trên
        }
      }
    }

    return {
      id: node.id || `node_${idx}`,
      origVx: vx,
      origVy: vy,
      initDx: offsetX,
      initDy: offsetY,
      x: vx + offsetX,
      y: vy + offsetY,
      label: node.label,
      isBadge: node.isBadge,
      isFixed: false,
      isExplicitShifted: false,
    };
  });

  // C. Thuật toán kiểm tra và phân giải khoảng cách tối thiểu (Minimum Distance & Repulsion Relaxation)
  const MIN_NODE_DIST = 26; // Khoảng cách tối thiểu giữa 2 nhãn điểm
  const MIN_VERTEX_DIST = 14; // Khoảng cách tối thiểu từ nhãn tới bất kỳ đỉnh nào khác

  for (let iter = 0; iter < 10; iter++) {
    // 1. Đẩy lùi va chạm giữa các nhãn điểm
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const n1 = layoutNodes[i];
        const n2 = layoutNodes[j];
        const dX = n2.x - n1.x;
        const dY = n2.y - n1.y;
        const dist = Math.hypot(dX, dY) || 0.001;
        if (dist < MIN_NODE_DIST) {
          const overlap = MIN_NODE_DIST - dist;
          const uX = dX / dist;
          const uY = dY / dist;
          if (n1.isFixed && n2.isFixed) {
            // Cả hai cố định, không di chuyển
          } else if (n1.isFixed) {
            n2.x += uX * overlap;
            n2.y += uY * overlap;
          } else if (n2.isFixed) {
            n1.x -= uX * overlap;
            n1.y -= uY * overlap;
          } else {
            n1.x -= uX * overlap * 0.5;
            n1.y -= uY * overlap * 0.5;
            n2.x += uX * overlap * 0.5;
            n2.y += uY * overlap * 0.5;
          }
        }
      }
    }

    // 2. Tránh đè lên các đỉnh khác trong hình vẽ
    for (let i = 0; i < layoutNodes.length; i++) {
      const item = layoutNodes[i];
      if (item.isFixed || item.isExplicitShifted) continue;
      for (const pt of allPoints) {
        const pSvgX = toSvgX(pt.x);
        const pSvgY = toSvgY(pt.y);
        // Không xét đỉnh gốc của chính nó
        if (Math.hypot(pSvgX - item.origVx, pSvgY - item.origVy) > 6) {
          const dX = item.x - pSvgX;
          const dY = item.y - pSvgY;
          const dist = Math.hypot(dX, dY) || 0.001;
          if (dist < MIN_VERTEX_DIST) {
            const push = (MIN_VERTEX_DIST - dist) * 0.6;
            item.x += (dX / dist) * push;
            item.y += (dY / dist) * push;
          }
        }
      }
    }

    // 3. Neo giữ khoảng cách tự nhiên với đỉnh gốc của chính nó
    for (let i = 0; i < layoutNodes.length; i++) {
      const item = layoutNodes[i];
      if (item.isFixed || item.isExplicitShifted) continue;
      const dX = item.x - item.origVx;
      const dY = item.y - item.origVy;
      const dist = Math.hypot(dX, dY) || 0.001;
      if (dist < 12) {
        const lenDir = Math.hypot(item.initDx, item.initDy) || 1;
        item.x = item.origVx + (item.initDx / lenDir) * 16;
        item.y = item.origVy + (item.initDy / lenDir) * 16;
      } else if (dist > 32) {
        item.x = item.origVx + (dX / dist) * 28;
        item.y = item.origVy + (dY / dist) * 28;
      }
    }
  }

  // D. Render các nhãn LaTeX dạng vector native tương thích 100% với Safari/WebKit trên iPhone, iPad
  layoutNodes.forEach((ln, nIdx) => {
    svgElements += formatLatexToSvgText(ln.label, ln.x, ln.y, !!ln.isBadge, nIdx);
  });

  const displayWidth = Math.min(580, width);
  const displayHeight = (displayWidth / width) * height;

  return `
    <div class="my-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-full overflow-x-auto select-none" style="touch-action: pan-y; -webkit-overflow-scrolling: touch;">
      <svg 
        id="tikz-rendered-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}" 
        width="${displayWidth.toFixed(1)}"
        height="${displayHeight.toFixed(1)}"
        style="max-width: 100%; height: auto; aspect-ratio: ${width.toFixed(1)} / ${height.toFixed(1)}; display: block; -webkit-user-select: none; user-select: none;"
        class="overflow-visible"
      >
        <defs>
          <!-- Pattern nét gạch chéo Tây Bắc (North West Lines) -->
          <pattern id="pat-nw-lines" patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="#ffffff" />
            <line x1="0" y1="0" x2="8" y2="8" stroke="#334155" stroke-width="1.1" />
            <line x1="-2" y1="6" x2="2" y2="10" stroke="#334155" stroke-width="1.1" />
            <line x1="6" y1="-2" x2="10" y2="2" stroke="#334155" stroke-width="1.1" />
          </pattern>

          <!-- Pattern nét gạch chéo Đông Bắc (North East Lines) -->
          <pattern id="pat-ne-lines" patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="#ffffff" />
            <line x1="8" y1="0" x2="0" y2="8" stroke="#334155" stroke-width="1.1" />
            <line x1="10" y1="6" x2="6" y2="10" stroke="#334155" stroke-width="1.1" />
            <line x1="2" y1="-2" x2="-2" y2="2" stroke="#334155" stroke-width="1.1" />
          </pattern>

          <!-- Pattern chấm bi (Dots) -->
          <pattern id="pat-dots" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <circle cx="3" cy="3" r="0.9" fill="#334155" />
          </pattern>

          <!-- Pattern lưới ô vuông (Grid) -->
          <pattern id="pat-grid" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#ffffff" />
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#475569" stroke-width="0.8"/>
          </pattern>

          <!-- Pattern đan chéo (Crosshatch) -->
          <pattern id="pat-crosshatch" patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="#ffffff" />
            <line x1="0" y1="0" x2="8" y2="8" stroke="#334155" stroke-width="0.9" />
            <line x1="0" y1="8" x2="8" y2="0" stroke="#334155" stroke-width="0.9" />
          </pattern>

          <!-- Pattern sọc ngang (Horizontal Lines) -->
          <pattern id="pat-h-lines" patternUnits="userSpaceOnUse" width="8" height="6">
            <rect width="8" height="6" fill="#ffffff" />
            <line x1="0" y1="3" x2="8" y2="3" stroke="#334155" stroke-width="1.0" />
          </pattern>

          <!-- Pattern sọc dọc (Vertical Lines) -->
          <pattern id="pat-v-lines" patternUnits="userSpaceOnUse" width="6" height="8">
            <rect width="6" height="8" fill="#ffffff" />
            <line x1="3" y1="0" x2="3" y2="8" stroke="#334155" stroke-width="1.0" />
          </pattern>

          <!-- Mũi tên 2 đầu & 1 đầu stealth -->
          <marker id="tikz-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
          </marker>
          <marker id="tikz-arrow-start" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#1e293b" />
          </marker>
        </defs>
        ${svgElements}
      </svg>
    </div>
  `;
}

/**
 * Hàm utility chính thức: Tự động kiểm tra, chuẩn hóa và nạp các gói TikZ cần thiết (pgfplots, 3d, tikz-3dplot, patterns, angles, quotes, calc...)
 * trước khi render đồ họa vector SVG, đảm bảo hình vẽ phức tạp luôn ổn định và không bị gãy vỡ.
 */
export function renderTikzWithPackages(
  rawTikzCode: string,
  extraPackages: readonly string[] = DEFAULT_TIKZ_PACKAGES
): string {
  if (!rawTikzCode) return "";

  try {
    // 1. Kiểm tra và bổ sung các gói/thư viện cần thiết
    const { processedCode } = ensureTikzPackages(rawTikzCode, extraPackages);

    // 2. Render mã đã chuẩn hóa sang SVG vector
    return parseTikzToSvg(processedCode);
  } catch (error) {
    console.error("Lỗi khi render TikZ with packages:", error);
    // Fallback thử render trực tiếp
    return parseTikzToSvg(rawTikzCode);
  }
}
