import { useMemo } from 'react';
import apple from '../assets/apple.svg';
import cat from '../assets/cat.svg';
import rocket from '../assets/rocket.svg';

export interface AvatarOption {
  code: string;
  label: string;
  src: string;
}

const AVATARS: AvatarOption[] = [
  { code: 'apple', label: 'アップル', src: apple },
  { code: 'cat', label: 'キャット', src: cat },
  { code: 'rocket', label: 'ロケット', src: rocket },
];

export function useAvatarOptions(): AvatarOption[] {
  return useMemo(() => AVATARS, []);
}

export function resolveAvatar(code: string, options: AvatarOption[] = AVATARS): AvatarOption {
  return options.find((avatar) => avatar.code === code) ?? options[0];
}
