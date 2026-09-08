'use strict';
const $=id=>document.getElementById(id);
const companions=[{name:'Rosie',color:'pink',filter:'none'},{name:'Plum',color:'purple',filter:'hue-rotate(285deg)'},{name:'Honey',color:'golden',filter:'hue-rotate(65deg) saturate(.8)'},{name:'Clover',color:'green',filter:'hue-rotate(145deg) saturate(.65)'}];
let chosen=0,mode='focus',running=false,started=false,remaining=25*60,total=remaining,deadline=0,count=0,focusMinutes=25,breakMinutes=5;
let audio=null,fireGain=null,fireSource=null,wakeLock=null;
let wakeLockPending=false;
function storePreference(key,value){try{localStorage.setItem('burrow-'+key,value)}catch{}}
function readPreference(key){try{return localStorage.getItem('burrow-'+key)}catch{return null}}
function setTheme(dark){document.body.classList.toggle('dark',dark);$('theme').innerHTML=dark?'☀ <span>Daylight</span>':'☾ <span>Moonlight</span>';$('theme').setAttribute('aria-label',dark?'Switch to pink light mode':'Switch to purple dark mode');document.querySelector('meta[name="theme-color"]').content=dark?'#241a35':'#fce4ed';storePreference('dark',dark)}
setTheme(readPreference('dark')==='true');$('theme').onclick=()=>setTheme(!document.body.classList.contains('dark'));
async function unlockAudio(){try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();makeFire()}if(audio.state==='suspended')await audio.resume();updateFire()}catch{$('announcement').textContent='Audio is unavailable in this browser. Your timer will still work.'}}
function makeFire(){const length=audio.sampleRate*8,buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<length;i++){brown=(brown+.022*(Math.random()*2-1))/1.022;data[i]=brown*2.8}for(let n=0;n<150;n++){let start=Math.floor(Math.random()*(length-2000)),len=100+Math.floor(Math.random()*1700),amp=.1+Math.random()*.45;for(let j=0;j<len;j++)data[start+j]+=(Math.random()*2-1)*amp*Math.exp(-j/(len*.15))}fireSource=audio.createBufferSource();fireSource.buffer=buffer;fireSource.loop=true;fireGain=audio.createGain();fireGain.gain.value=0;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=3600;fireSource.connect(filter).connect(fireGain).connect(audio.destination);fireSource.start()}
function updateFire(){if(fireGain)fireGain.gain.setTargetAtTime(running&&mode==='focus'&&$('fire').checked?Number($('volume').value)/100*.8:0,audio.currentTime,.2)}
function ringBell(){if(!audio||!$('bell').checked)return;const t=audio.currentTime;[0,.45].forEach(delay=>{[660,1320,1848].forEach((frequency,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=frequency;gain.gain.setValueAtTime(0,t+delay);gain.gain.linearRampToValueAtTime(.16/(i+1),t+delay+.007);gain.gain.exponentialRampToValueAtTime(.0001,t+delay+2.7);osc.connect(gain).connect(audio.destination);osc.start(t+delay);osc.stop(t+delay+2.8)})})}
async function keepAwake(){
  if (!('wakeLock' in navigator) || !running || wakeLock || wakeLockPending || document.visibilityState !== 'visible') return;
  wakeLockPending = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!running || document.visibilityState !== 'visible') { await lock.release(); return; }
    wakeLock = lock;
    lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
  } catch {} finally { wakeLockPending = false; }
}
function releaseAwake(){if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}}
function format(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function render(){const secs=Math.max(0,Math.ceil(remaining));$('clock').textContent=format(secs);$('clock').setAttribute('aria-label',`${Math.floor(secs/60)} minutes ${secs%60} seconds remaining`);document.title=(started?format(secs)+' · ':'')+'Bunny Burrow';$('mode').textContent=mode==='focus'?'Focus time':'Break time';$('start').innerHTML=running?'Ⅱ &nbsp; Pause':started?'▶ &nbsp; Continue':mode==='focus'?'▶ &nbsp; Start focusing':'▶ &nbsp; Start break';document.body.classList.toggle('running',running);$('focus-min').disabled=started;$('break-min').disabled=started;document.querySelectorAll('.swatch').forEach(b=>b.disabled=started);const progress=mode==='break'?1:Math.max(0,Math.min(1,1-remaining/total));$('bunny').style.setProperty('--scale',String(.52+progress*.48));$('growth-fill').style.width=(progress*100)+'%';$('growth').setAttribute('aria-valuenow',String(Math.round(progress*100)));$('growth-label').textContent=mode==='break'?'All grown up!':progress<.25?'Little beginnings':progress<.6?'Growing with you':progress<.9?'Look at you grow':'Almost there!';$('growth-message').textContent=mode==='break'?'Your bunny is taking a breather, too.':progress===0?'A little focus goes a long way.':Math.round(progress*100)+'% grown · keep going gently';$('bunny').alt=`A ${progress<.5?'small':'grown'} ${companions[chosen].color} bunny`;$('next').textContent=mode==='focus'?`${focusMinutes} min focus · then a ${breakMinutes} min breather`:'Stretch, sip some water, and rest your eyes.'}
function complete(endedAt=Date.now(), audible=true){if(audible && audio?.state==='running' && document.visibilityState==='visible')ringBell();if(mode==='focus'){count++;const img=document.createElement('img');img.src='bunny.png';img.alt=companions[chosen].name+' — completed focus session';img.style.filter=companions[chosen].filter;if(count===1)$('bunny-collection').replaceChildren();$('bunny-collection').append(img);$('session-count').textContent=`${count} ${count===1?'bunny':'bunnies'} grown this visit`;$('meadow-note').textContent=`${count} little ${count===1?'reason':'reasons'} to be proud of yourself.`;mode='break';total=breakMinutes*60;remaining=total;deadline=endedAt+total*1000;remaining=Math.max(0,(deadline-Date.now())/1000);running=true;started=true;$('heading').innerHTML='A little rest.<br>You’ve earned it.';$('subheading').textContent='Your bunny is all grown up. Time for a breather.';$('announcement').textContent=`Lovely work! ${companions[chosen].name} is fully grown. Your ${breakMinutes}-minute break has started.`}else{running=false;started=false;mode='focus';total=focusMinutes*60;remaining=total;$('heading').innerHTML='Small steps.<br>Happy little hops.';$('subheading').textContent='Settle in. Your bunny grows while you focus.';$('announcement').textContent='Break finished. Choose a bunny and start when you’re ready.';releaseAwake()}updateFire();render()}
function tick(){
  if(!running) return;
  const now=Date.now();
  // Clock deadlines, rather than interval counts, survive background throttling.
  // At most two boundaries are crossed: focus -> break -> waiting for user.
  for(let boundary=0;running && boundary<2 && now>=deadline;boundary++){
    complete(deadline,now-deadline<2000);
  }
  if(running) remaining=Math.max(0,(deadline-now)/1000);
  render();
}
$('start').onclick=()=>{if(running){const oldMode=mode;tick();if(!running || mode!==oldMode)return;running=false;updateFire();releaseAwake()}else{started=true;running=true;deadline=Date.now()+remaining*1000;$('announcement').textContent='';unlockAudio();keepAwake()}render()};
$('reset').onclick=()=>{running=false;started=false;remaining=total;updateFire();releaseAwake();$('announcement').textContent='Timer reset. Begin again whenever you’re ready.';render()};
function updateDurations(){if(started)return;focusMinutes=Math.min(120,Math.max(1,Math.round(Number($('focus-min').value)||25)));breakMinutes=Math.min(60,Math.max(1,Math.round(Number($('break-min').value)||5)));$('focus-min').value=focusMinutes;$('break-min').value=breakMinutes;total=(mode==='focus'?focusMinutes:breakMinutes)*60;remaining=total;render()}
$('focus-min').onchange=updateDurations;$('break-min').onchange=updateDurations;
document.querySelectorAll('.swatch').forEach(button=>button.onclick=()=>{if(started)return;chosen=Number(button.dataset.bunny);document.querySelectorAll('.swatch').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))});$('bunny').style.setProperty('--bunny-filter',companions[chosen].filter);$('bunny-name').textContent='MEET '+companions[chosen].name.toUpperCase();render()});
$('fire').onchange=()=>{if(running)unlockAudio();updateFire()};$('volume').oninput=updateFire;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    tick();
    if(running){keepAwake();if(audio && audio.state!=='running')audio.resume().catch(()=>{});}
  } else releaseAwake();
});
window.addEventListener('pageshow',()=>{tick();if(running)keepAwake();});
// A tap can resume mobile audio after the OS interrupts it.
window.addEventListener('pointerdown',()=>{
  if(running && audio && audio.state!=='running')audio.resume().then(updateFire).catch(()=>{});
});
setInterval(tick,250);render();
