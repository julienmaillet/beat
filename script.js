const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// --- Instruments et fichiers ---
const instruments = {
  kick: "sounds/kick.wav",
  snare: "sounds/snare.wav",
  hihat: "sounds/hihat.wav"
};

const buffers = {};
let grid = [];
let stepIndex = 0;
let timer = null;
let metronomeOn = true;

// --- Charger les sons
async function loadSound(name, url){
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
}

Promise.all(
  Object.entries(instruments).map(([k,v]) => loadSound(k,v))
).then(()=>console.log("Sons chargés"));

// --- Création de la grille ---
const gridEl = document.getElementById("grid");
["kick","snare","hihat"].forEach(inst=>{
  const row = [];
  const rowEl = document.createElement("div");
  rowEl.className = "row";

  for(let i=0;i<16;i++){
    const step = document.createElement("div");
    step.className = "step";
    step.dataset.inst = inst;

    step.onclick = () => {
      step.classList.toggle("active");
      play(inst); // feedback immédiat
    };

    rowEl.appendChild(step);
    row.push(step);
  }

  gridEl.appendChild(rowEl);
  grid.push(row);
});

// --- Jouer un son (sécurisé) ---
function play(inst){
  const buf = buffers[inst];
  if(!buf) return; // ← sécurité
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
  grid.flat().forEach(s => s.classList.remove("playing"));

  grid.forEach(row => {
    const step = row[stepIndex];
    if(!step) return;

    step.classList.add("playing");

    const inst = step.dataset.inst;
    if(step.classList.contains("active") && inst && buffers[inst]){
      play(inst);
    }
  });

  if(metronomeOn){
    clickSound(stepIndex % 4 === 0);
  }

  stepIndex = (stepIndex + 1) % 16;
}

// --- Démarrage / arrêt ---
document.getElementById("play").onclick = ()=>{
  if(timer){
    clearInterval(timer);
    timer = null;
    return;
  }

  if(audioCtx.state === "suspended") audioCtx.resume();

  const bpm = +document.getElementById("tempo").value;
  const interval = (60/bpm/4)*1000;
  timer = setInterval(tick, interval);
};

// --- Pads clic + clavier ---
document.querySelectorAll(".pad").forEach(p=>{
  p.onclick = ()=>play(p.dataset.inst);
});

document.addEventListener("keydown", e=>{
  if(e.key === "s") play("kick");
  if(e.key === "d") play("snare");
  if(e.key === "f") play("hihat");
});
