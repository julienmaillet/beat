const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// --- Instruments et fichiers ---
const instruments = {
  hihat: "sounds/hihat.wav",
  snare: "sounds/snare.wav",
  kick: "sounds/kick.wav"
};

const buffers = {};
let grid = [];
let stepIndex = 0;
let timer = null;
let metronomeOn = true;

// --- Sons du métronome ---
const metronomeSounds = {
  strong: "sounds/click_strong.wav", // pas 1
  soft: "sounds/click_soft.wav"      // pas 5, 9, 13
};
const metronomeBuffers = {};

// --- Charger tous les sons ---
async function loadSound(name, url){
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
}

async function loadMetronomeSounds(){
  for(let key in metronomeSounds){
    const res = await fetch(metronomeSounds[key]);
    const arrayBuffer = await res.arrayBuffer();
    metronomeBuffers[key] = await audioCtx.decodeAudioData(arrayBuffer);
  }
}

Promise.all(
  Object.entries(instruments).map(([k,v]) => loadSound(k,v))
).then(()=>console.log("Sons instruments chargés"));

loadMetronomeSounds().then(()=>console.log("Métronome chargé"));

// --- Création de la grille ---
const gridEl = document.getElementById("grid");
["hihat", "snare", "kick"].forEach(inst=>{
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

    if(i % 4 === 0) step.classList.add("groupStart"); // <-- premier pas du groupe

    step.dataset.inst = inst;

    step.onclick = () => {
      step.classList.toggle("active");
      play(inst);
      checkPattern();
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

// --- Jouer un son instrument ---
function play(inst){
  const buf = buffers[inst];
  if(!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start();
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

  // Métronome : click_strong sur pas 0, click_soft sur 4, 8, 12
  if(metronomeOn){
    let buf = null;
    if(stepIndex === 0){
      buf = metronomeBuffers.strong;
    } else if ([4,8,12].includes(stepIndex)){
      buf = metronomeBuffers.soft;
    }
    if(buf){
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      src.start();
    }
  }

  stepIndex = (stepIndex + 1) % 16;
}

// --- Bouton Métronome On / Off ---
const metronomeBtn = document.getElementById("metronomeBtn");

metronomeBtn.onclick = () => {
  metronomeOn = !metronomeOn;
  metronomeBtn.textContent = metronomeOn
    ? "Métronome On"
    : "Métronome Off";
};

// --- Démarrage / arrêt séquenceur ---
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

// --- Feedback visuel temporaire sur les pads ---
document.querySelectorAll(".pad").forEach(pad => {
  pad.addEventListener("mousedown", () => {
    pad.classList.add("pressed");
  });

  pad.addEventListener("mouseup", () => {
    pad.classList.remove("pressed");
  });

  pad.addEventListener("mouseleave", () => {
    pad.classList.remove("pressed");
  });

  // pour le tactile (tablettes / smartphones)
  pad.addEventListener("touchstart", () => {
    pad.classList.add("pressed");
  });

  pad.addEventListener("touchend", () => {
    pad.classList.remove("pressed");
  });
});

// --- Validation automatique du pattern ---
const correctPattern = {
  kick:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
  // hihat non évalué → ignoré
};

function checkPattern() {
  let ok = true;

  grid.forEach(row => {
    const inst = row[0].dataset.inst;

    // IGNORER les instruments non évalués
    if (!correctPattern[inst]) return;
    
    row.forEach((step, i) => {
      const shouldBeActive = !!correctPattern[inst][i];
      if(step.classList.contains("active") !== shouldBeActive){
        ok = false;
      }
      step.classList.remove("correct");
    });
  });

  if(ok){
    grid.forEach(row => {
      const inst = row[0].dataset.inst;
      if(!correctPattern[inst]) return;
      row.forEach((step, i) => {
        if(correctPattern[inst][i]) step.classList.add("correct");
      });
    });
  }
}
