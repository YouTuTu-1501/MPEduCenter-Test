import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Exam,
  Question,
  StudentSubmission,
  STANDARD_GRADES,
  STANDARD_CLASSES,
  STANDARD_CHAPTERS_BY_GRADE,
  getAvailableClassesForGrade,
  checkExamAccessStatus,
} from "../types/exam";
import {
  parseLatexExam,
  exportExamToLatex,
  generateStandalonePresentationHtml,
  getStandardTemplateLatex,
} from "../utils/latexParser";
import {
  generateStandardExamCode,
  parseStandardExamCode,
  isExamCodeMatch,
} from "../utils/examCodeHelper";
import { MathRenderer } from "./MathRenderer";
import { TableBuilderModal } from "./TableBuilderModal";
import { ExamScheduleModal } from "./ExamScheduleModal";
import { ExamEditorModal } from "./ExamEditorModal";
import { BankSidebar } from "./bank/BankSidebar";
import { BankTableView } from "./bank/BankTableView";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  Upload,
  Download,
  FileCode,
  Layers,
  BookOpen,
  Edit,
  Trash2,
  FileText,
  Presentation,
  Eye,
  CheckCircle,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart2,
  Users,
  Check,
  FileSpreadsheet,
  HelpCircle,
  Folder,
  FolderOpen,
  Filter,
  Search,
  Grid,
  ListFilter,
  Tag,
  GraduationCap,
  Bookmark,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Table,
  Lock,
  Unlock,
  KeyRound,
  Calendar,
  Share2,
  Copy,
  LayoutList,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";

interface BankManagerViewProps {
  exams: Exam[];
  onSelectExam: (
    exam: Exam,
    mode: "presentation" | "exam" | "analytics" | "live"
  ) => void;
  onSaveExam: (exam: Exam) => void;
  onDeleteExam: (examId: string) => void;
  selectedClassFilter?: string;
  onSelectClassFilter?: (cls: string) => void;
  submissions?: StudentSubmission[];
}

export const BankManagerView: React.FC<BankManagerViewProps> = ({
  exams,
  onSelectExam,
  onSaveExam,
  onDeleteExam,
  selectedClassFilter = "all",
  onSelectClassFilter,
  submissions = [],
}) => {
  const { toast } = useToast();
  const { users } = useAuth();

  const realClasses = useMemo(() => {
    const set = new Set<string>();
    (users || []).forEach((u) => {
      if (u.schoolClass && u.schoolClass.trim()) set.add(u.schoolClass.trim());
    });
    exams.forEach((e) => {
      if (e.targetClass && e.targetClass !== "Tất cả các lớp") {
        set.add(e.targetClass);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [users, exams]);

  // Bộ lọc Khối, Lớp, Chương, Trạng thái & Tìm kiếm
  const [activeGradeFilter, setActiveGradeFilter] = useState<string>("all");
  const [internalClassFilter, setInternalClassFilter] = useState<string>(selectedClassFilter);
  const activeClassFilter = selectedClassFilter !== "all" ? selectedClassFilter : internalClassFilter;

  const handleClassChange = (cls: string) => {
    setInternalClassFilter(cls);
    if (onSelectClassFilter) {
      onSelectClassFilter(cls);
    }
  };

  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "locked" | "scheduled">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title_asc" | "code_asc" | "duration">("newest");
  const [viewGrouping, setViewGrouping] = useState<"table" | "grid" | "by_chapter">("table");

  // Modal Nhập đề mới
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showTableBuilder, setShowTableBuilder] = useState<boolean>(false);
  const [latexInputText, setLatexInputText] = useState<string>("");
  const [importTitle, setImportTitle] = useState<string>("Đề kiểm tra Toán học THPT");
  const [importGrade, setImportGrade] = useState<string>("Lớp 12");
  const [importTargetClass, setImportTargetClass] = useState<string>("Tất cả các lớp");
  const [importChapter, setImportChapter] = useState<string>(
    STANDARD_CHAPTERS_BY_GRADE["Lớp 12"]?.[0] || ""
  );
  const [customChapterInput, setCustomChapterInput] = useState<string>("");
  const [isCustomChapter, setIsCustomChapter] = useState<boolean>(false);
  const [importLessonNumber, setImportLessonNumber] = useState<string>("01");
  const [importAttemptNumber, setImportAttemptNumber] = useState<string>("01");
  const [importDuration, setImportDuration] = useState<number>(90);
  const [importPreview, setImportPreview] = useState<Exam | null>(null);

  // Modal Chỉnh sửa toàn diện đề thi hiện có
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Modal Thiết lập & Hẹn giờ giao đề
  const [scheduleTargetExam, setScheduleTargetExam] = useState<Exam | null>(null);

  // Danh sách các lớp khả dụng theo khối lớp đang chọn cho Import Modal
  const importAvailableClasses = useMemo(() => {
    return getAvailableClassesForGrade(importGrade, users, exams);
  }, [importGrade, users, exams]);

  // Tính mã đề chuẩn dự kiến cho Import Modal
  const computedImportCode = useMemo(() => {
    return generateStandardExamCode({
      grade: importGrade,
      chapter: isCustomChapter ? customChapterInput : importChapter,
      lesson: importLessonNumber || "01",
      attempt: importAttemptNumber || "01",
    });
  }, [importGrade, isCustomChapter, customChapterInput, importChapter, importLessonNumber, importAttemptNumber]);

  // Bật/Tắt khóa đề thi nhanh bằng 1 click
  const handleToggleLock = (exam: Exam) => {
    const updated: Exam = {
      ...exam,
      isLocked: !exam.isLocked,
      updatedAt: new Date().toISOString(),
    };
    onSaveExam(updated);
    if (!exam.isLocked) {
      toast.warning(
        "Đã khóa đề thi",
        `Đề "${exam.title}" (Mã: ${exam.code}) đã bị khóa. Học sinh tạm thời không thể vào thi.`
      );
    } else {
      toast.success(
        "Đã mở đề thi thành công!",
        `Đề "${exam.title}" (Mã: ${exam.code}) đang mở. Học sinh có thể nhập mã để vào làm bài.`
      );
    }
  };

  // Kiểm tra đề thi có phù hợp với bộ lọc Lớp được chọn không
  const isExamMatchClassFilter = (exam: Exam, filter: string) => {
    if (filter === "all") return true;
    if (filter === exam.grade) return true;
    if (exam.targetClass && (exam.targetClass === filter || exam.targetClass === "Tất cả các lớp")) return true;
    
    // Khớp theo tiền tố số lớp (ví dụ: lớp "12A1", "12" khớp với đề "Lớp 12"; "9A2" khớp "Lớp 9")
    const filterNumMatch = filter.match(/\d+/);
    const examGradeNumMatch = exam.grade?.match(/\d+/);
    if (filterNumMatch && examGradeNumMatch && filterNumMatch[0] === examGradeNumMatch[0]) return true;

    return exam.grade === filter;
  };

  // Danh sách các Chương theo Khối hoặc Lớp được chọn
  const availableChaptersForSelectedGrade = useMemo(() => {
    const chaptersSet = new Set<string>();

    let targetGrade = "all";
    if (activeGradeFilter !== "all") {
      targetGrade = activeGradeFilter;
    } else if (activeClassFilter !== "all") {
      const match = activeClassFilter.match(/\d+/);
      if (match) {
        targetGrade = `Lớp ${match[0]}`;
      }
    }

    if (targetGrade !== "all") {
      const standards = STANDARD_CHAPTERS_BY_GRADE[targetGrade] || [];
      standards.forEach((ch) => chaptersSet.add(ch));

      exams
        .filter((e) => e.grade === targetGrade && e.chapter)
        .forEach((e) => {
          if (e.chapter) chaptersSet.add(e.chapter);
        });
    } else {
      exams.forEach((e) => {
        if (e.chapter) chaptersSet.add(e.chapter);
      });
    }

    return Array.from(chaptersSet);
  }, [exams, activeGradeFilter, activeClassFilter]);

  // Thống kê số lượng bài nộp theo ID hoặc Mã đề
  const submissionCountByExamId = useMemo(() => {
    const map: Record<string, number> = {};
    submissions.forEach((s) => {
      if (s.examId) {
        map[s.examId] = (map[s.examId] || 0) + 1;
      }
    });
    return map;
  }, [submissions]);

  // Lọc và sắp xếp danh sách đề thi
  const filteredExams = useMemo(() => {
    const result = exams.filter((exam) => {
      // 1. Lọc theo Khối Lớp
      if (activeGradeFilter !== "all" && exam.grade !== activeGradeFilter) {
        return false;
      }

      // 2. Lọc theo Lớp Phân Công
      if (activeClassFilter !== "all" && !isExamMatchClassFilter(exam, activeClassFilter)) {
        return false;
      }

      // 3. Lọc theo Chương
      if (selectedChapterFilter !== "all") {
        if (!exam.chapter || exam.chapter !== selectedChapterFilter) {
          return false;
        }
      }

      // 4. Lọc theo Trạng Thái (Mở / Khóa / Hẹn Giờ)
      if (statusFilter !== "all") {
        const access = checkExamAccessStatus(exam);
        if (statusFilter === "open" && (exam.isLocked || !access.canEnter)) return false;
        if (statusFilter === "locked" && !exam.isLocked) return false;
        if (statusFilter === "scheduled" && !exam.scheduleEnabled) return false;
      }

      // 5. Lọc theo Từ Khóa Tìm Kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exam.title.toLowerCase().includes(q);
        const matchCode = exam.code.toLowerCase().includes(q) || isExamCodeMatch(q, exam.code);
        const matchChapter = (exam.chapter || "").toLowerCase().includes(q);
        const matchGrade = exam.grade.toLowerCase().includes(q);
        const matchSubject = (exam.subject || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchChapter && !matchGrade && !matchSubject) {
          return false;
        }
      }

      return true;
    });

    // Sắp xếp
    result.sort((a, b) => {
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title, "vi");
      }
      if (sortBy === "code_asc") {
        return a.code.localeCompare(b.code, "vi");
      }
      if (sortBy === "duration") {
        return (b.durationMinutes || 90) - (a.durationMinutes || 90);
      }
      if (sortBy === "oldest") {
        return (a.updatedAt || a.id).localeCompare(b.updatedAt || b.id);
      }
      // "newest" mặc định
      return (b.updatedAt || b.id).localeCompare(a.updatedAt || a.id);
    });

    return result;
  }, [exams, activeGradeFilter, activeClassFilter, selectedChapterFilter, statusFilter, searchQuery, sortBy]);

  // Gom nhóm đề thi theo từng Chương
  const examsGroupedByChapter = useMemo(() => {
    const map = new Map<string, Exam[]>();
    filteredExams.forEach((exam) => {
      const ch = exam.chapter || "Chưa phân loại chuyên đề";
      if (!map.has(ch)) {
        map.set(ch, []);
      }
      map.get(ch)!.push(exam);
    });
    return Array.from(map.entries()).map(([chapterName, chapterExams]) => ({
      chapterName,
      exams: chapterExams,
      totalQuestions: chapterExams.reduce((sum, e) => sum + e.questions.length, 0),
      avgDuration: Math.round(
        chapterExams.reduce((sum, e) => sum + (e.durationMinutes || 90), 0) / chapterExams.length
      ),
    }));
  }, [filteredExams]);

  // Thống kê tổng số câu hỏi theo 4 dạng thức
  const safeExams = Array.isArray(exams) ? exams : [];
  const singleChoiceCount = safeExams.reduce(
    (acc, e) => acc + (e?.questions || []).filter((q) => q.part === "part_1").length,
    0
  );
  const tfCount = safeExams.reduce(
    (acc, e) => acc + (e?.questions || []).filter((q) => q.part === "part_2").length,
    0
  );
  const shortCount = safeExams.reduce(
    (acc, e) => acc + (e?.questions || []).filter((q) => q.part === "part_3").length,
    0
  );
  const essayCount = safeExams.reduce(
    (acc, e) => acc + (e?.questions || []).filter((q) => q.part === "part_4").length,
    0
  );

  // Màu sắc badge theo Lớp
  const getGradeBadgeStyle = (grade: string) => {
    switch (grade) {
      case "Lớp 12":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Lớp 11":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Lớp 10":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Lớp 9":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Lớp 8":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Lớp 7":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Lớp 6":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Xử lý upload file .tex
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setLatexInputText(text);
        const parsed = parseLatexExam(text, file.name.replace(".tex", ""));
        if (parsed.grade) setImportGrade(parsed.grade);
        if (parsed.chapter) {
          setImportChapter(parsed.chapter);
          setIsCustomChapter(true);
          setCustomChapterInput(parsed.chapter);
        }
        if (parsed.durationMinutes) {
          setImportDuration(parsed.durationMinutes);
        }
        setImportPreview(parsed);
        toast.info(
          "Đã phân tích mã nguồn LaTeX",
          `Nhận diện được ${parsed.questions.length} câu hỏi (${parsed.grade || "Lớp 12"} • ${parsed.durationMinutes || 90} phút) từ "${file.name}".`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleParseText = () => {
    if (!latexInputText.trim()) return;
    const parsed = parseLatexExam(latexInputText, importTitle);
    if (parsed.durationMinutes) {
      setImportDuration(parsed.durationMinutes);
    }
    const finalChapter = isCustomChapter ? customChapterInput : importChapter;
    parsed.grade = importGrade;
    if (finalChapter) parsed.chapter = finalChapter;
    parsed.code = computedImportCode;
    parsed.durationMinutes = importDuration || parsed.durationMinutes || 90;
    setImportPreview(parsed);
    toast.info(
      "Phân tích mã nguồn LaTeX",
      `Đã nhận diện ${parsed.questions.length} câu hỏi thuộc ${parsed.grade} - Thời gian: ${parsed.durationMinutes} phút - Mã đề chuẩn: ${parsed.code}.`
    );
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    const finalChapter = isCustomChapter ? customChapterInput : importChapter;
    const finalCode = computedImportCode || importPreview.code;
    const examToSave: Exam = {
      ...importPreview,
      code: finalCode,
      title: importTitle || importPreview.title,
      grade: importGrade,
      targetClass: importTargetClass,
      chapter: finalChapter || importPreview.chapter,
      durationMinutes: Number(importDuration) || 90,
    };
    onSaveExam(examToSave);
    setShowImportModal(false);
    setLatexInputText("");
    setImportPreview(null);
    toast.success(
      "Đã lưu đề thi thành công!",
      `Đề "${examToSave.title}" (${examToSave.durationMinutes} phút) với Mã đề: ${examToSave.code} đã sẵn sàng giao cho học sinh.`
    );
  };

  const handleDownloadLatex = (exam: Exam) => {
    const texCode = exportExamToLatex(exam);
    const blob = new Blob([texCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `De_${exam.code}_${exam.grade.replace(/\s+/g, "")}_${(exam.subject || "Toan").replace(/\s+/g, "_")}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(
      "Xuất mã LaTeX thành công!",
      `Tệp "De_${exam.code}.tex" (${exam.grade}) đã được tải về.`
    );
  };

  const handleDownloadPresentationHtml = (exam: Exam) => {
    const htmlCode = generateStandalonePresentationHtml(exam);
    const blob = new Blob([htmlCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Trinh_chieu_${exam.code}_${exam.grade.replace(/\s+/g, "")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(
      "Xuất HTML trình chiếu thành công!",
      `Tệp Slide "${exam.title}" độc lập đã sẵn sàng.`
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-3 sm:p-5 lg:p-6 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-5 w-full min-w-0">
        {/* ================= COMPACT STATS & QUICK ACTIONS HEADER ================= */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full min-w-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <BookOpen className="w-4 h-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                Ngân Hàng Đề Thi THPT
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200/80 shrink-0">
                {exams.length} đề thi
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium pl-10 line-clamp-1 sm:line-clamp-none">
              Quản lý, phân loại khoa học theo Khối, Lớp, Chương mục và 4 dạng thức chuẩn GDPT 2018.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-start sm:justify-end shrink-0">
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <span title="Trắc nghiệm 4 lựa chọn">P1: {singleChoiceCount}c</span>
              <span className="text-slate-300">•</span>
              <span title="Đúng/Sai">P2: {tfCount}c</span>
              <span className="text-slate-300">•</span>
              <span title="Trả lời ngắn">P3: {shortCount}c</span>
              <span className="text-slate-300">•</span>
              <span title="Tự luận" className="text-amber-700 font-black">
                P4: {essayCount}c
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập Đề TeX</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTableBuilder(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Table className="w-3.5 h-3.5 text-indigo-600" />
              <span>Vẽ Bảng TeX</span>
            </button>
          </div>
        </div>

        {/* ================= MAIN WORKSPACE: SIDEBAR + CONTENT ================= */}
        <div className="flex flex-col lg:flex-row items-start gap-5 w-full min-w-0">
          {/* 1. Sidebar Phân Cấp Khoa Học */}
          <BankSidebar
            exams={exams}
            activeGradeFilter={activeGradeFilter}
            onSelectGradeFilter={setActiveGradeFilter}
            activeClassFilter={activeClassFilter}
            onSelectClassFilter={handleClassChange}
            activeChapterFilter={selectedChapterFilter}
            onSelectChapterFilter={setSelectedChapterFilter}
            activeStatusFilter={statusFilter}
            onSelectStatusFilter={setStatusFilter}
            availableChapters={availableChaptersForSelectedGrade}
            realClasses={realClasses}
            totalExamsCount={exams.length}
          />

          {/* 2. Main Content List / Table Area */}
          <main className="flex-1 min-w-0 w-full space-y-4">
            {/* Toolbar: Search, Sort & View Selector */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Ô tìm kiếm */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm đề thi theo tên, mã đề, chương mục..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sắp xếp & Chế độ xem */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {/* Sắp xếp */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none pr-1"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="title_asc">Tên đề (A-Z)</option>
                    <option value="code_asc">Mã đề (A-Z)</option>
                    <option value="duration">Thời lượng làm bài</option>
                  </select>
                </div>

                {/* View Switcher: Bảng (Table), Lưới (Grid), Theo Chương (Folder) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewGrouping("table")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      viewGrouping === "table"
                        ? "bg-white text-slate-900 shadow-2xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Chế độ Bảng Danh Sách Khoa Học"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Bảng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewGrouping("grid")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      viewGrouping === "grid"
                        ? "bg-white text-slate-900 shadow-2xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Chế độ Lưới Thẻ Bento"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lưới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewGrouping("by_chapter")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      viewGrouping === "by_chapter"
                        ? "bg-white text-slate-900 shadow-2xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Chế độ Gom Theo Chương"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Chương</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hiển thị số kết quả */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <span>
                Hiển thị <b>{filteredExams.length}</b> / {exams.length} đề thi
                {activeGradeFilter !== "all" && ` • ${activeGradeFilter}`}
                {activeClassFilter !== "all" && ` • Lớp ${activeClassFilter}`}
                {selectedChapterFilter !== "all" && ` • ${selectedChapterFilter}`}
              </span>

              {(activeGradeFilter !== "all" ||
                activeClassFilter !== "all" ||
                selectedChapterFilter !== "all" ||
                statusFilter !== "all" ||
                searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveGradeFilter("all");
                    handleClassChange("all");
                    setSelectedChapterFilter("all");
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              )}
            </div>

            {/* Content Display: Empty State OR Selected View */}
            {filteredExams.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                  🔍
                </div>
                <h3 className="font-bold text-base text-slate-800">
                  Không tìm thấy đề thi phù hợp
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Không có đề nào khớp với các tiêu chí bộ lọc đang chọn. Hãy thử xóa bớt bộ lọc hoặc thêm đề thi mới vào ngân hàng.
                </p>
                <div className="pt-2 flex justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGradeFilter("all");
                      handleClassChange("all");
                      setSelectedChapterFilter("all");
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-xs"
                  >
                    + Nhập đề TeX mới
                  </button>
                </div>
              </div>
            ) : viewGrouping === "table" ? (
              /* ================= 1. VIEW BẢNG DANH SÁCH CHI TIẾT (DEFAULT) ================= */
              <BankTableView
                exams={filteredExams}
                onSelectExam={onSelectExam}
                onDeleteExam={onDeleteExam}
                onEditMetadata={(ex) => setEditingExam(ex)}
                onToggleLock={handleToggleLock}
                onOpenSchedule={(ex) => setScheduleTargetExam(ex)}
                handleDownloadLatex={handleDownloadLatex}
                handleDownloadPresentationHtml={handleDownloadPresentationHtml}
                getGradeBadgeStyle={getGradeBadgeStyle}
                submissionCountByExamId={submissionCountByExamId}
              />
            ) : viewGrouping === "by_chapter" ? (
              /* ================= 2. VIEW GOM THEO CHƯƠNG ================= */
              <motion.div
                key={`chapter-groups-${activeGradeFilter}-${activeClassFilter}-${selectedChapterFilter}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {examsGroupedByChapter.map((group, grpIdx) => (
                  <div
                    key={grpIdx}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4"
                  >
                    {/* Header Chương */}
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-slate-900">
                            {group.chapterName}
                          </h3>
                          <p className="text-xs text-slate-400 font-semibold">
                            Gồm <b>{group.exams.length} đề thi</b> • Tổng <b>{group.totalQuestions} câu hỏi</b> • Thời lượng TB <b>{group.avgDuration} phút</b>
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100">
                        {group.exams[0]?.grade || "Toán THPT"}
                      </span>
                    </div>

                    {/* Danh sách đề trong chương */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.exams.map((exam) => (
                        <ExamCardItem
                          key={exam.id}
                          exam={exam}
                          onSelectExam={onSelectExam}
                          onDeleteExam={onDeleteExam}
                          onEditMetadata={(ex) => setEditingExam(ex)}
                          onToggleLock={handleToggleLock}
                          onOpenSchedule={(ex) => setScheduleTargetExam(ex)}
                          handleDownloadLatex={handleDownloadLatex}
                          handleDownloadPresentationHtml={handleDownloadPresentationHtml}
                          getGradeBadgeStyle={getGradeBadgeStyle}
                          canDelete={true}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              /* ================= 3. VIEW LƯỚI THẺ BENTO (GRID) ================= */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredExams.map((exam) => (
                  <ExamCardItem
                    key={exam.id}
                    exam={exam}
                    onSelectExam={onSelectExam}
                    onDeleteExam={onDeleteExam}
                    onEditMetadata={(ex) => setEditingExam(ex)}
                    onToggleLock={handleToggleLock}
                    onOpenSchedule={(ex) => setScheduleTargetExam(ex)}
                    handleDownloadLatex={handleDownloadLatex}
                    handleDownloadPresentationHtml={handleDownloadPresentationHtml}
                    getGradeBadgeStyle={getGradeBadgeStyle}
                    canDelete={true}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ================= MODAL CHỈNH SỬA TOÀN DIỆN ĐỀ THI ================= */}
      {editingExam && (
        <ExamEditorModal
          isOpen={!!editingExam}
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={(updatedExam) => {
            onSaveExam(updatedExam);
            setEditingExam(null);
          }}
          onDelete={(id) => {
            onDeleteExam(id);
            setEditingExam(null);
          }}
        />
      )}

      {/* ================= MODAL NHẬP LATEX CÓ CHỌN LỚP & CHƯƠNG ================= */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 text-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    Nhập Đề Thi Mới Từ LaTeX (.tex)
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Tự động phân loại theo Lớp, Chương và cấu trúc 4 dạng thức chuẩn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Cấu hình Lớp và Chương mục cho đề mới */}
            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 mb-4 space-y-3">
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                <span>Thiết lập Phân loại Lớp & Chương mục:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                {/* Khối Lớp */}
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    1. Khối Lớp:
                  </label>
                  <select
                    value={importGrade}
                    onChange={(e) => {
                      const newGrade = e.target.value;
                      setImportGrade(newGrade);
                      const stds = STANDARD_CHAPTERS_BY_GRADE[newGrade] || [];
                      setImportChapter(stds[0] || "");
                      setIsCustomChapter(false);
                      setImportTargetClass("Tất cả các lớp");
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-white font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    {STANDARD_GRADES.map((gr) => (
                      <option key={gr} value={gr}>
                        {gr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lớp cụ thể */}
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    2. Lớp áp dụng:
                  </label>
                  <select
                    value={importTargetClass}
                    onChange={(e) => setImportTargetClass(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-white font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Tất cả các lớp">🏫 Tất cả các lớp ({importGrade})</option>
                    {importAvailableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Lớp {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chương */}
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Chương mục:
                  </label>
                  {!isCustomChapter ? (
                    <select
                      value={importChapter}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomChapter(true);
                          setCustomChapterInput("");
                        } else {
                          setImportChapter(e.target.value);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-white font-bold text-slate-800 outline-none focus:border-indigo-500 truncate"
                    >
                      {(STANDARD_CHAPTERS_BY_GRADE[importGrade] || []).map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                      <option value="__custom__">✍️ Nhập chương tùy chỉnh...</option>
                    </select>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={customChapterInput}
                        onChange={(e) => setCustomChapterInput(e.target.value)}
                        placeholder="Nhập tên chương..."
                        className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-white font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomChapter(false)}
                        className="px-2 py-1 bg-slate-200 rounded-lg text-slate-600 font-bold"
                        title="Chọn lại danh sách chuẩn"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Thời lượng làm bài */}
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    4. Thời lượng (phút):
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={importDuration}
                    onChange={(e) => setImportDuration(Number(e.target.value) || 90)}
                    className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-white font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Nhập nội dung LaTeX */}
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  Nội dung LaTeX (.tex) của đề thi:
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    <Upload className="w-3 h-3" />
                    <span>Chọn tệp .tex</span>
                    <input
                      type="file"
                      accept=".tex,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                value={latexInputText}
                onChange={(e) => setLatexInputText(e.target.value)}
                placeholder="Dán mã nguồn LaTeX đề thi vào đây... Hỗ trợ \begin{ex}, \begin{choice}, \begin{choiceTF}, \begin{shortans}, \begin{essay}, tikzpicture, pgfplots, tkz-tab..."
                rows={10}
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-mono text-xs text-slate-800 resize-none flex-1 leading-relaxed"
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setLatexInputText(getStandardTemplateLatex())}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  📝 Dán mẫu đề chuẩn GDPT 2018
                </button>

                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={!latexInputText.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Phân tích cú pháp LaTeX</span>
                </button>
              </div>

              {/* Xem trước kết quả phân tích */}
              {importPreview && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 mt-3">
                  <div className="flex justify-between items-center font-bold text-emerald-900 text-xs">
                    <span>
                      ✅ Nhận diện thành công {importPreview.questions.length} câu hỏi:
                    </span>
                    <span className="font-mono text-xs bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Mã đề: {computedImportCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-emerald-800">
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      P.I: {importPreview.questions.filter((q) => q.part === "part_1").length} câu
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      P.II: {importPreview.questions.filter((q) => q.part === "part_2").length} câu
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      P.III: {importPreview.questions.filter((q) => q.part === "part_3").length} câu
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      P.IV: {importPreview.questions.filter((q) => q.part === "part_4").length} câu
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Lưu Đề Thi Vào Ngân Hàng</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL VẼ BẢNG TEX ================= */}
      {showTableBuilder && (
        <TableBuilderModal
          isOpen={showTableBuilder}
          onClose={() => setShowTableBuilder(false)}
          onInsertLatex={(texSnippet) => {
            setLatexInputText((prev) => prev + "\n" + texSnippet);
            setShowTableBuilder(false);
            setShowImportModal(true);
            toast.success("Đã chèn mã bảng TeX", "Mã bảng biến thiên/bảng giá trị đã được đưa vào đề.");
          }}
        />
      )}

      {/* ================= MODAL HẸN GIỜ GIAO ĐỀ ================= */}
      {scheduleTargetExam && (
        <ExamScheduleModal
          isOpen={!!scheduleTargetExam}
          exam={scheduleTargetExam}
          onClose={() => setScheduleTargetExam(null)}
          onSaveExam={(updated) => {
            onSaveExam(updated);
            setScheduleTargetExam(null);
          }}
        />
      )}
    </div>
  );
};

// Sub-component Thẻ đề thi Bento Card
interface ExamCardItemProps {
  exam: Exam;
  onSelectExam: (exam: Exam, mode: "presentation" | "exam" | "analytics" | "live") => void;
  onDeleteExam: (examId: string) => void;
  onEditMetadata: (exam: Exam) => void;
  onToggleLock?: (exam: Exam) => void;
  onOpenSchedule?: (exam: Exam) => void;
  handleDownloadLatex: (exam: Exam) => void;
  handleDownloadPresentationHtml: (exam: Exam) => void;
  getGradeBadgeStyle: (grade: string) => string;
  canDelete: boolean;
}

const ExamCardItem: React.FC<ExamCardItemProps> = ({
  exam,
  onSelectExam,
  onDeleteExam,
  onEditMetadata,
  onToggleLock,
  onOpenSchedule,
  handleDownloadLatex,
  handleDownloadPresentationHtml,
  getGradeBadgeStyle,
  canDelete,
}) => {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const accessStatus = checkExamAccessStatus(exam);

  const handleCopyExamCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(exam.code);
    setCopiedCode(true);
    toast.success("Đã sao chép mã đề thi", `Mã: ${exam.code} (Giao cho học sinh)`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      className={`bg-white rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
        exam.isLocked ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
      }`}
    >
      <div>
        {/* Hàng 1: Badges Lớp, Khối, Trạng thái Mở/Khóa/Hẹn giờ */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${getGradeBadgeStyle(
                exam.grade
              )}`}
            >
              {exam.grade}
            </span>

            {/* Trạng thái Mở / Khóa / Hẹn giờ */}
            <span
              className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] border flex items-center gap-1 ${accessStatus.badgeColor}`}
            >
              {exam.isLocked ? (
                <Lock className="w-3 h-3 text-rose-600" />
              ) : exam.scheduleEnabled ? (
                <Clock className="w-3 h-3 text-amber-600" />
              ) : (
                <Unlock className="w-3 h-3 text-emerald-600" />
              )}
              <span>{accessStatus.badgeLabel}</span>
            </span>

            {exam.targetClass && exam.targetClass !== "Tất cả các lớp" && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-200">
                Lớp: {exam.targetClass}
              </span>
            )}

            {/* Thời gian làm bài */}
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>{exam.durationMinutes || 90} phút</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Nút Chỉnh sửa toàn diện Đề thi */}
            <button
              type="button"
              onClick={() => onEditMetadata(exam)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
              title="Chỉnh sửa toàn diện đề thi (Mã đề, Thời gian, Nội dung, Câu hỏi, LaTeX...)"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mã đề thi & Thao tác giao đề */}
        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/80 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Mã đề:
            </span>
            <button
              type="button"
              onClick={handleCopyExamCode}
              className="font-mono font-black text-xs sm:text-sm text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 hover:bg-indigo-50 flex items-center gap-1 transition shadow-2xs"
              title={`Mã giao đề: ${exam.code} (${parseStandardExamCode(exam.code).explanation}). Bấm để sao chép.`}
            >
              <KeyRound className="w-3 h-3 text-indigo-500" />
              <span>{exam.code}</span>
              {copiedCode ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-slate-400" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Nút Khóa / Mở Nhanh */}
            {onToggleLock && (
              <button
                type="button"
                onClick={() => onToggleLock(exam)}
                className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  exam.isLocked
                    ? "bg-rose-100 hover:bg-rose-200 text-rose-700"
                    : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                }`}
                title={exam.isLocked ? "Đề đang khóa. Bấm để MỞ ĐỀ" : "Đề đang mở. Bấm để KHÓA ĐỀ"}
              >
                {exam.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{exam.isLocked ? "Mở" : "Khóa"}</span>
              </button>
            )}

            {/* Nút Hẹn giờ & Giao đề */}
            {onOpenSchedule && (
              <button
                type="button"
                onClick={() => onOpenSchedule(exam)}
                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1"
                title="Hẹn giờ mở/đóng và chia sẻ giao đề"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px]">Hẹn giờ</span>
              </button>
            )}
          </div>
        </div>

        {/* Tên chương */}
        {exam.chapter && (
          <div
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1.5 truncate"
            title={exam.chapter}
          >
            <Bookmark className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate">{exam.chapter}</span>
          </div>
        )}

        <h3 className="font-bold text-base text-slate-900 leading-snug mb-2 group-hover:text-indigo-600 transition-colors">
          {exam.title}
        </h3>

        <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">
          {exam.description || "Bộ đề kiểm tra chuẩn cấu trúc 4 dạng thức Bộ GD&ĐT."}
        </p>

        {/* Phân bổ 4 phần */}
        <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] font-bold text-slate-600 mb-4">
          <div>P.I: {exam.questions.filter((q) => q.part === "part_1").length} câu</div>
          <div>P.II: {exam.questions.filter((q) => q.part === "part_2").length} câu</div>
          <div>P.III: {exam.questions.filter((q) => q.part === "part_3").length} câu</div>
          <div>P.IV: {exam.questions.filter((q) => q.part === "part_4").length} câu</div>
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectExam(exam, "presentation")}
            className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Trình chiếu</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectExam(exam, "exam")}
            className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Làm bài</span>
          </button>
        </div>

        <div className="flex justify-between items-center pt-2 text-xs">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleDownloadLatex(exam)}
              className="text-indigo-600 hover:underline font-bold flex items-center gap-0.5"
            >
              <Download className="w-3 h-3" /> .tex
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPresentationHtml(exam)}
              className="text-emerald-600 hover:underline font-bold flex items-center gap-0.5"
            >
              <Download className="w-3 h-3" /> Slide offline
            </button>
          </div>

          {canDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Bạn có chắc muốn xóa đề thi "${exam.title}"?`)) {
                  onDeleteExam(exam.id);
                }
              }}
              className="text-slate-400 hover:text-red-600 transition"
              title="Xóa đề thi"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
