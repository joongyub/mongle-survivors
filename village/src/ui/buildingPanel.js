// 건물 창: 레벨, 효과, 업그레이드, 옮기기, 치우기, 공사 취소
import { state, buildMods } from '../state/GameState.js';
import { def, nextLevelInfo, maxLevel, missing, buildersFree, buildMs, leftMs, progress } from '../core/build.js';
import { STORAGE_SLOTS, TOWNHALL_SALE } from '../data/buildings.js';
import { now } from '../core/clock.js';
import { formatLeft } from '../i18n.js';
import { t } from '../i18n.js';
import { openPanel, el } from './panel.js';
import { costHtml, timeText } from './buildMenu.js';

export function buildingName(b, lv = b.level) {
  if (b.type === 'stonepath') return t('bld.stonepath.' + Math.max(1, lv));
  return t('bld.' + b.type);
}

// 레벨별 효과 글자
export function effectText(type, lv) {
  if (type === 'storage') return t('eff.storage', { n: lv * STORAGE_SLOTS });
  if (type === 'townhall') return lv <= 1 ? t('eff.townhall.1') : t('eff.townhall', { n: Math.round((lv - 1) * TOWNHALL_SALE * 100) });
  if (type === 'shipbox') return t('bld.desc.shipbox');
  if (type === 'stonepath') return t('eff.stonepath');
  return t('eff.decor');
}

let shown = null;
export const shownBuilding = () => shown;   // 지금 창이 열린 건물 (완성되면 창을 새로 그리려고)

export function openBuildingPanel(b, scene) {
  let timer = null;
  const panel = openPanel({
    title: b.level > 0 ? t('build.level', { name: buildingName(b), lv: b.level }) : t('bld.' + b.type),
    sub: b.level > 0 ? effectText(b.type, b.level) : t('bld.desc.' + b.type),
    onClose: () => { clearInterval(timer); shown = null; },
    render(body) {
      const d = def(b.type);
      if (!state.buildings.includes(b)) { body.appendChild(el('p', 'empty', '-')); return; }

      if (b.job) {
        // 공사 중
        const left = leftMs(b, now());
        const box = el('div', 'job-box', `
          <b>${b.level === 0 ? t('build.newWorking', { left: formatLeft(left) }) : t('build.working', { lv: b.job.toLevel, left: formatLeft(left) })}</b>
          <div class="progress"><i style="width:${Math.round(progress(b, now()) * 100)}%"></i></div>`);
        body.appendChild(box);
        const cancel = el('button', 'btn small', t('build.cancelJob'));
        cancel.onclick = () => scene.cancelJob(b);
        body.appendChild(cancel);
      } else {
        const next = nextLevelInfo(b);
        if (next) {
          const lv = b.level + 1;
          const short = Object.keys(missing(state.inventory, next.cost)).length > 0;
          const busy = buildMs(b.type, lv, buildMods()) > 0 && buildersFree(state.buildings) <= 0;
          const box = el('div', 'job-box', `
            <b>${t('build.next', { lv, eff: b.type === 'stonepath' ? buildingName(b, lv) : effectText(b.type, lv) })}</b>
            <small class="costs">${costHtml(next.cost)} · ${timeText(b.type, lv)}</small>`);
          const up = el('button', 'btn primary small', t('build.upgrade'));
          up.disabled = short || busy;
          up.onclick = () => scene.upgrade(b);
          box.appendChild(up);
          if (busy) box.appendChild(el('small', 'why', t('build.reason.busy')));
          else if (short) box.appendChild(el('small', 'why', t('build.reason.cost')));
          body.appendChild(box);
          if (short) body.appendChild(el('p', 'set-note', t('build.where')));
        } else if (maxLevel(b.type) > 1) {
          body.appendChild(el('p', 'set-note', t('build.maxLevel')));
        }
      }

      const row = el('div', 'set-btns');
      if (d.action && b.level > 0) {
        const open = el('button', 'btn small', t('build.open.' + d.action));
        open.onclick = () => scene.useBuilding(b, true);
        row.appendChild(open);
      }
      const mv = el('button', 'btn small', t('build.move'));
      mv.onclick = () => scene.startPlacing({ moveUid: b.uid });
      row.appendChild(mv);
      if (d.removable && !b.job) {
        const rm = el('button', 'btn small', t('build.remove'));
        rm.onclick = () => scene.removeBuilding(b);
        row.appendChild(rm);
      }
      body.appendChild(row);
    },
  });
  shown = b.uid;
  // 공사 중이면 남은 시간을 1초마다 새로 그림
  if (b.job) timer = setInterval(() => { if (panel.wrap.isConnected) { panel.body.innerHTML = ''; panel.render(panel.body, panel); } else clearInterval(timer); }, 1000);
  return panel;
}
