import React, { useState, useEffect, useMemo } from "react";
import { Exam, LiveRoom, LiveStudent, Question } from "../types/exam";
import { User } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { MathRenderer } from "./MathRenderer";
import { cleanQuestionContent } from "../utils/latexParser";
import { playSound } from "../utils/audio";
import {
  subscribeLiveRoom,
  updateLiveRoomInFirestore,
  createLiveRoomInFirestore,
  getLiveRoomFromFirestore,
  joinLiveRoomInFirestore,
} from "../services/firestoreService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
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
  ArrowRight,
  UserCheck,
  AlertCircle,
  BookOpen,
  Check,
  Send,
  HelpCircle,
  LogOut,
  RefreshCw,
  Lock,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

interface RealtimeLiveRoomViewProps {
  initialExam?: Exam | null;
  exam?: Exam; // backward compatibility
  exams?: Exam[];
  currentUser?: User;
  onSelectExam?: (exam: Exam) => void;
  onExit: () => void;
}

export const RealtimeLiveRoomView: React.FC<RealtimeLiveRoomViewProps> = ({
  initialExam,
  exam,
  exams = [],
  currentUser,
  onSelectExam,
  onExit,
}) => {
  const { currentUser: authUser, isAdmin, isTeacher, hasPermission } = useAuth();
  const effectiveUser = currentUser || authUser;

  // QUYỀN HẠN: Chỉ Quản trị viên và Giáo viên mới có quyền tạo phòng
  const canHost = Boolean(
    isAdmin ||
    isTeacher ||
    effectiveUser?.role === "admin" ||
    effectiveUser?.role === "teacher" ||
    (effectiveUser?.customPermissions && effectiveUser.customPermissions.includes("host_live_room"))
  );

  // Đề thi thực sự của phòng thi (luôn đồng bộ chuẩn theo mã PIN)
  const [activeExam, setActiveExam] = useState<Exam | null>(() => initialExam || exam || exams[0] || null);
  const [availableExams, setAvailableExams] = useState<Exam[]>(exams);

  // Lựa chọn đề thi của giáo viên khi tạo phòng
  const [teacherSelectedExamId, setTeacherSelectedExamId] = useState<string>(
    initialExam?.id || exam?.id || exams[0]?.id || ""
  );

  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [room, setRoom] = useState<LiveRoom | null>(null);

  // Thông tin học sinh
  const [studentName, setStudentName] = useState<string>(() => effectiveUser?.name || "");
  const [studentPin, setStudentPin] = useState<string>("");
  const [myStudentId, setMyStudentId] = useState<string>(() => effectiveUser?.id || "");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>("");

  // Đồng bộ thông tin người dùng nếu tải muộn
  useEffect(() => {
    if (effectiveUser) {
      if (effectiveUser.name && !studentName) {
        setStudentName(effectiveUser.name);
      }
      if (effectiveUser.id && !myStudentId) {
        setMyStudentId(effectiveUser.id);
      }
    }
  }, [effectiveUser]);

  // Câu trả lời của học sinh hiện tại
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});
  const [shortAnswerInput, setShortAnswerInput] = useState<string>("");

  // Cập nhật danh sách đề thi sẵn có khi props thay đổi
  useEffect(() => {
    if (exams.length > 0) {
      setAvailableExams(exams);
      if (!teacherSelectedExamId) {
        setTeacherSelectedExamId(exams[0].id);
      }
    }
  }, [exams]);

  // Đồng bộ đề thi ban đầu nếu chưa vào phòng
  useEffect(() => {
    if (!room) {
      const current = initialExam || exam || exams.find((e) => e.id === teacherSelectedExamId) || exams[0] || null;
      if (current) {
        setActiveExam(current);
      }
    }
  }, [initialExam, exam, teacherSelectedExamId]);

  // =========================================================================
  // 1. QUẢN TRỊ VIÊN & GIÁO VIÊN: TẠO PHÒNG THI MỚI
  // =========================================================================
  const handleCreateRoom = async (mode: "teacher_paced" | "student_paced") => {
    // Ràng buộc nghiêm ngặt quyền tạo phòng
    if (!canHost) {
      setJoinError("Bạn không có quyền tạo phòng thi. Chỉ Quản trị viên và Giáo viên mới có quyền tạo phòng.");
      return;
    }

    const targetExam =
      availableExams.find((e) => e.id === teacherSelectedExamId) || activeExam || initialExam || exam;

    if (!targetExam) {
      alert("Vui lòng chọn đề thi trước khi tạo phòng!");
      return;
    }

    // Đảm bảo cập nhật activeExam chính xác
    setActiveExam(targetExam);
    if (onSelectExam) {
      onSelectExam(targetExam);
    }

    // Tạo mã PIN 6 số ngẫu nhiên
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const creatorRole = effectiveUser?.role || (isAdmin ? "admin" : "teacher");
    const creatorName = effectiveUser?.name || (isAdmin ? "Quản trị viên" : "Giáo viên");
    const creatorId = effectiveUser?.id || "host_" + Date.now();

    const newRoom: LiveRoom = {
      id: "room_" + Date.now(),
      pin,
      examId: targetExam.id,
      examTitle: targetExam.title,
      // LƯU TOÀN BỘ BẢN SAO ĐỀ THI (snapshot) VÀO PHÒNG THI ĐỂ BẤT KỲ HỌC SINH NÀO NHẬP MÃ PIN ĐỀU CÓ 100% ĐỀ CHÍNH XÁC
      examSnapshot: targetExam,
      creatorId,
      creatorName,
      creatorRole: creatorRole as any,
      status: "waiting",
      mode,
      currentQuestionIndex: 0,
      timerRemaining: 60,
      timerDuration: 60,
      students: [],
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Lưu trực tiếp vào Firestore (Realtime Bus)
      await createLiveRoomInFirestore(newRoom);

      // 2. Gửi đồng bộ lên Node API
      await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          examId: targetExam.id,
          examTitle: targetExam.title,
          examSnapshot: targetExam,
          mode,
          creatorId,
          creatorName,
          creatorRole,
        }),
      }).catch(() => {});

      setRoom(newRoom);
      setRole("teacher");
    } catch (err) {
      console.warn("Lỗi khi tạo phòng thi:", err);
      // Fallback cục bộ
      setRoom(newRoom);
      setRole("teacher");
    }
  };

  // =========================================================================
  // 2. HỌC SINH: THAM GIA PHÒNG THI BẰNG MÃ PIN (TỰ ĐỘNG ĐỒNG BỘ ĐÚNG ĐỀ)
  // =========================================================================
  const handleJoinRoom = async () => {
    const cleanPin = studentPin.trim();
    if (!cleanPin) {
      setJoinError("Vui lòng nhập mã PIN 6 số do giáo viên cung cấp.");
      return;
    }
    if (!studentName.trim()) {
      setJoinError("Vui lòng nhập họ và tên của bạn để tham gia thi.");
      return;
    }

    setIsJoining(true);
    setJoinError("");

    try {
      // 1. Thử tìm phòng từ Firestore trước (Độ tin cậy & thời gian thực cao nhất)
      let foundRoom: LiveRoom | null = await getLiveRoomFromFirestore(cleanPin);

      // 2. Nếu Firestore chưa thấy, thử gọi API Node
      if (!foundRoom) {
        try {
          const res = await fetch(`/api/rooms/${cleanPin}`);
          if (res.ok) {
            foundRoom = await res.json();
          }
        } catch {}
      }

      if (!foundRoom) {
        setJoinError("Không tìm thấy phòng thi nào khớp với mã PIN này. Vui lòng kiểm tra lại với giáo viên!");
        setIsJoining(false);
        return;
      }

      // 3. TÌM & NẠP CHÍNH XÁC ĐỀ THI CỦA PHÒNG THI NÀY
      let matchedExam: Exam | null = foundRoom.examSnapshot || null;

      // Nếu phòng chưa có examSnapshot nhúng, tìm trong danh sách đề sẵn có
      if (!matchedExam) {
        const foundInList = availableExams.find(
          (e) =>
            e.id === foundRoom?.examId ||
            e.code === foundRoom?.examId ||
            (e.title && e.title.trim().toLowerCase() === foundRoom?.examTitle?.trim().toLowerCase())
        );
        if (foundInList) {
          matchedExam = foundInList;
        }
      }

      // Nếu vẫn chưa có, thử tải trực tiếp từ Firestore doc "exams/{examId}"
      if (!matchedExam && foundRoom.examId) {
        try {
          const examDoc = await getDoc(doc(db, "exams", foundRoom.examId));
          if (examDoc.exists()) {
            matchedExam = examDoc.data() as Exam;
          }
        } catch (e) {
          console.warn("Lỗi đọc đề thi từ Firestore:", e);
        }
      }

      if (!matchedExam) {
        setJoinError(
          `Đã kết nối tới phòng thi "${foundRoom.examTitle}", nhưng chưa nạp được nội dung đề thi. Hãy nhờ giáo viên kiểm tra lại!`
        );
        setIsJoining(false);
        return;
      }

      // CẬP NHẬT ĐỀ THI CỦA MÀN HÌNH THEO ĐÚNG ĐỀ THI CỦA PHÒNG
      setActiveExam(matchedExam);
      if (onSelectExam) {
        onSelectExam(matchedExam);
      }

      // Tạo hồ sơ học sinh
      const studentId = myStudentId || "stu_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      setMyStudentId(studentId);

      const studentObj: LiveStudent = {
        id: studentId,
        name: studentName.trim(),
        avatar:
          currentUser?.avatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(studentName.trim())}`,
        currentScore: 0,
        answers: {},
        isOnline: true,
        submitted: false,
        lastActive: new Date().toISOString(),
      };

      // Đưa học sinh vào phòng thi trên Firestore & API
      await joinLiveRoomInFirestore(cleanPin, studentObj);
      fetch(`/api/rooms/${cleanPin}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentObj.name,
          studentId: studentObj.id,
        }),
      }).catch(() => {});

      setRoom(foundRoom);
      setRole("student");
    } catch (err: any) {
      console.error("Lỗi tham gia phòng:", err);
      setJoinError("Đã xảy ra lỗi khi tham gia phòng thi. Vui lòng thử lại!");
    } finally {
      setIsJoining(false);
    }
  };

  // =========================================================================
  // 3. ĐỒNG BỘ REALTIME TỨC THÌ QUA FIRESTORE SNAPSHOT & POLLING DỰ PHÒNG
  // =========================================================================
  useEffect(() => {
    if (!room?.pin) return;
    const pin = room.pin;

    // A. Lắng nghe Firestore Realtime (0 delay)
    const unsubFs = subscribeLiveRoom(pin, (updatedRoom) => {
      if (updatedRoom) {
        setRoom(updatedRoom);
        // Đồng bộ đề thi nếu có snapshot mới
        if (updatedRoom.examSnapshot && (!activeExam || activeExam.id !== updatedRoom.examSnapshot.id)) {
          setActiveExam(updatedRoom.examSnapshot);
        }
      }
    });

    // B. Polling API Node dự phòng (mỗi 2s)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${pin}`);
        if (res.ok) {
          const updated = await res.json();
          setRoom((prev) => (prev ? { ...prev, ...updated } : updated));
          if (updated.examSnapshot && (!activeExam || activeExam.id !== updated.examSnapshot.id)) {
            setActiveExam(updated.examSnapshot);
          }
        }
      } catch {}
    }, 2000);

    return () => {
      unsubFs();
      clearInterval(interval);
    };
  }, [room?.pin]);

  // =========================================================================
  // 4. ĐIỀU KHIỂN PHÒNG THI (GIÁO VIÊN)
  // =========================================================================
  const handleStartRoom = async () => {
    if (!room) return;
    const updateData = { status: "in_progress" as const, currentQuestionIndex: 0, timerRemaining: 60 };

    setRoom((prev) => (prev ? { ...prev, ...updateData } : null));
    playSound("correct");

    await updateLiveRoomInFirestore(room.pin, updateData);
    fetch(`/api/rooms/${room.pin}/update-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    }).catch(() => {});
  };

  const handleTeacherChangeQuestion = async (delta: number) => {
    if (!room || !activeExam) return;
    const totalQ = activeExam.questions?.length || 1;
    const newIdx = Math.max(0, Math.min(totalQ - 1, room.currentQuestionIndex + delta));

    const updateData = { currentQuestionIndex: newIdx, timerRemaining: 60 };
    setRoom((prev) => (prev ? { ...prev, ...updateData } : null));

    await updateLiveRoomInFirestore(room.pin, updateData);
    fetch(`/api/rooms/${room.pin}/update-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    }).catch(() => {});
  };

  // =========================================================================
  // 5. TRẢ LỜI CÂU HỎI (HỌC SINH)
  // =========================================================================
  const currentQ = useMemo(() => {
    if (!activeExam || !room || !activeExam.questions) return null;
    return activeExam.questions[room.currentQuestionIndex] || null;
  }, [activeExam, room?.currentQuestionIndex]);

  const handleStudentAnswer = async (ans: any) => {
    if (!room || !activeExam || !currentQ) return;

    setMyAnswers((prev) => ({ ...prev, [currentQ.id]: ans }));
    playSound("correct");

    // Tính toán điểm số chính xác dựa trên từng dạng câu hỏi
    let scoreDelta = 0;
    if (currentQ.type === "single_choice") {
      if (ans === currentQ.correctAnswer) {
        scoreDelta = currentQ.score || 0.25;
      }
    } else if (currentQ.type === "short_answer") {
      const cleanInput = String(ans).trim().toLowerCase();
      const cleanCorrect = String(currentQ.correctAnswer || "").trim().toLowerCase();
      if (cleanInput && cleanInput === cleanCorrect) {
        scoreDelta = currentQ.score || 0.5;
      }
    }

    // Cập nhật lên Firestore & API
    try {
      const updatedStudents = (room.students || []).map((stu) => {
        if (stu.id === myStudentId) {
          return {
            ...stu,
            answers: { ...stu.answers, [currentQ.id]: ans },
            currentScore: Math.max(0, stu.currentScore + scoreDelta),
            lastActive: new Date().toISOString(),
          };
        }
        return stu;
      });

      await updateLiveRoomInFirestore(room.pin, { students: updatedStudents });

      fetch(`/api/rooms/${room.pin}/submit-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: myStudentId,
          questionId: currentQ.id,
          answer: ans,
          scoreDelta,
        }),
      }).catch(() => {});
    } catch (err) {
      console.warn("Lỗi gửi bài làm realtime:", err);
    }
  };

  // =========================================================================
  // MÀN HÌNH CHỌN VAI TRÒ & NHẬP MÃ PIN (PHÂN QUYỀN RBAC)
  // =========================================================================
  if (!role || !room) {
    // -----------------------------------------------------------------------
    // TRƯỜNG HỢP 1: HỌC SINH (CHỈ CÓ QUYỀN THAM GIA BẰNG MÃ PIN)
    // -----------------------------------------------------------------------
    if (!canHost) {
      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 text-slate-900 font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md border border-slate-200 shadow-xl space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mx-auto mb-3 shadow-xs">
                <GraduationCap className="w-7 h-7 text-emerald-600" />
              </div>
              <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] uppercase tracking-wider border border-emerald-100">
                DÀNH CHO HỌC SINH • THAM GIA THI LIVE
              </span>
              <h2 className="text-2xl font-black mt-3 text-slate-900">Vào Phòng Thi Trực Tiếp</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Nhập mã PIN 6 số do Quản trị viên hoặc Thầy/Cô cung cấp để nhận đúng đề thi và tham gia làm bài cùng lớp.
              </p>
            </div>

            {/* Thông tin hồ sơ học sinh */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center gap-3 text-xs">
              <img
                src={
                  effectiveUser?.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(studentName || "student")}`
                }
                alt="avatar"
                className="w-10 h-10 rounded-xl bg-slate-200 object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 truncate">{studentName || "Thí sinh"}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-black text-[10px]">
                    Học sinh
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {effectiveUser?.schoolClass ? `Lớp ${effectiveUser.schoolClass}` : "Tài khoản học sinh"}
                </p>
              </div>
            </div>

            {joinError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="font-semibold">{joinError}</div>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Mã PIN phòng thi:</span>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">6 chữ số</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={studentPin}
                  onChange={(e) => {
                    setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setJoinError("");
                  }}
                  placeholder="Nhập 6 số (VD: 842109)..."
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-50 border-2 border-slate-300 text-xl sm:text-2xl font-black text-center tracking-[0.3em] text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Họ và tên thí sinh:</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    setJoinError("");
                  }}
                  placeholder="Nhập họ và tên..."
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <button
                type="button"
                disabled={isJoining || studentPin.length < 6}
                onClick={handleJoinRoom}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang nạp đề thi & kết nối...</span>
                  </>
                ) : (
                  <>
                    <span>Vào phòng thi ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Hộp thông báo quy định phân quyền hệ thống */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 flex items-start gap-2 text-[11px] text-amber-800 leading-relaxed">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <b>Quy định quyền hạn:</b> Chỉ <b>Quản trị viên</b> và <b>Giáo viên</b> mới có quyền tạo phòng thi và điều phối đề thi. Học sinh chỉ có quyền tham gia thi bằng cách nhập mã PIN do thầy cô cấp.
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onExit}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                >
                  Quay lại Cổng luyện thi
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // TRƯỜNG HỢP 2: QUẢN TRỊ VIÊN & GIÁO VIÊN (CÓ QUYỀN TẠO & ĐIỀU PHỐI PHÒNG)
    // -----------------------------------------------------------------------
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 text-slate-900 font-sans">
        <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-4xl border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAdmin ? "QUẢN TRỊ VIÊN (ADMIN)" : "GIÁO VIÊN BỘ MÔN"}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                  ✓ Quyền khởi tạo & quản lý phòng thi
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mt-2 text-slate-900">Phòng Thi Đấu & Kiểm Tra Trực Tiếp</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Khởi tạo phòng thi mới để điều phối đề thi cho cả lớp học, hoặc nhập mã PIN để tham gia kiểm tra phòng thi trực tiếp.
              </p>
            </div>

            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Quay lại danh sách
            </button>
          </div>

          {joinError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-semibold">{joinError}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Cột 1: TẠO PHÒNG THI MỚI (DÀNH CHO QUẢN TRỊ VIÊN & GIÁO VIÊN) */}
            <div className="lg:col-span-7 bg-slate-50/80 p-5 sm:p-6 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-xs">
                    👨‍🏫
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                    Quyền Host
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900">Khởi Tạo Phòng Thi Mới</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tạo phòng thi với mã PIN 6 số tự động. Toàn bộ câu hỏi, công thức Toán và hình vẽ sẽ được đồng bộ chính xác tới từng học sinh.
                </p>

                {/* Chọn đề thi muốn tạo phòng */}
                <div className="mt-4">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Chọn đề thi từ Ngân hàng:</span>
                    <span className="text-[10px] text-indigo-600">{availableExams.length} đề khả dụng</span>
                  </label>
                  <select
                    value={teacherSelectedExamId}
                    onChange={(e) => {
                      setTeacherSelectedExamId(e.target.value);
                      const sel = availableExams.find((ex) => ex.id === e.target.value);
                      if (sel) setActiveExam(sel);
                    }}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:border-indigo-500 shadow-xs"
                  >
                    {availableExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        [{ex.grade}] {ex.title} ({ex.questions?.length || 0} câu)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Thông tin xem trước đề thi */}
                {(() => {
                  const curr = availableExams.find((e) => e.id === teacherSelectedExamId) || activeExam;
                  if (!curr) return null;
                  return (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                      <div className="font-bold text-slate-800 truncate">{curr.title}</div>
                      <div className="flex flex-wrap items-center gap-3 text-slate-500">
                        <span>Khối lớp: <b className="text-slate-700">{curr.grade}</b></span>
                        <span>Số lượng câu: <b className="text-indigo-600">{curr.questions?.length || 0} câu</b></span>
                        <span>Thời gian: <b className="text-slate-700">{curr.durationMinutes || 50} phút</b></span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCreateRoom("teacher_paced")}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tạo phòng: Giáo viên điều phối câu hỏi ➔</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateRoom("student_paced")}
                  className="w-full py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  Tạo phòng: Học sinh tự do làm bài
                </button>
              </div>
            </div>

            {/* Cột 2: THAM GIA BẰNG MÃ PIN (DÀNH CHO GIÁO VIÊN KIỂM TRA HOẶC DỰ GIỜ) */}
            <div className="lg:col-span-5 bg-slate-50/80 p-5 sm:p-6 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-xs">
                    🧑‍🎓
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    Dự giờ / Kiểm tra
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900">Tham Gia Bằng Mã PIN</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Nhập mã PIN để tham gia vào phòng thi của giáo viên khác để dự giờ, kiểm thử hoặc trải nghiệm đề thi.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã PIN phòng thi:</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={studentPin}
                    onChange={(e) => {
                      setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setJoinError("");
                    }}
                    placeholder="Nhập 6 chữ số (VD: 842109)..."
                    className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-300 text-base font-black text-center tracking-widest text-slate-900 outline-none focus:border-emerald-500 shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên hiển thị:</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      setJoinError("");
                    }}
                    placeholder="Họ và tên..."
                    className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={isJoining || studentPin.length < 6}
                  onClick={handleJoinRoom}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang nạp đề thi...</span>
                    </>
                  ) : (
                    <>
                      <span>Vào phòng thi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN GIÁO VIÊN ĐIỀU KHIỂN PHÒNG THI
  // =========================================================================
  if (role === "teacher") {
    const totalQuestions = activeExam?.questions?.length || 0;

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 flex flex-col font-sans">
        {/* Header Phòng thi GV */}
        <div className="max-w-7xl w-full mx-auto bg-slate-900 rounded-3xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-center shadow-lg">
              <span className="text-[10px] font-extrabold uppercase text-purple-200 block">Mã PIN Phòng</span>
              <span className="text-2xl sm:text-3xl font-black tracking-widest">{room.pin}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                  {activeExam?.grade || "Toán"}
                </span>
                <h2 className="font-black text-base sm:text-lg">{room.examTitle}</h2>
              </div>
              <p className="text-xs text-slate-400 font-semibold flex items-center gap-2 mt-1">
                <span>{(room.students || []).length} học sinh tham gia</span> •{" "}
                <span className={room.status === "waiting" ? "text-amber-400" : "text-emerald-400 font-bold"}>
                  Trạng thái: {room.status === "waiting" ? "Đang đợi bắt đầu" : "Đang làm bài"}
                </span>
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
                  Câu {room.currentQuestionIndex + 1}/{totalQuestions}
                </span>
                <button
                  type="button"
                  onClick={() => handleTeacherChangeQuestion(1)}
                  disabled={room.currentQuestionIndex >= totalQuestions - 1}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 font-bold text-xs"
                >
                  Câu sau ❯
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onExit}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white font-bold text-xs transition flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* Nội dung câu hỏi đang chiếu + Bảng xếp hạng Realtime */}
        <div className="max-w-7xl w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cột trái: Slide câu hỏi đang chiếu */}
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
            {currentQ ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-3">
                  <span className="text-blue-400">{currentQ.partName || "Nội dung câu hỏi"}</span>
                  <span>Điểm chuẩn: {currentQ.score}đ</span>
                </div>

                <div className="text-base sm:text-lg font-semibold leading-relaxed">
                  <span className="font-black text-amber-400 mr-2">{currentQ.title}:</span>
                  <MathRenderer content={cleanQuestionContent(currentQ.content)} inline />
                </div>

                {/* Dạng 1: Trắc nghiệm 4 lựa chọn */}
                {currentQ.type === "single_choice" && currentQ.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                    {currentQ.options.map((opt) => (
                      <div
                        key={opt.label}
                        className={`p-3 rounded-2xl border flex items-center gap-3 text-xs ${
                          opt.label === currentQ.correctAnswer
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                            : "bg-slate-800 border-slate-700 text-slate-300"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
                            opt.label === currentQ.correctAnswer ? "bg-emerald-600 text-white" : "bg-slate-700 text-white"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <MathRenderer content={opt.text} inline />
                      </div>
                    ))}
                  </div>
                )}

                {/* Dạng 2: Đúng / Sai */}
                {currentQ.type === "true_false" && currentQ.tfItems && (
                  <div className="space-y-2 pt-2">
                    {currentQ.tfItems.map((item) => (
                      <div
                        key={item.label}
                        className="p-3 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-300">({item.label})</span>
                          <MathRenderer content={item.text} inline />
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            item.isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {item.isCorrect ? "Đúng" : "Sai"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dạng 3: Trả lời ngắn */}
                {currentQ.type === "short_answer" && (
                  <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 text-xs">
                    <span className="text-slate-400 font-semibold block mb-1">Đáp án đúng chuẩn:</span>
                    <span className="text-sm font-black text-emerald-400">{currentQ.correctAnswer || "Chưa thiết lập"}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                Phòng thi đang ở trạng thái chờ. Bấm "BẮT ĐẦU THI" để phát đề cho học sinh.
              </div>
            )}

            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 mt-6 flex justify-between items-center text-xs text-slate-400">
              <span>Đang đồng bộ cho tất cả học sinh theo mã PIN #{room.pin}.</span>
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
              {(room.students || []).length === 0 ? (
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
                            {stu.answers && currentQ && stu.answers[currentQ.id] !== undefined
                              ? "✓ Đã nộp đáp án"
                              : "Đang suy nghĩ..."}
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

  // =========================================================================
  // GIAO DIỆN HỌC SINH THAM GIA PHÒNG THI
  // =========================================================================
  const totalQuestions = activeExam?.questions?.length || 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-2xl bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-6">
        {/* Header học sinh */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                MÃ PHÒNG #{room.pin}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{activeExam?.grade}</span>
            </div>
            <h2 className="font-black text-lg text-slate-100 mt-1">{activeExam?.title || room.examTitle}</h2>
            <p className="text-xs text-indigo-300 font-medium">Thí sinh: {studentName}</p>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold transition flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Rời phòng</span>
          </button>
        </div>

        {/* Trạng thái chờ GV bắt đầu */}
        {room.status === "waiting" ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mx-auto animate-pulse">
              ⏳
            </div>
            <h3 className="font-black text-lg">Đang chờ giáo viên bắt đầu bài thi...</h3>
            <p className="text-xs text-slate-400">
              Bạn đã kết nối thành công vào phòng thi số <b>#{room.pin}</b>. Đề thi đã được nạp sẵn sàng!
            </p>
          </div>
        ) : (
          /* Trạng thái làm bài theo điều phối của GV */
          currentQ && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span className="text-indigo-400">
                  Câu {room.currentQuestionIndex + 1}/{totalQuestions} • {currentQ.partName || "Bài thi"}
                </span>
                <span className="text-amber-400">Điểm: {currentQ.score}đ</span>
              </div>

              <div className="text-sm sm:text-base font-semibold leading-relaxed bg-slate-850 p-4 rounded-2xl border border-slate-700/60">
                <span className="font-black text-amber-400 mr-2">{currentQ.title}:</span>
                <MathRenderer content={cleanQuestionContent(currentQ.content)} />
              </div>

              {/* Dạng 1: Trắc nghiệm 4 lựa chọn */}
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

              {/* Dạng 2: Đúng / Sai */}
              {currentQ.type === "true_false" && currentQ.tfItems && (
                <div className="space-y-3 pt-2">
                  {currentQ.tfItems.map((item) => {
                    const currentTfAns = myAnswers[currentQ.id] || {};
                    const selectedVal = currentTfAns[item.label];

                    return (
                      <div
                        key={item.label}
                        className="p-3 bg-slate-750 rounded-2xl border border-slate-700 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1">
                          <span className="font-bold text-indigo-300 mr-2">({item.label})</span>
                          <MathRenderer content={item.text} inline />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nextTf = { ...currentTfAns, [item.label]: true };
                              handleStudentAnswer(nextTf);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                              selectedVal === true
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                          >
                            Đúng
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextTf = { ...currentTfAns, [item.label]: false };
                              handleStudentAnswer(nextTf);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                              selectedVal === false
                                ? "bg-rose-600 text-white shadow-sm"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                          >
                            Sai
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dạng 3: Trả lời ngắn */}
              {currentQ.type === "short_answer" && (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shortAnswerInput}
                      onChange={(e) => setShortAnswerInput(e.target.value)}
                      placeholder="Nhập kết quả số hoặc biểu thức..."
                      className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 border border-slate-700 text-sm font-bold text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (shortAnswerInput.trim()) {
                          handleStudentAnswer(shortAnswerInput.trim());
                        }
                      }}
                      className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Nộp</span>
                    </button>
                  </div>
                  {myAnswers[currentQ.id] !== undefined && (
                    <p className="text-xs text-emerald-400 font-bold">
                      ✓ Đã lưu câu trả lời: "{myAnswers[currentQ.id]}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};
