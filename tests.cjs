const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { BurrowTimer, DAY, BUILTIN_PRESETS, localDateKey } = require('./timer.js');

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
  assert.equal(restored.state.version, 5);
  assert.throws(() => BurrowTimer.fromBackup({ app: 'Different app' }), /not a Bunny Burrow/);

  const legacy = new BurrowTimer({
    version: 4, focusMinutes: 25, breakMinutes: 5, chosen: 7,
    ambience: 'fire', bell: 'bell_glass', volume: .35, bellVolume: .65,
    earned: [0, 7], earnedTotal: 2, mode: 'focus', remaining: 1500000
  }, 5000);
  assert.equal(legacy.state.version, 5);
  assert.equal(legacy.state.earned.length, 2);
  assert.equal(legacy.state.earned[0].at, 5000);
  assert.equal(legacy.state.dailyGoal, 4);

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
    'notifications', 'favorite-sound', 'shuffle-favourites', 'break-ambience',
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
  assert.match(serviceWorker, /mobile-11-focus-garden/);

  console.log('PASS: all 12 feature groups, migration, cycles, insights, backups and offline assets.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
