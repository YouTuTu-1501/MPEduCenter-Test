import React, { useState, useEffect, useMemo } from "react";
import {
  Exam,
  Question,
  QuestionType,
  PartType,
  DifficultyLevel,
  ChoiceOption,
  TrueFalseItem,
  STANDARD_GRADES,
  STANDARD_CLASSES,
  STANDARD_CHAPTERS_BY_GRADE,
  getAvailableClassesForGrade,
} from "../types/exam";
import {
  generateStandardExamCode,
  parseStandardExamCode,
} from "../utils/examCodeHelper";
import { exportExamToLatex, parseLatexExam } from "../utils/latexParser";
import { MathRenderer } from "./MathRenderer";
import { TableBuilderModal } from "./TableBuilderModal";
import { useToast } from "../context/ToastContext";
import {
  X,
  Save,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Edit3,
  FileCode,
  CheckCircle,
  HelpCircle,
  Clock,
  KeyRound,
  Lock,
  Unlock,
  Eye,
  Sparkles,
  BookOpen,
  Layers,
  CheckSquare,
  ListOrdered,
  FileText,
  Check,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Table,
  Tag,
  Hash,
  Award,
  Calendar,
  Code,
  Wand2,
  Search,
} from "lucide-react";

interface ExamEditorModalProps {
  isOpen: boolean;
  exam: Exam | null;
  onClose: () => void;
  onSave: (updatedExam: Exam) => void;
  onDelete?: (examId: string) => void;
}

export const ExamEditorModal: React.FC<ExamEditorModalProps> = ({
  isOpen,
  exam,
  onClose,
  onSave,
  onDelete,
}) => {
  const { toast } = useToast();

  // Tab điều hướng chính trong modal
  const [activeTab, setActiveTab] = useState<"general" | "questions" | "latex" | "preview">("general");

  // 1. Dữ liệu Thông tin chung (Metadata)
  const [title, setTitle] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [subject, setSubject] = useState<string>("Toán học THPT");
  const [grade, setGrade] = useState<string>("Lớp 12");
  const [targetClass, setTargetClass] = useState<string>("Tất cả các lớp");

  // Danh sách các lớp theo Khối đang chọn
  const editorAvailableClasses = useMemo(() => {
    return getAvailableClassesForGrade(grade);
  }, [grade]);
  const [chapter, setChapter] = useState<string>("");
  const [customChapter, setCustomChapter] = useState<string>("");
  const [isCustomChapter, setIsCustomChapter] = useState<boolean>(false);
  const [lessonNumber, setLessonNumber] = useState<string>("01");
  const [attemptNumber, setAttemptNumber] = useState<string>("01");
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [description, setDescription] = useState<string>("");
  const [author, setAuthor] = useState<string>("Tổ Toán - THPT Chuyên");
  const [totalScore, setTotalScore] = useState<number>(10);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [allowReview, setAllowReview] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduledOpenTime, setScheduledOpenTime] = useState<string>("");
  const [scheduledCloseTime, setScheduledCloseTime] = useState<string>("");

  // 2. Danh sách Câu hỏi (Questions)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [questionFilterPart, setQuestionFilterPart] = useState<"all" | PartType>("all");
  const [searchQuestionText, setSearchQuestionText] = useState<string>("");

  // 3. Tab LaTeX
  const [latexSource, setLatexSource] = useState<string>("");

  // 4. Modal TableBuilder
  const [showTableBuilder, setShowTableBuilder] = useState<boolean>(false);
  const [targetInsertField, setTargetInsertField] = useState<"content" | "explanation">("content");

  // Khởi tạo state khi mở modal hoặc đổi đề thi
  useEffect(() => {
    if (exam && isOpen) {
      setTitle(exam.title || "Đề kiểm tra Toán học THPT");
      setCode(exam.code || "12-01-01-01");
      setSubject(exam.subject || "Toán học THPT");
      setGrade(exam.grade || "Lớp 12");
      setTargetClass(exam.targetClass || "Tất cả các lớp");
      
      const stdChapters = STANDARD_CHAPTERS_BY_GRADE[exam.grade || "Lớp 12"] || [];
      if (exam.chapter && stdChapters.includes(exam.chapter)) {
        setChapter(exam.chapter);
        setCustomChapter("");
        setIsCustomChapter(false);
      } else if (exam.chapter) {
        setChapter("__custom__");
        setCustomChapter(exam.chapter);
        setIsCustomChapter(true);
      } else {
        setChapter(stdChapters[0] || "");
        setCustomChapter("");
        setIsCustomChapter(false);
      }

      const parsedCode = parseStandardExamCode(exam.code);
      if (parsedCode.isValid) {
        setLessonNumber(parsedCode.lessonNumber || "01");
        setAttemptNumber(parsedCode.attemptNumber || "01");
      } else {
        setLessonNumber("01");
        setAttemptNumber("01");
      }

      setDurationMinutes(exam.durationMinutes || 90);
      setDescription(exam.description || "");
      setAuthor(exam.author || "Tổ Toán");
      setTotalScore(exam.totalScore || 10);
      setIsLocked(!!exam.isLocked);
      setAllowReview(exam.allowReview !== false);
      setPassword(exam.password || "");
      setScheduleEnabled(!!exam.scheduleEnabled);
      setScheduledOpenTime(exam.scheduledOpenTime || "");
      setScheduledCloseTime(exam.scheduledCloseTime || "");

      // Sao chép sâu mảng câu hỏi
      const copiedQuestions: Question[] = (exam.questions || []).map((q, idx) => ({
        ...q,
        id: q.id || `q_${Date.now()}_${idx}`,
        title: q.title || `Câu ${idx + 1}`,
        options: q.options ? q.options.map((opt) => ({ ...opt })) : undefined,
        tfItems: q.tfItems ? q.tfItems.map((item) => ({ ...item })) : undefined,
      }));
      setQuestions(copiedQuestions);
      setSelectedQuestionIndex(0);
      setLatexSource(exportExamToLatex(exam));
    }
  }, [exam, isOpen]);

  // Cập nhật mã đề tự động khi thay đổi thông tin phân loại
  const handleRegenerateCode = (
    newGrade = grade,
    newChapter = isCustomChapter ? customChapter : chapter,
    newLesson = lessonNumber,
    newAttempt = attemptNumber
  ) => {
    const generated = generateStandardExamCode({
      grade: newGrade,
      chapter: newChapter,
      lesson: newLesson,
      attempt: newAttempt,
    });
    setCode(generated);
  };

  // Tính tổng điểm từ các câu hỏi
  const calculatedSumScore = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
  }, [questions]);

  // Lọc danh sách câu hỏi theo Phần hoặc Từ khóa tìm kiếm
  const filteredQuestions = useMemo(() => {
    return questions.filter((q, idx) => {
      const matchPart = questionFilterPart === "all" || q.part === questionFilterPart;
      const matchSearch =
        !searchQuestionText.trim() ||
        q.title.toLowerCase().includes(searchQuestionText.toLowerCase()) ||
        q.content.toLowerCase().includes(searchQuestionText.toLowerCase()) ||
        (q.explanation && q.explanation.toLowerCase().includes(searchQuestionText.toLowerCase()));
      return matchPart && matchSearch;
    });
  }, [questions, questionFilterPart, searchQuestionText]);

  // Câu hỏi hiện đang được chọn để chỉnh sửa
  const currentQuestion = questions[selectedQuestionIndex] || questions[0] || null;

  // Cập nhật một trường của câu hỏi hiện tại
  const handleUpdateCurrentQuestion = (fields: Partial<Question>) => {
    if (!currentQuestion) return;
    setQuestions((prev) => {
      const updated = [...prev];
      updated[selectedQuestionIndex] = {
        ...updated[selectedQuestionIndex],
        ...fields,
      };
      return updated;
    });
  };

  // Thêm một câu hỏi mới
  const handleAddQuestion = (type: QuestionType = "single_choice", part: PartType = "part_1") => {
    const newIdx = questions.length + 1;
    let newQ: Question;

    if (type === "single_choice" || part === "part_1") {
      newQ = {
        id: `q_${Date.now()}_${newIdx}`,
        title: `Câu ${newIdx}`,
        part: "part_1",
        partName: "PHẦN I (Trắc nghiệm)",
        type: "single_choice",
        content: "Nội dung câu hỏi trắc nghiệm nhiều phương án lựa chọn...",
        score: 0.25,
        difficulty: "easy",
        options: [
          { label: "A", text: "Phương án A", isCorrect: true },
          { label: "B", text: "Phương án B", isCorrect: false },
          { label: "C", text: "Phương án C", isCorrect: false },
          { label: "D", text: "Phương án D", isCorrect: false },
        ],
        explanation: "\\faCompass\\ \\textbf{Định hướng lời giải:}\\nSử dụng kiến thức cơ bản để giải quyết.\\n\\n\\faEdit\\ \\textbf{Lời giải chi tiết:}\\nTa có kết quả là A.",
      };
    } else if (type === "true_false" || part === "part_2") {
      newQ = {
        id: `q_${Date.now()}_${newIdx}`,
        title: `Câu ${newIdx}`,
        part: "part_2",
        partName: "PHẦN II (Đúng-Sai)",
        type: "true_false",
        content: "Cho hàm số $y = f(x)$. Xét tính đúng sai của các mệnh đề sau:",
        score: 1.0,
        difficulty: "medium",
        tfItems: [
          { label: "a", text: "Mệnh đề a là đúng", isCorrect: true },
          { label: "b", text: "Mệnh đề b là sai", isCorrect: false },
          { label: "c", text: "Mệnh đề c là đúng", isCorrect: true },
          { label: "d", text: "Mệnh đề d là sai", isCorrect: false },
        ],
        explanation: "\\faEdit\\ \\textbf{Lời giải chi tiết:}\\n\\begin{itemchoice}\\n\\item Ý a đúng.\\n\\item Ý b sai.\\n\\item Ý c đúng.\\n\\item Ý d sai.\\n\\end{itemchoice}",
      };
    } else if (type === "short_answer" || part === "part_3") {
      newQ = {
        id: `q_${Date.now()}_${newIdx}`,
        title: `Câu ${newIdx}`,
        part: "part_3",
        partName: "PHẦN III (Trả lời ngắn)",
        type: "short_answer",
        content: "Tìm giá trị của tham số $m$ để hàm số đạt cực trị tại $x = 1$.",
        score: 0.5,
        difficulty: "hard",
        correctAnswer: "4",
        tolerance: 0.01,
        explanation: "\\faEdit\\ \\textbf{Lời giải chi tiết:}\\nTính $y'$, giải phương trình ta được $m = 4$.",
      };
    } else {
      newQ = {
        id: `q_${Date.now()}_${newIdx}`,
        title: `Câu ${newIdx}`,
        part: "part_4",
        partName: "PHẦN IV (Tự luận)",
        type: "essay",
        content: "Giải bài toán thực tế tối ưu hóa sau đây...",
        score: 2.0,
        difficulty: "hard",
        rubric: "- Ý 1: Lập hàm số (0.5 điểm)\n- Ý 2: Tính đạo hàm và tìm nghiệm (0.75 điểm)\n- Ý 3: Kết luận giá trị lớn nhất (0.75 điểm)",
        explanation: "\\faEdit\\ \\textbf{Lời giải chi tiết:}\\nTrình bày các bước giải chi tiết.",
      };
    }

    setQuestions((prev) => [...prev, newQ]);
    setSelectedQuestionIndex(questions.length);
    toast.success("Đã thêm câu hỏi mới", `Đã thêm ${newQ.title} vào danh sách đề thi.`);
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = (idxToDelete: number) => {
    if (questions.length <= 1) {
      toast.warning("Không thể xóa", "Đề thi phải có ít nhất một câu hỏi.");
      return;
    }
    setQuestions((prev) => {
      const updated = prev.filter((_, i) => i !== idxToDelete);
      return updated;
    });
    setSelectedQuestionIndex((prev) => Math.max(0, Math.min(prev, questions.length - 2)));
    toast.info("Đã xóa câu hỏi", "Đã gỡ câu hỏi khỏi đề thi.");
  };

  // Nhân bản câu hỏi (Duplicate)
  const handleDuplicateQuestion = (idxToDup: number) => {
    const target = questions[idxToDup];
    if (!target) return;
    const duplicated: Question = {
      ...target,
      id: `q_${Date.now()}_dup`,
      title: `${target.title} (Bản sao)`,
      options: target.options ? target.options.map((opt) => ({ ...opt })) : undefined,
      tfItems: target.tfItems ? target.tfItems.map((item) => ({ ...item })) : undefined,
    };
    setQuestions((prev) => {
      const updated = [...prev];
      updated.splice(idxToDup + 1, 0, duplicated);
      return updated;
    });
    setSelectedQuestionIndex(idxToDup + 1);
    toast.success("Đã nhân bản câu hỏi", `Đã tạo bản sao cho ${target.title}.`);
  };

  // Di chuyển câu hỏi Lên / Xuống
  const handleMoveQuestion = (fromIdx: number, direction: "up" | "down") => {
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= questions.length) return;
    setQuestions((prev) => {
      const updated = [...prev];
      const temp = updated[fromIdx];
      updated[fromIdx] = updated[toIdx];
      updated[toIdx] = temp;
      return updated;
    });
    setSelectedQuestionIndex(toIdx);
  };

  // Đánh lại số thứ tự tự động (Câu 1, Câu 2, Câu 3...)
  const handleAutoRenumber = () => {
    setQuestions((prev) =>
      prev.map((q, idx) => ({
        ...q,
        title: `Câu ${idx + 1}`,
      }))
    );
    toast.success("Đã đánh lại số thứ tự", `Đã chuẩn hóa thứ tự từ Câu 1 đến Câu ${questions.length}.`);
  };

  // Tự động phân bổ lại điểm số cho các câu hỏi
  const handleBalanceScores = () => {
    const p1 = questions.filter((q) => q.part === "part_1");
    const p2 = questions.filter((q) => q.part === "part_2");
    const p3 = questions.filter((q) => q.part === "part_3");
    const p4 = questions.filter((q) => q.part === "part_4");

    // Quy chuẩn GDPT 2018: Phần I (3 điểm), Phần II (4 điểm), Phần III (3 điểm)
    setQuestions((prev) =>
      prev.map((q) => {
        let newScore = q.score;
        if (q.part === "part_1" && p1.length > 0) {
          newScore = Number((3.0 / p1.length).toFixed(2));
        } else if (q.part === "part_2" && p2.length > 0) {
          newScore = Number((4.0 / p2.length).toFixed(2));
        } else if (q.part === "part_3" && p3.length > 0) {
          newScore = Number((3.0 / p3.length).toFixed(2));
        } else if (q.part === "part_4" && p4.length > 0) {
          newScore = Number((10.0 / p4.length).toFixed(2));
        }
        return { ...q, score: newScore };
      })
    );
    toast.success("Đã chuẩn hóa điểm số", "Đã phân bổ điểm đều theo các phần chuẩn cấu trúc GDPT.");
  };

  // Chèn nhanh công thức toán vào ô đang soạn thảo
  const handleInsertFormulaSnippet = (snippet: string, target: "content" | "explanation" = "content") => {
    if (!currentQuestion) return;
    if (target === "content") {
      handleUpdateCurrentQuestion({
        content: (currentQuestion.content || "") + " " + snippet,
      });
    } else {
      handleUpdateCurrentQuestion({
        explanation: (currentQuestion.explanation || "") + "\n" + snippet,
      });
    }
  };

  // Cập nhật LaTeX từ danh sách câu hỏi hiện tại
  const handleSyncToLatex = () => {
    const currentExamState: Exam = {
      id: exam?.id || `exam_${Date.now()}`,
      title,
      code,
      subject,
      grade,
      targetClass,
      chapter: isCustomChapter ? customChapter : chapter,
      durationMinutes: Number(durationMinutes) || 90,
      description,
      author,
      totalScore: Number(totalScore) || calculatedSumScore || 10,
      questions,
      createdAt: exam?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocked,
      allowReview,
      password,
      scheduleEnabled,
      scheduledOpenTime,
      scheduledCloseTime,
    };
    const tex = exportExamToLatex(currentExamState);
    setLatexSource(tex);
    toast.success("Đã đồng bộ sang LaTeX", "Mã nguồn LaTeX đã được cập nhật từ đề thi hiện tại.");
  };

  // Phân tích mã LaTeX và nạp lại vào danh sách câu hỏi
  const handleApplyLatexToQuestions = () => {
    if (!latexSource.trim()) {
      toast.warning("Lỗi cú pháp", "Mã nguồn LaTeX không được để trống.");
      return;
    }
    try {
      const parsed = parseLatexExam(latexSource, title);
      if (parsed.questions.length === 0) {
        toast.error("Không tìm thấy câu hỏi", "Vui lòng kiểm tra các khối \\begin{ex}...\\end{ex} trong mã LaTeX.");
        return;
      }
      setQuestions(parsed.questions);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.code) setCode(parsed.code);
      if (parsed.durationMinutes) setDurationMinutes(parsed.durationMinutes);
      setSelectedQuestionIndex(0);
      setActiveTab("questions");
      toast.success(
        "Nạp đề từ LaTeX thành công!",
        `Đã trích xuất thành công ${parsed.questions.length} câu hỏi vào đề thi.`
      );
    } catch (err: any) {
      toast.error("Lỗi biên dịch LaTeX", err.message || "Vui lòng kiểm tra lại cú pháp LaTeX.");
    }
  };

  // Lưu toàn bộ đề thi
  const handleSaveAll = () => {
    if (!title.trim()) {
      toast.warning("Thiếu tên đề", "Vui lòng nhập Tiêu đề cho bài kiểm tra.");
      setActiveTab("general");
      return;
    }
    if (!code.trim()) {
      toast.warning("Thiếu mã đề", "Vui lòng nhập Mã đề thi.");
      setActiveTab("general");
      return;
    }
    if (questions.length === 0) {
      toast.warning("Chưa có câu hỏi", "Đề thi phải có ít nhất một câu hỏi.");
      setActiveTab("questions");
      return;
    }

    const finalChapter = isCustomChapter ? customChapter : chapter;
    const updatedExam: Exam = {
      id: exam?.id || `exam_${Date.now()}`,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      subject: subject.trim() || "Toán học THPT",
      grade: grade.trim() || "Lớp 12",
      targetClass: targetClass.trim() || "Tất cả các lớp",
      chapter: finalChapter ? finalChapter.trim() : undefined,
      durationMinutes: Number(durationMinutes) || 90,
      description: description.trim(),
      author: author.trim() || "Tổ Toán",
      totalScore: Number(totalScore) || calculatedSumScore || 10,
      questions,
      createdAt: exam?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocked,
      allowReview,
      password: password.trim() || undefined,
      scheduleEnabled,
      scheduledOpenTime: scheduleEnabled ? scheduledOpenTime : undefined,
      scheduledCloseTime: scheduleEnabled ? scheduledCloseTime : undefined,
    };

    onSave(updatedExam);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="exam-editor-modal-backdrop"
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
    >
      <div
        id="exam-editor-modal-container"
        className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] max-h-[900px] shadow-2xl border border-slate-200 text-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900 line-clamp-1">
                  Chỉnh sửa Đề thi: {title || "Chưa đặt tên"}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black text-xs">
                  {code || "MÃ ĐỀ"}
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold">
                  {grade} • {durationMinutes} phút
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Toàn quyền tùy chỉnh Mã đề, Thời gian, Thông tin phân loại và Nội dung từng câu hỏi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-200 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "general"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>1. Thông tin & Mã đề</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "questions"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>2. Nội dung câu hỏi ({questions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleSyncToLatex();
                setActiveTab("latex");
              }}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "latex"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Code className="w-4 h-4" />
              <span>3. Mã nguồn LaTeX</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "preview"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>4. Xem trước toàn bộ</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>Tổng điểm: <strong className="text-indigo-600 font-bold">{calculatedSumScore}</strong>/{totalScore}</span>
            <span>•</span>
            <span>Số lượng: <strong className="text-slate-800 font-bold">{questions.length}</strong> câu</span>
          </div>
        </div>

        {/* ================= BODY CONTENT ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* TAB 1: THÔNG TIN CHUNG & MÃ ĐỀ */}
          {activeTab === "general" && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
              {/* Card 1: Định danh đề thi */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Thông tin Định danh & Môn học</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên / Tiêu đề bài kiểm tra <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ví dụ: Đề kiểm tra 1 tiết Đại số & Giải tích Chương 1"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Môn học:</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Toán học THPT"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Giáo viên / Đơn vị biên soạn:</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Tổ Toán - THPT"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả / Lời dặn dò học sinh:</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ghi chú thêm về đề thi, kiến thức trọng tâm hoặc hướng dẫn làm bài..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Phân loại Khối Lớp, Lớp áp dụng & Chương */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Phân loại Khối, Lớp & Chương kiến thức</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Khối lớp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Khối Lớp:</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                      {STANDARD_GRADES.map((gr) => (
                        <button
                          key={gr}
                          type="button"
                          onClick={() => {
                            setGrade(gr);
                            const stds = STANDARD_CHAPTERS_BY_GRADE[gr] || [];
                            const newCh = stds[0] || "";
                            setChapter(newCh);
                            setIsCustomChapter(false);
                            handleRegenerateCode(gr, newCh, lessonNumber, attemptNumber);
                          }}
                          className={`py-2 px-2.5 rounded-xl font-bold text-xs border text-center transition ${
                            grade === gr
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {gr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lớp áp dụng */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Áp dụng cho Lớp:</label>
                    <select
                      value={targetClass}
                      onChange={(e) => setTargetClass(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 font-bold bg-white text-xs text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="Tất cả các lớp">🏫 Tất cả các lớp ({grade})</option>
                      {editorAvailableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          Lớp {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chương / Chủ đề */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chương / Chủ đề:</label>
                    <select
                      value={isCustomChapter ? "__custom__" : chapter}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomChapter(true);
                        } else {
                          setIsCustomChapter(false);
                          setChapter(e.target.value);
                          handleRegenerateCode(grade, e.target.value, lessonNumber, attemptNumber);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 font-medium bg-white text-xs text-slate-800 outline-none focus:border-indigo-500"
                    >
                      {(STANDARD_CHAPTERS_BY_GRADE[grade] || []).map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                      <option value="__custom__">✍️ Nhập tên Chương tùy chỉnh...</option>
                    </select>

                    {isCustomChapter && (
                      <input
                        type="text"
                        value={customChapter}
                        onChange={(e) => {
                          setCustomChapter(e.target.value);
                          handleRegenerateCode(grade, e.target.value, lessonNumber, attemptNumber);
                        }}
                        placeholder="Nhập tên chương hoặc chủ đề mới..."
                        className="w-full mt-2 py-2 px-3 rounded-xl border border-slate-300 font-medium outline-none focus:border-indigo-500 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Cấu hình Mã đề thi & Thời lượng làm bài */}
              <div className="bg-amber-50/70 p-5 sm:p-6 rounded-3xl border border-amber-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <h3 className="font-bold text-sm text-amber-900">
                      Mã đề thi & Thời gian thực hiện
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-md">
                    Chuẩn GDPT [Lớp]-[Chương]-[Bài]-[Lần]
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số thứ tự Bài học:
                    </label>
                    <input
                      type="text"
                      value={lessonNumber}
                      onChange={(e) => {
                        setLessonNumber(e.target.value);
                        handleRegenerateCode(
                          grade,
                          isCustomChapter ? customChapter : chapter,
                          e.target.value,
                          attemptNumber
                        );
                      }}
                      placeholder="14, 01..."
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lần kiểm tra:</label>
                    <select
                      value={attemptNumber}
                      onChange={(e) => {
                        setAttemptNumber(e.target.value);
                        handleRegenerateCode(
                          grade,
                          isCustomChapter ? customChapter : chapter,
                          lessonNumber,
                          e.target.value
                        );
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs outline-none focus:border-amber-500"
                    >
                      <option value="01">Lần 1 (01)</option>
                      <option value="02">Lần 2 (02)</option>
                      <option value="03">Lần 3 (03)</option>
                      <option value="04">Lần 4 (04)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thời lượng làm bài (phút):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 py-2 px-3 rounded-xl border border-slate-300 bg-white font-bold text-xs outline-none focus:border-indigo-500"
                      />
                      <div className="flex gap-1 flex-1">
                        {[15, 45, 90, 120].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDurationMinutes(m)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                              durationMinutes === m
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {m}'
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Mã đề chính thức (Dùng để giao học sinh tra cứu & làm bài):
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full py-2.5 px-3.5 rounded-xl border-2 border-amber-400 bg-white font-mono font-black text-amber-900 tracking-wider text-base outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-xs text-amber-800 font-medium mt-1">
                      💡 {parseStandardExamCode(code).explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Cài đặt An toàn & Phòng thi */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Bảo mật & Điều kiện Truy cập</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900">Khóa đề thi</div>
                      <div className="text-slate-500 text-[11px]">Tạm dừng truy cập, không cho học sinh vào thi</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLocked(!isLocked)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        isLocked
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{isLocked ? "Đang khóa" : "Đang mở"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900">Xem lại đáp án & Lời giải</div>
                      <div className="text-slate-500 text-[11px]">Cho phép học sinh xem đáp án chi tiết sau khi nộp</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowReview(!allowReview)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition ${
                        allowReview
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {allowReview ? "Cho phép" : "Ẩn đáp án"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mật khẩu truy cập đề (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Để trống nếu không yêu cầu mật khẩu"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thang điểm tổng của đề:
                    </label>
                    <input
                      type="number"
                      value={totalScore}
                      onChange={(e) => setTotalScore(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NỘI DUNG & DANH SÁCH CÂU HỎI */}
          {activeTab === "questions" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start animate-in fade-in duration-150">
              {/* CỘT TRÁI: DANH SÁCH CÂU HỎI (4 Cols) */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col max-h-[76vh] space-y-3">
                {/* Header danh sách câu hỏi */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-xs text-slate-900">
                      Danh sách ({questions.length} câu)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleAutoRenumber}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-[11px] font-bold transition"
                      title="Đánh lại số thứ tự tự động (Câu 1, 2, 3...)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleBalanceScores}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg text-[11px] font-bold transition"
                      title="Chuẩn hóa điểm số theo thang GDPT"
                    >
                      <Award className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tìm kiếm & Lọc theo Phần */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuestionText}
                      onChange={(e) => setSearchQuestionText(e.target.value)}
                      placeholder="Tìm câu hỏi..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
                    {[
                      { id: "all", label: "Tất cả" },
                      { id: "part_1", label: "Phần I" },
                      { id: "part_2", label: "Phần II" },
                      { id: "part_3", label: "Phần III" },
                      { id: "part_4", label: "Tự luận" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setQuestionFilterPart(p.id as any)}
                        className={`py-1 px-1 rounded-lg text-center transition truncate ${
                          questionFilterPart === p.id
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danh sách các câu hỏi */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredQuestions.map((q, idx) => {
                    const realIndex = questions.findIndex((orig) => orig.id === q.id);
                    const isSelected = realIndex === selectedQuestionIndex;

                    let partBadge = "P.I (TN)";
                    let partColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                    if (q.part === "part_2") {
                      partBadge = "P.II (Đ/S)";
                      partColor = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (q.part === "part_3") {
                      partBadge = "P.III (TLN)";
                      partColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    } else if (q.part === "part_4") {
                      partBadge = "P.IV (TL)";
                      partColor = "bg-purple-50 text-purple-700 border-purple-200";
                    }

                    return (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuestionIndex(realIndex)}
                        className={`p-3 rounded-2xl border transition cursor-pointer text-xs space-y-1.5 ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900">{q.title}</span>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${partColor}`}>
                              {partBadge}
                            </span>
                            <span className="font-bold text-slate-500 text-[10px]">{q.score}đ</span>
                          </div>
                        </div>

                        <p className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">
                          {q.content.replace(/\$|\\begin\{[^}]+\}|\\end\{[^}]+\}/g, " ").trim() || "Chưa có nội dung"}
                        </p>

                        {/* Nút hành động nhanh */}
                        {isSelected && (
                          <div
                            className="pt-2 border-t border-indigo-100 flex items-center justify-between text-slate-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={realIndex === 0}
                                onClick={() => handleMoveQuestion(realIndex, "up")}
                                className="p-1 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-white transition"
                                title="Di chuyển lên trên"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={realIndex === questions.length - 1}
                                onClick={() => handleMoveQuestion(realIndex, "down")}
                                className="p-1 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-white transition"
                                title="Di chuyển xuống dưới"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(realIndex)}
                                className="p-1 hover:text-indigo-600 rounded hover:bg-white transition"
                                title="Nhân bản câu hỏi này"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(realIndex)}
                              className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Nút Thêm câu hỏi nhanh */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("single_choice", "part_1")}
                    className="py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Trắc nghiệm (P.I)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("true_false", "part_2")}
                    className="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Đúng/Sai (P.II)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("short_answer", "part_3")}
                    className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Trả lời ngắn (P.III)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion("essay", "part_4")}
                    className="py-2 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Tự luận (P.IV)</span>
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: TRÌNH BIÊN TẬP CHI TIẾT CÂU HỎI (8 Cols) */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5 max-h-[76vh] overflow-y-auto">
                {currentQuestion ? (
                  <>
                    {/* Hàng điều khiển tiêu đề, dạng câu, phần và điểm */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pb-4 border-b border-slate-100">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Tiêu đề câu:</label>
                        <input
                          type="text"
                          value={currentQuestion.title}
                          onChange={(e) => handleUpdateCurrentQuestion({ title: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-extrabold text-xs outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Phân loại Phần:</label>
                        <select
                          value={currentQuestion.part}
                          onChange={(e) => {
                            const newPart = e.target.value as PartType;
                            let newType: QuestionType = "single_choice";
                            let newPartName = "PHẦN I (Trắc nghiệm)";
                            if (newPart === "part_2") {
                              newType = "true_false";
                              newPartName = "PHẦN II (Đúng-Sai)";
                            } else if (newPart === "part_3") {
                              newType = "short_answer";
                              newPartName = "PHẦN III (Trả lời ngắn)";
                            } else if (newPart === "part_4") {
                              newType = "essay";
                              newPartName = "PHẦN IV (Tự luận)";
                            }
                            handleUpdateCurrentQuestion({
                              part: newPart,
                              partName: newPartName,
                              type: newType,
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="part_1">PHẦN I (Trắc nghiệm 4 lựa chọn)</option>
                          <option value="part_2">PHẦN II (Đúng - Sai 4 ý)</option>
                          <option value="part_3">PHẦN III (Trả lời ngắn)</option>
                          <option value="part_4">PHẦN IV (Tự luận)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Điểm số:</label>
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          value={currentQuestion.score}
                          onChange={(e) =>
                            handleUpdateCurrentQuestion({ score: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-xs outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Độ khó:</label>
                        <select
                          value={currentQuestion.difficulty || "medium"}
                          onChange={(e) =>
                            handleUpdateCurrentQuestion({
                              difficulty: e.target.value as DifficultyLevel,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-medium text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="easy">🟢 Nhận biết (Dễ)</option>
                          <option value="medium">🔵 Thông hiểu (Vừa)</option>
                          <option value="hard">🟡 Vận dụng (Khó)</option>
                          <option value="expert">🔴 Vận dụng cao (Cực khó)</option>
                        </select>
                      </div>
                    </div>

                    {/* Thanh công cụ chèn nhanh công thức toán học & bảng biểu */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chèn nhanh ký hiệu & công thức Toán học:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetInsertField("content");
                            setShowTableBuilder(true);
                          }}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-2xs"
                        >
                          <Table className="w-3 h-3" />
                          <span>Tạo Bảng biến thiên / Xét dấu</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: "$x^2$", code: "$x^2$" },
                          { label: "$\\frac{a}{b}$", code: "$\\frac{a}{b}$" },
                          { label: "$\\sqrt{x}$", code: "$\\sqrt{x}$" },
                          { label: "$\\vec{v}$", code: "$\\vec{v}$" },
                          { label: "$\\overrightarrow{AB}$", code: "$\\overrightarrow{AB}$" },
                          { label: "$\\int_a^b$", code: "$\\int_{a}^{b} f(x) dx$" },
                          { label: "$\\alpha$", code: "$\\alpha$" },
                          { label: "$\\pm$", code: "$\\pm$" },
                          { label: "$\\in$", code: "$\\in$" },
                          { label: "$\\le$", code: "$\\le$" },
                          { label: "$\\ge$", code: "$\\ge$" },
                          { label: "$\\ne$", code: "$\\ne$" },
                          { label: "$\\Delta$", code: "$\\Delta$" },
                          { label: "$\\lim$", code: "$\\lim_{x \\to x_0}$" },
                          { label: "TikZ 3D Box", code: "\\begin{tikzpicture}[scale=0.8]\n\\coordinate (A) at (0,0);\n\\coordinate (B) at (3,0);\n\\coordinate (C) at (4,1);\n\\coordinate (D) at (1,1);\n\\draw (A)--(B)--(C) (A)--(D)--(C);\n\\end{tikzpicture}" },
                        ].map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            type="button"
                            onClick={() => handleInsertFormulaSnippet(btn.code, "content")}
                            className="px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-md text-[11px] font-mono font-bold transition shadow-2xs"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nội dung câu hỏi */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Nội dung câu hỏi (Hỗ trợ văn bản thuần, LaTeX Math và TikZ):
                      </label>
                      <textarea
                        rows={4}
                        value={currentQuestion.content}
                        onChange={(e) => handleUpdateCurrentQuestion({ content: e.target.value })}
                        placeholder="Nhập nội dung câu hỏi, ví dụ: Cho hàm số $y = f(x)$ có bảng biến thiên..."
                        className="w-full p-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed"
                      />
                    </div>

                    {/* Xem trước trực tiếp phần nội dung câu hỏi */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Xem trước hiển thị (Live Preview)
                      </span>
                      <div className="text-xs text-slate-900 font-medium leading-relaxed">
                        <MathRenderer content={currentQuestion.content} />
                      </div>
                    </div>

                    {/* ================= TÙY BIẾN THEO TỪNG DẠNG CÂU HỎI ================= */}

                    {/* 1. DẠNG TRẮC NGHIỆM 4 LỰA CHỌN (Phần I) */}
                    {currentQuestion.part === "part_1" && (
                      <div className="space-y-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900">
                            Các phương án lựa chọn (Click nút tròn để chọn Đáp án đúng):
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const opts = currentQuestion.options || [];
                              const nextChar = String.fromCharCode(65 + opts.length);
                              handleUpdateCurrentQuestion({
                                options: [...opts, { label: nextChar, text: `Phương án ${nextChar}`, isCorrect: false }],
                              });
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm phương án</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(currentQuestion.options || []).map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border flex items-center gap-3 transition ${
                                opt.isCorrect
                                  ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (currentQuestion.options || []).map((o, i) => ({
                                    ...o,
                                    isCorrect: i === optIdx,
                                  }));
                                  handleUpdateCurrentQuestion({
                                    options: updated,
                                    correctAnswer: opt.label,
                                  });
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 transition ${
                                  opt.isCorrect
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                                title={opt.isCorrect ? "Đáp án Đúng" : "Bấm để chọn làm Đáp án Đúng"}
                              >
                                {opt.label}
                              </button>

                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const updated = [...(currentQuestion.options || [])];
                                  updated[optIdx] = { ...updated[optIdx], text: e.target.value };
                                  handleUpdateCurrentQuestion({ options: updated });
                                }}
                                placeholder={`Nội dung phương án ${opt.label}...`}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs outline-none focus:border-indigo-500 bg-white"
                              />

                              <div className="w-24 text-[11px] text-slate-700 font-medium truncate">
                                <MathRenderer content={opt.text} />
                              </div>

                              {currentQuestion.options && currentQuestion.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (currentQuestion.options || []).filter((_, i) => i !== optIdx);
                                    handleUpdateCurrentQuestion({ options: updated });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                  title="Xóa phương án này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. DẠNG ĐÚNG - SAI (Phần II) */}
                    {currentQuestion.part === "part_2" && (
                      <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">
                            Các mệnh đề xét Đúng / Sai:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const items = currentQuestion.tfItems || [];
                              const nextChar = String.fromCharCode(97 + items.length);
                              handleUpdateCurrentQuestion({
                                tfItems: [...items, { label: nextChar, text: `Mệnh đề ${nextChar}`, isCorrect: true }],
                              });
                            }}
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm mệnh đề</span>
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {(currentQuestion.tfItems || []).map((item, itIdx) => (
                            <div key={itIdx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                                  {item.label})
                                </span>

                                <input
                                  type="text"
                                  value={item.text}
                                  onChange={(e) => {
                                    const updated = [...(currentQuestion.tfItems || [])];
                                    updated[itIdx] = { ...updated[itIdx], text: e.target.value };
                                    handleUpdateCurrentQuestion({ tfItems: updated });
                                  }}
                                  placeholder={`Nội dung mệnh đề ${item.label}...`}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs outline-none focus:border-amber-500"
                                />

                                <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0 text-xs font-bold">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(currentQuestion.tfItems || [])];
                                      updated[itIdx] = { ...updated[itIdx], isCorrect: true };
                                      handleUpdateCurrentQuestion({ tfItems: updated });
                                    }}
                                    className={`px-3 py-1 transition ${
                                      item.isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    ĐÚNG
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(currentQuestion.tfItems || [])];
                                      updated[itIdx] = { ...updated[itIdx], isCorrect: false };
                                      handleUpdateCurrentQuestion({ tfItems: updated });
                                    }}
                                    className={`px-3 py-1 transition ${
                                      !item.isCorrect
                                        ? "bg-rose-600 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    SAI
                                  </button>
                                </div>

                                {currentQuestion.tfItems && currentQuestion.tfItems.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (currentQuestion.tfItems || []).filter((_, i) => i !== itIdx);
                                      handleUpdateCurrentQuestion({ tfItems: updated });
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. DẠNG TRẢ LỜI NGẮN (Phần III) */}
                    {currentQuestion.part === "part_3" && (
                      <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                        <span className="text-xs font-bold text-emerald-900 block">
                          Thiết lập Đáp án Đúng & Sai số cho phép:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Đáp án Đúng chính xác (Số hoặc chuỗi):
                            </label>
                            <input
                              type="text"
                              value={currentQuestion.correctAnswer || ""}
                              onChange={(e) =>
                                handleUpdateCurrentQuestion({ correctAnswer: e.target.value })
                              }
                              placeholder="Ví dụ: 4, -2.5, 1/2..."
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-emerald-800 text-sm outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Độ lệch / Sai số cho phép (tolerance):
                            </label>
                            <input
                              type="number"
                              step={0.001}
                              value={currentQuestion.tolerance || 0}
                              onChange={(e) =>
                                handleUpdateCurrentQuestion({
                                  tolerance: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.01"
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. DẠNG TỰ LUẬN (Phần IV) */}
                    {currentQuestion.part === "part_4" && (
                      <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
                        <span className="text-xs font-bold text-purple-900 block">
                          Barem thang điểm chấm Tự luận:
                        </span>

                        <textarea
                          rows={3}
                          value={currentQuestion.rubric || ""}
                          onChange={(e) => handleUpdateCurrentQuestion({ rubric: e.target.value })}
                          placeholder="- Ý 1: Tính đạo hàm (0.5đ)&#10;- Ý 2: Lập bảng biến thiên (0.5đ)..."
                          className="w-full p-3 rounded-xl border border-slate-300 bg-white font-mono text-xs outline-none focus:border-purple-500 leading-relaxed"
                        />
                      </div>
                    )}

                    {/* LỜI GIẢI CHI TIẾT & HƯỚNG DẪN */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800">
                          Lời giải chi tiết & Định hướng phương pháp giải:
                        </label>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              handleInsertFormulaSnippet(
                                "\\faCompass\\ \\textbf{Định hướng lời giải:}\\\n",
                                "explanation"
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            + Định hướng
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleInsertFormulaSnippet(
                                "\\faEdit\\ \\textbf{Lời giải chi tiết:}\\\n",
                                "explanation"
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            + Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleInsertFormulaSnippet(
                                "\\faExclamationTriangle\\ \\textbf{Lưu ý:}\\\n",
                                "explanation"
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            + Lưu ý
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={5}
                        value={currentQuestion.explanation}
                        onChange={(e) => handleUpdateCurrentQuestion({ explanation: e.target.value })}
                        placeholder="Nhập lời giải chi tiết cho câu hỏi..."
                        className="w-full p-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed"
                      />

                      {/* Live Preview Lời giải */}
                      {currentQuestion.explanation && (
                        <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                            Xem trước Lời giải
                          </span>
                          <div className="text-xs text-slate-900 font-medium leading-relaxed">
                            <MathRenderer content={currentQuestion.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-slate-400 space-y-3">
                    <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-bold">Chưa chọn câu hỏi nào</p>
                    <p className="text-xs">Hãy chọn một câu hỏi bên danh sách trái để chỉnh sửa.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MÃ NGUỒN LATEX TOÀN ĐỀ */}
          {activeTab === "latex" && (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <span>Trình biên tập Mã nguồn LaTeX 2 chiều</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bạn có thể sửa trực tiếp toàn bộ code LaTeX của đề thi hoặc chép từ Overleaf / tệp .tex vào đây.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncToLatex}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Làm mới từ Đề thi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyLatexToQuestions}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Biên dịch & Áp dụng vào Đề</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-xs">
                <textarea
                  rows={22}
                  value={latexSource}
                  onChange={(e) => setLatexSource(e.target.value)}
                  placeholder="Dán toàn bộ mã LaTeX chuẩn của đề thi vào đây..."
                  className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs outline-none leading-relaxed resize-y selection:bg-indigo-600"
                  spellCheck={false}
                />
              </div>

              <div className="p-4 bg-slate-100 rounded-2xl text-xs text-slate-600 space-y-1 font-medium">
                <div className="font-bold text-slate-800">💡 Hướng dẫn cấu trúc LaTeX hỗ trợ:</div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Phần I: \begin&#123;ex&#125; ... \choice &#123;\True A&#125; &#123;B&#125; &#123;C&#125; &#123;D&#125; \loigiai&#123;...&#125; \end&#123;ex&#125;</li>
                  <li>Phần II: \begin&#123;ex&#125; ... \choiceTF[1] &#123;\True Ý a&#125; &#123;Ý b&#125; \loigiai&#123;...&#125; \end&#123;ex&#125;</li>
                  <li>Phần III: \begin&#123;ex&#125; ... \shortans&#123;4&#125; \loigiai&#123;...&#125; \end&#123;ex&#125;</li>
                  <li>Đoạn vẽ hình: \begin&#123;tikzpicture&#125; ... \end&#123;tikzpicture&#125;</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: XEM TRƯỚC TOÀN BỘ ĐỀ THI */}
          {activeTab === "preview" && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-100">
                  {grade} • Mã đề: {code} • {durationMinutes} phút
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{title}</h1>
                <p className="text-xs text-slate-500 max-w-xl mx-auto">
                  {description || "Đề kiểm tra chuẩn kiến thức và kỹ năng Chương trình GDPT 2018."}
                </p>
                <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>Môn: <strong>{subject}</strong></span>
                  <span>Tổng số: <strong>{questions.length}</strong> câu hỏi</span>
                  <span>Thang điểm: <strong>{calculatedSumScore}/{totalScore}</strong> điểm</span>
                </div>
              </div>

              {/* Danh sách các câu hỏi hiển thị liên tục */}
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-indigo-700">{q.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {q.partName}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-slate-500">{q.score} điểm</span>
                    </div>

                    <div className="text-xs text-slate-900 font-medium leading-relaxed">
                      <MathRenderer content={q.content} />
                    </div>

                    {/* Phương án trắc nghiệm */}
                    {q.part === "part_1" && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              opt.isCorrect
                                ? "bg-emerald-50/70 border-emerald-300 font-bold text-emerald-900"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                              opt.isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                            }`}>
                              {opt.label}
                            </span>
                            <MathRenderer content={opt.text} />
                            {opt.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mệnh đề Đúng/Sai */}
                    {q.part === "part_2" && q.tfItems && (
                      <div className="space-y-1.5 pt-2">
                        {q.tfItems.map((item, iIdx) => (
                          <div
                            key={iIdx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">{item.label})</span>
                              <MathRenderer content={item.text} />
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              item.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}>
                              {item.isCorrect ? "ĐÚNG" : "SAI"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Trả lời ngắn */}
                    {q.part === "part_3" && (
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                        <span className="font-bold text-emerald-900">Đáp án chuẩn:</span>
                        <span className="font-mono font-black text-emerald-800 text-sm bg-white px-3 py-1 rounded-lg border border-emerald-300">
                          {q.correctAnswer || "Chưa nhập"}
                        </span>
                      </div>
                    )}

                    {/* Lời giải chi tiết */}
                    {q.explanation && (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Lời giải chi tiết:
                        </span>
                        <div className="text-xs text-slate-700 leading-relaxed">
                          <MathRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onDelete && exam?.id && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Bạn có chắc chắn muốn xóa đề "${title}" khỏi hệ thống?`)) {
                    onDelete(exam.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Xóa đề thi</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-200 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi Đề thi</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL TABLE BUILDER */}
      <TableBuilderModal
        isOpen={showTableBuilder}
        onClose={() => setShowTableBuilder(false)}
        onInsertLatex={(latexCode) => {
          handleInsertFormulaSnippet(latexCode, targetInsertField);
          setShowTableBuilder(false);
          toast.success("Đã chèn bảng", "Mã bảng LaTeX đã được chèn vào nội dung soạn thảo.");
        }}
      />
    </div>
  );
};
