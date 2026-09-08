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
  { name: 'Peach', color: 'soft peach', filter: 'sepia(.22) saturate(.65) brightness(1.02)' }
];
const soundNames = {
  fire: 'Crackling fire',
  beach: 'Beach ambience',
  ocean: 'Ocean waves',
  rain: 'Gentle rain',
  forest: 'Forest breeze',
  stream: 'Flowing stream',
  forest_trees: 'Forest trees',
  lofi_petal: 'Lo-fi · Petal study',
  lofi_moon: 'Lo-fi · Moonlit notes',
  lofi_cocoa: 'Lo-fi · Cocoa break',
  lofi_rainy_window: 'Lo-fi · Rainy Window',
  lofi_lavender_evening: 'Lo-fi · Lavender Evening',
  lofi_sunday_sketchbook: 'Lo-fi · Sunday Sketchbook',
  lofi_jazz_cafe: 'Lo-fi · Jazz-hop Café',
  lofi_cloud_waltz: 'Lo-fi · Cloud Waltz',
  lofi_pixel_night: 'Lo-fi · Pixel Night',
  none: 'Quiet focus'
};
const storageKey = 'bunny-burrow-v3:' + location.pathname.replace(/index\.html$/, '');
let raw;
try { raw = JSON.parse(localStorage.getItem(storageKey)); } catch {}
let timer = new BurrowTimer(raw);
const ambient = $('ambient-audio'), bellPlayer = $('bell-audio'), preview = $('preview-audio');
let wakeLock = null, wakeLockPending = false, previewTimeout, lastCollection = '';

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(timer.state)); }
  catch { $('announcement').textContent = 'Device storage is unavailable. Keep this page open to retain your session.'; }
}
function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  $('theme').innerHTML = dark ? '☀ <span>Daylight</span>' : '☾ <span>Moonlight</span>';
  $('theme').setAttribute('aria-label', dark ? 'Switch to pink light mode' : 'Switch to purple dark mode');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#241a35' : '#fce4ed';
  try { localStorage.setItem('burrow-dark', String(dark)); } catch {}
}
try { setTheme(localStorage.getItem('burrow-dark') === 'true'); } catch { setTheme(false); }
$('theme').onclick = () => setTheme(!document.body.classList.contains('dark'));

function render() {
  const s = timer.state, bunny = companions[s.chosen];
  const secs = Math.max(0, Math.ceil(s.remaining / 1000));
  const clock = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
  $('clock').textContent = clock;
  $('clock').setAttribute('aria-label', `${Math.floor(secs / 60)} minutes ${secs % 60} seconds remaining`);
  document.title = (s.started ? clock + ' · ' : '') + 'Bunny Burrow';
  $('mode').textContent = s.mode === 'focus' ? 'Focus time' : 'Break time';
  $('start').innerHTML = s.running ? 'Ⅱ &nbsp; Pause' : s.started ? '▶ &nbsp; Continue' : s.mode === 'focus' ? '▶ &nbsp; Start focusing' : '▶ &nbsp; Start break';
  document.body.classList.toggle('running', s.running);
  $('focus-min').disabled = s.started;
  $('break-min').disabled = s.started;
  document.querySelectorAll('.swatch').forEach(b => {
    b.disabled = s.started;
    const selected = Number(b.dataset.bunny) === s.chosen;
    b.classList.toggle('selected', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
  const progress = s.mode === 'break' ? 1 : Math.max(0, Math.min(1, 1 - s.remaining / timer.duration()));
  $('bunny').style.setProperty('--scale', String(.52 + progress * .48));
  $('bunny').style.setProperty('--bunny-filter', bunny.filter);
  $('bunny-name').textContent = 'MEET ' + bunny.name.toUpperCase();
  $('bunny').alt = `A ${progress < .5 ? 'small' : 'grown'} ${bunny.color} bunny`;
  $('growth-fill').style.width = progress * 100 + '%';
  $('growth').setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  $('growth-label').textContent = s.mode === 'break' ? 'All grown up!' : progress < .25 ? 'Little beginnings' : progress < .6 ? 'Growing with you' : progress < .9 ? 'Look at you grow' : 'Almost there!';
  $('growth-message').textContent = s.mode === 'break' ? 'Your bunny is taking a breather, too.' : !progress ? 'A little focus goes a long way.' : Math.round(progress * 100) + '% grown · keep going gently';
  $('heading').innerHTML = s.mode === 'break' ? 'A little rest.<br>You’ve earned it.' : 'Small steps.<br>Happy little hops.';
  $('subheading').textContent = s.mode === 'break' ? 'Your bunny is all grown up. Time for a breather.' : 'Settle in. Your bunny grows while you focus.';
  $('next').textContent = s.mode === 'focus' ? `${s.focusMinutes} min focus · then a ${s.breakMinutes} min breather` : 'Stretch, sip some water, and rest your eyes.';
  $('preview-ambience').disabled = s.ambience === 'none' || (s.running && s.mode === 'focus');
  $('resume-audio').hidden = !(s.running && s.mode === 'focus' && s.ambience !== 'none' && ambient.paused);
  const collectionKey = s.earnedTotal + ':' + s.earned.join(',');
  if (collectionKey !== lastCollection) {
    lastCollection = collectionKey;
    $('session-count').textContent = `${s.earnedTotal} ${s.earnedTotal === 1 ? 'bunny' : 'bunnies'} in your burrow`;
    $('meadow-note').textContent = s.earnedTotal ? `${s.earnedTotal} little ${s.earnedTotal === 1 ? 'reason' : 'reasons'} to be proud of yourself. Saved on this device.` : 'Finish a focus session to welcome your first bunny.';
    $('bunny-collection').replaceChildren();
    s.earned.forEach(index => {
      const image = document.createElement('img'); image.src = 'bunny.png';
      image.alt = companions[index].name + ' — completed focus session';
      image.style.filter = companions[index].filter; $('bunny-collection').append(image);
    });
  }
}
function hydrateControls() {
  const s = timer.state;
  $('focus-min').value = s.focusMinutes; $('break-min').value = s.breakMinutes;
  $('ambience').value = s.ambience; $('bell-sound').value = s.bell;
  $('volume').value = Math.round(s.volume * 100); $('bell-volume').value = Math.round(s.bellVolume * 100);
  $('bell').checked = s.bellEnabled;
  bellPlayer.src = 'audio/' + s.bell + '.wav'; bellPlayer.volume = s.bellVolume;
}
function mediaMetadata() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Bunny Burrow · ' + soundNames[timer.state.ambience], artist: 'Your focus session', artwork: [{ src: new URL('icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }] });
    navigator.mediaSession.playbackState = ambient.paused ? 'paused' : 'playing';
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
function syncAmbient(play = false) {
  const s = timer.state;
  if (!s.running || s.mode !== 'focus' || s.ambience === 'none') {
    ambient.pause(); mediaMetadata(); return;
  }
  const url = new URL('audio/' + s.ambience + '.wav', location.href).href;
  if (ambient.src !== url) { ambient.src = url; ambient.load(); }
  ambient.volume = s.volume;
  if (play) {
    ambient.play().then(() => {
      $('audio-status').textContent = soundNames[s.ambience] + ' is playing. Background playback depends on this browser.';
      $('resume-audio').hidden = true; mediaMetadata();
    }).catch(() => {
      $('audio-status').textContent = 'Sound was paused or blocked. Tap Resume sound. If you’re offline, make sure offline setup finished.';
      $('resume-audio').hidden = false;
      document.querySelector('.background-help').open = true;
    });
  }
  mediaMetadata();
}
function ring() {
  const s = timer.state;
  if (!s.bellEnabled || !s.bellVolume) return;
  bellPlayer.currentTime = 0; bellPlayer.volume = s.bellVolume;
  bellPlayer.play().catch(() => { $('audio-status').textContent = 'The session ended, but the browser blocked the bell. Your timer is up to date.'; });
}
function tick(silent = false) {
  const events = timer.advance();
  if (events.length) {
    save(); syncAmbient();
    const last = events[events.length - 1];
    $('announcement').textContent = last.type === 'focus-complete'
      ? `Lovely work! ${companions[timer.state.chosen].name} is fully grown. Your break has started.`
      : 'Break finished. Choose a bunny and start when you’re ready.';
    if (silent && events.some(event => event.type === 'focus-complete')) {
      $('announcement').textContent = timer.state.running
        ? 'Welcome back! Your bunny finished growing while you were away. Your break is in progress.'
        : 'Welcome back! Your focus session and break finished while you were away. Your bunny is saved.';
    }
    // Do not replay old alarms after returning from closure/suspension.
    if (!silent && events.length === 1 && Date.now() - last.at < 2500) ring();
    if (!timer.state.running) releaseAwake();
  }
  render();
}
async function keepAwake() {
  if (!('wakeLock' in navigator) || !timer.state.running || wakeLock || wakeLockPending || document.visibilityState !== 'visible') return;
  wakeLockPending = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!timer.state.running || document.visibilityState !== 'visible') { await lock.release(); return; }
    wakeLock = lock;
    lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
  } catch {} finally { wakeLockPending = false; }
}
function releaseAwake() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
function start() {
  if (timer.state.running) { tick(true); syncAmbient(true); return; }
  // Unlock the bell element during a user gesture; later playback is still
  // subject to the browser/OS suspending the app.
  if (timer.state.bellEnabled) {
    bellPlayer.muted = true;
    bellPlayer.play().then(() => {
      bellPlayer.pause(); bellPlayer.currentTime = 0; bellPlayer.muted = false;
    }).catch(() => { bellPlayer.muted = false; });
  }
  stopPreview(); tick(true);
  if (!timer.state.running) timer.start();
  $('announcement').textContent = ''; save(); syncAmbient(true); keepAwake(); render();
}
function pause() { tick(); timer.pause(); save(); syncAmbient(); releaseAwake(); render(); }
$('start').onclick = () => timer.state.running ? pause() : start();
$('reset').onclick = () => {
  stopPreview(); timer.reset(); save(); syncAmbient(); bellPlayer.pause();
  releaseAwake(); $('announcement').textContent = 'Timer reset. Begin again whenever you’re ready.'; render();
};
$('resume-audio').onclick = () => { tick(true); syncAmbient(true); };
function changeDurations() {
  if (timer.state.started) return;
  timer.state.focusMinutes = Math.min(120, Math.max(1, Math.round(Number($('focus-min').value) || 25)));
  timer.state.breakMinutes = Math.min(60, Math.max(1, Math.round(Number($('break-min').value) || 5)));
  timer.reset(); hydrateControls(); save(); render();
}
$('focus-min').onchange = changeDurations; $('break-min').onchange = changeDurations;
document.querySelectorAll('.swatch').forEach(button => button.onclick = () => {
  if (timer.state.started) return;
  timer.state.chosen = Number(button.dataset.bunny); save(); render();
});
$('ambience').onchange = () => { stopPreview(); timer.state.ambience = $('ambience').value; save(); syncAmbient(true); render(); };
$('volume').oninput = () => { timer.state.volume = Number($('volume').value) / 100; ambient.volume = timer.state.volume; save(); };
$('bell-volume').oninput = () => { timer.state.bellVolume = Number($('bell-volume').value) / 100; bellPlayer.volume = timer.state.bellVolume; save(); };
$('bell-sound').onchange = () => { timer.state.bell = $('bell-sound').value; bellPlayer.src = 'audio/' + timer.state.bell + '.wav'; save(); };
$('bell').onchange = () => { timer.state.bellEnabled = $('bell').checked; save(); };
$('preview-ambience').onclick = event => {
  if (!preview.paused) { stopPreview(); return; }
  const sound = timer.state.ambience;
  playPreview(sound, timer.state.volume, soundNames[sound], event.currentTarget);
};
$('preview-bell').onclick = event => {
  const label = $('bell-sound').selectedOptions[0]?.textContent || 'Ending bell';
  playPreview(timer.state.bell, timer.state.bellVolume, label, event.currentTarget, 6000);
};
preview.addEventListener('ended', stopPreview);
if ('mediaSession' in navigator) {
  for (const [action, handler] of Object.entries({ play: start, pause, stop: pause })) {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
  }
}
ambient.addEventListener('timeupdate', () => tick());
ambient.addEventListener('pause', () => { mediaMetadata(); render(); });
ambient.addEventListener('playing', () => { mediaMetadata(); render(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(true); syncAmbient(true); if (timer.state.running) keepAwake(); }
  else { stopPreview(); save(); releaseAwake(); }
});
window.addEventListener('pagehide', save);
window.addEventListener('pageshow', () => { tick(true); syncAmbient(true); });
window.addEventListener('storage', event => {
  if (event.key !== storageKey || !event.newValue) return;
  try {
    timer = new BurrowTimer(JSON.parse(event.newValue)); hydrateControls();
    ambient.pause(); tick(true); render();
    $('audio-status').textContent = 'Your session was updated in another window. Use one window for sound playback.';
  } catch {}
});
hydrateControls(); tick(true); render();
if (timer.state.running && timer.state.mode === 'focus' && timer.state.ambience !== 'none') {
  if (!$('announcement').textContent) $('announcement').textContent = 'Your saved session is up to date. Tap Resume sound to continue listening.';
  document.querySelector('.background-help').open = true;
}
setInterval(tick, 250);
