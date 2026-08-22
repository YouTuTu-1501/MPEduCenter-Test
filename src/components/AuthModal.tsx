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
  UserCheck,
  Copy,
  Check,
  School,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export const AuthModal: React.FC = () => {
  const {
    showAuthModal,
    setShowAuthModal,
    login,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "contact">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!showAuthModal) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ Email / Tên đăng nhập và Mật khẩu.");
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

  const handleCopyFbLink = () => {
    navigator.clipboard.writeText("https://www.facebook.com/you.tu.104418");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BeeLogo size={42} animated={true} />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-1.5">
                <span>MPEduCenter-Test</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Hệ Thống Thi
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {mode === "login"
                  ? "Đăng nhập hệ thống khảo thí & thi trực tuyến"
                  : "Thông tin liên hệ Thầy Trần Đình Phương để nhận tài khoản"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Tab switch Đăng nhập / Liên hệ cấp tài khoản */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-extrabold transition flex items-center gap-2 border-b-2 ${
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
              setMode("contact");
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs sm:text-sm font-extrabold transition flex items-center gap-2 border-b-2 ${
              mode === "contact"
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Cấp tài khoản học sinh</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
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
                  <span>Email hoặc Tên đăng nhập</span>
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email hoặc tên tài khoản được cấp..."
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
                    placeholder="Nhập mật khẩu của bạn..."
                    className="w-full px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </button>
              </div>

              {/* Thông tin hỗ trợ học sinh */}
              <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Bạn chưa có tài khoản hoặc quên mật khẩu?</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Học sinh không được tự đăng ký tài khoản tự do. Tài khoản được cấp tập trung bởi{" "}
                  <strong>Thầy Trần Đình Phương</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setMode("contact")}
                  className="inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:text-indigo-900 underline text-xs"
                >
                  <span>Xem thông tin liên hệ Thầy Phương để nhận tài khoản →</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Card thông báo quy định cấp tài khoản */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300/80 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-amber-950 text-xs sm:text-sm">
                      Quy Định Đăng Ký & Cấp Tài Khoản
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Bảo mật danh sách lớp & kiểm soát kết quả thi
                    </p>
                  </div>
                </div>

                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  Hệ thống <strong>không cho phép học sinh tự đăng ký tài khoản tự do</strong> để đảm bảo
                  tính xác thực, xếp đúng lớp và bảo mật dữ liệu điểm thi. Tất cả tài khoản phải do{" "}
                  <strong className="text-indigo-900">Thầy giáo / Quản trị viên</strong> khởi tạo và cấp quyền.
                </p>
              </div>

              {/* Thông tin liên hệ Thầy Trần Đình Phương */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                    TP
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Người quản trị & cấp tài khoản:
                    </div>
                    <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                      <span>Thầy Trần Đình Phương</span>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold">
                      Phụ trách Chuyên môn & Khảo thí Trực tuyến
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-blue-600" />
                      <span>Facebook liên hệ trực tiếp:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyFbLink}
                      className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Đã chép link!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép link</span>
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

                {/* Các bước học sinh cần nhắn tin */}
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span>Học sinh vui lòng nhắn tin cho Thầy với nội dung sau:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                    <li>
                      <strong>Họ và tên đầy đủ</strong> của học sinh.
                    </li>
                    <li>
                      <strong>Lớp học</strong> (Ví dụ: <em>12A1, 12A2, 11A4, 10A1...</em>).
                    </li>
                    <li>
                      <strong>Trường đang học</strong> và mục đích tham gia kiểm tra.
                    </li>
                  </ul>
                  <p className="text-[10px] text-slate-500 italic pt-1">
                    * Thầy Trần Đình Phương sẽ gửi tên đăng nhập & mật khẩu ngay sau khi xác nhận thông tin.
                  </p>
                </div>

                {/* Nút bấm chuyển hướng nhanh tới Facebook */}
                <div className="pt-2">
                  <a
                    href="https://www.facebook.com/you.tu.104418"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Mở Facebook Thầy Trần Đình Phương</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-slate-400" />
            <span>MPEduCenter-Test Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {mode === "contact" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition text-xs flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Quay lại Đăng nhập</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
