import React, { useState, useRef, useId } from "react";
import { EssayAnswer, EssayAttachment } from "../types/exam";
import { MathRenderer } from "./MathRenderer";
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  UploadCloud,
  Trash2,
  Eye,
  Download,
  Plus,
  HelpCircle,
  Sparkles,
  Maximize2,
  X,
  FileCheck,
  CheckCircle2,
} from "lucide-react";

interface EssayAnswerInputProps {
  questionId: string;
  value: any; // string hoặc EssayAnswer
  onChange: (value: EssayAnswer) => void;
  disabled?: boolean;
}

export const EssayAnswerInput: React.FC<EssayAnswerInputProps> = ({
  questionId,
  value,
  onChange,
  disabled = false,
}) => {
  // Chuẩn hóa giá trị hiện tại
  const essayValue: EssayAnswer = typeof value === "object" && value !== null
    ? { text: value.text || "", attachments: value.attachments || [] }
    : { text: typeof value === "string" ? value : "", attachments: [] };

  const [activeTab, setActiveTab] = useState<"write" | "upload">("write");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uniqueUploadId = useId();

  // Ký hiệu toán học chèn nhanh
  const quickMathSymbols = [
    { label: "$\\overrightarrow{u}$", code: "\\overrightarrow{u}" },
    { label: "$\\overrightarrow{AB}$", code: "\\overrightarrow{AB}" },
    { label: "$\\overrightarrow{0}$", code: "\\overrightarrow{0}" },
    { label: "$\\sqrt{x}$", code: "\\sqrt{x}" },
    { label: "$\\frac{a}{b}$", code: "\\frac{a}{b}" },
    { label: "$\\bot$", code: "\\bot " },
    { label: "$\\parallel$", code: "\\parallel " },
    { label: "$\\angle$", code: "\\widehat{ABC}" },
    { label: "$\\Delta$", code: "\\Delta" },
    { label: "$\\pi$", code: "\\pi" },
    { label: "$\\alpha$", code: "\\alpha" },
    { label: "$a^2$", code: "a^2" },
    { label: "$\\cdot$", code: "\\cdot " },
    { label: "$\\approx$", code: "\\approx " },
    { label: "$\\ne$", code: "\\ne " },
    { label: "$\\sin$", code: "\\sin " },
    { label: "$\\cos$", code: "\\cos " },
  ];

  // Xử lý thay đổi văn bản
  const handleTextChange = (newText: string) => {
    onChange({
      ...essayValue,
      text: newText,
    });
  };

  // Chèn công thức nhanh vào ô nhập
  const insertMathCode = (code: string) => {
    const prevText = essayValue.text;
    const separator = prevText && !prevText.endsWith(" ") ? " " : "";
    handleTextChange(prevText + separator + code + " ");
  };

  // Xác định định dạng tệp tin
  const detectFileType = (file: File): "image" | "pdf" | "word" | "other" => {
    const mime = file.type.toLowerCase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "heic"].includes(ext)) {
      return "image";
    }
    if (mime === "application/pdf" || ext === "pdf") {
      return "pdf";
    }
    if (
      mime.includes("word") ||
      mime.includes("officedocument") ||
      ["doc", "docx", "dot", "dotx", "odt"].includes(ext)
    ) {
      return "word";
    }
    return "other";
  };

  // Xử lý nạp file
  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;

    const newAttachments: EssayAttachment[] = [];
    const files = Array.from(fileList);

    let processedCount = 0;
    files.forEach((file) => {
      // Giới hạn dung lượng mỗi file 20MB
      if (file.size > 20 * 1024 * 1024) {
        alert(`Tệp "${file.name}" vượt quá dung lượng cho phép (tối đa 20MB).`);
        return;
      }

      const reader = new FileReader();
      const fileType = detectFileType(file);

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        newAttachments.push({
          id: "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          name: file.name,
          type: fileType,
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        });

        processedCount++;
        if (processedCount === files.length) {
          onChange({
            ...essayValue,
            attachments: [...(essayValue.attachments || []), ...newAttachments],
          });
        }
      };

      reader.readAsDataURL(file);
    });
  };

  // Xóa tệp đính kèm
  const handleRemoveAttachment = (id: string) => {
    if (disabled) return;
    const updated = (essayValue.attachments || []).filter((item) => item.id !== id);
    onChange({
      ...essayValue,
      attachments: updated,
    });
  };

  // Kích thước định dạng thân thiện
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const attachmentsCount = essayValue.attachments?.length || 0;

  return (
    <div className="flex flex-col gap-3 my-2" id={`essay-answer-container-${questionId}`}>
      {/* Thanh tab lựa chọn phương thức trả lời */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <button
            id={`btn-tab-write-${questionId}`}
            type="button"
            onClick={() => setActiveTab("write")}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
              activeTab === "write"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📝 Soạn thảo trực tiếp</span>
            {essayValue.text.trim().length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            id={`btn-tab-upload-${questionId}`}
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
              activeTab === "upload"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>📎 Đính kèm tệp / Ảnh chụp</span>
            {attachmentsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                {attachmentsCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 px-2 font-medium">
          <span>
            {essayValue.text.trim().length > 0 ? `${essayValue.text.length} ký tự` : "Chưa có nội dung"}
          </span>
          {attachmentsCount > 0 && (
            <span>• {attachmentsCount} tệp đính kèm</span>
          )}
        </div>
      </div>

      {/* GIAO DIỆN 1: SOẠN THẢO TRỰC TIẾP */}
      {activeTab === "write" && (
        <div className="flex flex-col gap-2.5">
          {/* Thanh công cụ chèn nhanh ký hiệu Toán học */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Chèn nhanh:</span>
            </span>
            {quickMathSymbols.map((btn) => (
              <button
                key={btn.code}
                type="button"
                onClick={() => insertMathCode(btn.code)}
                disabled={disabled}
                className="px-2 py-0.8 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-semibold transition"
              >
                <MathRenderer content={btn.label} inline />
              </button>
            ))}
          </div>

          {/* Ô nhập nội dung bài giải */}
          <div className="relative">
            <textarea
              id={`essay-textarea-${questionId}`}
              rows={6}
              disabled={disabled}
              value={essayValue.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Trình bày các bước lập luận, biến đổi hình học / tọa độ và kết luận tại đây (hỗ trợ công thức $...$)..."
              className="w-full p-4 rounded-2xl border border-slate-300 focus:border-indigo-500 font-medium text-sm outline-none bg-slate-50 focus:bg-white text-slate-800 transition shadow-2xs"
            />
          </div>

          {/* Live Preview KaTeX */}
          {essayValue.text.trim() && (
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs text-slate-800 space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                <Eye className="w-3.5 h-3.5" />
                <span>Xem trước định dạng công thức (Live KaTeX Preview):</span>
              </div>
              <div className="pt-1 text-slate-700 leading-relaxed font-normal">
                <MathRenderer content={essayValue.text} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* GIAO DIỆN 2: ĐÍNH KÈM TỆP TIN / ẢNH CHỤP */}
      {activeTab === "upload" && (
        <div className="flex flex-col gap-3">
          {/* Vùng kéo thả File Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              processFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? "border-indigo-600 bg-indigo-50"
                : "border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20"
            }`}
          >
            <input
              ref={fileInputRef}
              id={`essay-file-input-${uniqueUploadId}`}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                processFiles(e.target.files);
                if (e.target) e.target.value = "";
              }}
            />

            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm font-bold text-slate-800 mb-1">
              Kéo thả tập tin vào đây hoặc <span className="text-indigo-600 underline">bấm để chọn</span>
            </p>
            <p className="text-xs text-slate-500 font-medium max-w-md">
              Hỗ trợ tải lên <b>ảnh chụp bài làm</b> (PNG, JPG, WebP), <b>tài liệu PDF</b> (.pdf), và <b>tài liệu Word</b> (.docx, .doc). Dung lượng tối đa 20MB/file.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Ảnh chụp (JPG, PNG)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100 flex items-center gap-1">
                <FileCode className="w-3 h-3" /> Tài liệu PDF
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Microsoft Word (.docx)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH CÁC TỆP ĐÍNH KÈM HIỆN CÓ (Luôn hiển thị ở dưới để học sinh nắm rõ) */}
      {attachmentsCount > 0 && (
        <div className="mt-1 p-3 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Tệp đính kèm đã nạp ({attachmentsCount}):</span>
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm tệp
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {essayValue.attachments?.map((att) => {
              const isImg = att.type === "image";
              const isPdf = att.type === "pdf";
              const isWord = att.type === "word";

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 gap-2 hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Thumbnail hoặc Icon */}
                    {isImg ? (
                      <div
                        onClick={() => setPreviewImageModal(att.dataUrl)}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0 cursor-pointer relative group"
                        title="Bấm để xem phóng to"
                      >
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : isPdf ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        PDF
                      </div>
                    ) : isWord ? (
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        DOC
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}

                    {/* Thông tin tệp */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                        {att.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatFileSize(att.size)} • lúc {att.uploadedAt}
                      </p>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isImg && (
                      <button
                        type="button"
                        onClick={() => setPreviewImageModal(att.dataUrl)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Xem phóng to ảnh"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <a
                      href={att.dataUrl}
                      download={att.name}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Tải tệp xuống"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Xóa tệp này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal phóng to xem ảnh chụp bài làm (Lightbox) */}
      {previewImageModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center px-3 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Xem trước ảnh chụp bài làm</span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[75vh] flex justify-center">
              <img
                src={previewImageModal}
                alt="Ảnh phóng to"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
