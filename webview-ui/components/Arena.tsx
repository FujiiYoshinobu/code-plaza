import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SessionState, SessionSummary, StoredProfile } from "../types";
import Avatar from "./Avatar";

interface ArenaProps {
  profile: StoredProfile;
  selfUid: string;
  sessions: SessionSummary[];
  onEditProfile: () => void;
}

interface Position {
  x: number;
  y: number;
}

const GRID_COLUMNS = 30;
const GRID_ROWS = 20;

function randomPosition(): Position {
  return {
    x: Math.floor(Math.random() * GRID_COLUMNS),
    y: Math.floor(Math.random() * GRID_ROWS),
  };
}
function moveWithinGrid(position: Position, state: SessionState): Position {
  if (state === "sleeping") return position;
  const dirs = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
  ];
  const c = dirs[Math.floor(Math.random() * dirs.length)];
  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - 1, position.x + c.x)),
    y: Math.max(0, Math.min(GRID_ROWS - 1, position.y + c.y)),
  };
}

const Arena: React.FC<ArenaProps> = ({
  profile,
  sessions,
  selfUid,
  onEditProfile,
}) => {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const prevCountRef = useRef(0);

  // 新規参加メッセージ
  useEffect(() => {
    if (sessions.length > prevCountRef.current) {
      const newSession = sessions[sessions.length - 1];
      setJoinMessage(`${newSession.name}さんが参加しました。`);
      setTimeout(() => setJoinMessage(null), 5000);
    }
    prevCountRef.current = sessions.length;
  }, [sessions]);

  // 各アバターをバラバラに動かす
  useEffect(() => {
    const timers: Record<string, ReturnType<typeof setTimeout>> = {};

    sessions.forEach((session) => {
      const move = () => {
        setPositions((prev) => {
          const next = { ...prev };
          const current = next[session.uid] ?? randomPosition();
          next[session.uid] = moveWithinGrid(current, session.state);
          return next;
        });
        const delay = 1500 + Math.random() * 3000;
        timers[session.uid] = setTimeout(move, delay);
      };
      timers[session.uid] = setTimeout(move, 1000 + Math.random() * 2000);
    });

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, [sessions]);

  const stats = useMemo(() => ({ total: sessions.length }), [sessions]);

  // --- Styles ---
  const arenaHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "var(--vscode-editor-background)",
    borderBottom: "1px solid var(--vscode-editorGroup-border)",
    fontSize: "13px",
    color: "var(--vscode-descriptionForeground)",
  };
  const statsTextStyle: React.CSSProperties = { fontSize: "12px" };
  const gearButtonStyle: React.CSSProperties = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "18px",
  };
  const arenaGridStyle: React.CSSProperties = {
    position: "relative",
    width: "300px",
    height: "200px",
    margin: "0 auto",
    padding: "4px", // ← 外周に余白
    boxSizing: "border-box", // ← パディング込みで300x200を維持
    display: "grid",
    gridTemplateColumns: `repeat(${GRID_COLUMNS}, 10px)`,
    gridTemplateRows: `repeat(${GRID_ROWS}, 10px)`,
    background: "black",
  };
  const arenaFooterStyle: React.CSSProperties = {
    width: "300px",
    minHeight: "24px",
    margin: "0 auto",
    padding: "4px 8px",
    fontSize: "12px",
    color: "var(--vscode-descriptionForeground)",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
      }}
    >
      <header style={arenaHeaderStyle}>
        <span style={statsTextStyle}>参加中: {stats.total}人</span>
        <button
          style={gearButtonStyle}
          onClick={onEditProfile}
          title="プロフィール編集"
        >
          ⚙️
        </button>
      </header>

      <main style={arenaGridStyle}>
        {sessions.map((session) => {
          const pos = positions[session.uid] ?? randomPosition();
          const style: React.CSSProperties = {
            "--grid-x": `${pos.x + 1}`,
            "--grid-y": `${pos.y + 1}`,
          } as React.CSSProperties;
          return (
            <Avatar
              key={session.uid}
              uid={session.uid}
              name={session.name}
              avatarCode={session.avatarCode}
              message={session.message}
              level={session.level}
              state={session.state}
              isSelf={session.uid === selfUid}
              style={style}
            />
          );
        })}
      </main>

      <footer style={arenaFooterStyle}>
        {joinMessage && <p style={{ margin: 0 }}>{joinMessage}</p>}
      </footer>
    </div>
  );
};

export default Arena;
