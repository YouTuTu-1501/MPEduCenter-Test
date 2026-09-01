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
    label: "Xuất sắc (9.0 - 10đ)",
    shortLabel: "Xuất sắc (≥9đ)",
    min: 9.0,
    max: 10.0,
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  {
    key: "good",
    label: "Giỏi (8.0 - 8.9đ)",
    shortLabel: "Giỏi (8-8.9đ)",
    min: 8.0,
    max: 8.99,
    colorClass: "text-blue-700",
    bgClass: "bg-blue-50 border-blue-200 text-blue-800",
  },
  {
    key: "fair",
    label: "Khá (6.5 - 7.9đ)",
    shortLabel: "Khá (6.5-7.9đ)",
    min: 6.5,
    max: 7.99,
    colorClass: "text-indigo-700",
    bgClass: "bg-indigo-50 border-indigo-200 text-indigo-800",
  },
  {
    key: "average",
    label: "Trung bình (5.0 - 6.4đ)",
    shortLabel: "Trung bình (5-6.4đ)",
    min: 5.0,
    max: 6.49,
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-200 text-amber-800",
  },
  {
    key: "needs_work",
    label: "Cần cố gắng (< 5.0đ)",
    shortLabel: "Yếu / Dưới 5đ",
    min: 0.0,
    max: 4.99,
    colorClass: "text-rose-700",
    bgClass: "bg-rose-50 border-rose-200 text-rose-800",
  },
];

export function isScoreInTier(score: number, tier: ScoreTierKey): boolean {
  if (tier === "all") return true;
  const targetTier = SCORE_TIERS.find((t) => t.key === tier);
  if (!targetTier) return true;
  return score >= targetTier.min && score <= targetTier.max;
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
