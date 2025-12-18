const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const instruments = {
  kick: { file:"sounds/kick.wav", buffer:null },
  snare: { file:"sounds/snare.wav", buffer:null },
  hihat: { file:"sounds/hihat.wav", buffer:null }
};

const gridContainer = document.getElementById("gridContainer");
let grid = [];
let currentStep = 0;
let interval = null;
let metronomeOn = true;

// --- Préchargement des sons ---
for(const key in instruments){
  fetch(instruments[key].file)
    .then(r=>r.arrayBuffer())
    .then(b=>audioCtx.decodeAudioData(b))
    .then(buf=>{ instruments[key].buffer = buf; console.log(key,"chargé") })
    .catch(err=>console.error(key,"erreur",err));
}

// --- Création de la grille 16 pas x 3 lignes ---
['kick','snare','hihat'].forEach(inst=>{
  const row = [];
  const divRow = document.createElement('div');
  divRow.className='row';
  for(let i=0;i<16;i++){
    const step = document.createElement('div');
    step.className='step';
    step.dataset.inst = inst;
    step.addEventListener('click',()=>step.classList.toggle('active'));
    divRow.appendChild(step);
    row.push(step);
  }
  gridContainer.appendChild(divRow);
  grid.push(row);
});

// --- Play sound ---
function playSound(inst){
  const buf = instruments[inst].buffer;
  if(!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start();
}

// --- Métronome ---
function clickSound(strong=false){
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = strong ? 1500 : 1000;
  gain.gain.value = strong ? 0.3 : 0.15;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

// --- Tick séquenceur sécurisé ---
function tick(){
  try {
    grid.flat().forEach(s => s.classList.remove('playing'));

    grid.forEach(row => {
      const step = row[currentStep];
      if(step){
        step.classList.add('playing');
        const inst = step.dataset.inst; // <- récupère de step
        if(step.classList.contains('active') && inst && instruments[inst].buffer){
          playSound(inst);
        }
      }
    });

    if(metronomeOn){
      clickSound(currentStep % 4 === 0);
    }

    currentStep = (currentStep + 1) % 16;

  } catch(e){
    console.error("Erreur tick:", e);
  }
}

// --- Start/Stop avec reprise du AudioContext si nécessaire ---
document.getElementById('startStop').addEventListener('click',()=>{
  if(interval){
    clearInterval(interval); interval=null;
  } else {
    if(audioCtx.state==='suspended'){
      audioCtx.resume().then(()=> startSequencer());
    } else {
      startSequencer();
    }
  }
});

function startSequencer(){
  const bpm = parseInt(document.getElementById('tempo').value);
  const ms = (60/bpm/4)*1000; // double croche
  interval = setInterval(tick, ms);
}

// --- Pads clavier et clic ---
document.querySelectorAll('.pad').forEach(p=>{
  p.addEventListener('click',()=>playSound(p.dataset.inst));
});
document.addEventListener('keydown',e=>{
  if(e.key==='s') playSound('kick');
  if(e.key==='d') playSound('snare');
  if(e.key==='f') playSound('hihat');
});
