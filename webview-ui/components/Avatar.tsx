import React, { useMemo } from 'react';
import type { SessionState } from '../types';
import { resolveAvatar, useAvatarOptions } from '../hooks/useAvatars';

interface AvatarProps {
  uid: string;
  name: string;
  avatarCode: string;
  message?: string;
  level: number;
  state: SessionState;
  isSelf: boolean;
  style: React.CSSProperties;
}

const Avatar: React.FC<AvatarProps> = ({ name, avatarCode, message, level, state, isSelf, style }) => {
  const options = useAvatarOptions();
  const avatar = useMemo(() => resolveAvatar(avatarCode, options), [avatarCode, options]);

  return (
    <div className={`avatar-node ${state} ${isSelf ? 'self' : ''}`} style={style}>
      <div className="avatar-wrapper" title={message ?? ''}>
        <img className="avatar-image" src={avatar.src} alt={name} />
        {state === 'sleeping' && <span className="avatar-status">💤</span>}
      </div>
      <span className="avatar-name">{name}</span>
      <span className="avatar-level">Lv. {level}</span>
      {message && <div className="avatar-tooltip">{message}</div>}
    </div>
  );
};

export default Avatar;
