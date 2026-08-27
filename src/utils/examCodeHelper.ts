/**
 * Tiện ích quản lý và chuẩn hóa Mã đề thi theo quy luật [lớp][chương][bài][lần]
 * Ví dụ: 12-01-14-01 nghĩa là: Lớp 12, Chương 1, Bài số 14, Lần kiểm tra thứ 1.
 */

export interface ExamCodeStructure {
  gradeNum: string; // "12", "11", "10"
  chapterNum: string; // "01", "02"...
  lessonNum: string; // "14", "01"...
  attemptNum: string; // "01", "02"...
  // Convenience aliases for flexible consumption
  grade: string;
  chapter: string;
  lesson: string;
  attempt: string;
  lessonNumber: string;
  attemptNumber: string;
  rawCode: string;
  formattedCode: string; // "12-01-14-01"
  isValid: boolean;
  isStandard: boolean;
  explanation: string; // "Lớp 12 • Chương 1 • Bài số 14 • Lần kiểm tra thứ 1"
}

/**
 * Hàm pad 2 chữ số (ví dụ: 1 -> "01", 14 -> "14")
 */
export const pad2 = (val: string | number | undefined | null, defaultVal: string = "01"): string => {
  if (val === undefined || val === null) return defaultVal;
  const clean = String(val).trim().replace(/\D/g, "");
  if (!clean) return defaultVal;
  const num = parseInt(clean, 10);
  if (isNaN(num)) return defaultVal;
  return num < 10 ? `0${num}` : `${num}`;
};

/**
 * Trích xuất số lớp từ tên khối lớp (ví dụ: "Lớp 12" -> "12", "12A1" -> "12", "10" -> "10", 12 -> "12")
 */
export const extractGradeNumber = (gradeStr?: string | number): string => {
  if (gradeStr === undefined || gradeStr === null) return "12";
  if (typeof gradeStr === "number") return pad2(gradeStr, "12");
  const str = String(gradeStr).trim();
  if (!str) return "12";
  if (/^\d{1,2}$/.test(str)) {
    return pad2(str, "12");
  }
  const match = str.match(/(?:Lớp\s*|Khối\s*|Grade\s*|G)?(\d{1,2})/i);
  if (match && match[1]) {
    return pad2(match[1], "12");
  }
  return "12";
};

/**
 * Trích xuất số chương từ tên chương (ví dụ: "Chương 2: Vectơ..." -> "02", "Chương 1" -> "01", "2" -> "02", 2 -> "02")
 */
export const extractChapterNumber = (chapterStr?: string | number): string => {
  if (chapterStr === undefined || chapterStr === null) return "01";
  if (typeof chapterStr === "number") return pad2(chapterStr, "01");
  const str = String(chapterStr).trim();
  if (!str) return "01";
  if (/^\d{1,2}$/.test(str)) {
    return pad2(str, "01");
  }
  const match = str.match(/(?:Chương\s*số|Chương|Chapter|Ch|C)\s*(\d{1,2})/i);
  if (match && match[1]) {
    return pad2(match[1], "01");
  }
  const anyNum = str.match(/(\d{1,2})/);
  if (anyNum && anyNum[1]) {
    return pad2(anyNum[1], "01");
  }
  return "01";
};

/**
 * Trích xuất số bài từ tiêu đề hoặc chuỗi bài (ví dụ: "09" -> "09", "9" -> "09", "Bài 14: Khảo sát..." -> "14", "Bài số 14" -> "14", "bài 09" -> "09", 14 -> "14")
 */
export const extractLessonNumber = (lessonOrTitleStr?: string | number): string => {
  if (lessonOrTitleStr === undefined || lessonOrTitleStr === null) return "01";
  if (typeof lessonOrTitleStr === "number") return pad2(lessonOrTitleStr, "01");
  const str = String(lessonOrTitleStr).trim();
  if (!str) return "01";

  // Nhập trực tiếp số (ví dụ: "09", "9", "14")
  if (/^\d{1,2}$/.test(str)) {
    return pad2(str, "01");
  }

  // Khớp tiền tố có chữ Bài, Bài số, Lesson, B, L (ví dụ: "Bài 09", "Bài 9", "Bài số 14", "Lesson 3", "B09", "bài 09")
  const match = str.match(/(?:Bài\s*số|Bài|Lesson|B|L)\s*(\d{1,2})/i);
  if (match && match[1]) {
    return pad2(match[1], "01");
  }

  // Khớp bất kỳ cụm số nào trong chuỗi
  const anyNum = str.match(/(\d{1,2})/);
  if (anyNum && anyNum[1]) {
    return pad2(anyNum[1], "01");
  }

  return "01";
};

/**
 * Trích xuất số lần kiểm tra từ chuỗi (ví dụ: "02" -> "02", "2" -> "02", "Lần 1" -> "01", "Lần 2" -> "02", "Lần 02" -> "02", 2 -> "02")
 */
export const extractAttemptNumber = (attemptOrTitleStr?: string | number): string => {
  if (attemptOrTitleStr === undefined || attemptOrTitleStr === null) return "01";
  if (typeof attemptOrTitleStr === "number") return pad2(attemptOrTitleStr, "01");
  const str = String(attemptOrTitleStr).trim();
  if (!str) return "01";

  // Nhập hoặc chọn trực tiếp số (ví dụ: "02", "2", "01", "3")
  if (/^\d{1,2}$/.test(str)) {
    return pad2(str, "01");
  }

  // Khớp tiền tố Lần kiểm tra, Lần thi, Lần, Attempt, Đợt (ví dụ: "Lần 02", "Lần 2", "Lần thi 03", "Lần kiểm tra 1", "Đợt 2")
  const match = str.match(/(?:Lần\s*kiểm\s*tra|Lần\s*thi|Lần|Attempt|Đợt|L)\s*(\d{1,2})/i);
  if (match && match[1]) {
    return pad2(match[1], "01");
  }

  // Khớp bất kỳ cụm số nào trong chuỗi
  const anyNum = str.match(/(\d{1,2})/);
  if (anyNum && anyNum[1]) {
    return pad2(anyNum[1], "01");
  }

  return "01";
};

/**
 * Tạo mã đề thi chuẩn theo quy luật [lớp][chương][bài][lần]
 * @example generateStandardExamCode({ grade: "Lớp 12", chapter: "Chương 1", lesson: 14, attempt: 1 }) => "12-01-14-01"
 * @example generateStandardExamCode({ grade: "Lớp 12", chapter: "Chương 1", lesson: "09", attempt: "02" }) => "12-01-09-02"
 */
export const generateStandardExamCode = (params: {
  grade?: string | number;
  chapter?: string | number;
  lesson?: string | number;
  attempt?: string | number;
}): string => {
  const g = extractGradeNumber(params.grade ?? "12");
  const c = extractChapterNumber(params.chapter ?? "01");
  const l = extractLessonNumber(params.lesson ?? "01");
  const a = extractAttemptNumber(params.attempt ?? "01");

  return `${g}-${c}-${l}-${a}`;
};

/**
 * Phân tích và giải nghĩa mã đề thi theo quy luật [lớp][chương][bài][lần]
 */
export const parseStandardExamCode = (codeStr: string): ExamCodeStructure => {
  if (!codeStr || !codeStr.trim()) {
    return {
      gradeNum: "12",
      chapterNum: "01",
      lessonNum: "01",
      attemptNum: "01",
      grade: "12",
      chapter: "01",
      lesson: "01",
      attempt: "01",
      lessonNumber: "01",
      attemptNumber: "01",
      rawCode: "",
      formattedCode: "12-01-01-01",
      isValid: false,
      isStandard: false,
      explanation: "Chưa có mã đề thi",
    };
  }

  const raw = codeStr.trim();
  // Trường hợp chuẩn: có dấu gạch ngang (ví dụ: "12-01-14-01", "12-1-14-1")
  const dashParts = raw.split(/[-_./\s]+/);
  if (dashParts.length === 4) {
    const g = pad2(dashParts[0], "12");
    const c = pad2(dashParts[1], "01");
    const l = pad2(dashParts[2], "01");
    const a = pad2(dashParts[3], "01");
    const formatted = `${g}-${c}-${l}-${a}`;
    return {
      gradeNum: g,
      chapterNum: c,
      lessonNum: l,
      attemptNum: a,
      grade: g,
      chapter: c,
      lesson: l,
      attempt: a,
      lessonNumber: l,
      attemptNumber: a,
      rawCode: raw,
      formattedCode: formatted,
      isValid: true,
      isStandard: true,
      explanation: `Lớp ${parseInt(g, 10)} • Chương ${parseInt(c, 10)} • Bài số ${parseInt(l, 10)} • Lần kiểm tra thứ ${parseInt(a, 10)}`,
    };
  }

  // Trường hợp chuỗi số liên tiếp 8 chữ số: "12011401"
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length === 8) {
    const g = digitsOnly.slice(0, 2);
    const c = digitsOnly.slice(2, 4);
    const l = digitsOnly.slice(4, 6);
    const a = digitsOnly.slice(6, 8);
    const formatted = `${g}-${c}-${l}-${a}`;
    return {
      gradeNum: g,
      chapterNum: c,
      lessonNum: l,
      attemptNum: a,
      grade: g,
      chapter: c,
      lesson: l,
      attempt: a,
      lessonNumber: l,
      attemptNumber: a,
      rawCode: raw,
      formattedCode: formatted,
      isValid: true,
      isStandard: true,
      explanation: `Lớp ${parseInt(g, 10)} • Chương ${parseInt(c, 10)} • Bài số ${parseInt(l, 10)} • Lần kiểm tra thứ ${parseInt(a, 10)}`,
    };
  }

  // Trường hợp mã cũ hoặc dạng khác (fallback tự động parse tốt nhất)
  let g = "12";
  let c = "01";
  let l = "01";
  let a = "01";

  if (dashParts.length >= 2) {
    g = pad2(dashParts[0], "12");
    c = pad2(dashParts[1], "01");
    if (dashParts[2]) l = pad2(dashParts[2], "01");
    if (dashParts[3]) a = pad2(dashParts[3], "01");
  }

  const formatted = `${g}-${c}-${l}-${a}`;
  return {
    gradeNum: g,
    chapterNum: c,
    lessonNum: l,
    attemptNum: a,
    grade: g,
    chapter: c,
    lesson: l,
    attempt: a,
    lessonNumber: l,
    attemptNumber: a,
    rawCode: raw,
    formattedCode: formatted,
    isValid: false,
    isStandard: false,
    explanation: `Mã tùy biến: ${raw} (Quy đổi chuẩn: Lớp ${parseInt(g, 10)} • Chương ${parseInt(c, 10)} • Bài ${parseInt(l, 10)} • Lần ${parseInt(a, 10)})`,
  };
};

/**
 * Kiểm tra xem mã đề học sinh nhập có khớp với mã đề của đề thi không (hỗ trợ nhập linh hoạt có/không có dấu gạch)
 */
export const isExamCodeMatch = (inputCode: string, examCode: string): boolean => {
  if (!inputCode || !examCode) return false;
  const cleanInput = inputCode.trim().toLowerCase().replace(/[-_./\s]/g, "");
  const cleanExam = examCode.trim().toLowerCase().replace(/[-_./\s]/g, "");

  if (cleanInput === cleanExam) return true;

  // So sánh nguyên bản
  if (inputCode.trim().toLowerCase() === examCode.trim().toLowerCase()) return true;

  // So sánh sau khi chuẩn hóa mã
  const parsedInput = parseStandardExamCode(inputCode);
  const parsedExam = parseStandardExamCode(examCode);

  return parsedInput.formattedCode === parsedExam.formattedCode;
};
