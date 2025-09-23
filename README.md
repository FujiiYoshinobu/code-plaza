# Code Plaza

Code Plaza は、VS Code のサイドバーに仲間が集まる「広場」を表示する拡張機能です。チームメンバーはお気に入りのドット絵アバターとプロフィールを設定し、エディタを開いている間は自動的に広場へ参加します。誰がオンラインなのかを一目で把握でき、初めて出会うメンバーとすれ違うたびに経験値が貯まります。

## 主な機能

- **プロフィール編集**: 名前・アバター・一言コメントを設定し、いつでも編集可能。
- **広場ビュー**: アバターがランダムに移動し、アクティブ/スリープ状態を表示。ホバーで一言コメントがポップアップします。
- **セッション管理**: VS Code の起動と同時にセッションを作成し、Firebase Firestore にハートビートを送信して状態を更新します。
- **すれ違い経験値**: 初めて挨拶するメンバーを検知して経験値を付与し、レベルアップを表示します。

## プロジェクト構成

```
.
├── package.json
├── tsconfig.json
├── esbuild.config.js
├── src/
│   ├── extension.ts        # 拡張機能のエントリーポイント
│   ├── firestore.ts        # Firestore アクセスとモック実装
│   └── messaging.ts        # WebView と拡張間のメッセージ定義
├── webview-ui/
│   ├── index.html          # WebView のベース HTML
│   ├── index.tsx           # React アプリのエントリーポイント
│   ├── components/
│   │   ├── Arena.tsx       # 広場画面
│   │   ├── Avatar.tsx      # アバター表示
│   │   └── Profile.tsx     # プロフィール編集画面
│   ├── hooks/
│   │   └── useAvatars.ts   # アバター定義
│   ├── styles/
│   │   └── arena.css       # 共通スタイル
│   └── assets/             # ドット絵アバター（SVG）
└── media/
    └── icon.svg            # アクティビティバーのアイコン
```

## 必要環境

- Node.js v18 以上
- VS Code v1.85 以上
- Firebase プロジェクト（Firestore 有効化済み）

## セットアップ手順

1. リポジトリを取得します。

   ```bash
   git clone https://github.com/your-org/code-plaza.git
   cd code-plaza
   ```

2. 依存関係をインストールします。

   ```bash
   npm install
   ```

3. Firebase プロジェクトを設定します。

   a. [Firebase Console](https://console.firebase.google.com/) で新しいプロジェクトを作成するか、既存のプロジェクトを選択します。

   b. **Authentication** を有効にして、**Sign-in method** タブで **Anonymous** 認証を有効にします。

   c. **Firestore Database** を作成します（テストモードまたは本番モードのいずれかを選択）。

   d. プロジェクト設定から Web アプリの設定を取得し、`src/firestore.ts` の `firebaseConfig` に入力します。

   ```ts
   const firebaseConfig = {
     apiKey: "<YOUR_API_KEY>",
     authDomain: "<YOUR_PROJECT_ID>.firebaseapp.com",
     projectId: "<YOUR_PROJECT_ID>",
     storageBucket: "<YOUR_PROJECT_ID>.appspot.com",
     messagingSenderId: "<YOUR_SENDER_ID>",
     appId: "<YOUR_APP_ID>",
   };
   ```

   > ⚠️ Firebase の設定が空の場合、または Anonymous 認証が無効の場合、拡張機能はモックデータで動作し、実際の同期は行われません。
   >
   > 開発時に Firebase を無効にしたい場合は、環境変数 `DISABLE_FIREBASE=true` を設定してください。

4. ビルドを実行して `out/` に成果物を出力します。

   ```bash
   npm run build
   ```

5. 開発モードでホットリロードを開始します。VS Code で `F5` を押すと拡張機能が起動します。

   ```bash
   npm run watch
   ```

   デバッグ用の VS Code ウィンドウが立ち上がり、サイドバーに **Code Plaza** が表示されます。

6. 配布用 VSIX ファイルを生成します。

   ```bash
   npm run package
   ```

   `code-plaza-x.x.x.vsix` が出力されます。

## Firestore データ構造

### `users`

```json
users/{uid} = {
  "name": "Fujii",
  "avatar_code": "apple",
  "level": 3,
  "message": "今日もがんばろう！",
  "exp": 1200
}
```

### `sessions`

```json
sessions/{uid} = {
  "userRef": "users/{uid}",
  "lastHeartbeat": "2025-09-23T10:15:00Z",
  "greetedToday": ["uid1", "uid2"],
  "greetedDate": "2025-09-23"
}
```

- `active`: `lastHeartbeat` から 15 分以内
- `sleeping`: 15〜30 分
- `exit`: 30 分以上経過（クライアント側では表示しません）

## 開発メモ

- Firestore の設定に失敗した場合、自動的にモックモードへ切り替わり、VS Code 内のみでデータが保持されます。
- すれ違い時の経験値は 120 pt を加算し、300 pt ごとにレベルアップします。必要に応じて `src/firestore.ts` の計算式を調整してください。
- WebView 側は React で構成されており、`webview-ui` ディレクトリに UI コンポーネントがまとまっています。

## コマンド一覧

| コマンド          | 説明                                |
| ----------------- | ----------------------------------- |
| `npm run build`   | 拡張機能と WebView の一括ビルド     |
| `npm run watch`   | 開発用ウォッチ（HTML 自動コピー付） |
| `npm run package` | VSIX パッケージ生成                 |
| `npm run lint`    | TypeScript の型チェック             |

## ライセンス

MIT License
