import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Edit3,
  BarChart3,
  Layers,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Award,
  Users,
  Settings,
  ChevronDown,
  LogOut,
  LogIn,
  KeyRound,
  Camera,
  UserCheck,
  Trophy,
  History,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole, ROLE_LABELS } from "../types/auth";
import { STANDARD_GRADES } from "../types/exam";
import { BeeLogo } from "./BeeLogo";

export type ActiveView =
  | "bank"
  | "presentation"
  | "exam"
  | "practice"
  | "analytics"
  | "leaderboard"
  | "live"
  | "admin"
  | "student_portal";

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  examTitle?: string;
  examCode?: string;
  selectedClassFilter?: string;
  onSelectClassFilter?: (cls: string) => void;
  onOpenLeaderboard?: () => void;
  onOpenHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  examTitle,
  examCode,
  selectedClassFilter = "all",
  onSelectClassFilter,
  onOpenLeaderboard,
  onOpenHistory,
}) => {
  const {
    currentUser,
    users,
    isAdmin,
    isTeacher,
    isStudent,
    logout,
    setShowAuthModal,
    setShowProfileModal,
  } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const realClasses = React.useMemo(() => {
    const set = new Set<string>();
    (users || []).forEach((u) => {
      if (u.schoolClass && u.schoolClass.trim()) {
        set.add(u.schoolClass.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [users]);

  const groupedClassesByGrade = React.useMemo(() => {
    const map = new Map<string, string[]>();
    STANDARD_GRADES.forEach((g) => map.set(g, []));
    const other: string[] = [];

    realClasses.forEach((cls) => {
      const match = cls.match(/\d+/);
      if (match) {
        const gradeKey = `Lớp ${match[0]}`;
        if (map.has(gradeKey)) {
          map.get(gradeKey)!.push(cls);
          return;
        }
      }
      other.push(cls);
    });

    return { map, other };
  }, [realClasses]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Danh mục tab điều hướng theo vai trò (RBAC)
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { id: "bank", label: "Ngân hàng đề", icon: BookOpen },
        { id: "practice", label: "Luyện chuyên đề", icon: Sparkles },
        { id: "live", label: "Phòng thi Live", icon: Layers },
        { id: "analytics", label: "Báo cáo & Chấm thi", icon: BarChart3 },
        { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy },
        { id: "admin", label: "Quản trị Admin", icon: ShieldCheck, badge: "Master" },
      ];
    }

    if (isTeacher) {
      return [
        { id: "bank", label: "Ngân hàng đề", icon: BookOpen },
        { id: "practice", label: "Luyện chuyên đề", icon: Sparkles },
        { id: "live", label: "Phòng thi Live", icon: Layers },
        { id: "analytics", label: "Báo cáo & Chấm thi", icon: BarChart3 },
        { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy },
      ];
    }

    // Học sinh
    return [
      { id: "student_portal", label: "Cổng Luyện Thi", icon: GraduationCap },
      { id: "practice", label: "Luyện chuyên đề", icon: Sparkles },
      { id: "exam", label: "Làm bài thi", icon: Edit3 },
      { id: "live", label: "Vào phòng thi Live", icon: Layers },
      { id: "leaderboard", label: "Bảng xếp hạng", icon: Trophy },
    ];
  };

  const navItems = getNavItems();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveView(isStudent ? "student_portal" : "bank")}
        >
          <BeeLogo size={42} animated={true} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center">
                <span>MPEduCenter</span>
                <span className="text-amber-500 font-black">-Test</span>
              </h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                  ROLE_LABELS[currentUser.role].color
                }`}
              >
                {ROLE_LABELS[currentUser.role].badge}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold mt-0.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              <span className="truncate max-w-[240px] sm:max-w-[320px]">
                {examCode ? `Đang mở: ${examCode}` : "Hệ thống kiểm tra 4 dạng thức"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs theo Vai trò */}
        <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 order-3 md:order-2 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id as ActiveView)}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Class Selector cho Admin & Giáo viên */}
        {(isAdmin || isTeacher) && onSelectClassFilter && (
          <div className="flex items-center gap-1.5 bg-amber-50/90 hover:bg-amber-100/80 border border-amber-200 py-1 px-2.5 rounded-2xl shadow-2xs transition order-2 md:order-2">
            <GraduationCap className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-[11px] font-extrabold text-amber-800 hidden sm:inline">Lớp:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => onSelectClassFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-amber-950 focus:outline-none cursor-pointer pr-1 py-0.5"
              title="Chọn lớp để lọc dữ liệu toàn hệ thống"
            >
              <option value="all">🏫 Tất cả các lớp {realClasses.length > 0 ? `(${realClasses.length} lớp)` : ""}</option>
              {STANDARD_GRADES.map((gr) => {
                const classList = groupedClassesByGrade.map.get(gr) || [];
                const label = gr.replace("Lớp ", "Khối ");
                return (
                  <optgroup key={gr} label={label}>
                    <option value={gr}>Toàn {label.toLowerCase()}</option>
                    {classList.map((cls) => (
                      <option key={cls} value={cls}>
                        Lớp {cls}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
              {groupedClassesByGrade.other.length > 0 && (
                <optgroup label="Lớp khác">
                  {groupedClassesByGrade.other.map((cls) => (
                    <option key={cls} value={cls}>
                      Lớp {cls}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* User Account & Login Menu */}
        <div className="flex items-center gap-2 order-2 md:order-3 relative" ref={dropdownRef}>
          {/* Nút bấm vào tên tài khoản để xem Kết quả của tất cả các lần làm bài */}
          <button
            type="button"
            onClick={() => {
              if (onOpenHistory) {
                onOpenHistory();
              } else {
                setShowDropdown(!showDropdown);
              }
            }}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition shadow-2xs group text-left cursor-pointer"
            title="Bấm để xem kết quả làm bài của tất cả các lần làm bài của bạn"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-xl object-cover border border-slate-300 group-hover:scale-105 transition"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 leading-tight truncate max-w-[120px] flex items-center gap-1">
                <span>{currentUser.name}</span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAdmin ? "bg-rose-500" : isTeacher ? "bg-indigo-500" : "bg-emerald-500"
                  }`}
                ></span>
                <span>{ROLE_LABELS[currentUser.role].title}</span>
              </div>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
            />
          </button>

          {/* User Account Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div
                className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-slate-100/80 transition"
                onClick={() => {
                  setShowDropdown(false);
                  if (onOpenHistory) onOpenHistory();
                }}
              >
                <div className="text-xs font-extrabold text-slate-900 truncate flex items-center justify-between">
                  <span>{currentUser.name}</span>
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                  <span>Vai trò:</span>
                  <span className={`font-black ${ROLE_LABELS[currentUser.role].textDark}`}>
                    {ROLE_LABELS[currentUser.role].title}
                  </span>
                </div>
              </div>

              <div className="p-1.5 space-y-1">
                {/* Tùy chọn xem kết quả làm bài thi */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    if (onOpenHistory) onOpenHistory();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2 text-left transition"
                >
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Kết quả & Lịch sử làm bài thi</span>
                </button>

                {/* Tùy chọn mở Bảng xếp hạng */}
                {onOpenLeaderboard && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onOpenLeaderboard();
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 rounded-xl flex items-center gap-2 text-left transition"
                  >
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>Bảng Xếp Hạng Điểm Số Theo Lớp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-left transition"
                >
                  <Camera className="w-4 h-4 text-amber-600" />
                  <span>Đổi hình đại diện & Hồ sơ</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("admin");
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-500" />
                    <span>Trang Quản trị Hệ thống</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    setShowAuthModal(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-2 text-left"
                >
                  <LogIn className="w-4 h-4 text-indigo-600" />
                  <span>Đăng nhập tài khoản khác</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
