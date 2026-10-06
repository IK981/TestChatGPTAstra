import { TRACKS, createGame, startGame, updateGame, pauseGame, resumeGame } from './game.js';
import { createRenderer } from './renderer.js';

const paths = {
  race: '<path d="m4 16 3-9h10l3 9M3 16h18v4H3zM7 20v2m10-2v2M7 12h10M6 17h2m8 0h2"/>',
  garage: '<path d="m3 10 9-7 9 7v11H3zM7 21V11h10v10M7 15h10m-10 3h10"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v5m-4 2h8m-6-2h4"/>',
  settings: '<path d="m10 3-1 3-3 1-3 3 2 2-1 3 3 3 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-3-3-3 1z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  reset: '<path d="M4 9a8 8 0 1 1 0 7m0-12v5h5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  flag: '<path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heart: '<path d="M20.5 4.7a5 5 0 0 0-7.1 0L12 6.1l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 20l8.5-8.2a5 5 0 0 0 0-7.1z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  road: '<path d="m8 3-4 18m12-18 4 18M12 3v4m0 3v4m0 3v4"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1m3 0h1M8 16h8"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.race}</svg>`;
const colors = [{value:'#ee534a',name:'Rosso red'}, {value:'#c7f36d',name:'Acid green'}, {value:'#e4e8ef',name:'Pearl white'}, {value:'#8299ef',name:'Velocity blue'}, {value:'#d99de5',name:'Orchid purple'}];
let stored = {};
try { stored = JSON.parse(localStorage.getItem('apex-v1')) || {}; } catch { /* Storage is optional. */ }
const settings = {
  color: colors.some(c => c.value === stored.color) ? stored.color : colors[0].value,
  track: TRACKS.some(t => t.id === stored.track) ? stored.track : 'midnight',
  difficulty: ['easy','normal','expert'].includes(stored.difficulty) ? stored.difficulty : 'normal',
  sound: stored.sound === true,
  reducedMotion: typeof stored.reducedMotion === 'boolean' ? stored.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches,
  records: Array.isArray(stored.records) ? stored.records.filter(r => Number.isFinite(r.score) && Number.isFinite(r.elapsed)).slice(0,20) : [],
};
const save = () => { try { localStorage.setItem('apex-v1',JSON.stringify(settings)); } catch { /* Private browsing may restrict storage. */ } };
const bestScore = () => Math.max(0, ...settings.records.map(r => r.score));
const timeLabel = seconds => `${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const carArt = (color=settings.color) => `<svg class="car-art" viewBox="0 0 340 150" aria-label="APEX GT sports car" role="img"><defs><linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#55282b"/></linearGradient><linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#749591"/><stop offset="1" stop-color="#182525"/></linearGradient></defs><ellipse cx="177" cy="119" rx="136" ry="12" fill="#000" opacity=".4"/><path d="M35 102 44 78l62-12 31-30 65-2 49 40 40 10 19 20-8 12H40z" fill="url(#bodyGrad)"/><path d="m113 67 28-25 55-2 32 29z" fill="url(#glassGrad)"/><path d="m174 40 5 29M105 74h139" stroke="#e7e4d7" stroke-opacity=".25" stroke-width="2"/><path d="m245 79 45 12-6 6-40-10z" fill="#d6f7ef"/><path d="m45 81 21-3-5 11-22 3" fill="#ffb3a0"/><path d="M83 98h167m-70-25 5 29m-50-29-5 24" stroke="#401f25" stroke-width="2"/><path d="M36 111h266" stroke="#291d20" stroke-width="6"/><g fill="#161d1c" stroke="#242e2c" stroke-width="5"><circle cx="86" cy="109" r="23"/><circle cx="256" cy="109" r="23"/></g><g fill="#52645f" stroke="#adbbb6" stroke-width="2"><circle cx="86" cy="109" r="13"/><circle cx="256" cy="109" r="13"/></g><g stroke="#1e2825" stroke-width="3"><path d="m86 96 0 26m-13-13h26m-22-9 18 18m-18 0 18-18M256 96v26m-13-13h26m-22-9 18 18m-18 0 18-18"/></g><path d="m207 55 16 4 2 7-15-1" fill="${color}"/><path d="m138 80 12-1" stroke="#f5d1c9" stroke-width="2"/><path d="M72 71 43 75" stroke="${color}" stroke-width="5"/></svg>`;
const routeArt = id => `<svg class="route-art" viewBox="0 0 240 86" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sky-${id}" x2="0" y2="1">${id==='midnight'?'<stop stop-color="#182930"/><stop offset="1" stop-color="#496773"/>':id==='coast'?'<stop stop-color="#41666f"/><stop offset="1" stop-color="#9bc5b5"/>':'<stop stop-color="#695257"/><stop offset="1" stop-color="#e0a576"/>'}</linearGradient></defs><path fill="url(#sky-${id})" d="M0 0h240v86H0z"/><circle cx="183" cy="26" r="${id==='midnight'?8:14}" fill="${id==='midnight'?'#c8ded6':'#f1c98e'}"/><path d="m0 49 23-12 21 10 27-24 41 28 39-14 32 14 31-20 26 17v38H0" fill="${id==='desert'?'#926955':'#294442'}"/><path d="M98 46h31l46 40H50z" fill="#232b2a"/><path d="m112 50 1 5m2 6 2 7m2 7 4 11" stroke="#b7c4af" stroke-width="2"/>${id==='midnight'?'<path d="M12 49V26h15v23m3 0V19h10v30m134 0V24h10v25m5 0V13h15v36" fill="#213238"/><path d="M16 30h5m14-5h2m160-7h2m-182 18h4m165-5h2" stroke="#d4ba77"/>':id==='coast'?'<path d="M0 65q30-16 70-4L50 86H0z" fill="#578c89"/><path d="M205 66v-34m0 3-14-9m14 9 13-8m-13 8-16-1m16 1 16-1" stroke="#253f36" stroke-width="3"/>':'<path d="M23 65V40m0 14H15V45m8 12h9V46m184 21V43m0 11h8V46" stroke="#4f5140" stroke-width="4"/>'}</svg>`;

document.querySelector('#app').innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="" aria-label="Apex home"><svg viewBox="0 0 34 34" aria-hidden="true"><path d="m4 28 13-23 13 23h-9l-4-8-4 8z" fill="currentColor"/></svg><span>APEX<span class="brand-dot">®</span></span></a>
    <div class="nav-caption">YOUR NEXT ESCAPE</div>
    <nav aria-label="Main navigation">
      <button class="nav-item active" data-nav="play">${icon('race')}<span>Play</span><span class="nav-active-dot"></span></button>
      <button class="nav-item" data-nav="garage">${icon('garage')}<span>Garage</span></button>
      <button class="nav-item" data-nav="records">${icon('trophy')}<span>My records</span></button>
      <button class="nav-item" data-nav="settings">${icon('settings')}<span>Settings</span></button>
    </nav>
    <div class="sidebar-bottom"><div class="small-road">${icon('road')}</div><p>Less scrolling.<br>More driving.</p><span class="version">APEX ARCADE · V1.0</span></div>
  </aside>
  <div class="workspace">
    <header class="header"><div class="breadcrumb">The arcade <span>/</span> <strong>Free ride</strong></div><div class="profile"><span class="online"><i></i> READY TO RACE</span><div class="avatar">D</div><span class="driver-name">Driver 01</span></div></header>
    <main>
      <section class="page-heading"><div><div class="eyebrow"><span class="tiny-line"></span> NO LIMITS. JUST YOU AND THE ROAD.</div><h1>Chase the horizon<span>.</span></h1><p>A little speed. A little freedom. Your next personal best.</p></div><div class="personal-best">${icon('trophy')}<div><span>PERSONAL BEST</span><strong id="best-score">${bestScore().toLocaleString()}</strong><small>PTS</small></div></div></section>
      <div class="main-grid">
        <div class="race-column">
          <section class="race-card" aria-label="Racing game">
            <div class="race-titlebar"><div class="track-title"><span class="live-dot"></span><strong id="track-name">Midnight Run</strong><span class="separator"></span><span id="track-location">Tokyo, Japan</span></div><div class="race-type">${icon('flag')} 5 KM SPRINT</div></div>
            <div class="game-stage" id="game-stage">
              <canvas id="race-canvas" aria-label="Race view. Use arrow keys or A and D to steer, Shift to boost."></canvas>
              <div class="stage-vignette"></div>
              <div class="game-hud" id="game-hud" hidden><div class="speed-display"><strong id="speed">000</strong><span>KM/H</span><div class="nitro-meter"><i id="nitro-fill"></i></div><span class="nitro-label">${icon('bolt')} NITRO</span></div><div class="hud-right"><div class="lives" id="lives"></div><button class="icon-button stage-button" id="pause-button" aria-label="Pause race">${icon('pause')}</button></div><div class="hud-time">${icon('clock')}<span id="race-time">00:00</span></div></div>
              <div class="game-overlay" id="game-overlay"></div>
              <span class="stage-coordinate" id="stage-coordinate">35°40′ N &nbsp; 139°46′ E</span>
              <div class="touch-controls" id="touch-controls" hidden><div><button data-control="left" aria-label="Steer left">←</button><button data-control="right" aria-label="Steer right">→</button></div><div><button data-control="brake" aria-label="Brake">${icon('race')}</button><button class="touch-nitro" data-control="boost" aria-label="Use nitro">${icon('bolt')}</button></div></div>
              <div id="race-announcement" class="sr-only" aria-live="polite"></div>
            </div>
            <div class="race-statusbar"><div class="status-item">${icon('road')}<span>DISTANCE</span><strong><span id="distance">0.00</span><small> / 5.00 km</small></strong></div><div class="distance-progress"><i id="distance-fill"></i></div><div class="status-item score-item"><span>SCORE</span><strong id="score">00000</strong></div></div>
          </section>
          <section class="routes-section"><div class="section-heading"><h2>Pick your playground</h2><span>THREE ROADS. ENDLESS POSSIBILITIES.</span></div><div class="route-grid">${TRACKS.map((track,i)=>`<button class="route-card ${settings.track===track.id?'selected':''}" data-track="${track.id}" aria-pressed="${settings.track===track.id}">${routeArt(track.id)}<span class="route-number">0${i+1}</span><div class="route-info"><div><strong>${track.name}</strong><span>${track.location}</span></div><span class="route-selection">${icon(settings.track===track.id?'check':'arrow')}</span></div></button>`).join('')}</div></section>
          <div class="race-tip">${icon('bolt')}<p><strong>Find your flow.</strong> Hold Shift to unleash nitro. Save a little for the open road.</p><span>LET’S DRIVE ${icon('arrow')}</span></div>
        </div>
        <aside class="right-column">
          <section class="car-card" id="car-card"><div class="section-heading"><h2>Your ride</h2><span class="class-badge">CLASS S</span></div><div class="car-showcase" id="car-showcase">${carArt()}</div><div class="car-name"><h3>APEX GT</h3><span>Street edition</span></div><div class="color-options" aria-label="Car color">${colors.map(c=>`<button class="color-swatch ${settings.color===c.value?'selected':''}" style="--swatch:${c.value}" data-color="${c.value}" aria-label="${c.name}" aria-pressed="${settings.color===c.value}"></button>`).join('')}</div><div class="car-specs"><div><span>TOP SPEED</span><strong>240 <small>km/h</small></strong></div><div><span>0—100 KM/H</span><strong>3.2 <small>sec</small></strong></div></div><div class="car-handling"><span>HANDLING</span><div>${[1,2,3,4,5,6,7,8].map((_,i)=>`<i class="${i<7?'filled':''}"></i>`).join('')}</div><strong>7/8</strong></div></section>
          <section class="controls-card"><div class="section-heading"><h2>You're in control</h2>${icon('keyboard')}</div><div class="control-row"><span>Steer</span><div><kbd>←</kbd><kbd>→</kbd><small>or</small><kbd>A</kbd><kbd>D</kbd></div></div><div class="control-row"><span>Nitro ${icon('bolt')}</span><div><kbd class="wide-key">SHIFT</kbd><small>or</small><kbd>␣</kbd></div></div><div class="control-row"><span>Brake</span><div><kbd>↓</kbd><small>or</small><kbd>S</kbd></div></div><div class="control-row"><span>Pause</span><div><kbd>P</kbd><small>or</small><kbd>ESC</kbd></div></div><div class="controls-note"><i></i> Auto-accelerate is on. Just steer.</div></section>
          <section class="challenge-card"><div class="challenge-icon">${icon('flag')}</div><div><span>THE FIRST MILE</span><h3>Make it to the finish.</h3><p>5 kilometers. 3 lives. One open road.</p></div><div class="challenge-progress"><i id="challenge-fill"></i></div><span id="challenge-label">YOUR ROAD STARTS HERE</span></section>
        </aside>
      </div>
      <footer class="footer"><span>BUILT FOR THE LOVE OF THE DRIVE.</span><span><i></i> NO DOWNLOADS. NO DISTRACTIONS.</span></footer>
    </main>
  </div>
  <dialog id="panel-dialog"><div class="dialog-heading"><span class="eyebrow">APEX / <span id="panel-label">GARAGE</span></span><button class="icon-button" id="close-dialog" aria-label="Close panel">${icon('close')}</button></div><div id="panel-content"></div></dialog>
  <div class="toast" role="status" id="toast"></div>
`;

const $ = selector => document.querySelector(selector);
const game = createGame({difficulty:settings.difficulty});
const renderer = createRenderer($('#race-canvas'));
const input = {left:false,right:false,boost:false,brake:false};
const keys = new Set();
const touches = new Set();
let lastStatus = '', lastFrame = 0, lastHud = 0, savedThisRace = false, lastHealth = 3, toastTimeout;
let audio, engineOsc, engineGain;

function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>$('#toast').classList.remove('visible'),2800); }
function setTrack(id) {
  if (game.status==='running'||game.status==='paused') { toast('Finish this sprint before changing routes.'); return; }
  settings.track=id; save(); updateTrack();
}
function updateTrack() {
  const track=TRACKS.find(t=>t.id===settings.track);
  $('#track-name').textContent=track.name; $('#track-location').textContent=track.location;
  $('#stage-coordinate').textContent= settings.track==='midnight'?'35°40′ N   139°46′ E':settings.track==='coast'?'40°38′ N   14°36′ E':'36°59′ N   110°06′ W';
  document.querySelectorAll('[data-track]').forEach(button=> {const selected=button.dataset.track===settings.track; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',selected); button.querySelector('.route-selection').innerHTML=icon(selected?'check':'arrow'); });
  lastStatus=''; renderOverlay();
}
function setColor(value) {
  settings.color=value; save(); $('#car-showcase').innerHTML=carArt();
  document.querySelectorAll('[data-color]').forEach(button=> {button.classList.toggle('selected',button.dataset.color===value); button.setAttribute('aria-pressed',button.dataset.color===value);});
  if ($('#dialog-car')) $('#dialog-car').innerHTML=carArt();
}
function ensureAudio() {
  if (!settings.sound) return;
  try {
    if (!audio) { audio=new (window.AudioContext||window.webkitAudioContext)(); engineOsc=audio.createOscillator(); engineGain=audio.createGain(); engineOsc.type='sawtooth'; const filter=audio.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=190; engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(audio.destination); engineGain.gain.value=0; engineOsc.start(); }
    audio.resume();
  } catch { settings.sound=false; toast('Sound is unavailable in this browser.'); }
}
function updateSound() { if(!audio)return; engineOsc.frequency.setTargetAtTime(35+game.speed*.35,audio.currentTime,.1); engineGain.gain.setTargetAtTime(settings.sound&&game.status==='running'?.018:0,audio.currentTime,.15); }
function clearInput() { keys.clear(); touches.clear(); for(const key of Object.keys(input))input[key]=false; document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('held')); }
function beginRace() { clearInput(); game.difficulty=settings.difficulty; startGame(game); savedThisRace=false; lastHealth=3; ensureAudio(); $('#race-announcement').textContent='Race started. Reach five kilometers and avoid traffic.'; renderOverlay(); }
function togglePause() { if(game.status==='running'){pauseGame(game);clearInput();}else if(game.status==='paused'){resumeGame(game);ensureAudio();} renderOverlay(); }
function saveResult() {
  if(savedThisRace)return; savedThisRace=true;
  settings.records.unshift({score:game.score,elapsed:game.elapsed,distance:game.distance,overtakes:game.overtakes,track:settings.track,result:game.result,date:new Date().toISOString(),difficulty:settings.difficulty});
  settings.records=settings.records.slice(0,20); save(); $('#best-score').textContent=bestScore().toLocaleString();
  $('#race-announcement').textContent=game.result==='completed'?'Finish line! Sprint completed.':'Race over. You used all three lives.';
}
function renderOverlay() {
  if(lastStatus===game.status)return; lastStatus=game.status;
  const overlay=$('#game-overlay'),playing=game.status==='running';
  overlay.hidden=playing; $('#game-hud').hidden=game.status==='ready'; $('#touch-controls').hidden=!playing; $('#stage-coordinate').hidden=game.status!=='ready';
  $('#pause-button').setAttribute('aria-label',game.status==='paused'?'Resume race':'Pause race'); $('#pause-button').innerHTML=icon(game.status==='paused'?'play':'pause');
  if(playing){overlay.innerHTML='';return;}
  overlay.className=`game-overlay ${game.status==='ready'?'intro-overlay':'center-overlay'}`;
  if(game.status==='ready') {
    const track=TRACKS.find(t=>t.id===settings.track);
    const words=track.name.split(' ');
    overlay.innerHTML=`<div class="intro-copy"><span class="scene-label"><i></i> THE STREETS ARE YOURS</span><h2>${words.slice(0,-1).join(' ')}<br><em>${words.at(-1)}.</em></h2><p>Leave the ordinary behind.<br>Find your rhythm on the open road.</p><button class="primary-button" id="start-race">Start engine ${icon('arrow')}</button><span class="enter-hint">or press <kbd>ENTER</kbd> to hit the road</span></div><div class="scene-tag">FREE RIDE <span>0${TRACKS.findIndex(t=>t.id===settings.track)+1} / 03</span></div>`;
    $('#start-race').addEventListener('click',beginRace);
  } else if(game.status==='paused') {
    overlay.innerHTML=`<div class="result-card"><span class="eyebrow">TAKE A BREATHER</span><h2>Enjoy the view.</h2><p>Your race is paused. The road can wait.</p><button class="primary-button" id="resume-race">Back to the road ${icon('play')}</button><button class="text-button" id="restart-race">${icon('reset')} Restart sprint</button></div>`;
    $('#resume-race').addEventListener('click',togglePause); $('#restart-race').addEventListener('click',beginRace);
  } else {
    saveResult();
    overlay.innerHTML=`<div class="result-card"><span class="eyebrow">${game.result==='completed'?'CHECKERED FLAG. WELL EARNED.':'EVERY GREAT DRIVER STARTS SOMEWHERE.'}</span><h2>${game.result==='completed'?'What a ride.':'One more run?'}</h2><p>${game.result==='completed'?'Five kilometers of pure freedom.':'The traffic got you. Your next best is out there.'}</p><div class="result-stats"><div><strong>${game.score.toLocaleString()}</strong><span>POINTS</span></div><div><strong>${timeLabel(game.elapsed)}</strong><span>TIME</span></div><div><strong>${game.overtakes}</strong><span>OVERTAKES</span></div></div><button class="primary-button" id="retry-race">Race again ${icon('reset')}</button><button class="text-button" id="back-menu">Pick another road ${icon('arrow')}</button></div>`;
    $('#retry-race').addEventListener('click',beginRace); $('#back-menu').addEventListener('click',()=>{Object.assign(game,createGame({difficulty:settings.difficulty}));lastStatus='';renderOverlay();});
  }
}
function updateHUD() {
  $('#speed').textContent=Math.round(game.speed).toString().padStart(3,'0'); $('#race-time').textContent=timeLabel(game.elapsed);
  $('#distance').textContent=(game.distance/1000).toFixed(2); $('#score').textContent=game.score.toString().padStart(5,'0');
  $('#nitro-fill').style.width=`${game.boost}%`; $('#nitro-fill').classList.toggle('boosting',game.boosting);
  const progress=Math.min(100,game.distance/5000*100); $('#distance-fill').style.width=`${progress}%`; $('#challenge-fill').style.width=`${progress}%`;
  $('#challenge-label').textContent=game.result==='completed'?'SPRINT COMPLETED ✓':game.distance>0?`${Math.round(progress)}% OF THE ROAD CONQUERED`:'YOUR ROAD STARTS HERE';
  $('#lives').innerHTML=[0,1,2].map(i=>icon('heart',i<game.health?'life-full':'life-empty')).join('');
  if(game.health<lastHealth){$('#race-announcement').textContent=`Collision. ${game.health} lives remaining.`;lastHealth=game.health;}
}

function panel(name) {
  if(name==='play'){closePanel();$('#game-stage').scrollIntoView({behavior:settings.reducedMotion?'instant':'smooth',block:'center'});return;}
  if(game.status==='running')togglePause();
  $('#panel-label').textContent=name.toUpperCase();
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  if(name==='garage') {
    $('#panel-content').innerHTML=`<h2>Make it yours.</h2><p class="dialog-description">Same sharp handling. A color that feels like you.</p><div class="dialog-car" id="dialog-car">${carArt()}</div><div class="garage-name"><strong>APEX GT</strong><span>STREET EDITION / CLASS S</span></div><div class="dialog-colors">${colors.map(c=>`<button data-color="${c.value}" class="garage-color ${settings.color===c.value?'selected':''}" aria-pressed="${settings.color===c.value}"><i style="background:${c.value}"></i>${c.name}</button>`).join('')}</div><p class="dialog-footnote">Your paint is saved automatically for your next drive.</p>`;
  } else if(name==='records') {
    const completed=settings.records.filter(r=>r.result==='completed'); const fastest=completed.length?Math.min(...completed.map(r=>r.elapsed)):null;
    $('#panel-content').innerHTML=`<h2>Your personal pit wall.</h2><p class="dialog-description">Every road has a story. These are yours.</p><div class="record-summary"><div><span>BEST SCORE</span><strong>${bestScore().toLocaleString()}</strong></div><div><span>FASTEST SPRINT</span><strong>${fastest?timeLabel(fastest):'—'}</strong></div><div><span>RUNS SAVED</span><strong>${settings.records.length}</strong></div></div><h3 class="dialog-subheading">Recent runs</h3>${settings.records.length?`<div class="records-list">${settings.records.slice(0,10).map(r=>`<div class="record-row"><div class="record-icon">${icon(r.result==='completed'?'flag':'race')}</div><div><strong>${TRACKS.find(t=>t.id===r.track)?.name||'Free ride'}</strong><span>${r.result==='completed'?'Finished':`${(r.distance/1000).toFixed(2)} km driven`} · ${timeLabel(r.elapsed)}</span></div><strong>${r.score.toLocaleString()} <small>pts</small></strong></div>`).join('')}</div>`:`<div class="empty-records">${icon('trophy')}<h3>A clean slate. An open road.</h3><p>Finish your first run to put a score on the board.</p><button class="primary-button" id="records-race">Let's race ${icon('arrow')}</button></div>`}<p class="dialog-footnote">Records are stored on this device. Your last 20 runs are retained.</p>`;
    $('#records-race')?.addEventListener('click',()=>{closePanel();beginRace();});
  } else {
    $('#panel-content').innerHTML=`<h2>Dial in your drive.</h2><p class="dialog-description">A few small tweaks. Your kind of race.</p><div class="setting-row"><div><h3>Traffic intensity</h3><p>Applies to your next sprint.</p></div><select id="difficulty" aria-label="Traffic intensity"><option value="easy">Sunday drive</option><option value="normal">Street racer</option><option value="expert">Rush hour</option></select></div><div class="setting-row"><div><h3>Engine sound</h3><p>A little atmosphere for the road.</p></div><button class="switch ${settings.sound?'on':''}" id="sound-setting" role="switch" aria-checked="${settings.sound}" aria-label="Engine sound"><i></i></button></div><div class="setting-row"><div><h3>Reduce motion effects</h3><p>Turn off camera shake and speed streaks.</p></div><button class="switch ${settings.reducedMotion?'on':''}" id="motion-setting" role="switch" aria-checked="${settings.reducedMotion}" aria-label="Reduce motion effects"><i></i></button></div><p class="dialog-footnote">Everything is saved automatically. No account needed.</p>`;
    $('#difficulty').value=settings.difficulty; $('#difficulty').addEventListener('change',e=>{settings.difficulty=e.target.value;save();});
    $('#sound-setting').addEventListener('click',()=>{settings.sound=!settings.sound;save();$('#sound-setting').classList.toggle('on',settings.sound);$('#sound-setting').setAttribute('aria-checked',settings.sound);ensureAudio();});
    $('#motion-setting').addEventListener('click',()=>{settings.reducedMotion=!settings.reducedMotion;save();$('#motion-setting').classList.toggle('on',settings.reducedMotion);$('#motion-setting').setAttribute('aria-checked',settings.reducedMotion);});
  }
  if(!$('#panel-dialog').open)$('#panel-dialog').showModal();
}
function closePanel() { $('#panel-dialog').close();document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav==='play')); }
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>panel(b.dataset.nav)));
document.addEventListener('click',e=>{const color=e.target.closest('[data-color]');if(color)setColor(color.dataset.color);const route=e.target.closest('[data-track]');if(route)setTrack(route.dataset.track);});
$('#close-dialog').addEventListener('click',closePanel);
$('#panel-dialog').addEventListener('close',()=>{document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav==='play'));clearInput();});
$('#panel-dialog').addEventListener('click',e=>{if(e.target===$('#panel-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();}});
$('#pause-button').addEventListener('click',togglePause);

const gameKeys=['arrowleft','arrowright','arrowdown','a','d','s','shift',' ','p','escape','enter'];
document.addEventListener('keydown',e=>{
  if($('#panel-dialog').open || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  const key=e.key.toLowerCase();if(!gameKeys.includes(key))return;
  if((e.target.tagName==='BUTTON'||e.target.tagName==='A')&&(key==='enter'||key===' '))return;
  if(['arrowleft','arrowright','arrowdown',' '].includes(key))e.preventDefault();
  if(e.repeat)return;
  if(key==='p'||key==='escape'){togglePause();return;}
  if(key==='enter'){if(game.status==='ready'||game.status==='finished')beginRace();else if(game.status==='paused')togglePause();return;}
  keys.add(key);
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.querySelectorAll('[data-control]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touches.add(button.dataset.control);button.classList.add('held');});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{touches.delete(button.dataset.control);button.classList.remove('held');});
});
window.addEventListener('blur',()=>{clearInput();if(game.status==='running')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(game.status==='running')togglePause();}});
function frame(timestamp) {
  const dt=lastFrame?Math.min((timestamp-lastFrame)/1000,.05):0;lastFrame=timestamp;
  input.left=keys.has('arrowleft')||keys.has('a')||touches.has('left');input.right=keys.has('arrowright')||keys.has('d')||touches.has('right');
  input.boost=keys.has('shift')||keys.has(' ')||touches.has('boost');input.brake=keys.has('arrowdown')||keys.has('s')||touches.has('brake');
  updateGame(game,dt,input);renderer.render(game,{track:settings.track,carColor:settings.color,reducedMotion:settings.reducedMotion,time:timestamp/1000});
  renderOverlay();updateSound();if(timestamp-lastHud>80){updateHUD();lastHud=timestamp;}
  requestAnimationFrame(frame);
}
updateTrack();updateHUD();requestAnimationFrame(frame);
