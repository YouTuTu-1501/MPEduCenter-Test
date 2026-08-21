import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { UserRole, ROLE_LABELS } from "../types/auth";
import { BeeLogo } from "./BeeLogo";
import {
  ShieldAlert,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  X,
  LogIn,
  Users,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Award,
} from "lucide-react";

export const RoleSwitcherModal: React.FC = () => {
  const {
    currentUser,
    users,
    switchUser,
    switchRole,
    login,
    showRoleModal,
    setShowRoleModal,
  } = useAuth();

  const [inputEmail, setInputEmail] = useState("");
  const [selectedTab, setSelectedTab] = useState<"quick" | "all_users" | "login">("quick");

  if (!showRoleModal) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    const ok = login(inputEmail.trim());
    if (ok) {
      setShowRoleModal(false);
      setInputEmail("");
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="w-5 h-5 text-rose-600" />;
      case "teacher":
        return <Award className="w-5 h-5 text-indigo-600" />;
      case "student":
        return <GraduationCap className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BeeLogo size={40} />
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-1.5">
                <span>MPEduCenter-Test</span>
                <span className="text-xs font-normal text-slate-400">| Phân quyền 3 cấp</span>
              </h3>
              <p className="text-xs text-slate-400">
                Hệ thống hỗ trợ 3 cấp quyền: <strong className="text-rose-400">Admin</strong>,{" "}
                <strong className="text-indigo-400">Giáo viên</strong> và{" "}
                <strong className="text-emerald-400">Học sinh</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRoleModal(false)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setSelectedTab("quick")}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              selectedTab === "quick"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Chuyển nhanh 3 cấp (1 Chạm)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("all_users")}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              selectedTab === "all_users"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh sách tài khoản ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("login")}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              selectedTab === "login"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập Email</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Tài khoản đang kích hoạt */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{currentUser.name}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      ROLE_LABELS[currentUser.role].color
                    }`}
                  >
                    {ROLE_LABELS[currentUser.role].badge}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {currentUser.email} •{" "}
                  {currentUser.schoolClass
                    ? `Lớp ${currentUser.schoolClass}`
                    : currentUser.subject || "Quản trị hệ thống"}
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Đang hoạt động</span>
            </div>
          </div>

          {/* TAB 1: QUICK SWITCH 3 ROLES */}
          {selectedTab === "quick" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chọn vai trò để kiểm thử phân quyền ngay lập tức:
              </div>

              {/* Card 1: Admin */}
              <div
                onClick={() => {
                  switchRole("admin");
                  setShowRoleModal(false);
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 hover:shadow-md ${
                  currentUser.role === "admin"
                    ? "border-rose-500 bg-rose-50/40"
                    : "border-slate-200 hover:border-rose-300 bg-white"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">👑 Quản trị viên (Admin)</span>
                      <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded-md">
                        Full Access
                      </span>
                    </div>
                    {currentUser.role === "admin" && (
                      <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đang dùng
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Quản lý toàn bộ người dùng, duyệt đề thi, sao lưu dữ liệu, xem toàn bộ báo cáo và phân quyền trường học.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Quản lý tài khoản
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Duyệt ngân hàng đề
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Cấu hình hệ thống
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Giáo viên */}
              <div
                onClick={() => {
                  switchRole("teacher");
                  setShowRoleModal(false);
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 hover:shadow-md ${
                  currentUser.role === "teacher"
                    ? "border-indigo-500 bg-indigo-50/40"
                    : "border-slate-200 hover:border-indigo-300 bg-white"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">👨‍🏫 Giáo viên (Teacher)</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-md">
                        Tạo & Giảng dạy
                      </span>
                    </div>
                    {currentUser.role === "teacher" && (
                      <span className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đang dùng
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Soạn đề thi LaTeX 4 dạng thức, trình chiếu câu hỏi tương tác, mở phòng thi Live đồng bộ, chấm điểm tự luận và xem biểu đồ phân tích.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Ngân hàng đề
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Trình chiếu câu hỏi
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Phòng thi Live
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Chấm thi & Báo cáo
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Học sinh */}
              <div
                onClick={() => {
                  switchRole("student");
                  setShowRoleModal(false);
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 hover:shadow-md ${
                  currentUser.role === "student"
                    ? "border-emerald-500 bg-emerald-50/40"
                    : "border-slate-200 hover:border-emerald-300 bg-white"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">🎓 Học sinh (Student)</span>
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded-md">
                        Làm bài & Luyện tập
                      </span>
                    </div>
                    {currentUser.role === "student" && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đang dùng
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Giao diện tinh gọn dành riêng cho học sinh: làm bài thi trực tuyến 4 dạng thức, vẽ hình/tải bài tự luận, nhập PIN vào phòng thi Live và xem lịch sử điểm số.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Làm bài thi trực tuyến
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Phòng thi Live (PIN)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      Lịch sử & Lời giải
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL USERS LIST */}
          {selectedTab === "all_users" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chọn người dùng cụ thể trong hệ thống để đăng nhập:
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {users.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isLocked = user.status === "locked";
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (!isLocked) {
                          switchUser(user.id);
                          setShowRoleModal(false);
                        }
                      }}
                      className={`p-3.5 flex items-center justify-between transition ${
                        isLocked
                          ? "opacity-50 bg-slate-100 cursor-not-allowed"
                          : isCurrent
                          ? "bg-indigo-50/50 cursor-pointer"
                          : "hover:bg-slate-50 cursor-pointer bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900">
                              {user.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                                ROLE_LABELS[user.role].bgLight
                              } ${ROLE_LABELS[user.role].textDark}`}
                            >
                              {ROLE_LABELS[user.role].badge}
                            </span>
                            {isLocked && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded-md">
                                Khóa
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {user.email} •{" "}
                            {user.schoolClass
                              ? `Lớp ${user.schoolClass}`
                              : user.subject || "Quản trị viên"}
                          </div>
                        </div>
                      </div>
                      <div>
                        {isCurrent ? (
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-100/70 px-2.5 py-1 rounded-lg">
                            Đang dùng
                          </span>
                        ) : isLocked ? (
                          <span className="text-xs text-rose-500 font-semibold">Tạm dừng</span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition"
                          >
                            Đăng nhập
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LOGIN FORM */}
          {selectedTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-800">
                <strong>Gợi ý Email kiểm thử nhanh:</strong>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-700">
                  <li>
                    Admin: <code className="font-mono bg-white px-1.5 py-0.5 rounded">admin@edulink.vn</code>
                  </li>
                  <li>
                    Giáo viên:{" "}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded">toan.tran@edulink.vn</code>
                  </li>
                  <li>
                    Học sinh:{" "}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded">nam.nh@student.vn</code>
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ Email tài khoản
                </label>
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="Nhập email tài khoản (ví dụ: admin@edulink.vn)..."
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Xác nhận Đăng nhập</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Hệ thống phân quyền <strong>3 cấp RBAC</strong> MPEduCenter-Test
          </div>
          <button
            type="button"
            onClick={() => setShowRoleModal(false)}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
