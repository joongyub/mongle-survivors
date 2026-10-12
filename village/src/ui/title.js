// 타이틀 화면: 이어하기 / 촌장 고르기 + 마을 이름
import { RESIDENTS, RESIDENT_BY_ID } from '../data/residents.js';
import { CHARACTER_IMAGES } from '../data/assets.js';
import { t } from '../i18n.js';
import { timeAgo } from './time.js';

// saved: 저장된 게임 정보 (없으면 null)
export function showTitle({ saved, onContinue, onNew }) {
  const $ = id => document.getElementById(id);
  const list = $('mayorList'), info = $('mayorInfo'), nameInput = $('villageName');
  let selected = 'momo';

  nameInput.value = t('title.defaultVillage');
  list.innerHTML = '';
  for (const r of RESIDENTS) {
    const b = document.createElement('button');
    b.className = 'mayor';
    b.style.setProperty('--c', r.color);
    b.innerHTML = `<img src="${CHARACTER_IMAGES[r.id]}" alt=""><span>${r.short}</span>`;
    b.onclick = () => select(r.id);
    b.dataset.id = r.id;
    list.appendChild(b);
  }

  function select(id) {
    selected = id;
    list.querySelectorAll('.mayor').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
    const r = RESIDENT_BY_ID[id];
    info.innerHTML = t('title.mayorInfo', { name: r.name, animal: r.animal, trait: r.trait, bonus: r.bonus });
  }
  select(selected);

  const hide = () => $('title').classList.add('hidden');

  // 저장된 마을이 있으면: 이어하기 카드를 먼저 보여줌
  const showMode = mode => {
    const hasSave = !!saved;
    $('continueBox').classList.toggle('hidden', !hasSave || mode !== 'continue');
    $('newBox').classList.toggle('hidden', hasSave && mode === 'continue');
    $('newWarn').classList.toggle('hidden', !hasSave);
    $('backBtn').classList.toggle('hidden', !hasSave);
    $('startBtn').textContent = t(hasSave ? 'title.startNew' : 'title.start');
    $('startBtn').classList.toggle('danger', hasSave);
  };
  if (saved) {
    const mayor = RESIDENT_BY_ID[saved.mayor?.residentId] || RESIDENTS[0];
    $('contImg').src = CHARACTER_IMAGES[mayor.id];
    $('contInfo').textContent = t('title.savedInfo', { name: saved.village?.name || '', mayor: mayor.short, coins: (saved.inventory?.coins ?? 0).toLocaleString() });
    $('contWhen').textContent = t('title.lastPlayed', { when: timeAgo(saved.lastClockAt) });
    $('continueBtn').onclick = () => { hide(); onContinue(); };
    $('newGameBtn').onclick = () => showMode('new');
    $('backBtn').onclick = () => showMode('continue');
  }
  showMode('continue');

  $('startBtn').onclick = () => {
    const villageName = nameInput.value.trim() || t('title.defaultVillage');
    hide();
    onNew({ mayorId: selected, villageName });
  };
}
