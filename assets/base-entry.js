/* The image doorlock is the sole entrance; decryption remains StatiCrypt's. */
document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.doorlock-hotspot');
  const dialog = document.querySelector('.doorlock-dialog');
  if (!button || !dialog) return;
  const openLock = () => {
    dialog.showModal();
    document.getElementById('staticrypt-password').focus();
  };
  button.addEventListener('click', openLock);
  document.querySelector('.lock-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }});
  dialog.addEventListener('close', () => button.focus());
});
window.baseEntry = {
  replace(html) {
    const gate = document.getElementById('staticrypt_content');
    const manualEntry = gate && !gate.classList.contains('hidden');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const replace = () => { document.open(); document.write(html); document.close(); };
    if (!manualEntry || reduced) { replace(); return; }
    try { sessionStorage.setItem('baseArrival', '1'); } catch (_) {}
    document.querySelector('.console-state').textContent = 'OPEN';
    document.querySelector('#submit').textContent = '잠금 해제됨';
    window.setTimeout(() => {
      document.querySelector('.doorlock-dialog').close();
      document.body.classList.add('descending');
      window.setTimeout(replace, 1400);
    }, 300);
  }
};
