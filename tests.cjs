const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { BurrowTimer, DAY } = require('./timer.js');

(async () => {
  const t = new BurrowTimer(); t.state.focusMinutes = 1; t.state.breakMinutes = 1; t.reset(); t.start(1000);
  const restored = new BurrowTimer(JSON.parse(JSON.stringify(t.serialise(2000))), 2000);
  assert.equal(restored.advance(71000)[0].type, 'focus-complete');
  assert.equal(restored.state.remaining, 50000);
  assert.equal(restored.state.earnedTotal, 1);
  assert.deepEqual(restored.state.earned[0], { bunny: 0, at: 61000 });
  assert.equal(restored.advance(200000)[0].type, 'break-complete');
  assert.equal(restored.state.running, false);
  assert.equal(restored.advance(300000).length, 0);
  assert.equal(restored.state.earnedTotal, 1);

  const paused = new BurrowTimer(); paused.start(1000); paused.pause(11000);
  paused.start(50000); assert.equal(paused.state.deadline, 1540000);
  paused.stop(); assert.equal(paused.state.started, false); assert.equal(paused.state.mode, 'focus');
  assert.equal(paused.state.remaining, paused.state.focusMinutes * 60000);

  const expiring = new BurrowTimer();
  expiring.state.earned = [{ bunny: 2, at: 1000 }, { bunny: 8, at: DAY + 500 }];
  assert.equal(expiring.prune(DAY + 1001), 1);
  assert.deepEqual(expiring.state.earned, [{ bunny: 8, at: DAY + 500 }]);
  expiring.clearBurrow(); assert.deepEqual(expiring.state.earned, []); assert.equal(expiring.state.earnedTotal, 0);

  const legacy = new BurrowTimer({ version: 3, focusMinutes: 25, breakMinutes: 5, chosen: 7,
    ambience: 'fire', bell: 'bell_glass', volume: .35, bellVolume: .65,
    earned: [0, 7], earnedTotal: 2, mode: 'focus', remaining: 1500000 }, 5000);
  assert.equal(legacy.state.version, 4); assert.equal(legacy.state.earned.length, 2);
  assert.equal(legacy.state.earned[0].at, 5000);

  for (const ambience of ['lofi_neon_bloom', 'lofi_vinyl_keys', 'lofi_sleepy_strings', 'lofi_music_box']) {
    const selected = new BurrowTimer(); selected.state.ambience = ambience;
    const reopened = new BurrowTimer(JSON.parse(JSON.stringify(selected.serialise(1000))), 1000);
    assert.equal(reopened.state.ambience, ambience);
  }
  for (const bell of ['bell_temple', 'bell_twinkle']) {
    const selected = new BurrowTimer(); selected.state.bell = bell;
    const reopened = new BurrowTimer(JSON.parse(JSON.stringify(selected.serialise(1000))), 1000);
    assert.equal(reopened.state.bell, bell);
  }

  const context = { self: { registration: { scope: 'https://example.com/bunny/' }, addEventListener() {} }, URL, Response, Request };
  vm.createContext(context); vm.runInContext(fs.readFileSync(__dirname + '/sw.js', 'utf8'), context);
  const ranged = await context.partialAudio(new Response(new Uint8Array([0, 1, 2, 3, 4])), 'bytes=1-3');
  assert.equal(ranged.status, 206);
  assert.deepEqual([...new Uint8Array(await ranged.arrayBuffer())], [1, 2, 3]);
  const invalid = await context.partialAudio(new Response('abc'), 'bytes=8-9'); assert.equal(invalid.status, 416);
  const suffix = await context.partialAudio(new Response('abc'), 'bytes=-2'); assert.equal(await suffix.text(), 'bc');

  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  for (const id of ['stop', 'clear-burrow', 'clear-dialog']) assert.match(html, new RegExp('id="' + id + '"'));
  const assetBlock = fs.readFileSync(__dirname + '/sw.js', 'utf8').match(/const ASSETS = \[([\s\S]*?)\];/)[1];
  const offlineAssets = [...assetBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
  for (const path of offlineAssets) {
    const relative = path.replace(/^\.\//, '');
    if (!relative || relative === '/') continue;
    assert.equal(fs.existsSync(__dirname + '/' + relative), true, 'Missing offline asset: ' + relative);
  }

  console.log('PASS: stop, 24-hour expiry, live choices, new audio, migration and offline audio ranges.');
})().catch(error => { console.error(error); process.exitCode = 1; });
