import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  User,
  Camera,
  Upload,
  Sparkles,
  Check,
  RefreshCw,
  Link as LinkIcon,
  Smile,
  ShieldCheck,
  Award,
  GraduationCap,
  Save,
  X,
  UserCheck,
} from "lucide-react";
import { ROLE_LABELS } from "../types/auth";

// Danh mục Avatar tuyển chọn sẵn
const PRESET_AVATARS = [
  // Học sinh
  {
    category: "Học sinh",
    items: [
      { id: "stu_1", label: "Nam sinh 1", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80" },
      { id: "stu_2", label: "Nữ sinh 1", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80" },
      { id: "stu_3", label: "Nam sinh 2", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" },
      { id: "stu_4", label: "Nữ sinh 2", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80" },
      { id: "stu_5", label: "Nam sinh 3", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80" },
      { id: "stu_6", label: "Nữ sinh 3", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80" },
    ],
  },
  // Giáo viên & Quản trị
  {
    category: "Thầy Cô & Quản trị",
    items: [
      { id: "tea_1", label: "Thầy giáo 1", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80" },
      { id: "tea_2", label: "Cô giáo 1", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80" },
      { id: "tea_3", label: "Quản trị viên", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80" },
      { id: "tea_4", label: "Thầy giáo 2", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" },
      { id: "tea_5", label: "Cô giáo 2", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80" },
      { id: "tea_6", label: "Chuyên gia Toán", url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80" },
    ],
  },
  // Hoạt hình & Chibi
  {
    category: "Chibi & Phong cách Toán học",
    items: [
      { id: "ani_1", label: "Ong Vàng Thông Thái", url: "https://api.dicebear.com/7.x/bottts/svg?seed=MathBee&backgroundColor=fef08a" },
      { id: "ani_2", label: "Toán học Einstein", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Einstein&top=curly&facialHair=magnum" },
      { id: "ani_3", label: "Toán học Newton", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Newton&top=longHair&accessories=round" },
      { id: "ani_4", label: "Robot Tính Toán", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Calculator&backgroundColor=bae6fd" },
      { id: "ani_5", label: "Học sinh Chăm chỉ", url: "https://api.dicebear.com/7.x/micah/svg?seed=ScholarStudent&backgroundColor=fed7aa" },
      { id: "ani_6", label: "Ong Thợ Toán", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=GoldenBee&backgroundColor=fef08a" },
    ],
  },
];

export const UserProfileModal: React.FC = () => {
  const {
    currentUser,
    updateUserAvatar,
    updateUser,
    showProfileModal,
    setShowProfileModal,
  } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"preset" | "upload" | "dicebear" | "url" | "info">("preset");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(currentUser.avatar);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [diceSeed, setDiceSeed] = useState<string>(currentUser.name || "MathStudent");
  const [diceStyle, setDiceStyle] = useState<string>("avataaars");

  // Form thông tin cá nhân
  const [nameInput, setNameInput] = useState<string>(currentUser.name);
  const [phoneInput, setPhoneInput] = useState<string>(currentUser.phone || "");
  const [classInput, setClassInput] = useState<string>(currentUser.schoolClass || "12A1");
  const [subjectInput, setSubjectInput] = useState<string>(currentUser.subject || "Toán học THPT");
  const [bioInput, setBioInput] = useState<string>(currentUser.bio || "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showProfileModal) return null;

  // Xử lý upload ảnh từ thiết bị
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Tệp không hợp lệ", "Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước quá lớn", "Dung lượng ảnh tối đa là 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Nén và resize ảnh thành hình vuông 256x256 tối ưu
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        if (ctx) {
          // Tính toán căn giữa và cắt vuông
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const base64Url = canvas.toDataURL("image/jpeg", 0.88);
          setSelectedAvatarUrl(base64Url);
          toast.success("Đã tải ảnh lên!", "Xem trước ảnh đại diện bên dưới.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Tạo DiceBear Avatar URL
  const generateDicebearUrl = (style: string, seed: string) => {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=e0e7ff,fef08a,dcfce7,fee2e2`;
  };

  const handleRandomizeDicebear = () => {
    const randomSeed = "Math_" + Math.random().toString(36).substring(2, 8);
    setDiceSeed(randomSeed);
    const newUrl = generateDicebearUrl(diceStyle, randomSeed);
    setSelectedAvatarUrl(newUrl);
  };

  // Lưu toàn bộ thông tin & ảnh đại diện
  const handleSaveAll = () => {
    updateUser(currentUser.id, {
      name: nameInput.trim() || currentUser.name,
      phone: phoneInput.trim() || undefined,
      schoolClass: currentUser.role === "student" ? classInput.trim() : currentUser.schoolClass,
      subject: currentUser.role === "teacher" ? subjectInput.trim() : currentUser.subject,
      bio: bioInput.trim() || undefined,
      avatar: selectedAvatarUrl || currentUser.avatar,
    });

    toast.success("Hồ sơ đã cập nhật!", "Thông tin cá nhân và ảnh đại diện đã được lưu thành công.");
    setShowProfileModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={selectedAvatarUrl}
                alt="Avatar"
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md bg-white"
              />
              <span className="absolute -bottom-1 -right-1 p-0.5 bg-indigo-600 rounded-full border border-white text-white">
                <Camera className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>Hồ sơ & Thay đổi Hình đại diện</span>
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <span className="truncate max-w-[200px]">{currentUser.name}</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{ROLE_LABELS[currentUser.role].title}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowProfileModal(false)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2.5 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === "preset"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Kho Avatar có sẵn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === "upload"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải ảnh từ máy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dicebear")}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === "dicebear"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Tạo Avatar Chibi/AI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === "url"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link URL ảnh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === "info"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Thông tin cá nhân</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Tab 1: Kho Avatar có sẵn */}
          {activeTab === "preset" && (
            <div className="space-y-5">
              <div className="text-xs text-slate-500">
                Chọn một trong các ảnh đại diện chất lượng cao dưới đây:
              </div>

              {PRESET_AVATARS.map((group) => (
                <div key={group.category} className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>{group.category}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {group.items.map((item) => {
                      const isSelected = selectedAvatarUrl === item.url;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedAvatarUrl(item.url)}
                          className={`group relative rounded-2xl p-1.5 border-2 transition flex flex-col items-center gap-1.5 ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-300"
                              : "border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.label}
                            className="w-16 h-16 rounded-xl object-cover group-hover:scale-105 transition"
                          />
                          <span className="text-[10px] font-semibold text-slate-600 truncate max-w-full text-center">
                            {item.label}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-xs">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Upload từ máy tính */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <div className="p-8 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl bg-slate-50/70 hover:bg-indigo-50/30 transition text-center flex flex-col items-center justify-center gap-3 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Bấm vào đây để chọn ảnh hoặc kéo thả ảnh vào vùng này
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hỗ trợ định dạng PNG, JPG, JPEG, WebP (Tự động cắt vuông và tối ưu 256x256)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Preview ảnh hiện tại */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                <img
                  src={selectedAvatarUrl}
                  alt="Xem trước"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-sm"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Ảnh đại diện đang được chọn</div>
                  <div className="text-[11px] text-slate-500">
                    Ảnh này sẽ xuất hiện trên thanh điều hướng, bảng điểm và phòng thi.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: DiceBear Avatar Generator */}
          {activeTab === "dicebear" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Tự động tạo hình đại diện phong cách Vector / Chibi với thuật toán thông minh:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phong cách nhân vật
                  </label>
                  <select
                    value={diceStyle}
                    onChange={(e) => {
                      setDiceStyle(e.target.value);
                      setSelectedAvatarUrl(generateDicebearUrl(e.target.value, diceSeed));
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="avataaars">Avataaars (Học sinh/Thầy cô Chibi)</option>
                    <option value="bottts">Bottts (Robot Ong Vàng Toán học)</option>
                    <option value="micah">Micah (Hình học tối giản nghệ thuật)</option>
                    <option value="lorelei">Lorelei (Chân dung anime thanh lịch)</option>
                    <option value="fun-emoji">Fun Emoji (Khuôn mặt biểu cảm vui vẻ)</option>
                    <option value="thumbs">Thumbs (Ngón tay chiến binh Toán)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Từ khóa tạo hình (Seed)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={diceSeed}
                      onChange={(e) => {
                        setDiceSeed(e.target.value);
                        setSelectedAvatarUrl(generateDicebearUrl(diceStyle, e.target.value));
                      }}
                      placeholder="Nhập tên hoặc từ khóa..."
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeDicebear}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                      title="Đổi ngẫu nhiên"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ngẫu nhiên</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-center gap-4">
                <img
                  src={selectedAvatarUrl}
                  alt="DiceBear Preview"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-400 bg-white shadow-md p-1"
                />
                <div>
                  <div className="text-xs font-bold text-indigo-900">Xem trước Avatar Vector</div>
                  <div className="text-[11px] text-indigo-700">
                    Phong cách: {diceStyle} • Hạt giống: "{diceSeed}"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Link URL trực tiếp */}
          {activeTab === "url" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nhập đường link hình ảnh trực tiếp (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customUrlInput.trim()) return;
                      setSelectedAvatarUrl(customUrlInput.trim());
                      toast.info("Đã nạp ảnh từ URL", "Xem trước ảnh bên dưới.");
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                <img
                  src={selectedAvatarUrl}
                  alt="Custom Preview"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-sm"
                  onError={() => {
                    toast.error("Lỗi tải ảnh", "Không thể tải ảnh từ đường dẫn vừa nhập.");
                  }}
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Ảnh đang được hiển thị</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[320px]">
                    {selectedAvatarUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Cập nhật Thông tin cá nhân */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên hiển thị
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại / Zalo
                  </label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {currentUser.role === "student" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lớp học
                    </label>
                    <input
                      type="text"
                      value={classInput}
                      onChange={(e) => setClassInput(e.target.value)}
                      placeholder="12A1"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bộ môn phụ trách
                    </label>
                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      placeholder="Toán học THPT"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lời giới thiệu / Mục tiêu điểm số
                </label>
                <textarea
                  rows={2}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Mục tiêu đạt 9+ môn Toán kỳ thi Tốt nghiệp THPT..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowProfileModal(false)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Lưu ảnh & Hồ sơ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
