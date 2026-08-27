import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { SCORE_TIERS, ScoreTierKey } from "../utils/filterUtils";
import { ROLE_LABELS, UserRole } from "../types/auth";

export type DifficultyFilter = "all" | "hard" | "standard" | "easy";
export type StudentSortOption = "score_desc" | "score_asc" | "name" | "sbd" | "time_desc";

export interface FilterBadge {
  id: string;
  label: string;
  onRemove: () => void;
}

interface FilterContextType {
  // Lớp / Khối
  selectedClassFilter: string;
  setSelectedClassFilter: (cls: string) => void;

  // Đề kiểm tra (Exam Filter)
  selectedExamFilter: string;
  setSelectedExamFilter: (examId: string) => void;

  // Dạng thức / Phần câu hỏi
  itemPartFilter: string;
  setItemPartFilter: (part: string) => void;

  // Độ khó / Tỷ lệ làm đúng
  itemDifficultyFilter: DifficultyFilter;
  setItemDifficultyFilter: (diff: DifficultyFilter) => void;

  // Phân loại mức điểm học sinh
  studentScoreTier: ScoreTierKey;
  setStudentScoreTier: (tier: ScoreTierKey) => void;

  // Sắp xếp
  studentSortBy: StudentSortOption;
  setStudentSortBy: (sort: StudentSortOption) => void;

  // Vai trò & Trạng thái người dùng (Admin)
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  userRoleFilter: string;
  setUserRoleFilter: (role: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  userStatusFilter: string;
  setUserStatusFilter: (status: string) => void;

  // Từ khóa tìm kiếm chung
  searchKeyword: string;
  setSearchKeyword: (kw: string) => void;
  searchQuery: string;
  setSearchQuery: (kw: string) => void;

  // Trạng thái mở Sidebar Filter Drawer
  isFilterDrawerOpen: boolean;
  setIsFilterDrawerOpen: (open: boolean) => void;
  openFilterDrawer: () => void;
  closeFilterDrawer: () => void;
  toggleFilterDrawer: () => void;

  // Tiện ích
  resetAllFilters: () => void;
  activeFilterBadges: FilterBadge[];
  activeFiltersCount: number;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const STANDARD_CLASSES_LIST: readonly string[] = [];

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>("all");
  const [itemPartFilter, setItemPartFilter] = useState<string>("all");
  const [itemDifficultyFilter, setItemDifficultyFilter] = useState<DifficultyFilter>("all");
  const [studentScoreTier, setStudentScoreTier] = useState<ScoreTierKey>("all");
  const [studentSortBy, setStudentSortBy] = useState<StudentSortOption>("score_desc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  const openFilterDrawer = () => setIsFilterDrawerOpen(true);
  const closeFilterDrawer = () => setIsFilterDrawerOpen(false);
  const toggleFilterDrawer = () => setIsFilterDrawerOpen((prev) => !prev);

  const resetAllFilters = () => {
    setSelectedClassFilter("all");
    setSelectedExamFilter("all");
    setItemPartFilter("all");
    setItemDifficultyFilter("all");
    setStudentScoreTier("all");
    setStudentSortBy("score_desc");
    setRoleFilter("all");
    setStatusFilter("all");
    setSearchKeyword("");
  };

  const activeFilterBadges = useMemo(() => {
    const badges: FilterBadge[] = [];

    if (selectedClassFilter !== "all") {
      badges.push({
        id: "class",
        label: `Lớp: ${selectedClassFilter}`,
        onRemove: () => setSelectedClassFilter("all"),
      });
    }

    if (selectedExamFilter !== "all") {
      badges.push({
        id: "exam",
        label: `Đề: ${selectedExamFilter}`,
        onRemove: () => setSelectedExamFilter("all"),
      });
    }

    if (itemPartFilter !== "all") {
      const partMap: Record<string, string> = {
        part_1: "Phần I (TN 4 lựa chọn)",
        part_2: "Phần II (Đúng/Sai)",
        part_3: "Phần III (Trả lời ngắn)",
        part_4: "Phần IV (Tự luận)",
      };
      badges.push({
        id: "part",
        label: `Dạng: ${partMap[itemPartFilter] || itemPartFilter}`,
        onRemove: () => setItemPartFilter("all"),
      });
    }

    if (itemDifficultyFilter !== "all") {
      const diffMap: Record<string, string> = {
        hard: "Hay sai (<50%)",
        standard: "Đạt chuẩn (50-79%)",
        easy: "Tốt (≥80%)",
      };
      badges.push({
        id: "diff",
        label: `Tỷ lệ: ${diffMap[itemDifficultyFilter] || itemDifficultyFilter}`,
        onRemove: () => setItemDifficultyFilter("all"),
      });
    }

    if (studentScoreTier !== "all") {
      const tier = SCORE_TIERS.find((t) => t.key === studentScoreTier);
      badges.push({
        id: "scoreTier",
        label: `Mức điểm: ${tier?.shortLabel || studentScoreTier}`,
        onRemove: () => setStudentScoreTier("all"),
      });
    }

    if (roleFilter !== "all") {
      const rTitle = ROLE_LABELS[roleFilter as UserRole]?.title || roleFilter;
      badges.push({
        id: "role",
        label: `Vai trò: ${rTitle}`,
        onRemove: () => setRoleFilter("all"),
      });
    }

    if (statusFilter !== "all") {
      badges.push({
        id: "status",
        label: `Trạng thái: ${statusFilter === "active" ? "Hoạt động" : "Đã khóa"}`,
        onRemove: () => setStatusFilter("all"),
      });
    }

    if (searchKeyword.trim() !== "") {
      badges.push({
        id: "search",
        label: `Tìm: "${searchKeyword}"`,
        onRemove: () => setSearchKeyword(""),
      });
    }

    return badges;
  }, [
    selectedClassFilter,
    selectedExamFilter,
    itemPartFilter,
    itemDifficultyFilter,
    studentScoreTier,
    roleFilter,
    statusFilter,
    searchKeyword,
  ]);

  const activeFiltersCount = activeFilterBadges.length;

  return (
    <FilterContext.Provider
      value={{
        selectedClassFilter,
        setSelectedClassFilter,
        selectedExamFilter,
        setSelectedExamFilter,
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
        userRoleFilter: roleFilter,
        setUserRoleFilter: setRoleFilter,
        statusFilter,
        setStatusFilter,
        userStatusFilter: statusFilter,
        setUserStatusFilter: setStatusFilter,
        searchKeyword,
        setSearchKeyword,
        searchQuery: searchKeyword,
        setSearchQuery: setSearchKeyword,
        isFilterDrawerOpen,
        setIsFilterDrawerOpen,
        openFilterDrawer,
        closeFilterDrawer,
        toggleFilterDrawer,
        resetAllFilters,
        activeFilterBadges,
        activeFiltersCount,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
};
