import { useMemo } from 'react';
import apple from '../assets/apple.svg';
import cat from '../assets/cat.svg';
import dog from '../assets/dog.svg';
import frankenstein from '../assets/frankenstein.svg';
import frog from '../assets/frog.svg';
import mahotsukai from '../assets/mahotsukai.svg';
import okami_man from '../assets/okami_man.svg';
import pancake from '../assets/pancake.svg';
import rocket from '../assets/rocket.svg';
import yusha from '../assets/yusha.svg';

export interface AvatarOption {
  code: string;
  label: string;
  src: string;
  unlockLevel: number; // 解放に必要なレベル
  unlockExp: number;   // 解放に必要な経験値
}

const AVATARS: AvatarOption[] = [
  // レベル1から使える
  { code: 'cat', label: 'キャット', src: cat, unlockLevel: 1, unlockExp: 0 },
  { code: 'dog', label: 'ドッグ', src: dog, unlockLevel: 1, unlockExp: 0 },
  { code: 'yusha', label: '勇者', src: yusha, unlockLevel: 1, unlockExp: 0 },
  { code: 'mahotsukai', label: '魔法使い', src: mahotsukai, unlockLevel: 1, unlockExp: 0 },
  // レベル2
  { code: 'apple', label: 'アップル', src: apple, unlockLevel: 2, unlockExp: 50 },
  // レベル3
  { code: 'rocket', label: 'ロケット', src: rocket, unlockLevel: 3, unlockExp: 100 },
  // レベル5
  { code: 'okami_man', label: '狼男', src: okami_man, unlockLevel: 5, unlockExp: 200 },
  // レベル7
  { code: 'frog', label: 'フロッグ', src: frog, unlockLevel: 7, unlockExp: 350 },
  // レベル10
  { code: 'pancake', label: 'パンケーキ', src: pancake, unlockLevel: 10, unlockExp: 500 },
  // レベル15
  { code: 'frankenstein', label: 'フランケンシュタイン', src: frankenstein, unlockLevel: 15, unlockExp: 1000 },
];

export function useAvatarOptions(userLevel: number = 1, userExp: number = 0): AvatarOption[] {
  return useMemo(() => AVATARS, [userLevel, userExp]);
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
