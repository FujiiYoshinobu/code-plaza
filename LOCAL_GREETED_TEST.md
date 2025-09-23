# ローカルすれ違いリスト機能テストガイド

## 実装内容

以下の機能が Code Plaza 拡張に追加されました：

### 1. 古いキーのクリーンアップ (`cleanupOldKeys`)

- **実行タイミング**: 拡張起動時
- **処理内容**: `greeted-YYYY-MM-DD` 形式で保存されている今日以外のキーをすべて削除
- **ログ出力**: `[Code Plaza] Old greeted keys cleaned up`

### 2. 今日の挨拶チェック (`hasGreetedToday`)

- **機能**: 指定された UID が今日すでに挨拶済みかをローカルでチェック
- **保存形式**: `greeted-2025-09-24: ["uid1", "uid2"]`

### 3. 挨拶リストへの追加 (`addGreetedToday`)

- **実行タイミング**: 挨拶が成功した後
- **処理内容**: 今日の挨拶済みリストに UID を追加
- **重複チェック**: 既に含まれている場合は追加しない

## テスト手順

### 基本動作テスト

1. **拡張を再起動**

   - VSCode 拡張を無効化 → 有効化、または VSCode を再起動
   - 開発者コンソールで `[Code Plaza] Old greeted keys cleaned up` が出力されることを確認

2. **初回挨拶テスト**

   - 他のユーザーに挨拶を実行
   - 挨拶が成功し、経験値が加算されることを確認
   - コンソールで `[Code Plaza] Added to local greeted list: [UID]` が出力されることを確認

3. **重複挨拶防止テスト**
   - 同じユーザーに再度挨拶を試行
   - 経験値が加算されないことを確認

### 日付切り替えテスト

1. **手動での日付変更テスト** (開発者向け)
   ```javascript
   // VSCode開発者コンソールで実行
   // 擬似的に昨日の挨拶記録を作成
   const yesterday = new Date();
   yesterday.setDate(yesterday.getDate() - 1);
   const yesterdayKey = `greeted-${yesterday.toISOString().slice(0, 10)}`;
   // このキーが拡張再起動後に削除されることを確認
   ```

### ストレージ確認方法

開発者は以下の方法でローカルストレージの内容を確認できます：

```javascript
// 拡張のグローバルステートを確認
const keys = context.globalState.keys();
console.log("All keys:", keys);

// 今日の挨拶リストを確認
const today = new Date().toISOString().slice(0, 10);
const todayGreeted = context.globalState.get(`greeted-${today}`);
console.log("Today greeted:", todayGreeted);
```

## 期待される動作

✅ **起動時**: 古い日付のキーが自動削除される  
✅ **初回挨拶**: ローカルリストに記録され、リモート挨拶処理も実行される  
✅ **重複挨拶**: ローカルチェックで即座に防止される  
✅ **日付変更**: 次回起動時に前日のリストが自動リセットされる  
✅ **ストレージ肥大化防止**: 古いキーが自動削除されるため容量制限なし

## 注意事項

- ローカルチェックは 1 日単位でリセットされます
- リモート（Firestore）の挨拶記録とは独立して動作します
- VSCode を跨いで同期はされません（ローカルのみ）
- 拡張を無効化すると記録はクリアされます
