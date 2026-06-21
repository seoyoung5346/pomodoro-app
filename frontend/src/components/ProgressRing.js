import React from "react";

/**
 * progress: 0~1 (0 = 시작, 1 = 완료)
 * mode: "focus" (토마토가 빨갛게 익어감) | "break" (파가 초록빛으로 자람)
 */
export default function ProgressRing({ progress, mode, label, sublabel }) {
  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const dashOffset = circumference * (1 - clamped);

  const isFocus = mode === "focus";
  const trackColor = isFocus ? "var(--tomato-pale)" : "var(--leek-pale)";
  const fillColor = isFocus ? "var(--tomato)" : "var(--leek-green)";

  return (
    <div className="progress-ring-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${isFocus ? "집중" : "휴식"} 진행률 ${Math.round(clamped * 100)}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.4s linear" }}
        />
      </svg>

      <div className="progress-ring-center">
        <span className="progress-emoji" aria-hidden="true">
          {isFocus ? ripeTomatoEmoji(clamped) : growingLeekEmoji(clamped)}
        </span>
        <span className="progress-time">{label}</span>
        {sublabel && <span className="progress-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
}

function ripeTomatoEmoji(progress) {
  if (progress < 0.34) return "🍏";
  if (progress < 0.7) return "🍅";
  return "🍅";
}

function growingLeekEmoji(progress) {
  if (progress < 0.5) return "🌱";
  return "🌿";
}
