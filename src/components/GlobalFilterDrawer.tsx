import React from "react";
import {
  SlidersHorizontal,
  X,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Award,
  Users,
  ShieldAlert,
  ArrowUpDown,
  RotateCcw,
  Check,
} from "lucide-react";
import { useFilter } from "../context/FilterContext";
import { useAuth } from "../context/AuthContext";
import { SCORE_TIERS } from "../utils/filterUtils";
import { ROLE_LABELS } from "../types/auth";

interface GlobalFilterDrawerProps {
  availableClasses?: string[];
  totalSubmissions?: number;
  totalUsers?: number;
}

export const GlobalFilterDrawer: React.FC<GlobalFilterDrawerProps> = ({
  availableClasses,
  totalSubmissions,
  totalUsers,
}) => {
  const { users } = useAuth();
  const {
    isFilterDrawerOpen,
    closeFilterDrawer,
    selectedClassFilter,
    setSelectedClassFilter,
    itemPartFilter,
    setItemPartFilter,
    itemDifficultyFilter,
    setItemDifficultyFilter,
    studentScoreTier,
    setStudentScoreTier,
    studentSortBy,
    setStudentSortBy,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    resetAllFilters,
    activeFiltersCount,
  } = useFilter();

  if (!isFilterDrawerOpen) return null;

  const displayClasses = React.useMemo(() => {
    if (availableClasses && availableClasses.length > 0) return availableClasses;
    const set = new Set<string>();
    (users || []).forEach((u) => {
      if (u.schoolClass && u.schoolClass.trim()) {
        set.add(u.schoolClass.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [availableClasses, users]);

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={closeFilterDrawer}
        title="Bấm để đóng bảng điều khiển lọc"
      />

      {/* Slide-over Content */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-slideInRight overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span>Bảng Điều Khiển Lọc</span>
              </h3>
              <p className="text-xs text-slate-300">
                {activeFiltersCount > 0
                  ? `${activeFiltersCount} tiêu chí lọc đang được kích hoạt`
                  : "Quản lý và đồng bộ bộ lọc toàn hệ thống"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeFilterDrawer}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filter Options */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* 1. Khối & Lớp học */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>1. Khối & Lớp học</span>
            </label>

            {/* Khối lớp */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedClassFilter("all")}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition text-center ${
                  selectedClassFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Tất cả
              </button>
              {["Lớp 12", "Lớp 11", "Lớp 10"].map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedClassFilter(grade)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition text-center ${
                    selectedClassFilter === grade
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {grade.replace("Lớp ", "Khối ")}
                </button>
              ))}
            </div>

            {/* Chi tiết từng Lớp */}
            {displayClasses.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                {displayClasses.map((cls) => {
                  const isSel = selectedClassFilter === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClassFilter(cls)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        isSel
                          ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                          : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-200"
                      }`}
                    >
                      <span>Lớp {cls}</span>
                      {isSel && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <p className="text-xs text-slate-400 italic">Chưa có lớp học nào trong hệ thống</p>
              </div>
            )}
          </div>

          {/* 2. Dạng thức / Phần thi câu hỏi */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>2. Dạng thức câu hỏi</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: "all", label: "Tất cả các dạng thức" },
                { id: "part_1", label: "Phần I: Trắc nghiệm 4 lựa chọn" },
                { id: "part_2", label: "Phần II: Đúng / Sai (a,b,c,d)" },
                { id: "part_3", label: "Phần III: Trả lời ngắn" },
                { id: "part_4", label: "Phần IV: Tự luận" },
              ].map((p) => {
                const isSel = itemPartFilter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setItemPartFilter(p.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                      isSel
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSel && <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Tỷ lệ làm đúng & Độ khó */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>3. Tỷ lệ làm đúng câu hỏi</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: "all", label: "Tất cả mức độ đạt" },
                { id: "hard", label: "⚠️ Học sinh hay sai (Tỷ lệ đúng < 50%)" },
                { id: "standard", label: "📘 Đạt chuẩn cấu trúc (Tỷ lệ đúng 50% - 79%)" },
                { id: "easy", label: "🌟 Tốt / Dễ (Tỷ lệ đúng ≥ 80%)" },
              ].map((d) => {
                const isSel = itemDifficultyFilter === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setItemDifficultyFilter(d.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                      isSel
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{d.label}</span>
                    {isSel && <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Phân loại mức điểm học sinh */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span>4. Phân loại mức điểm học sinh</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => setStudentScoreTier("all")}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                  studentScoreTier === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span>🎯 Tất cả mức điểm (0 - 10đ)</span>
                {studentScoreTier === "all" && <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />}
              </button>

              {SCORE_TIERS.map((tier) => {
                const isSel = studentScoreTier === tier.key;
                return (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setStudentScoreTier(tier.key)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                      isSel
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{tier.label}</span>
                    {isSel && <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Vai trò & Trạng thái (Admin) */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>5. Phân loại tài khoản & Vai trò</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all", label: "Tất cả vai trò" },
                { id: "teacher", label: "👨‍🏫 Giáo viên" },
                { id: "student", label: "🎓 Học sinh" },
                { id: "admin", label: "👑 Admin" },
              ].map((r) => {
                const isSel = roleFilter === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoleFilter(r.id)}
                    className={`p-2 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                      isSel
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{r.label}</span>
                    {isSel && <Check className="w-3 h-3 text-amber-300 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Trạng thái tài khoản */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: "all", label: "Mọi trạng thái" },
                { id: "active", label: "🟢 Hoạt động" },
                { id: "locked", label: "🔒 Đã khóa" },
              ].map((s) => {
                const isSel = statusFilter === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id)}
                    className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold text-center transition ${
                      isSel
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Sắp xếp danh sách */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-600" />
              <span>6. Sắp xếp danh sách & Bảng điểm</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "score_desc", label: "Điểm cao → thấp" },
                { id: "score_asc", label: "Điểm thấp → cao" },
                { id: "name", label: "Họ tên (A → Z)" },
                { id: "sbd", label: "Số báo danh (SBD)" },
                { id: "time_desc", label: "Nộp bài mới nhất" },
              ].map((s) => {
                const isSel = studentSortBy === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStudentSortBy(s.id as any)}
                    className={`p-2 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                      isSel
                        ? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{s.label}</span>
                    {isSel && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại ({activeFiltersCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={closeFilterDrawer}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>Áp dụng & Đóng bảng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
