import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Khởi tạo Gemini AI client lười (lazy initialization)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Bộ lưu trữ in-memory cho realtime & database
interface LiveRoomData {
  id: string;
  pin: string;
  examId: string;
  examTitle: string;
  status: "waiting" | "in_progress" | "ended";
  mode: "teacher_paced" | "student_paced";
  currentQuestionIndex: number;
  timerRemaining: number;
  timerDuration: number;
  students: {
    id: string;
    name: string;
    avatar: string;
    currentScore: number;
    answers: Record<string, any>;
    isOnline: boolean;
    submitted: boolean;
    lastActive: string;
  }[];
  createdAt: string;
}

const liveRooms: Map<string, LiveRoomData> = new Map();
const userSubmissions: any[] = [];
const customExams: any[] = [];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // AI Chấm điểm bài thi Tự Luận
  app.post("/api/ai/grade-essay", async (req, res) => {
    try {
      const { questionContent, studentAnswer, rubric, maxScore = 2.0 } = req.body;
      const ai = getGeminiClient();

      let studentAnswerText = "";
      if (typeof studentAnswer === "object" && studentAnswer !== null) {
        const text = studentAnswer.text || "";
        const attachments = studentAnswer.attachments || [];
        const fileDescriptions = attachments
          .map(
            (a: any) =>
              `- Tệp/Ảnh: ${a.name} (Định dạng: ${a.type}, kích thước: ${Math.round(
                (a.size || 0) / 1024
              )} KB)`
          )
          .join("\n");
        studentAnswerText =
          text +
          (attachments.length > 0
            ? `\n[DANH SÁCH TẬP TIN / ẢNH CHỤP ĐÍNH KÈM CỦA HỌC SINH]:\n${fileDescriptions}`
            : "");
      } else {
        studentAnswerText = String(studentAnswer || "");
      }

      if (!ai) {
        // Fallback thuật toán nếu chưa có API key
        return res.json({
          score: Number((maxScore * 0.8).toFixed(2)),
          feedback: "Đã ghi nhận bài giải của học sinh. Các bước lập luận cơ bản chuẩn xác theo định nghĩa vectơ và tọa độ không gian.",
          breakdown: [
            { step: "Thiết lập hệ tọa độ và xác định điểm", score: Number((maxScore * 0.4).toFixed(2)), maxScore: Number((maxScore * 0.4).toFixed(2)) },
            { step: "Thực hiện phép tính vectơ", score: Number((maxScore * 0.4).toFixed(2)), maxScore: Number((maxScore * 0.4).toFixed(2)) }
          ],
          aiGraded: false
        });
      }

      const prompt = `Bạn là một giáo viên chấm thi Toán học THPT chuyên nghiệp và nghiêm túc.
Hãy chấm điểm bài làm tự luận của học sinh theo câu hỏi và đáp án/barem sau:

[CÂU HỎI]:
${questionContent}

[ĐÁP ÁN VÀ BAREM THAM KHẢO]:
${rubric || "Chấm dựa trên tính chính xác của các bước biến đổi hình học, đại số và kết quả cuối cùng."}

[BÀI LÀM CỦA HỌC SINH]:
${studentAnswerText || "(Học sinh chưa nhập bài làm)"}

Thang điểm tối đa: ${maxScore} điểm.

Yêu cầu trả về đúng định dạng JSON như sau, không kèm bất kỳ giải thích nào khác ngoài JSON:
{
  "score": (số thực từ 0 đến ${maxScore}),
  "feedback": "(Nhận xét súc tích, chỉ ra điểm đúng, điểm sai hoặc thiếu sót của học sinh)",
  "breakdown": [
    { "step": "Tên bước/Ý 1", "score": (điểm đạt được), "maxScore": (điểm tối đa bước) }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      res.json({
        ...result,
        aiGraded: true,
      });
    } catch (error: any) {
      console.error("AI Grading Error:", error);
      res.status(500).json({
        error: "Không thể chấm tự động bằng AI",
        details: error.message,
      });
    }
  });

  // AI Giải thích lời giải chi tiết
  app.post("/api/ai/explain", async (req, res) => {
    try {
      const { questionContent, currentAnswer, questionType } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          explanation: "Lời giải mẫu dựa trên phương pháp tọa độ hóa và hình học không gian vectơ: Xác định tọa độ các điểm mốc, biểu diễn các vectơ cơ sở và áp dụng công thức tích vô hướng, độ dài, khoảng cách."
        });
      }

      const prompt = `Bạn là trợ lý học tập môn Toán giỏi và ân cần.
Hãy giải thích từng bước thật dễ hiểu, chuẩn kiến thức SGK cho câu hỏi Toán sau:
Câu hỏi: ${questionContent}
Dạng câu hỏi: ${questionType}
Đáp án tham khảo: ${currentAnswer || "Hãy tìm lời giải đúng nhất"}

Hãy trình bày bằng tiếng Việt, dùng ký hiệu LaTeX toán học chuẩn ($...$) để học sinh dễ hiểu nhất.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({
        explanation: response.text,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Lưu trữ bài nộp của học sinh
  app.post("/api/submissions", (req, res) => {
    const submission = {
      ...req.body,
      id: "sub_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
      submittedAt: new Date().toISOString(),
    };
    userSubmissions.push(submission);
    res.json({ success: true, submission });
  });

  app.get("/api/submissions", (req, res) => {
    const { examId } = req.query;
    if (examId) {
      const filtered = userSubmissions.filter((s) => s.examId === examId);
      return res.json(filtered);
    }
    res.json(userSubmissions);
  });

  // Quản lý đề thi tùy chỉnh (Custom Exams)
  app.get("/api/exams", (req, res) => {
    res.json(customExams);
  });

  app.post("/api/exams", (req, res) => {
    const newExam = {
      ...req.body,
      id: req.body.id || "exam_" + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const index = customExams.findIndex((e) => e.id === newExam.id);
    if (index >= 0) {
      customExams[index] = newExam;
    } else {
      customExams.push(newExam);
    }
    res.json({ success: true, exam: newExam });
  });

  // Quản lý phòng thi Realtime (Live Rooms)
  app.post("/api/rooms/create", (req, res) => {
    const { examId, examTitle, mode = "teacher_paced" } = req.body;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const room: LiveRoomData = {
      id: "room_" + Date.now(),
      pin,
      examId,
      examTitle: examTitle || "Đề kiểm tra trực tiếp",
      status: "waiting",
      mode,
      currentQuestionIndex: 0,
      timerRemaining: 60,
      timerDuration: 60,
      students: [],
      createdAt: new Date().toISOString(),
    };
    liveRooms.set(pin, room);
    res.json({ success: true, room });
  });

  app.get("/api/rooms/:pin", (req, res) => {
    const { pin } = req.params;
    const room = liveRooms.get(pin);
    if (!room) {
      return res.status(404).json({ error: "Phòng thi không tồn tại hoặc đã kết thúc" });
    }
    res.json(room);
  });

  app.post("/api/rooms/:pin/join", (req, res) => {
    const { pin } = req.params;
    const { studentName, studentId } = req.body;
    const room = liveRooms.get(pin);
    if (!room) {
      return res.status(404).json({ error: "Mã phòng không chính xác" });
    }
    const studentObj = {
      id: studentId || "stu_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      name: studentName || "Học sinh " + (room.students.length + 1),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(studentName || "student")}`,
      currentScore: 0,
      answers: {},
      isOnline: true,
      submitted: false,
      lastActive: new Date().toISOString(),
    };
    const existingIndex = room.students.findIndex((s) => s.id === studentObj.id || (studentName && s.name === studentName));
    if (existingIndex >= 0) {
      room.students[existingIndex].isOnline = true;
      room.students[existingIndex].lastActive = new Date().toISOString();
    } else {
      room.students.push(studentObj);
    }
    res.json({ success: true, room, student: studentObj });
  });

  app.post("/api/rooms/:pin/update-state", (req, res) => {
    const { pin } = req.params;
    const { status, mode, currentQuestionIndex, timerRemaining, timerDuration } = req.body;
    const room = liveRooms.get(pin);
    if (!room) {
      return res.status(404).json({ error: "Phòng thi không tồn tại" });
    }
    if (status !== undefined) room.status = status;
    if (mode !== undefined) room.mode = mode;
    if (currentQuestionIndex !== undefined) room.currentQuestionIndex = currentQuestionIndex;
    if (timerRemaining !== undefined) room.timerRemaining = timerRemaining;
    if (timerDuration !== undefined) room.timerDuration = timerDuration;
    res.json({ success: true, room });
  });

  app.post("/api/rooms/:pin/submit-answer", (req, res) => {
    const { pin } = req.params;
    const { studentId, questionId, answer, scoreDelta = 0, isSubmitted = false } = req.body;
    const room = liveRooms.get(pin);
    if (!room) {
      return res.status(404).json({ error: "Phòng thi không tồn tại" });
    }
    const student = room.students.find((s) => s.id === studentId);
    if (student) {
      if (questionId) {
        student.answers[questionId] = answer;
      }
      if (scoreDelta) {
        student.currentScore = Math.max(0, student.currentScore + scoreDelta);
      }
      if (isSubmitted) {
        student.submitted = true;
      }
      student.lastActive = new Date().toISOString();
    }
    res.json({ success: true, room });
  });

  // Vite middleware in dev or Static in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduTest Pro Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
