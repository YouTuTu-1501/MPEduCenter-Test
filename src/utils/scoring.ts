import { Exam, Question, StudentSubmission } from "../types/exam";

/**
 * Chuẩn hóa chuỗi số hoặc câu trả lời ngắn
 */
export function normalizeShortAnswer(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
}

/**
 * Kiểm tra xem đáp án trả lời ngắn của học sinh có đúng không
 */
export function checkShortAnswerCorrectness(
  studentInput: string,
  correctAnswer: string,
  tolerance: number = 0.05
): boolean {
  if (!studentInput || !correctAnswer) return false;

  const normalizedStudent = normalizeShortAnswer(studentInput);
  const normalizedCorrect = normalizeShortAnswer(correctAnswer);

  // So khớp chuỗi tuyệt đối
  if (normalizedStudent === normalizedCorrect) return true;

  // Thử so khớp dạng số
  const studentNum = parseFloat(normalizedStudent);
  const correctNum = parseFloat(normalizedCorrect);

  if (!isNaN(studentNum) && !isNaN(correctNum)) {
    return Math.abs(studentNum - correctNum) <= tolerance;
  }

  // Thử so khớp phân số a/b
  if (normalizedStudent.includes("/") && normalizedCorrect.includes("/")) {
    try {
      const [sN, sD] = normalizedStudent.split("/").map(Number);
      const [cN, cD] = normalizedCorrect.split("/").map(Number);
      if (sD !== 0 && cD !== 0) {
        return Math.abs(sN / sD - cN / cD) <= tolerance;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Tính điểm cho câu hỏi Đúng/Sai theo quy chế Bộ GD&ĐT
 * Đúng 1 ý: 0.1đ
 * Đúng 2 ý: 0.25đ
 * Đúng 3 ý: 0.5đ
 * Đúng 4 ý: 1.0đ
 */
export function calculateTrueFalseScore(
  userChoices: Record<string, boolean>, // { "a": true, "b": false, ... }
  question: Question
): { earnedScore: number; correctCount: number; maxScore: number } {
  if (!question.tfItems || question.tfItems.length === 0) {
    return { earnedScore: 0, correctCount: 0, maxScore: question.score || 1.0 };
  }

  let correctCount = 0;
  const totalItems = question.tfItems.length;

  question.tfItems.forEach((item) => {
    const userVal = userChoices[item.label];
    if (userVal !== undefined && userVal === item.isCorrect) {
      correctCount++;
    }
  });

  let ratio = 0;
  if (totalItems === 4) {
    if (correctCount === 1) ratio = 0.1;
    else if (correctCount === 2) ratio = 0.25;
    else if (correctCount === 3) ratio = 0.5;
    else if (correctCount === 4) ratio = 1.0;
  } else {
    ratio = correctCount / totalItems;
  }

  const baseScore = question.score || 1.0;
  const earnedScore = Number((baseScore * ratio).toFixed(2));

  return {
    earnedScore,
    correctCount,
    maxScore: baseScore,
  };
}

/**
 * Chấm toàn bộ bài thi của học sinh
 */
export function evaluateExamSubmission(
  exam: Exam,
  userAnswers: Record<string, any>,
  studentName: string = "Thí sinh",
  studentId: string = "TS01",
  timeSpentSeconds: number = 0,
  extraMeta?: { studentEmail?: string; studentClass?: string; studentAvatar?: string }
): StudentSubmission {
  let totalScore = 0;
  let totalMaxScore = 0;

  const partScores = {
    part_1: { earned: 0, max: 0 },
    part_2: { earned: 0, max: 0 },
    part_3: { earned: 0, max: 0 },
    part_4: { earned: 0, max: 0 },
  };

  const details: StudentSubmission["details"] = {};

  exam.questions.forEach((q) => {
    const rawUserAns = userAnswers[q.id];
    const userAns = rawUserAns !== undefined ? rawUserAns : "";
    const qScore = q.score || 1.0;
    const partKey = q.part;

    totalMaxScore += qScore;
    if (partScores[partKey]) {
      partScores[partKey].max += qScore;
    }

    if (q.type === "single_choice") {
      const isCorrect = userAns === q.correctAnswer;
      const earned = isCorrect ? qScore : 0;
      totalScore += earned;
      if (partScores[partKey]) partScores[partKey].earned += earned;

      details[q.id] = {
        isCorrect,
        earnedScore: earned,
        maxScore: qScore,
        userAnswer: userAns || "",
        correctAnswer: q.correctAnswer || "",
        feedback: isCorrect ? "Chính xác" : `Đáp án đúng là ${q.correctAnswer || ""}`,
      };
    } else if (q.type === "true_false") {
      const tfResult = calculateTrueFalseScore(userAns || {}, q);
      const isCorrect = tfResult.correctCount === (q.tfItems?.length || 4);
      totalScore += tfResult.earnedScore;
      if (partScores[partKey]) partScores[partKey].earned += tfResult.earnedScore;

      details[q.id] = {
        isCorrect,
        earnedScore: tfResult.earnedScore,
        maxScore: tfResult.maxScore,
        userAnswer: userAns || {},
        correctAnswer: (q.tfItems || []).reduce((acc, item) => {
          acc[item.label] = item.isCorrect;
          return acc;
        }, {} as Record<string, boolean>),
        feedback: `Đúng ${tfResult.correctCount}/${q.tfItems?.length || 4} ý (${tfResult.earnedScore}/${tfResult.maxScore}đ)`,
      };
    } else if (q.type === "short_answer") {
      const isCorrect = checkShortAnswerCorrectness(
        String(userAns || ""),
        String(q.correctAnswer || ""),
        q.tolerance || 0.05
      );
      const earned = isCorrect ? qScore : 0;
      totalScore += earned;
      if (partScores[partKey]) partScores[partKey].earned += earned;

      details[q.id] = {
        isCorrect,
        earnedScore: earned,
        maxScore: qScore,
        userAnswer: userAns || "",
        correctAnswer: q.correctAnswer || "",
        feedback: isCorrect ? "Chính xác" : `Đáp án chuẩn: ${q.correctAnswer || ""}`,
      };
    } else if (q.type === "essay") {
      // Tự luận: Mặc định ghi nhận bài nộp (văn bản và/hoặc tệp đính kèm)
      const hasText = typeof userAns === "string" ? userAns.trim() !== "" : Boolean(userAns?.text?.trim());
      const hasFiles = typeof userAns === "object" && userAns?.attachments && userAns.attachments.length > 0;
      const fileCount = hasFiles ? userAns.attachments.length : 0;

      let statusMsg = "Đã nộp bài giải, đang chờ giáo viên hoặc AI đánh giá chi tiết.";
      if (hasText && hasFiles) {
        statusMsg = `Đã nộp bài giải (văn bản + ${fileCount} tệp đính kèm), đang chờ đánh giá.`;
      } else if (hasFiles) {
        statusMsg = `Đã đính kèm ${fileCount} tệp/ảnh bài làm, đang chờ giáo viên chấm.`;
      } else if (!hasText) {
        statusMsg = "Chưa nộp bài làm tự luận.";
      }

      details[q.id] = {
        isCorrect: false,
        earnedScore: 0,
        maxScore: qScore,
        userAnswer: userAns || "",
        correctAnswer: q.rubric || "Chấm theo barem",
        feedback: statusMsg,
      };
    }
  });

  return {
    id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    examId: exam.id,
    examTitle: exam.title,
    studentName,
    studentId,
    studentEmail: extraMeta?.studentEmail,
    studentClass: extraMeta?.studentClass,
    studentAvatar: extraMeta?.studentAvatar,
    answers: userAnswers || {},
    score: Number(totalScore.toFixed(2)),
    maxScore: Number(totalMaxScore.toFixed(2)),
    partScores: {
      part_1: { earned: Number(partScores.part_1.earned.toFixed(2)), max: Number(partScores.part_1.max.toFixed(2)) },
      part_2: { earned: Number(partScores.part_2.earned.toFixed(2)), max: Number(partScores.part_2.max.toFixed(2)) },
      part_3: { earned: Number(partScores.part_3.earned.toFixed(2)), max: Number(partScores.part_3.max.toFixed(2)) },
      part_4: { earned: Number(partScores.part_4.earned.toFixed(2)), max: Number(partScores.part_4.max.toFixed(2)) },
    },
    details,
    submittedAt: new Date().toISOString(),
    timeSpentSeconds,
  };
}

/**
 * Cập nhật điểm tự luận do giáo viên chấm và tự động tính toán lại toàn bộ điểm bài thi
 */
export function updateEssayGradesAndRecalculate(
  submission: StudentSubmission,
  exam: Exam,
  essayGradesToUpdate: Record<string, { score: number; feedback?: string; gradedBy?: string }>
): StudentSubmission {
  const updatedDetails = { ...(submission.details || {}) };
  let part4Earned = 0;
  let part4Max = 0;

  const newEssayGrades = { ...(submission.essayGrades || {}) };

  exam.questions.forEach((q) => {
    if (q.part === "part_4" || q.type === "essay") {
      const max = q.score || 1.0;
      part4Max += max;
      const gradeInfo = essayGradesToUpdate[q.id] !== undefined ? essayGradesToUpdate[q.id] : newEssayGrades[q.id];
      const earned = gradeInfo ? Math.max(0, Math.min(max, Number(gradeInfo.score) || 0)) : (updatedDetails[q.id]?.earnedScore || 0);
      part4Earned += earned;

      if (gradeInfo) {
        newEssayGrades[q.id] = {
          score: Number(earned.toFixed(2)),
          feedback: gradeInfo.feedback || "",
          gradedAt: new Date().toISOString(),
          gradedBy: gradeInfo.gradedBy || "Giáo viên",
        };
      }

      updatedDetails[q.id] = {
        ...(updatedDetails[q.id] || {}),
        isCorrect: earned >= max * 0.8,
        earnedScore: Number(earned.toFixed(2)),
        maxScore: max,
        feedback: gradeInfo?.feedback || updatedDetails[q.id]?.feedback || "Đã chấm điểm tự luận",
        userAnswer: updatedDetails[q.id]?.userAnswer || submission.answers?.[q.id] || "",
        correctAnswer: q.rubric || q.explanation || "Chấm theo barem",
      };
    }
  });

  const part1Earned = submission.partScores?.part_1?.earned || 0;
  const part2Earned = submission.partScores?.part_2?.earned || 0;
  const part3Earned = submission.partScores?.part_3?.earned || 0;

  const totalScore = Number((part1Earned + part2Earned + part3Earned + part4Earned).toFixed(2));

  return {
    ...submission,
    score: totalScore,
    essayGrades: newEssayGrades,
    partScores: {
      ...submission.partScores,
      part_1: submission.partScores?.part_1 || { earned: 0, max: 0 },
      part_2: submission.partScores?.part_2 || { earned: 0, max: 0 },
      part_3: submission.partScores?.part_3 || { earned: 0, max: 0 },
      part_4: {
        earned: Number(part4Earned.toFixed(2)),
        max: Number((part4Max || submission.partScores?.part_4?.max || 0).toFixed(2)),
      },
    },
    details: updatedDetails,
  };
}

