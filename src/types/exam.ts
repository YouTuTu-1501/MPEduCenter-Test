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
  targetClass?: string; // Lớp áp dụng: "Tất cả các lớp" | "12A1" | "12A2" | "11A1" | "10A1"...
  assignedClasses?: string[]; // Danh sách các lớp được phân công
  chapter?: string; // "Chương 1: ...", "Chương 2: ...", v.v.
  durationMinutes: number;
  description: string;
  author: string;
  totalScore: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;

  // Tính năng Khóa / Mở & Hẹn giờ & Giao đề theo mã
  isLocked?: boolean; // true = Đã khóa (không cho học sinh vào thi), false = Đang mở
  scheduleEnabled?: boolean; // Bật chế độ hẹn giờ mở/đóng
  scheduledOpenTime?: string; // Thời gian mở đề (ISO string hoặc YYYY-MM-DDTHH:mm)
  scheduledCloseTime?: string; // Thời gian đóng đề (ISO string hoặc YYYY-MM-DDTHH:mm)
  password?: string; // Mật khẩu truy cập đề (tùy chọn)
  allowReview?: boolean; // Cho phép xem lại đáp án sau khi nộp
}

export type ExamAccessStatusType = "open" | "locked" | "upcoming" | "ended";

export interface ExamAccessStatus {
  status: ExamAccessStatusType;
  canEnter: boolean;
  badgeLabel: string;
  badgeColor: string;
  message: string;
  timeRemainingText?: string;
  openDateFormatted?: string;
  closeDateFormatted?: string;
}

/**
 * Kiểm tra trạng thái truy cập của đề thi (Đang mở, Bị khóa, Chưa đến giờ, Hết hạn)
 */
export const checkExamAccessStatus = (exam: Exam): ExamAccessStatus => {
  // 1. Kiểm tra khóa thủ công
  if (exam.isLocked) {
    return {
      status: "locked",
      canEnter: false,
      badgeLabel: "ĐÃ KHÓA",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      message: "Đề thi hiện đang bị khóa bởi giáo viên. Vui lòng liên hệ giáo viên để được mở quyền làm bài.",
    };
  }

  // 2. Nếu không bật hẹn giờ -> Đang mở tự do
  if (!exam.scheduleEnabled) {
    return {
      status: "open",
      canEnter: true,
      badgeLabel: "ĐANG MỞ",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      message: "Đề thi đang mở. Bạn có thể bắt đầu làm bài ngay bây giờ.",
    };
  }

  const now = new Date().getTime();

  // 3. Kiểm tra hẹn giờ mở
  if (exam.scheduledOpenTime) {
    const openTime = new Date(exam.scheduledOpenTime).getTime();
    if (!isNaN(openTime) && now < openTime) {
      const diffMs = openTime - now;
      const diffMinutes = Math.ceil(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMin = diffMinutes % 60;

      let remainingText = "";
      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24);
        remainingText = `sau ${days} ngày nữa`;
      } else if (diffHours > 0) {
        remainingText = `sau ${diffHours} giờ ${remainingMin} phút nữa`;
      } else {
        remainingText = `sau ${diffMinutes} phút nữa`;
      }

      const openDateFormatted = new Date(openTime).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return {
        status: "upcoming",
        canEnter: false,
        badgeLabel: "HẸN GIỜ MỞ",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        message: `Đề thi chưa đến giờ mở. Thời gian mở: ${openDateFormatted} (${remainingText}).`,
        timeRemainingText: remainingText,
        openDateFormatted,
      };
    }
  }

  // 4. Kiểm tra hẹn giờ đóng / hết hạn
  if (exam.scheduledCloseTime) {
    const closeTime = new Date(exam.scheduledCloseTime).getTime();
    if (!isNaN(closeTime) && now > closeTime) {
      const closeDateFormatted = new Date(closeTime).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      return {
        status: "ended",
        canEnter: false,
        badgeLabel: "ĐÃ HẾT HẠN",
        badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
        message: `Đề thi đã hết hạn làm bài vào lúc ${closeDateFormatted}.`,
        closeDateFormatted,
      };
    }
  }

  // 5. Đang trong khung giờ mở thi
  let closeDateFormatted = "";
  if (exam.scheduledCloseTime) {
    closeDateFormatted = new Date(exam.scheduledCloseTime).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return {
    status: "open",
    canEnter: true,
    badgeLabel: "ĐANG MỞ THI",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    message: closeDateFormatted
      ? `Đề thi đang mở (Hạn chót: ${closeDateFormatted}).`
      : "Đề thi đang mở tự do cho học sinh làm bài.",
    closeDateFormatted,
  };
};

// Cấu trúc danh mục Khối Lớp và Lớp học chuẩn (THPT & THCS)
export const STANDARD_GRADES = [
  "Lớp 12",
  "Lớp 11",
  "Lớp 10",
  "Lớp 9",
  "Lớp 8",
  "Lớp 7",
  "Lớp 6",
] as const;

// Danh mục mã lớp cơ bản đại diện cho từng khối
export const STANDARD_CLASSES: readonly string[] = ["12", "11", "10", "9", "8", "7", "6"];

/**
 * Lấy danh sách lớp học THỰC TẾ khả dụng cho một khối lớp cụ thể
 * Chỉ hiển thị các lớp thực có trong hệ thống (từ tài khoản học sinh `users`, hoặc đề thi `exams`)
 * Tuyệt đối không sinh lớp ảo (như 10A1, 10A2... khi hệ thống chưa có các lớp này)
 */
export const getAvailableClassesForGrade = (
  gradeStr?: string,
  existingUsers?: { schoolClass?: string }[],
  existingExams?: { targetClass?: string; grade?: string }[]
): string[] => {
  const currentGrade = gradeStr || "Lớp 12";
  const gradeNumMatch = currentGrade.match(/\d+/);
  const gradeNum = gradeNumMatch ? gradeNumMatch[0] : "";

  // 1. Quét danh sách người dùng thực tế từ props hoặc localStorage
  let userList = existingUsers;
  if (!userList || userList.length === 0) {
    try {
      const localUsers = typeof localStorage !== "undefined" ? localStorage.getItem("mpeducenter_users") : null;
      if (localUsers) {
        userList = JSON.parse(localUsers);
      }
    } catch {
      // ignore
    }
  }

  // 2. Quét danh sách đề thi thực tế từ props hoặc localStorage
  let examList = existingExams;
  if (!examList || examList.length === 0) {
    try {
      const localExams = typeof localStorage !== "undefined" ? localStorage.getItem("edutest_exams") : null;
      if (localExams) {
        examList = JSON.parse(localExams);
      }
    } catch {
      // ignore
    }
  }

  const set = new Set<string>();

  // Trích xuất lớp từ danh sách tài khoản học sinh / người dùng thực tế
  if (userList && Array.isArray(userList)) {
    userList.forEach((u) => {
      let cls = u.schoolClass?.trim();
      if (cls && cls !== "Tất cả các lớp" && cls !== "Chưa xếp lớp") {
        if (cls.startsWith("Lớp ")) {
          cls = cls.replace(/^Lớp\s+/, "");
        }
        if (!gradeNum || cls.startsWith(gradeNum) || cls.includes(gradeNum) || cls === currentGrade) {
          set.add(cls);
        }
      }
    });
  }

  // Trích xuất lớp từ các đề thi đã tạo thực tế
  if (examList && Array.isArray(examList)) {
    examList.forEach((e) => {
      let cls = e.targetClass?.trim();
      if (cls && cls !== "Tất cả các lớp" && cls !== "Chưa xếp lớp") {
        if (cls.startsWith("Lớp ")) {
          cls = cls.replace(/^Lớp\s+/, "");
        }
        if (!gradeNum || cls.startsWith(gradeNum) || cls.includes(gradeNum) || e.grade === currentGrade) {
          set.add(cls);
        }
      }
    });
  }

  // Nếu trong hệ thống chưa có lớp con cụ thể nào của khối này,
  // chỉ đưa ra đúng lớp gốc thực có đại diện cho khối (ví dụ Khối 10 là lớp "10", Khối 11 là "11", Khối 12 là "12")
  if (set.size === 0 && gradeNum) {
    set.add(gradeNum);
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
};

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
  "Lớp 9": [
    "Chương 1: Phương trình và hệ hai phương trình bậc nhất hai ẩn",
    "Chương 2: Bất đẳng thức. Bất phương trình bậc nhất một ẩn",
    "Chương 3: Căn bậc hai và căn bậc ba",
    "Chương 4: Hệ thức lượng trong tam giác vuông",
    "Chương 5: Đường tròn và các yếu tố đường tròn",
    "Chương 6: Hàm số y = ax² (a ≠ 0). Phương trình bậc hai một ẩn",
    "Chương 7: Tần số và tần số tương đối (Bảng và Biểu đồ)",
    "Chương 8: Xác suất của biến cố trong một số mô hình đơn giản",
    "Chương 9: Đường tròn ngoại tiếp và đường tròn nội tiếp tam giác, đa giác",
    "Chương 10: Một số hình khối trong không gian thực tiễn (Hình trụ, nón, cầu)",
    "Ôn tập Học kỳ 1 & Học kỳ 2",
    "Luyện thi Tuyển sinh vào Lớp 10 THPT",
  ],
  "Lớp 8": [
    "Chương 1: Đa thức nhiều biến. Các phép tính cộng, trừ, nhân, chia đa thức",
    "Chương 2: Hằng đẳng thức đáng nhớ và ứng dụng phân tích đa thức thành nhân tử",
    "Chương 3: Tứ giác (Hình thang cân, Hình bình hành, Hình chữ nhật, Hình thoi, Hình vuông)",
    "Chương 4: Định lí Thalès trong tam giác",
    "Chương 5: Dữ liệu và biểu đồ (Thu thập, biểu diễn và phân tích dữ liệu)",
    "Chương 6: Phân thức đại số và các phép tính phân thức",
    "Chương 7: Phương trình bậc nhất một ẩn và hàm số bậc nhất y = ax + b",
    "Chương 8: Mở đầu về tính xác suất của biến cố",
    "Chương 9: Tam giác đồng dạng và hình đồng dạng",
    "Chương 10: Một số hình khối trong thực tiễn (Hình chóp tam giác đều, tứ giác đều)",
    "Ôn tập Học kỳ 1 & Học kỳ 2",
  ],
  "Lớp 7": [
    "Chương 1: Số hữu tỉ và các phép tính trong tập hợp số hữu tỉ",
    "Chương 2: Số thực (Số thập phân vô hạn, Căn bậc hai số học, Giá trị tuyệt đối)",
    "Chương 3: Góc và hai đường thẳng song song",
    "Chương 4: Tam giác bằng nhau và các trường hợp bằng nhau của tam giác",
    "Chương 5: Thu thập và biểu diễn dữ liệu (Biểu đồ đoạn thẳng, biểu đồ hình quạt tròn)",
    "Chương 6: Tỉ lệ thức và Đại lượng tỉ lệ thuận, tỉ lệ nghịch",
    "Chương 7: Biểu thức đại số và Đa thức một biến",
    "Chương 8: Làm quen với biến cố và xác suất của biến cố",
    "Chương 9: Quan hệ giữa các yếu tố trong một tam giác (Bất đẳng thức tam giác, đường đồng quy)",
    "Chương 10: Một số hình khối trong thực tiễn (Hình hộp chữ nhật, hình lập phương, hình lăng trụ đứng)",
    "Ôn tập Học kỳ 1 & Học kỳ 2",
  ],
  "Lớp 6": [
    "Chương 1: Tập hợp các số tự nhiên (Các phép tính, Lũy thừa, Tính chia hết, Số nguyên tố, ƯC và BC)",
    "Chương 2: Số nguyên (Số nguyên âm, Phép cộng, trừ, nhân, chia số nguyên, Quy tắc dấu ngoặc)",
    "Chương 3: Hình học trực quan (Tam giác đều, Hình vuông, Lục giác đều, Hình chữ nhật, Hình thoi, Hình bình hành, Hình thang cân)",
    "Chương 4: Một số yếu tố thống kê (Thu thập dữ liệu, Bảng thống kê, Biểu đồ tranh, Biểu đồ cột, Cột kép)",
    "Chương 5: Phân số (Khái niệm phân số, Tính chất cơ bản, Các phép tính với phân số, Hỗn số)",
    "Chương 6: Số thập phân (Khái niệm, Các phép tính với số thập phân, Làm tròn số, Tỉ số và tỉ số phần trăm)",
    "Chương 7: Hình học phẳng (Điểm, Đường thẳng, Tia, Đoạn thẳng, Độ dài đoạn thẳng, Trung điểm, Góc)",
    "Chương 8: Một số yếu tố xác suất (Làm quen với xác suất thực nghiệm trong trò chơi đơn giản)",
    "Ôn tập Học kỳ 1 & Học kỳ 2",
  ],
};

export interface StudentSubmission {
  id: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentId: string;
  studentEmail?: string;
  studentClass?: string;
  studentAvatar?: string;
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
      gradedAt?: string;
      gradedBy?: string;
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
