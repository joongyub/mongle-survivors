// 가방 창: 가진 아이템 보기, 씨앗 들기
import { state, emit, salePrice } from '../state/GameState.js';
import { ITEMS } from '../data/items.js';
import { slotsUsed } from '../core/inventory.js';
import { t, itemName } from '../i18n.js';
import { openPanel, closePanel, el } from './panel.js';

const ORDER = { seed: 0, crop: 1, material: 2 };

export function openBag({ seedsOnly = false, onPickSeed } = {}) {
  const inv = state.inventory;
  openPanel({
    title: seedsOnly ? t('farm.pickSeed') : t('bag.title'),
    sub: seedsOnly ? '' : t('bag.slots', { used: slotsUsed(inv), cap: inv.capacity }),
    render(body) {
      const ids = Object.keys(inv.items)
        .filter(id => inv.items[id] > 0 && ITEMS[id] && (!seedsOnly || ITEMS[id].type === 'seed'))
        .sort((a, b) => ORDER[ITEMS[a].type] - ORDER[ITEMS[b].type] || a.localeCompare(b));
      if (!ids.length) { body.appendChild(el('p', 'empty', seedsOnly ? t('farm.noSeed') : t('bag.empty'))); return; }
      const grid = el('div', 'item-grid');
      const info = el('div', 'item-info');
      for (const id of ids) {
        const it = ITEMS[id];
        const b = el('button', 'item' + (seedsOnly ? ' named' : ''), `<span class="emo">${it.emoji}</span>${it.badge ? `<span class="badge">${it.badge}</span>` : ''}<b>${inv.items[id]}</b>${seedsOnly ? `<i class="nm">${t('item.' + it.crop)}</i>` : ''}`);
        b.title = itemName(id);
        b.onclick = () => {
          if (seedsOnly) { closePanel(); onPickSeed?.(it.crop); return; }
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
      if (!seedsOnly) body.appendChild(info);
    },
  });
}
