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
}

/**
 * Danh sách các gói (packages) và thư viện TikZ phổ biến được hỗ trợ tự động
 */
export const SUPPORTED_TIKZ_LIBRARIES = [
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
  "decorations.pathmorphing",
  "decorations.markings",
  "backgrounds",
  "fit",
  "matrix",
  "scopes",
  "chains",
  "babel",
] as const;

/**
 * Hàm phát hiện các gói (packages) và thư viện TikZ cần thiết từ đoạn mã
 */
export function detectRequiredTikzPackages(tikzCode: string): string[] {
  if (!tikzCode) return [];
  const detected = new Set<string>();

  // 1. Gói patterns / patterns.meta
  if (
    /pattern\s*=|pattern\s+color|north\s+west\s+lines|north\s+east\s+lines|crosshatch|dots|grid|vertical\s+lines|horizontal\s+lines/i.test(
      tikzCode
    )
  ) {
    detected.add("patterns");
    detected.add("patterns.meta");
  }

  // 2. Gói angles
  if (
    /pic\s*(?:\[|\{)|angle\s*=|angle\s+radius|angle\s+eccentricity|right\s+angle\s*=|\\tkzMarkAngle|\\tkzMarkRightAngle/i.test(
      tikzCode
    )
  ) {
    detected.add("angles");
  }

  // 3. Gói quotes (dùng nhãn chuỗi dạng "label" trong pic hoặc edge)
  if (
    /pic\s*\[[^\]]*["'][^"']+["'][^\]]*\]|pic\s*["'][^"']+["']|edge\s*\[[^\]]*["']/i.test(
      tikzCode
    )
  ) {
    detected.add("quotes");
    detected.add("angles"); // quotes thường đi kèm angles trong TikZ
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

  // 8. Gói 3d / perspective
  if (/canvas\s+is|3d|perspective|xyz\s+cylindrical/i.test(tikzCode)) {
    detected.add("3d");
    detected.add("perspective");
  }

  // 9. Thư viện tkz-euclide nếu chứa macro tkz
  if (/\\tkz[A-Z][a-zA-Z]+/i.test(tikzCode)) {
    detected.add("tkz-euclide");
  }

  return Array.from(detected);
}

/**
 * Hàm kiểm tra, chuẩn hóa và tự động bổ sung các gói thư viện TikZ cần thiết (như patterns, angles, quotes, calc)
 * Đảm bảo các đoạn mã TikZ phức tạp luôn ổn định và tương thích trước khi render
 */
export function ensureTikzPackages(
  tikzCode: string,
  extraRequiredPackages: string[] = ["patterns", "angles", "quotes", "calc", "arrows.meta", "positioning"]
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

  // Lọc các thư viện còn thiếu
  const missingLibs = Array.from(allNeeded).filter((lib) => !existingLibs.has(lib));

  // Tạo dòng header khai báo thư viện chuẩn LaTeX
  const injectedHeader =
    missingLibs.length > 0 ? `\\usetikzlibrary{${missingLibs.join(", ")}}\n` : "";

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
  clean = clean.replace(/cm|in|deg|\\degree|^\s*\{|\}\s*$/g, "").trim();

  // Chuẩn hóa số thập phân khuyết 0 ở đầu: .5 -> 0.5, -.5 -> -0.5
  clean = clean.replace(/(^|[\s,(\[+\-*\/])\.(\d+)/g, "$1 0.$2");
  clean = clean.replace(/(^|[\s,(\[+\-*\/])-\.(\d+)/g, "$1 -0.$2");

  // Thay thế các hàm & hằng số toán
  clean = clean.replace(/\\pi\b|pi\b/g, "Math.PI");
  clean = clean.replace(/\\sqrt\{([^}]+)\}/g, "Math.sqrt($1)");
  clean = clean.replace(/sqrt\(([^)]+)\)/g, "Math.sqrt($1)");
  clean = clean.replace(/\\sin\(([^)]+)\)/g, "Math.sin(($1) * Math.PI / 180)");
  clean = clean.replace(/sin\(([^)]+)\)/g, "Math.sin(($1) * Math.PI / 180)");
  clean = clean.replace(/\\cos\(([^)]+)\)/g, "Math.cos(($1) * Math.PI / 180)");
  clean = clean.replace(/cos\(([^)]+)\)/g, "Math.cos(($1) * Math.PI / 180)");
  clean = clean.replace(/\\tan\(([^)]+)\)/g, "Math.tan(($1) * Math.PI / 180)");
  clean = clean.replace(/tan\(([^)]+)\)/g, "Math.tan(($1) * Math.PI / 180)");
  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "(($1)/($2))");
  clean = clean.replace(/\^/g, "**");

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
 * Tính góc (độ) từ vector (dx, dy)
 */
function getAngleDeg(dx: number, dy: number): number {
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
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
 * Parse tọa độ dạng (x,y), (x,y,z), (angle:radius), ($(A)!0.5!(B)$), ($(B)+(E)-(A)$), ($(O)+(0,5)$)...
 */
export function parseCoordinateValue(coordStr: string, coordsMap: Map<string, Point2D>): Point2D | null {
  if (!coordStr) return null;
  const str = cleanCoordStr(coordStr);
  if (!str) return null;

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

  // 5. Tọa độ cực: (angle:radius) hoặc (-90:4mm)
  if (str.includes(":")) {
    const parts = str.split(":");
    const angleDeg = evaluateExpr(parts[0]);
    const r = evaluateExpr(parts[1]);
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: r * Math.cos(rad),
      y: r * Math.sin(rad),
    };
  }

  // 6. Tọa độ Descartes: (x, y) hoặc (x, y, z)
  const parts = str.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    if (parts.length === 3) {
      const x3d = evaluateExpr(parts[0]);
      const y3d = evaluateExpr(parts[1]);
      const z3d = evaluateExpr(parts[2]);
      const angle = Math.PI / 4;
      const factor = 0.45;
      return {
        x: y3d - x3d * Math.cos(angle) * factor,
        y: z3d - x3d * Math.sin(angle) * factor,
      };
    }

    return {
      x: evaluateExpr(parts[0]),
      y: evaluateExpr(parts[1]),
    };
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
 * Loại bỏ các khối node[...] {...} và pic[...] {...} lồng nhau ra khỏi chuỗi lệnh TikZ
 */
export function stripNodesAndPics(cmd: string): string {
  let result = "";
  let i = 0;
  while (i < cmd.length) {
    const sub = cmd.substring(i);
    const nodePicMatch = sub.match(/^(?:node|pic)\b(?:\s*\[[^\]]*\])?\s*(?:\([^\)]*\))?\s*/);
    if (nodePicMatch) {
      const matchLen = nodePicMatch[0].length;
      const braceStart = i + matchLen;
      if (cmd[braceStart] === "{") {
        const bal = extractBalancedBraces(cmd, braceStart);
        if (bal) {
          i = bal.endIndex + 1;
          continue;
        }
      }
    }
    result += cmd[i];
    i++;
  }
  return result;
}

/**
 * Trích xuất nhãn LaTeX và render qua KaTeX một cách an toàn
 */
export function renderLatexLabel(rawLabel: string): string {
  let label = rawLabel.trim();
  if (!label) return "";

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
 * Hàm phân tích và dựng hình từ mã TikZ / tkz-euclide sang SVG vector
 */
export function parseTikzToSvg(rawTikzCode: string): string {
  if (!rawTikzCode) return "";

  // 0. Nếu là bảng biến thiên / bảng xét dấu tkz-tab, phân tích bảng trực tiếp
  if (rawTikzCode.includes("\\tkzTabInit")) {
    const tableHtml = parseTkzTab(rawTikzCode);
    if (tableHtml) return tableHtml;
  }

  // 1. Mở rộng tất cả vòng lặp \foreach trước khi phân tích
  const expandedCode = expandTikzForeach(rawTikzCode);

  // 2. Chuẩn hóa dòng, loại bỏ chú thích % (trừ \%)
  const cleanCode = expandedCode
    .split("\n")
    .map((line) => {
      const commentIdx = line.search(/(?<!\\)%/);
      return commentIdx !== -1 ? line.substring(0, commentIdx) : line;
    })
    .join(" ");

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

  // 8. \tkzMarkAngle & \tkzMarkRightAngle
  const tkzMarkAngleMatches = cleanCode.matchAll(/\\tkzMarkAngle(?:\s*\[([^\]]*)\])?\s*\(([^,]+),([^,]+),([^)]+)\)/g);
  for (const match of tkzMarkAngleMatches) {
    const optStr = match[1] || "";
    const p1 = coordsMap.get(match[2].trim());
    const vertex = coordsMap.get(match[3].trim());
    const p2 = coordsMap.get(match[4].trim());
    if (p1 && vertex && p2) {
      const isDouble = optStr.includes("arc=ll") || optStr.includes("arc=2");
      let size = 0.65;
      const sizeMatch = optStr.match(/size\s*=\s*([0-9.]+\s*(?:mm|cm|pt)?)/);
      if (sizeMatch) size = evaluateExpr(sizeMatch[1]) || 0.65;
      angleMarks.push({
        p1,
        vertex,
        p2,
        size,
        doubleArc: isDouble,
        color: "#475569",
      });
    }
  }

  const tkzMarkRightAngleMatches = cleanCode.matchAll(
    /\\tkzMarkRightAngles?(?:\s*\[([^\]]*)\])?\s*\(([^,]+),([^,]+),([^)]+)\)/g
  );
  for (const match of tkzMarkRightAngleMatches) {
    const optStr = match[1] || "";
    const p1 = coordsMap.get(match[2].trim());
    const vertex = coordsMap.get(match[3].trim());
    const p2 = coordsMap.get(match[4].trim());
    if (p1 && vertex && p2) {
      let size = 0.3;
      const sizeMatch = optStr.match(/size\s*=\s*([0-9.]+\s*(?:mm|cm|pt)?)/);
      if (sizeMatch) size = evaluateExpr(sizeMatch[1]) || 0.3;
      angleMarks.push({
        p1,
        vertex,
        p2,
        size,
        isRightAngle: true,
        color: "#1e293b",
      });
    }
  }

  // ==========================================
  // B. PARSER CHO LỆNH TIKZ TIÊU CHUẨN
  // ==========================================

  const commands = cleanCode
    .replace(/\\usetikzlibrary\{[^}]*\}/gi, "")
    .replace(/\\usepackage(?:\s*\[[^\]]*\])?\{[^}]*\}/gi, "")
    .replace(/\\begin\{tikzpicture\}(\[[^\]]*\])?/g, "")
    .replace(/\\end\{tikzpicture\}/g, "")
    .replace(/\\begin\{[a-zA-Z*]+\}/g, "")
    .replace(/\\end\{[a-zA-Z*]+\}/g, "")
    .split(";")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd.length > 0);

  for (const cmd of commands) {
    // 1. Chained coordinates in \path: (0,0) coordinate (E) (6,-.5) coordinate (A) ...
    const chainedCoordMatches = cmd.matchAll(/\(([^)]+)\)\s*coordinate\s*\(([^)]+)\)/g);
    for (const match of chainedCoordMatches) {
      const coordStr = match[1].trim();
      const name = match[2].trim();
      const pt = parseCoordinateValue(`(${coordStr})`, coordsMap);
      if (pt) coordsMap.set(name, pt);
    }

    // 2. \coordinate (Name) at (coord)
    const coordMatches = cmd.matchAll(/\\coordinate\s*(?:\[([^\]]*)\])?\s*\(([^)]+)\)\s*at\s*/g);
    for (const match of coordMatches) {
      const optStr = match[1] || "";
      const name = match[2].trim();
      const coordStartIndex = (match.index ?? 0) + match[0].length;
      let coordStr = "";
      if (cmd[coordStartIndex] === "(") {
        const bal = extractBalancedParens(cmd, coordStartIndex);
        if (bal) coordStr = bal.content;
      } else {
        const rest = cmd.substring(coordStartIndex).trim();
        const endIdx = rest.search(/[\s;]/);
        coordStr = endIdx !== -1 ? rest.substring(0, endIdx) : rest;
      }
      const pt = parseCoordinateValue(coordStr, coordsMap);
      if (pt) {
        coordsMap.set(name, pt);
        if (optStr.includes("label=")) {
          const lblMatch = optStr.match(/label\s*=\s*(?:([^:]+):)?\{?([^}\]]+)\}?/);
          if (lblMatch) {
            nodes.push({
              id: `coord_lbl_${name}`,
              x: pt.x,
              y: pt.y,
              pos: (lblMatch[1] || "above").trim(),
              label: lblMatch[2].trim(),
            });
          }
        }
      }
    }

    // 3. \draw pic[...] {angle=C--B--A} hoặc \pic ["$30^\circ$", draw, angle radius=6mm] {angle=C--B--A} hoặc {right angle=c--O--b}
    const picAngleMatches = cmd.matchAll(
      /pic\s*(?:\[([^\]]*)\])?\s*\{\s*(?:(?:angle|right\s*angle)\s*=\s*)?([a-zA-Z0-9_]+)\s*--\s*([a-zA-Z0-9_]+)\s*--\s*([a-zA-Z0-9_]+)\s*\}/gi
    );
    for (const match of picAngleMatches) {
      const optStr = match[1] || "";
      const isRightAngle = optStr.includes("right angle") || match[0].includes("right angle");
      const p1 = coordsMap.get(match[2].trim());
      const vertex = coordsMap.get(match[3].trim());
      const p2 = coordsMap.get(match[4].trim());

      if (p1 && vertex && p2) {
        const isDouble = optStr.includes("double");
        let radius = isRightAngle ? 0.28 : 0.55;
        const radMatch = optStr.match(/(?:angle\s+radius|radius)\s*=\s*([0-9.]+\s*(?:mm|cm|pt)?)/i);
        if (radMatch) {
          const rawRadiusVal = evaluateExpr(radMatch[1]);
          if (rawRadiusVal > 0) {
            // Nếu người dùng chỉ định angle radius=4 (đơn vị pt/mm mặc định trong TikZ)
            radius = rawRadiusVal > 1.5 ? Math.min(0.35, rawRadiusVal * 0.07) : rawRadiusVal;
          }
        }

        // Kiểm tra quotes label (gói quotes): ví dụ pic["$30^\circ$", draw]
        const quoteMatch = optStr.match(/["']([^"']+)["']/);
        const quoteLabel = quoteMatch ? quoteMatch[1].trim() : undefined;

        angleMarks.push({
          p1,
          vertex,
          p2,
          size: radius,
          doubleArc: isDouble,
          isRightAngle,
          label: quoteLabel,
          color: "#334155",
        });

        // Nếu có nhãn góc từ quotes library, đặt nhãn KaTeX ở phân giác góc
        if (quoteLabel) {
          const dx1 = p1.x - vertex.x;
          const dy1 = p1.y - vertex.y;
          const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
          const dx2 = p2.x - vertex.x;
          const dy2 = p2.y - vertex.y;
          const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

          const bisX = dx1 / len1 + dx2 / len2;
          const bisY = dy1 / len1 + dy2 / len2;
          const bisLen = Math.sqrt(bisX * bisX + bisY * bisY) || 1;

          let ecc = 1.35;
          const eccMatch = optStr.match(/angle\s+eccentricity\s*=\s*([0-9.]+)/);
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
            isBadge: false,
          });
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
          const rest = cmd.substring(cursor);
          const optM = rest.match(/^\s*\[([^\]]*)\]/);
          if (optM) {
            optParts.push(optM[1].trim());
            cursor += optM[0].length;
            continue;
          }

          const atM = rest.match(/^\s*at\s*/);
          if (atM) {
            cursor += atM[0].length;
            const atRest = cmd.substring(cursor);
            if (atRest.startsWith("(")) {
              const bal = extractBalancedParens(cmd, cursor);
              if (bal) {
                explicitPt = parseCoordinateValue(bal.content, coordsMap);
                cursor = bal.endIndex + 1;
                continue;
              }
            } else {
              const ptNameM = atRest.match(/^([a-zA-Z0-9_']+)/);
              if (ptNameM) {
                explicitPt = parseCoordinateValue(ptNameM[1], coordsMap);
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
        const pt = parseCoordinateValue(ptName, coordsMap);
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
          const rest = cmd.substring(cursor);
          const optBracketMatch = rest.match(/^\s*\[([^\]]*)\]/);
          if (optBracketMatch) {
            optParts.push(optBracketMatch[1].trim());
            cursor += optBracketMatch[0].length;
            continue;
          }

          const atMatch = rest.match(/^\s*at\s*/);
          if (atMatch) {
            cursor += atMatch[0].length;
            const atRest = cmd.substring(cursor);
            if (atRest.startsWith("(")) {
              const bal = extractBalancedParens(cmd, cursor);
              if (bal) {
                explicitAtPt = parseCoordinateValue(bal.content, coordsMap);
                cursor = bal.endIndex + 1;
                continue;
              }
            } else {
              const ptNameMatch = atRest.match(/^([a-zA-Z0-9_']+)/);
              if (ptNameMatch) {
                explicitAtPt = parseCoordinateValue(ptNameMatch[1], coordsMap);
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
        const prevTokens = extractCoordinateTokens(beforeNode, coordsMap).filter(
          (t) => !t.isCircleRadius && t.pt !== null
        );
        const nextTokens = extractCoordinateTokens(cmd.substring(afterBraceIdx), coordsMap).filter(
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
          nodes.push({
            id: nodeName || `path_node_${nodes.length}`,
            x: nodePt.x,
            y: nodePt.y,
            pos: optStr || "above",
            label,
            isBadge: optStr.includes("midway"),
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

      // Bỏ các node[midway...]{...} và pic[...] an toàn bằng hàm stripNodesAndPics
      const cleanDrawBody = stripNodesAndPics(drawBody).trim();

      const isCycle = cleanDrawBody.includes("cycle");

      // Tách các phân đoạn đường nét nối bằng -- (hỗ trợ cả tên có dấu nháy đơn như A', B', D')
      // Ví dụ: (B)--(A)--(D) (A')--(A) hoặc (A')--(B')--(C')--(D')--(A') (B')--(B) (C')--(C) (D')--(D)
      const subPaths = cleanDrawBody.split(/\s+(?=\([a-zA-Z0-9_.,'+-\s]+\)\s*--)/).filter((s) => s.trim().length > 0);

      for (const sp of subPaths) {
        const pointTokenMatches = Array.from(sp.matchAll(/\(([^)]+)\)/g));
        const pts: Point2D[] = [];
        for (const pm of pointTokenMatches) {
          const pt = parseCoordinateValue(`(${pm[1]})`, coordsMap);
          if (pt) pts.push(pt);
        }

        if (pts.length >= 2) {
          paths.push({
            type: isCycle ? "polygon" : "line",
            points: pts,
            isDashed,
            isDotted,
            hasArrowEnd,
            hasArrowStart,
            strokeColor,
            strokeWidth,
            fillColor: isExplicitFill || isCycle ? "rgba(99,102,241,0.08)" : "none",
            isCycle,
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

      svgElements += `
        <path 
          id="tikz-right-angle-${mIdx}"
          d="M ${c1x.toFixed(1)} ${c1y.toFixed(1)} L ${c2x.toFixed(1)} ${c2y.toFixed(1)} L ${c3x.toFixed(1)} ${c3y.toFixed(1)}"
          fill="none" 
          stroke="${m.color || "#1e293b"}" 
          stroke-width="1.4"
        />`;
      return;
    }

    const r = (m.size || 0.6) * unitSize;
    const angle1 = getAngleDeg(u1x, u1y);
    const angle2 = getAngleDeg(u2x, u2y);

    let diff = angle2 - angle1;
    while (diff < 0) diff += 360;
    const sweepFlag = diff <= 180 ? 0 : 1;

    const startX = vx + r * Math.cos((angle1 * Math.PI) / 180);
    const startY = vy - r * Math.sin((angle1 * Math.PI) / 180);
    const endX = vx + r * Math.cos((angle2 * Math.PI) / 180);
    const endY = vy - r * Math.sin((angle2 * Math.PI) / 180);

    svgElements += `
      <path 
        id="tikz-angle-arc-${mIdx}"
        d="M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${sweepFlag} ${endX.toFixed(1)} ${endY.toFixed(1)}"
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
          d="M ${sX2.toFixed(1)} ${sY2.toFixed(1)} A ${r2.toFixed(1)} ${r2.toFixed(1)} 0 0 ${sweepFlag} ${eX2.toFixed(1)} ${eY2.toFixed(1)}"
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
  }

  const layoutNodes: LayoutNode[] = uniqueNodes.map((node, idx) => {
    const vx = toSvgX(node.x);
    const vy = toSvgY(node.y);

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
          n1.x -= uX * overlap * 0.5;
          n1.y -= uY * overlap * 0.5;
          n2.x += uX * overlap * 0.5;
          n2.y += uY * overlap * 0.5;
        }
      }
    }

    // 2. Tránh đè lên các đỉnh khác trong hình vẽ
    for (let i = 0; i < layoutNodes.length; i++) {
      const item = layoutNodes[i];
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

  // D. Render các nhãn KaTeX lên SVG
  layoutNodes.forEach((ln, nIdx) => {
    const renderedHtml = renderLatexLabel(ln.label);

    if (ln.isBadge) {
      svgElements += `
        <foreignObject 
          id="tikz-node-badge-${nIdx}"
          x="${(ln.x - 45).toFixed(1)}" 
          y="${(ln.y - 16).toFixed(1)}" 
          width="90" 
          height="32"
          style="overflow: visible; pointer-events: none;"
        >
          <div xmlns="http://www.w3.org/1999/xhtml" class="flex items-center justify-center w-full h-full text-slate-800 font-bold text-[13px] whitespace-nowrap leading-none">
            <span class="px-2 py-0.5 bg-white/95 rounded border border-slate-200 shadow-2xs">${renderedHtml}</span>
          </div>
        </foreignObject>`;
    } else {
      svgElements += `
        <foreignObject 
          id="tikz-node-label-${nIdx}"
          x="${(ln.x - 40).toFixed(1)}" 
          y="${(ln.y - 18).toFixed(1)}" 
          width="80" 
          height="36"
          style="overflow: visible; pointer-events: none;"
        >
          <div xmlns="http://www.w3.org/1999/xhtml" class="flex items-center justify-center w-full h-full text-slate-900 font-bold text-[14px] whitespace-nowrap leading-none">
            <span class="px-1 py-0.5 bg-white/85 backdrop-blur-[0.5px] rounded drop-shadow-xs" style="text-shadow: 0 0 3px #ffffff, 0 0 5px #ffffff;">${renderedHtml}</span>
          </div>
        </foreignObject>`;
    }
  });

  return `
    <div class="my-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-full overflow-x-auto select-none">
      <svg 
        id="tikz-rendered-svg"
        viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}" 
        style="max-width: 100%; width: ${Math.min(580, width)}px; height: auto;"
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
 * Hàm utility chính thức: Tự động kiểm tra, chuẩn hóa và nạp các gói TikZ cần thiết (patterns, angles, quotes, calc...)
 * trước khi render đồ họa vector SVG, đảm bảo hình vẽ phức tạp luôn ổn định và không bị gãy vỡ.
 */
export function renderTikzWithPackages(
  rawTikzCode: string,
  extraPackages: string[] = ["patterns", "angles", "quotes", "calc", "arrows.meta", "positioning"]
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
