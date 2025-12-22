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

// Chargements (pas besoin d’attendre pour afficher l’UI)
Promise.all(Object.entries(instruments).map(([k,v]) => loadSound(k,v)));
loadMetronomeSounds();

/* ===============================
   PATTERNS
================================ */
const patterns = [
  {id:"fourfloor", name:"Four on the floor", inst:"kick", steps:[0,4,8,12], cssClass:"pattern-fourfloor", color:"#1F3A5F"},
  {id:"backbeat", name:"BackBeat", inst:"snare", steps:[4,12], cssClass:"pattern-backbeat", color:"#5A3D7A"},
  {id:"onedrop", name:"OneDrop", inst:["kick","snare"], steps:[8], cssClass:"pattern-onedrop", color:"#9E2A2B"},
  {id:"tresillo", name:"Trésillo", inst:null, steps:[0,6,12], cssClass:"pattern-tresillo", color:"#1E7F7A"},
  {id:"tresillo2", name:"Trésillo x2", inst:null, steps:[0,3,6,8,11,14], cssClass:"pattern-tresillo2", color:"#1E7F7A"},
  {id:"son", name:"Son", inst:null, steps:[0,3,6,9,12], cssClass:"pattern-son", color:"#4A6FA5"},
  {id:"shiko", name:"Shiko", inst:null, steps:[0,4,6,10,12], cssClass:"pattern-shiko", color:"#7C9CBF"},
  {id:"soukous", name:"Soukous", inst:null, steps:[0,3,6,10,11], cssClass:"pattern-soukous", color:"#6F8F72"},
  {id:"rumba", name:"Rumba", inst:null, steps:[0,3,7,10,12], cssClass:"pattern-rumba", color:"#4F9A8B"},
  {id:"bossanova", name:"BossaNova", inst:null, steps:[0,3,6,10,13], cssClass:"pattern-bossanova", color:"#5E6E7E"},
  {id:"gahu", name:"Gahu", inst:null, steps:[0,3,6,10,14], cssClass:"pattern-gahu", color:"#7A8F8A"},
  {id:"samba", name:"Samba", inst:null, steps:[0,3,5,7,10,12,14], cssClass:"pattern-samba", color:"#8FB3C9"}
];

/* ===============================
   GRILLE
================================ */
const gridEl = document.getElementById("grid");

["hihat","snare","kick"].forEach(inst => {
  const row = [];
  const rowEl = document.createElement("div");
  rowEl.className = "row";

  const label = document.createElement("div");
  label.className = "rowLabel";
  label.textContent = inst;
  rowEl.appendChild(label);

  for(let i=0;i<16;i++){
    const step = document.createElement("div");
    step.className="step";
    if(i%4===0) step.classList.add("groupStart");
    step.dataset.inst = inst;
    step.dataset.patterns = "";

    step.onclick = () => {
      if(audioCtx.state==="suspended") audioCtx.resume();
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

for(let i=0;i<16;i++){
  const div = document.createElement("div");
  if(i%4===0) div.textContent = (i/4)+1;
  timeRowEl.appendChild(div);
}
gridEl.appendChild(timeRowEl);

/* ===============================
   AFFICHAGE DES PATTERNS
================================ */
const patternContainer = document.createElement("div");
patternContainer.id = "patternContainer"; // ✅ important pour ton CSS (#patternContainer ...)
patternContainer.style.marginTop="10px";
patternContainer.style.fontWeight="bold";
gridEl.after(patternContainer);

function updatePatternDisplay(validPatterns){
  patternContainer.innerHTML="";
  const uniques=[...new Map(validPatterns.map(p=>[p.id,p])).values()];
  uniques.forEach(p=>{
    const div=document.createElement("div");
    div.textContent=p.name;
    div.style.color=p.color;
    div.classList.add(p.cssClass);
    patternContainer.appendChild(div);
  });
}

/* ===============================
   CHECK PATTERNS (exact match)
================================ */
function checkPatterns() {
  const validPatterns = [];

  grid.forEach(row => {
    row.forEach(step => {
      patterns.forEach(p => step.classList.remove(p.cssClass));
    });
  });

  patterns.forEach(pattern => {
    let rowsToCheck;

    if (pattern.inst === null) {
      rowsToCheck = grid;
    } else if (Array.isArray(pattern.inst)) {
      rowsToCheck = grid.filter(r => pattern.inst.includes(r[0].dataset.inst));
    } else {
      rowsToCheck = grid.filter(r => r[0].dataset.inst === pattern.inst);
    }

    let validRows = [];

    rowsToCheck.forEach(row => {
      const activeIdx = row.map((s, idx) => s.classList.contains("active") ? idx : -1).filter(i => i !== -1);
      if (activeIdx.length === pattern.steps.length && pattern.steps.every(idx => activeIdx.includes(idx))) {
        validRows.push(row);
      }
    });

    if (validRows.length > 0) {
      validPatterns.push(pattern);
      validRows.forEach(row => {
        pattern.steps.forEach(idx => row[idx].classList.add(pattern.cssClass));
      });
    }
  });

  updatePatternDisplay(validPatterns);
}

/* ===============================
   PLAY SOUND
================================ */
function play(inst){
  const buf=buffers[inst];
  if(!buf) return;
  const src=audioCtx.createBufferSource();
  src.buffer=buf;
  src.connect(audioCtx.destination);
  src.start();
}

function playMetronome(kind){
  const buf = metronomeBuffers[kind];
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

  // métronome : 4 temps (0,4,8,12)
  if(metronomeOn && (stepIndex % 4 === 0)){
    playMetronome(stepIndex === 0 ? "strong" : "soft");
  }

  grid.forEach(row => {
    const step=row[stepIndex];
    step.classList.add("playing");
    if(step.classList.contains("active")){
      play(step.dataset.inst);
    }
  });

  stepIndex=(stepIndex+1)%16;
}

/* ===============================
   CONTROLES
================================ */
document.getElementById("play").onclick = () => {
  if(timer){
    clearInterval(timer);
    timer=null;
    return;
  }
  if(audioCtx.state==="suspended") audioCtx.resume();

  const bpm=+document.getElementById("tempo").value;
  const interval=(60/bpm/4)*1000; // 16 pas = 4 double-croches par temps
  stepIndex = 0;
  timer=setInterval(tick, interval);
};

document.getElementById("tempo").addEventListener("change", () => {
  if(!timer) return;
  clearInterval(timer);
  timer = null;
  const bpm=+document.getElementById("tempo").value;
  const interval=(60/bpm/4)*1000;
  timer=setInterval(tick, interval);
});

const metBtn = document.getElementById("metronomeBtn");
metBtn.onclick = () => {
  metronomeOn = !metronomeOn;
  metBtn.textContent = metronomeOn ? "Métronome On" : "Métronome Off";
};

/* ===============================
   PADS + CLAVIER  (jaune + pulse)
================================ */
function pulse(el){
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
  el.addEventListener("animationend", () => el.classList.remove("pulse"), { once:true });
}

function triggerPad(pad){
  if(!pad) return;
  if(audioCtx.state==="suspended") audioCtx.resume();

  play(pad.dataset.inst);
  pad.classList.add("pressed");
  pulse(pad);
  setTimeout(()=>pad.classList.remove("pressed"),120);
}

// souris + tactile
document.querySelectorAll(".pad").forEach(pad=>{
  pad.addEventListener("mousedown", e=>{
    e.preventDefault();
    triggerPad(pad);
  });
  pad.addEventListener("touchstart", e=>{
    e.preventDefault();
    triggerPad(pad);
  });
});

// clavier
document.addEventListener("keydown", e=>{
  let pad=null;
  if(e.key==="s") pad=document.querySelector('.pad[data-inst="kick"]');
  if(e.key==="d") pad=document.querySelector('.pad[data-inst="snare"]');
  if(e.key==="f") pad=document.querySelector('.pad[data-inst="hihat"]');
  if(pad) triggerPad(pad);
});
