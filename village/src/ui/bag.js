// 가방 창: 가진 아이템 보기, 씨앗 들기, (6단계) 주민에게 줄 선물 고르기
import { state, emit, salePrice } from '../state/GameState.js';
import { ITEMS } from '../data/items.js';
import { slotsUsed } from '../core/inventory.js';
import { t, itemName } from '../i18n.js';
import { openPanel, closePanel, el } from './panel.js';

const ORDER = { seed: 0, crop: 1, material: 2 };
const GIFT_ORDER = { crop: 0, material: 1, seed: 2 };

// seedsOnly: 심을 씨앗 고르기
// gift: { title, sub, liked(itemId) → 좋아하는 걸로 알려진 물건이면 true, onPick(itemId), onCancel() }
export function openBag({ seedsOnly = false, onPickSeed, gift = null } = {}) {
  const inv = state.inventory;
  let picked = false;
  openPanel({
    title: gift ? gift.title : seedsOnly ? t('farm.pickSeed') : t('bag.title'),
    sub: gift ? gift.sub : seedsOnly ? '' : t('bag.slots', { used: slotsUsed(inv), cap: inv.capacity }),
    onClose: reason => { if (gift && !picked && reason !== 'replace') gift.onCancel?.(); },
    render(body) {
      const order = gift ? GIFT_ORDER : ORDER;
      const ids = Object.keys(inv.items)
        .filter(id => inv.items[id] > 0 && ITEMS[id] && (!seedsOnly || ITEMS[id].type === 'seed'))
        .sort((a, b) => (gift && gift.liked(b) - gift.liked(a)) || order[ITEMS[a].type] - order[ITEMS[b].type] || a.localeCompare(b));
      if (!ids.length) { body.appendChild(el('p', 'empty', gift ? t('talk.noGift') : seedsOnly ? t('farm.noSeed') : t('bag.empty'))); return; }
      const grid = el('div', 'item-grid');
      const info = el('div', 'item-info');
      for (const id of ids) {
        const it = ITEMS[id];
        const named = seedsOnly || gift;
        const love = gift?.liked(id);
        const b = el('button', 'item' + (named ? ' named' : '') + (love ? ' loved' : ''), `<span class="emo">${it.emoji}</span>${it.badge ? `<span class="badge">${it.badge}</span>` : ''}${love ? '<span class="love">♥</span>' : ''}<b>${inv.items[id]}</b>${named ? `<i class="nm">${seedsOnly ? t('item.' + it.crop) : itemName(id)}</i>` : ''}`);
        b.title = itemName(id);
        b.onclick = () => {
          if (seedsOnly) { closePanel(); onPickSeed?.(it.crop); return; }
          if (gift) { picked = true; gift.onPick(id); return; }
          grid.querySelectorAll('.item').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
          info.innerHTML = `<b>${itemName(id)}</b> · ${t('bag.sellPrice', { price: salePrice(id) })}`;
          if (it.type === 'seed') {
            const hold = el('button', 'btn primary small', t('bag.hold'));
            hold.onclick = () => { closePanel(); emit('hold-seed', it.crop); };
            info.appendChild(hold);
          }
        };
        grid.appendChild(b);
      }
      body.appendChild(grid);
      if (!seedsOnly && !gift) body.appendChild(info);
    },
  });
}
