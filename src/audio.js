/* Optional non-speech cues: only explicit user activation may create or resume audio. */
(() => {
  let context = null, enabled = false, muted = true, volume = 0.25;
  const active = new Set(), recent = new Map();
  const frequencies = { 'validation-error': 220, repair: 440, demo: 523.25, ablation: 587.33, evaluation: 659.25 };
  try { const value = JSON.parse(localStorage.getItem('cuereport_audio_v1')); if (value) { muted = value.muted !== false; if (Number.isFinite(value.volume)) volume = Math.max(0, Math.min(1, value.volume)); } } catch { /* Optional preference. */ }
  const remember = () => { try { localStorage.setItem('cuereport_audio_v1', JSON.stringify({ muted, volume })); } catch { /* Page-only preference. */ } };
  const announce = text => { const node = document.getElementById('audio-status'); if (node && node.textContent !== text) node.textContent = text; };
  function render() {
    const button = document.getElementById('audio-toggle'), input = document.getElementById('audio-volume');
    if (button) { button.textContent = enabled && !muted ? 'Mute sound cues' : 'Enable sound cues'; button.setAttribute('aria-pressed', String(enabled && !muted)); }
    if (input) input.value = String(volume);
  }
  async function toggle() {
    if (enabled && !muted) { muted = true; for (const gain of active) gain.gain.value = 0; remember(); render(); announce('Sound cues muted. Text updates remain active.'); return; }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw Error();
      if (!context || context.state === 'closed') context = new Audio();
      if (context.state !== 'running') await context.resume();
      if (context.state !== 'running') throw Error();
      enabled = true; muted = false; remember(); render(); announce('Sound cues enabled.');
    } catch { enabled = false; render(); announce('Sound cues unavailable. Text updates remain active.'); }
  }
  function cue(event) {
    if (!Object.hasOwn(frequencies, event) || !enabled || muted || volume === 0 || context?.state !== 'running') return false;
    const now = performance.now(); if (recent.has(event) && now - recent.get(event) < 1000) return false;
    try {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.frequency.value = frequencies[event]; oscillator.type = 'sine';
      gain.gain.setValueAtTime(0, context.currentTime); gain.gain.linearRampToValueAtTime(volume * 0.12, context.currentTime + 0.01); gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.09);
      oscillator.connect(gain); gain.connect(context.destination); active.add(gain);
      oscillator.onended = () => { active.delete(gain); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(); oscillator.stop(context.currentTime + 0.1); recent.set(event, now); return true;
    } catch { announce('Sound cue unavailable. Text updates remain active.'); return false; }
  }
  function mount() {
    render(); document.getElementById('audio-toggle')?.addEventListener('click', toggle);
    document.getElementById('audio-volume')?.addEventListener('input', event => { volume = Math.max(0, Math.min(1, Number(event.target.value) || 0)); for (const gain of active) gain.gain.value = 0; remember(); });
    document.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.isComposing || event.repeat || !event.altKey || !event.shiftKey || event.code !== 'KeyM' || event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
      event.preventDefault(); toggle();
    });
  }
  window.CueAudio = { cue, toggle };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
