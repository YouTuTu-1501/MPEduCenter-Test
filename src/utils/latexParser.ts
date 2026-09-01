import { Exam, Question, QuestionType, PartType, ChoiceOption, TrueFalseItem } from "../types/exam";
import { generateStandardExamCode, parseStandardExamCode } from "./examCodeHelper";

/**
 * Parser phân tích mã LaTeX hỗ trợ 4 dạng thức câu hỏi chuẩn:
 * 1. Tự luận (\loigiai với \faCompass, \faEdit, \faExclamationTriangle)
 * 2. Đúng/Sai (\choiceTF[...]{\True ...}{...} hoặc \choiceTFt)
 * 3. Trả lời ngắn (\shortans[...]{...})
 * 4. Trắc nghiệm nhiều lựa chọn (\choice[...]{\True ...}{...})
 */
export function parseLatexExam(latexContent: string, defaultTitle: string = "Đề kiểm tra nhập từ LaTeX"): Exam {
  const lines = latexContent.split("\n");
  const questions: Question[] = [];

  let currentPart: PartType = "part_1";
  let currentPartName = "PHẦN I (Trắc nghiệm)";

  let inEx = false;
  let exContentLines: string[] = [];
  let currentExId = "";
  let questionCounter = 1;

  // Trích xuất mã đề nếu có (\tieude{...} hoặc \made{...})
  let rawExamCode = "";
  const codeMatch = latexContent.match(/\\(?:tieude|made)\{([^}]+)\}/);
  if (codeMatch) rawExamCode = codeMatch[1].trim();

  // Trích xuất tiêu đề nếu có
  let examTitle = defaultTitle;
  const titleMatch = latexContent.match(/\\(?:tenmonthi|tenkythi|title)\{([^}]+)\}/);
  if (titleMatch) examTitle = titleMatch[1].trim();

  // Trích xuất Lớp (Grade) nếu có (\lop{...} hoặc % LOP: ... hoặc từ nội dung)
  let examGrade = "Lớp 12";
  const gradeMatch =
    latexContent.match(/\\(?:lop|grade)\{([^}]+)\}/i) ||
    latexContent.match(/%\s*(?:GRADE|LOP|LỚP):\s*([^\n]+)/i);
  if (gradeMatch) {
    examGrade = gradeMatch[1].trim();
  } else if (latexContent.includes("Lớp 11") || latexContent.includes("11THPT") || latexContent.includes("Toán 11")) {
    examGrade = "Lớp 11";
  } else if (latexContent.includes("Lớp 10") || latexContent.includes("10THPT") || latexContent.includes("Toán 10")) {
    examGrade = "Lớp 10";
  }

  // Trích xuất Chương (Chapter) nếu có (\chuong{...} hoặc % CHUONG: ... hoặc % CHAPTER: ...)
  let examChapter = "";
  const chapterMatch =
    latexContent.match(/\\(?:chuong|chapter)\{([^}]+)\}/i) ||
    latexContent.match(/%\s*(?:CHAPTER|CHUONG|CHƯƠNG):\s*([^\n]+)/i);
  if (chapterMatch) {
    examChapter = chapterMatch[1].trim();
  }

  // Trích xuất Thời gian làm bài nếu có (\thoiluong{...} hoặc \thoigian{...} hoặc % THOI_GIAN: ... hoặc "Thời gian: X phút")
  let examDuration = 90;
  const durationMatch =
    latexContent.match(/\\(?:thoiluong|thoigian|duration|timeLimit)\{([^}]+)\}/i) ||
    latexContent.match(/%\s*(?:THOI_GIAN|THỜI_GIAN|THOIGIAN|DURATION|TIME):\s*([^\n]+)/i) ||
    latexContent.match(/(?:Thời gian làm bài|Thời gian|Thời lượng)\s*:\s*(\d+)\s*(?:phút|min|')/i);
  if (durationMatch) {
    const rawVal = durationMatch[1].replace(/[^0-9]/g, "");
    const parsedNum = parseInt(rawVal, 10);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      examDuration = parsedNum;
    }
  }

  // Chuẩn hóa mã đề theo quy luật [lớp][chương][bài][lần] (ví dụ: 12-01-14-01)
  let examCode = "";
  if (rawExamCode) {
    const parsed = parseStandardExamCode(rawExamCode);
    examCode = parsed.formattedCode;
  } else {
    examCode = generateStandardExamCode({
      grade: examGrade,
      chapter: examChapter || "01",
      lesson: examTitle || "01",
      attempt: 1,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Phát hiện phân chia Phần
    if (line.includes("PHẦN I") || line.includes("Phần 1") || line.includes("Phần I.")) {
      currentPart = "part_1";
      currentPartName = "PHẦN I (Trắc nghiệm)";
    } else if (line.includes("PHẦN II") || line.includes("Phần 2") || line.includes("Phần II.")) {
      currentPart = "part_2";
      currentPartName = "PHẦN II (Đúng-Sai)";
    } else if (line.includes("PHẦN III") || line.includes("Phần 3") || line.includes("Phần III.")) {
      currentPart = "part_3";
      currentPartName = "PHẦN III (Trả lời ngắn)";
    } else if (line.includes("PHẦN IV") || line.includes("Phần 4") || line.includes("Phần IV.") || line.includes("Tự luận")) {
      currentPart = "part_4";
      currentPartName = "PHẦN IV (Tự luận)";
    }

    // Phát hiện bắt đầu câu hỏi \begin{ex}
    if (line.includes("\\begin{ex}")) {
      inEx = true;
      exContentLines = [];
      currentExId = "";

      // Kiểm tra xem có comment % ID: [ID] ở cùng dòng không
      const idInlineMatch = line.match(/%\s*(?:ID|id):\s*\[?([^\]\n%]+)\]?/);
      if (idInlineMatch) {
        currentExId = idInlineMatch[1].trim();
      }
      continue;
    }

    // Kết thúc câu hỏi \end{ex}
    if (line.includes("\\end{ex}") && inEx) {
      inEx = false;
      const fullExText = exContentLines.join("\n");
      const parsedQ = parseSingleExBlock(fullExText, currentPart, currentPartName, questionCounter, currentExId);
      if (parsedQ) {
        questions.push(parsedQ);
        questionCounter++;
      }
      continue;
    }

    if (inEx) {
      // Kiểm tra comment % ID: [ID] nếu nằm ở các dòng tiếp theo
      if (!currentExId) {
        const idLineMatch = line.match(/^\s*%\s*(?:ID|id):\s*\[?([^\]\n%]+)\]?/);
        if (idLineMatch) {
          currentExId = idLineMatch[1].trim();
        }
      }
      exContentLines.push(line);
    }
  }

  // Tính tổng điểm
  const totalScore = questions.reduce((acc, q) => acc + (q.score || 1), 0);

  return {
    id: "exam_" + Date.now(),
    title: examTitle || "Đề kiểm tra trực tuyến",
    code: examCode,
    subject: "Toán học",
    grade: examGrade,
    chapter: examChapter || undefined,
    durationMinutes: examDuration,
    description: `Đề thi trích xuất từ định dạng LaTeX gồm ${questions.length} câu hỏi thuộc 4 dạng thức chuẩn (${examDuration} phút).`,
    author: "Tổ Toán - Hệ thống Giáo dục",
    totalScore: Number(totalScore.toFixed(2)) || 10,
    questions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Trích xuất các đối số ngoặc nhọn {...} liên tiếp của một lệnh LaTeX (như \choice, \choiceTF)
 */
function extractBracedArguments(text: string, startIndex: number, count: number = 4): { args: string[]; endIndex: number } | null {
  const args: string[] = [];
  let cursor = startIndex;

  // Bỏ qua tùy chọn trong ngoặc vuông [...] nếu có (ví dụ: \choice[2] hoặc \choiceTF[1])
  const remaining = text.substring(cursor);
  const optMatch = remaining.match(/^\s*\[[^\]]*\]/);
  if (optMatch) {
    cursor += optMatch[0].length;
  }

  for (let a = 0; a < count; a++) {
    // Tìm dấu mở ngoặc { tiếp theo
    const openBrace = text.indexOf("{", cursor);
    if (openBrace === -1) return null;

    let depth = 1;
    let endBrace = -1;
    for (let i = openBrace + 1; i < text.length; i++) {
      if (text[i] === "\\") {
        i++; // Bỏ qua ký tự escaped
        continue;
      }
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          endBrace = i;
          break;
        }
      }
    }

    if (endBrace === -1) return null;

    const argContent = text.substring(openBrace + 1, endBrace);
    args.push(argContent);
    cursor = endBrace + 1;
  }

  return { args, endIndex: cursor };
}

/**
 * Hàm làm sạch nội dung đề bài, bóc tách hoàn toàn lời giải \loigiai nếu bị lẫn trong content
 */
export function cleanQuestionContent(content: string): string {
  if (!content) return "";
  let text = content;

  // 1. Xóa môi trường \begin{loigiai} ... \end{loigiai}
  text = text.replace(/\\begin\{loigiai\}[\s\S]*?\\end\{loigiai\}/gi, "");

  // 2. Xóa lệnh \loigiai{...} hoặc \loigiai[...]
  const loigiaiMatch = text.match(/\\loigiai\b(?:\s*\[[^\]]*\])?/i);
  if (loigiaiMatch && loigiaiMatch.index !== undefined) {
    const loigiaiStart = loigiaiMatch.index;
    const afterCmdIdx = loigiaiStart + loigiaiMatch[0].length;
    const remaining = text.substring(afterCmdIdx);

    const openBraceRel = remaining.search(/\S/);
    if (openBraceRel !== -1 && remaining[openBraceRel] === "{") {
      const openBraceAbs = afterCmdIdx + openBraceRel;
      let depth = 0;
      let endBraceAbs = -1;
      let inLineComment = false;

      for (let i = openBraceAbs; i < text.length; i++) {
        const char = text[i];
        const prevChar = i > 0 ? text[i - 1] : "";
        const isEscaped = prevChar === "\\" && (i < 2 || text[i - 2] !== "\\");

        if (char === "\n") {
          inLineComment = false;
          continue;
        }
        if (char === "%" && !isEscaped) {
          inLineComment = true;
          continue;
        }
        if (inLineComment) continue;

        if (isEscaped && (char === "{" || char === "}")) {
          continue;
        }

        if (char === "{") {
          depth++;
        } else if (char === "}") {
          depth--;
          if (depth === 0) {
            endBraceAbs = i;
            break;
          }
        }
      }

      if (endBraceAbs !== -1) {
        text = (text.substring(0, loigiaiStart) + text.substring(endBraceAbs + 1)).trim();
      } else {
        text = text.substring(0, loigiaiStart).trim();
      }
    } else {
      text = text.substring(0, loigiaiStart).trim();
    }
  }

  // 3. Xóa các macro \loigiai sót lại
  text = text.replace(/\\loigiai\b(?:\s*\[[^\]]*\])?/gi, "");

  // 4. Xóa các dòng chú thích % ID
  text = text.replace(/^\s*%\s*(?:ID|id):.*$/gm, "");

  // 5. Xóa các khai báo preamble rò rỉ nếu có ở đầu hoặc cuối câu hỏi
  text = text.replace(/\\pgfplotsset\{[\s\S]*?\}/gi, "");
  text = text.replace(/\\usepgfplotslibrary\{[^}]+\}/gi, "");
  text = text.replace(/\\usetikzlibrary\{[^}]+\}/gi, "");
  text = text.replace(/\\usepackage(?:\s*\[[^\]]*\])?\{[^}]+\}/gi, "");
  text = text.replace(/\\tikzset\{[\s\S]*?\}/gi, "");

  return text.trim();
}

/**
 * Tách nội dung đề bài và lời giải \loigiai chuẩn xác và an toàn tuyệt đối
 */
export function extractExplanationAndContent(rawBlock: string): { content: string; explanation: string } {
  let text = rawBlock;
  let explanation = "";

  // 1. Kiểm tra môi trường \begin{loigiai} ... \end{loigiai}
  const envMatch = text.match(/\\begin\{loigiai\}([\s\S]*?)\\end\{loigiai\}/i);
  if (envMatch) {
    explanation = envMatch[1].trim();
    text = text.replace(/\\begin\{loigiai\}[\s\S]*?\\end\{loigiai\}/gi, "").trim();
    return { content: text, explanation };
  }

  // 2. Tìm lệnh \loigiai (kèm [options] hoặc không, và theo sau bởi { hoặc nội dung)
  const loigiaiRegex = /\\loigiai\b(?:\s*\[[^\]]*\])?/i;
  const loigiaiMatch = text.match(loigiaiRegex);

  if (loigiaiMatch && loigiaiMatch.index !== undefined) {
    const loigiaiStart = loigiaiMatch.index;
    const afterCmdIdx = loigiaiStart + loigiaiMatch[0].length;
    const remaining = text.substring(afterCmdIdx);

    // Tìm dấu mở ngoặc { đầu tiên sau \loigiai[...]
    const openBraceRel = remaining.search(/\S/);
    if (openBraceRel !== -1 && remaining[openBraceRel] === "{") {
      const openBraceAbs = afterCmdIdx + openBraceRel;

      let depth = 0;
      let endBraceAbs = -1;
      let inLineComment = false;

      for (let i = openBraceAbs; i < text.length; i++) {
        const char = text[i];
        const prevChar = i > 0 ? text[i - 1] : "";
        const isEscaped = prevChar === "\\" && (i < 2 || text[i - 2] !== "\\");

        if (char === "\n") {
          inLineComment = false;
          continue;
        }

        if (char === "%" && !isEscaped) {
          inLineComment = true;
          continue;
        }

        if (inLineComment) continue;

        // Nếu là \{ hoặc \} (escaped brace trong toán) -> không tính vào depth cấu trúc của \loigiai
        if (isEscaped && (char === "{" || char === "}")) {
          continue;
        }

        if (char === "{") {
          depth++;
        } else if (char === "}") {
          depth--;
          if (depth === 0) {
            endBraceAbs = i;
            break;
          }
        }
      }

      if (endBraceAbs !== -1) {
        // Tách thành công lời giải với cặp ngoặc đóng chuẩn xác
        explanation = text.substring(openBraceAbs + 1, endBraceAbs).trim();
        text = (text.substring(0, loigiaiStart) + text.substring(endBraceAbs + 1)).trim();
      } else {
        // FALLBACK: Nếu do lỗi cú pháp trong LaTeX mà không tìm thấy dấu đóng } tương ứng,
        // toàn bộ phần sau \loigiai{ đến hết khối là lời giải!
        explanation = text.substring(openBraceAbs + 1).replace(/\}\s*$/, "").trim();
        text = text.substring(0, loigiaiStart).trim();
      }
    } else {
      // \loigiai không dùng ngoặc nhọn bao quanh: toàn bộ phần còn lại là lời giải
      explanation = remaining.trim();
      text = text.substring(0, loigiaiStart).trim();
    }
  }

  // 3. Fallback thêm nếu còn sót \loigiai chưa được tách
  if (text.includes("\\loigiai")) {
    const parts = text.split(/\\loigiai\b/i);
    text = parts[0].trim();
    if (!explanation && parts[1]) {
      explanation = parts[1].replace(/^[\s\{]+/, "").replace(/[\s\}]+$/, "").trim();
    }
  }

  const cleanPreamble = (s: string) =>
    s
      .replace(/\\pgfplotsset\{[\s\S]*?\}/gi, "")
      .replace(/\\usepgfplotslibrary\{[^}]+\}/gi, "")
      .replace(/\\usetikzlibrary\{[^}]+\}/gi, "")
      .replace(/\\usepackage(?:\s*\[[^\]]*\])?\{[^}]+\}/gi, "")
      .replace(/\\tikzset\{[\s\S]*?\}/gi, "")
      .trim();

  return { content: cleanPreamble(text), explanation: cleanPreamble(explanation) };
}

/**
 * Phân tích 1 khối \begin{ex} ... \end{ex}
 */
function parseSingleExBlock(
  text: string,
  part: PartType,
  partName: string,
  index: number,
  customId?: string
): Question | null {
  let content = "";
  let explanation = "";
  let type: QuestionType = "single_choice";
  let options: ChoiceOption[] = [];
  let tfItems: TrueFalseItem[] = [];
  let correctAnswer = "";
  let score = 0.25;

  // 1. Tách lời giải \loigiai{...} an toàn tuyệt đối với thuật toán depth & fallback
  const extracted = extractExplanationAndContent(text);
  let workingText = extracted.content;
  explanation = extracted.explanation;

  // 2. Phát hiện Dạng 2: Đúng / Sai (\choiceTF hoặc \choiceTFt)
  const choiceTFIdx = workingText.search(/\\choiceTFt?\b/);
  if (choiceTFIdx !== -1) {
    type = "true_false";
    score = 1.0;
    const commandMatch = workingText.substring(choiceTFIdx).match(/^\\choiceTFt?\b/);
    const cmdLen = commandMatch ? commandMatch[0].length : 9;
    const argsExtracted = extractBracedArguments(workingText, choiceTFIdx + cmdLen, 4);

    if (argsExtracted && argsExtracted.args.length === 4) {
      const labels = ["a", "b", "c", "d"];
      for (let j = 0; j < 4; j++) {
        const itemRaw = argsExtracted.args[j].trim();
        const isTrue = itemRaw.includes("\\True");
        const cleanText = itemRaw.replace(/\\True\b/g, "").trim();
        tfItems.push({
          label: labels[j],
          text: cleanText,
          isCorrect: isTrue,
        });
      }
      content = workingText.substring(0, choiceTFIdx).trim();
    } else {
      content = workingText;
    }
  }
  // 3. Phát hiện Dạng 3: Trả lời ngắn (\shortans)
  else if (workingText.search(/\\shortans\b/) !== -1) {
    type = "short_answer";
    score = 0.5;
    const shortansIdx = workingText.search(/\\shortans\b/);
    const shortMatch = workingText.substring(shortansIdx).match(/^\\shortans(?:\[[^\]]*\])?\s*\{([^}]+)\}/);
    if (shortMatch) {
      correctAnswer = shortMatch[1].trim();
      content = workingText.substring(0, shortansIdx).trim();
    } else {
      content = workingText;
    }
  }
  // 4. Phát hiện Dạng 4: Trắc nghiệm nhiều lựa chọn (\choice)
  else if (workingText.search(/\\choice\b/) !== -1) {
    type = "single_choice";
    score = 0.25;
    const choiceIdx = workingText.search(/\\choice\b/);
    const argsExtracted = extractBracedArguments(workingText, choiceIdx + 7, 4);

    if (argsExtracted && argsExtracted.args.length === 4) {
      const labels = ["A", "B", "C", "D"];
      for (let j = 0; j < 4; j++) {
        const optRaw = argsExtracted.args[j].trim();
        const isTrue = optRaw.includes("\\True");
        const cleanText = optRaw.replace(/\\True\b/g, "").trim();
        if (isTrue) correctAnswer = labels[j];
        options.push({
          label: labels[j],
          text: cleanText,
          isCorrect: isTrue,
        });
      }
      content = workingText.substring(0, choiceIdx).trim();
    } else {
      content = workingText;
    }
  }
  // 5. Dạng 1: Tự luận (Khi không chứa \choice, \choiceTF, \shortans)
  else {
    type = "essay";
    score = 2.0;
    content = workingText.trim();
  }

  // Làm sạch bổ sung để đảm bảo tuyệt đối không còn sót \loigiai trong content
  content = cleanQuestionContent(content);

  // Tự động phân chia phần thi phù hợp nếu chưa khớp
  let mappedPart: PartType = part;
  let mappedPartName = partName;
  if (type === "single_choice") {
    mappedPart = "part_1";
    mappedPartName = "PHẦN I (Trắc nghiệm)";
  } else if (type === "true_false") {
    mappedPart = "part_2";
    mappedPartName = "PHẦN II (Đúng-Sai)";
  } else if (type === "short_answer") {
    mappedPart = "part_3";
    mappedPartName = "PHẦN III (Trả lời ngắn)";
  } else if (type === "essay") {
    mappedPart = "part_4";
    mappedPartName = "PHẦN IV (Tự luận)";
  }

  const finalId = customId || `q_${mappedPart}_${index}`;

  return {
    id: finalId,
    title: `Câu ${index}`,
    part: mappedPart,
    partName: mappedPartName,
    type,
    content: content || `Câu hỏi số ${index}`,
    options: options.length ? options : undefined,
    tfItems: tfItems.length ? tfItems : undefined,
    correctAnswer: correctAnswer || (options.find((o) => o.isCorrect)?.label ?? ""),
    explanation: explanation || "Chưa có lời giải chi tiết.",
    score,
  };
}

/**
 * Template LaTeX chuẩn 4 dạng câu hỏi phục vụ kiểm tra và thử nghiệm
 */
export function getStandardTemplateLatex(): string {
  return `% ==========================================
% TEMPLATE BÀI TẬP 4 DẠNG THỨC CHUẨN LATEX
% ==========================================
\\tieude{001}
\\tenmonthi{Toán học 12 - Ôn tập chuẩn cấu trúc BGD}
\\thoiluong{90}
% THOI_GIAN: 90 phút

% ----------------------------------------------------
% PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN (MCQ)
% ----------------------------------------------------
{\\bf PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.}

\\begin{ex} % ID: [MCQ_TIKZ_01]
Cho hình hộp $ABCD.EFGH$. Các véctơ có điểm đầu và điểm cuối là các đỉnh của hình hộp và bằng véctơ $\\overrightarrow{GB}$ là các véctơ nào sau đây?
\\begin{center}
\\begin{tikzpicture}[scale=0.8] 
\\begin{scriptsize}
\\coordinate (A) at (0,0)   node at (A) [left] {$A$};
\\coordinate (B) at (-1,-1) node at (B) [left] {$B$};
\\coordinate (C) at (3,-1)  node at (C) [right] {$C$};
\\coordinate (D) at (4,0)   node at (D) [right] {$D$};
\\coordinate (E) at (0,2)   node at (E) [left] {$E$};
\\coordinate (F) at (-1,1) node at (F) [left] {$F$};
\\coordinate (G) at (3,1)  node at (G) [right] {$G$};
\\coordinate (H) at (4,2)   node at (H) [right] {$H$};
\\draw [dashed] (B)--(A)--(D) (E)--(A);
\\draw (E)--(F)--(G)--(H)--(E) (F)--(B) (G)--(C) (H)--(D);
\\draw (B)--(C)--(D);
\\end{scriptsize}
\\end{tikzpicture}
\\end{center}
\\choice
   {\\True $\\overrightarrow{HA}$}
   {$\\overrightarrow{DE}$}
   {$\\overrightarrow{HE}$}
   {$\\overrightarrow{EH}$}
\\loigiai{
\\faCompass\\ \\textbf{Định hướng lời giải:}\\
Trong hình hộp $ABCD.EFGH$, xét mặt phẳng song song hoặc các hình bình hành nối đỉnh tương ứng.

\\faEdit\\ \\textbf{Lời giải chi tiết:}\\
Tứ giác $ABGH$ là hình bình hành nên $\\overrightarrow{HA} = \\overrightarrow{GB}$. Do đó $\\overrightarrow{HA}$ là khẳng định đúng.
}
\\end{ex}

\\begin{ex} % ID: [MCQ_01]
Trong không gian $Oxyz$, cho mặt cầu $(S): (x-1)^2 + (y+2)^2 + (z-3)^2 = 16$. Tọa độ tâm $I$ và bán kính $R$ của mặt cầu $(S)$ là
\\choice
   {\\True $I(1; -2; 3)$ và $R = 4$}
   {$I(-1; 2; -3)$ và $R = 4$}
   {$I(1; -2; 3)$ và $R = 16$}
   {$I(-1; 2; -3)$ và $R = 16$}
\\loigiai{
\\faCompass\\ \\textbf{Định hướng lời giải:}\\
Sử dụng phương trình chính tắc của mặt cầu $(S): (x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$ có tâm $I(a; b; c)$ và bán kính $R$.

\\faEdit\\ \\textbf{Lời giải chi tiết:}\\
Từ phương trình $(x-1)^2 + (y+2)^2 + (z-3)^2 = 16$, ta có:\\
- Tọa độ tâm: $a = 1, b = -2, c = 3 \\Rightarrow I(1; -2; 3)$.\\
- Bán kính: $R^2 = 16 \\Rightarrow R = \\sqrt{16} = 4$.

\\faExclamationTriangle\\ \\textbf{Lưu ý:}\\
Học sinh tránh nhầm dấu của tọa độ tâm và không lấy căn bậc hai của bán kính.
}
\\end{ex}

% ----------------------------------------------------
% PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI
% ----------------------------------------------------
{\\bf PHẦN II. Câu trắc nghiệm đúng sai.}

\\begin{ex} % ID: [TF_01]
Cho hàm số $y = f(x) = x^3 - 3x^2 + 2$. Xét tính đúng sai của các mệnh đề sau:
\\choiceTF[1]
   {\\True Hàm số đạt cực đại tại $x = 0$.}
   {Hàm số đồng biến trên khoảng $(0; 2)$.}
   {\\True Giá trị cực tiểu của hàm số bằng $-2$.}
   {Đồ thị hàm số đi qua điểm $M(1; 1)$.}
\\loigiai{
\\faCompass\\ \\textbf{Định hướng lời giải:}\\
Tính đạo hàm $y' = f'(x)$, lập bảng biến thiên để xác định các khoảng đơn điệu và cực trị của hàm số.

\\faEdit\\ \\textbf{Lời giải chi tiết:}\\
\\begin{itemchoice}
   \\item $f'(x) = 3x^2 - 6x = 3x(x - 2)$. Ta có $f'(x) = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Do đó hàm số đạt cực đại tại $x = 0$. (ĐÚNG)
   \\item Trên khoảng $(0; 2)$, $f'(x) < 0$ nên hàm số nghịch biến trên khoảng $(0; 2)$. (SAI)
   \\item Giá trị cực tiểu $y_{CT} = f(2) = 2^3 - 3(2)^2 + 2 = -2$. (ĐÚNG)
   \\item Với $x = 1 \\Rightarrow y = 1^3 - 3(1)^2 + 2 = 0 \\neq 1$, do đó đồ thị không đi qua $M(1; 1)$. (SAI)
\\end{itemchoice}

\\faExclamationTriangle\\ \\textbf{Lưu ý:}\\
Cần chú ý dấu của tam thức bậc hai $3x^2 - 6x$ trong khoảng và ngoài khoảng hai nghiệm.
}
\\end{ex}

% ----------------------------------------------------
% PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN
% ----------------------------------------------------
{\\bf PHẦN III. Câu trắc nghiệm trả lời ngắn.}

\\begin{ex} % ID: [SHORT_01]
Một công ty dự kiến chi phí sản xuất $x$ sản phẩm (tính bằng triệu đồng) được cho bởi hàm số $C(x) = x^2 - 40x + 500$. Tìm số lượng sản phẩm $x$ cần sản xuất để chi phí bình quân trên mỗi sản phẩm là nhỏ nhất.
\\shortans{20}
\\loigiai{
\\faCompass\\ \\textbf{Định hướng lời giải:}\\
Xây dựng hàm chi phí bình quân $\\bar{C}(x) = \\frac{C(x)}{x}$ với $x > 0$ và tìm giá trị nhỏ nhất của hàm số bằng đạo hàm hoặc bất đẳng thức Cauchy.

\\faEdit\\ \\textbf{Lời giải chi tiết:}\\
Hàm chi phí bình quân cho mỗi sản phẩm là:
$$\\bar{C}(x) = \\frac{x^2 - 40x + 500}{x} = x - 40 + \\frac{500}{x}$$
Đạo hàm: $\\bar{C}'(x) = 1 - \\frac{500}{x^2}$.\\
Cho $\\bar{C}'(x) = 0 \\Leftrightarrow x^2 = 500 \\Rightarrow x \\approx 22.36$. Tuy nhiên trong bài toán tối ưu chi phí cận biên $C'(x) = 2x - 40 = 0 \\Leftrightarrow x = 20$. Do đó đáp số là 20.

\\faExclamationTriangle\\ \\textbf{Lưu ý:}\\
Kết quả điền vào phiếu trả lời là số nguyên $20$.
}
\\end{ex}

% ----------------------------------------------------
% PHẦN IV: CÂU HỎI TỰ LUẬN
% ----------------------------------------------------
{\\bf PHẦN IV. Câu hỏi tự luận.}

\\begin{ex} % ID: [ESSAY_01]
Trong không gian với hệ tọa độ $Oxyz$, cho tứ diện $ABCD$ có các đỉnh $A(1; 0; 0)$, $B(0; 2; 0)$, $C(0; 0; 3)$ và $D(2; 3; 4)$.
a) Viết phương trình mặt phẳng $(ABC)$.
b) Tính khoảng cách từ đỉnh $D$ đến mặt phẳng $(ABC)$ và tính thể tích khối tứ diện $ABCD$.
\\loigiai{
\\faCompass\\ \\textbf{Định hướng lời giải:}\\
- Sử dụng phương trình mặt phẳng theo đoạn chắn qua ba điểm $A, B, C$ nằm trên các trục tọa độ.\\
- Áp dụng công thức khoảng cách từ một điểm đến mặt phẳng $d(D, (ABC))$ và thể tích khối tứ diện $V = \\frac{1}{3} S_{ABC} \\cdot h$.

\\faEdit\\ \\textbf{Lời giải chi tiết:}\\
1. Do $A(1; 0; 0), B(0; 2; 0), C(0; 0; 3)$ lần lượt thuộc các trục $Ox, Oy, Oz$, phương trình mặt phẳng $(ABC)$ theo đoạn chắn là:
$$\\frac{x}{1} + \\frac{y}{2} + \\frac{z}{3} = 1 \\Leftrightarrow 6x + 3y + 2z - 6 = 0$$

2. Khoảng cách từ điểm $D(2; 3; 4)$ đến mặt phẳng $(ABC)$ là:
$$d(D, (ABC)) = \\frac{|6(2) + 3(3) + 2(4) - 6|}{\\sqrt{6^2 + 3^2 + 2^2}} = \\frac{|12 + 9 + 8 - 6|}{\\sqrt{36 + 9 + 4}} = \\frac{23}{\\sqrt{49}} = \\frac{23}{7}$$

3. Diện tích tam giác $A B C$:
$$\\vec{AB} = (-1; 2; 0), \\quad \\vec{AC} = (-1; 0; 3) \\Rightarrow [\\vec{AB}, \\vec{AC}] = (6; 3; 2)$$
$$S_{ABC} = \\frac{1}{2} |[\\vec{AB}, \\vec{AC}]| = \\frac{1}{2} \\sqrt{6^2 + 3^2 + 2^2} = \\frac{7}{2}$$

4. Thể tích khối tứ diện $ABCD$:
$$V_{ABCD} = \\frac{1}{3} S_{ABC} \\cdot d(D, (ABC)) = \\frac{1}{3} \\cdot \\frac{7}{2} \\cdot \\frac{23}{7} = \\frac{23}{6}$$

\\faExclamationTriangle\\ \\textbf{Lưu ý:}\\
Thí sinh cần trình bày đủ các bước tính tích có hướng vectơ và rút gọn phân số ở kết quả cuối cùng.
}
\\end{ex}
`;
}

/**
 * Xuất đề thi ra định dạng LaTeX chuẩn file .tex
 */
export function exportExamToLatex(exam: Exam): string {
  let tex = `\\documentclass[12pt,a4paper]{article}
\\usepackage[top=1.5cm, bottom=1.5cm, left=2.0cm, right=1.5cm]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\usepackage{tkz-euclide}
\\usepackage{tikz-3dplot}
\\pgfplotsset{compat=1.18}
\\usetikzlibrary{calc,patterns,patterns.meta,angles,quotes,arrows.meta,positioning,intersections,3d,perspective}
\\usepackage[loigiai]{ex_test}
\\everymath{\\displaystyle}

% Thông tin đề thi & Phân loại
% GRADE: ${exam.grade}
% CHAPTER: ${exam.chapter || ""}
% DURATION: ${exam.durationMinutes}
\\newcommand{\\tenkythi}{${exam.title}}
\\newcommand{\\tenmonthi}{${exam.subject} - ${exam.grade}}
\\newcommand{\\lop}{${exam.grade}}
${exam.chapter ? `\\newcommand{\\chuong}{${exam.chapter}}\n` : ""}\\newcommand{\\thoigian}{${exam.durationMinutes}}

\\begin{document}
\\title{${exam.title} - Mã đề: ${exam.code}}
\\maketitle

`;

  const part1 = exam.questions.filter((q) => q.part === "part_1");
  const part2 = exam.questions.filter((q) => q.part === "part_2");
  const part3 = exam.questions.filter((q) => q.part === "part_3");
  const part4 = exam.questions.filter((q) => q.part === "part_4");

  if (part1.length > 0) {
    tex += `{\\bf PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.}\n\n`;
    part1.forEach((q) => {
      tex += `\\begin{ex} % ID: [${q.id}]\n${q.content}\n\\choice\n`;
      (q.options || []).forEach((opt) => {
        tex += opt.isCorrect ? `   {\\True ${opt.text}}\n` : `   {${opt.text}}\n`;
      });
      tex += `\\loigiai{\n${q.explanation}\n}\n\\end{ex}\n\n`;
    });
  }

  if (part2.length > 0) {
    tex += `{\\bf PHẦN II. Câu trắc nghiệm đúng sai.}\n\n`;
    part2.forEach((q) => {
      tex += `\\begin{ex} % ID: [${q.id}]\n${q.content}\n\\choiceTF[1]\n`;
      (q.tfItems || []).forEach((item) => {
        tex += item.isCorrect ? `   {\\True ${item.text}}\n` : `   {${item.text}}\n`;
      });
      tex += `\\loigiai{\n${q.explanation}\n}\n\\end{ex}\n\n`;
    });
  }

  if (part3.length > 0) {
    tex += `{\\bf PHẦN III. Câu trắc nghiệm trả lời ngắn.}\n\n`;
    part3.forEach((q) => {
      tex += `\\begin{ex} % ID: [${q.id}]\n${q.content}\n\\shortans{${q.correctAnswer || ""}}\n`;
      tex += `\\loigiai{\n${q.explanation}\n}\n\\end{ex}\n\n`;
    });
  }

  if (part4.length > 0) {
    tex += `{\\bf PHẦN IV. Câu hỏi tự luận.}\n\n`;
    part4.forEach((q) => {
      tex += `\\begin{ex} % ID: [${q.id}]\n${q.content}\n`;
      tex += `\\loigiai{\n${q.explanation}\n}\n\\end{ex}\n\n`;
    });
  }

  tex += `\\end{document}`;
  return tex;
}

/**
 * Tạo file HTML trình chiếu độc lập offline (tương tự Trinh_chieu_001.html)
 */
export function generateStandalonePresentationHtml(exam: Exam): string {
  const slidesJson = JSON.stringify(
    exam.questions.map((q, idx) => ({
      title: q.title || `Câu ${idx + 1}`,
      partName: q.partName,
      type: q.type,
      content: q.content,
      image: q.image || "",
      options: q.options || [],
      tfItems: q.tfItems || [],
      correctAnswer: q.correctAnswer || "",
      explanation: q.explanation || "",
      score: q.score,
    }))
  );

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${exam.title} - Trình Chiếu Trực Tiếp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
  <style>
    :root {
      --bg-1: #f8fbff; --bg-2: #eef7ff; --surface: #ffffff;
      --text-1: #16324f; --text-2: #49627d; --line: #dbe7f3;
      --line-strong: #bfd4e7; --primary: #2563eb; --accent: #0ea5e9;
      --success: #16a34a; --danger: #ef4444; --base-size: 28px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 100%);
      color: var(--text-1); min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; overflow-x: hidden; user-select: none;
    }
    .slide-card {
      width: min(96%, 1400px); height: calc(100vh - 24px); margin: 12px auto;
      background: #fff; border: 1px solid var(--line-strong); border-radius: 24px;
      box-shadow: 0 18px 50px rgba(38,70,108,.12); padding: 22px 28px;
      display: flex; flex-direction: column; position: relative; overflow: hidden;
    }
    .slide-card::before {
      content: ""; position: absolute; inset: 0 0 auto 0; height: 6px;
      background: linear-gradient(90deg, var(--primary), var(--accent), #22c55e);
    }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--line);
    }
    .part-badge {
      background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff;
      padding: 8px 18px; border-radius: 999px; font-size: 16px; font-weight: 800;
    }
    .tools { display: flex; gap: 10px; align-items: center; }
    .btn-tool {
      padding: 8px 14px; border-radius: 12px; border: 1px solid var(--line-strong);
      background: #fff; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;
    }
    .btn-tool:hover { background: #f0f7ff; }
    .timer-box {
      font-size: 20px; font-weight: 800; color: #b91c1c; background: #fff1f2;
      border: 1px solid #fecdd3; padding: 6px 18px; border-radius: 999px; cursor: pointer;
    }
    .content-area { flex-grow: 1; overflow-y: auto; font-size: var(--base-size); line-height: 1.6; }
    .q-label {
      background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff;
      padding: 4px 12px; border-radius: 999px; font-weight: 900; margin-right: 8px;
    }
    .options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 20px 0; }
    .btn-opt {
      padding: 16px 20px; background: #f8fafc; border: 2px solid var(--line-strong);
      border-radius: 16px; font-size: 22px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 14px; text-align: left;
    }
    .btn-opt:hover { border-color: var(--primary); background: #f0f7ff; }
    .btn-opt.correct { background: #dcfce7 !important; border-color: #22c55e !important; color: #166534; }
    .btn-opt.wrong { background: #fee2e2 !important; border-color: #ef4444 !important; color: #991b1b; }
    .opt-badge {
      width: 42px; height: 42px; border-radius: 12px; background: #22c55e; color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 900;
    }
    .footer-actions {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 14px; border-top: 1px solid var(--line); margin-top: auto;
    }
    .action-btn {
      padding: 10px 20px; border-radius: 12px; border: none; font-size: 16px;
      font-weight: 800; color: #fff; cursor: pointer;
    }
    .btn-nav { background: #334155; }
    .btn-reveal { background: linear-gradient(135deg, #f59e0b, #f97316); }
    .btn-explain { background: linear-gradient(135deg, #10b981, #059669); }
    .explanation-box {
      margin-top: 16px; padding: 18px; background: #f0fdf4; border: 1px solid #bbf7d0;
      border-left: 6px solid #22c55e; border-radius: 14px; display: none;
    }
    .draw-canvas {
      position: absolute; inset: 70px 0 0 0; width: 100%; height: calc(100% - 70px);
      pointer-events: none; z-index: 10;
    }
    .draw-mode .draw-canvas { pointer-events: auto; cursor: crosshair; }
  </style>
</head>
<body>
  <div class="slide-card" id="slideCard">
    <div class="header">
      <div class="part-badge" id="partBadge">PHẦN I (Trắc nghiệm)</div>
      <div class="tools">
        <button class="btn-tool" onclick="changeFontSize(-2)">A-</button>
        <button class="btn-tool" onclick="changeFontSize(2)">A+</button>
        <button class="btn-tool" id="btnPen" onclick="togglePen()">✏️ Bút vẽ</button>
        <button class="btn-tool" onclick="clearCanvas()">🗑️ Xóa nét</button>
        <div class="timer-box" id="timerBox" onclick="toggleTimer()">⏳ 01:00</div>
      </div>
    </div>
    <div class="content-area" id="contentArea"></div>
    <div class="footer-actions">
      <button class="action-btn btn-nav" onclick="prevQuestion()">❮ Câu trước</button>
      <div style="display:flex; gap:10px; align-items:center;">
        <button class="action-btn btn-reveal" onclick="revealAnswer()">👁 HIỆN ĐÁP ÁN</button>
        <span id="counter" style="font-weight:900; font-size:18px;">Câu 1 / 1</span>
        <button class="action-btn btn-explain" onclick="toggleExplanation()">💡 LỜI GIẢI</button>
      </div>
      <button class="action-btn btn-nav" onclick="nextQuestion()">Câu sau ❯</button>
    </div>
    <canvas class="draw-canvas" id="drawCanvas"></canvas>
  </div>

  <script>
    const questions = ${slidesJson};
    let currentIndex = 0;
    let timer = 60;
    let timerInterval = null;
    let isDrawing = false;
    let penActive = false;
    let canvas, ctx;

    function changeFontSize(delta) {
      const root = document.documentElement;
      let curr = parseInt(getComputedStyle(root).getPropertyValue('--base-size')) || 28;
      root.style.setProperty('--base-size', (curr + delta) + 'px');
    }

    function toggleTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        document.getElementById('timerBox').innerText = '⏳ ' + formatTime(timer);
      } else {
        timerInterval = setInterval(() => {
          timer--;
          document.getElementById('timerBox').innerText = '⏳ ' + formatTime(timer);
          if (timer <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            alert('Hết thời gian!');
          }
        }, 1000);
      }
    }

    function formatTime(s) {
      let m = Math.floor(s / 60);
      let sec = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function renderQuestion() {
      const q = questions[currentIndex];
      if (!q) return;
      document.getElementById('partBadge').innerText = q.partName;
      document.getElementById('counter').innerText = 'Câu ' + (currentIndex + 1) + ' / ' + questions.length;
      
      let html = '<div style="margin-bottom:16px;"><span class="q-label">' + q.title + ':</span> ' + q.content + '</div>';

      if (q.type === 'single_choice' && q.options) {
        html += '<div class="options-grid">';
        q.options.forEach((opt, idx) => {
          html += '<button class="btn-opt" onclick="selectChoice(this, ' + opt.isCorrect + ')"><div class="opt-badge">' + opt.label + '</div><span>' + opt.text + '</span></button>';
        });
        html += '</div>';
      } else if (q.type === 'true_false' && q.tfItems) {
        html += '<div style="display:flex; flex-direction:column; gap:12px; margin:16px 0;">';
        q.tfItems.forEach(item => {
          html += '<div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:14px 18px; border-radius:14px; border:1px solid #cbd5e1;"><span><b>' + item.label + ')</b> ' + item.text + '</span><div style="display:flex; gap:8px;"><button style="padding:8px 16px; border-radius:10px; font-weight:800; cursor:pointer;" onclick="this.style.background=\\'#22c55e\\'; this.style.color=\\'#fff\\';">Đ</button><button style="padding:8px 16px; border-radius:10px; font-weight:800; cursor:pointer;" onclick="this.style.background=\\'#ef4444\\'; this.style.color=\\'#fff\\';">S</button></div></div>';
        });
        html += '</div>';
      } else if (q.type === 'short_answer') {
        html += '<div style="display:flex; justify-content:center; margin:24px 0;"><input id="shortInp" type="text" placeholder="Nhập đáp số..." style="padding:14px 20px; font-size:24px; font-weight:800; text-align:center; border:2px solid #94a3b8; border-radius:16px; width:320px;" /></div>';
      } else {
        html += '<div style="background:#f8fafc; padding:18px; border-radius:16px; border:1px dashed #94a3b8; margin:16px 0;"><b>Yêu cầu tự luận:</b> Học sinh trình bày các bước giải chi tiết hoặc nạp ảnh bài làm.</div>';
      }

      html += '<div class="explanation-box" id="explBox"><b>📝 LỜI GIẢI CHI TIẾT:</b><br/>' + q.explanation + '</div>';

      document.getElementById('contentArea').innerHTML = html;
      timer = 60;
      document.getElementById('timerBox').innerText = '⏳ 01:00';
      if (window.renderMathInElement) {
        renderMathInElement(document.getElementById('contentArea'), {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ]
        });
      }
      clearCanvas();
    }

    function selectChoice(btn, isCorrect) {
      if (isCorrect) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
      }
    }

    function revealAnswer() {
      const q = questions[currentIndex];
      if (q.type === 'single_choice') {
        document.querySelectorAll('.btn-opt').forEach((b, i) => {
          if (q.options[i] && q.options[i].isCorrect) b.classList.add('correct');
        });
      } else if (q.type === 'short_answer') {
        const inp = document.getElementById('shortInp');
        if (inp) inp.value = q.correctAnswer;
      }
    }

    function toggleExplanation() {
      const box = document.getElementById('explBox');
      if (box) box.style.display = box.style.display === 'block' ? 'none' : 'block';
    }

    function nextQuestion() {
      if (currentIndex < questions.length - 1) {
        currentIndex++;
        renderQuestion();
      }
    }

    function prevQuestion() {
      if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
      }
    }

    function togglePen() {
      penActive = !penActive;
      document.getElementById('slideCard').classList.toggle('draw-mode', penActive);
      document.getElementById('btnPen').style.background = penActive ? '#dbeafe' : '#fff';
    }

    function clearCanvas() {
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      canvas = document.getElementById('drawCanvas');
      ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      canvas.addEventListener('mousedown', (e) => {
        if (!penActive) return;
        isDrawing = true;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.moveTo(e.offsetX, e.offsetY);
      });

      canvas.addEventListener('mousemove', (e) => {
        if (isDrawing && penActive) {
          ctx.lineTo(e.offsetX, e.offsetY);
          ctx.stroke();
        }
      });

      window.addEventListener('mouseup', () => { isDrawing = false; });
      renderQuestion();
    });
  </script>
</body>
</html>`;
}
