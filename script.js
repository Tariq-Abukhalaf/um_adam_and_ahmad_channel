const COUNTRIES = [
  { id:'JO', name:'الأردن',      flag:'🇯🇴' },
  { id:'IQ', name:'العراق',      flag:'🇮🇶' },
  { id:'EG', name:'مصر',         flag:'🇪🇬' },
  { id:'SY', name:'سوريا',       flag:'🇸🇾' },
  { id:'SA', name:'السعودية',    flag:'🇸🇦' },
  { id:'PS', name:'فلسطين',      flag:'🇵🇸' },
  { id:'LY', name:'ليبيا',       flag:'🇱🇾' },
  { id:'MA', name:'المغرب',      flag:'🇲🇦' },
  { id:'DZ', name:'الجزائر',     flag:'🇩🇿' },
  { id:'AE', name:'الإمارات',    flag:'🇦🇪' },
  { id:'BH', name:'البحرين',     flag:'🇧🇭' },
  { id:'KW', name:'الكويت',      flag:'🇰🇼' },
  { id:'OM', name:'عُمان',        flag:'🇴🇲' },
  { id:'LB', name:'لبنان',       flag:'🇱🇧' },
  { id:'QA', name:'قطر',         flag:'🇶🇦' },
  { id:'TN', name:'تونس',        flag:'🇹🇳' },
  { id:'YE', name:'اليمن',       flag:'🇾🇪' },
  { id:'SD', name:'السودان',     flag:'🇸🇩' },
];

const STORAGE_KEY = 'voting_battle_data';

const DEFAULT_STATE = {
  active: false,
  votes: Object.fromEntries(COUNTRIES.map(c => [c.id, 0])),
  totalVotes: 0,
  clickLock: false,
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      COUNTRIES.forEach(country => {
        if (!(country.id in parsed.votes)) {
          parsed.votes[country.id] = 0;
        }
      });
      parsed.clickLock = false;
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load saved state:', error);
  }
  return { ...DEFAULT_STATE };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    showPersistentIndicator();
  } catch (error) {
    console.warn('Failed to save state:', error);
  }
}

function showPersistentIndicator() {
  const indicator = document.getElementById('persistentIndicator');
  indicator.classList.add('show');
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 2000);
}

const STATE = loadState();

const grid = document.getElementById('grid');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const totalVotesDisplay = document.getElementById('totalVotesDisplay');

const resetModal = document.getElementById('resetModal');
const resetModalClose = document.getElementById('resetModalClose');
const resetModalCancel = document.getElementById('resetModalCancel');
const resetModalConfirm = document.getElementById('resetModalConfirm');

const luckyModal = document.getElementById('luckyModal');
const luckyModalClose = document.getElementById('luckyModalClose');
const luckyMessage = document.getElementById('luckyMessage');
const luckyMultiplier = document.getElementById('luckyMultiplier');
const luckyIcon = document.getElementById('luckyIcon');

let liveBarChart = null;

let _audioCtx;
function playClickSound(){
  try{
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = _audioCtx.createOscillator();
    const g = _audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.value = 880;
    const now = _audioCtx.currentTime;
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g).connect(_audioCtx.destination);
    o.start(now);
    o.stop(now + 0.2);
  }catch(e){}
}

function playLuckySound(multiplier){
  try{
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = _audioCtx.createOscillator();
    const g = _audioCtx.createGain();
    if (multiplier === 10) {
      o.type = 'sawtooth';
      o.frequency.value = 1320; // Higher pitch for x10
    } else {
      o.type = 'square';
      o.frequency.value = 1100; // Medium pitch for x5
    }
    
    const now = _audioCtx.currentTime;
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.1, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.connect(g).connect(_audioCtx.destination);
    o.start(now);
    o.stop(now + 0.45);
  }catch(e){}
}

function checkLuckyWin() {
  const random = Math.random() * 600; 
  
  // 2% chance for x10 
  if (random < 2) {
    return 10;
  }
  // 8% chance for x5 
  else if (random < 10) {
    return 5;
  }
  // 90% chance for normal x1
  return 1;
}

function showLuckyModal(multiplier) {
  if (multiplier === 5) {
    luckyMessage.textContent = 'لقد فزت بدرع الهوبا هوبا عاش';
    luckyIcon.textContent = '🏆';
  } else if (multiplier === 10) {
    luckyMessage.textContent = 'لقد فزت بدرع تورته';
    luckyIcon.textContent = '👑';
  }
  
  luckyMultiplier.textContent = `حصلت على x${multiplier} أصوات!`;
  
  luckyModal.classList.add('show');
  luckyModal.style.display = 'flex';
  playLuckySound(multiplier);
  
}

function closeLuckyModal() {
  luckyModal.classList.remove('show');
  luckyModal.style.display = 'none';
}

function disableVotingUI(disabled=true){ 
  document.querySelectorAll('.card').forEach(b => (b.tabIndex = disabled? -1:0)); 
  document.querySelectorAll('.card button.flagBtn').forEach(b => (b.disabled = disabled)); 
}

function computePercentages(){
  const total = Math.max(STATE.totalVotes, 1);
  const map = {};
  for(const c of COUNTRIES){ map[c.id] = Math.round((STATE.votes[c.id] / total) * 1000) / 10; }
  return map;
}

function updateTotalVotesDisplay() {
  totalVotesDisplay.textContent = STATE.totalVotes;
}

function spawnEffect(card, multiplier = 1){
  const { fx } = card._refs;
  const rect = card.getBoundingClientRect();
  
  const effectCount = multiplier === 1 ? 1 : multiplier > 5 ? 3 : 2;
  
  for (let i = 0; i < effectCount; i++) {
    const x = (Math.random()*0.6 + 0.2) * rect.width;
    const y = (Math.random()*0.4 + 0.2) * rect.height;

    const plus = document.createElement('div');
    plus.className='plus'; 
    plus.style.left = `${x}px`; 
    plus.style.top = `${y}px`;
    
    if (multiplier > 1) {
      plus.textContent = `+${multiplier}⚡💎`;
      plus.style.fontSize = '20px';
      plus.style.color = multiplier === 10 ? '#ffd700' : '#ff6b35';
      plus.style.textShadow = `0 0 12px ${multiplier === 10 ? '#ffd700' : '#ff6b35'}`;
    } else {
      plus.textContent = '+1⚡';
    }
    
    plus.style.animation = `flyUp ${600 + i * 100}ms ease-out forwards`;
    plus.style.animationDelay = `${i * 50}ms`;

    const burst = document.createElement('div');
    burst.className='burst'; 
    burst.style.left = `${x-6}px`; 
    burst.style.top = `${y-6}px`;
    burst.textContent = multiplier > 1 ? '🎉' : '💥';
    burst.style.animation = `explode ${420 + i * 50}ms ease-out forwards`;
    burst.style.animationDelay = `${i * 30}ms`;

    fx.appendChild(plus); 
    fx.appendChild(burst);

    setTimeout(()=> plus.remove(), 650 + i * 100);
    setTimeout(()=> burst.remove(), 460 + i * 50);
  }

  if (multiplier > 1) {
    card.animate([
      { transform: 'translateY(0) rotate(0) scale(1)', boxShadow: '0 24px 48px rgba(0,0,0,.45)' },
      { transform: 'translateY(-8px) rotate(2deg) scale(1.05)', boxShadow: '0 32px 64px rgba(255,215,0,.6)' },
      { transform: 'translateY(-4px) rotate(-1deg) scale(1.02)', boxShadow: '0 28px 56px rgba(255,215,0,.4)' },
      { transform: 'translateY(0) rotate(0) scale(1)', boxShadow: '0 24px 48px rgba(0,0,0,.45)' }
    ], { duration: 800, easing: 'ease-out' });
  } else {
    card.animate([
      { transform: 'translateY(0) rotate(0)' },
      { transform: 'translateY(-2px) rotate(0.6deg)' },
      { transform: 'translateY(0) rotate(0)' }
    ], { duration: 160, easing: 'ease-out' });
  }
}

function makeCard(country){
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = country.id;
  card.setAttribute('tabindex','0');

  const fx = document.createElement('div'); 
  fx.className='fx'; 
  card.appendChild(fx);

  const flagBtn = document.createElement('button');
  flagBtn.className = 'flagBtn flag';
  flagBtn.type='button';
  flagBtn.setAttribute('aria-label',`صوّت لـ ${country.name}`);
  flagBtn.textContent = country.flag;
  card.appendChild(flagBtn);

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = country.name;
  card.appendChild(title);

  const counts = document.createElement('div');
  counts.className='counts';
  counts.innerHTML = `<span class="votes">0 تصويت</span><span class="pct">0%</span>`;
  card.appendChild(counts);

  const bar = document.createElement('div'); bar.className='bar';
  const fill = document.createElement('div'); fill.className='fill';
  bar.appendChild(fill); card.appendChild(bar);

  const onVote = () => handleVote(country.id, card);
  card.addEventListener('click', onVote);
  card.addEventListener('keydown', (e)=>{ if(e.code==='Enter' || e.code==='Space'){ e.preventDefault(); onVote(); } });

  card._refs = { fx, counts, fill };

  return card;
}

function buildGrid(){ grid.innerHTML = ''; COUNTRIES.forEach(c => grid.appendChild(makeCard(c))); }

function handleVote(id, card){
  if(!STATE.active) return;
  if(STATE.clickLock) return;
  STATE.clickLock = true; setTimeout(()=> STATE.clickLock=false, 90);

  const multiplier = checkLuckyWin();
  
  STATE.votes[id] += multiplier;
  STATE.totalVotes += multiplier;

  saveState();

  updateCard(card);
  updateLiveChart();
  updateTotalVotesDisplay();
  
  if (multiplier > 1) {
    showLuckyModal(multiplier);
  } else {
    playClickSound();
  }
  
  spawnEffect(card, multiplier);
}

function updateCard(card){
  const id = card.dataset.id;
  const v = STATE.votes[id];
  const pct = computePercentages()[id];
  const { counts, fill } = card._refs;
  counts.querySelector('.votes').textContent = `${v} تصويت`;
  counts.querySelector('.pct').textContent = `${pct}%`;
  fill.style.width = `${pct}%`;
}

function getChartColors() {
  const countryData = COUNTRIES.map(c => ({
    id: c.id,
    votes: STATE.votes[c.id]
  })).sort((a, b) => b.votes - a.votes);

  const colors = {};
  countryData.forEach((country, index) => {
    if (index === 0 && country.votes > 0) {
      colors[country.id] = '#ffd700'; // Gold for 1st place
    } else if (index === 1 && country.votes > 0) {
      colors[country.id] = '#c0c0c0'; // Silver for 2nd place
    } else if (index === 2 && country.votes > 0) {
      colors[country.id] = '#cd7f32'; // Bronze for 3rd place
    } else {
      colors[country.id] = '#48dbfb'; 
    }
  });

  return COUNTRIES.map(c => colors[c.id]);
}

function initLiveBar(){
  const ctx = document.getElementById('liveBar').getContext('2d');
  const labels = COUNTRIES.map(c=> c.name);
  const data = COUNTRIES.map(c=> STATE.votes[c.id]);
  const backgroundColors = getChartColors();

  liveBarChart = new Chart(ctx, {
    type:'bar',
    data:{ 
      labels, 
      datasets:[{ 
        label:'التصويت المباشر', 
        data, 
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color + 'dd'),
        borderWidth:2 
      }] 
    },
    options:{ 
      responsive:true, 
      maintainAspectRatio: false,
      animation:{ duration: 250 }, 
      layout: {
        padding: {
          top: 10,
          right: 20,
          bottom: 10,
          left: 10
        }
      },
      plugins:{ 
        legend:{ 
          display: false
        }, 
        tooltip:{ 
          callbacks:{ 
            label: ctx => {
              const votes = ctx.parsed.y;
              const total = Math.max(STATE.totalVotes, 1);
              const percentage = Math.round((votes / total) * 1000) / 10;
              return ` ${votes} صوت (${percentage}%)`;
            }
          }
        } 
      }, 
      scales:{ 
        x:{ 
          ticks:{ 
            color:'#e9efff',
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: 11
            }
          },
          grid: {
            display: false
          }
        }, 
        y:{ 
          beginAtZero:true, 
          ticks:{ 
            color:'#e9efff',
            font: {
              size: 11
            },
            stepSize: 1
          },
          grid: {
            color: 'rgba(233, 239, 255, 0.1)'
          }
        } 
      } 
    }
  });
}

function updateLiveChart(){ 
  if(!liveBarChart) return; 
  liveBarChart.data.datasets[0].data = COUNTRIES.map(c=> STATE.votes[c.id]); 
  const newColors = getChartColors();
  liveBarChart.data.datasets[0].backgroundColor = newColors;
  liveBarChart.data.datasets[0].borderColor = newColors.map(color => color + 'dd');
  liveBarChart.update(); 
}

function openResetModal(){
  resetModal.classList.add('show');
  resetModal.style.display = 'flex';
}

function closeResetModal(){
  resetModal.classList.remove('show');
  resetModal.style.display = 'none';
}

function startBattle(){
  if(STATE.active) return;
  STATE.active = true;
  startBtn.disabled = true;
  resetBtn.disabled = false;
  disableVotingUI(false);
  
  saveState();
}

function resetAll(){
  STATE.active = false;
  STATE.totalVotes = 0;
  for(const k in STATE.votes) STATE.votes[k]=0;
  
  saveState();
  
  updateLiveChart();
  updateTotalVotesDisplay();
  document.querySelectorAll('.card').forEach(updateCard);
  startBtn.disabled = false;
  resetBtn.disabled = true;
  disableVotingUI(true);
}

function restoreUIState() {
  if (STATE.active) {
    startBtn.disabled = true;
    resetBtn.disabled = false;
    disableVotingUI(false);
  } else {
    startBtn.disabled = false;
    resetBtn.disabled = true;
    disableVotingUI(true);
  }
}

function init(){
  buildGrid();
  document.querySelectorAll('.card').forEach(card => updateCard(card));
  updateTotalVotesDisplay();
  initLiveBar();
  
  restoreUIState();

  startBtn.addEventListener('click', startBattle);
  
  resetBtn.addEventListener('click', openResetModal);
  
  resetModalClose.addEventListener('click', closeResetModal);
  resetModalCancel.addEventListener('click', closeResetModal);
  resetModalConfirm.addEventListener('click', () => {
    closeResetModal();
    resetAll();
  });
  
  resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) {
      closeResetModal();
    }
  });
  
  luckyModalClose.addEventListener('click', closeLuckyModal);
  luckyModal.addEventListener('click', (e) => {
    if (e.target === luckyModal) {
      closeLuckyModal();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (resetModal.classList.contains('show')) {
        closeResetModal();
      }
      if (luckyModal.classList.contains('show')) {
        closeLuckyModal();
      }
    }
  });

  setInterval(saveState, 120000); // Auto-save every 2 minutes
  
  if (STATE.totalVotes > 0) {
    setTimeout(() => {
      const indicator = document.getElementById('persistentIndicator');
      indicator.textContent = '🔄 تم استعادة البيانات!';
      indicator.classList.add('show');
      setTimeout(() => {
        indicator.classList.remove('show');
        indicator.textContent = '💾 تم حفظ التصويت!';
      }, 3000);
    }, 1000);
  }
}

init();