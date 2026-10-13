// 오늘의 의뢰 창: 의뢰 3개, 진행도, 보상 받기, 다른 의뢰로 바꾸기
import { state, emit } from '../state/GameState.js';
import { FRIEND_GAIN } from '../data/dialogue.js';
import { QUEST_REROLLS } from '../data/quests.js';
import * as Q from '../core/quests.js';
import { rel, addFriendship } from '../core/residents.js';
import { now, seasonOf } from '../core/clock.js';
import { t, resText, itemName, formatLeft } from '../i18n.js';
import { openPanel, refreshPanel, el } from './panel.js';
import { faceSrc, grantTier, openLetter, colorOf } from './residentBits.js';
import { toast } from './toast.js';
import { sfx } from '../audio.js';

// 의뢰 글자: "당근 3개 가져다줘"
export function questText(q) {
  return t('quest.' + q.type, { n: q.n, item: q.item ? itemName(q.item) : '' });
}

// 의뢰를 만들 때 필요한 정보
export function questCtx() {
  return { playerId: state.playerId || 'local', t: now(), residents: Object.keys(state.residents), season: seasonOf(), stats: state.stats };
}

// 날이 바뀌었으면 새 의뢰 (아침 6시). 새로 왔으면 true
export function refreshQuestsNow() {
  if (!Object.keys(state.residents).length) return false;
  return Q.refreshQuests(state.quests, questCtx());
}

export const questProgress = q => Q.progress(q, state.inventory, state.stats);
export const questReady = q => Q.isReady(q, state.inventory, state.stats);
export const readyCount = () => state.quests.list.filter(questReady).length;
export const questOf = id => state.quests.list.find(q => q.who === id && !q.claimed) || null;

// 의뢰 완료: 코인 + 그 주민 호감도 +5. 단계가 오르면 편지 → { ok, coins, tierUp }
export function claimQuest(scene, q) {
  const r = Q.claim(q, state.inventory, state.stats);
  if (!r.ok) { sfx('nope'); return r; }
  state.stats.questsDone += 1;
  let tierUp = null;
  if (state.residents[q.who]) {
    tierUp = addFriendship(rel(state.residents, q.who), FRIEND_GAIN.quest);
    if (tierUp) grantTier(q.who, tierUp);
  }
  sfx('coin');
  scene?.residentCheer?.(q.who, '+' + FRIEND_GAIN.quest + ' ♥');
  toast(t('quest.got', { coins: r.coins, name: resText(q.who, 'short'), f: FRIEND_GAIN.quest }));
  emit('change');
  emit('coins');
  return { ok: true, coins: r.coins, tierUp };
}

export function openQuestPanel(scene) {
  refreshQuestsNow();
  if (state.tutorial.step === 9) scene?.finishTutorial?.();
  let timer = null;
  const panel = openPanel({
    title: t('quest.title'),
    sub: t('quest.sub', { left: formatLeft(Q.nextQuestAt(now()) - now()) }),
    onClose: () => clearInterval(timer),
    render(body) {
      const list = state.quests.list;
      if (!list.length) { body.appendChild(el('p', 'empty', t('quest.none'))); return; }
      if (list.every(q => q.claimed)) body.appendChild(el('p', 'quest-all', t('quest.allDone')));
      const box = el('div', 'shop-list');
      for (const q of list) box.appendChild(questRow(scene, q));
      body.appendChild(box);
      const left = QUEST_REROLLS - state.quests.rerolls;
      body.appendChild(el('p', 'set-note', t('quest.rerollLeft', { n: Math.max(0, left) })));
    },
  });
  // 남은 시간 글자를 1분마다 고침 (날이 바뀌면 새 의뢰로 다시 그림)
  timer = setInterval(() => {
    if (!panel.wrap.isConnected) { clearInterval(timer); return; }
    panel.setSub(t('quest.sub', { left: formatLeft(Q.nextQuestAt(now()) - now()) }));
    if (refreshQuestsNow()) { emit('change'); refreshPanel(); }
  }, 30000);
  return panel;
}

function questRow(scene, q) {
  const done = q.claimed, ready = questReady(q), have = questProgress(q);
  const deliver = q.type.startsWith('deliver');
  const row = el('div', 'shop-row quest-row' + (done ? ' done' : ready ? ' ready' : ''), `
    <img class="q-face" src="${faceSrc(q.who)}" alt="">
    <div class="shop-text"><b>${resText(q.who, 'short')}</b>
      <span class="tag good">${t('quest.reward', { coins: q.coins, f: FRIEND_GAIN.quest })}</span>
      <small class="q-text">${questText(q)}</small>
      <div class="progress"><i style="width:${Math.round(have / q.n * 100)}%"></i></div>
      <small>${done ? t('quest.done') : t('quest.progress', { a: have, b: q.n })}${!done && !ready ? ' · ' + t('quest.hint.' + q.type) : ''}</small>
    </div>`);
  row.querySelector('.q-face').style.background = `color-mix(in srgb, ${colorOf(q.who)} 30%, #fff)`;
  if (!done) {
    const btns = el('div', 'shop-btns col');
    const claim = el('button', 'btn small primary', t(deliver ? 'quest.give' : 'quest.claim'));
    claim.disabled = !ready;
    claim.onclick = () => {
      const r = claimQuest(scene, q);
      if (!r.ok) return;
      if (r.tierUp) openLetter(q.who, r.tierUp, { onDone: () => openQuestPanel(scene) });
      else refreshPanel();
    };
    btns.appendChild(claim);
    if (state.quests.rerolls < QUEST_REROLLS) {
      const rr = el('button', 'btn small', t('quest.reroll'));
      rr.onclick = () => {
        const r = Q.reroll(state.quests, q, questCtx());
        if (!r.ok) return;
        sfx('tap');
        toast(t('quest.rerolled'));
        emit('change');
        refreshPanel();
      };
      btns.appendChild(rr);
    }
    row.appendChild(btns);
  }
  return row;
}
