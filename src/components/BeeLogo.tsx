import React from "react";

interface BeeLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

/**
 * Logo con ong cách điệu (Stylized Bee Logo)
 * Thiết kế hình học hiện đại, phối màu vàng kim (Amber/Gold), cánh ngọc bích mờ và sọc xanh đêm sang trọng.
 */
export const BeeLogo: React.FC<BeeLogoProps> = ({
  className = "w-10 h-10",
  size = 40,
  animated = false,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-md shadow-amber-500/20 border border-amber-300/40 p-1.5 transition-transform duration-300 ${
        animated ? "hover:scale-110 hover:rotate-3" : ""
      } ${className}`}
      style={{ width: size, height: size }}
      title="MPEduCenter - Logo Con Ong Trí Tuệ"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        {/* Gradients */}
        <defs>
          <linearGradient id="beeBodyGrad" x1="14" y1="14" x2="34" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id="wingLeftGrad" x1="8" y1="10" x2="22" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="wingRightGrad" x1="40" y1="10" x2="26" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="stripeGrad" x1="16" y1="16" x2="32" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Cánh trái cách điệu hình giọt nước/elip đa tầng */}
        <path
          d="M21 21C16 13 8 12 7 17C6 22 13 25 21 23Z"
          fill="url(#wingLeftGrad)"
          stroke="#BAE6FD"
          strokeWidth="1.2"
          className="opacity-90"
        />
        <path
          d="M19 22C14 17 9 17 8 20C7 23 12 25 19 23Z"
          fill="#FFFFFF"
          fillOpacity="0.4"
        />

        {/* Cánh phải cách điệu đối xứng */}
        <path
          d="M27 21C32 13 40 12 41 17C42 22 35 25 27 23Z"
          fill="url(#wingRightGrad)"
          stroke="#BAE6FD"
          strokeWidth="1.2"
          className="opacity-90"
        />
        <path
          d="M29 22C34 17 39 17 40 20C41 23 36 25 29 23Z"
          fill="#FFFFFF"
          fillOpacity="0.4"
        />

        {/* Cặp râu ăng-ten con ong */}
        <path
          d="M21 15C19 10 16 9 14 10"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="14" cy="10" r="1.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="1" />

        <path
          d="M27 15C29 10 32 9 34 10"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="34" cy="10" r="1.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="1" />

        {/* Thân con ong hình oval / nhộng tròn cách điệu */}
        <ellipse
          cx="24"
          cy="26"
          rx="9"
          ry="12"
          fill="url(#beeBodyGrad)"
          stroke="#D97706"
          strokeWidth="1.2"
        />

        {/* Ngòi ong sắc nét ở đáy */}
        <path
          d="M22.5 37.5L24 41L25.5 37.5Z"
          fill="#0F172A"
        />

        {/* Sọc đen cách điệu 1 (ngực) */}
        <path
          d="M16 22C18.5 23.5 29.5 23.5 32 22C32.5 23.2 32.7 24.5 32.7 25.5C30 26.8 18 26.8 15.3 25.5C15.3 24.5 15.5 23.2 16 22Z"
          fill="url(#stripeGrad)"
        />

        {/* Sọc đen cách điệu 2 (bụng) */}
        <path
          d="M16.5 29C19 30.5 29 30.5 31.5 29C31 31.2 29.5 33.2 27.5 34.5C25.5 35 22.5 35 20.5 34.5C18.5 33.2 17 31.2 16.5 29Z"
          fill="url(#stripeGrad)"
        />

        {/* Đôi mắt tinh anh thông minh */}
        <circle cx="21" cy="17" r="1.4" fill="#0F172A" />
        <circle cx="20.6" cy="16.6" r="0.5" fill="#FFFFFF" />

        <circle cx="27" cy="17" r="1.4" fill="#0F172A" />
        <circle cx="26.6" cy="16.6" r="0.5" fill="#FFFFFF" />

        {/* Ánh sáng điểm nhấn ở đầu (Highlight) */}
        <ellipse cx="24" cy="15" rx="3.5" ry="1.2" fill="#FFFFFF" fillOpacity="0.45" />
      </svg>
    </div>
  );
};
