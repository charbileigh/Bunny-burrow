/* Pure Bunny Burrow model: timer recovery, history, goals and local backups. */
(function (root) {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;
  const HISTORY_LIMIT = 500;
  const AMBIENCE = [
    'fire', 'beach', 'ocean', 'rain', 'forest', 'stream', 'forest_trees',
    'lofi_petal', 'lofi_moon', 'lofi_cocoa',
    'lofi_rainy_window', 'lofi_lavender_evening', 'lofi_sunday_sketchbook',
    'lofi_jazz_cafe', 'lofi_cloud_waltz', 'lofi_pixel_night',
    'lofi_neon_bloom', 'lofi_vinyl_keys', 'lofi_sleepy_strings', 'lofi_music_box',
    'jazz_velvet_swing', 'jazz_bossa_bloom', 'jazz_midnight_sax',
    'jazz_brass_parade', 'jazz_piano_ballad',
    'synthwave_arcade_drive', 'synthwave_cosmic_drift',
    'chillwave_sunset_tape', 'chillwave_aqua_dream', 'chillwave_pastel_dusk',
    'none'
  ];
  const BELLS = [
    'bell_glass', 'bell_chime', 'bell_bowl', 'bell_temple', 'bell_twinkle',
    'bell_harbour', 'bell_clock_duet'
  ];
  const BUILTIN_PRESETS = {
    study: { name: 'Study Sprint', focus: 25, break: 5, longBreak: 15, cycle: 4 },
    deep: { name: 'Deep Work', focus: 50, break: 10, longBreak: 25, cycle: 3 },
    quick: { name: 'Quick Task', focus: 15, break: 3, longBreak: 10, cycle: 4 }
  };

  const integer = (value, fallback, min, max) => Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  const volume = (value, fallback) => Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
  const cleanText = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  const validSound = (value, fallback = 'none') => AMBIENCE.includes(value) ? value : fallback;
  const localDateKey = timestamp => {
    const date = new Date(timestamp);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  };
  const startOfLocalDay = timestamp => {
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };
  const dayOffsetKey = (now, offset) => localDateKey(startOfLocalDay(now) - offset * DAY);

  function fresh() {
    return {
      version: 6, mode: 'focus', running: false, started: false, isLongBreak: false,
      remaining: 1500000, deadline: 0, focusMinutes: 25, breakMinutes: 5,
      longBreakMinutes: 15, cycleLength: 4, cycleProgress: 0,
      chosen: 0, earned: [], earnedTotal: 0, history: [], task: '',
      dailyGoal: 4, ambience: 'fire', activeAmbience: 'fire', breakAmbience: 'none',
      favourites: ['fire', 'lofi_petal'], shuffleFavourites: false, fadeAudio: true,
      bell: 'bell_glass', volume: .35, bellVolume: .65, bellEnabled: true,
      notificationsEnabled: false, countdownNotificationsEnabled: false, customPresets: []
    };
  }

  function normaliseHistory(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(entry => {
      if (!entry || !Number.isFinite(entry.at)) return null;
      return {
        at: entry.at,
        minutes: integer(entry.minutes, 25, 1, 120),
        task: cleanText(entry.task, 100),
        bunny: integer(entry.bunny, 0, 0, 12),
        sound: validSound(entry.sound, 'none')
      };
    }).filter(Boolean).sort((a, b) => a.at - b.at).slice(-HISTORY_LIMIT);
  }

  function normalisePresets(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(preset => {
      const name = cleanText(preset?.name, 24);
      if (!name) return null;
      return {
        name,
        focus: integer(preset.focus, 25, 1, 120),
        break: integer(preset.break, 5, 1, 60),
        longBreak: integer(preset.longBreak, 15, 1, 60),
        cycle: integer(preset.cycle, 4, 2, 8)
      };
    }).filter(Boolean).slice(-8);
  }

  class BurrowTimer {
    constructor(raw, now = Date.now()) {
      this.state = fresh();
      if (!raw || ![3, 4, 5, 6].includes(raw.version)) return;
      const s = this.state;
      s.focusMinutes = integer(raw.focusMinutes, 25, 1, 120);
      s.breakMinutes = integer(raw.breakMinutes, 5, 1, 60);
      s.longBreakMinutes = integer(raw.longBreakMinutes, 15, 1, 60);
      s.cycleLength = integer(raw.cycleLength, 4, 2, 8);
      s.cycleProgress = integer(raw.cycleProgress, 0, 0, s.cycleLength - 1);
      s.chosen = integer(raw.chosen, 0, 0, 12);
      s.ambience = validSound(raw.ambience, 'fire');
      s.activeAmbience = validSound(raw.activeAmbience, s.ambience);
      s.breakAmbience = validSound(raw.breakAmbience, 'none');
      s.favourites = Array.isArray(raw.favourites)
        ? [...new Set(raw.favourites.filter(sound => AMBIENCE.includes(sound) && sound !== 'none'))].slice(0, 24)
        : ['fire', 'lofi_petal'];
      s.shuffleFavourites = raw.shuffleFavourites === true;
      s.fadeAudio = raw.fadeAudio !== false;
      s.bell = BELLS.includes(raw.bell) ? raw.bell : 'bell_glass';
      s.volume = volume(raw.volume, .35);
      s.bellVolume = volume(raw.bellVolume, .65);
      s.bellEnabled = raw.bellEnabled !== false;
      s.notificationsEnabled = raw.notificationsEnabled === true;
      s.countdownNotificationsEnabled = raw.countdownNotificationsEnabled === true;
      s.task = cleanText(raw.task, 100);
      s.dailyGoal = integer(raw.dailyGoal, 4, 1, 20);
      s.customPresets = normalisePresets(raw.customPresets);
      s.history = normaliseHistory(raw.history);

      const migratedAt = Number.isFinite(raw.savedAt) ? raw.savedAt : now;
      s.earned = Array.isArray(raw.earned) ? raw.earned.map(entry => {
        if (Number.isInteger(entry)) return { bunny: entry, at: migratedAt };
        if (!entry || !Number.isInteger(entry.bunny) || !Number.isFinite(entry.at)) return null;
        return { bunny: entry.bunny, at: entry.at };
      }).filter(entry => entry && entry.bunny >= 0 && entry.bunny < 13).slice(-100) : [];
      s.earnedTotal = integer(raw.earnedTotal, Math.max(s.earned.length, s.history.length), 0, 1000000);
      s.mode = raw.mode === 'break' ? 'break' : 'focus';
      s.isLongBreak = s.mode === 'break' && raw.isLongBreak === true;
      s.started = raw.started === true;
      s.remaining = Number.isFinite(raw.remaining) ? Math.max(0, Math.min(this.duration(), raw.remaining)) : this.duration();
      if (raw.running === true && s.started && Number.isFinite(raw.deadline) && raw.deadline > 0) {
        s.running = true;
        s.deadline = raw.deadline;
      }
      this.prune(now);
    }

    duration() {
      const s = this.state;
      if (s.mode === 'focus') return s.focusMinutes * 60000;
      return (s.isLongBreak ? s.longBreakMinutes : s.breakMinutes) * 60000;
    }

    prune(now = Date.now()) {
      const before = this.state.earned.length;
      this.state.earned = this.state.earned.filter(entry => now - entry.at < DAY);
      return before - this.state.earned.length;
    }

    chooseSessionSound(random = Math.random) {
      const s = this.state;
      if (s.shuffleFavourites && s.favourites.length) {
        const index = Math.min(s.favourites.length - 1, Math.floor(random() * s.favourites.length));
        s.activeAmbience = s.favourites[index];
      } else {
        s.activeAmbience = s.ambience;
      }
      return s.activeAmbience;
    }

    advance(now = Date.now()) {
      const s = this.state, events = [];
      this.prune(now);
      while (s.running && now >= s.deadline) {
        const at = s.deadline;
        if (s.mode === 'focus') {
          s.earned.push({ bunny: s.chosen, at });
          s.earned = s.earned.slice(-100);
          s.earnedTotal++;
          s.history.push({ at, minutes: s.focusMinutes, task: s.task, bunny: s.chosen, sound: s.activeAmbience });
          s.history = s.history.slice(-HISTORY_LIMIT);
          s.cycleProgress++;
          s.isLongBreak = s.cycleProgress >= s.cycleLength;
          if (s.isLongBreak) s.cycleProgress = 0;
          s.mode = 'break';
          s.deadline = at + (s.isLongBreak ? s.longBreakMinutes : s.breakMinutes) * 60000;
          events.push({ type: 'focus-complete', at, longBreak: s.isLongBreak });
        } else {
          s.mode = 'focus';
          s.isLongBreak = false;
          s.running = false;
          s.started = false;
          s.deadline = 0;
          s.remaining = s.focusMinutes * 60000;
          s.task = '';
          events.push({ type: 'break-complete', at });
        }
      }
      if (s.running) s.remaining = Math.max(0, Math.min(this.duration(), s.deadline - now));
      return events;
    }

    start(now = Date.now(), random = Math.random) {
      if (!this.state.started && this.state.mode === 'focus') this.chooseSessionSound(random);
      this.state.running = true;
      this.state.started = true;
      this.state.deadline = now + this.state.remaining;
    }

    pause(now = Date.now()) {
      const events = this.advance(now);
      this.state.running = false;
      return events;
    }

    stop() {
      const s = this.state;
      s.mode = 'focus';
      s.isLongBreak = false;
      s.running = false;
      s.started = false;
      s.deadline = 0;
      s.remaining = s.focusMinutes * 60000;
    }

    reset() {
      const s = this.state;
      s.running = false;
      s.started = false;
      s.deadline = 0;
      s.remaining = this.duration();
    }

    applyPreset(preset) {
      if (this.state.started || !preset) return false;
      const s = this.state;
      s.focusMinutes = integer(preset.focus, s.focusMinutes, 1, 120);
      s.breakMinutes = integer(preset.break, s.breakMinutes, 1, 60);
      s.longBreakMinutes = integer(preset.longBreak, s.longBreakMinutes, 1, 60);
      s.cycleLength = integer(preset.cycle, s.cycleLength, 2, 8);
      s.cycleProgress = 0;
      s.mode = 'focus';
      s.isLongBreak = false;
      this.reset();
      return true;
    }

    saveCustomPreset(name) {
      const preset = {
        name: cleanText(name, 24),
        focus: this.state.focusMinutes,
        break: this.state.breakMinutes,
        longBreak: this.state.longBreakMinutes,
        cycle: this.state.cycleLength
      };
      if (!preset.name) return null;
      this.state.customPresets = this.state.customPresets.filter(item => item.name.toLowerCase() !== preset.name.toLowerCase());
      this.state.customPresets.push(preset);
      this.state.customPresets = this.state.customPresets.slice(-8);
      return preset;
    }

    toggleFavourite(sound) {
      if (!AMBIENCE.includes(sound) || sound === 'none') return false;
      const s = this.state;
      if (s.favourites.includes(sound)) s.favourites = s.favourites.filter(item => item !== sound);
      else s.favourites = [...s.favourites, sound].slice(-24);
      return s.favourites.includes(sound);
    }

    clearBurrow() {
      this.state.earned = [];
      this.state.earnedTotal = 0;
    }

    clearHistory() {
      this.state.history = [];
      this.state.cycleProgress = 0;
    }

    stats(now = Date.now()) {
      const history = this.state.history;
      const today = localDateKey(now);
      const weekKeys = Array.from({ length: 7 }, (_, index) => dayOffsetKey(now, 6 - index));
      const byDay = Object.fromEntries(weekKeys.map(key => [key, { sessions: 0, minutes: 0 }]));
      const bunnyCounts = Array(13).fill(0);
      const soundCounts = {};
      const allDayMinutes = {};
      for (const entry of history) {
        const key = localDateKey(entry.at);
        if (byDay[key]) {
          byDay[key].sessions++;
          byDay[key].minutes += entry.minutes;
        }
        allDayMinutes[key] = (allDayMinutes[key] || 0) + entry.minutes;
        bunnyCounts[entry.bunny]++;
        soundCounts[entry.sound] = (soundCounts[entry.sound] || 0) + 1;
      }
      let streak = 0;
      for (let offset = 0; offset < 366; offset++) {
        if (allDayMinutes[dayOffsetKey(now, offset)] > 0) streak++;
        else if (offset === 0) continue;
        else break;
      }
      const favouriteBunny = Math.max(...bunnyCounts) ? bunnyCounts.indexOf(Math.max(...bunnyCounts)) : null;
      const favouriteSound = Object.keys(soundCounts).sort((a, b) => soundCounts[b] - soundCounts[a])[0] || null;
      return {
        todaySessions: byDay[today]?.sessions || 0,
        todayMinutes: byDay[today]?.minutes || 0,
        weekSessions: weekKeys.reduce((sum, key) => sum + byDay[key].sessions, 0),
        weekMinutes: weekKeys.reduce((sum, key) => sum + byDay[key].minutes, 0),
        streak, favouriteBunny, favouriteSound, byDay, weekKeys, bunnyCounts, allDayMinutes
      };
    }

    achievements(now = Date.now()) {
      const stats = this.stats(now);
      const history = this.state.history;
      return {
        first_hop: history.length >= 1,
        cosy_morning: history.some(entry => new Date(entry.at).getHours() < 9),
        deep_burrow: Object.values(stats.allDayMinutes).some(minutes => minutes >= 100),
        little_routine: stats.streak >= 3,
        quiet_companion: history.some(entry => entry.sound === 'none')
      };
    }

    serialise(now = Date.now()) {
      this.state.version = 6;
      return { ...this.state, savedAt: now };
    }

    buildBackup(now = Date.now()) {
      return { app: 'Bunny Burrow', backupVersion: 1, exportedAt: now, data: this.serialise(now) };
    }

    static fromBackup(backup, now = Date.now()) {
      if (!backup || backup.app !== 'Bunny Burrow' || backup.backupVersion !== 1 || !backup.data) {
        throw new Error('This is not a Bunny Burrow backup.');
      }
      if (![3, 4, 5, 6].includes(backup.data.version)) throw new Error('This backup version is not supported.');
      return new BurrowTimer(backup.data, now);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BurrowTimer, DAY, BUILTIN_PRESETS, localDateKey, AMBIENCE, BELLS };
  } else {
    root.BurrowTimer = BurrowTimer;
    root.BURROW_PRESETS = BUILTIN_PRESETS;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
