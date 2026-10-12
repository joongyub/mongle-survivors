// 건설 창: 지을 수 있는 건물 목록 + 아직 잠긴 건물 미리보기
import { state } from '../state/GameState.js';
import { BUILDINGS, BUILD_MENU, MAX_BUILDERS } from '../data/buildings.js';
import { def, missing, countOf, buildersFree, buildMs } from '../core/build.js';
import { buildMods } from '../state/GameState.js';
import { formatLeft } from '../i18n.js';
import { t } from '../i18n.js';
import { openPanel, closePanel, el } from './panel.js';

const COST_ICON = { wood: '🪵', stone: '🪨', coins: '🪙' };

// 비용 글자: 모자란 재료는 빨간색
export function costHtml(cost = {}, inv = state.inventory) {
  const short = missing(inv, cost);
  const parts = Object.entries(cost).filter(([, n]) => n > 0)
    .map(([k, n]) => `<span class="cost${short[k] ? ' short' : ''}">${COST_ICON[k]}${n}</span>`);
  return parts.join(' ') || `<span class="cost">${t('build.instant')}</span>`;
}

export function timeText(type, lv) {
  const ms = buildMs(type, lv, buildMods());
  return ms ? '⏱ ' + formatLeft(ms) : '⚡ ' + t('build.instant');
}

// 지금 이 건물을 지을 수 없는 이유 (없으면 null)
export function whyNot(type) {
  const d = def(type);
  if (d.locked) return t('build.lockedRank', { rank: d.rank });
  if (d.max && countOf(state.buildings, type) >= d.max) return d.max === 1 ? t('build.reason.max') : t('build.reason.maxN', { n: d.max });
  if (buildMs(type, 1, buildMods()) > 0 && buildersFree(state.buildings) <= 0) return t('build.reason.busy');
  if (Object.keys(missing(state.inventory, d.levels[1].cost)).length) return t('build.reason.cost');
  return null;
}

export function openBuildMenu(scene) {
  openPanel({
    title: t('build.title'),
    sub: t('build.builders', { free: buildersFree(state.buildings), max: MAX_BUILDERS }),
    render(body) {
      body.appendChild(el('p', 'set-note', '💡 ' + t('build.tip')));
      const list = el('div', 'shop-list');
      for (const type of BUILD_MENU) {
        const d = BUILDINGS[type];
        const reason = whyNot(type);
        const row = el('div', 'shop-row' + (d.locked ? ' off locked' : ''), `
          <span class="emo">${d.emoji}</span>
          <div class="shop-text"><b>${t('bld.' + type)}</b>
            ${d.locked ? `<span class="tag slow">🔒 ${reason}</span>` : `<span class="tag good">${d.w}×${d.h}</span>`}
            <small>${t('bld.desc.' + type)}</small>
            ${d.locked ? '' : `<small class="costs">${costHtml(d.levels[1].cost)} · ${timeText(type, 1)}</small>`}
          </div>`);
        if (!d.locked) {
          const btns = el('div', 'shop-btns col');
          const b = el('button', 'btn small primary', t('build.build'));
          b.dataset.type = type;
          b.disabled = !!reason;
          b.onclick = () => { closePanel(); scene.startPlacing({ type }); };
          btns.appendChild(b);
          if (reason) btns.appendChild(el('small', 'why', reason));
          row.appendChild(btns);
        }
        list.appendChild(row);
      }
      body.appendChild(list);
      body.appendChild(el('p', 'set-note', t('build.where')));
    },
  });
}
