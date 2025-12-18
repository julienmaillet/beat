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

// --- Sons du métronome ---
const metronomeSounds = {
  strong: "sounds/click_strong.wav", // premier temps
  soft: "sounds/click_soft.wav"      // autres temps
};

const metronomeBuffers = {};

// --- Charger les sons instruments ---
async function loadSound(name, url){
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
}

// --- Charger les sons du métronome ---
async function loadMetronomeSounds(){
  for(const [k, url] of Object.entries(metronomeSounds)){
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    metronomeBuffers[k] = await audioCtx.decodeAudioData(arrayBuffer);
  }
}

// --- Lancer le chargement de tous les sons ---
Promise.all(
  Object.entries(instruments).map(([k,v]) => loadSound(k,v))
).then(()=>console.log("Sons instruments chargés"));

loadMetronomeSounds().then(()=>console.log("Sons métronome chargés"));

// --- Création de la grille ---
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

// --- Jouer un son instrument ---
function play(inst){
  const buf = buffers[inst];
  if(!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start();
}

// --- Métronome (avec sons WAV) ---
function clickSound(strong=false){
  const buf = strong ? metronomeBuffers.strong : metronomeBuffers.soft;
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

  if(metronomeOn){
    clickSound(stepIndex % 4 === 0); // premier temps = fort
  }

  stepIndex = (stepIndex + 1) % 16;
}

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

// --- Bouton Métronome ---
const metronomeBtn = document.getElementById("metronomeBtn");
if(metronomeBtn){
  metronomeBtn.onclick = ()=>{
    metronomeOn = !metronomeOn;
    metronomeBtn.textContent = metronomeOn ? "Métronome On" : "Métronome Off";
  };
}

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
      const shouldBeActive = !!correctPattern[inst][i];
      if(step.classList.contains("active") !== shouldBeActive){
        ok = false;
      }
      step.classList.remove("correct"); // retirer coloration ancienne
    });
  });

  if(ok){
    // Mettre vert uniquement les steps actives du pattern correct
    grid.forEach(row => {
      const inst = row[0].dataset.inst;
      row.forEach((step, i) => {
        if(correctPattern[inst][i]) step.classList.add("correct");
      });
    });

    // Message de succès
    if(!document.getElementById("successMsg")){
      const msg = document.createElement("div");
      msg.id = "successMsg";
      msg.textContent = "Bravo !";
      msg.style.textAlign = "center";
      msg.style.fontSize = "20px";
      msg.style.color = "green";
      msg.style.marginTop = "10px";
      msg.style.marginBottom = "10px";
      gridEl.parentNode.insertBefore(msg, gridEl.nextSibling);
    }
  } else {
    const oldMsg = document.getElementById("successMsg");
    if(oldMsg) oldMsg.remove();
  }
}
