import { promises as fs } from 'fs';
import { nanoid } from 'nanoid';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  createInitialProfile,
  loadProfile,
  persistProfile,
  recordGreeting,
  subscribeToSessions,
  touchSession,
  type StoredProfile,
} from './firestore';
import { ExtensionMessenger, mapSessions, type WebviewToExtensionMessage } from './messaging';

const VIEW_ID = 'codePlazaView';
const COMMAND_ID = 'code-plaza.openPlaza';
const PROFILE_KEY = 'code-plaza.profile';
const UID_KEY = 'code-plaza.uid';

export function activate(context: vscode.ExtensionContext) {
  console.log('[Code Plaza] Extension is being activated...');
  
  try {
    const provider = new CodePlazaViewProvider(context);

    const webviewViewRegistration = vscode.window.registerWebviewViewProvider(VIEW_ID, provider, {
      webviewOptions: { 
        retainContextWhenHidden: true 
      },
    });

    const commandRegistration = vscode.commands.registerCommand(COMMAND_ID, () => {
      console.log('[Code Plaza] Open Plaza command executed');
      provider.reveal();
    });

    context.subscriptions.push(webviewViewRegistration, commandRegistration);
    
    console.log('[Code Plaza] Extension activated successfully!');
  } catch (error) {
    console.error('[Code Plaza] Failed to activate extension:', error);
  }
}

export function deactivate() {
  // No-op
}

class CodePlazaViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private messenger?: ExtensionMessenger;
  private sessionUnsubscribe?: () => void;
  private heartbeatTimer?: NodeJS.Timeout;
  private readonly uid: string;
  private profile?: StoredProfile;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.uid = this.loadOrCreateUid();
    this.profile = context.globalState.get<StoredProfile>(PROFILE_KEY) ?? undefined;
  }

  reveal(): void {
    console.log('[Code Plaza] Revealing view...');
    if (this.view) {
      console.log('[Code Plaza] View exists, showing it');
      this.view.show?.(true);
    } else {
      console.log('[Code Plaza] View does not exist yet, executing workbench command');
      void vscode.commands.executeCommand('workbench.view.extension.codePlaza');
    }
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    console.log('[Code Plaza] Resolving webview view...');
    
    this.view = webviewView;
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    };

    try {
      webview.html = await this.getHtml(webview);
      console.log('[Code Plaza] HTML content set successfully');
    } catch (error) {
      console.error('[Code Plaza] Failed to set HTML content:', error);
    }

    this.messenger = new ExtensionMessenger(webview);
    console.log('[Code Plaza] Webview view resolved successfully');

    const listener = webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      void this.handleMessage(message);
    });

    webviewView.onDidDispose(() => {
      listener.dispose();
      this.stopSession();
    });
  }

  private loadOrCreateUid(): string {
    const stored = this.context.globalState.get<string>(UID_KEY);
    if (stored) {
      return stored;
    }
    const generated = nanoid(12);
    void this.context.globalState.update(UID_KEY, generated);
    return generated;
  }

  private async getHtml(webview: vscode.Webview): Promise<string> {
    const htmlPath = path.join(this.context.extensionPath, 'out', 'webview-ui', 'index.html');
    const rawHtml = await fs.readFile(htmlPath, 'utf8');
    const nonce = generateNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview-ui', 'bundle.js'),
    );

    return rawHtml
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace('./bundle.js', scriptUri.toString());
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.onReady();
        break;
      case 'saveProfile':
        await this.onSaveProfile(createInitialProfile(message.payload));
        break;
      case 'requestSessions':
        await this.startSession();
        break;
      case 'greet':
        await this.onGreet(message.payload.greetedUid);
        break;
      case 'heartbeat':
        await touchSession(this.uid);
        break;
      case 'editProfile':
        this.stopSession();
        break;
      default:
        break;
    }
  }

  private async onReady(): Promise<void> {
    const webState = this.view?.webview;
    if (!webState || !this.messenger) {
      return;
    }
    if (!this.profile) {
      try {
        const remote = await loadProfile(this.uid);
        if (remote) {
          this.profile = remote;
          await this.context.globalState.update(PROFILE_KEY, remote);
        }
      } catch (error) {
        this.postError('プロフィール情報の取得に失敗しました。', error);
      }
    }
    this.messenger.post({ type: 'profile', payload: this.profile ?? null });
    if (this.profile) {
      await this.startSession();
    }
  }

  private async onSaveProfile(profile: StoredProfile): Promise<void> {
    this.profile = profile;
    await this.context.globalState.update(PROFILE_KEY, profile);
    try {
      await persistProfile(this.uid, profile);
      if (this.messenger) {
        this.messenger.post({ type: 'profileSaved', payload: profile });
        this.messenger.post({ type: 'profile', payload: profile });
      }
      await this.startSession();
    } catch (error) {
      this.postError('プロフィールの保存に失敗しました。Firebaseの設定を確認してください。', error);
    }
  }

  private async startSession(): Promise<void> {
    if (!this.profile) {
      return;
    }
    try {
      await touchSession(this.uid);

      if (!this.sessionUnsubscribe) {
        this.sessionUnsubscribe = await subscribeToSessions((sessions) => {
          if (!this.messenger) {
            return;
          }
          this.messenger.post({ type: 'sessions', payload: mapSessions(this.uid, sessions) });
        });
      }

      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
      }
      this.heartbeatTimer = setInterval(() => {
        void touchSession(this.uid);
      }, 60 * 1000);
    } catch (error) {
      this.postError('セッションの開始に失敗しました。ネットワーク接続を確認してください。', error);
    }
  }

  private stopSession(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    if (this.sessionUnsubscribe) {
      this.sessionUnsubscribe();
      this.sessionUnsubscribe = undefined;
    }
  }

  private async onGreet(greetedUid: string): Promise<void> {
    if (!this.messenger) {
      return;
    }
    try {
      const result = await recordGreeting(this.uid, greetedUid);
      if (result) {
        this.profile = {
          ...(this.profile ?? createInitialProfile({})),
          exp: result.exp,
          level: result.level,
        };
        await this.context.globalState.update(PROFILE_KEY, this.profile);
        this.messenger.post({ type: 'greetingRecorded', payload: result });
      }
    } catch (error) {
      this.postError('挨拶の記録に失敗しました。', error);
    }
  }

  private postError(message: string, error: unknown): void {
    console.error('[Code Plaza]', message, error);
    this.messenger?.post({ type: 'error', payload: message });
  }
}

function generateNonce(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i += 1) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}
