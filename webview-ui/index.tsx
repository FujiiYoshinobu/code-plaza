import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Profile from './components/Profile';
import Arena from './components/Arena';
import type { SessionPayload, ExtensionToWebviewMessage } from '../src/messaging';
import type { StoredProfile } from './types';
import type { SessionSummary } from './types';
import './styles/arena.css';

interface VsCodeApi<State = unknown> {
  postMessage(message: unknown): void;
  setState(state: State): void;
  getState(): State | undefined;
}

declare function acquireVsCodeApi<State = unknown>(): VsCodeApi<State>;

interface AppState {
  profile: StoredProfile | null;
}

const vscode = acquireVsCodeApi<AppState>();

type Screen = 'profile' | 'arena';

const App: React.FC = () => {
  const savedState = vscode.getState();
  const [profile, setProfile] = useState<StoredProfile | null>(savedState?.profile ?? null);
  const [screen, setScreen] = useState<Screen>(profile ? 'arena' : 'profile');
  const [sessions, setSessions] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [greetedToday, setGreetedToday] = useState<string[]>([]);

  useEffect(() => {
    vscode.postMessage({ type: 'ready' });
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const { data } = event;
      switch (data.type) {
        case 'profile':
          if (data.payload) {
            setProfile(data.payload);
            vscode.setState({ profile: data.payload });
            setScreen('arena');
            setGreetedToday([]);
          } else {
            setProfile(null);
            vscode.setState({ profile: null });
            setScreen('profile');
            setGreetedToday([]);
          }
          break;
        case 'profileSaved':
          setProfile(data.payload);
          vscode.setState({ profile: data.payload });
          setScreen('arena');
          setGreetedToday([]);
          break;
        case 'sessions':
          setSessions(data.payload);
          break;
        case 'greetingRecorded':
          setProfile((prev) => (prev ? { ...prev, exp: data.payload.exp, level: data.payload.level } : prev));
          break;
        case 'error':
          setError(data.payload);
          break;
        default:
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!sessions) {
      return;
    }
    const activeMembers = sessions.sessions.filter(
      (session) => session.state === 'active' && session.uid !== sessions.selfUid,
    );
    if (activeMembers.length === 0) {
      return;
    }
    const newGreetings = activeMembers
      .map((session) => session.uid)
      .filter((uid) => !greetedToday.includes(uid));
    if (newGreetings.length === 0) {
      return;
    }
    newGreetings.forEach((uid) => {
      vscode.postMessage({ type: 'greet', payload: { greetedUid: uid } });
    });
    setGreetedToday((prev) => Array.from(new Set([...prev, ...newGreetings])));
  }, [sessions, greetedToday]);

  useEffect(() => {
    if (screen === 'arena') {
      vscode.postMessage({ type: 'requestSessions' });
    }
  }, [screen]);

  useEffect(() => {
    const interval = setInterval(() => {
      vscode.postMessage({ type: 'heartbeat' });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileSubmit = (profileData: StoredProfile) => {
    vscode.postMessage({ type: 'saveProfile', payload: profileData });
  };

  const handleEditProfile = () => {
    setScreen('profile');
    vscode.postMessage({ type: 'editProfile' });
  };

  const arenaSessions: SessionSummary[] = useMemo(() => sessions?.sessions ?? [], [sessions]);

  return (
    <div className="app">
      {error && <div className="error-banner">{error}</div>}
      {screen === 'profile' && <Profile initialProfile={profile} onSubmit={handleProfileSubmit} />}
      {screen === 'arena' && profile && sessions && (
        <Arena
          profile={profile}
          selfUid={sessions.selfUid}
          sessions={arenaSessions}
          onEditProfile={handleEditProfile}
        />
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
