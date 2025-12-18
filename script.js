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

// --- Métronome On/Off ---
let metronomeOn = true;
document.addEventListener("DOMContentLoaded", ()=>{
  const metBtn = document.getElementById("metronomeBtn");
  if(metBtn){
    metBtn.onclick = ()=>{
      metronomeOn = !metronomeOn;
      metBtn.textContent = metronomeOn ? "Métronome On" : "Métronome Off";
    };
  }
});

// --- Charger les sons ---
async function loadSound(name, url){
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
}

Promise.all(
  Object.entries(instruments).map(([k,v]) => loadSound(k,v))
).then(()=>console.log("Sons chargés"));

// --- Création de la grille (ordre hihat, snare, kick + labels + premier pas foncé) ---
const gridEl = document.getElementById("grid");
["hihat","snare","kick"].forEach(inst=>{
  const row = [];
  const rowEl = document.createElement("div");
  rowEl.className = "row";

  // Label à gauche
  const label = document.createElement("div");
  label.className = "rowLabel";
  label.textContent = inst;
  rowEl.appendChild(label);

  for(let i=0;i<16;i++){
    const step = document.createElement("div");
    step.className = "step";

    if(i % 4 === 0) step.classList.add("groupStart");

    step.dataset.inst = inst;

    step.onclick = () => {
      step.classList.toggle("active");
      play(inst);      // feedback immédiat
      checkPattern();  // validation automatique
    };

    rowEl.appendChild(step);
    row.push(step);
  }

  gridEl.appendChild(rowEl);
  grid.push(row);
});

// --- Ligne des chiffres sous la grille ---
const timeRowEl = document.createElement("div");
timeRowEl.className = "timeRow";
const emptyLabel = document.createElement("div");
timeRowEl.appendChild(emptyLabel);

for(let i=0;i<16;i++){
  const div = document.createElement("div");
  if(i % 4 === 0){
    div.textContent = (i/4 + 1);
  }
  timeRowEl.appendChild(div);
}

gridEl.appendChild(timeRowEl);

// --- Jouer un son ---
function play(inst){
  const buf = buffers[inst];
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
  osc.frequency.value = strong ? 5000 : 1000; // premier temps plus aigu
  gain.gain.value = strong ? 0.3 : 0.15;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + (strong ? 0.15 : 0.05));
}

// --- Tick séquenceur ---
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

  if(metronomeOn && stepIndex % 4 === 0){
    clickSound(true);
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

  if(e.code === "Space"){
    e.preventDefault();
    document.getElementById("play").click();
  }
});

// --- Validation automatique du pattern ---
const correctPattern = {
  kick:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  hihat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
};

function checkPattern() {
  let ok = true;

  grid.forEach(row => {
    const inst = row[0].dataset.inst;
    row.forEach((step, i) => {
      if(step.classList.contains("active") !== !!correctPattern[inst][i]){
        ok = false;
      }
    });
  });

  if(ok){
    if(!document.getElementById("successMsg")){
      const msg = document.createElement("div");
      msg.id = "successMsg";
      msg.textContent = "Bravo ! Pattern correct 🎉";
      msg.style.textAlign = "center";
      msg.style.fontSize = "20px";
      msg.style.color = "green";
      msg.style.marginTop = "10px";
      gridEl.parentNode.insertBefore(msg, gridEl.nextSibling);
    }
  } else {
    const oldMsg = document.getElementById("successMsg");
    if(oldMsg) oldMsg.remove();
  }
}
