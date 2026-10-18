// Reusable utilities for intelligent, accent-insensitive Vietnamese filtering and sorting

export function removeVietnameseAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

export function matchSearchQuery(
  query: string,
  ...fields: (string | number | undefined | null)[]
): boolean {
  if (!query || !query.trim()) return true;
  const cleanQuery = removeVietnameseAccents(query);
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const combinedFields = fields
    .filter((f) => f !== undefined && f !== null)
    .map((f) => removeVietnameseAccents(String(f)))
    .join(" ");

  // Tất cả các từ khóa tìm kiếm đều phải xuất hiện trong dữ liệu
  return queryTokens.every((token) => combinedFields.includes(token));
}

export type ScoreTierKey = "all" | "excellent" | "good" | "fair" | "average" | "needs_work";

export interface ScoreTier {
  key: ScoreTierKey;
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  colorClass: string;
  bgClass: string;
}

export const SCORE_TIERS: ScoreTier[] = [
  {
    key: "excellent",
    label: "Xuất sắc (≥90% • 9.0 - 10đ)",
    shortLabel: "Xuất sắc (≥90%)",
    min: 9.0,
    max: 10.0,
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  {
    key: "good",
    label: "Giỏi (80% - 89% • 8.0 - 8.9đ)",
    shortLabel: "Giỏi (80-89%)",
    min: 8.0,
    max: 8.99,
    colorClass: "text-blue-700",
    bgClass: "bg-blue-50 border-blue-200 text-blue-800",
  },
  {
    key: "fair",
    label: "Khá (65% - 79% • 6.5 - 7.9đ)",
    shortLabel: "Khá (65-79%)",
    min: 6.5,
    max: 7.99,
    colorClass: "text-indigo-700",
    bgClass: "bg-indigo-50 border-indigo-200 text-indigo-800",
  },
  {
    key: "average",
    label: "Trung bình (50% - 64% • 5.0 - 6.4đ)",
    shortLabel: "Trung bình (50-64%)",
    min: 5.0,
    max: 6.49,
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-200 text-amber-800",
  },
  {
    key: "needs_work",
    label: "Cần cố gắng (< 50% • < 5.0đ)",
    shortLabel: "Cần cố gắng (<50%)",
    min: 0.0,
    max: 4.99,
    colorClass: "text-rose-700",
    bgClass: "bg-rose-50 border-rose-200 text-rose-800",
  },
];

export function calculatePercentage(score: number, maxScore: number = 10): number {
  if (!maxScore || maxScore <= 0) return 0;
  return Number(Math.min(100, Math.max(0, (score / maxScore) * 100)).toFixed(1));
}

export function calculateStandardizedScore(score: number, maxScore: number = 10): number {
  if (!maxScore || maxScore <= 0) return 0;
  return Number(Math.min(10, Math.max(0, (score / maxScore) * 10)).toFixed(2));
}

export function isScoreInTier(score: number, tier: ScoreTierKey, maxScore: number = 10): boolean {
  if (tier === "all") return true;
  const targetTier = SCORE_TIERS.find((t) => t.key === tier);
  if (!targetTier) return true;
  const normalizedScore =
    maxScore && maxScore > 0 && maxScore !== 10
      ? (score / maxScore) * 10
      : score;
  return normalizedScore >= targetTier.min && normalizedScore <= targetTier.max;
}

export function extractGradeFromClass(cls?: string): string | null {
  if (!cls) return null;
  const c = cls.trim();
  if (c.startsWith("12")) return "Lớp 12";
  if (c.startsWith("11")) return "Lớp 11";
  if (c.startsWith("10")) return "Lớp 10";
  if (c.startsWith("9")) return "Lớp 9";
  if (c.startsWith("8")) return "Lớp 8";
  if (c.startsWith("7")) return "Lớp 7";
  if (c.startsWith("6")) return "Lớp 6";
  return null;
}

/**
 * So khớp lớp học chuẩn xác, logic và tự nhiên:
 * - filterClass = "all" hoặc để trống -> hiển thị tất cả
 * - filterClass là toàn khối (ví dụ: "Lớp 12", "Khối 12", "12") -> lọc đúng học sinh khối 12 (12A1, 12A2, 12A1-HV...)
 * - filterClass là một lớp cụ thể (ví dụ: "12A1-HV", "Lớp 12A1-HV") -> CHỈ lọc học sinh lớp đó, không nhận nhầm lớp khác!
 */
export function matchClassFilter(
  studentClass: string | undefined | null,
  filterClass: string | undefined | null
): boolean {
  if (!filterClass || filterClass === "all" || filterClass === "Tất cả các lớp") {
    return true;
  }
  if (!studentClass || !studentClass.trim()) {
    return false;
  }

  const s = studentClass.trim().toLowerCase();
  const f = filterClass.trim().toLowerCase();

  // 1. So khớp tuyệt đối trực tiếp
  if (s === f) return true;

  // Chuẩn hóa loại bỏ tiền tố "lớp", "khối" và khoảng trắng dư thừa
  const sNorm = s.replace(/^(?:lớp|khối)\s*/i, "").trim();
  const fNorm = f.replace(/^(?:lớp|khối)\s*/i, "").trim();

  // 2. So khớp sau khi chuẩn hóa tiền tố (ví dụ "Lớp 12A1-HV" khớp với "12A1-HV")
  if (sNorm === fNorm) return true;

  // 3. Kiểm tra xem bộ lọc có phải là lọc TOÀN KHỐI (chỉ gồm chữ số: "12", "11", "10", "9", "8", "7", "6") hay không:
  const isEntireGradeFilter = /^\d+$/.test(fNorm);
  if (isEntireGradeFilter) {
    const sGradeMatch = sNorm.match(/^\d+/);
    if (sGradeMatch && sGradeMatch[0] === fNorm) {
      return true;
    }
  }

  return false;
}

/**
 * So khớp đề thi với bộ lọc Lớp / Khối một cách logic, chuẩn xác và đơn giản:
 * - filterClass = "all" hoặc "Tất cả các lớp" -> Khớp tất cả
 * - filterClass là toàn khối ("12", "Lớp 12", "Khối 12"):
 *   -> Khớp mọi đề thuộc khối 12 (kể cả đề chung toàn khối và đề chỉ định riêng cho 12A1, 12A2...)
 * - filterClass là một lớp cụ thể ("12A1", "12A1-HV"):
 *   -> Khớp các đề chỉ định cụ thể cho lớp đó ("12A1")
 *   -> Khớp các đề chung của khối đó ("Tất cả các lớp" hoặc không giới hạn lớp, thuộc Lớp 12)
 *   -> TUYỆT ĐỐI KHÔNG khớp với các đề chỉ định riêng cho lớp khác (ví dụ đề dành cho "12A2" sẽ không hiển thị khi chọn lọc "12A1")
 */
export function matchExamClassFilter(
  exam: { grade?: string; targetClass?: string },
  filterClass: string | undefined | null
): boolean {
  if (!filterClass || filterClass === "all" || filterClass === "Tất cả các lớp") {
    return true;
  }

  const fNorm = filterClass.trim().toLowerCase().replace(/^(?:lớp|khối)\s*/i, "");
  const isEntireGradeFilter = /^\d+$/.test(fNorm);

  const examGradeNum = exam.grade ? exam.grade.match(/\d+/)?.[0] : null;
  const examTargetClassNorm = exam.targetClass
    ? exam.targetClass.trim().toLowerCase().replace(/^(?:lớp|khối)\s*/i, "")
    : null;

  // 1. Khi chọn lọc Toàn Khối (ví dụ: "12", "Lớp 12", "Khối 12"):
  if (isEntireGradeFilter) {
    if (examGradeNum === fNorm) return true;
    if (examTargetClassNorm && examTargetClassNorm.startsWith(fNorm)) return true;
    return false;
  }

  // 2. Khi chọn lọc một Lớp cụ thể (ví dụ: "12A1", "12A1-HV"):
  // Nếu đề thi có chỉ định đích danh một lớp cụ thể (không phải "Tất cả các lớp"):
  if (
    examTargetClassNorm &&
    examTargetClassNorm !== "tat ca cac lop" &&
    examTargetClassNorm !== "all" &&
    examTargetClassNorm !== ""
  ) {
    return examTargetClassNorm === fNorm;
  }

  // Nếu đề mở chung cho toàn khối ("Tất cả các lớp"):
  const filterGradeNum = fNorm.match(/^\d+/)?.[0];
  if (filterGradeNum && examGradeNum && filterGradeNum === examGradeNum) {
    return true;
  }

  return false;
}

/**
 * Tìm kiếm đề thi thông minh: hỗ trợ tìm theo Tên đề, Mã đề (chuẩn & gạch nối), Chương, Khối lớp, Lớp áp dụng, Môn học, Tác giả
 * Tự động bỏ dấu tiếng Việt, tìm theo từng từ khóa (token-based search)
 */
export function matchExamSearch(exam: any, query: string): boolean {
  if (!query || !query.trim()) return true;
  return matchSearchQuery(
    query,
    exam.title,
    exam.code,
    exam.chapter,
    exam.grade,
    exam.targetClass,
    exam.subject,
    exam.author,
    exam.description
  );
}

