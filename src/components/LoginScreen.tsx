import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BeeLogo } from "./BeeLogo";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
  GraduationCap,
  Sparkles,
  Check,
  Copy,
  School,
  KeyRound,
  User,
  ArrowRight,
} from "lucide-react";

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "contact">("login");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailOrUsername.trim() || !password.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ Email / Tên đăng nhập và Mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = login(emailOrUsername.trim(), password.trim(), rememberMe);
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    }, 150);
  };

  const handleCopyFbLink = () => {
    navigator.clipboard.writeText("https://www.facebook.com/you.tu.104418");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col justify-between text-slate-100 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <BeeLogo size={44} animated={true} />
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              <span>MPEduCenter</span>
              <span className="text-amber-400">-Test</span>
            </h1>
            <p className="text-[11px] text-slate-300 font-medium hidden sm:block">
              Hệ thống khảo thí & thi trực tuyến chuẩn Bộ GD&ĐT 2018
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Chưa có tài khoản?</span>
            <span>Cấp tài khoản HS</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 my-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Top Banner */}
          <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-center relative">
            <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 shadow-inner mb-3">
              <BeeLogo size={38} animated={true} />
            </div>
            <h2 className="text-xl font-black tracking-tight flex items-center justify-center gap-1.5">
              <span>Đăng Nhập Hệ Thống</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
              Vui lòng đăng nhập tài khoản để vào luyện thi và xem kết quả học tập
            </p>

            {/* Mode Switch Tabs */}
            <div className="flex bg-black/30 p-1 rounded-xl mt-4 border border-white/10 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "login"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("contact");
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "contact"
                    ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Nhận tài khoản</span>
              </button>
            </div>
          </div>

          {/* Card Content Body */}
          <div className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {activeTab === "login" ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Input Email / Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email hoặc Tên đăng nhập / Mã học sinh</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="Ví dụ: nam.nh@student.vn hoặc admin@edulink.vn..."
                      className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Input Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mật khẩu</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("contact")}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu của bạn..."
                      className="w-full px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Checkbox Ghi nhớ đăng nhập */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Ghi nhớ đăng nhập cho lần sau
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Tự động nạp khi quay lại)
                  </span>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <span className="inline-block animate-spin mr-1">⏳</span>
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Đăng nhập vào hệ thống</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* Tab Hướng dẫn nhận tài khoản học sinh */
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300/80 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                      Quy Định Cấp Tài Khoản Học Sinh
                    </h4>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    Hệ thống kiểm soát danh sách lớp và điểm thi chặt chẽ. Học sinh vui lòng liên hệ{" "}
                    <strong>Thầy Trần Đình Phương</strong> để nhận tên đăng nhập & mật khẩu.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                      TP
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Phụ trách Khảo thí & Cấp tài khoản:
                      </div>
                      <div className="text-sm font-black text-slate-900 flex items-center gap-1">
                        <span>Thầy Trần Đình Phương</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="text-[11px] text-indigo-700 font-medium">
                        MPEduCenter-Test Portal
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>Facebook liên hệ trực tiếp:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyFbLink}
                        className="text-[10px] font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Đã chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <a
                      href="https://www.facebook.com/you.tu.104418"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs font-mono font-bold text-blue-600 hover:text-blue-800 break-all bg-blue-50/50 p-2 rounded-lg border border-blue-100 hover:bg-blue-50 transition"
                    >
                      https://www.facebook.com/you.tu.104418
                    </a>
                  </div>

                  <div className="space-y-1 text-xs text-slate-700">
                    <div className="font-bold text-slate-900">
                      Nội dung tin nhắn cần gửi cho Thầy:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-slate-600">
                      <li>Họ và tên đầy đủ của học sinh</li>
                      <li>Lớp học (Ví dụ: <em>12A1, 11A2, 10A1...</em>)</li>
                      <li>Trường THPT đang theo học</li>
                    </ul>
                  </div>

                  <a
                    href="https://www.facebook.com/you.tu.104418"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Nhắn tin Facebook Thầy Phương</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    ← Đã có tài khoản? Quay lại màn hình đăng nhập
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-slate-400" />
              <span>Cổng Khảo Thí Trực Tuyến</span>
            </div>
            <span>Bảo mật chuẩn GDPT 2018</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-400 font-medium z-10">
        © {new Date().getFullYear()} MPEduCenter-Test. Hệ thống khảo thí Toán học THPT 4 dạng thức.
      </footer>
    </div>
  );
};
