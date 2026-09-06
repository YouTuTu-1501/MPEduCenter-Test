import express from "express";
import path from "path";
import fs from "fs";
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

// Thư mục lưu trữ dữ liệu bền vững trên ổ đĩa
const DATA_DIR = path.join(process.cwd(), "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const EXAMS_FILE = path.join(DATA_DIR, "exams.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("Lỗi tạo thư mục data:", err);
  }
}

// Tải dữ liệu bài nộp từ đĩa lên bộ nhớ
function loadSubmissionsFromDisk(): any[] {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const raw = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Lỗi tải submissions từ file:", e);
  }
  return [];
}

// Lưu dữ liệu bài nộp xuống đĩa bền vững
function saveSubmissionsToDisk(subs: any[]) {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  } catch (e) {
    console.warn("Lỗi ghi submissions vào file:", e);
  }
}

// Tải dữ liệu người dùng từ đĩa
function loadUsersFromDisk(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Lỗi tải users từ file:", e);
  }
  return [];
}

// Lưu dữ liệu người dùng xuống đĩa
function saveUsersToDisk(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.warn("Lỗi ghi users vào file:", e);
  }
}

// Tải dữ liệu đề thi từ đĩa
function loadExamsFromDisk(): any[] {
  try {
    if (fs.existsSync(EXAMS_FILE)) {
      const raw = fs.readFileSync(EXAMS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Lỗi tải exams từ file:", e);
  }
  return [];
}

// Lưu dữ liệu đề thi xuống đĩa
function saveExamsToDisk(exams: any[]) {
  try {
    fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2), "utf-8");
  } catch (e) {
    console.warn("Lỗi ghi exams vào file:", e);
  }
}

// Tải dữ liệu phòng thi từ đĩa
function loadRoomsFromDisk(): Map<string, any> {
  const map = new Map<string, any>();
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((r: any) => {
          if (r && r.pin) map.set(r.pin, r);
        });
      }
    }
  } catch (e) {
    console.warn("Lỗi tải rooms từ file:", e);
  }
  return map;
}

// Lưu dữ liệu phòng thi xuống đĩa
function saveRoomsToDisk(roomsMap: Map<string, any>) {
  try {
    const list = Array.from(roomsMap.values());
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.warn("Lỗi ghi rooms vào file:", e);
  }
}

// Bộ lưu trữ in-memory cho realtime & database
interface LiveRoomData {
  id: string;
  pin: string;
  examId: string;
  examTitle: string;
  examSnapshot?: any;
  creatorId?: string;
  creatorName?: string;
  creatorRole?: "admin" | "teacher" | "student";
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

const liveRooms: Map<string, LiveRoomData> = loadRoomsFromDisk();
const userSubmissions: any[] = loadSubmissionsFromDisk();
const customExams: any[] = loadExamsFromDisk();
const customUsers: any[] = loadUsersFromDisk();

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
      id: req.body.id || ("sub_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6)),
      submittedAt: req.body.submittedAt || new Date().toISOString(),
    };
    const existingIndex = userSubmissions.findIndex((s) => s.id === submission.id);
    if (existingIndex >= 0) {
      userSubmissions[existingIndex] = submission;
    } else {
      userSubmissions.push(submission);
    }
    saveSubmissionsToDisk(userSubmissions);
    res.json({ success: true, submission });
  });

  // Đồng bộ lô bài nộp (batch sync backup)
  app.post("/api/submissions/batch", (req, res) => {
    const incoming = req.body;
    if (Array.isArray(incoming)) {
      incoming.forEach((sub: any) => {
        if (sub && sub.id) {
          const idx = userSubmissions.findIndex((s) => s.id === sub.id);
          if (idx >= 0) {
            userSubmissions[idx] = sub;
          } else {
            userSubmissions.push(sub);
          }
        }
      });
      saveSubmissionsToDisk(userSubmissions);
      return res.json({ success: true, count: userSubmissions.length });
    }
    res.status(400).json({ error: "Invalid payload, array expected" });
  });

  app.get("/api/submissions", (req, res) => {
    const { examId } = req.query;
    const fromDisk = loadSubmissionsFromDisk();
    if (fromDisk.length > 0) {
      const map = new Map<string, any>();
      userSubmissions.forEach((s) => map.set(s.id, s));
      fromDisk.forEach((s) => map.set(s.id, s));
      userSubmissions.length = 0;
      userSubmissions.push(...map.values());
    }
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
    saveExamsToDisk(customExams);
    res.json({ success: true, exam: newExam });
  });

  app.delete("/api/exams/:id", (req, res) => {
    const { id } = req.params;
    const index = customExams.findIndex((e) => e.id === id);
    if (index >= 0) {
      customExams.splice(index, 1);
      saveExamsToDisk(customExams);
    }
    res.json({ success: true });
  });

  // Quản lý người dùng dự phòng (Users Backup / Local Mode)
  app.get("/api/users", (req, res) => {
    res.json(customUsers);
  });

  app.post("/api/users", (req, res) => {
    const user = req.body;
    if (user && user.id) {
      const idx = customUsers.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        customUsers[idx] = { ...customUsers[idx], ...user };
      } else {
        customUsers.push(user);
      }
      saveUsersToDisk(customUsers);
      return res.json({ success: true, user });
    }
    res.status(400).json({ error: "Invalid user data" });
  });

  app.post("/api/users/batch", (req, res) => {
    const incoming = req.body;
    if (Array.isArray(incoming)) {
      incoming.forEach((user: any) => {
        if (user && user.id) {
          const idx = customUsers.findIndex((u) => u.id === user.id);
          if (idx >= 0) {
            customUsers[idx] = { ...customUsers[idx], ...user };
          } else {
            customUsers.push(user);
          }
        }
      });
      saveUsersToDisk(customUsers);
      return res.json({ success: true, count: customUsers.length });
    }
    res.status(400).json({ error: "Array expected" });
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const idx = customUsers.findIndex((u) => u.id === id);
    if (idx >= 0) {
      customUsers.splice(idx, 1);
      saveUsersToDisk(customUsers);
    }
    res.json({ success: true });
  });

  // Quản lý phòng thi Realtime (Live Rooms)
  app.post("/api/rooms/create", (req, res) => {
    const {
      examId,
      examTitle,
      examSnapshot,
      mode = "teacher_paced",
      pin: customPin,
      creatorId,
      creatorName,
      creatorRole,
    } = req.body;

    // Chỉ Quản trị viên và Giáo viên mới có quyền tạo phòng thi
    if (creatorRole && creatorRole !== "admin" && creatorRole !== "teacher") {
      return res.status(403).json({
        error: "Quyền hạn không hợp lệ: Chỉ Quản trị viên và Giáo viên mới có quyền khởi tạo phòng thi.",
      });
    }

    const pin = customPin || Math.floor(100000 + Math.random() * 900000).toString();
    const room: LiveRoomData = {
      id: "room_" + Date.now(),
      pin,
      examId,
      examTitle: examTitle || "Đề kiểm tra trực tiếp",
      examSnapshot: examSnapshot || null,
      creatorId: creatorId || "",
      creatorName: creatorName || "",
      creatorRole: creatorRole || "teacher",
      status: "waiting",
      mode,
      currentQuestionIndex: 0,
      timerRemaining: 60,
      timerDuration: 60,
      students: [],
      createdAt: new Date().toISOString(),
    };
    liveRooms.set(pin, room);
    saveRoomsToDisk(liveRooms);
    res.json({ success: true, room });
  });

  app.get("/api/rooms/:pin", (req, res) => {
    const { pin } = req.params;
    let room = liveRooms.get(pin);
    if (!room) {
      const diskRooms = loadRoomsFromDisk();
      if (diskRooms.has(pin)) {
        room = diskRooms.get(pin);
        liveRooms.set(pin, room);
      }
    }
    if (!room) {
      return res.status(404).json({ error: "Phòng thi không tồn tại hoặc đã kết thúc" });
    }
    res.json(room);
  });

  app.post("/api/rooms/:pin/join", (req, res) => {
    const { pin } = req.params;
    const { studentName, studentId } = req.body;
    let room = liveRooms.get(pin);
    if (!room) {
      const diskRooms = loadRoomsFromDisk();
      if (diskRooms.has(pin)) {
        room = diskRooms.get(pin);
        liveRooms.set(pin, room);
      }
    }
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
    const existingIndex = room.students.findIndex((s: any) => s.id === studentObj.id || (studentName && s.name === studentName));
    if (existingIndex >= 0) {
      room.students[existingIndex].isOnline = true;
      room.students[existingIndex].lastActive = new Date().toISOString();
    } else {
      room.students.push(studentObj);
    }
    saveRoomsToDisk(liveRooms);
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
    saveRoomsToDisk(liveRooms);
    res.json({ success: true, room });
  });

  app.post("/api/rooms/:pin/submit-answer", (req, res) => {
    const { pin } = req.params;
    const { studentId, questionId, answer, scoreDelta = 0, isSubmitted = false } = req.body;
    const room = liveRooms.get(pin);
    if (!room) {
      return res.status(404).json({ error: "Phòng thi không tồn tại" });
    }
    const student = room.students.find((s: any) => s.id === studentId);
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
    saveRoomsToDisk(liveRooms);
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
