// 주민과 이야기하는 창 (화면 아래쪽 대화 상자): 대사, 호감도, 선물, 의뢰 건네기
import { state, emit } from '../state/GameState.js';
import * as R from '../core/residents.js';
import { remove } from '../core/inventory.js';
import { now, dayKey, hourOf, seasonOf } from '../core/clock.js';
import { t, resText, itemName } from '../i18n.js';
import { openPanel, closePanel, el } from './panel.js';
import { openBag } from './bag.js';
import { faceSrc, heartGauge, grantTier, openLetter, colorOf } from './residentBits.js';
import { questOf, questText, questReady, questProgress, claimQuest } from './questPanel.js';
import { sfx } from '../audio.js';

const pickOf = (prefix, n) => `${prefix}.${Math.floor(Math.random() * n)}`;

// 대화 시작. woke = 자는 걸 깨웠을 때
export function openTalk(scene, ch, { woke = false } = {}) {
  const s = { scene, ch, id: ch.id, letters: [], pose: null, item: null, line: null, panel: null };
  say(s, { woke });
  show(s);
}

// 한마디 하기 (하루 첫 대화면 호감도 +2)
function say(s, { woke = false } = {}) {
  const { id } = s, t0 = now();
  const r = R.talk(state.residents, id, dayKey(t0), t0);
  state.stats.talks += 1;
  const tier = R.tierOf(R.rel(state.residents, id).friendship);
  const ctx = { id, first: r.first, awayDays: r.awayDays, hour: hourOf(t0), season: seasonOf(t0), tier, birthday: R.isBirthday(id, t0), woke };
  let key = R.pickLine(ctx);
  for (let i = 0; i < 6 && key === s.line; i++) key = R.pickLine(ctx);   // 같은 말 두 번 연속은 피함
  s.line = key; s.pose = null; s.item = null;
  if (r.gain) s.scene.residentCheer(id, '+' + r.gain + ' ♥');
  if (r.tierUp) { grantTier(id, r.tierUp); s.letters.push(r.tierUp); }
  if (state.tutorial.step === 8) s.scene.setTutorial(9);
  sfx('talk');
  emit('change');
}

function lineVars(s) {
  return { cp: resText(s.id, 'catchphrase'), village: state.village.name, item: s.item ? itemName(s.item) : '' };
}

function show(s) {
  // 이미 열려 있으면 내용만 새로 그림 (창이 깜빡이지 않게)
  if (s.panel?.wrap.isConnected) { s.panel.body.innerHTML = ''; s.panel.render(s.panel.body, s.panel); return; }
  const { id } = s;
  const bd = R.isBirthday(id, now());
  s.panel = openPanel({
    cls: 'talk-wrap',
    title: resText(id, 'short'),
    sub: resText(id, 'animal') + ' · ' + resText(id, 'trait') + (bd ? ' · 🎂 ' + t('resp.bdToday') : ''),
    onClose: reason => { clearInterval(s.typing); if (reason !== 'replace') end(s); },
    render(body) {
      clearInterval(s.typing);
      const rr = R.rel(state.residents, id);
      const main = el('div', 'talk-main');
      const face = el('img', 'talk-face' + (s.pose ? ' ' + s.pose : ''));
      face.src = faceSrc(id, s.pose);
      face.alt = '';
      face.style.setProperty('--c', colorOf(id));
      const right = el('div', 'talk-right');
      const line = el('p', 'talk-line');
      right.appendChild(line);
      right.appendChild(el('div', '', heartGauge(rr.friendship)));
      main.append(face, right);
      body.appendChild(main);

      // 글자가 한 글자씩 나옴. 누르면 바로 다 보임
      const text = t(s.line, lineVars(s));
      let i = 0;
      s.typing = setInterval(() => { i += 1; line.textContent = text.slice(0, i); if (i >= text.length) clearInterval(s.typing); }, 28);
      line.onclick = () => { clearInterval(s.typing); line.textContent = text; };

      // 이 주민의 오늘 의뢰
      const q = questOf(id);
      if (q) {
        const ready = questReady(q);
        const qb = el('div', 'talk-quest' + (ready ? ' ready' : ''), `<span>📜 ${questText(q)}</span><small>${t('quest.progress', { a: questProgress(q), b: q.n })}</small>`);
        if (ready) {
          const give = el('button', 'btn small primary', t(q.type.startsWith('deliver') ? 'quest.give' : 'quest.claim'));
          give.onclick = () => {
            const r = claimQuest(s.scene, q);
            if (!r.ok) return;
            s.line = pickOf('quest.thanks', 3); s.pose = 'happy'; s.item = null;
            if (r.tierUp) s.letters.push(r.tierUp);
            show(s);
          };
          qb.appendChild(give);
        }
        body.appendChild(qb);
      }

      const btns = el('div', 'talk-btns');
      const more = el('button', 'btn small', '💬 ' + t('talk.more'));
      more.onclick = () => { say(s); show(s); };
      const given = rr.giftDay === dayKey();
      const gift = el('button', 'btn small' + (given ? '' : ' primary'), given ? t('talk.giftDone') : '🎁 ' + t('talk.gift'));
      gift.disabled = given;
      gift.onclick = () => pickGift(s);
      const bye = el('button', 'btn small', '👋 ' + t('talk.bye'));
      bye.onclick = () => closePanel();
      btns.append(more, gift, bye);
      body.appendChild(btns);
    },
  });
  s.scene.liftFor(s.panel.wrap.querySelector('.panel'));
}

// 가방에서 선물 고르기 (아는 사이부터는 좋아하는 물건에 ♥ 표시)
function pickGift(s) {
  const { id } = s;
  const known = R.tierOf(R.rel(state.residents, id).friendship) >= 1;
  openBag({
    gift: {
      title: t('talk.giftTitle', { name: resText(id, 'short') }),
      sub: t('talk.giftSub'),
      liked: itemId => known && R.giftReaction(id, itemId) === 'love',
      onPick: itemId => giveGift(s, itemId),
      onCancel: () => show(s),
    },
  });
}

function giveGift(s, itemId) {
  const { id } = s;
  const res = R.giveGift(state.residents, id, itemId, dayKey(), now());
  if (!res.ok) { show(s); return; }
  remove(state.inventory, itemId, 1);
  state.stats.gifts += 1;
  s.item = itemId;
  s.line = res.birthday ? 'gift.birthday' : pickOf('gift.' + res.reaction, res.reaction === 'dislike' ? 2 : 3);
  s.pose = res.reaction === 'dislike' ? 'sad' : 'happy';
  s.scene.giftReaction(s.ch, res.reaction, res.gain, res.birthday);
  if (res.tierUp) { grantTier(id, res.tierUp); s.letters.push(res.tierUp); }
  emit('change');
  show(s);
}

// 대화 끝: 주민은 다시 하던 일로. 단계가 올랐으면 편지를 차례로 보여줌
function end(s) {
  s.scene.endTalk(s.ch);
  const next = () => { const tier = s.letters.shift(); if (tier) openLetter(s.id, tier, { onDone: next }); };
  next();
}
