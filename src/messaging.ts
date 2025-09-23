import type * as vscode from 'vscode';
import type { SessionSnapshot, SessionState, StoredProfile } from './firestore';

export interface ExtensionState {
  profile?: StoredProfile;
  greetedToday?: string[];
}

export type ExtensionToWebviewMessage =
  | { type: 'profile'; payload: StoredProfile | null }
  | { type: 'profileSaved'; payload: StoredProfile }
  | { type: 'sessions'; payload: SessionPayload }
  | { type: 'greetingRecorded'; payload: GreetingPayload }
  | { type: 'userJoined'; payload: { uid: string; name: string } }
  | { type: 'error'; payload: string };

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'saveProfile'; payload: StoredProfile }
  | { type: 'requestSessions' }
  | { type: 'greet'; payload: { greetedUid: string } }
  | { type: 'heartbeat' }
  | { type: 'editProfile' };

export interface SessionPayload {
  selfUid: string;
  sessions: Array<{
    uid: string;
    name: string;
    avatarCode: string;
    message?: string;
    level: number;
    exp: number;
    state: SessionState;
  }>;
}

export interface GreetingPayload {
  exp: number;
  level: number;
}

export class ExtensionMessenger {
  constructor(private readonly webview: vscode.Webview) {}

  post(message: ExtensionToWebviewMessage): void {
    this.webview.postMessage(message);
  }
}

export function mapSessions(selfUid: string, snapshots: SessionSnapshot[]): SessionPayload {
  return {
    selfUid,
    sessions: snapshots.map((item) => ({
      uid: item.uid,
      name: item.profile.name,
      avatarCode: item.profile.avatarCode,
      message: item.profile.message,
      level: item.profile.level,
      exp: item.profile.exp,
      state: item.state,
    })),
  };
}
