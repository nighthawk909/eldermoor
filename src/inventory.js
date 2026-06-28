// inventory.js — DOM-FREE item model. Notifies a listener (setInvListener) on change.

export const ITEM = {
  Logs: '🪵', Shrimp: '🦐', 'Raw shrimp': '🦐', Ore: '🪨', 'Bronze dagger': '🗡️',
  Bones: '🦴', Tinderbox: '🔥', Coins: '🪙', 'Leather pouch': '👝',
};

export const inv = {}; // name -> { ct, ic }

let onInv = () => {};
/** Register a UI handler called whenever inventory changes. */
export function setInvListener(fn) { onInv = fn; }

export function addItem(n, c = 1) {
  if (!inv[n]) inv[n] = { ct: 0, ic: ITEM[n] || '❓' };
  inv[n].ct += c;
  if (inv[n].ct <= 0) delete inv[n];
  onInv();
}
export function hasItem(n) { return inv[n] && inv[n].ct > 0; }
