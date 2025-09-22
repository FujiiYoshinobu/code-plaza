import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';

type SessionState = 'active' | 'sleeping' | 'exit';

export interface StoredProfile {
  name: string;
  avatarCode: string;
  message?: string;
  exp: number;
  level: number;
}

export interface SessionSnapshot {
  uid: string;
  lastHeartbeat: string;
  greetedToday: string[];
  state: SessionState;
  profile: StoredProfile;
}

export interface GreetingResult {
  exp: number;
  level: number;
}

const firebaseConfig = {
  apiKey: '<YOUR_API_KEY>',
  authDomain: '<YOUR_PROJECT_ID>.firebaseapp.com',
  projectId: '<YOUR_PROJECT_ID>',
  storageBucket: '<YOUR_PROJECT_ID>.appspot.com',
  messagingSenderId: '<YOUR_SENDER_ID>',
  appId: '<YOUR_APP_ID>',
};

const ACTIVE_THRESHOLD_MS = 15 * 60 * 1000;
const SLEEP_THRESHOLD_MS = 30 * 60 * 1000;
const GREETING_EXP = 120;

interface FirestoreSession {
  userRef?: string;
  lastHeartbeat?: Timestamp | string;
  greetedToday?: string[];
  greetedDate?: string;
}

interface FirestoreUser {
  name: string;
  avatar_code: string;
  level: number;
  message?: string;
  exp: number;
}

interface Backend {
  initialize(): Promise<void>;
  loadProfile(uid: string): Promise<StoredProfile | undefined>;
  saveProfile(uid: string, profile: StoredProfile): Promise<void>;
  subscribe(callback: (sessions: SessionSnapshot[]) => void): () => void;
  updateHeartbeat(uid: string): Promise<void>;
  recordGreeting(uid: string, greetedUid: string): Promise<GreetingResult | undefined>;
  resetGreetingList(uid: string): Promise<void>;
}

class MockBackend implements Backend {
  private profiles = new Map<string, StoredProfile>();
  private sessions = new Map<string, FirestoreSession>();
  private listeners = new Set<(sessions: SessionSnapshot[]) => void>();

  async initialize(): Promise<void> {
    // No-op
  }

  async loadProfile(uid: string): Promise<StoredProfile | undefined> {
    return this.profiles.get(uid);
  }

  async saveProfile(uid: string, profile: StoredProfile): Promise<void> {
    this.profiles.set(uid, profile);
    const existing = this.sessions.get(uid) ?? {};
    this.sessions.set(uid, {
      ...existing,
      userRef: `users/${uid}`,
      lastHeartbeat: new Date().toISOString(),
      greetedToday: existing.greetedToday ?? [],
      greetedDate: existing.greetedDate ?? currentDateKey(),
    });
    this.emit();
  }

  subscribe(callback: (sessions: SessionSnapshot[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.composeSessions());
    return () => {
      this.listeners.delete(callback);
    };
  }

  async updateHeartbeat(uid: string): Promise<void> {
    const session = this.sessions.get(uid) ?? { greetedToday: [], greetedDate: currentDateKey() };
    const shouldReset = session.greetedDate !== currentDateKey();
    this.sessions.set(uid, {
      ...session,
      lastHeartbeat: new Date().toISOString(),
      greetedToday: shouldReset ? [] : session.greetedToday ?? [],
      greetedDate: shouldReset ? currentDateKey() : session.greetedDate,
      userRef: `users/${uid}`,
    });
    this.emit();
  }

  async recordGreeting(uid: string, greetedUid: string): Promise<GreetingResult | undefined> {
    const session = this.sessions.get(uid);
    if (!session) {
      return undefined;
    }
    const today = currentDateKey();
    if (session.greetedDate !== today) {
      session.greetedToday = [];
      session.greetedDate = today;
    }
    session.greetedToday = session.greetedToday ?? [];
    if (!session.greetedToday.includes(greetedUid)) {
      session.greetedToday.push(greetedUid);
      const profile = this.profiles.get(uid);
      if (profile) {
        profile.exp += GREETING_EXP;
        profile.level = calculateLevel(profile.exp);
        this.profiles.set(uid, profile);
        this.sessions.set(uid, session);
        this.emit();
        return { exp: profile.exp, level: profile.level };
      }
      this.sessions.set(uid, session);
      this.emit();
    }
    return undefined;
  }

  async resetGreetingList(uid: string): Promise<void> {
    const session = this.sessions.get(uid);
    if (session) {
      session.greetedToday = [];
      session.greetedDate = currentDateKey();
      this.sessions.set(uid, session);
      this.emit();
    }
  }

  private composeSessions(): SessionSnapshot[] {
    const now = Date.now();
    const snapshots: SessionSnapshot[] = [];
    for (const [uid, session] of this.sessions.entries()) {
      const profile = this.profiles.get(uid);
      if (!profile || !session.lastHeartbeat) {
        continue;
      }
      const state = resolveState(session.lastHeartbeat, now);
      if (state === 'exit') {
        continue;
      }
      snapshots.push({
        uid,
        lastHeartbeat: typeof session.lastHeartbeat === 'string' ? session.lastHeartbeat : session.lastHeartbeat.toString(),
        greetedToday: session.greetedToday ?? [],
        state,
        profile,
      });
    }
    return snapshots;
  }

  private emit() {
    const snapshots = this.composeSessions();
    for (const listener of this.listeners) {
      listener(snapshots);
    }
  }
}

class FirebaseBackend implements Backend {
  private app?: FirebaseApp;
  private db?: Firestore;
  private auth?: Auth;

  async initialize(): Promise<void> {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
    if (!this.auth.currentUser) {
      await signInAnonymously(this.auth);
    }
  }

  private ensureDb(): Firestore {
    if (!this.db) {
      throw new Error('Firestore is not initialized.');
    }
    return this.db;
  }

  async loadProfile(uid: string): Promise<StoredProfile | undefined> {
    const db = this.ensureDb();
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) {
      return undefined;
    }
    const data = userSnap.data() as FirestoreUser;
    return normalizeProfile(data);
  }

  async saveProfile(uid: string, profile: StoredProfile): Promise<void> {
    const db = this.ensureDb();
    await setDoc(
      doc(db, 'users', uid),
      {
        name: profile.name,
        avatar_code: profile.avatarCode,
        message: profile.message ?? '',
        exp: profile.exp,
        level: profile.level,
      },
      { merge: true },
    );
    await setDoc(
      doc(db, 'sessions', uid),
      {
        userRef: `users/${uid}`,
        lastHeartbeat: serverTimestamp(),
        greetedToday: [],
        greetedDate: currentDateKey(),
      },
      { merge: true },
    );
  }

  subscribe(callback: (sessions: SessionSnapshot[]) => void): () => void {
    const db = this.ensureDb();
    const sessionsCol = collection(db, 'sessions');
    return onSnapshot(sessionsCol, async (snapshot) => {
      const now = Date.now();
      const items = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as FirestoreSession;
          const uid = docSnap.id;
          const userId = data.userRef?.split('/')[1] ?? uid;
          const userSnap = await getDoc(doc(db, 'users', userId));
          if (!userSnap.exists()) {
            return undefined;
          }
          const profile = normalizeProfile(userSnap.data() as FirestoreUser);
          const state = resolveState(data.lastHeartbeat ?? '', now);
          if (state === 'exit') {
            return undefined;
          }
          return {
            uid,
            lastHeartbeat: toIsoString(data.lastHeartbeat),
            greetedToday: data.greetedToday ?? [],
            state,
            profile,
          } as SessionSnapshot;
        }),
      );
      callback(items.filter(Boolean) as SessionSnapshot[]);
    });
  }

  async updateHeartbeat(uid: string): Promise<void> {
    const db = this.ensureDb();
    const sessionRef = doc(db, 'sessions', uid);
    const today = currentDateKey();
    const snap = await getDoc(sessionRef);
    const data = snap.exists() ? (snap.data() as FirestoreSession) : undefined;
    const greetedDate = data?.greetedDate;
    const greetedToday = greetedDate === today ? data?.greetedToday ?? [] : [];
    await setDoc(
      sessionRef,
      {
        userRef: `users/${uid}`,
        lastHeartbeat: serverTimestamp(),
        greetedToday,
        greetedDate: today,
      },
      { merge: true },
    );
  }

  async recordGreeting(uid: string, greetedUid: string): Promise<GreetingResult | undefined> {
    const db = this.ensureDb();
    const sessionRef = doc(db, 'sessions', uid);
    const userRef = doc(db, 'users', uid);
    const sessionSnap = await getDoc(sessionRef);
    const sessionData = sessionSnap.exists() ? (sessionSnap.data() as FirestoreSession) : undefined;
    const greetedToday = new Set(sessionData?.greetedToday ?? []);
    const today = currentDateKey();
    const shouldReset = sessionData?.greetedDate !== today;
    if (shouldReset) {
      greetedToday.clear();
    }
    if (greetedToday.has(greetedUid)) {
      return undefined;
    }
    greetedToday.add(greetedUid);

    await updateDoc(sessionRef, {
      greetedToday: Array.from(greetedToday),
      greetedDate: today,
    });

    const userSnap = await getDoc(userRef);
    let exp = GREETING_EXP;
    let level = 1;
    if (userSnap.exists()) {
      const data = userSnap.data() as FirestoreUser;
      exp = (data.exp ?? 0) + GREETING_EXP;
      level = calculateLevel(exp);
      await updateDoc(userRef, { exp, level });
    }
    return { exp, level };
  }

  async resetGreetingList(uid: string): Promise<void> {
    const db = this.ensureDb();
    await updateDoc(doc(db, 'sessions', uid), {
      greetedToday: [],
      greetedDate: currentDateKey(),
    });
  }
}

let backend: Backend | undefined;

function isFirebaseConfigured(): boolean {
  return !Object.values(firebaseConfig).some((value) => typeof value === 'string' && value.startsWith('<YOUR_'));
}

async function getBackend(): Promise<Backend> {
  if (!backend) {
    if (isFirebaseConfigured()) {
      const candidate = new FirebaseBackend();
      try {
        await candidate.initialize();
        backend = candidate;
      } catch (error) {
        console.warn('[Code Plaza] Failed to initialize Firebase backend, falling back to mock implementation.', error);
        backend = new MockBackend();
        await backend.initialize();
      }
    } else {
      backend = new MockBackend();
      await backend.initialize();
    }
  }
  return backend;
}

export async function loadProfile(uid: string): Promise<StoredProfile | undefined> {
  const service = await getBackend();
  return service.loadProfile(uid);
}

export async function persistProfile(uid: string, profile: StoredProfile): Promise<void> {
  const service = await getBackend();
  await service.saveProfile(uid, profile);
}

export async function subscribeToSessions(callback: (sessions: SessionSnapshot[]) => void): Promise<() => void> {
  const service = await getBackend();
  return service.subscribe(callback);
}

export async function touchSession(uid: string): Promise<void> {
  const service = await getBackend();
  await service.updateHeartbeat(uid);
}

export async function recordGreeting(uid: string, greetedUid: string): Promise<GreetingResult | undefined> {
  const service = await getBackend();
  return service.recordGreeting(uid, greetedUid);
}

export async function resetGreetings(uid: string): Promise<void> {
  const service = await getBackend();
  await service.resetGreetingList(uid);
}

export function createInitialProfile(partial: Partial<StoredProfile>): StoredProfile {
  return {
    name: partial.name ?? '',
    avatarCode: partial.avatarCode ?? 'apple',
    message: partial.message ?? '',
    exp: partial.exp ?? 0,
    level: partial.level ?? 1,
  };
}

export function calculateLevel(exp: number): number {
  const base = 300;
  return Math.max(1, Math.floor(exp / base) + 1);
}

function resolveState(lastHeartbeat: Timestamp | string | undefined, nowMs: number): SessionState {
  if (!lastHeartbeat) {
    return 'exit';
  }
  const heartbeatMs = typeof lastHeartbeat === 'string' ? Date.parse(lastHeartbeat) : lastHeartbeat.toMillis();
  if (!Number.isFinite(heartbeatMs)) {
    return 'exit';
  }
  const delta = nowMs - heartbeatMs;
  if (delta <= ACTIVE_THRESHOLD_MS) {
    return 'active';
  }
  if (delta <= SLEEP_THRESHOLD_MS) {
    return 'sleeping';
  }
  return 'exit';
}

function currentDateKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function toIsoString(value: Timestamp | string | undefined): string {
  if (!value) {
    return new Date(0).toISOString();
  }
  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }
  return value.toDate().toISOString();
}

function normalizeProfile(user: FirestoreUser): StoredProfile {
  return {
    name: user.name,
    avatarCode: user.avatar_code,
    message: user.message,
    exp: user.exp ?? 0,
    level: user.level ?? 1,
  };
}

export { GREETING_EXP, SessionState };
