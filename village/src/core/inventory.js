// ★ 가방 규칙 (화면 코드 없음)
import { STACK_MAX } from '../data/items.js';

export function count(inv, id) { return inv.items[id] ?? 0; }

export function slotsUsed(inv) { return Object.values(inv.items).filter(n => n > 0).length; }

export function canAdd(inv, id, n = 1) {
  const have = count(inv, id);
  if (have + n > STACK_MAX) return false;
  return have > 0 || slotsUsed(inv) < inv.capacity;
}

export function add(inv, id, n = 1) {
  if (!canAdd(inv, id, n)) return false;
  inv.items[id] = count(inv, id) + n;
  return true;
}

export function remove(inv, id, n = 1) {
  if (count(inv, id) < n) return false;
  inv.items[id] -= n;
  if (inv.items[id] <= 0) delete inv.items[id];
  return true;
}
