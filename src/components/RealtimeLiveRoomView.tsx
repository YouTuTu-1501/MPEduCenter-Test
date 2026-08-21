import React, { useState, useEffect } from "react";
import { Exam, LiveRoom, LiveStudent, Question } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import { cleanQuestionContent } from "../utils/latexParser";
import { playSound } from "../utils/audio";
import {
  Users,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Share2,
  Lock,
  ArrowRight,
  UserCheck,
} from "lucide-react";

interface RealtimeLiveRoomViewProps {
  exam: Exam;
  onExit: () => void;
}

export const RealtimeLiveRoomView: React.FC<RealtimeLiveRoomViewProps> = ({
  exam,
  onExit,
}) => {
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [studentPin, setStudentPin] = useState<string>("");
  const [myStudentId, setMyStudentId] = useState<string>("");

  // Câu trả lời của học sinh hiện tại
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);

  // Tạo phòng thi cho Giáo viên
  const handleCreateRoom = async (mode: "teacher_paced" | "student_paced") => {
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          examTitle: exam.title,
          mode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoom(data.room);
        setRole("teacher");
      }
    } catch {
      // Fallback local state nếu server offline
      const mockPin = Math.floor(100000 + Math.random() * 900000).toString();
      setRoom({
        id: "room_local_" + Date.now(),
        pin: mockPin,
        examId: exam.id,
        examTitle: exam.title,
        status: "waiting",
        mode,
        currentQuestionIndex: 0,
        timerRemaining: 60,
        timerDuration: 60,
        students: [
          {
            id: "stu_1",
            name: "Nguyễn Văn An",
            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=An",
            currentScore: 2.5,
            answers: {},
            isOnline: true,
            submitted: false,
            lastActive: new Date().toISOString(),
          },
          {
            id: "stu_2",
            name: "Trần Thị Bình",
            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Binh",
            currentScore: 3.0,
            answers: {},
            isOnline: true,
            submitted: false,
            lastActive: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      });
      setRole("teacher");
    }
  };

  // Học sinh tham gia phòng thi
  const handleJoinRoom = async () => {
    if (!studentPin || !studentName) return;
    try {
      const res = await fetch(`/api/rooms/${studentPin}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoom(data.room);
        setMyStudentId(data.student.id);
        setRole("student");
      } else {
        alert(data.error || "Không tìm thấy phòng thi!");
      }
    } catch {
      // Mock join
      setRoom({
        id: "room_mock",
        pin: studentPin,
        examId: exam.id,
        examTitle: exam.title,
        status: "in_progress",
        mode: "teacher_paced",
        currentQuestionIndex: 0,
        timerRemaining: 60,
        timerDuration: 60,
        students: [
          {
            id: "stu_me",
            name: studentName,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${studentName}`,
            currentScore: 0,
            answers: {},
            isOnline: true,
            submitted: false,
            lastActive: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
      });
      setMyStudentId("stu_me");
      setRole("student");
    }
  };

  // Polling đồng bộ phòng thi theo thời gian thực (mỗi 1.5s)
  useEffect(() => {
    if (!room?.pin) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${room.pin}`);
        if (res.ok) {
          const updated = await res.json();
          setRoom(updated);
        }
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [room?.pin]);

  // Giáo viên bắt đầu bài thi
  const handleStartRoom = async () => {
    if (!room) return;
    try {
      await fetch(`/api/rooms/${room.pin}/update-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress", currentQuestionIndex: 0, timerRemaining: 60 }),
      });
    } catch {}
    setRoom((prev) => (prev ? { ...prev, status: "in_progress", currentQuestionIndex: 0 } : null));
    playSound("correct");
  };

  // Giáo viên chuyển câu hỏi
  const handleTeacherChangeQuestion = async (delta: number) => {
    if (!room) return;
    const newIdx = Math.max(0, Math.min(exam.questions.length - 1, room.currentQuestionIndex + delta));
    try {
      await fetch(`/api/rooms/${room.pin}/update-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentQuestionIndex: newIdx, timerRemaining: 60 }),
      });
    } catch {}
    setRoom((prev) => (prev ? { ...prev, currentQuestionIndex: newIdx, timerRemaining: 60 } : null));
  };

  // Học sinh trả lời câu hỏi trực tiếp
  const handleStudentAnswer = async (ans: any) => {
    if (!room) return;
    const currentQ = exam.questions[room.currentQuestionIndex];
    if (!currentQ) return;

    setMyAnswers((prev) => ({ ...prev, [currentQ.id]: ans }));
    setIsAnswerSubmitted(true);
    playSound("correct");

    // Tính điểm tạm thời nếu đúng
    let isCorrect = false;
    if (currentQ.type === "single_choice") {
      isCorrect = ans === currentQ.correctAnswer;
    }

    try {
      await fetch(`/api/rooms/${room.pin}/submit-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: myStudentId,
          questionId: currentQ.id,
          answer: ans,
          scoreDelta: isCorrect ? currentQ.score : 0,
        }),
      });
    } catch {}
  };

  // ================= MÀN HÌNH CHỌN VAI TRÒ (CHƯA VÀO PHÒNG) BENTO =================
  if (!role || !room) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 text-slate-900 font-sans">
        <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="text-center">
            <span className="px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-100">
              REALTIME LIVE QUIZ ROOM
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-3 text-slate-900">Phòng Thi Đấu & Kiểm Tra Trực Tiếp</h2>
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                {exam.grade}
              </span>
              {exam.chapter && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium truncate max-w-xs">
                  {exam.chapter}
                </span>
              )}
              <span className="text-slate-500">Mã: {exam.code}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cột Giáo viên Bento Card */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg mb-3 shadow-xs">
                  👨‍🏫
                </div>
                <h3 className="font-bold text-base text-slate-900">Dành cho Giáo Viên</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tạo phòng thi với mã PIN 6 số, điều khiển chuyển câu và theo dõi tiến độ cả lớp theo thời gian thực.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCreateRoom("teacher_paced")}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
                >
                  Tạo phòng: GV điều phối ➔
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateRoom("student_paced")}
                  className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition"
                >
                  Tạo phòng: Học sinh tự do
                </button>
              </div>
            </div>

            {/* Cột Học sinh Bento Card */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg mb-3 shadow-xs">
                  🧑‍🎓
                </div>
                <h3 className="font-bold text-base text-slate-900">Dành cho Học Sinh</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Nhập mã PIN do giáo viên cung cấp để tham gia phòng thi trực tiếp và thi đua cùng các bạn.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <input
                  type="text"
                  value={studentPin}
                  onChange={(e) => setStudentPin(e.target.value)}
                  placeholder="Nhập mã PIN 6 số..."
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-center tracking-widest outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Họ và tên của bạn..."
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                >
                  Tham gia phòng thi ➔
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={onExit}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[room.currentQuestionIndex];

  // ================= GIAO DIỆN GIÁO VIÊN ĐIỀU KHIỂN =================
  if (role === "teacher") {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 flex flex-col">
        {/* Header Phòng thi GV */}
        <div className="max-w-7xl w-full mx-auto bg-slate-900 rounded-3xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-center shadow-lg">
              <span className="text-[10px] font-extrabold uppercase text-purple-200 block">Mã PIN Phòng</span>
              <span className="text-2xl sm:text-3xl font-black tracking-widest">{room.pin}</span>
            </div>

            <div>
              <h2 className="font-black text-base sm:text-lg">{room.examTitle}</h2>
              <p className="text-xs text-slate-400 font-semibold flex items-center gap-2">
                <span>{room.students.length} học sinh tham gia</span> •{" "}
                <span className="text-emerald-400">Trạng thái: {room.status === "waiting" ? "Đang đợi" : "Đang thi"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {room.status === "waiting" ? (
              <button
                type="button"
                onClick={handleStartRoom}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-xs sm:text-sm shadow-lg shadow-emerald-900 transition flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>BẮT ĐẦU THI</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-2xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleTeacherChangeQuestion(-1)}
                  disabled={room.currentQuestionIndex === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 font-bold text-xs"
                >
                  ❮ Câu trước
                </button>
                <span className="text-xs font-black px-2">
                  Câu {room.currentQuestionIndex + 1}/{exam.questions.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleTeacherChangeQuestion(1)}
                  disabled={room.currentQuestionIndex === exam.questions.length - 1}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 font-bold text-xs"
                >
                  Câu sau ❯
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onExit}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white font-bold text-xs transition"
            >
              Thoát
            </button>
          </div>
        </div>

        {/* Nội dung câu hỏi hiện tại + Bảng xếp hạng Realtime */}
        <div className="max-w-7xl w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cột trái: Slide câu hỏi đang chiếu */}
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
            {currentQ ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-3">
                  <span className="text-blue-400">{currentQ.partName}</span>
                  <span>Điểm chuẩn: {currentQ.score}đ</span>
                </div>

                <div className="text-base sm:text-lg font-semibold leading-relaxed">
                  <span className="font-black text-amber-400 mr-2">{currentQ.title}:</span>
                  <MathRenderer content={cleanQuestionContent(currentQ.content)} inline />
                </div>

                {currentQ.options && (
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    {currentQ.options.map((opt) => (
                      <div
                        key={opt.label}
                        className="p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-center gap-3 text-xs"
                      >
                        <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black">
                          {opt.label}
                        </span>
                        <MathRenderer content={opt.text} inline />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">Phòng thi đang ở trạng thái chờ.</div>
            )}

            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 mt-6 flex justify-between items-center text-xs text-slate-400">
              <span>Đang đồng bộ cho tất cả học sinh trong phòng.</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Activity className="w-4 h-4 animate-spin" /> Live Syncing
              </span>
            </div>
          </div>

          {/* Cột phải: Danh sách học sinh & Leaderboard */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-sm text-slate-200">Bảng Xếp Hạng & Tiến Độ Trực Tiếp</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[460px] pr-1">
              {room.students.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Chưa có học sinh nào vào phòng. Chia sẻ mã PIN: <b>{room.pin}</b> để bắt đầu.
                </p>
              ) : (
                room.students
                  .slice()
                  .sort((a, b) => b.currentScore - a.currentScore)
                  .map((stu, i) => (
                    <div
                      key={stu.id}
                      className="p-3 bg-slate-800 rounded-2xl border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 font-black text-slate-400">{i + 1}.</span>
                        <img src={stu.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-slate-700" />
                        <div>
                          <p className="font-bold text-slate-200">{stu.name}</p>
                          <span className="text-[10px] text-slate-500">
                            {stu.answers[currentQ?.id] ? "✓ Đã trả lời" : "Đang suy nghĩ..."}
                          </span>
                        </div>
                      </div>

                      <span className="font-black text-emerald-400 text-sm">{stu.currentScore}đ</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= GIAO DIỆN HỌC SINH THAM GIA PHÒNG =================
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-6">
        {/* Header học sinh */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700">
          <div>
            <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
              ĐANG THI TRỰC TIẾP (PIN: {room.pin})
            </span>
            <h2 className="font-black text-lg text-slate-100 mt-1">{studentName}</h2>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold"
          >
            Rời phòng
          </button>
        </div>

        {/* Trạng thái chờ GV bắt đầu */}
        {room.status === "waiting" ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mx-auto animate-pulse">
              ⏳
            </div>
            <h3 className="font-black text-lg">Đang chờ giáo viên bắt đầu bài thi...</h3>
            <p className="text-xs text-slate-400">Bạn đã kết nối thành công vào phòng thi số #{room.pin}.</p>
          </div>
        ) : (
          /* Trạng thái làm bài theo điều phối của GV */
          currentQ && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Câu {room.currentQuestionIndex + 1} ({currentQ.partName})</span>
                <span className="text-amber-400">Điểm: {currentQ.score}đ</span>
              </div>

              <div className="text-sm sm:text-base font-semibold leading-relaxed">
                <MathRenderer content={cleanQuestionContent(currentQ.content)} />
              </div>

              {/* Lựa chọn đáp án */}
              {currentQ.type === "single_choice" && currentQ.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = myAnswers[currentQ.id] === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleStudentAnswer(opt.label)}
                        className={`p-3.5 rounded-2xl border-2 text-left font-bold flex items-center gap-3 transition ${
                          isSelected
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                            : "bg-slate-700/60 border-slate-600 hover:bg-slate-700 text-slate-200"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                            isSelected ? "bg-white text-blue-700" : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <div className="flex-1 text-xs sm:text-sm">
                          <MathRenderer content={opt.text} inline />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};
