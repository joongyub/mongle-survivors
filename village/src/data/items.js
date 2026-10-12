// 모든 아이템 정보. 작물과 씨앗은 crops.js에서 자동으로 만들어져.
import { CROPS, seedId } from './crops.js';

export const ITEMS = {};
for (const c of CROPS) {
  ITEMS[c.id] = { id: c.id, type: 'crop', emoji: c.emoji, sellPrice: c.sellPrice, crop: c.id };
  ITEMS[seedId(c.id)] = { id: seedId(c.id), type: 'seed', emoji: '🌱', badge: c.emoji, buyPrice: c.seedPrice, sellPrice: Math.floor(c.seedPrice / 2), crop: c.id };
}
ITEMS.wood = { id: 'wood', type: 'material', emoji: '🪵', sellPrice: 5 };
ITEMS.stone = { id: 'stone', type: 'material', emoji: '🪨', sellPrice: 5 };

export const BAG_START_CAPACITY = 30;   // 가방 칸 수 (아이템 종류 수). 창고를 지으면 늘어남 (5단계)
export const STACK_MAX = 999;
