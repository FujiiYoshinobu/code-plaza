import React, { useMemo, useState } from "react";
import { resolveAvatar, useAvatarOptions } from "../hooks/useAvatars";
import type { SessionState } from "../types";

interface AvatarProps {
  uid: string;
  name: string;
  avatarCode: string;
  message?: string;
  level: number;
  state: SessionState;
  isSelf: boolean;
  style: React.CSSProperties;
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarCode,
  message,
  level,
  state,
  isSelf,
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const options = useAvatarOptions();
  const avatar = useMemo(
    () => resolveAvatar(avatarCode, options),
    [avatarCode, options]
  );

  const statusText = state === "active" ? "活動中" : "休憩中";
  const statusEmoji = state === "active" ? "🟢" : "😴";

  // Arenaから渡された grid 座標を解釈
  const gridX = (style as any)["--grid-x"] ?? 1;
  const gridY = (style as any)["--grid-y"] ?? 1;

  const avatarNodeStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    placeSelf: "center",
    zIndex: 2,
    gridColumn: gridX,
    gridRow: gridY,
    transition:
      "grid-column 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), grid-row 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  };

  const avatarNameStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "2px",
    textAlign: "center",
    whiteSpace: "nowrap",
  };

  const avatarWrapperStyle: React.CSSProperties = {
    position: "relative",
    width: "16px",
    height: "16px",
  };

  const avatarImageStyle: React.CSSProperties = {
    width: "16px",
    height: "16px",
    borderRadius: "4px",
    background: "transparent",
    imageRendering: "pixelated",
    objectFit: "cover" as const,
    animation: isSelf
      ? "pulse 2s infinite"
      : state === "sleeping"
      ? "breathe 3s ease-in-out infinite"
      : undefined,
  };

  const avatarStatusStyle: React.CSSProperties = {
    position: "absolute",
    right: "-10px",
    bottom: "3px",
    fontSize: "12px",
    animation:
      state === "sleeping" ? "float 2s ease-in-out infinite" : undefined,
  };

  const avatarTooltipStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: isHovered
      ? "translateX(-50%) translateY(-8px)"
      : "translateX(-50%) translateY(4px)",
    minWidth: "120px",
    maxWidth: "180px",
    textAlign: "center",
    background:
      "linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(40, 40, 40, 0.9))",
    color: "white",
    padding: "6px 10px",
    borderRadius: "6px",
    opacity: isHovered ? 1 : 0,
    pointerEvents: "none",
    transition: "all 0.3s ease",
    fontSize: "11px",
    zIndex: 100,
  };

  return (
    <div
      style={avatarNodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={avatarNameStyle}>
        Lv.{level} {name}
      </span>
      <div style={avatarWrapperStyle}>
        <img src={avatar.src} alt={name} style={avatarImageStyle} />
        {state === "sleeping" && <span style={avatarStatusStyle}>💤</span>}
      </div>
      {isHovered && (
        <div style={avatarTooltipStyle}>
          {message && <div>"{message}"</div>}
          <div>
            {statusEmoji} {statusText} • レベル {level}
            {isSelf && " • あなた"}
          </div>
        </div>
      )}
    </div>
  );
};

export default Avatar;
