// dialogue.js — NPC dialogue queue + dialogue box.
import { checkStep } from './quests.js';

const dlgEl = document.getElementById('dlg');
let dlgQ = [], dlgSt = null;

export function dialog(st) { dlgQ = st.dlg.slice(); dlgSt = st; nextDlg(); }
export function nextDlg() {
  if (!dlgQ.length) { hideDlg(); if (dlgSt && dlgSt.id === 'guide') checkStep('guide'); dlgSt = null; return; }
  document.getElementById('dlgwho').textContent = dlgSt.label;
  document.getElementById('dlgtx').textContent = dlgQ.shift();
  dlgEl.style.display = 'block';
}
export function hideDlg() { dlgEl.style.display = 'none'; }
export function initDialogue() { document.getElementById('dlgbtn').onclick = nextDlg; }
