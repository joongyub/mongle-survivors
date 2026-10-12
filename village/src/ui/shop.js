// 마을회관 씨앗 가게 + 출하함
import { state, emit, salePrice } from '../state/GameState.js';
import { CROPS } from '../data/crops.js';
import { ITEMS } from '../data/items.js';
import { buySeed, sell, isInSeason } from '../core/farm.js';
import { now, seasonOf } from '../core/clock.js';
import { t, itemName, formatLeft } from '../i18n.js';
import { openPanel, refreshPanel, el } from './panel.js';
import { toast } from './toast.js';
import { sfx } from '../audio.js';

// onManage: 머리 쪽 '🔨 건물' 버튼 (업그레이드·옮기기 창 열기)
const manageBtn = onManage => onManage ? { label: t('build.manage'), onClick: onManage } : undefined;

export function openSeedShop({ onManage } = {}) {
  openPanel({
    title: t('shop.title'),
    extra: manageBtn(onManage),
    sub: t('shop.season', { season: t('season.' + seasonOf()) }),
    render(body) {
      const list = el('div', 'shop-list');
      const sorted = [...CROPS].sort((a, b) => isInSeason(b.id, now()) - isInSeason(a.id, now()));
      for (const c of sorted) {
        const good = isInSeason(c.id, now());
        const row = el('div', 'shop-row' + (good ? '' : ' off'), `
          <span class="emo">${c.emoji}</span>
          <div class="shop-text"><b>${itemName('seed_' + c.id)}</b>
            <span class="tag ${good ? 'good' : 'slow'}">${good ? t('shop.inSeason') : t('shop.offSeason')}</span>
            <small>${t('shop.grow', { time: formatLeft(c.growMin * 60000 * (good ? 1 : 2)) })}${c.regrowMin ? ' · ' + t('shop.regrow') : ''} · 🪙${c.sellPrice}</small>
          </div>`);
        const btns = el('div', 'shop-btns');
        for (const n of [1, 5]) {
          const b = el('button', 'btn small', `${t('shop.qty', { n })} · 🪙${c.seedPrice * n}`);
          b.disabled = state.inventory.coins < c.seedPrice * n;
          b.onclick = () => {
            const r = buySeed(state.inventory, c.id, n);
            if (!r.ok) { sfx('nope'); toast(t(r.reason === 'noCoins' ? 'shop.noCoins' : 'farm.bagFull')); return; }
            sfx('coin'); toast(t('shop.bought', { name: t('item.' + c.id) }) + ` ×${n}`);
            emit('change'); refreshPanel();
          };
          btns.appendChild(b);
        }
        row.appendChild(btns);
        list.appendChild(row);
      }
      body.appendChild(list);
    },
  });
}

export function openShipBox({ onManage } = {}) {
  openPanel({
    title: t('ship.title'),
    extra: manageBtn(onManage),
    sub: t('ship.desc'),
    render(body) {
      const inv = state.inventory;
      const ids = Object.keys(inv.items).filter(id => ITEMS[id]?.type === 'crop' && inv.items[id] > 0);
      if (!ids.length) { body.appendChild(el('p', 'empty', t('ship.empty'))); return; }
      const list = el('div', 'shop-list');
      let total = 0;
      for (const id of ids) {
        const it = ITEMS[id], n = inv.items[id];
        total += salePrice(id) * n;
        const row = el('div', 'shop-row', `<span class="emo">${it.emoji}</span>
          <div class="shop-text"><b>${itemName(id)} ×${n}</b><small>${t('shop.each')} 🪙${salePrice(id)}</small></div>`);
        const btns = el('div', 'shop-btns');
        for (const [label, cnt] of [[t('ship.sellOne'), 1], [t('ship.sellAll'), n]]) {
          const b = el('button', 'btn small', label);
          b.onclick = () => doSell([[id, cnt]]);
          btns.appendChild(b);
        }
        row.appendChild(btns);
        list.appendChild(row);
      }
      body.appendChild(list);
      const all = el('button', 'btn primary big-ish', `${t('ship.sellEverything')} · 🪙${total}`);
      all.onclick = () => doSell(ids.map(id => [id, inv.items[id]]));
      body.appendChild(all);
    },
  });
}

function doSell(pairs) {
  let gain = 0;
  for (const [id, n] of pairs) gain += sell(state.inventory, id, n, salePrice(id)).gain || 0;
  if (!gain) return;
  sfx('coin');
  toast(t('ship.sold', { coins: gain }));
  emit('change'); emit('sold', gain);
  refreshPanel();
}
