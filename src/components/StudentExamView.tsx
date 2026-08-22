import React, { useState, useEffect, useMemo, useRef } from "react";
import { Exam, Question, StudentSubmission, EssayAnswer } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import { EssayAnswerInput } from "./EssayAnswerInput";
import { InteractiveFigureViewer } from "./InteractiveFigureViewer";
import { StudentScratchpad } from "./StudentScratchpad";
import { MathScratchpadModal } from "./MathScratchpadModal";
import { cleanQuestionContent } from "../utils/latexParser";
import { evaluateExamSubmission } from "../utils/scoring";
import { playSound } from "../utils/audio";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import confetti from "canvas-confetti";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  Award,
  Sparkles,
  RefreshCw,
  FileText,
  Check,
  X,
  BookOpen,
  BrainCircuit,
  PieChart,
  Image as ImageIcon,
  FileCode,
  Download,
  Eye,
  Paperclip,
  Maximize,
  Minimize,
  Save,
  Timer,
  Hourglass,
  AlertTriangle,
  Flame,
  Pencil,
  Edit3,
} from "lucide-react";

interface StudentExamViewProps {
  exam: Exam;
  onExit: () => void;
  onSubmissionComplete?: (sub: StudentSubmission) => void;
}

export const StudentExamView: React.FC<StudentExamViewProps> = ({
  exam,
  onExit,
  onSubmissionComplete,
}) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [studentName, setStudentName] = useState<string>(
    currentUser.role === "student" && currentUser.schoolClass
      ? `${currentUser.name} - ${currentUser.schoolClass}`
      : currentUser.name || "Học sinh"
  );
  const [studentId, setStudentId] = useState<string>(
    currentUser.role === "student" && currentUser.schoolClass
      ? `${currentUser.schoolClass}_${currentUser.id.slice(-4)}`
      : `HS_${currentUser.id.slice(-4)}`
  );
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // Tổng thời gian làm bài (giây)
  const totalDurationSeconds = useMemo(() => exam.durationMinutes * 60, [exam.durationMinutes]);

  // Câu hỏi hiện tại & câu trả lời
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Thời gian & Đồng hồ đếm ngược chính xác
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalDurationSeconds);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const targetEndTimeRef = useRef<number>(Date.now() + totalDurationSeconds * 1000);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const warned5MinRef = useRef<boolean>(false);
  const warned1MinRef = useRef<boolean>(false);
  const autoSubmittedRef = useRef<boolean>(false);

  // Tự động khôi phục nháp bài làm nếu có
  // Tải bản nháp trước đó nếu có (Bảo vệ tiến độ bài thi của học sinh)
  useEffect(() => {
    try {
      // Thử đọc từ key chuẩn theo ID người dùng hoặc mã học sinh
      const primaryKey = `edutest_draft_${exam.id}_${currentUser.id}`;
      const legacyKey = `edutest_draft_${exam.id}_${studentId}`;
      const genericKey = `edutest_draft_${exam.id}`;

      const raw =
        localStorage.getItem(primaryKey) ||
        localStorage.getItem(legacyKey) ||
        localStorage.getItem(genericKey);

      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && draft.userAnswers && Object.keys(draft.userAnswers).length > 0) {
          setUserAnswers(draft.userAnswers);
          if (draft.flaggedQuestions) setFlaggedQuestions(draft.flaggedQuestions);
          if (draft.currentIdx !== undefined) setCurrentIdx(draft.currentIdx);
          if (draft.secondsRemaining !== undefined && draft.secondsRemaining > 0) {
            setSecondsRemaining(draft.secondsRemaining);
            targetEndTimeRef.current = Date.now() + draft.secondsRemaining * 1000;
          }
          if (draft.hasStarted) {
            setHasStarted(true);
            setStartTime(draft.startTime || (Date.now() - (totalDurationSeconds - (draft.secondsRemaining || totalDurationSeconds)) * 1000));
          }
          toast.info(
            "Đã khôi phục bài làm của bạn",
            `Hệ thống đã tự động nạp lại ${Object.keys(draft.userAnswers).length} câu trả lời đang làm dở.`
          );
        }
      }
    } catch (e) {
      console.warn("Lỗi khôi phục nháp:", e);
    }
  }, [exam.id, currentUser.id, studentId, totalDurationSeconds]);

  // Tự động lưu tiến độ làm bài liên tục (Auto-save) sau mỗi thay đổi đáp án hoặc chuyển câu
  useEffect(() => {
    if (!hasStarted || Object.keys(userAnswers).length === 0) return;
    try {
      const draftData = {
        examId: exam.id,
        studentName,
        studentId,
        userId: currentUser.id,
        userAnswers,
        flaggedQuestions,
        currentIdx,
        secondsRemaining,
        hasStarted: true,
        startTime,
        savedAt: Date.now(),
      };
      localStorage.setItem(`edutest_draft_${exam.id}_${currentUser.id}`, JSON.stringify(draftData));
      localStorage.setItem(`edutest_draft_${exam.id}_${studentId}`, JSON.stringify(draftData));
    } catch {}
  }, [userAnswers, flaggedQuestions, currentIdx, secondsRemaining, hasStarted, startTime, exam.id, currentUser.id, studentId, studentName]);

  // Trạng thái nộp bài
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);

  // Bắt đầu làm bài thi & khởi tạo đích thời gian chính xác
  const handleStartExam = () => {
    const remaining = secondsRemaining > 0 ? secondsRemaining : totalDurationSeconds;
    targetEndTimeRef.current = Date.now() + remaining * 1000;
    setStartTime(Date.now());
    setHasStarted(true);
  };

  // Chế độ Toàn màn hình (Tập trung làm bài)
  const examContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (examContainerRef.current) {
          await examContainerRef.current.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen request failed or was denied:", err);
    }
  };

  // AI Chấm điểm tự luận
  const [aiGradingState, setAiGradingState] = useState<
    Record<string, { loading: boolean; result?: any; error?: string }>
  >({});

  // Viết vẽ nháp trên màn hình & Bảng nháp mở rộng
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);
  const [showScratchpadModal, setShowScratchpadModal] = useState<boolean>(false);

  const currentQ = exam.questions[currentIdx];

  // Đếm ngược thời gian thi thời gian thực chính xác & tự động nộp bài khi hết giờ
  useEffect(() => {
    if (!hasStarted || submission || isTimeUp) return;

    const checkCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setSecondsRemaining(diff);

      // Cảnh báo mốc 5 phút
      if (diff <= 300 && diff > 290 && !warned5MinRef.current && totalDurationSeconds > 300) {
        warned5MinRef.current = true;
        toast.warning(
          "Thời gian còn lại 5 phút!",
          "Vui lòng kiểm tra lại các câu hỏi đã gắn cờ và chuẩn bị hoàn tất bài thi."
        );
        playSound("tick");
      }

      // Cảnh báo khẩn cấp mốc 1 phút
      if (diff <= 60 && diff > 50 && !warned1MinRef.current && totalDurationSeconds > 60) {
        warned1MinRef.current = true;
        toast.error(
          "Khẩn cấp: Chỉ còn 1 phút!",
          "Hệ thống sẽ tự động thu bài và khóa bài thi ngay khi đồng hồ điểm 00:00."
        );
        playSound("timeup");
      }

      // Tự động nộp bài khi hết giờ
      if (diff <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        setIsTimeUp(true);
        playSound("timeup");
        toast.error(
          "HẾT GIỜ LÀM BÀI!",
          "Thời gian thi đã kết thúc. Hệ thống đang tiến hành tự động thu bài và chấm điểm..."
        );
        setTimeout(() => {
          handleSubmitExam();
        }, 1500);
      }
    };

    checkCountdown();
    const interval = setInterval(checkCountdown, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, submission, isTimeUp, totalDurationSeconds]);

  // Format thời gian mm:ss hoặc hh:mm:ss
  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Tỷ lệ thời gian còn lại (0 -> 100%)
  const timeProgressPercent = useMemo(() => {
    if (totalDurationSeconds <= 0) return 100;
    return Math.max(0, Math.min(100, (secondsRemaining / totalDurationSeconds) * 100));
  }, [secondsRemaining, totalDurationSeconds]);

  const [selectedReviewImage, setSelectedReviewImage] = useState<string | null>(null);

  // Tính số câu đã hoàn thành
  const answeredCount = useMemo(() => {
    let count = 0;
    exam.questions.forEach((q) => {
      const ans = userAnswers[q.id];
      if (q.type === "single_choice" && ans) count++;
      else if (q.type === "true_false" && ans && Object.keys(ans).length === (q.tfItems?.length || 4)) count++;
      else if (q.type === "short_answer" && ans && String(ans).trim() !== "") count++;
      else if (q.type === "essay" && ans) {
        if (typeof ans === "string" && ans.trim() !== "") count++;
        else if (typeof ans === "object" && (ans.text?.trim() || (ans.attachments && ans.attachments.length > 0))) count++;
      }
    });
    return count;
  }, [userAnswers, exam.questions]);

  // Toggle gắn cờ xem lại
  const toggleFlag = (qId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Lưu nháp bài thi
  const handleSaveDraft = () => {
    try {
      const draftData = {
        examId: exam.id,
        studentName,
        studentId,
        userAnswers,
        flaggedQuestions,
        currentIdx,
        secondsRemaining,
        savedAt: Date.now(),
      };
      localStorage.setItem(`edutest_draft_${exam.id}_${studentId}`, JSON.stringify(draftData));
      playSound("correct");
      toast.success(
        "Lưu nháp bài thi thành công!",
        `Đã lưu trạng thái ${answeredCount}/${exam.questions.length} câu lúc ${new Date().toLocaleTimeString("vi-VN")}.`
      );
    } catch (e) {
      toast.error("Lỗi khi lưu nháp", "Không thể ghi vào bộ nhớ tạm của trình duyệt.");
    }
  };

  // Nộp bài thi
  const handleSubmitExam = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const result = evaluateExamSubmission(
      exam,
      userAnswers,
      studentName,
      currentUser.id || studentId,
      timeSpent,
      {
        studentEmail: currentUser.email,
        studentClass: currentUser.schoolClass || (studentName.includes("-") ? studentName.split("-")[1]?.trim() : "12A1"),
        studentAvatar: currentUser.avatar,
      }
    );

    // Xóa bản nháp sau khi đã nộp bài thành công
    try {
      localStorage.removeItem(`edutest_draft_${exam.id}_${currentUser.id}`);
      localStorage.removeItem(`edutest_draft_${exam.id}_${studentId}`);
      localStorage.removeItem(`edutest_draft_${exam.id}`);
      
      // Đồng thời lưu ngay vào danh sách submissions trong localStorage
      const existingSubsRaw = localStorage.getItem("edutest_submissions");
      const existingSubs = existingSubsRaw ? JSON.parse(existingSubsRaw) : [];
      const updatedSubs = [result, ...existingSubs.filter((s: any) => s.id !== result.id)];
      localStorage.setItem("edutest_submissions", JSON.stringify(updatedSubs));

      // Ghi nhớ danh sách ID bài thi đã làm của tài khoản này
      const userSubKey = `edutest_user_${currentUser.id}_subs`;
      const userSubsRaw = localStorage.getItem(userSubKey);
      const userSubs = userSubsRaw ? JSON.parse(userSubsRaw) : [];
      if (!userSubs.includes(result.id)) {
        localStorage.setItem(userSubKey, JSON.stringify([result.id, ...userSubs]));
      }
    } catch {}

    setSubmission(result);
    setShowSubmitModal(false);
    playSound("fanfare");

    const correctQuestionsCount = Object.values(result.details || {}).filter(
      (d) => d.isCorrect
    ).length;

    // Thông báo Toast hoàn thành bài thi
    toast.success(
      "Nộp bài thi thành công!",
      `Thí sinh ${studentName} đã hoàn thành bài thi với kết quả ${result.score.toFixed(2)}/10 điểm (${correctQuestionsCount}/${exam.questions.length} câu đúng hoàn toàn).`
    );

    // Hiệu ứng pháo hoa mừng hoàn thành
    if (result.score >= 5.0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Gửi kết quả về server và Firebase
    try {
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
    } catch {
      // ignore
    }

    if (onSubmissionComplete) {
      onSubmissionComplete(result);
    }
  };

  // Yêu cầu AI chấm câu tự luận
  const handleAiGradeEssay = async (q: Question) => {
    const studentAns = userAnswers[q.id];
    setAiGradingState((prev) => ({
      ...prev,
      [q.id]: { loading: true },
    }));

    try {
      const res = await fetch("/api/ai/grade-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionContent: q.content,
          studentAnswer: studentAns,
          rubric: q.rubric || q.explanation,
          maxScore: q.score || 2.0,
        }),
      });
      const data = await res.json();
      setAiGradingState((prev) => ({
        ...prev,
        [q.id]: { loading: false, result: data },
      }));

      // Cập nhật lại điểm tự luận trong submission và đồng bộ Firebase
      if (submission && data.score !== undefined) {
        const earnedDiff = data.score - (submission.details[q.id]?.earnedScore || 0);
        setSubmission((prev) => {
          if (!prev) return prev;
          const newScore = Number((prev.score + earnedDiff).toFixed(2));
          const updatedSub: StudentSubmission = {
            ...prev,
            score: newScore,
            partScores: {
              ...prev.partScores,
              part_4: {
                ...prev.partScores.part_4,
                earned: Number((prev.partScores.part_4.earned + earnedDiff).toFixed(2)),
              },
            },
            details: {
              ...prev.details,
              [q.id]: {
                ...prev.details[q.id],
                earnedScore: data.score,
                feedback: data.feedback,
              },
            },
          };
          if (onSubmissionComplete) {
            onSubmissionComplete(updatedSub);
          }
          return updatedSub;
        });
      }
    } catch (err: any) {
      setAiGradingState((prev) => ({
        ...prev,
        [q.id]: { loading: false, error: err.message },
      }));
    }
  };

  // Màn hình khởi động trước khi vào thi Bento Style
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-xs border border-slate-200 text-slate-800">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              <div className="w-6 h-6 border-2 border-white rounded-xs rotate-45 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <div>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-indigo-100">
                Kỳ thi trực tuyến
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{exam.title}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-600 font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                  {exam.grade}
                </span>
                {exam.chapter && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    {exam.chapter}
                  </span>
                )}
                <span>• {exam.durationMinutes} phút</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 space-y-2 text-xs sm:text-sm text-slate-700">
            <p className="font-bold text-slate-900">📋 Cấu trúc bài thi gồm 4 phần:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><b>Phần I:</b> Câu trắc nghiệm nhiều phương án lựa chọn (Chọn A, B, C, D).</li>
              <li><b>Phần II:</b> Câu trắc nghiệm Đúng / Sai (Mỗi câu gồm 4 ý a, b, c, d).</li>
              <li><b>Phần III:</b> Câu trắc nghiệm Trả lời ngắn (Nhập đáp số dạng số/phân số).</li>
              <li><b>Phần IV:</b> Câu hỏi Tự luận (Trình bày chi tiết các bước giải).</li>
            </ul>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Họ và tên thí sinh:
              </label>
              <input
                id="input-student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nhập họ tên của bạn..."
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 focus:border-indigo-500 font-bold text-sm outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Số báo danh (SBD):
              </label>
              <input
                id="input-student-sbd"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Nhập số báo danh..."
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 focus:border-indigo-500 font-bold text-sm outline-none bg-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              id="btn-cancel-start"
              type="button"
              onClick={onExit}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
            >
              Quay lại
            </button>
            <button
              id="btn-start-exam-now"
              type="button"
              onClick={handleStartExam}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition"
            >
              Bắt đầu làm bài ➔
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= MÀN HÌNH KẾT QUẢ SAU KHI NỘP BÀI =================
  if (submission) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 flex flex-col items-center">
        <div className="w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 text-slate-800">
          {/* Header kết quả Bento */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="text-center sm:text-left">
              <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100 uppercase tracking-wider">
                ĐÃ HOÀN THÀNH BÀI THI
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
                Kết Quả: {submission.studentName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold">
                SBD: {submission.studentId} • Đề: {submission.examTitle} • Thời gian làm bài: {Math.floor(submission.timeSpentSeconds / 60)} phút {submission.timeSpentSeconds % 60}s
              </p>
            </div>

            {/* Điểm số Bento Card */}
            <div className="flex flex-col items-center justify-center p-5 bg-slate-900 rounded-3xl text-white shadow-xs min-w-[160px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Điểm tổng kết</span>
              <span className="text-4xl sm:text-5xl font-bold text-emerald-400 mt-0.5">{submission.score}</span>
              <span className="text-xs text-slate-400 font-medium">trên {submission.maxScore} điểm</span>
            </div>
          </div>

          {/* Phân tích điểm theo từng phần Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-600">Phần I: Trắc nghiệm</span>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {submission.partScores.part_1.earned} / {submission.partScores.part_1.max}đ
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-600">Phần II: Đúng / Sai</span>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {submission.partScores.part_2.earned} / {submission.partScores.part_2.max}đ
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-600">Phần III: Trả lời ngắn</span>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {submission.partScores.part_3.earned} / {submission.partScores.part_3.max}đ
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-600">Phần IV: Tự luận</span>
              <p className="text-xl font-bold text-indigo-600 mt-1">
                {submission.partScores.part_4.earned} / {submission.partScores.part_4.max}đ
              </p>
            </div>
          </div>

          {/* Danh sách rà soát chi tiết từng câu */}
          <div className="mt-8 space-y-6">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Chi tiết bài làm & Lời giải chuẩn:</span>
            </h3>

            {exam.questions.map((q, idx) => {
              const detail = submission.details[q.id];
              const aiState = aiGradingState[q.id];

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border-2 transition ${
                    detail?.isCorrect
                      ? "border-emerald-200 bg-emerald-50/20"
                      : q.type === "essay"
                      ? "border-purple-200 bg-purple-50/20"
                      : "border-red-200 bg-red-50/20"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-extrabold text-sm text-slate-800">
                      {q.title} ({q.partName}):
                    </span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-black ${
                        detail?.isCorrect
                          ? "bg-emerald-100 text-emerald-800"
                          : q.type === "essay"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {detail?.earnedScore} / {detail?.maxScore} điểm
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800 mb-3">
                    <MathRenderer content={cleanQuestionContent(q.content)} />
                  </div>

                  {/* Ảnh câu hỏi nếu có */}
                  {q.image && (
                    <InteractiveFigureViewer
                      src={q.image}
                      alt={`Hình minh họa ${q.title}`}
                      caption="Hình vẽ minh họa đề bài • Dùng thanh công cụ để Phóng to / Thu nhỏ"
                      className="my-3"
                    />
                  )}

                  {/* Hiển thị bài làm học sinh & đáp án */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs space-y-2 mb-3">
                    <div>
                      <b className="text-slate-600 block mb-1">Bài làm của bạn:</b>
                      {q.type === "true_false" ? (
                        <div className="font-semibold text-slate-800">
                          {Object.entries(detail?.userAnswer || {})
                            .map(([k, v]) => `${k}: ${v ? "Đúng" : "Sai"}`)
                            .join(" • ") || "(Chưa chọn)"}
                        </div>
                      ) : q.type === "essay" ? (
                        <div className="space-y-2">
                          {typeof detail?.userAnswer === "object" && detail?.userAnswer !== null ? (
                            <>
                              {detail.userAnswer.text && (
                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800">
                                  <MathRenderer content={detail.userAnswer.text} />
                                </div>
                              )}
                              {detail.userAnswer.attachments && detail.userAnswer.attachments.length > 0 && (
                                <div className="pt-1">
                                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                                    📎 Tệp / Ảnh chụp đính kèm ({detail.userAnswer.attachments.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {detail.userAnswer.attachments.map((att: any) => (
                                      <div
                                        key={att.id}
                                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                                      >
                                        {att.type === "image" ? (
                                          <div
                                            onClick={() => setSelectedReviewImage(att.dataUrl)}
                                            className="w-7 h-7 rounded overflow-hidden border border-slate-300 cursor-pointer"
                                            title="Bấm để xem ảnh phóng to"
                                          >
                                            <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                                          </div>
                                        ) : att.type === "pdf" ? (
                                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">PDF</span>
                                        ) : att.type === "word" ? (
                                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">DOC</span>
                                        ) : (
                                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                        <span className="font-semibold text-slate-700 max-w-[140px] truncate" title={att.name}>
                                          {att.name}
                                        </span>
                                        {att.type === "image" && (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedReviewImage(att.dataUrl)}
                                            className="p-1 hover:text-indigo-600"
                                            title="Xem ảnh"
                                          >
                                            <Eye className="w-3 h-3" />
                                          </button>
                                        )}
                                        <a
                                          href={att.dataUrl}
                                          download={att.name}
                                          className="p-1 hover:text-indigo-600"
                                          title="Tải tệp"
                                        >
                                          <Download className="w-3 h-3" />
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!detail.userAnswer.text && (!detail.userAnswer.attachments || detail.userAnswer.attachments.length === 0) && (
                                <span className="text-slate-400 italic">(Chưa nộp bài làm)</span>
                              )}
                            </>
                          ) : (
                            <div className="font-medium text-slate-800">
                              <MathRenderer content={String(detail?.userAnswer || "(Chưa làm)")} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-bold text-slate-800">
                          {String(detail?.userAnswer || "(Chưa làm)")}
                        </span>
                      )}
                    </div>

                    <p className="text-emerald-700 pt-1 border-t border-slate-100">
                      <b>Phản hồi / Báo điểm:</b> {detail?.feedback}
                    </p>
                  </div>

                  {/* Nút AI chấm tự luận */}
                  {q.type === "essay" && (
                    <div className="my-3">
                      <button
                        type="button"
                        onClick={() => handleAiGradeEssay(q)}
                        disabled={aiState?.loading}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        <span>{aiState?.loading ? "AI đang chấm..." : "✨ Chấm tự luận bằng AI (Gemini)"}</span>
                      </button>
                    </div>
                  )}

                  {/* Lời giải chi tiết */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <b className="text-blue-700">💡 Lời giải chi tiết:</b>
                    <MathRenderer content={q.explanation} className="mt-1" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200">
            <button
              id="btn-finish-review"
              type="button"
              onClick={onExit}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow transition"
            >
              Hoàn tất & Thoát
            </button>
          </div>

          {/* Modal xem phóng to ảnh chụp bài làm học sinh */}
          {selectedReviewImage && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedReviewImage(null)}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full flex justify-between items-center px-3 py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Ảnh chụp bài làm tự luận</span>
                  <button
                    type="button"
                    onClick={() => setSelectedReviewImage(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 overflow-auto max-h-[75vh] flex justify-center">
                  <img
                    src={selectedReviewImage}
                    alt="Ảnh chụp bài làm"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= MÀN HÌNH ĐANG THI (EXAM SESSION) =================
  return (
    <div
      ref={examContainerRef}
      id="student-exam-wrapper"
      className="min-h-screen bg-[#f8fafc] flex flex-col overflow-y-auto"
    >
      {/* Header làm bài thi Bento */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-xs rotate-45"></div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-bold text-sm sm:text-base text-slate-900 truncate max-w-xs sm:max-w-md">{exam.title}</h1>
              <span className="px-2 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                {exam.grade}
              </span>
              {exam.chapter && (
                <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium truncate max-w-[160px]" title={exam.chapter}>
                  {exam.chapter}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Thí sinh: <span className="text-indigo-600 font-bold">{studentName}</span> ({studentId})
            </p>
          </div>
        </div>

        {/* Đồng hồ đếm ngược, Nút Nháp, Nút Lưu nháp, Nút Toàn màn hình & Nút nộp bài */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Nút Viết vẽ nháp trực tiếp trên đề */}
          <button
            id="btn-exam-toggle-draw-overlay"
            type="button"
            onClick={() => setIsDrawingActive((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-2xs ${
              isDrawingActive
                ? "bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40"
                : "bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-200"
            }`}
            title={
              isDrawingActive
                ? "Đang bật chế độ viết nháp (Bấm để tắt và chọn đáp án)"
                : "Bật bút viết vẽ nháp trực tiếp lên đề thi & hình vẽ"
            }
          >
            <Pencil className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">
              {isDrawingActive ? "Đang viết nháp" : "Vẽ nháp trên đề"}
            </span>
          </button>

          {/* Nút Mở Bảng nháp mở rộng */}
          <button
            id="btn-exam-open-scratchpad-modal"
            type="button"
            onClick={() => setShowScratchpadModal(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-2xs hover:text-indigo-600"
            title="Mở bảng nháp ô ly toán học kích thước lớn"
          >
            <Edit3 className="w-4 h-4 text-indigo-600" />
            <span className="hidden md:inline">Bảng nháp ô ly</span>
          </button>

          {/* Nút Lưu nháp bài thi */}
          <button
            id="btn-exam-save-draft-header"
            type="button"
            onClick={handleSaveDraft}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-2xs hover:text-indigo-600"
            title="Lưu nháp bài làm vào trình duyệt"
          >
            <Save className="w-4 h-4 text-indigo-600" />
            <span className="hidden lg:inline">Lưu nháp</span>
          </button>

          {/* Nút Chế độ Toàn màn hình (Tập trung) */}
          <button
            id="btn-exam-fullscreen-toggle"
            type="button"
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-1.5 transition ${
              isFullscreen
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
            title={
              isFullscreen
                ? "Thoát chế độ toàn màn hình (Phím Esc)"
                : "Bật toàn màn hình để tập trung làm bài (Ẩn các thanh trình duyệt và giao diện xung quanh)"
            }
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
            </span>
          </button>

          {/* Đồng hồ đếm ngược trực quan với các cấp độ cảnh báo */}
          <div
            id="header-countdown-badge"
            className={`px-3.5 py-1.5 rounded-full font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5 border shadow-xs transition-colors duration-300 ${
              secondsRemaining <= 60
                ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-400/50 animate-pulse"
                : secondsRemaining <= 300
                ? "bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
            title={`Thời gian còn lại: ${formatTime(secondsRemaining)}`}
          >
            {secondsRemaining <= 60 ? (
              <Flame className="w-4 h-4 text-rose-600 animate-bounce" />
            ) : secondsRemaining <= 300 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
            ) : (
              <Clock className="w-4 h-4 text-indigo-600" />
            )}
            <span className="font-extrabold tracking-tight">
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <button
            id="btn-submit-exam-trigger"
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition"
          >
            <Send className="w-4 h-4" />
            <span>Nộp bài</span>
          </button>
        </div>
      </header>

      {/* Thanh đo tiến độ thời gian còn lại chạy ngay dưới header */}
      <div className="w-full bg-slate-200 h-1 sticky top-[57px] z-30 overflow-hidden">
        <div
          id="header-timer-progress-line"
          className={`h-full transition-all duration-300 ease-linear ${
            secondsRemaining <= 60
              ? "bg-rose-600 animate-pulse"
              : secondsRemaining <= 300
              ? "bg-amber-500"
              : "bg-indigo-600"
          }`}
          style={{ width: `${timeProgressPercent}%` }}
        />
      </div>

      {/* Thân làm bài: Cột câu hỏi bên trái + Question Palette bên phải */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        {/* Cột trái: Nội dung câu hỏi (3 cột) Bento Card */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col min-h-[540px] relative">
          {/* Lớp viết vẽ nháp trực tiếp trên màn hình */}
          <StudentScratchpad
            questionId={currentQ.id}
            isDrawingActive={isDrawingActive}
            onToggleDrawingActive={setIsDrawingActive}
          />

          {/* Header câu hỏi */}
          <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-100">
                {currentQ.partName}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                (Điểm: {currentQ.score}đ)
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleFlag(currentQ.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                flaggedQuestions[currentQ.id]
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{flaggedQuestions[currentQ.id] ? "Đã gắn cờ" : "Cần xem lại"}</span>
            </button>
          </div>

          {/* Đề bài */}
          <div className="font-semibold text-slate-800 leading-relaxed text-sm sm:text-base mb-4">
            <span className="font-black text-blue-600 mr-2">{currentQ.title}:</span>
            <MathRenderer content={cleanQuestionContent(currentQ.content)} inline />
          </div>

          {/* Ảnh câu hỏi nếu có */}
          {currentQ.image && (
            <InteractiveFigureViewer
              src={currentQ.image}
              alt={`Hình minh họa ${currentQ.title}`}
              caption="Hình vẽ minh họa đề bài • Dùng thanh công cụ hoặc cuộn chuột để Phóng to / Thu nhỏ"
              className="my-3"
            />
          )}

          {/* Khu vực chọn đáp án theo 4 dạng thức */}
          <div className="my-4 flex-1">
            {/* DẠNG 1: Trắc nghiệm 4 lựa chọn */}
            {currentQ.type === "single_choice" && currentQ.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt) => {
                  const isChecked = userAnswers[currentQ.id] === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setUserAnswers((prev) => ({ ...prev, [currentQ.id]: opt.label }))
                      }
                      className={`p-3.5 rounded-2xl border-2 text-left font-semibold flex items-center gap-3 transition ${
                        isChecked
                          ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                          isChecked ? "bg-blue-600 text-white" : "bg-white border border-slate-300 text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </div>
                      <div className="flex-1 text-xs sm:text-sm">
                        <MathRenderer content={opt.text} inline />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* DẠNG 2: Đúng / Sai 4 ý */}
            {currentQ.type === "true_false" && currentQ.tfItems && (
              <div className="flex flex-col gap-2.5">
                {currentQ.tfItems.map((item) => {
                  const currTF = userAnswers[currentQ.id] || {};
                  const currentVal = currTF[item.label];

                  return (
                    <div
                      key={item.label}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200"
                    >
                      <div className="flex-1 font-semibold text-xs sm:text-sm text-slate-800">
                        <span className="font-extrabold text-blue-700 mr-2">{item.label})</span>
                        <MathRenderer content={item.text} inline />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            setUserAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: {
                                ...(prev[currentQ.id] || {}),
                                [item.label]: true,
                              },
                            }))
                          }
                          className={`px-4 py-1.5 rounded-xl font-black text-xs border transition ${
                            currentVal === true
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          ĐÚNG
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setUserAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: {
                                ...(prev[currentQ.id] || {}),
                                [item.label]: false,
                              },
                            }))
                          }
                          className={`px-4 py-1.5 rounded-xl font-black text-xs border transition ${
                            currentVal === false
                              ? "bg-red-600 text-white border-red-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          SAI
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DẠNG 3: Trả lời ngắn */}
            {currentQ.type === "short_answer" && (
              <div className="flex flex-col items-center my-6">
                <input
                  id="student-short-input"
                  type="text"
                  value={userAnswers[currentQ.id] || ""}
                  onChange={(e) =>
                    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                  }
                  placeholder="Nhập câu trả lời hoặc số thập phân..."
                  className="w-full max-w-sm py-3 px-4 rounded-2xl border-2 border-slate-300 focus:border-blue-500 font-extrabold text-xl text-center outline-none bg-slate-50 focus:bg-white text-slate-800 shadow-sm"
                />
                <p className="text-xs text-slate-400 font-semibold mt-2">
                  (Ví dụ: 4.2 hoặc 4,2 hoặc phân số 5/3)
                </p>
              </div>
            )}

            {/* DẠNG 4: Tự luận (Gõ văn bản / công thức hoặc đính kèm tệp tin / ảnh chụp) */}
            {currentQ.type === "essay" && (
              <EssayAnswerInput
                questionId={currentQ.id}
                value={userAnswers[currentQ.id]}
                onChange={(newVal) =>
                  setUserAnswers((prev) => ({ ...prev, [currentQ.id]: newVal }))
                }
              />
            )}
          </div>

          {/* Footer chuyển câu */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            <span className="text-xs font-bold text-slate-500">
              Câu {currentIdx + 1} / {exam.questions.length}
            </span>

            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => Math.min(exam.questions.length - 1, prev + 1))}
              disabled={currentIdx === exam.questions.length - 1}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm"
            >
              <span>Câu sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cột phải: Question Palette (1 cột) */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-5 shadow-md border border-slate-200 sticky top-20">
          {/* Bento Countdown Timer Widget */}
          <div
            id="sidebar-exam-countdown-widget"
            className={`p-4 rounded-2xl border mb-4 transition-all duration-300 ${
              secondsRemaining <= 60
                ? "bg-gradient-to-br from-rose-50 to-red-100 border-rose-300 ring-2 ring-rose-400/40 shadow-sm"
                : secondsRemaining <= 300
                ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-2xs"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {secondsRemaining <= 60 ? (
                  <Flame className="w-4 h-4 text-rose-600 animate-bounce" />
                ) : secondsRemaining <= 300 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                ) : (
                  <Timer className="w-4 h-4 text-indigo-600" />
                )}
                <span
                  className={
                    secondsRemaining <= 60
                      ? "text-rose-700 font-extrabold uppercase tracking-wide"
                      : secondsRemaining <= 300
                      ? "text-amber-800 font-bold"
                      : "text-slate-700"
                  }
                >
                  {secondsRemaining <= 60
                    ? "Gấp rút!"
                    : secondsRemaining <= 300
                    ? "Sắp hết giờ"
                    : "Thời gian làm bài"}
                </span>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  secondsRemaining <= 60
                    ? "bg-rose-600 text-white animate-pulse"
                    : secondsRemaining <= 300
                    ? "bg-amber-500 text-white"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {Math.round(timeProgressPercent)}%
              </span>
            </div>

            {/* Đồng hồ số lớn */}
            <div className="flex items-baseline justify-between mb-2.5">
              <span
                className={`font-mono text-2xl sm:text-3xl font-black tracking-tight ${
                  secondsRemaining <= 60
                    ? "text-rose-600 animate-pulse"
                    : secondsRemaining <= 300
                    ? "text-amber-600"
                    : "text-slate-900"
                }`}
              >
                {formatTime(secondsRemaining)}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                / {exam.durationMinutes} phút
              </span>
            </div>

            {/* Thanh tiến trình thời gian trực quan */}
            <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-linear rounded-full ${
                  secondsRemaining <= 60
                    ? "bg-rose-600"
                    : secondsRemaining <= 300
                    ? "bg-amber-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${timeProgressPercent}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-500 mt-2 font-medium flex justify-between">
              <span>Đã làm: <b>{answeredCount}/{exam.questions.length} câu</b></span>
              <span className="text-slate-400 font-semibold">
                {secondsRemaining === 0 ? "Đã hết giờ" : "Tự nộp khi hết giờ"}
              </span>
            </p>
          </div>

          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
            <h3 className="font-black text-sm text-slate-800">Danh sách câu hỏi</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Đã làm: {answeredCount}/{exam.questions.length}
            </span>
          </div>

          {/* Chú thích màu */}
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-semibold mb-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-600" /> Đang làm
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Đã trả lời
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-400" /> Gắn cờ
            </span>
          </div>

          {/* Grid các số câu hỏi */}
          <div className="max-h-[380px] overflow-y-auto pr-1 grid grid-cols-5 gap-2">
            {exam.questions.map((q, idx) => {
              const isCurrent = idx === currentIdx;
              const isFlagged = flaggedQuestions[q.id];
              const ans = userAnswers[q.id];
              const isAnswered =
                q.type === "single_choice"
                  ? !!ans
                  : q.type === "true_false"
                  ? ans && Object.keys(ans).length > 0
                  : q.type === "short_answer"
                  ? !!ans && String(ans).trim() !== ""
                  : q.type === "essay"
                  ? !!ans &&
                    (typeof ans === "string"
                      ? ans.trim() !== ""
                      : Boolean(ans.text?.trim() || (ans.attachments && ans.attachments.length > 0)))
                  : !!ans && String(ans).trim() !== "";

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 rounded-xl font-black text-xs flex items-center justify-center transition border ${
                    isCurrent
                      ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                      : isFlagged
                      ? "bg-amber-100 text-amber-900 border-amber-400 font-extrabold"
                      : isAnswered
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2">
            {/* Tiện ích Bảng nháp & Viết vẽ trên màn hình */}
            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-amber-600" />
                  Công cụ nháp toán
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/70 text-amber-800 rounded-md font-extrabold">
                  {isDrawingActive ? "Đang bật" : "Sẵn sàng"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDrawingActive((prev) => !prev)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                    isDrawingActive
                      ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                      : "bg-white hover:bg-amber-100/50 text-slate-700 border-amber-200"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isDrawingActive ? "Tắt vẽ" : "Vẽ trên đề"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowScratchpadModal(true)}
                  className="py-1.5 px-2 rounded-xl text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Bảng nháp</span>
                </button>
              </div>
            </div>

            <button
              id="btn-save-draft-sidebar"
              type="button"
              onClick={handleSaveDraft}
              className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lưu nháp bài làm</span>
            </button>

            <button
              id="btn-final-submit-sidebar"
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>NỘP BÀI THI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Bảng nháp toán học toàn diện */}
      <MathScratchpadModal
        isOpen={showScratchpadModal}
        onClose={() => setShowScratchpadModal(false)}
        title={`Bảng Nháp Toán Học • ${currentQ.title}`}
      />

      {/* Modal Xác nhận nộp bài */}
      {showSubmitModal && (
        <div
          id="submit-confirm-modal"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-200 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-2xl mb-4">
              ⚠️
            </div>

            <h3 className="font-black text-xl text-slate-900 mb-2">Xác nhận nộp bài?</h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              Bạn đã trả lời <b>{answeredCount}</b> trên tổng số <b>{exam.questions.length}</b> câu hỏi.
              {answeredCount < exam.questions.length && (
                <span className="text-amber-600 font-bold block mt-1">
                  Vẫn còn {exam.questions.length - answeredCount} câu chưa hoàn thành.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Làm tiếp
              </button>
              <button
                id="btn-confirm-submit-exam"
                type="button"
                onClick={handleSubmitExam}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
              >
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tự động nộp bài khi hết giờ (Time-Up Overlay) */}
      {isTimeUp && !submission && (
        <div
          id="time-up-auto-submit-overlay"
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-100 border-2 border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
              <Hourglass className="w-10 h-10 animate-spin text-rose-600" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full uppercase tracking-wider border border-rose-200">
                Hết giờ làm bài
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                Thời gian thi đã kết thúc!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Đồng hồ đếm ngược đã chạm mốc <b>00:00</b>. Hệ thống đang tiến hành tự động thu bài, chấm điểm và tổng hợp kết quả của thí sinh <b>{studentName}</b>...
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 via-rose-500 to-amber-500 rounded-full animate-pulse w-full" />
            </div>

            <p className="text-[11px] font-semibold text-slate-400">
              Vui lòng đợi trong giây lát, hệ thống đang xử lý bài thi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
