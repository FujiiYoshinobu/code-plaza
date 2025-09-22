import React, { FormEvent, useMemo, useState } from 'react';
import type { StoredProfile } from '../types';
import { useAvatarOptions, resolveAvatar } from '../hooks/useAvatars';

interface ProfileProps {
  initialProfile: StoredProfile | null;
  onSubmit: (profile: StoredProfile) => void;
}

const Profile: React.FC<ProfileProps> = ({ initialProfile, onSubmit }) => {
  const avatars = useAvatarOptions();
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [message, setMessage] = useState(initialProfile?.message ?? '');
  const [avatarCode, setAvatarCode] = useState(initialProfile?.avatarCode ?? avatars[0]?.code ?? 'apple');
  const [error, setError] = useState('');

  const preview = useMemo(() => resolveAvatar(avatarCode, avatars), [avatarCode, avatars]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }
    setError('');
    onSubmit({
      name: name.trim(),
      avatarCode,
      message: message.trim(),
      exp: initialProfile?.exp ?? 0,
      level: initialProfile?.level ?? 1,
    });
  };

  return (
    <div className="profile-view">
      <div className="profile-card">
        <h1>はじめまして！</h1>
        <p className="profile-lead">Code Plaza に参加するためのプロフィールを設定しましょう。</p>
        <form onSubmit={handleSubmit} className="profile-form">
          <label className="profile-label" htmlFor="profile-name">
            名前
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例: Fujii"
              required
            />
          </label>
          <label className="profile-label" htmlFor="profile-message">
            一言コメント
            <textarea
              id="profile-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="今日の気分を共有しよう！"
              rows={3}
            />
          </label>
          <fieldset className="avatar-fieldset">
            <legend>アバターを選択</legend>
            <div className="avatar-options">
              {avatars.map((avatar) => (
                <label key={avatar.code} className={avatar.code === avatarCode ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="avatar"
                    value={avatar.code}
                    checked={avatarCode === avatar.code}
                    onChange={() => setAvatarCode(avatar.code)}
                  />
                  <img src={avatar.src} alt={avatar.label} />
                  <span>{avatar.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className="profile-error">{error}</p>}
        </form>
      </div>
      <div className="profile-preview">
        <h2>プレビュー</h2>
        <div className="profile-preview-avatar">
          <img src={preview.src} alt={preview.label} />
        </div>
        <p className="profile-preview-name">{name || 'あなたの名前'}</p>
        <p className="profile-preview-message">{message || 'ひとことを入力すると、広場で表示されます。'}</p>
        <button className="primary" onClick={handleSubmit} type="button">
          広場へ移動
        </button>
      </div>
    </div>
  );
};

export default Profile;
