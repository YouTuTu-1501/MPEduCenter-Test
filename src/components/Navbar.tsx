import React, { useState } from "react";
import {
  BookOpen,
  Presentation,
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
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole, ROLE_LABELS } from "../types/auth";
import { BeeLogo } from "./BeeLogo";

export type ActiveView =
  | "bank"
  | "presentation"
  | "exam"
  | "analytics"
  | "live"
  | "admin"
  | "student_portal";

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  examTitle?: string;
  examCode?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  examTitle,
  examCode,
}) => {
  const { currentUser, isAdmin, isTeacher, isStudent, switchRole, setShowRoleModal } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Danh mục tab điều hướng theo vai trò (RBAC)
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { id: "bank", label: "Ngân hàng đề", icon: BookOpen },
        { id: "presentation", label: "Trình chiếu", icon: Presentation },
        { id: "live", label: "Phòng thi Live", icon: Layers },
        { id: "analytics", label: "Báo cáo & Chấm thi", icon: BarChart3 },
        { id: "admin", label: "Quản trị Admin", icon: ShieldCheck, badge: "Master" },
      ];
    }

    if (isTeacher) {
      return [
        { id: "bank", label: "Ngân hàng đề", icon: BookOpen },
        { id: "presentation", label: "Trình chiếu", icon: Presentation },
        { id: "live", label: "Phòng thi Live", icon: Layers },
        { id: "analytics", label: "Báo cáo & Chấm thi", icon: BarChart3 },
        { id: "exam", label: "Thi thử", icon: Edit3 },
      ];
    }

    // Học sinh (Student)
    return [
      { id: "student_portal", label: "Cổng Học sinh", icon: GraduationCap },
      { id: "exam", label: "Làm bài thi", icon: Edit3 },
      { id: "live", label: "Vào phòng Live", icon: Layers },
    ];
  };

  const navItems = getNavItems();

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-rose-500" />;
      case "teacher":
        return <Award className="w-4 h-4 text-indigo-500" />;
      case "student":
        return <GraduationCap className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Tên Hệ Thống - Bento Brand */}
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
                  ROLE_LABELS[currentUser.role].bgLight
                } ${ROLE_LABELS[currentUser.role].textDark} border ${
                  ROLE_LABELS[currentUser.role].border
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

        {/* User Role Profile & Quick Role Switcher Pill */}
        <div className="flex items-center gap-2 order-2 md:order-3 relative">
          {/* Nút chuyển đổi vai trò nhanh 1 chạm */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                switchRole("admin");
                setActiveView("admin");
              }}
              className={`px-2.5 py-1 rounded-xl transition ${
                isAdmin
                  ? "bg-rose-600 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-rose-600"
              }`}
              title="Chuyển sang vai trò Admin"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => {
                switchRole("teacher");
                setActiveView("bank");
              }}
              className={`px-2.5 py-1 rounded-xl transition ${
                isTeacher
                  ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-indigo-600"
              }`}
              title="Chuyển sang vai trò Giáo viên"
            >
              👨‍🏫 Giáo viên
            </button>
            <button
              type="button"
              onClick={() => {
                switchRole("student");
                setActiveView("student_portal");
              }}
              className={`px-2.5 py-1 rounded-xl transition ${
                isStudent
                  ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-emerald-600"
              }`}
              title="Chuyển sang vai trò Học sinh"
            >
              🎓 Học sinh
            </button>
          </div>

          {/* User Profile Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-2 p-1.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition shadow-2xs group"
              title="Bấm để chuyển đổi vai trò và tài khoản người dùng"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-xl object-cover border border-slate-300 group-hover:scale-105 transition"
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  {currentUser.name}
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
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
