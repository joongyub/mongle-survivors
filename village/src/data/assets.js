// 모든 그림 파일 경로를 여기서 관리해.
// 나중에 건물·작물 그림 파일이 생기면 여기에 줄만 추가하면 돼.
import { RESIDENTS } from './residents.js';

export const CHARACTER_IMAGES = Object.fromEntries(
  RESIDENTS.map(r => [r.id, `art/characters/${r.id}.png`])
);

// 포즈 그림 (있는 것만 적어). 없으면 기본 그림 + 움직임으로 대신함.
// 다른 친구 포즈가 생기면 예) momo: { happy: 'art/characters/momo/happy.png' }
export const POSE_IMAGES = {
  nari: {
    happy: 'art/characters/nari/happy.png',
    sad: 'art/characters/nari/sad.png',
    sleep: 'art/characters/nari/sleep.png',
    jump: 'art/characters/nari/jump.png',
  },
  bori: {
    happy: 'art/characters/bori/happy.png',
    sad: 'art/characters/bori/sad.png',
    sleep: 'art/characters/bori/sleep.png',
    jump: 'art/characters/bori/jump.png',
  },
};

export const poseKey = (id, pose) => `${id}__${pose}`;
