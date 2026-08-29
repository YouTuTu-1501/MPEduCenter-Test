import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Question, Exam, ChoiceOption, TrueFalseItem, STANDARD_GRADES, STANDARD_CHAPTERS_BY_GRADE } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import { StudentScratchpad } from "./StudentScratchpad";
import { MathScratchpadModal } from "./MathScratchpadModal";
import { ExamEditorModal } from "./ExamEditorModal";
import { playSound } from "../utils/audio";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  CHAPTER_CATALOG,
  ChapterMeta,
  getQuestionsForChapter,
  practiceQuestionBank,
} from "../data/practiceQuestionsBank";
import { parseLatexExam, exportExamToLatex } from "../utils/latexParser";
import { generateStandardExamCode } from "../utils/examCodeHelper";
import confetti from "canvas-confetti";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Star,
  BrainCircuit,
  Eye,
  HelpCircle,
  Pencil,
  ArrowRight,
  Layers,
  Search,
  Filter,
  Check,
  X,
  TrendingUp,
  BarChart2,
  PieChart,
  Lightbulb,
  Maximize2,
  Minimize2,
  BookMarked,
  ShieldCheck,
  Zap,
  ListOrdered,
  Activity,
  Home,
  CheckCircle,
  Compass,
  Triangle,
  Move,
  Plus,
  Edit,
  Trash2,
  Copy,
  Upload,
  Download,
  FileCode,
  FolderPlus,
  FolderOpen,
  SlidersHorizontal,
  Bookmark,
  Calendar,
  Lock,
  Unlock,
} from "lucide-react";

interface PracticeModeViewProps {
  allExams: Exam[];
  onExit: () => void;
  onSaveExam?: (exam: Exam) => void;
  onDeleteExam?: (examId: string) => void;
  onSelectExam?: (
    exam: Exam,
    mode: "presentation" | "exam" | "analytics" | "live"
  ) => void;
}

export interface PracticeQuestionState {
  userAnswer: any;
  isAnswered: boolean;
  isCorrect?: boolean;
  checkedAt?: number;
  attemptsCount: number;
  isStarred?: boolean;
  showHint?: boolean;
  showSolution?: boolean;
}

export const PracticeModeView: React.FC<PracticeModeViewProps> = ({
  allExams,
  onExit,
  onSaveExam,
  onDeleteExam,
  onSelectExam,
}) => {
  const { currentUser, isStudent, isAdmin, isTeacher } = useAuth();
  const { toast } = useToast();

  // Chế độ màn hình: 'selection' (Chọn chuyên đề & cấu hình) | 'practicing' (Làm bài) | 'summary' (Tổng kết)
  const [viewState, setViewState] = useState<"selection" | "practicing" | "summary">("selection");

  // Bộ lọc chuyên đề
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<ChapterMeta | null>(CHAPTER_CATALOG[0]);
  const [activeTabMode, setActiveTabMode] = useState<"chapters" | "topic_exams">("chapters");

  // State Quản lý & Chỉnh sửa Đề Chuyên Đề (Add/Edit/Import)
  const [showExamEditor, setShowExamEditor] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importLatexText, setImportLatexText] = useState<string>("");
  const [importTitle, setImportTitle] = useState<string>("");
  const [importDuration, setImportDuration] = useState<number>(45);

  // Cấu hình buổi luyện tập
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [questionCountLimit, setQuestionCountLimit] = useState<number>(10);
  const [timerMode, setTimerMode] = useState<"none" | "count_up" | "count_down">("count_up");
  const [countdownMinutes, setCountdownMinutes] = useState<number>(15);

  // Dữ liệu câu hỏi đang luyện tập
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);
  const [questionStates, setQuestionStates] = useState<Record<string, PracticeQuestionState>>({});

  // Bảng nháp & Công cụ hỗ trợ
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [showMatrixFilter, setShowMatrixFilter] = useState<"all" | "correct" | "incorrect" | "starred" | "unanswered">("all");

  // Thời gian & Đồng hồ
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);

  // Phím tắt bàn phím
  const currentQ = activeQuestions[currentIdx];
  const currentState = currentQ ? questionStates[currentQ.id] || { userAnswer: null, isAnswered: false, attemptsCount: 0 } : null;

  // Lọc danh mục các chương học theo khối và từ khóa tìm kiếm
  const filteredChapters = useMemo(() => {
    return CHAPTER_CATALOG.filter((ch) => {
      const matchGrade = selectedGrade === "all" || ch.grade === selectedGrade;
      const matchSearch =
        !searchQuery.trim() ||
        ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGrade && matchSearch;
    });
  }, [selectedGrade, searchQuery]);

  // Đếm số câu hỏi khả dụng cho từng chương
  const chapterQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CHAPTER_CATALOG.forEach((ch) => {
      const qList = getQuestionsForChapter(ch.key, allExams);
      counts[ch.key] = qList.length;
    });
    return counts;
  }, [allExams]);

  // Danh sách các đề thi thuộc chuyên đề đang chọn
  const currentChapterExams = useMemo(() => {
    if (!selectedChapter) return [];
    return allExams.filter((exam) => {
      const matchGrade = exam.grade === selectedChapter.grade;
      const matchCode = exam.chapter && exam.chapter.toLowerCase().includes(selectedChapter.code.toLowerCase());
      const matchTitle = exam.chapter && exam.chapter.toLowerCase().includes(selectedChapter.title.toLowerCase());
      return matchGrade && (matchCode || matchTitle);
    });
  }, [allExams, selectedChapter]);

  // Danh sách toàn bộ đề thi chuyên đề (phục vụ tab Tất cả bộ đề)
  const allTopicExams = useMemo(() => {
    return allExams.filter((exam) => {
      const matchGrade = selectedGrade === "all" || exam.grade === selectedGrade;
      const matchSearch =
        !searchQuery.trim() ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.chapter && exam.chapter.toLowerCase().includes(searchQuery.toLowerCase())) ||
        exam.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGrade && matchSearch;
    });
  }, [allExams, selectedGrade, searchQuery]);

  // Đồng hồ đếm thời gian luyện tập
  useEffect(() => {
    let timer: any = null;
    if (viewState === "practicing" && isTimerRunning) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        if (timerMode === "count_down") {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              toast.info("Hết thời gian luyện tập!", "Bạn có thể tiếp tục làm bài hoặc xem tổng kết kết quả.");
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [viewState, isTimerRunning, timerMode, toast]);

  // Bắt đầu buổi luyện tập
  const handleStartPractice = (chapter: ChapterMeta, customQList?: Question[]) => {
    let rawList = customQList || getQuestionsForChapter(chapter.key, allExams);

    // Áp dụng bộ lọc dạng câu hỏi
    if (questionTypeFilter !== "all") {
      rawList = rawList.filter((q) => q.type === questionTypeFilter || q.part === questionTypeFilter);
    }

    // Áp dụng bộ lọc độ khó
    if (difficultyFilter !== "all") {
      rawList = rawList.filter((q) => q.difficulty === difficultyFilter);
    }

    if (rawList.length === 0) {
      // Nếu bộ lọc quá chặt làm hết câu, lấy toàn bộ câu của chương đó
      rawList = getQuestionsForChapter(chapter.key, allExams);
    }

    // Giới hạn số lượng câu hỏi
    const finalQuestions = questionCountLimit >= rawList.length ? rawList : rawList.slice(0, questionCountLimit);

    if (finalQuestions.length === 0) {
      toast.warning("Chưa có câu hỏi nào", "Chuyên đề này hiện đang được cập nhật câu hỏi.");
      return;
    }

    setActiveQuestions(finalQuestions);
    setSelectedChapter(chapter);
    setCurrentIdx(0);
    setDirection(0);

    // Khởi tạo trạng thái từng câu hỏi
    const initialStates: Record<string, PracticeQuestionState> = {};
    finalQuestions.forEach((q) => {
      initialStates[q.id] = {
        userAnswer: q.type === "true_false" ? { a: null, b: null, c: null, d: null } : null,
        isAnswered: false,
        attemptsCount: 0,
        showHint: false,
        showSolution: false,
      };
    });
    setQuestionStates(initialStates);

    // Đặt lại thời gian & streak
    setElapsedSeconds(0);
    setRemainingSeconds(countdownMinutes * 60);
    setIsTimerRunning(true);
    setStreakCount(0);
    setMaxStreak(0);
    setViewState("practicing");
  };

  // Điều hướng câu hỏi
  const goToQuestion = (idx: number) => {
    if (idx < 0 || idx >= activeQuestions.length || idx === currentIdx) return;
    setDirection(idx > currentIdx ? 1 : -1);
    setCurrentIdx(idx);
  };

  // Cập nhật câu trả lời của học sinh
  const handleUpdateAnswer = (qId: string, answer: any) => {
    setQuestionStates((prev) => {
      const cur = prev[qId] || { userAnswer: null, isAnswered: false, attemptsCount: 0 };
      return {
        ...prev,
        [qId]: {
          ...cur,
          userAnswer: answer,
          // Nếu người dùng thay đổi đáp án sau khi đã kiểm tra sai, cho phép kiểm tra lại
          isAnswered: cur.isCorrect ? true : false,
        },
      };
    });
  };

  // Kiểm tra đáp án tức thì (Instant Verification)
  const handleCheckAnswer = (q: Question) => {
    const cur = questionStates[q.id];
    if (!cur || cur.userAnswer === null || cur.userAnswer === undefined) {
      toast.warning("Vui lòng chọn đáp án trước khi kiểm tra!");
      return;
    }

    let isCorrect = false;

    if (q.type === "single_choice") {
      const correctOption = q.options?.find((o) => o.isCorrect)?.label || q.correctAnswer;
      isCorrect = String(cur.userAnswer).trim().toUpperCase() === String(correctOption).trim().toUpperCase();
    } else if (q.type === "true_false") {
      const ansObj = cur.userAnswer || {};
      const tfItems = q.tfItems || [];
      if (tfItems.length === 0) {
        isCorrect = true;
      } else {
        // Đúng toàn bộ 4 ý mới tính là đúng hoàn toàn
        isCorrect = tfItems.every((item) => {
          const userVal = ansObj[item.label];
          return userVal !== null && userVal !== undefined && Boolean(userVal) === Boolean(item.isCorrect);
        });
      }
    } else if (q.type === "short_answer") {
      const userText = String(cur.userAnswer).trim().replace(",", ".");
      const correctText = String(q.correctAnswer || "").trim().replace(",", ".");
      const userNum = parseFloat(userText);
      const correctNum = parseFloat(correctText);

      if (!isNaN(userNum) && !isNaN(correctNum)) {
        const tol = q.tolerance !== undefined ? q.tolerance : 0.05;
        isCorrect = Math.abs(userNum - correctNum) <= tol;
      } else {
        isCorrect = userText.toLowerCase() === correctText.toLowerCase();
      }
    } else {
      // Dạng tự luận
      isCorrect = true;
    }

    // Âm thanh & Hiệu ứng phản hồi
    if (isCorrect) {
      playSound("correct");
      const newStreak = streakCount + 1;
      setStreakCount(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      if (newStreak >= 3) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
    } else {
      playSound("wrong");
      setStreakCount(0);
    }

    setQuestionStates((prev) => ({
      ...prev,
      [q.id]: {
        ...cur,
        isAnswered: true,
        isCorrect,
        checkedAt: Date.now(),
        attemptsCount: cur.attemptsCount + 1,
        // Tự động mở lời giải nếu làm sai để học sinh hiểu ngay
        showSolution: !isCorrect ? true : cur.showSolution,
      },
    }));
  };

  // Làm lại câu hỏi (Reset để thử lại)
  const handleResetQuestion = (qId: string, qType: string) => {
    setQuestionStates((prev) => ({
      ...prev,
      [qId]: {
        userAnswer: qType === "true_false" ? { a: null, b: null, c: null, d: null } : null,
        isAnswered: false,
        isCorrect: undefined,
        attemptsCount: prev[qId]?.attemptsCount || 0,
        isStarred: prev[qId]?.isStarred,
        showHint: false,
        showSolution: false,
      },
    }));
  };

  // Bật/tắt đánh dấu câu hỏi cần ôn lại (Star/Bookmark)
  const handleToggleStar = (qId: string) => {
    setQuestionStates((prev) => {
      const cur = prev[qId];
      const isStarred = !cur?.isStarred;
      if (isStarred) {
        toast.success("Đã thêm vào danh sách cần ôn lại ⭐️");
      }
      return {
        ...prev,
        [qId]: {
          ...cur,
          isStarred,
        },
      };
    });
  };

  // Bật/tắt Gợi ý giải nhanh
  const handleToggleHint = (qId: string) => {
    setQuestionStates((prev) => {
      const cur = prev[qId];
      return {
        ...prev,
        [qId]: {
          ...cur,
          showHint: !cur?.showHint,
        },
      };
    });
  };

  // Bật/tắt Lời giải chi tiết
  const handleToggleSolution = (qId: string) => {
    setQuestionStates((prev) => {
      const cur = prev[qId];
      return {
        ...prev,
        [qId]: {
          ...cur,
          showSolution: !cur?.showSolution,
        },
      };
    });
  };

  // Thống kê tiến độ bài luyện tập hiện tại
  const progressStats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    let incorrect = 0;
    let starred = 0;

    activeQuestions.forEach((q) => {
      const s = questionStates[q.id];
      if (s?.isAnswered) {
        answered++;
        if (s.isCorrect) correct++;
        else incorrect++;
      }
      if (s?.isStarred) starred++;
    });

    const total = activeQuestions.length;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const completion = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { total, answered, correct, incorrect, starred, accuracy, completion };
  }, [activeQuestions, questionStates]);

  // Kết thúc buổi luyện tập và chuyển sang trang Tổng kết
  const handleFinishPractice = () => {
    setIsTimerRunning(false);
    setViewState("summary");
    if (progressStats.accuracy >= 80 && progressStats.answered >= 3) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  // Luyện tập lại chỉ các câu làm sai
  const handleRetryIncorrectQuestions = () => {
    const wrongQs = activeQuestions.filter((q) => questionStates[q.id]?.isCorrect === false);
    if (wrongQs.length === 0) {
      toast.success("Tuyệt vời!", "Bạn không có câu hỏi nào làm sai.");
      return;
    }
    if (selectedChapter) {
      handleStartPractice(selectedChapter, wrongQs);
    }
  };

  // Định dạng thời gian mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // =========================================================================
  // 1. CÁC HÀM XỬ LÝ QUẢN LÝ ĐỀ CHUYÊN ĐỀ (THÊM, SỬA, XÓA, NHÂN BẢN, IMPORT)
  // =========================================================================

  // Tạo Đề Chuyên Đề Mới (gắn theo Chương / Khối đang chọn)
  const handleCreateNewTopicExam = (targetChapterParam?: ChapterMeta) => {
    const chapterObj = targetChapterParam || selectedChapter || CHAPTER_CATALOG[0];
    const stdChapters = STANDARD_CHAPTERS_BY_GRADE[chapterObj.grade] || [];
    const matchedStdChapter = stdChapters.find((c) => c.includes(chapterObj.code)) || chapterObj.title;

    const newExam: Exam = {
      id: `exam_practice_${Date.now()}`,
      title: `Đề Chuyên Đề: ${chapterObj.title}`,
      code: generateStandardExamCode({
        grade: chapterObj.grade,
        chapter: chapterObj.code,
        lesson: "01",
        attempt: "01",
      }),
      subject: "Toán học THPT",
      grade: chapterObj.grade,
      targetClass: "Tất cả các lớp",
      chapter: matchedStdChapter,
      durationMinutes: 45,
      totalScore: 10,
      description: `Bộ đề ôn luyện chuyên sâu chủ đề "${chapterObj.title}" (${chapterObj.grade}).`,
      author: currentUser?.name || "Tổ Toán THPT",
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [],
    };
    setEditingExam(newExam);
    setShowExamEditor(true);
  };

  // Mở trình soạn thảo / Chỉnh sửa đề thi
  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setShowExamEditor(true);
  };

  // Nhân bản đề thi
  const handleDuplicateExam = (exam: Exam) => {
    const clonedExam: Exam = {
      ...exam,
      id: `exam_copy_${Date.now()}`,
      title: `${exam.title} (Bản sao)`,
      code: `${exam.code}_COPY`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (onSaveExam) {
      onSaveExam(clonedExam);
      toast.success("Đã nhân bản đề thi thành công!", `Tạo bản sao: "${clonedExam.title}"`);
    }
  };

  // Xóa đề thi
  const handleDeleteExamAction = (examId: string, title: string) => {
    if (confirm(`Bạn có chắc muốn xóa đề thi chuyên đề "${title}" không?`)) {
      if (onDeleteExam) {
        onDeleteExam(examId);
        toast.info("Đã xóa đề thi khỏi danh sách");
      }
    }
  };

  // Lưu đề thi từ Modal ExamEditorModal
  const handleSaveExamFromEditor = (savedExam: Exam) => {
    if (onSaveExam) {
      onSaveExam(savedExam);
      toast.success(
        "Đã lưu đề chuyên đề thành công!",
        `Đề "${savedExam.title}" (${savedExam.questions.length} câu hỏi) đã được cập nhật vào cơ sở dữ liệu.`
      );
    }
    setShowExamEditor(false);
    setEditingExam(null);
  };

  // Nhập đề từ mã nguồn LaTeX
  const handleConfirmImportLatex = () => {
    if (!importLatexText.trim()) {
      toast.warning("Vui lòng dán nội dung mã nguồn LaTeX!");
      return;
    }
    const chapterObj = selectedChapter || CHAPTER_CATALOG[0];
    const examTitle = importTitle.trim() || `Đề Chuyên Đề: ${chapterObj.title}`;
    const parsed = parseLatexExam(importLatexText, examTitle);

    parsed.grade = chapterObj.grade;
    parsed.chapter = chapterObj.title;
    parsed.durationMinutes = Number(importDuration) || parsed.durationMinutes || 45;
    parsed.code = generateStandardExamCode({
      grade: chapterObj.grade,
      chapter: chapterObj.code,
      lesson: "01",
      attempt: "01",
    });

    if (onSaveExam) {
      onSaveExam(parsed);
      toast.success(
        "Nhập đề chuyên đề từ LaTeX thành công!",
        `Đã nhận diện ${parsed.questions.length} câu hỏi và lưu vào chuyên đề "${chapterObj.title}".`
      );
    }
    setShowImportModal(false);
    setImportLatexText("");
    setImportTitle("");
  };

  // Luyện tập ngay bộ đề cụ thể
  const handlePracticeSpecificExam = (exam: Exam) => {
    if (!exam.questions || exam.questions.length === 0) {
      toast.warning("Đề thi này chưa có câu hỏi", "Hãy bấm nút 'Sửa đề' (✏️) để thêm câu hỏi vào đề.");
      return;
    }
    const ch =
      CHAPTER_CATALOG.find(
        (c) =>
          c.grade === exam.grade &&
          (exam.chapter?.includes(c.code) || exam.chapter?.includes(c.title))
      ) ||
      selectedChapter ||
      CHAPTER_CATALOG[0];
    setSelectedChapter(ch);
    handleStartPractice(ch, exam.questions);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* VIEW 1: MÀN HÌNH CHỌN CHUYÊN ĐỀ & CẤU HÌNH LUYỆN TẬP */}
      {/* ========================================================================= */}
      {viewState === "selection" && (
        <div className="flex-1 bg-slate-50/50 min-h-screen py-6 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-sky-200 text-xs font-extrabold uppercase tracking-wider border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: "4s" }} />
                  <span>Chế độ Luyện Tập & Quản Lý Đề Chuyên Đề</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Luyện Tập Theo Từng Chuyên Đề Toán Học
                </h1>
                <p className="text-sm sm:text-base text-sky-100 max-w-2xl leading-relaxed">
                  Luyện tập tự do với phản hồi tức thì và gợi ý chi tiết từng bước. Bạn cũng có thể thêm đề thi mới, chỉnh sửa câu hỏi, đáp án hoặc nhập đề từ LaTeX cho từng chuyên đề.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Nút Tạo Đề Chuyên Đề Mới */}
                <button
                  type="button"
                  onClick={() => handleCreateNewTopicExam()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Tạo đề thi mới cho chuyên đề này"
                >
                  <Plus className="w-4 h-4 text-indigo-600 stroke-[3]" />
                  <span>Thêm Đề Chuyên Đề</span>
                </button>

                {/* Nút Nhập Đề LaTeX */}
                <button
                  type="button"
                  onClick={() => {
                    setImportTitle(selectedChapter ? `Đề Chuyên Đề: ${selectedChapter.title}` : "Đề Luyện Tập Chuyên Đề");
                    setShowImportModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs border border-white/30 transition-all shadow-xs cursor-pointer"
                  title="Nhập đề chuyên đề từ mã nguồn LaTeX"
                >
                  <FileCode className="w-4 h-4 text-sky-200" />
                  <span>Nhập LaTeX</span>
                </button>

                {/* Nút Quay lại */}
                <button
                  type="button"
                  onClick={onExit}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs border border-white/20 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filters Bar: Khối lớp, Chế độ xem & Tìm kiếm */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {/* Mode Switch & Grade Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Selector: Chuyên mục vs Toàn bộ đề */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTabMode("chapters")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeTabMode === "chapters"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Theo Chuyên Đề</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabMode("topic_exams")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeTabMode === "topic_exams"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tất Cả Bộ Đề ({allTopicExams.length})</span>
                </button>
              </div>

              {/* Grade Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "Tất cả khối" },
                  { id: "Lớp 12", label: "Khối 12" },
                  { id: "Lớp 11", label: "Khối 11" },
                  { id: "Lớp 10", label: "Khối 10" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedGrade(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedGrade === tab.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên chương, đề thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Tab 1: THEO DANH MỤC CHUYÊN ĐỀ */}
          {activeTabMode === "chapters" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Chapter Catalog List (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Danh Mục Chuyên Đề ({filteredChapters.length})</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">Bấm vào chương để chọn cấu hình & xem bộ đề</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredChapters.map((chapter) => {
                      const isSelected = selectedChapter?.key === chapter.key;
                      const qCount = chapterQuestionCounts[chapter.key] || 0;

                      return (
                        <div
                          key={chapter.key}
                          onClick={() => setSelectedChapter(chapter)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-3 group ${
                            isSelected
                              ? "bg-indigo-50/50 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${chapter.badgeColor}`}
                              >
                                {chapter.grade} • {chapter.code}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{qCount} câu</span>
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                              {chapter.title}
                            </h4>

                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {chapter.subtitle}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                              <span>{isSelected ? "Đang chọn" : "Chọn chương này"}</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phần: CÁC BỘ ĐỀ LUYỆN TẬP THUỘC CHUYÊN ĐỀ ĐANG CHỌN */}
                {selectedChapter && (
                  <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                            {selectedChapter.code}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900">
                            Các Bộ Đề Thi Của Chuyên Đề: {selectedChapter.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tự do chỉnh sửa câu hỏi, bổ sung đề thi mới hoặc bắt đầu làm bài luyện tập.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCreateNewTopicExam(selectedChapter)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Thêm đề vào chương này</span>
                        </button>
                      </div>
                    </div>

                    {currentChapterExams.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                        <FolderPlus className="w-10 h-10 text-slate-400 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700">Chưa có đề thi riêng biệt nào trong chuyên đề này</p>
                          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                            Hệ thống đang sử dụng ngân hàng câu hỏi tổng hợp ({chapterQuestionCounts[selectedChapter.key] || 0} câu). Bạn có thể tạo bộ đề thi mới hoặc nhập từ LaTeX bất cứ lúc nào.
                          </p>
                        </div>
                        <div className="flex justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleCreateNewTopicExam(selectedChapter)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Tạo đề mới ngay
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {currentChapterExams.map((exam) => (
                          <div
                            key={exam.id}
                            className="p-4 bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between gap-3 group"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                                  Mã: {exam.code}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{exam.durationMinutes} phút</span>
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                {exam.title}
                              </h4>

                              <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                                <span>{exam.questions.length} câu hỏi</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-bold">
                                  {exam.questions.filter((q) => q.part === "part_1").length} TN,{" "}
                                  {exam.questions.filter((q) => q.part === "part_2").length} Đ/S
                                </span>
                              </div>
                            </div>

                            {/* Thao tác với đề: Luyện tập, Sửa đề, Nhân bản, Xóa */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePracticeSpecificExam(exam)}
                                className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Bắt đầu luyện tập đề này"
                              >
                                <Zap className="w-3.5 h-3.5 fill-white" />
                                <span>Luyện tập</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditExam(exam)}
                                className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                                title="Chỉnh sửa câu hỏi, đáp án, điểm và lời giải đề này"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateExam(exam)}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                title="Nhân bản đề này"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteExamAction(exam.id, exam.title)}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                                title="Xóa đề thi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Practice Settings & Quick Start Box (1 Col) */}
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5 sticky top-20">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Cấu Hình Buổi Luyện Tập</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Chương đang chọn: <strong className="text-indigo-600">{selectedChapter?.title}</strong>
                    </p>
                  </div>

                  {/* Question Type Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Dạng thức câu hỏi</label>
                    <select
                      value={questionTypeFilter}
                      onChange={(e) => setQuestionTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="all">Tất cả 4 dạng thức thi</option>
                      <option value="single_choice">PHẦN I: Trắc nghiệm 4 lựa chọn</option>
                      <option value="true_false">PHẦN II: Đúng / Sai 4 ý</option>
                      <option value="short_answer">PHẦN III: Trả lời ngắn</option>
                    </select>
                  </div>

                  {/* Difficulty Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Mức độ nhận thức</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "all", label: "Tất cả mức độ" },
                        { id: "easy", label: "Nhận biết (Dễ)" },
                        { id: "medium", label: "Thông hiểu" },
                        { id: "hard", label: "Vận dụng (Khó)" },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          onClick={() => setDifficultyFilter(lvl.id)}
                          className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                            difficultyFilter === lvl.id
                              ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-extrabold"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Number of Questions */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Số lượng câu luyện tập</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          onClick={() => setQuestionCountLimit(num)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            questionCountLimit === num
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {num} câu
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timer Mode */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Chế độ đồng hồ</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "none", label: "Không bấm giờ" },
                        { id: "count_up", label: "Đếm xuôi" },
                        { id: "count_down", label: "Hẹn giờ" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTimerMode(t.id as any)}
                          className={`py-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                            timerMode === t.id
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={() => selectedChapter && handleStartPractice(selectedChapter)}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>BẮT ĐẦU LUYỆN TẬP NGAY</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: TẤT CẢ BỘ ĐỀ CHUYÊN ĐỀ TRONG HỆ THỐNG */
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <span>Toàn Bộ Các Bộ Đề Thi Chuyên Đề ({allTopicExams.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Danh sách đầy đủ các đề luyện tập. Bạn có thể bấm "Sửa đề" để thêm bớt câu hỏi hoặc "Làm bài" để kiểm tra tức thì.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateNewTopicExam()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Tạo đề mới</span>
                  </button>
                </div>
              </div>

              {allTopicExams.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <FolderOpen className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Không tìm thấy đề thi chuyên đề nào</p>
                  <p className="text-xs text-slate-500">Hãy thử đổi từ khóa tìm kiếm hoặc bấm "Tạo đề mới".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTopicExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-5 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between gap-4 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                            {exam.grade} • {exam.code}
                          </span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{exam.durationMinutes}p</span>
                          </span>
                        </div>

                        {exam.chapter && (
                          <span className="text-[11px] font-bold text-indigo-600 block line-clamp-1">
                            {exam.chapter}
                          </span>
                        )}

                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {exam.title}
                        </h4>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {exam.description || "Bộ đề ôn luyện chuẩn cấu trúc đề thi tốt nghiệp THPT."}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold bg-white p-2 rounded-xl border border-slate-100">
                          <span>{exam.questions.length} câu</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            {exam.questions.filter((q) => q.part === "part_1").length} TN4,{" "}
                            {exam.questions.filter((q) => q.part === "part_2").length} Đ/S
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePracticeSpecificExam(exam)}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Luyện tập</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditExam(exam)}
                          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                          title="Sửa đề thi này"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateExam(exam)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                          title="Nhân bản đề này"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteExamAction(exam.id, exam.title)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MÀN HÌNH TỔNG KẾT BUỔI LUYỆN TẬP */}
      {/* ========================================================================= */}
      {viewState === "summary" && (
        <div className="flex-1 bg-slate-50/50 min-h-screen py-8 px-3 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border-4 border-emerald-100 shadow-inner mx-auto">
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider">
                {selectedChapter?.grade} • {selectedChapter?.code}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Tổng Kết Buổi Luyện Tập
              </h2>
              <p className="text-sm text-slate-500">{selectedChapter?.title}</p>
            </div>

            {/* Score Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Tỷ Lệ Đúng</span>
                <span className="text-2xl sm:text-3xl font-black text-indigo-600">
                  {progressStats.accuracy}%
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Số Câu Đúng</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {progressStats.correct}/{progressStats.total}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Chuỗi Đúng Kỷ Lục</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-600 flex items-center justify-center gap-1">
                  <Flame className="w-6 h-6 fill-amber-500" />
                  <span>{maxStreak}</span>
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Thời Gian Làm</span>
                <span className="text-2xl sm:text-3xl font-black text-sky-600">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
              {progressStats.incorrect > 0 && (
                <button
                  onClick={handleRetryIncorrectQuestions}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Luyện lại {progressStats.incorrect} câu làm sai</span>
                </button>
              )}

              <button
                onClick={() => selectedChapter && handleStartPractice(selectedChapter)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Luyện tập lại đề này</span>
              </button>

              <button
                onClick={() => setViewState("selection")}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Chọn chuyên đề khác</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: KHÔNG GIAN LÀM BÀI LUYỆN TẬP (ACTIVE PRACTICE WORKSPACE) */}
      {/* ========================================================================= */}
      {viewState === "practicing" && (
        <div className="flex-1 bg-slate-50 min-h-screen flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Exit button & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setViewState("selection")}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Quay lại danh mục chuyên đề"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase">
                  {selectedChapter?.code}
                </span>
                <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[200px] sm:max-w-md">
                  {selectedChapter?.title}
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right: Streak, Timer, Scratchpad & Finish */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak Counter */}
            {streakCount > 1 && (
              <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Chuỗi {streakCount}</span>
              </div>
            )}

            {/* Timer Badge */}
            {timerMode !== "none" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-mono font-bold shadow-xs">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{timerMode === "count_down" ? formatTime(remainingSeconds) : formatTime(elapsedSeconds)}</span>
              </div>
            )}

            {/* Scratchpad Button */}
            <button
              onClick={() => setShowScratchpad(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bảng nháp</span>
            </button>

            {/* Star Button */}
            {currentQ && (
              <button
                onClick={() => handleToggleStar(currentQ.id)}
                className={`p-2 rounded-xl border transition-all ${
                  currentState?.isStarred
                    ? "bg-amber-50 border-amber-300 text-amber-500 fill-amber-500 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                }`}
                title={currentState?.isStarred ? "Đã lưu câu này" : "Đánh dấu câu cần ôn lại"}
              >
                <Star className="w-4 h-4" />
              </button>
            )}

            {/* Sửa Đề / Sửa Câu Hỏi Button */}
            {onSaveExam && (
              <button
                type="button"
                onClick={() => {
                  const matchedExam = allExams.find((e) => e.questions?.some((q) => q.id === currentQ?.id));
                  if (matchedExam) {
                    setEditingExam(matchedExam);
                  } else {
                    handleCreateNewTopicExam(selectedChapter || undefined);
                  }
                  setShowExamEditor(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-all cursor-pointer shadow-2xs"
                title="Chỉnh sửa câu hỏi hoặc đề thi chuyên đề này"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sửa Đề / Câu Hỏi</span>
              </button>
            )}

            {/* Finish Practice Button */}
            <button
              onClick={handleFinishPractice}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
            >
              Tổng kết
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Main Question Container (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {currentQ ? (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6 relative">
              {/* Question Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-xs">
                    Câu {currentIdx + 1}/{activeQuestions.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                    {currentQ.partName || (currentQ.type === "single_choice" ? "PHẦN I (Trắc nghiệm)" : currentQ.type === "true_false" ? "PHẦN II (Đúng/Sai)" : "PHẦN III (Trả lời ngắn)")}
                  </span>
                  {currentQ.difficulty && (
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        currentQ.difficulty === "easy"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : currentQ.difficulty === "medium"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {currentQ.difficulty === "easy" ? "Nhận biết" : currentQ.difficulty === "medium" ? "Thông hiểu" : "Vận dụng"}
                    </span>
                  )}
                </div>

                {/* Status Indicator */}
                {currentState?.isAnswered && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                      currentState.isCorrect
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {currentState.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CHÍNH XÁC</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>CHƯA ĐÚNG</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Question Content (KaTeX & TikZ) */}
              <div className="text-sm sm:text-base text-slate-900 leading-relaxed font-normal">
                <MathRenderer content={currentQ.content} />
              </div>

              {/* Interactive Answering Area */}
              <div className="pt-2">
                {/* 1. Single Choice (Trắc nghiệm 4 lựa chọn) */}
                {currentQ.type === "single_choice" && currentQ.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentQ.options.map((opt) => {
                      const isSelected = currentState?.userAnswer === opt.label;
                      const isVerified = currentState?.isAnswered;
                      const isThisCorrect = opt.isCorrect;

                      let btnStyle = "bg-white border-slate-200 hover:border-indigo-300 text-slate-800";
                      if (isVerified) {
                        if (isThisCorrect) {
                          btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400/30";
                        } else if (isSelected && !isThisCorrect) {
                          btnStyle = "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-400/30";
                        } else {
                          btnStyle = "bg-slate-50/60 border-slate-200 opacity-60 text-slate-500";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20";
                      }

                      return (
                        <button
                          key={opt.label}
                          onClick={() => handleUpdateAnswer(currentQ.id, opt.label)}
                          className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${btnStyle}`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                              isVerified && isThisCorrect
                                ? "bg-emerald-600 text-white"
                                : isVerified && isSelected && !isThisCorrect
                                ? "bg-rose-600 text-white"
                                : isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {opt.label}
                          </span>
                          <div className="flex-1 text-xs sm:text-sm font-medium pt-0.5">
                            <MathRenderer content={opt.text} />
                          </div>
                          {isVerified && isThisCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {isVerified && isSelected && !isThisCorrect && (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. True / False (Đúng - Sai 4 ý a, b, c, d) */}
                {currentQ.type === "true_false" && currentQ.tfItems && (
                  <div className="space-y-3">
                    {currentQ.tfItems.map((item) => {
                      const userChoice = currentState?.userAnswer?.[item.label];
                      const isVerified = currentState?.isAnswered;
                      const isItemCorrect = userChoice !== null && userChoice !== undefined && Boolean(userChoice) === Boolean(item.isCorrect);

                      return (
                        <div
                          key={item.label}
                          className={`p-4 rounded-2xl border transition-all ${
                            isVerified
                              ? isItemCorrect
                                ? "bg-emerald-50/40 border-emerald-200"
                                : "bg-rose-50/40 border-rose-200"
                              : "bg-slate-50/50 border-slate-200"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                                {item.label}
                              </span>
                              <div className="text-xs sm:text-sm text-slate-900 font-medium">
                                <MathRenderer content={item.text} />
                              </div>
                            </div>

                            {/* True / False Toggle Buttons */}
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <button
                                onClick={() => {
                                  const currentObj = currentState?.userAnswer || {};
                                  handleUpdateAnswer(currentQ.id, { ...currentObj, [item.label]: true });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                  userChoice === true
                                    ? isVerified
                                      ? item.isCorrect
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-rose-600 text-white border-rose-600"
                                      : "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                Đúng
                              </button>
                              <button
                                onClick={() => {
                                  const currentObj = currentState?.userAnswer || {};
                                  handleUpdateAnswer(currentQ.id, { ...currentObj, [item.label]: false });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                  userChoice === false
                                    ? isVerified
                                      ? !item.isCorrect
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-rose-600 text-white border-rose-600"
                                      : "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                Sai
                              </button>
                            </div>
                          </div>

                          {/* Sub-item explanation if verified */}
                          {isVerified && item.explanation && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs text-slate-600 flex items-start gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-slate-800">Giải thích ý {item.label}) ({item.isCorrect ? "Đúng" : "Sai"}):</strong>{" "}
                                <MathRenderer content={item.explanation} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Short Answer (Trả lời ngắn) */}
                {currentQ.type === "short_answer" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Nhập giá trị số hoặc kết quả (Ví dụ: 4, 3.5, 2/3...)"
                        value={currentState?.userAnswer || ""}
                        onChange={(e) => handleUpdateAnswer(currentQ.id, e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    {currentState?.isAnswered && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                        <span>
                          Đáp án đúng: <strong className="text-emerald-600 font-mono text-sm">{currentQ.correctAnswer}</strong>
                        </span>
                        {currentState.isCorrect ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Chính xác
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Chưa chính xác
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Instant Actions Bar: Kiểm tra đáp án, Gợi ý, Lời giải */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {!currentState?.isAnswered ? (
                    <button
                      onClick={() => handleCheckAnswer(currentQ)}
                      className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Kiểm tra đáp án</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResetQuestion(currentQ.id, currentQ.type)}
                      className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Làm lại câu này</span>
                    </button>
                  )}

                  {/* Hint Toggle */}
                  <button
                    onClick={() => handleToggleHint(currentQ.id)}
                    className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentState?.showHint
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>{currentState?.showHint ? "Ẩn gợi ý" : "💡 Gợi ý giải"}</span>
                  </button>

                  {/* Solution Toggle */}
                  <button
                    onClick={() => handleToggleSolution(currentQ.id)}
                    className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentState?.showSolution
                        ? "bg-sky-50 text-sky-800 border-sky-300"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                    <span>{currentState?.showSolution ? "Ẩn lời giải" : "📖 Xem lời giải chi tiết"}</span>
                  </button>
                </div>

                {/* Prev / Next Question */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => goToQuestion(currentIdx - 1)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    title="Câu trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentIdx === activeQuestions.length - 1}
                    onClick={() => goToQuestion(currentIdx + 1)}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
                    title="Câu tiếp theo"
                  >
                    <span>Câu sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Collapsible Instant Hint Card */}
              <AnimatePresence>
                {currentState?.showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 text-xs text-amber-950 space-y-2 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 font-black text-amber-800 uppercase tracking-wider text-[11px]">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>Gợi ý hướng giải nhanh</span>
                    </div>
                    <div className="leading-relaxed font-medium">
                      {currentQ.topic ? (
                        <p>
                          📌 <strong>Kiến thức trọng tâm:</strong> Vận dụng định lý và tính chất của phần <em>{currentQ.topic}</em>.
                        </p>
                      ) : null}
                      <p>
                        💡 Hãy quan sát kĩ các giả thiết bài toán, thiết lập phương trình hoặc áp dụng công thức giải nhanh tương ứng.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsible Full Step-by-Step Solution Card */}
              <AnimatePresence>
                {currentState?.showSolution && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-sky-50/80 rounded-2xl p-5 border border-sky-200 text-xs sm:text-sm text-sky-950 space-y-3 overflow-hidden shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
                      <span className="font-black text-sky-900 uppercase tracking-wider text-xs flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-sky-600" />
                        <span>Lời giải chi tiết từng bước</span>
                      </span>
                      {currentQ.correctAnswer && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-200/60 text-sky-900 font-mono font-bold text-xs">
                          Đáp án đúng: {currentQ.correctAnswer}
                        </span>
                      )}
                    </div>
                    <div className="leading-relaxed text-slate-800">
                      <MathRenderer content={currentQ.explanation || "Chưa có lời giải chi tiết cho câu hỏi này."} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl text-center text-slate-500">
              Chưa có câu hỏi nào được chọn
            </div>
          )}
        </div>

        {/* Right: Question Matrix & Real-time Progress (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5 sticky top-20">
            {/* Progress Gauge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Tiến độ hoàn thành</span>
                <span className="text-indigo-600">{progressStats.answered}/{progressStats.total} câu ({progressStats.completion}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(progressStats.correct / progressStats.total) * 100}%` }}
                  title="Số câu đúng"
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${(progressStats.incorrect / progressStats.total) * 100}%` }}
                  title="Số câu sai"
                />
              </div>
            </div>

            {/* Matrix Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-600">
              <button
                onClick={() => setShowMatrixFilter("all")}
                className={`py-1 rounded-lg transition-all ${
                  showMatrixFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "hover:text-slate-900"
                }`}
              >
                Tất cả ({progressStats.total})
              </button>
              <button
                onClick={() => setShowMatrixFilter("correct")}
                className={`py-1 rounded-lg transition-all text-emerald-600 ${
                  showMatrixFilter === "correct" ? "bg-white shadow-2xs font-extrabold" : "hover:text-emerald-700"
                }`}
              >
                Đúng ({progressStats.correct})
              </button>
              <button
                onClick={() => setShowMatrixFilter("incorrect")}
                className={`py-1 rounded-lg transition-all text-rose-600 ${
                  showMatrixFilter === "incorrect" ? "bg-white shadow-2xs font-extrabold" : "hover:text-rose-700"
                }`}
              >
                Sai ({progressStats.incorrect})
              </button>
              <button
                onClick={() => setShowMatrixFilter("starred")}
                className={`py-1 rounded-lg transition-all text-amber-600 ${
                  showMatrixFilter === "starred" ? "bg-white shadow-2xs font-extrabold" : "hover:text-amber-700"
                }`}
              >
                Lưu ({progressStats.starred})
              </button>
            </div>

            {/* Question Quick Jump Matrix */}
            <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {activeQuestions.map((q, qIdx) => {
                const s = questionStates[q.id];
                const isCurrent = qIdx === currentIdx;

                // Filter check
                if (showMatrixFilter === "correct" && !s?.isCorrect) return null;
                if (showMatrixFilter === "incorrect" && s?.isCorrect !== false) return null;
                if (showMatrixFilter === "starred" && !s?.isStarred) return null;
                if (showMatrixFilter === "unanswered" && s?.isAnswered) return null;

                let pillColor = "bg-slate-50 border-slate-200 text-slate-700";
                if (s?.isAnswered) {
                  if (s.isCorrect) {
                    pillColor = "bg-emerald-50 border-emerald-400 text-emerald-800 font-extrabold";
                  } else {
                    pillColor = "bg-rose-50 border-rose-400 text-rose-800 font-extrabold";
                  }
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(qIdx)}
                    className={`h-10 rounded-xl border text-xs font-bold flex items-center justify-center relative transition-all cursor-pointer ${pillColor} ${
                      isCurrent ? "ring-2 ring-indigo-600 ring-offset-1 font-black" : "hover:bg-slate-100"
                    }`}
                  >
                    <span>{qIdx + 1}</span>
                    {s?.isStarred && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Quick Finish */}
            <button
              onClick={handleFinishPractice}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>KẾT THÚC & XEM TỔNG KẾT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    )}

      {/* Modal Bảng Nháp Toán Học Scratchpad */}
      <MathScratchpadModal
        isOpen={showScratchpad}
        onClose={() => setShowScratchpad(false)}
        title={`Câu ${currentIdx + 1} - ${currentQ?.title || ""}`}
      />

      {/* Modal Soạn Thảo & Chỉnh Sửa Đề Thi Chuyên Đề (ExamEditorModal) */}
      {showExamEditor && (
        <ExamEditorModal
          isOpen={showExamEditor}
          exam={editingExam}
          onClose={() => {
            setShowExamEditor(false);
            setEditingExam(null);
          }}
          onSave={handleSaveExamFromEditor}
          onDelete={(id) => {
            if (onDeleteExam) onDeleteExam(id);
            setShowExamEditor(false);
            setEditingExam(null);
          }}
        />
      )}

      {/* Modal Nhập Đề Chuyên Đề từ Mã Nguồn LaTeX */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Nhập Đề Chuyên Đề Từ Mã Nguồn LaTeX
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động phân tách các câu hỏi trắc nghiệm, đúng/sai, trả lời ngắn, hình TikZ và lời giải.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tên bộ đề thi</label>
                  <input
                    type="text"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="VD: Đề Ôn Chuyên Đề Khảo Sát Hàm Số"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Thời gian làm bài (phút)</label>
                  <input
                    type="number"
                    value={importDuration}
                    onChange={(e) => setImportDuration(Number(e.target.value))}
                    min={5}
                    max={180}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Mã nguồn LaTeX</label>
                  <button
                    type="button"
                    onClick={() => {
                      setImportLatexText(`% Đề ôn tập chuyên đề Toán THPT 2025
\\begin{ex}
Cho hàm số $y = f(x)$ có đạo hàm $f'(x) = x(x-1)^2(x-2)$. Số điểm cực trị của hàm số đã cho là
\\choice
{\\True $2$}
{$3$}
{$1$}
{$0$}
\\loigiai{
Ta có $f'(x) = 0 \\Leftrightarrow \\left[\\begin{aligned} x &= 0 \\\\ x &= 1 \\\\ x &= 2 \\end{aligned}\\right.$.
Vì nghiệm $x = 1$ là nghiệm bội chẵn nên $f'(x)$ không đổi dấu khi qua $x = 1$.
Do đó hàm số có $2$ điểm cực trị ($x = 0$ và $x = 2$).
}
\\end{ex}

\\begin{ex}
Cho tứ diện đều $ABCD$ có cạnh bằng $a$. Thể tích khối tứ diện đã cho bằng
\\choice
{\\True $\\frac{a^3\\sqrt{2}}{12}$}
{$\\frac{a^3\\sqrt{2}}{4}$}
{$\\frac{a^3\\sqrt{3}}{12}$}
{$\\frac{a^3}{6}$}
\\loigiai{
Công thức thể tích khối tứ diện đều cạnh $a$ là $V = \\frac{a^3\\sqrt{2}}{12}$.
}
\\end{ex}`);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Dán mẫu thử nghiệm
                  </button>
                </div>
                <textarea
                  value={importLatexText}
                  onChange={(e) => setImportLatexText(e.target.value)}
                  rows={8}
                  placeholder="Dán mã nguồn LaTeX (hỗ trợ môi trường \begin{ex}, \choice, \loigiai, TikZ...)..."
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImportLatex}
                className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                Phân tích & Lưu Đề Thi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
