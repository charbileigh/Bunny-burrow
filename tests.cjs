const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { BurrowTimer } = require('./timer.js');
(async () => {
  const t = new BurrowTimer(); t.state.focusMinutes=1; t.state.breakMinutes=1; t.reset(); t.start(1000);
  const restored = new BurrowTimer(JSON.parse(JSON.stringify(t.state)));
  assert.equal(restored.advance(71000)[0].type,'focus-complete');
  assert.equal(restored.state.remaining,50000); assert.equal(restored.state.earnedTotal,1);
  assert.equal(restored.advance(200000)[0].type,'break-complete');
  assert.equal(restored.state.running,false); assert.equal(restored.advance(300000).length,0);
  assert.equal(restored.state.earnedTotal,1);
  const paused = new BurrowTimer(); paused.start(1000); paused.pause(11000);
  paused.start(50000); assert.equal(paused.state.deadline,1540000);
  const long = new BurrowTimer(t.state); assert.equal(long.advance(86400000).length,2);
  assert.equal(long.state.earnedTotal,1); assert.equal(long.state.started,false);
  for (const ambience of ['lofi_rainy_window', 'lofi_lavender_evening', 'lofi_sunday_sketchbook']) {
    const selected = new BurrowTimer(); selected.state.ambience = ambience;
    const reopened = new BurrowTimer(JSON.parse(JSON.stringify(selected.state)));
    assert.equal(reopened.state.ambience, ambience);
  }
  for (const ambience of ['lofi_jazz_cafe', 'lofi_cloud_waltz', 'lofi_pixel_night']) {
    const selected = new BurrowTimer(); selected.state.ambience = ambience;
    const reopened = new BurrowTimer(JSON.parse(JSON.stringify(selected.state)));
    assert.equal(reopened.state.ambience, ambience);
  }
  const context={self:{registration:{scope:'https://example.com/bunny/'},addEventListener(){}},URL,Response,Request};
  vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/sw.js','utf8'),context);
  const ranged=await context.partialAudio(new Response(new Uint8Array([0,1,2,3,4])),'bytes=1-3');
  assert.equal(ranged.status,206);assert.deepEqual([...new Uint8Array(await ranged.arrayBuffer())],[1,2,3]);
  const invalid=await context.partialAudio(new Response('abc'),'bytes=8-9');assert.equal(invalid.status,416);
  const suffix=await context.partialAudio(new Response('abc'),'bytes=-2');assert.equal(await suffix.text(),'bc');
  console.log('PASS: timer recovery, all added lo-fi choices, single reward and offline audio ranges.');
})().catch(error=>{console.error(error);process.exitCode=1;});
