import React, { useState, useMemo } from "react";
import {
  Exam,
  Question,
  STANDARD_GRADES,
  STANDARD_CLASSES,
  STANDARD_CHAPTERS_BY_GRADE,
} from "../types/exam";
import {
  parseLatexExam,
  exportExamToLatex,
  generateStandalonePresentationHtml,
  getStandardTemplateLatex,
} from "../utils/latexParser";
import { MathRenderer } from "./MathRenderer";
import { TableBuilderModal } from "./TableBuilderModal";
import { useToast } from "../context/ToastContext";
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
}

export const BankManagerView: React.FC<BankManagerViewProps> = ({
  exams,
  onSelectExam,
  onSaveExam,
  onDeleteExam,
  selectedClassFilter = "all",
  onSelectClassFilter,
}) => {
  const { toast } = useToast();

  // Bộ lọc Lớp & Chương & Tìm kiếm
  const [internalClassFilter, setInternalClassFilter] = useState<string>(selectedClassFilter);
  const activeClassFilter = selectedClassFilter !== "all" ? selectedClassFilter : internalClassFilter;

  const handleClassChange = (cls: string) => {
    setInternalClassFilter(cls);
    if (onSelectClassFilter) {
      onSelectClassFilter(cls);
    }
  };

  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewGrouping, setViewGrouping] = useState<"grid" | "by_chapter">("grid");

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
  const [importPreview, setImportPreview] = useState<Exam | null>(null);

  // Modal Chỉnh sửa nhanh Lớp & Chương cho đề thi hiện có
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editGrade, setEditGrade] = useState<string>("Lớp 12");
  const [editTargetClass, setEditTargetClass] = useState<string>("Tất cả các lớp");
  const [editChapter, setEditChapter] = useState<string>("");
  const [editCustomChapter, setEditCustomChapter] = useState<string>("");
  const [isEditCustomChapter, setIsEditCustomChapter] = useState<boolean>(false);

  // Danh sách các Lớp có trong ngân hàng + Danh sách chuẩn
  const allAvailableGrades = useMemo(() => {
    const gradesSet = new Set<string>(STANDARD_GRADES);
    exams.forEach((e) => {
      if (e.grade) gradesSet.add(e.grade);
    });
    return Array.from(gradesSet);
  }, [exams]);

  // Kiểm tra đề thi có phù hợp với bộ lọc Lớp được chọn không
  const isExamMatchClassFilter = (exam: Exam, filter: string) => {
    if (filter === "all") return true;
    if (filter === exam.grade) return true;
    if (exam.targetClass && (exam.targetClass === filter || exam.targetClass === "Tất cả các lớp")) return true;
    // Nếu filter là "12A1", "12A2", "12A3", "12D1" và đề là "Lớp 12"
    if (filter.startsWith("12") && exam.grade === "Lớp 12") return true;
    if (filter.startsWith("11") && exam.grade === "Lớp 11") return true;
    if (filter.startsWith("10") && exam.grade === "Lớp 10") return true;
    return exam.grade === filter;
  };

  // Danh sách các Chương theo Lớp được chọn
  const availableChaptersForSelectedGrade = useMemo(() => {
    const chaptersSet = new Set<string>();

    if (activeClassFilter !== "all") {
      const gradeKey = activeClassFilter.startsWith("12")
        ? "Lớp 12"
        : activeClassFilter.startsWith("11")
        ? "Lớp 11"
        : activeClassFilter.startsWith("10")
        ? "Lớp 10"
        : activeClassFilter;

      // Thêm chương chuẩn của lớp đó
      const standards = STANDARD_CHAPTERS_BY_GRADE[gradeKey] || [];
      standards.forEach((ch) => chaptersSet.add(ch));

      // Thêm chương thực tế có trong đề thi của lớp đó
      exams
        .filter((e) => isExamMatchClassFilter(e, activeClassFilter) && e.chapter)
        .forEach((e) => {
          if (e.chapter) chaptersSet.add(e.chapter);
        });
    } else {
      // Thêm tất cả các chương hiện có trong toàn bộ đề
      exams.forEach((e) => {
        if (e.chapter) chaptersSet.add(e.chapter);
      });
    }

    return Array.from(chaptersSet);
  }, [exams, activeClassFilter]);

  // Lọc danh sách đề thi theo Lớp, Chương và Từ khóa tìm kiếm
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Lọc theo Lớp
      if (!isExamMatchClassFilter(exam, activeClassFilter)) {
        return false;
      }
      // Lọc theo Chương
      if (selectedChapterFilter !== "all") {
        if (!exam.chapter || exam.chapter !== selectedChapterFilter) {
          return false;
        }
      }
      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exam.title.toLowerCase().includes(q);
        const matchCode = exam.code.toLowerCase().includes(q);
        const matchChapter = (exam.chapter || "").toLowerCase().includes(q);
        const matchGrade = exam.grade.toLowerCase().includes(q);
        const matchSubject = exam.subject.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchChapter && !matchGrade && !matchSubject) {
          return false;
        }
      }
      return true;
    });
  }, [exams, activeClassFilter, selectedChapterFilter, searchQuery]);

  // Gom nhóm đề thi theo từng Chương
  const examsGroupedByChapter = useMemo(() => {
    const map = new Map<string, Exam[]>();
    filteredExams.forEach((exam) => {
      const ch = exam.chapter || "Chưa phân loại chương";
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
        chapterExams.reduce((sum, e) => sum + e.durationMinutes, 0) / chapterExams.length
      ),
    }));
  }, [filteredExams]);

  // Đề nổi bật
  const currentFeaturedExam = filteredExams[0] || exams[0] || {
    id: "default_fallback",
    code: "001",
    title: "Đề Kiểm Tra Cơ Bản",
    subject: "Toán học",
    grade: "Lớp 12",
    chapter: "Chương 2: Vectơ và Hệ trục toạ độ trong không gian Oxyz",
    durationMinutes: 90,
    totalScore: 10,
    author: "Hệ thống Giáo dục",
    description: "Bộ đề chuẩn cấu trúc GD&ĐT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [],
  };

  // Thống kê tổng số câu hỏi theo 4 dạng thức an toàn
  const safeExams = Array.isArray(exams) && exams.length > 0 ? exams : [currentFeaturedExam];
  const totalQuestions = safeExams.reduce((acc, e) => acc + (e?.questions?.length || 0), 0);
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
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
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
        setImportPreview(parsed);
        toast.info(
          "Đã phân tích mã nguồn LaTeX",
          `Nhận diện được ${parsed.questions.length} câu hỏi (${parsed.grade || "Lớp 12"} • ${parsed.chapter || "Chương mới"}) từ "${file.name}".`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleParseText = () => {
    if (!latexInputText.trim()) return;
    const parsed = parseLatexExam(latexInputText, importTitle);
    const finalChapter = isCustomChapter ? customChapterInput : importChapter;
    parsed.grade = importGrade;
    if (finalChapter) parsed.chapter = finalChapter;
    setImportPreview(parsed);
    toast.info(
      "Phân tích mã nguồn LaTeX",
      `Đã nhận diện ${parsed.questions.length} câu hỏi thuộc ${parsed.grade} - ${parsed.chapter || "Chương đã chọn"}.`
    );
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    const finalChapter = isCustomChapter ? customChapterInput : importChapter;
    const examToSave: Exam = {
      ...importPreview,
      title: importTitle || importPreview.title,
      grade: importGrade,
      targetClass: importTargetClass,
      chapter: finalChapter || importPreview.chapter,
    };
    onSaveExam(examToSave);
    setShowImportModal(false);
    setLatexInputText("");
    setImportPreview(null);
  };

  // Mở modal sửa nhanh Lớp & Chương cho 1 đề
  const handleOpenEditMetadata = (exam: Exam) => {
    setEditingExam(exam);
    setEditGrade(exam.grade || "Lớp 12");
    setEditTargetClass(exam.targetClass || "Tất cả các lớp");
    const stdChapters = STANDARD_CHAPTERS_BY_GRADE[exam.grade || "Lớp 12"] || [];
    if (exam.chapter && stdChapters.includes(exam.chapter)) {
      setEditChapter(exam.chapter);
      setIsEditCustomChapter(false);
      setEditCustomChapter("");
    } else if (exam.chapter) {
      setEditChapter("__custom__");
      setIsEditCustomChapter(true);
      setEditCustomChapter(exam.chapter);
    } else {
      setEditChapter(stdChapters[0] || "");
      setIsEditCustomChapter(false);
      setEditCustomChapter("");
    }
  };

  // Lưu sửa Lớp & Chương
  const handleSaveEditMetadata = () => {
    if (!editingExam) return;
    const finalChapter = isEditCustomChapter ? editCustomChapter : editChapter;
    const updatedExam: Exam = {
      ...editingExam,
      grade: editGrade,
      targetClass: editTargetClass,
      chapter: finalChapter || undefined,
      updatedAt: new Date().toISOString(),
    };
    onSaveExam(updatedExam);
    setEditingExam(null);
    toast.success(
      "Cập nhật phân loại thành công",
      `Đề "${updatedExam.title}" đã được chuyển sang ${updatedExam.grade} (${updatedExam.targetClass || "Tất cả các lớp"}) - ${updatedExam.chapter || "Chưa gắn chương"}.`
    );
  };

  const handleDownloadLatex = (exam: Exam) => {
    const texCode = exportExamToLatex(exam);
    const blob = new Blob([texCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `De_${exam.code}_${exam.grade.replace(/\s+/g, "")}_${exam.subject.replace(/\s+/g, "_")}.tex`;
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ================= BENTO GRID DASHBOARD ================= */}
        <div className="grid grid-cols-12 gap-5">
          {/* Bento Item 1: Xem trước đề thi nổi bật (Col span 8) */}
          <section className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-7 flex flex-col justify-between">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${getGradeBadgeStyle(
                    currentFeaturedExam.grade
                  )}`}
                >
                  {currentFeaturedExam.grade}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200 truncate max-w-xs">
                  {currentFeaturedExam.chapter || "Chương mục chung"}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  Mã: {currentFeaturedExam.code} • {currentFeaturedExam.questions.length} câu • {currentFeaturedExam.durationMinutes} phút
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTableBuilder(true)}
                  className="px-3.5 py-1.5 text-xs font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                  title="Mở công cụ thiết kế Bảng xét dấu / Bảng biến thiên / Bảng thống kê"
                >
                  <Table className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Vẽ Bảng TeX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nhập TeX mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectExam(currentFeaturedExam, "presentation")}
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>Trình chiếu ngay</span>
                </button>
              </div>
            </div>

            {/* Khung nội dung câu hỏi mẫu phong cách Bento */}
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 mb-5">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                    {currentFeaturedExam.subject}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug">
                    {currentFeaturedExam.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditMetadata(currentFeaturedExam)}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition"
                  title="Đổi lớp và chương"
                >
                  <Tag className="w-3 h-3 text-indigo-600" />
                  <span>Đổi Lớp/Chương</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed line-clamp-2">
                {currentFeaturedExam.description || "Đề kiểm tra chuẩn chương trình giáo dục phổ thông."}
              </p>

              {/* Xem nhanh 3 câu hỏi đầu */}
              {currentFeaturedExam.questions && currentFeaturedExam.questions.length > 0 && (
                <div className="space-y-2.5">
                  {currentFeaturedExam.questions.slice(0, 2).map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs flex items-start gap-2.5"
                    >
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] shrink-0">
                        {q.title || `Câu ${idx + 1}`}
                      </span>
                      <div className="flex-1 overflow-hidden">
                        <span className="font-semibold text-slate-800 line-clamp-2">
                          <MathRenderer content={q.content} inline />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hành động của Bento Hero */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectExam(currentFeaturedExam, "exam")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Vào thi thử nghiệm</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectExam(currentFeaturedExam, "live")}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Mở phòng Live</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleDownloadLatex(currentFeaturedExam)}
                  className="text-indigo-600 hover:underline font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> .tex
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPresentationHtml(currentFeaturedExam)}
                  className="text-emerald-600 hover:underline font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Slide offline
                </button>
              </div>
            </div>
          </section>

          {/* Bento Item 2: Thống kê Ngân hàng theo Lớp & 4 Dạng thức */}
          <section className="col-span-12 sm:col-span-6 lg:col-span-4 bg-slate-900 rounded-3xl p-6 text-white flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  Phân bố Lớp & Chương
                </h3>
                <span className="px-2 py-0.5 bg-slate-800 text-indigo-400 rounded-lg text-[10px] font-bold border border-slate-700">
                  GDPT 2018
                </span>
              </div>

              {/* Phân loại theo Khối & Lớp chi tiết */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {["Lớp 12", "Lớp 11", "Lớp 10"].map((gr) => {
                  const count = exams.filter((e) => e.grade === gr).length;
                  const isSelected = activeClassFilter === gr;
                  return (
                    <button
                      key={gr}
                      type="button"
                      onClick={() => {
                        handleClassChange(gr);
                        setSelectedChapterFilter("all");
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-xs"
                          : "bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <div className="text-base font-black tracking-tight">{count} đề</div>
                      <div className="text-[10px] font-bold opacity-80 mt-0.5">{gr}</div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Class Chips trong sidebar */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["12A1", "12A2", "11A1", "10A1"].map((cls) => {
                  const isSel = activeClassFilter === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        handleClassChange(cls);
                        setSelectedChapterFilter("all");
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                        isSel
                          ? "bg-amber-400 border-amber-300 text-slate-900 shadow-xs"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      Lớp {cls}
                    </button>
                  );
                })}
              </div>

              {/* 4 Dạng thức chuẩn */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">Trắc nghiệm 4 lựa chọn</span>
                  <span className="bg-slate-700 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                    {singleChoiceCount} câu
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">Đúng / Sai (a,b,c,d)</span>
                  <span className="bg-slate-700 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                    {tfCount} câu
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">Trả lời ngắn</span>
                  <span className="bg-slate-700 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                    {shortCount} câu
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">Tự luận & Hình vẽ</span>
                  <span className="bg-slate-700 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                    {essayCount} câu
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Đề thi mới vào Lớp</span>
            </button>
          </section>

          {/* Bento Item 3: Phân tích hiệu năng theo Chương */}
          <section className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Tiến độ theo Chương
                </h3>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {examsGroupedByChapter.length} chủ đề
                </span>
              </div>

              {/* Danh sách tiến độ các chương */}
              <div className="space-y-2.5 my-3 max-h-44 overflow-y-auto pr-1">
                {examsGroupedByChapter.slice(0, 4).map((grp, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[200px]" title={grp.chapterName}>
                        {grp.chapterName}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md">
                        {grp.exams.length} đề
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>{grp.totalQuestions} câu hỏi</span>
                      <span>TB {grp.avgDuration} phút</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectExam(currentFeaturedExam, "analytics")}
              className="w-full mt-2 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Xem phân tích phổ điểm & lỗ hổng</span>
            </button>
          </section>

          {/* Bento Item 4: Học viên hoạt động */}
          <section className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3.5">
                Hoạt động theo Lớp
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                    12A1
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800">Lớp 12A1 (Toán)</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">38/40 đã nộp bài</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-700">
                    11B2
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800">Lớp 11B2</div>
                    <div className="text-[10px] text-slate-400 font-medium">Đang làm Chương 1</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                    10C3
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800">Lớp 10C3</div>
                    <div className="text-[10px] text-slate-400 font-medium">Chuẩn bị thi Chương 1</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectExam(currentFeaturedExam, "live")}
              className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Theo dõi lớp học Live</span>
            </button>
          </section>

          {/* Bento Item 5: Xuất báo cáo & Slide */}
          <section className="col-span-12 lg:col-span-5 bg-indigo-600 rounded-3xl p-6 sm:p-7 text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                Xuất tài liệu theo Chương
              </span>
              <h2 className="text-lg sm:text-xl font-bold">Xuất đề thi & Bài giảng</h2>
              <p className="text-xs text-indigo-100 leading-relaxed max-w-sm">
                Tải về bộ slide HTML ngoại tuyến và mã nguồn LaTeX được phân loại tự động theo từng Lớp và từng Chương.
              </p>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadPresentationHtml(currentFeaturedExam)}
                className="bg-white text-indigo-600 px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md hover:bg-indigo-50 flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>Tải Slide HTML</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadLatex(currentFeaturedExam)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải file .tex</span>
              </button>
            </div>
          </section>
        </div>

        {/* ================= THANH ĐIỀU HƯỚNG QUẢN LÝ LỚP & CHƯƠNG ================= */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          {/* Hàng 1: Tabs lọc theo Lớp + Ô tìm kiếm + Toggle Chế độ xem */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            {/* Tabs Lớp & Chọn Lớp (Class & Grade Selector) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Lớp:
              </span>

              <button
                type="button"
                onClick={() => {
                  handleClassChange("all");
                  setSelectedChapterFilter("all");
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 transition ${
                  activeClassFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs font-extrabold"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Tất cả các lớp ({exams.length})
              </button>

              {/* Quick Class Chips */}
              {["12A1", "12A2", "11A1", "10A1"].map((cls) => {
                const count = exams.filter((e) => isExamMatchClassFilter(e, cls)).length;
                const isSelected = activeClassFilter === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      handleClassChange(cls);
                      setSelectedChapterFilter("all");
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 shadow-xs font-extrabold"
                        : "bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/60"
                    }`}
                  >
                    <span>Lớp {cls}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected ? "bg-black/20 text-slate-950" : "bg-amber-200/80 text-amber-950"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Khối lớp */}
              {allAvailableGrades.map((gr) => {
                const count = exams.filter((e) => e.grade === gr).length;
                const isSelected = activeClassFilter === gr;
                return (
                  <button
                    key={gr}
                    type="button"
                    onClick={() => {
                      handleClassChange(gr);
                      setSelectedChapterFilter("all");
                    }}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{gr}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm & Chế độ xem */}
            <div className="flex items-center gap-2.5">
              {/* Ô tìm kiếm */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm đề, mã, chương..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
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

              {/* Switch View Mode: Bento Grid vs Grouped by Chapter */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewGrouping("grid")}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewGrouping === "grid"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Chế độ Thẻ Lưới"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lưới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewGrouping("by_chapter")}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewGrouping === "by_chapter"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Chế độ Gom theo Chương"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Theo Chương</span>
                </button>
              </div>

              {/* Nút thêm đề mới */}
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thêm đề</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Tabs lọc theo Chương mục */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              Chương:
            </span>

            <button
              type="button"
              onClick={() => setSelectedChapterFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] shrink-0 transition ${
                selectedChapterFilter === "all"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              Tất cả chương ({filteredExams.length})
            </button>

            {availableChaptersForSelectedGrade.map((chap) => {
              const countInChapter = exams.filter(
                (e) =>
                  (activeClassFilter === "all" || isExamMatchClassFilter(e, activeClassFilter)) &&
                  e.chapter === chap
              ).length;
              const isSelected = selectedChapterFilter === chap;
              return (
                <button
                  key={chap}
                  type="button"
                  onClick={() => setSelectedChapterFilter(chap)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] shrink-0 flex items-center gap-1.5 transition ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                  title={chap}
                >
                  <span className="truncate max-w-[240px]">{chap}</span>
                  {countInChapter > 0 && (
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {countInChapter}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= HIỂN THỊ DANH SÁCH ĐỀ THI ================= */}
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
              🔍
            </div>
            <h3 className="font-bold text-base text-slate-800">
              Không tìm thấy đề thi phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không có đề thi nào khớp với bộ lọc Lớp: <b>{activeClassFilter}</b> và Chương: <b>{selectedChapterFilter}</b>. Hãy thử đổi bộ lọc hoặc thêm đề thi mới.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  handleClassChange("all");
                  setSelectedChapterFilter("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Xóa tất cả bộ lọc
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs"
              >
                + Thêm đề thi mới
              </button>
            </div>
          </div>
        ) : viewGrouping === "by_chapter" ? (
          /* ================= CHẾ ĐỘ XEM GOM THEO CHƯƠNG ================= */
          <div className="space-y-6">
            {examsGroupedByChapter.map((group, grpIdx) => (
              <div
                key={grpIdx}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
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
                      onEditMetadata={handleOpenEditMetadata}
                      handleDownloadLatex={handleDownloadLatex}
                      handleDownloadPresentationHtml={handleDownloadPresentationHtml}
                      getGradeBadgeStyle={getGradeBadgeStyle}
                      canDelete={exams.length > 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ================= CHẾ ĐỘ XEM LƯỚI BENTO CARDS ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExams.map((exam) => (
              <ExamCardItem
                key={exam.id}
                exam={exam}
                onSelectExam={onSelectExam}
                onDeleteExam={onDeleteExam}
                onEditMetadata={handleOpenEditMetadata}
                handleDownloadLatex={handleDownloadLatex}
                handleDownloadPresentationHtml={handleDownloadPresentationHtml}
                getGradeBadgeStyle={getGradeBadgeStyle}
                canDelete={exams.length > 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL CHỈNH SỬA PHÂN LOẠI LỚP & CHƯƠNG ================= */}
      {editingExam && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setEditingExam(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-xl border border-slate-200 text-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Phân loại Lớp & Chương cho Đề thi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingExam(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div className="font-extrabold text-slate-900 line-clamp-1">
                {editingExam.title}
              </div>
              <div className="text-slate-400 font-medium">Mã đề: {editingExam.code} • {editingExam.questions.length} câu</div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Chọn Lớp */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  1. Chọn Lớp (Khối):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STANDARD_GRADES.map((gr) => (
                    <button
                      key={gr}
                      type="button"
                      onClick={() => {
                        setEditGrade(gr);
                        const stds = STANDARD_CHAPTERS_BY_GRADE[gr] || [];
                        setEditChapter(stds[0] || "");
                        setIsEditCustomChapter(false);
                      }}
                      className={`py-2 px-3 rounded-xl font-bold border text-center transition ${
                        editGrade === gr
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {gr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chọn Lớp cụ thể */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  2. Áp dụng cho Lớp:
                </label>
                <select
                  value={editTargetClass}
                  onChange={(e) => setEditTargetClass(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 font-bold bg-white text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="Tất cả các lớp">🏫 Tất cả các lớp trong khối</option>
                  {STANDARD_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      Lớp {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Chương */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  3. Chọn Chương / Chủ đề:
                </label>
                <select
                  value={isEditCustomChapter ? "__custom__" : editChapter}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsEditCustomChapter(true);
                    } else {
                      setIsEditCustomChapter(false);
                      setEditChapter(e.target.value);
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 font-medium bg-white text-slate-800 outline-none focus:border-indigo-500"
                >
                  {(STANDARD_CHAPTERS_BY_GRADE[editGrade] || []).map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                  <option value="__custom__">✍️ Nhập tên Chương tùy chỉnh...</option>
                </select>

                {isEditCustomChapter && (
                  <input
                    type="text"
                    value={editCustomChapter}
                    onChange={(e) => setEditCustomChapter(e.target.value)}
                    placeholder="Nhập tên chương hoặc chủ đề mới..."
                    className="w-full mt-2 py-2 px-3 rounded-xl border border-slate-300 font-medium outline-none focus:border-indigo-500 text-xs"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingExam(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditMetadata}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
              >
                Lưu phân loại
              </button>
            </div>
          </div>
        </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Khối Lớp */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Khối Lớp:
                  </label>
                  <select
                    value={importGrade}
                    onChange={(e) => {
                      const newGrade = e.target.value;
                      setImportGrade(newGrade);
                      const stds = STANDARD_CHAPTERS_BY_GRADE[newGrade] || [];
                      setImportChapter(stds[0] || "");
                      setIsCustomChapter(false);
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
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Áp dụng cho Lớp:
                  </label>
                  <select
                    value={importTargetClass}
                    onChange={(e) => setImportTargetClass(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-white font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="Tất cả các lớp">🏫 Tất cả các lớp</option>
                    {STANDARD_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        Lớp {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chương */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chương / Chủ đề:
                  </label>
                  <select
                    value={isCustomChapter ? "__custom__" : importChapter}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomChapter(true);
                      } else {
                        setIsCustomChapter(false);
                        setImportChapter(e.target.value);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-white font-medium text-slate-800 outline-none focus:border-indigo-500"
                  >
                    {(STANDARD_CHAPTERS_BY_GRADE[importGrade] || []).map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                    <option value="__custom__">✍️ Nhập chương tùy chỉnh...</option>
                  </select>

                  {isCustomChapter && (
                    <input
                      type="text"
                      value={customChapterInput}
                      onChange={(e) => setCustomChapterInput(e.target.value)}
                      placeholder="Nhập tên chương hoặc chuyên đề..."
                      className="w-full mt-2 py-1.5 px-3 rounded-xl border border-indigo-200 bg-white font-medium outline-none focus:border-indigo-500 text-xs"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Hướng dẫn 4 dạng thức & Nút mẫu TeX */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 mb-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Mẫu 4 dạng thức chuẩn:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const tpl = getStandardTemplateLatex();
                      setLatexInputText(tpl);
                      setImportTitle(`Đề ${importGrade} - Ôn tập chuẩn 4 dạng thức`);
                      const preview = parseLatexExam(tpl, `Đề ${importGrade} - Ôn tập chuẩn 4 dạng thức`);
                      preview.grade = importGrade;
                      preview.chapter = isCustomChapter ? customChapterInput : importChapter;
                      setImportPreview(preview);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                  >
                    <span>⚡ Nạp Template mẫu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const tpl = getStandardTemplateLatex();
                      const blob = new Blob([tpl], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `TEMPLATE_BAI_TAP_4_DANG.tex`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>Tải file .tex mẫu</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tên đề thi mới:
                  </label>
                  <input
                    type="text"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="Nhập tên đề thi..."
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 font-bold text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Hoặc tải lên tệp .tex:
                  </label>
                  <input
                    type="file"
                    accept=".tex,.txt"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-600">
                    Dán nội dung mã LaTeX cấu trúc 4 dạng bài tập:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTableBuilder(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 transition shadow-2xs"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>🎨 Vẽ Bảng & Chèn TeX</span>
                  </button>
                </div>
                <textarea
                  rows={7}
                  value={latexInputText}
                  onChange={(e) => setLatexInputText(e.target.value)}
                  placeholder="Dán mã LaTeX chứa các khối \begin{ex} % ID: [ID] ... \choice / \choiceTF / \shortans ... \loigiai ... \end{ex}"
                  className="w-full p-3.5 rounded-2xl border border-slate-300 font-mono text-xs outline-none bg-slate-50 text-slate-800 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phân tích & Xem trước</span>
                </button>
              </div>
            </div>

            {importPreview && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 my-2">
                <div className="flex flex-wrap justify-between items-center font-bold text-xs text-emerald-800 gap-2">
                  <span>
                    ✓ Đã nhận diện: <b>{importPreview.questions.length} câu hỏi</b> (Mã: {importPreview.code})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                      {importGrade}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-medium truncate max-w-xs">
                      {isCustomChapter ? customChapterInput : importChapter}
                    </span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {importPreview.questions.slice(0, 4).map((q) => (
                    <div key={q.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-indigo-600 mr-2">
                        {q.title} ({q.partName}):
                      </span>
                      <MathRenderer content={q.content} inline />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-auto">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!importPreview || importPreview.questions.length === 0}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-bold text-xs shadow-sm transition"
              >
                Lưu vào Ngân hàng ({importGrade})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Công cụ Vẽ & Thiết kế Bảng Toán học */}
      <TableBuilderModal
        isOpen={showTableBuilder}
        onClose={() => setShowTableBuilder(false)}
        onInsertLatex={(latex) => {
          setLatexInputText((prev) => (prev ? `${prev}\n\n${latex}` : latex));
          if (!showImportModal) {
            setShowImportModal(true);
          }
        }}
      />
    </div>
  );
};

// Sub-component Thẻ đề thi Bento Card
interface ExamCardItemProps {
  exam: Exam;
  onSelectExam: (exam: Exam, mode: "presentation" | "exam" | "analytics" | "live") => void;
  onDeleteExam: (examId: string) => void;
  onEditMetadata: (exam: Exam) => void;
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
  handleDownloadLatex,
  handleDownloadPresentationHtml,
  getGradeBadgeStyle,
  canDelete,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Badges Lớp, Chương, Mã đề */}
        <div className="flex justify-between items-start gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${getGradeBadgeStyle(
                exam.grade
              )}`}
            >
              {exam.grade}
            </span>
            {exam.targetClass && exam.targetClass !== "Tất cả các lớp" && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-200">
                Lớp: {exam.targetClass}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">
              Mã: {exam.code}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onEditMetadata(exam)}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
            title="Đổi Lớp & Chương"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tên chương */}
        {exam.chapter && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1.5 truncate" title={exam.chapter}>
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
