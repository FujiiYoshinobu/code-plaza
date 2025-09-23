import React, { useMemo, useState } from "react";
import {
  isAvatarUnlocked,
  resolveAvatar,
  useAvatarOptions,
} from "../hooks/useAvatars";
import type { StoredProfile } from "../types";

interface ProfileProps {
  initialProfile: StoredProfile | null;
  onSubmit: (profile: StoredProfile) => void;
}

const Profile: React.FC<ProfileProps> = ({ initialProfile, onSubmit }) => {
  const userLevel = initialProfile?.level ?? 1;
  const userExp = initialProfile?.exp ?? 0;

  const avatars = useAvatarOptions(userLevel, userExp);
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [message, setMessage] = useState(initialProfile?.message ?? "");
  const [avatarCode, setAvatarCode] = useState(
    initialProfile?.avatarCode ?? avatars[0].code
  );

  const currentIndex = avatars.findIndex((a) => a.code === avatarCode);
  const preview = useMemo(
    () => resolveAvatar(avatarCode, avatars),
    [avatarCode, avatars]
  );
  const unlocked = isAvatarUnlocked(avatarCode, userLevel, userExp);

  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : avatars.length - 1;
    setAvatarCode(avatars[newIndex].code);
  };
  const handleNext = () => {
    const newIndex = currentIndex < avatars.length - 1 ? currentIndex + 1 : 0;
    setAvatarCode(avatars[newIndex].code);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      message: message.trim(),
      avatarCode,
      exp: initialProfile?.exp ?? 0,
      level: initialProfile?.level ?? 1,
    });
  };

  // --- Styles ---
  const container: React.CSSProperties = {
    width: "300px",
    height: "200px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "8px",
    boxSizing: "border-box",
    background: "var(--vscode-sideBar-background)",
    border: "1px solid var(--vscode-editorGroup-border)",
    borderRadius: "8px",
  };

  const input: React.CSSProperties = {
    fontSize: "12px",
    padding: "4px",
    borderRadius: "4px",
    border: "1px solid var(--vscode-editorGroup-border)",
    background: "var(--vscode-input-background)",
    color: "var(--vscode-input-foreground)",
  };

  const avatarBox: React.CSSProperties = {
    flex: "0 0 100px", // 枠は高さ100px確保
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    gap: "8px",
  };

  const avatarImage: React.CSSProperties = {
    width: "64px", // ← ここで縮小
    height: "64px",
    borderRadius: "4px",
    filter: unlocked ? "none" : "brightness(0.4)",
    objectFit: "contain",
  };

  const lockOverlay: React.CSSProperties = {
    position: "absolute",
    fontSize: "24px",
    color: "white",
    textShadow: "0 0 4px black",
  };

  const btn: React.CSSProperties = {
    padding: "6px",
    borderRadius: "6px",
    border: "none",
    background: "#007acc",
    color: "white",
    fontSize: "13px",
    cursor: "pointer",
  };

  const navBtn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#007acc",
  };

  return (
    <div style={container}>
      <input
        placeholder="名前"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        style={input}
      />
      <input
        placeholder="一言コメント"
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        style={input}
      />
      <div style={avatarBox}>
        <button onClick={handlePrev} style={navBtn}>
          ‹
        </button>
        <img src={preview.src} alt={preview.label} style={avatarImage} />
        {!unlocked && <span style={lockOverlay}>🔒</span>}
        <button onClick={handleNext} style={navBtn}>
          ›
        </button>
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--vscode-descriptionForeground)",
          marginBottom: "8px",
        }}
      >
        {preview.label}{" "}
        {unlocked ? "(解放済み)" : `(レベル${preview.unlockLevel}で解放)`}
      </div>
      <button
        onClick={handleSubmit}
        style={btn}
        disabled={!name.trim() || !unlocked}
      >
        広場へ移動
      </button>
    </div>
  );
};

export default Profile;
