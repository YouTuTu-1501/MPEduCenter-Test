export type QuestionType = "single_choice" | "true_false" | "short_answer" | "essay";
export type PartType = "part_1" | "part_2" | "part_3" | "part_4";
export type DifficultyLevel = "easy" | "medium" | "hard" | "expert";

export interface EssayAttachment {
  id: string;
  name: string;
  type: "image" | "pdf" | "word" | "other";
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface EssayAnswer {
  text: string;
  attachments?: EssayAttachment[];
}

export interface ChoiceOption {
  label: string; // A, B, C, D
  text: string;
  isCorrect: boolean;
}

export interface TrueFalseItem {
  label: string; // a, b, c, d
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
  code?: string;
  title: string; // Câu 1, Câu 2...
  part: PartType;
  partName: string; // "PHẦN I (Trắc nghiệm)", "PHẦN II (Đúng-Sai)", "PHẦN III (Trả lời ngắn)", "PHẦN IV (Tự luận)"
  type: QuestionType;
  content: string;
  image?: string; // Data URL or URL
  options?: ChoiceOption[]; // Cho dạng single_choice
  tfItems?: TrueFalseItem[]; // Cho dạng true_false (4 ý a, b, c, d)
  correctAnswer?: string; // Cho dạng short_answer hoặc single_choice (A, B, C, D)
  tolerance?: number; // Độ lệch cho phép với số thập phân
  rubric?: string; // Barem chấm điểm cho dạng essay
  explanation: string;
  score: number;
  difficulty?: DifficultyLevel;
  topic?: string;
}

export interface Exam {
  id: string;
  title: string;
  code: string; // Mã đề: 001, 102...
  subject: string;
  grade: string; // "Lớp 10" | "Lớp 11" | "Lớp 12" | ...
  chapter?: string; // "Chương 1: ...", "Chương 2: ...", v.v.
  durationMinutes: number;
  description: string;
  author: string;
  totalScore: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

// Cấu trúc danh mục Lớp và Chương chuẩn chương trình GDPT môn Toán
export const STANDARD_GRADES = ["Lớp 12", "Lớp 11", "Lớp 10"] as const;

export const STANDARD_CHAPTERS_BY_GRADE: Record<string, string[]> = {
  "Lớp 12": [
    "Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
    "Chương 2: Vectơ và Hệ trục toạ độ trong không gian Oxyz",
    "Chương 3: Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm",
    "Chương 4: Nguyên hàm, Tích phân và Ứng dụng",
    "Chương 5: Phương pháp tọa độ trong không gian Oxyz (Mặt phẳng, Đường thẳng, Mặt cầu)",
    "Chương 6: Xác suất có điều kiện và Công thức Bayes",
    "Ôn tập Học kỳ 1 & Học kỳ 2",
    "Luyện thi Tốt nghiệp THPT Quốc gia",
  ],
  "Lớp 11": [
    "Chương 1: Hàm số lượng giác và Phương trình lượng giác",
    "Chương 2: Dãy số. Cấp số cộng và Cấp số nhân",
    "Chương 3: Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm",
    "Chương 4: Quan hệ song song trong không gian",
    "Chương 5: Giới hạn. Hàm số liên tục",
    "Chương 6: Hàm số mũ và Hàm số logarit",
    "Chương 7: Đạo hàm và Ứng dụng",
    "Chương 8: Quan hệ vuông góc trong không gian",
    "Chương 9: Xác suất cổ điển",
    "Ôn tập Học kỳ 1 & Học kỳ 2",
  ],
  "Lớp 10": [
    "Chương 1: Mệnh đề và Tập hợp",
    "Chương 2: Bất phương trình và Hệ bất phương trình bậc nhất hai ẩn",
    "Chương 3: Hàm số bậc hai và Đồ thị",
    "Chương 4: Hệ thức lượng trong tam giác",
    "Chương 5: Vectơ và Các phép toán trên vectơ",
    "Chương 6: Thống kê và Các số đặc trưng",
    "Chương 7: Bất phương trình bậc hai một ẩn",
    "Chương 8: Đại số tổ hợp (Quy tắc đếm, Hoán vị, Chỉnh hợp, Tổ hợp, Nhị thức Newton)",
    "Chương 9: Phương pháp tọa độ trong mặt phẳng Oxy",
    "Chương 10: Xác suất",
    "Ôn tập Học kỳ 1 & Học kỳ 2",
  ],
};

export interface StudentSubmission {
  id: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentId: string;
  answers: Record<string, any>;
  score: number;
  maxScore: number;
  partScores: {
    part_1: { earned: number; max: number };
    part_2: { earned: number; max: number };
    part_3: { earned: number; max: number };
    part_4: { earned: number; max: number };
  };
  details: Record<
    string,
    {
      isCorrect: boolean;
      earnedScore: number;
      maxScore: number;
      userAnswer: any;
      correctAnswer: any;
      feedback?: string;
    }
  >;
  essayGrades?: Record<
    string,
    {
      score: number;
      feedback: string;
      aiGraded?: boolean;
      breakdown?: { step: string; score: number; maxScore: number }[];
    }
  >;
  submittedAt: string;
  timeSpentSeconds: number;
}

export interface LiveStudent {
  id: string;
  name: string;
  avatar: string;
  currentScore: number;
  answers: Record<string, any>;
  isOnline: boolean;
  submitted: boolean;
  lastActive: string;
}

export interface LiveRoom {
  id: string;
  pin: string;
  examId: string;
  examTitle: string;
  status: "waiting" | "in_progress" | "ended";
  mode: "teacher_paced" | "student_paced";
  currentQuestionIndex: number;
  timerRemaining: number;
  timerDuration: number;
  students: LiveStudent[];
  createdAt: string;
}
