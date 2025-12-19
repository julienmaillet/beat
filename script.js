/* ===============================
   AUDIO
================================ */

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const instruments = {
  hihat: "sounds/hihat.wav",
  snare: "sounds/snare.wav",
  kick: "sounds/kick.wav"
};

const buffers = {};

let grid = [];
let stepIndex = 0;
let timer = null;
let metronomeOn = false;

/* ===============================
   METRONOME
================================ */

const metronomeSounds = {
  strong: "sounds/click_strong.wav",
  soft: "sounds/click_soft.wav"
};
const metronomeBuffers = {};

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
);

loadMetronomeSounds();

/* ===============================
   PATTERNS (FACILE À ÉTENDRE)
================================ */

const patterns = [
  {
    id: "fourfloor",
    name: "Four on the floor",
    inst: "kick",
    steps: [0,4,8,12],
    cssClass: "pattern-fourfloor",
    color: "#4caf50" // ajout
  },
  {
    id: "tresillo",
    name: "Trésillo",
    inst: null,
    steps: [0,3,6,10],
    cssClass: "pattern-tresillo",
    color: "#2196f3" // ajout
  }
];

/* ===============================
   GRILLE
================================ */

const gridEl = document.getElementById("grid");

/* ordre logique : aigu → grave */
["hihat", "snare", "kick"].forEach(inst => {

  const row = [];
  const rowEl = document.createElement("div");
  rowEl.className = "row";

  const label = document.createElement("div");
  label.className = "rowLabel";
  label.textContent = inst;
  rowEl.appendChild(label);

  for(let i = 0; i < 16; i++){
    const step = document.createElement("div");
    step.className = "step";
    if(i % 4 === 0) step.classList.add("groupStart");

    step.dataset.inst = inst;
    step.dataset.patterns = "";

    step.onclick = () => {
      step.classList.toggle("active");
      play(inst);
      checkPatterns();
    };

    rowEl.appendChild(step);
    row.push(step);
  }

  gridEl.appendChild(rowEl);
  grid.push(row);
});

/* ===============================
   LIGNE DES TEMPS
================================ */

const timeRowEl = document.createElement("div");
timeRowEl.className = "timeRow";
timeRowEl.appendChild(document.createElement("div"));

for(let i = 0; i < 16; i++){
  const div = document.createElement("div");
  if(i % 4 === 0) div.textContent = (i / 4) + 1;
  timeRowEl.appendChild(div);
}

gridEl.appendChild(timeRowEl);

/* ===============================
   AFFICHAGE DES PATTERNS
================================ */

const patternContainer = document.createElement("div");
patternContainer.style.marginTop = "10px";
patternContainer.style.fontWeight = "bold";
gridEl.after(patternContainer);

function updatePatternDisplay(validPatterns){
  patternContainer.innerHTML = "";

  const uniques = [...new Map(
    validPatterns.map(p => [p.id, p])
  ).values()];

  uniques.forEach(p => {
    const div = document.createElement("div");
    div.textContent = p.name;
   div.style.color = p.color; //ajout !!
    div.classList.add(p.cssClass);
    patternContainer.appendChild(div);
  });
}

/* ===============================
   CHECK PATTERNS
================================ */

function checkPatterns(){
  const validPatterns = [];

  grid.forEach(row => {
    row.forEach(step => {
      patterns.forEach(p => step.classList.remove(p.cssClass));
      step.dataset.patterns = "";
    });
  });

  patterns.forEach(pattern => {

    const rows = pattern.inst
      ? grid.filter(r => r[0].dataset.inst === pattern.inst)
      : grid;

    rows.forEach(row => {

      const valid = pattern.steps.every(
        idx => row[idx].classList.contains("active")
      );

      if(valid){
        validPatterns.push(pattern);

        pattern.steps.forEach(idx => {
          const step = row[idx];
          step.classList.add(pattern.cssClass);
        });
      }
    });
  });

  updatePatternDisplay(validPatterns);
}

/* ===============================
   PLAY SOUND
================================ */

function play(inst){
  const buf = buffers[inst];
  if(!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start();
}

/* ===============================
   SEQUENCEUR
================================ */

function tick(){
  grid.flat().forEach(s => s.classList.remove("playing"));

  grid.forEach(row => {
    const step = row[stepIndex];
    step.classList.add("playing");

    if(step.classList.contains("active")){
      play(step.dataset.inst);
    }
  });

  if(metronomeOn){
    let buf = null;
    if(stepIndex === 0) buf = metronomeBuffers.strong;
    else if([4,8,12].includes(stepIndex)) buf = metronomeBuffers.soft;

    if(buf){
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      src.start();
    }
  }

  stepIndex = (stepIndex + 1) % 16;
}

/* ===============================
   CONTROLES
================================ */

document.getElementById("play").onclick = () => {

  if(timer){
    clearInterval(timer);
    timer = null;
    return;
  }

  if(audioCtx.state === "suspended") audioCtx.resume();

  const bpm = +document.getElementById("tempo").value;
  const interval = (60 / bpm / 4) * 1000;
  timer = setInterval(tick, interval);
};

document.getElementById("metronomeBtn").onclick = () => {
  metronomeOn = !metronomeOn;
  metronomeBtn.textContent = metronomeOn ? "Métronome On" : "Métronome Off";
};

/* ===============================
   PADS + CLAVIER
================================ */

document.querySelectorAll(".pad").forEach(p => {
  p.onclick = () => play(p.dataset.inst);
});

document.addEventListener("keydown", e => {                                 // ajout ...>
  let pad;

  if(e.key === "s") pad = document.querySelector('.pad[data-inst="kick"]');
  if(e.key === "d") pad = document.querySelector('.pad[data-inst="snare"]');
  if(e.key === "f") pad = document.querySelector('.pad[data-inst="hihat"]');

  if(pad){
    pad.classList.add("pressed");
    setTimeout(() => pad.classList.remove("pressed"), 100);
  }
});                                                                          // <... ajout à la place de :

// document.addEventListener("keydown", e => {

//  if(e.code === "Space"){
 //   e.preventDefault();
 //   document.getElementById("play").click();
//  }

//  if(e.key === "s") play("kick");
//  if(e.key === "d") play("snare");
//  if(e.key === "f") play("hihat");
// });
