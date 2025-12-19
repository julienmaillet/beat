// --- AudioContext ---
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
let metronomeOn = false; // Métronome OFF par défaut

// --- Sons du métronome ---
const metronomeSounds = {
  strong: "sounds/click_strong.wav", // pas 0
  soft: "sounds/click_soft.wav"      // pas 4, 8, 12
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

// --- Définir les patterns ---
const patterns = [
  {
    name: "Four on the floor",
    inst: "kick",
    steps: [0, 4, 8, 12],
    color: "lightgreen"
  },
  {
    name: "Trésillo",
    inst: null, // n'importe quel instrument
    steps: [0, 3, 6, 10],
    color: "lightblue"
  }
];

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
    if(i % 4 === 0) step.classList.add("groupStart"); // premier pas du groupe
    step.dataset.inst = inst;

    step.onclick = () => {
      step.classList.toggle("active");
      // Remettre couleur si désactivé
      if(!step.classList.contains("active")){
        step.style.background = step.classList.contains("groupStart") ? "#bdbdbd" : "#ddd";
      } else {
        step.style.background = "#ffcc00"; // actif
      }
      play(step.dataset.inst);
      checkPatterns();
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

// --- Conteneur pour afficher les patterns validés ---
const patternContainer = document.createElement("div");
patternContainer.id = "patternContainer";
patternContainer.style.marginTop = "15px";
gridEl.parentNode.insertBefore(patternContainer, gridEl.nextSibling);

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

  // Métronome
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

// --- Validation des patterns ---
function checkPatterns(){
  const validPatterns = [];
  
  // D'abord, retirer toutes les validations précédentes
  grid.forEach(row => {
    row.forEach(step => {
      step.classList.remove("patternValidated");
      step.style.outlineColor = "";
    });
  });

  patterns.forEach(pattern => {
    let linesToCheck = [];

    if(pattern.inst){
      const row = grid.find(r => r[0].dataset.inst === pattern.inst);
      if(row) linesToCheck.push(row);
    } else {
      linesToCheck = grid;
    }

    let patternFound = false;

    for(const row of linesToCheck){
      const allStepsActive = pattern.steps.every(idx => row[idx].classList.contains("active"));
      if(allStepsActive){
        patternFound = true;
        // Marquer les cases avec outline pour ne pas bloquer la couleur de fond
        pattern.steps.forEach(idx => {
          row[idx].classList.add("patternValidated");
          row[idx].style.outline = `2px solid ${pattern.color}`;
          row[idx].style.outlineOffset = "-2px";
        });
        break;
      }
    }

    if(patternFound){
      validPatterns.push(pattern);
    }
  });

  // Afficher les patterns validés sur des lignes séparées
  patternContainer.innerHTML = "";
  validPatterns.forEach(p => {
    const div = document.createElement("div");
    div.textContent = p.name;
    div.style.color = p.color;
    div.style.fontWeight = "bold";
    patternContainer.appendChild(div);
  });
}

// --- Bouton Métronome ---
const metBtn = document.getElementById("metronomeBtn");
metBtn.textContent = "Métronome Off";
metBtn.onclick = () => {
  metronomeOn = !metronomeOn;
  metBtn.textContent = metronomeOn ? "Métronome On" : "Métronome Off";
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
  const key = e.key.toLowerCase();
  if(key === "s") play("kick");
  if(key === "d") play("snare");
  if(key === "f") play("hihat");

  if(e.code === "Space"){
    e.preventDefault();
    document.getElementById("play").click();
  }
});

// --- Feedback visuel temporaire sur les pads ---
document.querySelectorAll(".pad").forEach(pad => {
  const remove = () => pad.classList.remove("pressed");
  pad.addEventListener("mousedown", () => pad.classList.add("pressed"));
  pad.addEventListener("mouseup", remove);
  pad.addEventListener("mouseleave", remove);
  pad.addEventListener("touchstart", () => pad.classList.add("pressed"));
  pad.addEventListener("touchend", remove);
});
