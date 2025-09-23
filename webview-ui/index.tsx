import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  ExtensionToWebviewMessage,
  SessionPayload,
} from "../src/messaging";
import Arena from "./components/Arena";
import Profile from "./components/Profile";
import "./styles/arena.css";
import type { SessionSummary, StoredProfile } from "./types";

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

type Screen = "profile" | "arena";

const App: React.FC = () => {
  const savedState = vscode.getState();
  const [profile, setProfile] = useState<StoredProfile | null>(
    savedState?.profile ?? null
  );
  const [screen, setScreen] = useState<Screen>(profile ? "arena" : "profile");
  const [sessions, setSessions] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [greetedToday, setGreetedToday] = useState<string[]>([]);

  useEffect(() => {
    vscode.postMessage({ type: "ready" });
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const { data } = event;
      switch (data.type) {
        case "profile":
          if (data.payload) {
            setProfile(data.payload);
            vscode.setState({ profile: data.payload });
            setScreen("arena");
            setGreetedToday([]);
          } else {
            setProfile(null);
            vscode.setState({ profile: null });
            setScreen("profile");
            setGreetedToday([]);
          }
          break;
        case "profileSaved":
          setProfile(data.payload);
          vscode.setState({ profile: data.payload });
          setScreen("arena");
          setGreetedToday([]);
          break;
        case "sessions":
          setSessions(data.payload);
          break;
        case "greetingRecorded":
          setProfile((prev) =>
            prev
              ? { ...prev, exp: data.payload.exp, level: data.payload.level }
              : prev
          );
          break;
        case "error":
          setError(data.payload);
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!sessions) {
      return;
    }
    const activeMembers = sessions.sessions.filter(
      (session) =>
        session.state === "active" && session.uid !== sessions.selfUid
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
      vscode.postMessage({ type: "greet", payload: { greetedUid: uid } });
    });
    setGreetedToday((prev) => Array.from(new Set([...prev, ...newGreetings])));
  }, [sessions, greetedToday]);

  useEffect(() => {
    if (screen === "arena") {
      vscode.postMessage({ type: "requestSessions" });
    }
  }, [screen]);

  useEffect(() => {
    const interval = setInterval(() => {
      vscode.postMessage({ type: "heartbeat" });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileSubmit = (profileData: StoredProfile) => {
    vscode.postMessage({ type: "saveProfile", payload: profileData });
  };

  const handleEditProfile = () => {
    setScreen("profile");
    vscode.postMessage({ type: "editProfile" });
  };

  const arenaSessions: SessionSummary[] = useMemo(
    () => sessions?.sessions ?? [],
    [sessions]
  );

  const appStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    margin: 0,
    padding: 0,
    height: "100%",
    fontFamily:
      'var(--vscode-font-family, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif)',
    color: "var(--vscode-foreground)",
    background:
      "linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%)",
    lineHeight: 1.6,
  };

  const errorBannerStyle: React.CSSProperties = {
    padding: "16px 20px",
    background: "linear-gradient(135deg, #dc3545, #dc3545)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    margin: "12px 24px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    animation: "slideDown 0.3s ease",
  };

  return (
    <div style={appStyle}>
      {error && <div style={errorBannerStyle}>{error}</div>}
      {screen === "profile" && (
        <Profile initialProfile={profile} onSubmit={handleProfileSubmit} />
      )}
      {screen === "arena" && profile && sessions && (
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

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
