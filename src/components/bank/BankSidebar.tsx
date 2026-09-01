import React from "react";
import { Exam, STANDARD_GRADES } from "../../types/exam";
import {
  GraduationCap,
  Folder,
  FolderOpen,
  Bookmark,
  Filter,
  CheckCircle2,
  Lock,
  Unlock,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface BankSidebarProps {
  exams: Exam[];
  activeGradeFilter: string;
  onSelectGradeFilter: (grade: string) => void;
  activeClassFilter: string;
  onSelectClassFilter: (cls: string) => void;
  activeChapterFilter: string;
  onSelectChapterFilter: (chap: string) => void;
  activeStatusFilter: "all" | "open" | "locked" | "scheduled";
  onSelectStatusFilter: (status: "all" | "open" | "locked" | "scheduled") => void;
  availableChapters: string[];
  realClasses: string[];
  totalExamsCount: number;
}

export const BankSidebar: React.FC<BankSidebarProps> = ({
  exams,
  activeGradeFilter,
  onSelectGradeFilter,
  activeClassFilter,
  onSelectClassFilter,
  activeChapterFilter,
  onSelectChapterFilter,
  activeStatusFilter,
  onSelectStatusFilter,
  availableChapters,
  realClasses,
  totalExamsCount,
}) => {
  return (
    <aside className="w-full lg:w-72 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-6 shrink-0">
      {/* Khối Lớp */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            Khối Lớp
          </span>
          <span className="text-[10px] font-bold text-slate-400">GDPT 2018</span>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onSelectGradeFilter("all");
              onSelectClassFilter("all");
              onSelectChapterFilter("all");
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeGradeFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Tất cả các khối
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeGradeFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {totalExamsCount}
            </span>
          </button>

          {STANDARD_GRADES.map((gr) => {
            const count = exams.filter((e) => e.grade === gr).length;
            const isSelected = activeGradeFilter === gr;

            return (
              <button
                key={gr}
                type="button"
                onClick={() => {
                  onSelectGradeFilter(gr);
                  onSelectClassFilter("all");
                  onSelectChapterFilter("all");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span>{gr}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phân công Lớp học cụ thể (Nếu có) */}
      {realClasses.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Lớp Phân Công
            </span>
            {activeClassFilter !== "all" && (
              <button
                type="button"
                onClick={() => onSelectClassFilter("all")}
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Bỏ chọn
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {realClasses.map((cls) => {
              const isSelected = activeClassFilter === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() =>
                    onSelectClassFilter(isSelected ? "all" : cls)
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    isSelected
                      ? "bg-amber-500 border-amber-500 text-slate-950 shadow-2xs font-black"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Lớp {cls}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Thư mục Chuyên đề / Chương */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
            Chương Mục
          </span>
          {activeChapterFilter !== "all" && (
            <button
              type="button"
              onClick={() => onSelectChapterFilter("all")}
              className="text-[10px] font-bold text-indigo-600 hover:underline"
            >
              Tất cả
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => onSelectChapterFilter("all")}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold text-left transition ${
              activeChapterFilter === "all"
                ? "bg-indigo-50 text-indigo-800 border border-indigo-200 font-black"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Tất cả các chương</span>
          </button>

          {availableChapters.map((chap) => {
            const count = exams.filter((e) => e.chapter === chap).length;
            const isSelected = activeChapterFilter === chap;

            return (
              <button
                key={chap}
                type="button"
                onClick={() =>
                  onSelectChapterFilter(isSelected ? "all" : chap)
                }
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition text-left ${
                  isSelected
                    ? "bg-indigo-600 text-white font-black shadow-2xs"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                title={chap}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isSelected ? (
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{chap}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ml-1.5 ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trạng thái đề thi */}
      <div className="pt-4 border-t border-slate-100">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">
          Trạng Thái Đề
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSelectStatusFilter("all")}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center transition ${
              activeStatusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tất cả
          </button>

          <button
            type="button"
            onClick={() => onSelectStatusFilter("open")}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition ${
              activeStatusFilter === "open"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <Unlock className="w-3 h-3" />
            Đang mở
          </button>

          <button
            type="button"
            onClick={() => onSelectStatusFilter("locked")}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition ${
              activeStatusFilter === "locked"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <Lock className="w-3 h-3" />
            Đã khóa
          </button>

          <button
            type="button"
            onClick={() => onSelectStatusFilter("scheduled")}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 transition ${
              activeStatusFilter === "scheduled"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <Clock className="w-3 h-3" />
            Hẹn giờ
          </button>
        </div>
      </div>
    </aside>
  );
};
