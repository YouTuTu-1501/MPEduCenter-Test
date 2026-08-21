import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BeeLogo } from "./BeeLogo";
import {
  LogIn,
  Mail,
  Lock,
  UserPlus,
  ShieldCheck,
  Award,
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { STANDARD_CLASSES } from "../types/exam";

export const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    setShowAuthModal,
    login,
    register,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form đăng ký tài khoản học sinh mới
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regSchoolClass, setRegSchoolClass] = useState("12A1");
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customSchoolClass, setCustomSchoolClass] = useState("");

  if (!showAuthModal) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ Email và Mật khẩu.");
      return;
    }

    const res = login(email.trim(), password.trim());
    if (res.success) {
      setShowAuthModal(false);
      setEmail("");
      setPassword("");
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("Mật khẩu phải có độ dài tối thiểu 6 ký tự.");
      return;
    }

    const finalClass = isCustomClass
      ? customSchoolClass.trim() || "12A1"
      : regSchoolClass;

    // Đăng ký trực tuyến chỉ dành cho tài khoản học sinh
    const res = register({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: "student",
      schoolClass: finalClass,
    });

    if (res.success) {
      setShowAuthModal(false);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
    } else {
      setErrorMessage(res.message);
    }
  };

  const fillQuickAccount = (quickEmail: string, quickPass: string = "123456") => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BeeLogo size={42} animated={true} />
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-1.5">
                <span>MPEduCenter-Test</span>
                <span className="text-xs font-normal text-amber-400">| Xác thực</span>
              </h3>
              <p className="text-xs text-slate-400">
                {mode === "login"
                  ? "Đăng nhập để vào hệ thống theo quyền hạn"
                  : "Tạo tài khoản mới vào hệ thống thi trực tuyến"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Tab switch Đăng nhập / Đăng ký */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold transition flex items-center gap-2 border-b-2 ${
              mode === "login"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold transition flex items-center gap-2 border-b-2 ${
              mode === "register"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Đăng ký Học sinh</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Địa chỉ Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@edulink.vn hoặc email của bạn..."
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mật khẩu</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (mặc định: 123456)..."
                    className="w-full px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </button>
              </div>

              {/* Danh sách tài khoản mẫu để điền nhanh mật khẩu */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Gợi ý tài khoản kiểm thử (Bấm vào để tự điền):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillQuickAccount("admin@edulink.vn", "123456")}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition flex flex-col"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </div>
                    <span className="text-[10px] text-slate-600 truncate">admin@edulink.vn</span>
                    <span className="text-[9px] text-slate-400 font-mono">Pass: 123456</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillQuickAccount("toan.tran@edulink.vn", "123456")}
                    className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition flex flex-col"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                      <Award className="w-3.5 h-3.5" />
                      <span>Giáo viên</span>
                    </div>
                    <span className="text-[10px] text-slate-600 truncate">toan.tran@edulink.vn</span>
                    <span className="text-[9px] text-slate-400 font-mono">Pass: 123456</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillQuickAccount("nam.nh@student.vn", "123456")}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition flex flex-col"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Học sinh 12A1</span>
                    </div>
                    <span className="text-[10px] text-slate-600 truncate">nam.nh@student.vn</span>
                    <span className="text-[9px] text-slate-400 font-mono">Pass: 123456</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Thông báo vai trò chỉ dành cho học sinh */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
                <GraduationCap className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span>Đăng ký Tài khoản Thí sinh / Học sinh</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-black text-[10px]">
                      Học sinh
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    Tài khoản <b>Giáo viên</b> và <b>Quản trị viên (Admin)</b> được tạo và phân quyền tập trung bởi Quản trị viên nhà trường trong mục Quản trị.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="hocsinh@student.vn"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Lớp học */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Lớp học <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomClass(!isCustomClass)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {isCustomClass ? "← Chọn từ danh sách" : "+ Nhập lớp khác"}
                  </button>
                </div>

                {isCustomClass ? (
                  <input
                    type="text"
                    required
                    value={customSchoolClass}
                    onChange={(e) => setCustomSchoolClass(e.target.value)}
                    placeholder="Nhập tên lớp của bạn (ví dụ: 12A5, 11B3...)"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <select
                    value={regSchoolClass}
                    onChange={(e) => setRegSchoolClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STANDARD_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        Lớp {cls}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhập lại mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Hoàn tất đăng ký Học sinh & Đăng nhập</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Bảo mật phân quyền <strong>MPEduCenter-Test</strong>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
            className="px-4 py-1 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
