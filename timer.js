/* Pure timer model: wall-clock deadlines survive suspension and reopening. */
(function (root) {
  'use strict';
  const AMBIENCE = ['fire', 'beach', 'ocean', 'rain', 'forest', 'stream', 'forest_trees', 'lofi_petal', 'lofi_moon', 'lofi_cocoa', 'none'];
  const BELLS = ['bell_glass', 'bell_chime', 'bell_bowl'];
  const integer = (value, fallback, min, max) => Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  const volume = (value, fallback) => Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
  function fresh() {
    return { version: 3, mode: 'focus', running: false, started: false,
      remaining: 1500000, deadline: 0, focusMinutes: 25, breakMinutes: 5,
      chosen: 0, earned: [], earnedTotal: 0, ambience: 'fire', bell: 'bell_glass',
      volume: .35, bellVolume: .65, bellEnabled: true };
  }
  class BurrowTimer {
    constructor(raw) {
      this.state = fresh();
      if (!raw || raw.version !== 3) return;
      const s = this.state;
      s.focusMinutes = integer(raw.focusMinutes, 25, 1, 120);
      s.breakMinutes = integer(raw.breakMinutes, 5, 1, 60);
      s.chosen = integer(raw.chosen, 0, 0, 7);
      s.ambience = AMBIENCE.includes(raw.ambience) ? raw.ambience : 'fire';
      s.bell = BELLS.includes(raw.bell) ? raw.bell : 'bell_glass';
      s.volume = volume(raw.volume, .35);
      s.bellVolume = volume(raw.bellVolume, .65);
      s.bellEnabled = raw.bellEnabled !== false;
      s.earned = Array.isArray(raw.earned) ? raw.earned.filter(n => Number.isInteger(n) && n >= 0 && n < 8).slice(-100) : [];
      s.earnedTotal = integer(raw.earnedTotal, s.earned.length, s.earned.length, 1000000);
      s.mode = raw.mode === 'break' ? 'break' : 'focus';
      s.started = raw.started === true;
      s.remaining = Number.isFinite(raw.remaining) ? Math.max(0, Math.min(this.duration(), raw.remaining)) : this.duration();
      if (raw.running === true && s.started && Number.isFinite(raw.deadline) && raw.deadline > 0) {
        s.running = true;
        s.deadline = raw.deadline;
      }
    }
    duration() { return (this.state.mode === 'focus' ? this.state.focusMinutes : this.state.breakMinutes) * 60000; }
    advance(now = Date.now()) {
      const s = this.state, events = [];
      while (s.running && now >= s.deadline) {
        const at = s.deadline;
        if (s.mode === 'focus') {
          s.earned.push(s.chosen); s.earned = s.earned.slice(-100); s.earnedTotal++;
          s.mode = 'break'; s.deadline = at + s.breakMinutes * 60000;
          events.push({ type: 'focus-complete', at });
        } else {
          s.mode = 'focus'; s.running = false; s.started = false;
          s.deadline = 0; s.remaining = s.focusMinutes * 60000;
          events.push({ type: 'break-complete', at });
        }
      }
      if (s.running) s.remaining = Math.max(0, Math.min(this.duration(), s.deadline - now));
      return events;
    }
    start(now = Date.now()) { this.state.running = true; this.state.started = true; this.state.deadline = now + this.state.remaining; }
    pause(now = Date.now()) { const events = this.advance(now); this.state.running = false; return events; }
    reset() { const s = this.state; s.running = false; s.started = false; s.deadline = 0; s.remaining = this.duration(); }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { BurrowTimer };
  else root.BurrowTimer = BurrowTimer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
