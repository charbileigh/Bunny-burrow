/* Pure timer model: wall-clock deadlines survive suspension and reopening. */
(function (root) {
  'use strict';
  const DAY = 24 * 60 * 60 * 1000;
  const AMBIENCE = [
    'fire', 'beach', 'ocean', 'rain', 'forest', 'stream', 'forest_trees',
    'lofi_petal', 'lofi_moon', 'lofi_cocoa',
    'lofi_rainy_window', 'lofi_lavender_evening', 'lofi_sunday_sketchbook',
    'lofi_jazz_cafe', 'lofi_cloud_waltz', 'lofi_pixel_night',
    'lofi_neon_bloom', 'lofi_vinyl_keys', 'lofi_sleepy_strings', 'lofi_music_box',
    'none'
  ];
  const BELLS = ['bell_glass', 'bell_chime', 'bell_bowl', 'bell_temple', 'bell_twinkle'];
  const integer = (value, fallback, min, max) => Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  const volume = (value, fallback) => Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
  function fresh() {
    return { version: 4, mode: 'focus', running: false, started: false,
      remaining: 1500000, deadline: 0, focusMinutes: 25, breakMinutes: 5,
      chosen: 0, earned: [], earnedTotal: 0, ambience: 'fire', bell: 'bell_glass',
      volume: .35, bellVolume: .65, bellEnabled: true };
  }
  class BurrowTimer {
    constructor(raw, now = Date.now()) {
      this.state = fresh();
      if (!raw || ![3, 4].includes(raw.version)) return;
      const s = this.state;
      s.focusMinutes = integer(raw.focusMinutes, 25, 1, 120);
      s.breakMinutes = integer(raw.breakMinutes, 5, 1, 60);
      s.chosen = integer(raw.chosen, 0, 0, 12);
      s.ambience = AMBIENCE.includes(raw.ambience) ? raw.ambience : 'fire';
      s.bell = BELLS.includes(raw.bell) ? raw.bell : 'bell_glass';
      s.volume = volume(raw.volume, .35);
      s.bellVolume = volume(raw.bellVolume, .65);
      s.bellEnabled = raw.bellEnabled !== false;
      const migratedAt = Number.isFinite(raw.savedAt) ? raw.savedAt : now;
      s.earned = Array.isArray(raw.earned) ? raw.earned.map(entry => {
        if (Number.isInteger(entry)) return { bunny: entry, at: migratedAt };
        if (!entry || !Number.isInteger(entry.bunny) || !Number.isFinite(entry.at)) return null;
        return { bunny: entry.bunny, at: entry.at };
      }).filter(entry => entry && entry.bunny >= 0 && entry.bunny < 13).slice(-100) : [];
      s.earnedTotal = integer(raw.earnedTotal, s.earned.length, s.earned.length, 1000000);
      s.mode = raw.mode === 'break' ? 'break' : 'focus';
      s.started = raw.started === true;
      s.remaining = Number.isFinite(raw.remaining) ? Math.max(0, Math.min(this.duration(), raw.remaining)) : this.duration();
      if (raw.running === true && s.started && Number.isFinite(raw.deadline) && raw.deadline > 0) {
        s.running = true;
        s.deadline = raw.deadline;
      }
      this.prune(now);
    }
    duration() { return (this.state.mode === 'focus' ? this.state.focusMinutes : this.state.breakMinutes) * 60000; }
    prune(now = Date.now()) {
      const before = this.state.earned.length;
      this.state.earned = this.state.earned.filter(entry => now - entry.at < DAY);
      return before - this.state.earned.length;
    }
    advance(now = Date.now()) {
      const s = this.state, events = [];
      this.prune(now);
      while (s.running && now >= s.deadline) {
        const at = s.deadline;
        if (s.mode === 'focus') {
          s.earned.push({ bunny: s.chosen, at }); s.earned = s.earned.slice(-100); s.earnedTotal++;
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
    stop() {
      const s = this.state;
      s.mode = 'focus'; s.running = false; s.started = false; s.deadline = 0;
      s.remaining = s.focusMinutes * 60000;
    }
    reset() { const s = this.state; s.running = false; s.started = false; s.deadline = 0; s.remaining = this.duration(); }
    clearBurrow() { this.state.earned = []; this.state.earnedTotal = 0; }
    serialise(now = Date.now()) { this.state.version = 4; return { ...this.state, savedAt: now }; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { BurrowTimer, DAY };
  else root.BurrowTimer = BurrowTimer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
