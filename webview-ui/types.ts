export interface StoredProfile {
  name: string;
  avatarCode: string;
  message?: string;
  exp: number;
  level: number;
}

export type SessionState = 'active' | 'sleeping' | 'exit';

export interface SessionSummary {
  uid: string;
  name: string;
  avatarCode: string;
  message?: string;
  level: number;
  exp: number;
  state: SessionState;
}
