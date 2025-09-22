import React, { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar';
import type { SessionSummary, StoredProfile } from '../types';

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

const GRID_COLUMNS = 10;
const GRID_ROWS = 6;

function randomPosition(): Position {
  return { x: Math.floor(Math.random() * GRID_COLUMNS), y: Math.floor(Math.random() * GRID_ROWS) };
}

function moveWithinGrid(position: Position): Position {
  const directions: Position[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const choice = directions[Math.floor(Math.random() * directions.length)];
  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - 1, position.x + choice.x)),
    y: Math.max(0, Math.min(GRID_ROWS - 1, position.y + choice.y)),
  };
}

const Arena: React.FC<ArenaProps> = ({ profile, sessions, selfUid, onEditProfile }) => {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPositions((prev) => {
      const next: Record<string, Position> = { ...prev };
      sessions.forEach((session) => {
        if (!next[session.uid]) {
          next[session.uid] = randomPosition();
        }
      });
      Object.keys(next).forEach((uid) => {
        if (!sessions.some((session) => session.uid === uid)) {
          delete next[uid];
        }
      });
      return next;
    });
  }, [sessions]);

  useEffect(() => {
    const tick = () => {
      setPositions((prev) => {
        const next: Record<string, Position> = { ...prev };
        sessions.forEach((session) => {
          const current = next[session.uid] ?? randomPosition();
          next[session.uid] = session.state === 'active' ? moveWithinGrid(current) : current;
        });
        return next;
      });
      const delay = 1000 + Math.random() * 800;
      timeoutRef.current = setTimeout(tick, delay);
    };
    timeoutRef.current = setTimeout(tick, 1000);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessions]);

  const stats = useMemo(() => {
    const active = sessions.filter((session) => session.state === 'active');
    const sleeping = sessions.filter((session) => session.state === 'sleeping');
    return {
      total: sessions.length,
      active: active.length,
      sleeping: sleeping.length,
    };
  }, [sessions]);

  return (
    <div className="arena-view">
      <header className="arena-header">
        <div className="arena-profile">
          <h1>{profile.name}</h1>
          <p>
            レベル {profile.level} ・ 経験値 {profile.exp}
          </p>
        </div>
        <div className="arena-stats">
          <span>参加者 {stats.total}人</span>
          <span>活動中 {stats.active}人</span>
          <span>休憩中 {stats.sleeping}人</span>
        </div>
        <button className="secondary" onClick={onEditProfile} type="button">
          プロフィール編集
        </button>
      </header>
      <main className="arena-grid">
        {sessions.map((session) => {
          const position = positions[session.uid] ?? randomPosition();
          const style: React.CSSProperties = {
            left: `${((position.x + 0.5) / GRID_COLUMNS) * 100}%`,
            top: `${((position.y + 0.5) / GRID_ROWS) * 100}%`,
          };
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
      <footer className="arena-footer">
        <p>新しい仲間とすれ違うと経験値がアップします！</p>
        {sessions.length === 0 && <p>まだ誰もいません。チームメイトが参加するとここに表示されます。</p>}
      </footer>
    </div>
  );
};

export default Arena;
