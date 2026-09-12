'use strict';

const $ = id => document.getElementById(id);
const companions = [
  { name: 'Rosie', color: 'blush pink', filter: 'none' },
  { name: 'Plum', color: 'soft mauve', filter: 'hue-rotate(295deg) saturate(.45)' },
  { name: 'Biscuit', color: 'warm beige', filter: 'grayscale(1) sepia(.3) saturate(.7) brightness(.98)' },
  { name: 'Pearl', color: 'pearl white', filter: 'grayscale(1) brightness(1.08)' },
  { name: 'Cocoa', color: 'soft taupe', filter: 'grayscale(1) sepia(.3) saturate(.65) brightness(.78)' },
  { name: 'Mist', color: 'silver grey', filter: 'grayscale(1) brightness(.88)' },
  { name: 'Lilac', color: 'pale lilac', filter: 'hue-rotate(270deg) saturate(.3) brightness(1.03)' },
  { name: 'Peach', color: 'soft peach', filter: 'sepia(.22) saturate(.65) brightness(1.02)' },
  { name: 'Bluebell', color: 'dusty blue', filter: 'hue-rotate(145deg) saturate(.48) brightness(.96)' },
  { name: 'Rosebud', color: 'deep rose', filter: 'hue-rotate(330deg) saturate(1.15) brightness(.88)' },
  { name: 'Midnight', color: 'deep violet', filter: 'hue-rotate(250deg) saturate(.72) brightness(.63)' },
  { name: 'Caramel', color: 'warm caramel', filter: 'grayscale(.18) sepia(.62) saturate(1.05) brightness(.82)' },
  { name: 'Cloud', color: 'cool blue-white', filter: 'grayscale(.75) sepia(.08) hue-rotate(150deg) saturate(.38) brightness(1.08)' }
];
const soundNames = {
  fire: 'Crackling fire', beach: 'Beach ambience', ocean: 'Ocean waves',
  rain: 'Gentle rain', forest: 'Forest breeze', stream: 'Flowing stream',
  forest_trees: 'Forest trees', lofi_petal: 'Petal study',
  lofi_moon: 'Moonlit notes', lofi_cocoa: 'Cocoa break',
  lofi_rainy_window: 'Rainy Window', lofi_lavender_evening: 'Lavender Evening',
  lofi_sunday_sketchbook: 'Sunday Sketchbook', lofi_jazz_cafe: 'Jazz-hop Café',
  lofi_cloud_waltz: 'Cloud Waltz', lofi_pixel_night: 'Pixel Night',
  lofi_neon_bloom: 'Neon Bloom', lofi_vinyl_keys: 'Vinyl Keys',
  lofi_sleepy_strings: 'Sleepy Strings', lofi_music_box: 'Petal Music Box',
  jazz_velvet_swing: 'Velvet Swing', jazz_bossa_bloom: 'Bossa Bloom',
  jazz_midnight_sax: 'Sunday Sax', jazz_brass_parade: 'Garden Brass',
  jazz_piano_ballad: 'Morning Piano', synthwave_arcade_drive: 'Candy Circuit',
  synthwave_cosmic_drift: 'Starlight Float', chillwave_sunset_tape: 'Sunset Tape',
  chillwave_aqua_dream: 'Aqua Dream', chillwave_pastel_dusk: 'Pastel Dusk',
  none: 'Quiet focus'
};
const breakSuggestions = [
  'Roll your shoulders slowly and let them soften.',
  'Look at something far away for twenty seconds.',
  'Take a few sips of water.',
  'Stand up and stretch your legs gently.',
  'Take five slow breaths before your next session.',
  'Rest your hands and unclench your jaw.',
  'Walk around for a minute if you can.'
];
const achievementInfo = [
  ['first_hop', 'First Hop', 'Complete your first focus session.'],
  ['cosy_morning', 'Cosy Morning', 'Finish a session before 09:00.'],
  ['deep_burrow', 'Deep Burrow', 'Focus for 100 minutes in one day.'],
  ['little_routine', 'Little Routine', 'Build a three-day focus streak.'],
  ['quiet_companion', 'Quiet Companion', 'Complete a session in quiet mode.']
];
const storageKey = 'bunny-burrow-v3:' + location.pathname.replace(/index\.html$/, '');
const uiKey = 'bunny-burrow-ui:' + location.pathname.replace(/index\.html$/, '');
let raw;
try { raw = JSON.parse(localStorage.getItem(storageKey)); } catch {}
let timer = new BurrowTimer(raw);
const ambient = $('ambient-audio');
const bellPlayer = $('bell-audio');
const preview = $('preview-audio');
let wakeLock = null;
let wakeLockPending = false;
let previewTimeout;
let ambientFadeTimer;
let lastCollection = '';
let lastInsights = '';
let lastCountdownNotificationAt = 0;
let lastCountdownNotificationKey = '';
let lastBadgeMinutes = null;
let countdownNotificationFallback = null;
let countdownNotificationPending = false;
let countdownNotificationGeneration = 0;

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(timer.serialise())); }
  catch { announce('Device storage is unavailable. Keep this page open to retain your session.'); }
}

function announce(message) {
  $('announcement').textContent = message;
}

function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  $('theme').innerHTML = dark ? '☀ <span>Daylight</span>' : '☾ <span>Moonlight</span>';
  $('theme').setAttribute('aria-label', dark ? 'Switch to pink light mode' : 'Switch to purple dark mode');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#241a35' : '#fce4ed';
  try { localStorage.setItem('burrow-dark', String(dark)); } catch {}
}

function setFocusMode(enabled, requestFullscreen = false) {
  document.body.classList.toggle('focus-mode', enabled);
  $('focus-mode').hidden = enabled;
  $('exit-focus-mode').hidden = !enabled;
  try { localStorage.setItem(uiKey, JSON.stringify({ focusMode: enabled })); } catch {}
  if (enabled && requestFullscreen && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (!enabled && document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

try {
  setTheme(localStorage.getItem('burrow-dark') === 'true');
  const savedUi = JSON.parse(localStorage.getItem(uiKey) || '{}');
  setFocusMode(savedUi.focusMode === true);
} catch {
  setTheme(false);
  setFocusMode(false);
}

function formatClock(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}

function currentSound() {
  const s = timer.state;
  return s.mode === 'break' ? s.breakAmbience : s.activeAmbience;
}

function render() {
  const s = timer.state;
  const bunny = companions[s.chosen];
  const seconds = Math.max(0, Math.ceil(s.remaining / 1000));
  const clock = formatClock(s.remaining);
  $('clock').textContent = clock;
  $('clock').setAttribute('aria-label', `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`);
  document.title = (s.started ? clock + ' · ' : '') + 'Bunny Burrow';
  $('mode').textContent = s.mode === 'focus' ? 'Focus time' : s.isLongBreak ? 'Long break' : 'Break time';
  $('start').innerHTML = s.running ? 'Ⅱ &nbsp; Pause' : s.started ? '▶ &nbsp; Continue' : s.mode === 'focus' ? '▶ &nbsp; Start focusing' : '▶ &nbsp; Start break';
  $('stop').hidden = !s.started;
  document.body.classList.toggle('running', s.running);
  document.body.classList.toggle('resting', s.mode === 'break');
  for (const id of ['focus-min', 'break-min', 'long-break-min', 'cycle-length', 'preset', 'apply-preset', 'save-preset']) {
    $(id).disabled = s.started;
  }
  $('task').disabled = s.started;
  $('task').value = s.task;
  $('focus-task').textContent = s.task || 'One gentle task at a time';
  $('cycle-status').textContent = `${s.cycleProgress} of ${s.cycleLength} focus sessions completed in this cycle`;

  document.querySelectorAll('.swatch').forEach(button => {
    const selected = Number(button.dataset.bunny) === s.chosen;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const progress = s.mode === 'break' ? 1 : Math.max(0, Math.min(1, 1 - s.remaining / timer.duration()));
  $('bunny').style.setProperty('--scale', String(.52 + progress * .48));
  $('bunny').style.setProperty('--bunny-filter', bunny.filter);
  $('bunny-name').textContent = 'MEET ' + bunny.name.toUpperCase();
  $('bunny').alt = `A ${progress < .5 ? 'small' : 'grown'} ${bunny.color} bunny`;
  $('growth-fill').style.width = progress * 100 + '%';
  $('growth').setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  $('growth-label').textContent = s.mode === 'break' ? 'Resting together' : progress < .25 ? 'Little beginnings' : progress < .6 ? 'Growing with you' : progress < .9 ? 'Look at you grow' : 'Almost there!';
  $('growth-message').textContent = s.mode === 'break' ? 'Your bunny is having a little breather, too.' : !progress ? 'A little focus goes a long way.' : Math.round(progress * 100) + '% grown · keep going gently';
  $('heading').innerHTML = s.mode === 'break' ? 'A little rest.<br>You’ve earned it.' : 'Small steps.<br>Happy little hops.';
  $('subheading').textContent = s.mode === 'break' ? 'Your bunny is all grown up. Time for a breather.' : 'Settle in. Your bunny grows while you focus.';
  $('next').textContent = s.mode === 'focus'
    ? `${s.focusMinutes} min focus · then a ${s.breakMinutes} min breather`
    : s.isLongBreak ? `${s.longBreakMinutes} minute long break · your cycle is complete` : 'Stretch, sip some water, and rest your eyes.';
  $('break-tip').hidden = s.mode !== 'break';
  $('break-tip').textContent = s.mode === 'break' ? breakSuggestions[s.history.length % breakSuggestions.length] : '';
  $('preview-ambience').disabled = s.ambience === 'none';
  $('favorite-sound').disabled = s.ambience === 'none';
  $('favorite-sound').classList.toggle('selected', s.favourites.includes(s.ambience));
  $('favorite-sound').textContent = s.favourites.includes(s.ambience) ? '★ Favourite' : '☆ Favourite';
  $('shuffle-note').textContent = s.shuffleFavourites
    ? `${s.favourites.length || 'No'} favourite ${s.favourites.length === 1 ? 'sound' : 'sounds'} available for the next focus session.`
    : 'Play the selected focus sound.';
  $('resume-audio').hidden = !(s.running && currentSound() !== 'none' && ambient.paused);
  $('goal').value = s.dailyGoal;
  $('shuffle-favourites').checked = s.shuffleFavourites;
  $('fade-audio').checked = s.fadeAudio;
  $('notifications').checked = s.notificationsEnabled;
  $('countdown-notifications').checked = s.countdownNotificationsEnabled;

  renderCollection();
  renderInsights();
}

function renderCollection() {
  const s = timer.state;
  const key = s.earnedTotal + ':' + s.earned.map(entry => entry.bunny + '@' + entry.at).join(',');
  if (key === lastCollection) return;
  lastCollection = key;
  const visible = s.earned.length;
  $('session-count').textContent = `${visible} ${visible === 1 ? 'bunny' : 'bunnies'} in your burrow`;
  $('meadow-note').textContent = visible
    ? `${visible} little ${visible === 1 ? 'reason' : 'reasons'} to be proud of yourself. Bunnies stay here for 24 hours.`
    : 'Finish a focus session to welcome your first bunny. Bunnies stay for 24 hours.';
  $('clear-burrow').hidden = visible === 0;
  $('bunny-collection').replaceChildren();
  if (!visible) {
    const flower = document.createElement('span');
    flower.className = 'empty-flower';
    flower.setAttribute('aria-hidden', 'true');
    flower.textContent = '✿';
    $('bunny-collection').append(flower);
    return;
  }
  s.earned.forEach(entry => {
    const image = document.createElement('img');
    image.src = 'bunny.png';
    image.alt = companions[entry.bunny].name + ' — completed focus session';
    image.style.filter = companions[entry.bunny].filter;
    $('bunny-collection').append(image);
  });
}

function renderInsights() {
  const s = timer.state;
  const signature = [s.history.length, s.dailyGoal, s.earnedTotal, s.history.at(-1)?.at || 0].join(':');
  if (signature === lastInsights) return;
  lastInsights = signature;
  const stats = timer.stats();
  const goalPercent = Math.min(100, Math.round(stats.todaySessions / s.dailyGoal * 100));
  $('goal-copy').textContent = `${stats.todaySessions} of ${s.dailyGoal} sessions today`;
  $('goal-fill').style.width = goalPercent + '%';
  $('goal-progress').setAttribute('aria-valuenow', String(goalPercent));
  $('stat-today').textContent = stats.todayMinutes + ' min';
  $('stat-week').textContent = stats.weekMinutes + ' min';
  $('stat-streak').textContent = stats.streak + (stats.streak === 1 ? ' day' : ' days');
  $('stat-sessions').textContent = String(s.history.length);
  $('stat-bunny').textContent = stats.favouriteBunny === null ? 'Not yet' : companions[stats.favouriteBunny].name;
  $('stat-sound').textContent = stats.favouriteSound ? soundNames[stats.favouriteSound] : 'Not yet';

  $('week-chart').replaceChildren();
  const maxMinutes = Math.max(1, ...stats.weekKeys.map(key => stats.byDay[key].minutes));
  stats.weekKeys.forEach(key => {
    const day = stats.byDay[key];
    const item = document.createElement('div');
    item.className = 'chart-day';
    const date = new Date(key + 'T12:00:00');
    item.innerHTML = `<span class="chart-value">${day.minutes}</span><span class="chart-bar" style="--bar:${Math.max(day.minutes ? 8 : 2, day.minutes / maxMinutes * 100)}%"></span><span>${date.toLocaleDateString([], { weekday: 'short' }).slice(0, 2)}</span>`;
    item.title = `${day.minutes} focus minutes across ${day.sessions} sessions`;
    $('week-chart').append(item);
  });

  $('history-list').replaceChildren();
  const recent = [...s.history].reverse().slice(0, 8);
  if (!recent.length) {
    $('history-list').innerHTML = '<li class="empty-row">Completed focus sessions will appear here.</li>';
  } else {
    recent.forEach(entry => {
      const item = document.createElement('li');
      const when = new Date(entry.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      item.innerHTML = `<div><strong>${escapeHtml(entry.task || 'Untitled focus')}</strong><span>${when}</span></div><span>${entry.minutes} min · ${companions[entry.bunny].name}</span>`;
      $('history-list').append(item);
    });
  }

  $('collection-book').replaceChildren();
  companions.forEach((companion, index) => {
    const count = stats.bunnyCounts[index];
    const card = document.createElement('article');
    card.className = 'companion-card' + (count ? ' discovered' : '');
    card.innerHTML = `<img src="bunny.png" alt="" style="filter:${companion.filter}"><div><strong>${companion.name}</strong><span>${count ? count + (count === 1 ? ' session' : ' sessions') : 'Not discovered yet'}</span></div>`;
    $('collection-book').append(card);
  });

  const unlocked = timer.achievements();
  $('achievement-list').replaceChildren();
  achievementInfo.forEach(([id, name, description]) => {
    const item = document.createElement('article');
    item.className = 'achievement' + (unlocked[id] ? ' unlocked' : '');
    item.innerHTML = `<span aria-hidden="true">${unlocked[id] ? '✿' : '○'}</span><div><strong>${name}</strong><p>${description}</p></div>`;
    $('achievement-list').append(item);
  });
}

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}

function hydrateControls() {
  const s = timer.state;
  $('focus-min').value = s.focusMinutes;
  $('break-min').value = s.breakMinutes;
  $('long-break-min').value = s.longBreakMinutes;
  $('cycle-length').value = s.cycleLength;
  $('ambience').value = s.ambience;
  $('break-ambience').value = s.breakAmbience;
  $('bell-sound').value = s.bell;
  $('volume').value = Math.round(s.volume * 100);
  $('bell-volume').value = Math.round(s.bellVolume * 100);
  $('bell').checked = s.bellEnabled;
  $('task').value = s.task;
  bellPlayer.src = 'audio/' + s.bell + '.wav';
  bellPlayer.volume = s.bellVolume;
  hydratePresets();
}

function hydratePresets() {
  const selected = $('preset').value;
  $('preset').replaceChildren();
  for (const [id, preset] of Object.entries(BURROW_PRESETS)) {
    const option = document.createElement('option');
    option.value = 'builtin:' + id;
    option.textContent = `${preset.name} · ${preset.focus}/${preset.break}`;
    $('preset').append(option);
  }
  timer.state.customPresets.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = 'custom:' + index;
    option.textContent = `${preset.name} · ${preset.focus}/${preset.break}`;
    $('preset').append(option);
  });
  if ([...$('preset').options].some(option => option.value === selected)) $('preset').value = selected;
}

function mediaMetadata() {
  if (!('mediaSession' in navigator)) return;
  try {
    const clock = formatClock(timer.state.remaining);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: timer.state.started ? `${clock} remaining · Bunny Burrow` : 'Bunny Burrow · ' + soundNames[currentSound()],
      artist: timer.state.mode === 'focus' ? (timer.state.task || 'Your focus session') : 'Your gentle break',
      album: soundNames[currentSound()],
      artwork: [{ src: new URL('icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }]
    });
    navigator.mediaSession.playbackState = ambient.paused ? 'paused' : 'playing';
    if (timer.state.started && navigator.mediaSession.setPositionState) {
      const duration = Math.max(1, timer.duration() / 1000);
      const position = Math.max(0, Math.min(duration, duration - timer.state.remaining / 1000));
      navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position });
    }
  } catch {}
}

function stopPreview() {
  clearTimeout(previewTimeout);
  preview.pause();
  try { preview.currentTime = 0; } catch {}
  $('preview-ambience').textContent = '▶';
  $('preview-ambience').setAttribute('aria-label', 'Preview selected focus sound');
  $('preview-bell').textContent = '▶';
  $('preview-bell').setAttribute('aria-label', 'Preview selected bell');
}

async function playPreview(file, volume, label, button, stopAfter = 10000) {
  stopPreview();
  preview.src = new URL('audio/' + file + '.wav', location.href).href;
  preview.volume = volume;
  preview.load();
  button.textContent = '…';
  button.setAttribute('aria-label', 'Loading ' + label + ' preview');
  try {
    await preview.play();
    button.textContent = '■';
    button.setAttribute('aria-label', 'Stop ' + label + ' preview');
    $('audio-status').textContent = label + ' preview is playing.';
    previewTimeout = setTimeout(stopPreview, stopAfter);
  } catch {
    stopPreview();
    $('audio-status').textContent = label + ' could not play. Reconnect once, wait for Ready offline, then try again.';
  }
}

function rampVolume(audio, target, duration, done) {
  clearInterval(ambientFadeTimer);
  if (!timer.state.fadeAudio || duration <= 0) {
    audio.volume = target;
    done?.();
    return;
  }
  const from = audio.volume;
  const started = performance.now();
  ambientFadeTimer = setInterval(() => {
    const progress = Math.min(1, (performance.now() - started) / duration);
    audio.volume = from + (target - from) * progress;
    if (progress >= 1) {
      clearInterval(ambientFadeTimer);
      done?.();
    }
  }, 40);
}

function syncAmbient(play = false, forceSwitch = false) {
  const s = timer.state;
  const sound = currentSound();
  const targetVolume = s.volume;
  if (!s.running || sound === 'none') {
    rampVolume(ambient, 0, 300, () => { ambient.pause(); ambient.volume = targetVolume; mediaMetadata(); });
    return;
  }
  const url = new URL('audio/' + sound + '.wav', location.href).href;
  const switchTrack = forceSwitch || ambient.src !== url;
  const begin = () => {
    if (switchTrack) {
      ambient.src = url;
      ambient.load();
    }
    ambient.volume = s.fadeAudio ? 0 : targetVolume;
    if (play) {
      ambient.play().then(() => {
        rampVolume(ambient, targetVolume, 700);
        $('audio-status').textContent = soundNames[sound] + ' is playing.';
        $('resume-audio').hidden = true;
        mediaMetadata();
      }).catch(() => {
        ambient.volume = targetVolume;
        $('audio-status').textContent = 'Sound was paused or blocked. Tap Resume sound to continue.';
        $('resume-audio').hidden = false;
        $('background-help').open = true;
      });
    }
  };
  if (switchTrack && !ambient.paused && s.fadeAudio) rampVolume(ambient, 0, 350, begin);
  else begin();
  mediaMetadata();
}

function ring() {
  const s = timer.state;
  if (!s.bellEnabled || !s.bellVolume) return;
  bellPlayer.currentTime = 0;
  bellPlayer.volume = s.bellVolume;
  bellPlayer.play().catch(() => {
    $('audio-status').textContent = 'The timer finished, but the browser blocked the bell.';
  });
}

const COUNTDOWN_NOTIFICATION_TAG = 'bunny-burrow-countdown';
const COMPLETION_NOTIFICATION_TAG = 'bunny-burrow-completion';

async function notificationRegistration() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
  try { return await navigator.serviceWorker.getRegistration(); }
  catch { return null; }
}

async function showAppNotification(title, options) {
  const registration = await notificationRegistration();
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return;
  }
  const notification = new Notification(title, options);
  if (options.tag === COUNTDOWN_NOTIFICATION_TAG) {
    countdownNotificationFallback?.close();
    countdownNotificationFallback = notification;
  }
}

async function closeCountdownNotification() {
  countdownNotificationGeneration++;
  lastCountdownNotificationAt = 0;
  lastCountdownNotificationKey = '';
  countdownNotificationFallback?.close();
  countdownNotificationFallback = null;
  const registration = await notificationRegistration();
  if (!registration?.getNotifications) return;
  try {
    const notifications = await registration.getNotifications({ tag: COUNTDOWN_NOTIFICATION_TAG });
    notifications.forEach(notification => notification.close());
  } catch {}
}

function syncAppBadge(show) {
  if (!('setAppBadge' in navigator) && !('clearAppBadge' in navigator)) return;
  const minutes = show ? Math.max(1, Math.ceil(timer.state.remaining / 60000)) : 0;
  if (minutes === lastBadgeMinutes) return;
  lastBadgeMinutes = minutes;
  try {
    const operation = minutes ? navigator.setAppBadge(minutes) : navigator.clearAppBadge();
    operation?.catch?.(() => {});
  } catch {}
}

function updateNotificationStatus(message = '') {
  if (!('Notification' in window)) {
    $('notification-status').textContent = 'Notifications are not supported by this browser.';
    return;
  }
  if (message) {
    $('notification-status').textContent = message;
    return;
  }
  if (Notification.permission === 'denied') {
    $('notification-status').textContent = 'Notifications are blocked in this browser’s site settings.';
    return;
  }
  const enabled = [];
  if (timer.state.notificationsEnabled) enabled.push('finish alerts');
  if (timer.state.countdownNotificationsEnabled) enabled.push('live countdown');
  if (!enabled.length) {
    $('notification-status').textContent = 'Turn on either option to request notification permission.';
  } else if (timer.state.countdownNotificationsEnabled) {
    $('notification-status').textContent = `${enabled.join(' and ')} on. The countdown updates while the browser keeps the PWA active; its finish time remains visible if updates pause.`;
  } else {
    $('notification-status').textContent = 'Finish alerts are on.';
  }
}

async function syncCountdownNotification(force = false) {
  const s = timer.state;
  const available = s.countdownNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted';
  if (!available || !s.running) {
    syncAppBadge(false);
    if (force || lastCountdownNotificationKey || countdownNotificationFallback) await closeCountdownNotification();
    return;
  }

  syncAppBadge(true);
  const now = Date.now();
  const seconds = Math.max(0, Math.ceil(s.remaining / 1000));
  const cadence = document.visibilityState === 'visible' ? 1000 : 10000;
  const key = `${s.mode}:${s.deadline}:${seconds}`;
  if (countdownNotificationPending) return;
  if (!force && (key === lastCountdownNotificationKey || now - lastCountdownNotificationAt < cadence)) return;

  countdownNotificationPending = true;
  const generation = ++countdownNotificationGeneration;
  lastCountdownNotificationAt = now;
  lastCountdownNotificationKey = key;
  const clock = formatClock(s.remaining);
  const mode = s.mode === 'focus' ? 'Focus' : s.isLongBreak ? 'Long break' : 'Break';
  const finishTime = new Date(s.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const intention = s.mode === 'focus' && s.task ? `${s.task} · ` : '';
  try {
    await showAppNotification(`${mode} · ${clock} left`, {
      body: `${intention}Ends at ${finishTime}. Open Bunny Burrow for the exact timer.`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: COUNTDOWN_NOTIFICATION_TAG,
      renotify: false,
      silent: true,
      requireInteraction: true,
      timestamp: s.deadline,
      data: { kind: 'countdown', deadline: s.deadline, mode: s.mode }
    });
    if (generation !== countdownNotificationGeneration || !timer.state.running || !timer.state.countdownNotificationsEnabled || Notification.permission !== 'granted') {
      await closeCountdownNotification();
      return;
    }
    mediaMetadata();
  } catch {
    lastCountdownNotificationAt = 0;
    lastCountdownNotificationKey = '';
  } finally {
    countdownNotificationPending = false;
  }
}

async function sendNotification(event) {
  const s = timer.state;
  if (!s.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const focusComplete = event.type === 'focus-complete';
  const title = focusComplete ? (event.longBreak ? 'Long break unlocked' : 'Focus session complete') : 'Break complete';
  const body = focusComplete
    ? `${companions[s.chosen].name} is fully grown. Time for a ${event.longBreak ? s.longBreakMinutes : s.breakMinutes}-minute break.`
    : 'Your next bunny is ready when you are.';
  try {
    await showAppNotification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: COMPLETION_NOTIFICATION_TAG,
      renotify: true,
      timestamp: event.at,
      data: { kind: 'completion', event: event.type }
    });
  } catch {}
}

function tick(silent = false) {
  const bunniesBefore = timer.state.earned.length;
  const events = timer.advance();
  if (events.length || timer.state.earned.length !== bunniesBefore) {
    save();
    syncAmbient(true, events.length > 0);
  }
  if (events.length) {
    const last = events.at(-1);
    announce(last.type === 'focus-complete'
      ? `Lovely work! ${companions[timer.state.chosen].name} is fully grown. Your ${last.longBreak ? 'long ' : ''}break has started.`
      : 'Break finished. Choose a bunny and start when you’re ready.');
    if (silent && events.some(event => event.type === 'focus-complete')) {
      announce(timer.state.running
        ? 'Welcome back! Your bunny finished growing while you were away. Your break is in progress.'
        : 'Welcome back! Your focus session and break finished while you were away. Your bunny is saved.');
    }
    if (!silent && events.length === 1 && Date.now() - last.at < 2500) {
      ring();
      sendNotification(last);
    }
    if (!timer.state.running) releaseAwake();
    lastInsights = '';
  }
  render();
  syncCountdownNotification(events.length > 0);
}

async function keepAwake() {
  if (!('wakeLock' in navigator) || !timer.state.running || wakeLock || wakeLockPending || document.visibilityState !== 'visible') return;
  wakeLockPending = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!timer.state.running || document.visibilityState !== 'visible') {
      await lock.release();
      return;
    }
    wakeLock = lock;
    lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
  } catch {} finally {
    wakeLockPending = false;
  }
}

function releaseAwake() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function start() {
  if (timer.state.running) {
    tick(true);
    syncAmbient(true);
    return;
  }
  if (timer.state.bellEnabled) {
    bellPlayer.muted = true;
    bellPlayer.play().then(() => {
      bellPlayer.pause();
      bellPlayer.currentTime = 0;
      bellPlayer.muted = false;
    }).catch(() => { bellPlayer.muted = false; });
  }
  stopPreview();
  tick(true);
  if (!timer.state.running) timer.start();
  announce('');
  save();
  syncAmbient(true, true);
  keepAwake();
  render();
  syncCountdownNotification(true);
}

function pause() {
  tick();
  timer.pause();
  save();
  syncAmbient();
  releaseAwake();
  render();
  syncCountdownNotification(true);
}

function stopSession() {
  stopPreview();
  timer.stop();
  save();
  syncAmbient();
  bellPlayer.pause();
  releaseAwake();
  announce('Session stopped. Your unfinished progress was reset.');
  render();
  syncCountdownNotification(true);
}

function changeDurations() {
  if (timer.state.started) return;
  const s = timer.state;
  s.focusMinutes = Math.min(120, Math.max(1, Math.round(Number($('focus-min').value) || 25)));
  s.breakMinutes = Math.min(60, Math.max(1, Math.round(Number($('break-min').value) || 5)));
  s.longBreakMinutes = Math.min(60, Math.max(1, Math.round(Number($('long-break-min').value) || 15)));
  s.cycleLength = Math.min(8, Math.max(2, Math.round(Number($('cycle-length').value) || 4)));
  s.cycleProgress = Math.min(s.cycleProgress, s.cycleLength - 1);
  timer.stop();
  hydrateControls();
  save();
  render();
}

function selectedPreset() {
  const [type, value] = $('preset').value.split(':');
  return type === 'builtin' ? BURROW_PRESETS[value] : timer.state.customPresets[Number(value)];
}

async function requestNotifications(event) {
  const liveCountdown = event.target.id === 'countdown-notifications';
  const stateKey = liveCountdown ? 'countdownNotificationsEnabled' : 'notificationsEnabled';
  if (!('Notification' in window)) {
    timer.state[stateKey] = false;
    event.target.checked = false;
    updateNotificationStatus();
    return;
  }
  if (!event.target.checked) {
    timer.state[stateKey] = false;
    save();
    if (liveCountdown) await syncCountdownNotification(true);
    updateNotificationStatus();
    return;
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  timer.state[stateKey] = permission === 'granted';
  event.target.checked = timer.state[stateKey];
  save();
  updateNotificationStatus(permission === 'granted' ? '' : 'Notification permission was not granted. You can change it in this browser’s site settings.');
  if (liveCountdown) await syncCountdownNotification(true);
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(timer.buildBackup(), null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `bunny-burrow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  $('data-status').textContent = 'Your Bunny Burrow backup was downloaded.';
}

async function importBackup(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const restored = BurrowTimer.fromBackup(backup);
    if (!confirm('Replace the timer, history and preferences on this device with this backup?')) return;
    timer = restored;
    stopPreview();
    ambient.pause();
    lastCollection = '';
    lastInsights = '';
    hydrateControls();
    save();
    syncAmbient();
    render();
    updateNotificationStatus();
    syncCountdownNotification(true);
    $('data-status').textContent = 'Backup restored successfully.';
  } catch (error) {
    $('data-status').textContent = error.message || 'This backup could not be restored.';
  } finally {
    $('import-backup').value = '';
  }
}

$('theme').onclick = () => setTheme(!document.body.classList.contains('dark'));
$('focus-mode').onclick = () => setFocusMode(true, true);
$('exit-focus-mode').onclick = () => setFocusMode(false);
$('start').onclick = () => timer.state.running ? pause() : start();
$('stop').onclick = stopSession;
$('reset').onclick = () => {
  stopPreview();
  timer.reset();
  save();
  syncAmbient();
  bellPlayer.pause();
  releaseAwake();
  announce('Timer reset. Begin again whenever you’re ready.');
  render();
  syncCountdownNotification(true);
};
$('resume-audio').onclick = () => { tick(true); syncAmbient(true); };
$('focus-min').onchange = changeDurations;
$('break-min').onchange = changeDurations;
$('long-break-min').onchange = changeDurations;
$('cycle-length').onchange = changeDurations;
$('task').oninput = () => { timer.state.task = $('task').value.slice(0, 100); save(); render(); };
$('goal').oninput = () => {
  timer.state.dailyGoal = Math.min(20, Math.max(1, Math.round(Number($('goal').value) || 4)));
  lastInsights = '';
  save();
  render();
};

document.querySelectorAll('.swatch').forEach(button => button.onclick = () => {
  timer.state.chosen = Number(button.dataset.bunny);
  save();
  render();
});

$('apply-preset').onclick = () => {
  if (timer.applyPreset(selectedPreset())) {
    hydrateControls();
    save();
    announce('Focus preset applied.');
    render();
  }
};
$('save-preset').onclick = () => {
  $('preset-name').value = '';
  $('preset-dialog').showModal();
  $('preset-name').focus();
};
$('close-preset').onclick = () => $('preset-dialog').close();
$('cancel-preset').onclick = () => $('preset-dialog').close();
$('confirm-preset').onclick = () => {
  const preset = timer.saveCustomPreset($('preset-name').value);
  if (!preset) {
    $('preset-feedback').textContent = 'Give this preset a short name first.';
    return;
  }
  hydratePresets();
  $('preset').value = 'custom:' + (timer.state.customPresets.length - 1);
  save();
  $('preset-dialog').close();
  announce(`${preset.name} was saved on this device.`);
};

$('ambience').onchange = () => {
  stopPreview();
  timer.state.ambience = $('ambience').value;
  timer.state.activeAmbience = timer.state.ambience;
  save();
  syncAmbient(true, true);
  render();
};
$('break-ambience').onchange = () => {
  timer.state.breakAmbience = $('break-ambience').value;
  save();
  if (timer.state.mode === 'break') syncAmbient(true, true);
};
$('favorite-sound').onclick = () => {
  const added = timer.toggleFavourite(timer.state.ambience);
  save();
  announce(added ? `${soundNames[timer.state.ambience]} added to favourites.` : `${soundNames[timer.state.ambience]} removed from favourites.`);
  render();
};
$('shuffle-favourites').onchange = () => {
  timer.state.shuffleFavourites = $('shuffle-favourites').checked;
  save();
  render();
};
$('fade-audio').onchange = () => {
  timer.state.fadeAudio = $('fade-audio').checked;
  save();
};
$('volume').oninput = () => {
  timer.state.volume = Number($('volume').value) / 100;
  ambient.volume = timer.state.volume;
  save();
};
$('bell-volume').oninput = () => {
  timer.state.bellVolume = Number($('bell-volume').value) / 100;
  bellPlayer.volume = timer.state.bellVolume;
  save();
};
$('bell-sound').onchange = () => {
  timer.state.bell = $('bell-sound').value;
  bellPlayer.src = 'audio/' + timer.state.bell + '.wav';
  save();
};
$('bell').onchange = () => {
  timer.state.bellEnabled = $('bell').checked;
  save();
};
$('notifications').onchange = requestNotifications;
$('countdown-notifications').onchange = requestNotifications;
$('preview-ambience').onclick = event => {
  if (!preview.paused) { stopPreview(); return; }
  playPreview(timer.state.ambience, timer.state.volume, soundNames[timer.state.ambience], event.currentTarget);
};
$('preview-bell').onclick = event => {
  const label = $('bell-sound').selectedOptions[0]?.textContent || 'Ending bell';
  playPreview(timer.state.bell, timer.state.bellVolume, label, event.currentTarget, 6000);
};

$('clear-burrow').onclick = () => $('clear-dialog').showModal();
$('close-clear').onclick = () => $('clear-dialog').close();
$('cancel-clear').onclick = () => $('clear-dialog').close();
$('confirm-clear').onclick = () => {
  timer.clearBurrow();
  lastCollection = '';
  save();
  $('clear-dialog').close();
  announce('Your burrow is clear. Your long-term focus history is still safe.');
  render();
};
$('export-backup').onclick = exportBackup;
$('import-backup').onchange = event => importBackup(event.target.files[0]);

preview.addEventListener('ended', stopPreview);
if ('mediaSession' in navigator) {
  for (const [action, handler] of Object.entries({ play: start, pause, stop: stopSession })) {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
  }
}
ambient.addEventListener('timeupdate', () => tick());
ambient.addEventListener('pause', () => { mediaMetadata(); render(); });
ambient.addEventListener('playing', () => { mediaMetadata(); render(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    tick(true);
    syncAmbient(true);
    if (timer.state.running) keepAwake();
  } else {
    stopPreview();
    save();
    syncCountdownNotification(true);
    releaseAwake();
  }
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('focus-mode')) setFocusMode(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('focus-mode')) setFocusMode(false);
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    timer.state.running ? pause() : start();
  }
});
window.addEventListener('pagehide', save);
window.addEventListener('pageshow', () => { tick(true); syncAmbient(true); });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'BUNNY_BURROW_NOTIFICATION_OPENED') tick(true);
  });
}
window.addEventListener('storage', event => {
  if (event.key !== storageKey || !event.newValue) return;
  try {
    timer = new BurrowTimer(JSON.parse(event.newValue));
    lastCollection = '';
    lastInsights = '';
    hydrateControls();
    ambient.pause();
    tick(true);
    announce('Your session was updated in another window. Use one window for sound playback.');
  } catch {}
});

hydrateControls();
tick(true);
render();
if (timer.state.running && currentSound() !== 'none') {
  if (!$('announcement').textContent) announce('Your saved session is up to date. Tap Resume sound to continue listening.');
  $('background-help').open = true;
}
updateNotificationStatus();
if (!('Notification' in window)) {
  $('notifications').disabled = true;
  $('countdown-notifications').disabled = true;
}
setInterval(tick, 250);
