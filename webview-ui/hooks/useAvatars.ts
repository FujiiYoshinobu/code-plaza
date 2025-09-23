import { useMemo } from 'react';
import apple from '../assets/apple.svg';
import cat from '../assets/cat.svg';
import rocket from '../assets/rocket.svg';

export interface AvatarOption {
  code: string;
  label: string;
  src: string;
  unlockLevel: number; // 解放に必要なレベル
  unlockExp: number;   // 解放に必要な経験値
}

const AVATARS: AvatarOption[] = [
  { code: 'apple', label: 'アップル', src: apple, unlockLevel: 1, unlockExp: 0 },
  { code: 'cat', label: 'キャット', src: cat, unlockLevel: 2, unlockExp: 50 },
  { code: 'rocket', label: 'ロケット', src: rocket, unlockLevel: 5, unlockExp: 200 },
];

export function useAvatarOptions(userLevel: number = 1, userExp: number = 0): AvatarOption[] {
  return useMemo(() => AVATARS, []);
}

export function getUnlockedAvatars(userLevel: number, userExp: number): AvatarOption[] {
  return AVATARS.filter(avatar => 
    userLevel >= avatar.unlockLevel && userExp >= avatar.unlockExp
  );
}

export function isAvatarUnlocked(avatarCode: string, userLevel: number, userExp: number): boolean {
  const avatar = AVATARS.find(a => a.code === avatarCode);
  if (!avatar) return false;
  return userLevel >= avatar.unlockLevel && userExp >= avatar.unlockExp;
}

export function resolveAvatar(code: string, options: AvatarOption[] = AVATARS): AvatarOption {
  return options.find((avatar) => avatar.code === code) ?? options[0];
}
