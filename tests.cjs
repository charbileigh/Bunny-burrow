const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const { BurrowTimer, DAY, BUILTIN_PRESETS, localDateKey, AMBIENCE, BELLS } = require('./timer.js');

const NEW_MUSIC = [
  'jazz_velvet_swing', 'jazz_bossa_bloom', 'jazz_midnight_sax',
  'jazz_brass_parade', 'jazz_piano_ballad',
  'synthwave_arcade_drive', 'synthwave_cosmic_drift',
  'chillwave_sunset_tape', 'chillwave_aqua_dream', 'chillwave_pastel_dusk'
];
const NEW_BELLS = ['bell_harbour', 'bell_clock_duet'];

(async () => {
  const timer = new BurrowTimer();
  timer.state.focusMinutes = 1;
  timer.state.breakMinutes = 1;
  timer.state.longBreakMinutes = 2;
  timer.state.cycleLength = 2;
  timer.state.task = 'Write findings';
  timer.state.chosen = 8;
  timer.state.ambience = 'lofi_vinyl_keys';
  timer.stop();
  timer.start(1000, () => 0);
  assert.equal(timer.state.activeAmbience, 'lofi_vinyl_keys');

  const first = timer.advance(61000);
  assert.equal(first[0].type, 'focus-complete');
  assert.equal(first[0].longBreak, false);
  assert.equal(timer.state.mode, 'break');
  assert.equal(timer.state.history.length, 1);
  assert.deepEqual(timer.state.history[0], {
    at: 61000, minutes: 1, task: 'Write findings', bunny: 8, sound: 'lofi_vinyl_keys'
  });
  assert.equal(timer.state.remaining, 60000);
  assert.equal(timer.advance(121000)[0].type, 'break-complete');
  assert.equal(timer.state.task, '');

  timer.state.task = 'Code interview';
  timer.start(200000, () => 0);
  const second = timer.advance(260000);
  assert.equal(second[0].longBreak, true);
  assert.equal(timer.state.isLongBreak, true);
  assert.equal(timer.state.remaining, 120000);
  assert.equal(timer.state.cycleProgress, 0);
  assert.equal(timer.advance(380000)[0].type, 'break-complete');
  assert.equal(timer.state.running, false);

  const paused = new BurrowTimer();
  paused.start(1000);
  paused.pause(11000);
  paused.start(50000);
  assert.equal(paused.state.deadline, 1540000);
  paused.stop();
  assert.equal(paused.state.started, false);
  assert.equal(paused.state.mode, 'focus');

  const presets = new BurrowTimer();
  assert.equal(presets.applyPreset(BUILTIN_PRESETS.deep), true);
  assert.equal(presets.state.focusMinutes, 50);
  assert.equal(presets.state.longBreakMinutes, 25);
  assert.equal(presets.state.cycleLength, 3);
  assert.equal(presets.saveCustomPreset('Dissertation hour').name, 'Dissertation hour');
  assert.equal(presets.state.customPresets.length, 1);
  presets.start(0);
  assert.equal(presets.applyPreset(BUILTIN_PRESETS.quick), false);

  const audio = new BurrowTimer();
  audio.state.favourites = ['rain', 'lofi_music_box'];
  audio.state.shuffleFavourites = true;
  assert.equal(audio.chooseSessionSound(() => .99), 'lofi_music_box');
  assert.equal(audio.toggleFavourite('rain'), false);
  assert.equal(audio.toggleFavourite('fire'), true);
  assert.equal(audio.toggleFavourite('none'), false);

  const expiring = new BurrowTimer();
  expiring.state.earned = [{ bunny: 2, at: 1000 }, { bunny: 8, at: DAY + 500 }];
  assert.equal(expiring.prune(DAY + 1001), 1);
  assert.deepEqual(expiring.state.earned, [{ bunny: 8, at: DAY + 500 }]);
  expiring.clearBurrow();
  assert.deepEqual(expiring.state.earned, []);

  const now = new Date(2026, 8, 10, 12).getTime();
  const insights = new BurrowTimer();
  insights.state.history = [
    { at: new Date(2026, 8, 8, 8).getTime(), minutes: 50, task: 'A', bunny: 0, sound: 'none' },
    { at: new Date(2026, 8, 9, 10).getTime(), minutes: 50, task: 'B', bunny: 0, sound: 'rain' },
    { at: new Date(2026, 8, 10, 11).getTime(), minutes: 25, task: 'C', bunny: 6, sound: 'rain' }
  ];
  const stats = insights.stats(now);
  assert.equal(stats.todayMinutes, 25);
  assert.equal(stats.weekMinutes, 125);
  assert.equal(stats.streak, 3);
  assert.equal(stats.favouriteBunny, 0);
  assert.equal(stats.favouriteSound, 'rain');
  const badges = insights.achievements(now);
  assert.equal(badges.first_hop, true);
  assert.equal(badges.cosy_morning, true);
  assert.equal(badges.little_routine, true);
  assert.equal(badges.quiet_companion, true);
  assert.equal(badges.deep_burrow, false);

  const backup = insights.buildBackup(now);
  const restored = BurrowTimer.fromBackup(JSON.parse(JSON.stringify(backup)), now);
  assert.equal(restored.state.history.length, 3);
  assert.equal(restored.state.version, 6);
  assert.throws(() => BurrowTimer.fromBackup({ app: 'Different app' }), /not a Bunny Burrow/);

  const legacy = new BurrowTimer({
    version: 4, focusMinutes: 25, breakMinutes: 5, chosen: 7,
    ambience: 'fire', bell: 'bell_glass', volume: .35, bellVolume: .65,
    earned: [0, 7], earnedTotal: 2, mode: 'focus', remaining: 1500000
  }, 5000);
  assert.equal(legacy.state.version, 6);
  assert.equal(legacy.state.earned.length, 2);
  assert.equal(legacy.state.earned[0].at, 5000);
  assert.equal(legacy.state.dailyGoal, 4);
  assert.equal(legacy.state.countdownNotificationsEnabled, false);

  const versionFive = new BurrowTimer({
    version: 5, mode: 'focus', remaining: 1500000,
    ambience: 'lofi_jazz_cafe', bell: 'bell_twinkle', notificationsEnabled: true
  });
  assert.equal(versionFive.state.version, 6);
  assert.equal(versionFive.state.notificationsEnabled, true);
  assert.equal(versionFive.state.countdownNotificationsEnabled, false);

  const expandedAudio = new BurrowTimer({
    version: 6, mode: 'focus', remaining: 1500000,
    ambience: 'jazz_bossa_bloom', activeAmbience: 'jazz_bossa_bloom',
    breakAmbience: 'chillwave_aqua_dream', bell: 'bell_harbour',
    countdownNotificationsEnabled: true
  });
  assert.equal(expandedAudio.state.ambience, 'jazz_bossa_bloom');
  assert.equal(expandedAudio.state.breakAmbience, 'chillwave_aqua_dream');
  assert.equal(expandedAudio.state.bell, 'bell_harbour');
  assert.equal(expandedAudio.state.countdownNotificationsEnabled, true);

  assert.equal(localDateKey(now), '2026-09-10');

  const context = {
    self: { registration: { scope: 'https://example.com/bunny/' }, addEventListener() {} },
    URL, Response, Request
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/sw.js', 'utf8'), context);
  const ranged = await context.partialAudio(new Response(new Uint8Array([0, 1, 2, 3, 4])), 'bytes=1-3');
  assert.equal(ranged.status, 206);
  assert.deepEqual([...new Uint8Array(await ranged.arrayBuffer())], [1, 2, 3]);
  const invalid = await context.partialAudio(new Response('abc'), 'bytes=8-9');
  assert.equal(invalid.status, 416);

  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const app = fs.readFileSync(__dirname + '/app.js', 'utf8');
  const ids = [...app.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  for (const id of new Set(ids)) assert.match(html, new RegExp(`id=["']${id}["']`), `Missing UI element: ${id}`);

  const featureIds = [
    'task', 'goal', 'preset', 'long-break-min', 'cycle-length', 'week-chart',
    'history-list', 'collection-book', 'achievement-list', 'break-tip',
    'notifications', 'countdown-notifications', 'favorite-sound', 'shuffle-favourites', 'break-ambience',
    'fade-audio', 'focus-mode', 'export-backup', 'import-backup'
  ];
  for (const id of featureIds) assert.match(html, new RegExp(`id="${id}"`));

  const serviceWorker = fs.readFileSync(__dirname + '/sw.js', 'utf8');
  const assetBlock = serviceWorker.match(/const ASSETS = \[([\s\S]*?)\];/)[1];
  const offlineAssets = [...assetBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
  for (const path of offlineAssets) {
    const relative = path.replace(/^\.\//, '');
    if (!relative || relative === '/') continue;
    assert.equal(fs.existsSync(__dirname + '/' + relative), true, 'Missing offline asset: ' + relative);
  }
  assert.match(serviceWorker, /mobile-13-clean-audio/);
  assert.match(serviceWorker, /notificationclick/);
  assert.match(app, /bunny-burrow-countdown/);
  assert.match(app, /bunny-burrow-completion/);
  assert.match(app, /showNotification/);
  assert.match(app, /setAppBadge/);

  for (const label of ['Sunday Sax', 'Garden Brass', 'Morning Piano', 'Candy Circuit', 'Starlight Float']) {
    assert.match(html, new RegExp(label), `Missing clean-audio label: ${label}`);
    assert.match(app, new RegExp(label), `Missing clean-audio display name: ${label}`);
  }
  for (const oldLabel of ['Midnight Sax', 'Brass Parade', 'Piano Afterglow', 'Arcade Drive', 'Cosmic Drift']) {
    assert.doesNotMatch(html, new RegExp(oldLabel), `Old audio label remains: ${oldLabel}`);
    assert.doesNotMatch(app, new RegExp(oldLabel), `Old audio display name remains: ${oldLabel}`);
  }

  assert.equal(AMBIENCE.filter(sound => sound !== 'none').length, 30);
  assert.equal(BELLS.length, 7);
  for (const sound of AMBIENCE.filter(sound => sound !== 'none')) {
    assert.equal(fs.existsSync(`${__dirname}/audio/${sound}.wav`), true, `Missing sound file: ${sound}`);
    assert.equal(offlineAssets.includes(`./audio/${sound}.wav`), true, `Sound is not cached offline: ${sound}`);
    assert.match(html, new RegExp(`value="${sound}"`), `Missing sound option: ${sound}`);
  }
  for (const sound of BELLS) {
    assert.equal(fs.existsSync(`${__dirname}/audio/${sound}.wav`), true, `Missing bell file: ${sound}`);
    assert.equal(offlineAssets.includes(`./audio/${sound}.wav`), true, `Bell is not cached offline: ${sound}`);
    assert.match(html, new RegExp(`value="${sound}"`), `Missing bell option: ${sound}`);
  }

  const hashes = new Set();
  for (const sound of NEW_MUSIC) {
    assert.equal(AMBIENCE.includes(sound), true, `Missing timer sound: ${sound}`);
    const wav = fs.readFileSync(`${__dirname}/audio/${sound}.wav`);
    assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
    assert.equal(wav.subarray(8, 12).toString(), 'WAVE');
    assert.equal(wav.readUInt16LE(22), 1, `${sound} should be mono`);
    assert.equal(wav.readUInt32LE(24), 22050, `${sound} sample rate`);
    assert.equal(wav.readUInt16LE(34), 16, `${sound} sample width`);
    assert.ok(wav.length > 900000, `${sound} is unexpectedly short`);
    hashes.add(crypto.createHash('sha256').update(wav).digest('hex'));
  }
  for (const sound of NEW_BELLS) {
    assert.equal(BELLS.includes(sound), true, `Missing timer bell: ${sound}`);
    const wav = fs.readFileSync(`${__dirname}/audio/${sound}.wav`);
    assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
    assert.equal(wav.subarray(8, 12).toString(), 'WAVE');
    assert.ok(wav.length > 100000, `${sound} is unexpectedly short`);
    hashes.add(crypto.createHash('sha256').update(wav).digest('hex'));
  }
  assert.equal(hashes.size, NEW_MUSIC.length + NEW_BELLS.length, 'Every new sound must have distinct audio data');

  console.log('PASS: timer, notification, migration, audio catalogue and offline PWA checks.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
