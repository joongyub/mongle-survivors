// 설정 창: 소리, 지금 저장, 백업 내보내기/가져오기, 처음부터
import { state, emit } from '../state/GameState.js';
import { SaveService } from '../services/SaveService.js';
import { t } from '../i18n.js';
import { openPanel, el } from './panel.js';
import { toast } from './toast.js';
import { timeAgo } from './time.js';
import { sfx } from '../audio.js';

export function openSettings() {
  let resetArmed = false;
  openPanel({
    title: t('settings.title'),
    sub: t('settings.saved', { when: timeAgo(state.lastClockAt) }),
    render(body, panel) {
      // 소리
      const sound = el('div', 'set-row', `<span>${t('settings.sound')}</span>`);
      const sBtn = el('button', 'btn small', t(state.settings.muted ? 'settings.off' : 'settings.on'));
      sBtn.onclick = () => {
        state.settings.muted = !state.settings.muted;
        sBtn.textContent = t(state.settings.muted ? 'settings.off' : 'settings.on');
        emit('change'); sfx('tap');
      };
      sound.appendChild(sBtn);
      body.appendChild(sound);

      // 지금 저장
      const saveRow = el('div', 'set-col', `<p class="set-note">${t('settings.autosave')}</p>`);
      const saveBtn = el('button', 'btn small', '💾 ' + t('settings.saveNow'));
      saveBtn.onclick = async () => {
        const ok = await SaveService.save();
        toast(t(ok ? 'settings.savedToast' : 'settings.saveFail'));
        panel.setSub(t('settings.saved', { when: timeAgo(state.lastClockAt) }));
      };
      const sb = el('div', 'set-btns'); sb.appendChild(saveBtn); saveRow.appendChild(sb);
      body.appendChild(saveRow);

      // 백업 내보내기
      const exp = el('div', 'set-col', `<h4>${t('settings.backup')}</h4>`);
      const eb = el('div', 'set-btns');
      const dl = el('button', 'btn small', '📁 ' + t('settings.download'));
      dl.onclick = async () => { await SaveService.save(); if (!SaveService.downloadFile()) toast(t('settings.downloadFail')); };
      const cp = el('button', 'btn small', '📋 ' + t('settings.copy'));
      const codeOut = el('textarea', 'code-box hidden');
      codeOut.readOnly = true; codeOut.id = 'backupCode';
      cp.onclick = async () => {
        await SaveService.save();
        const code = SaveService.exportCode();
        codeOut.value = code; codeOut.classList.remove('hidden');
        try { await navigator.clipboard.writeText(code); toast(t('settings.copied'), 3000); }
        catch { codeOut.focus(); codeOut.select(); toast(t('settings.copyFail'), 3000); }
      };
      eb.append(dl, cp); exp.append(eb, codeOut);
      body.appendChild(exp);

      // 백업 불러오기
      const imp = el('div', 'set-col', `<h4>${t('settings.import')}</h4>`);
      const file = el('input'); file.type = 'file'; file.accept = '.json,application/json,text/plain'; file.className = 'hidden'; file.id = 'backupFile';
      const fileBtn = el('button', 'btn small', '📂 ' + t('settings.importFile'));
      fileBtn.onclick = () => file.click();
      file.onchange = async () => { const f = file.files[0]; if (f) doImport(await f.text()); file.value = ''; };
      const paste = el('textarea', 'code-box'); paste.placeholder = t('settings.importPaste'); paste.id = 'backupPaste';
      const pasteBtn = el('button', 'btn small', t('settings.importBtn'));
      pasteBtn.onclick = () => { if (paste.value.trim()) doImport(paste.value); };
      const ib = el('div', 'set-btns'); ib.append(fileBtn, pasteBtn);
      imp.append(ib, paste, file);
      body.appendChild(imp);

      // 처음부터
      const reset = el('div', 'set-row');
      const rBtn = el('button', 'btn small danger', t('settings.reset'));
      rBtn.onclick = async () => {
        if (!resetArmed) { resetArmed = true; rBtn.textContent = t('settings.resetConfirm'); sfx('nope'); return; }
        await SaveService.clear();
        state.playerId = null;          // 화면을 떠날 때 다시 저장되지 않게
        location.reload();
      };
      reset.appendChild(rBtn);
      body.appendChild(reset);
    },
  });
}

async function doImport(text) {
  const r = await SaveService.importText(text);
  if (!r.ok) { sfx('nope'); toast(t('settings.import.' + r.reason), 3500); return; }
  toast(t('settings.importOk'));
  state.playerId = null;                // 지금 상태로 덮어쓰지 않게
  setTimeout(() => location.reload(), 900);
}
