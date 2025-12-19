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
  strong: "sounds/click_strong.wav",
  soft: "sounds/click_soft.wav"
};
const metronomeBuffers = {};

// --- Charger les sons instruments ---
async function loadSound(name, url){
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
}

async function loadMetronomeSounds(){
  for(let key in metronomeSounds){
    const res = await fetch(metronomeSounds[key]);
    const arrayBuffer = await res.arrayBuffer();
    metronomeBuffers[key] = await
      audioCtx.decodeAudioData(arrayBuffer);
  }
}

Promise.all(
  Object.entries(instruments).map(([k,v])=> loadSound(k,v))
).then(()=>console.log("Sons instruments chargés"));

loadMetronomeSounds().then(()=>console.log("Métronome chargé"));

// --- Création de la grille ---
const gridEl = document.getElementById("grid");
["hihat","snare","kick"].forEach(inst=>{
  const row = [];
  const rowEl = document.createElement("div");
  rowEl.className = "row";

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

// --- Jouer un son ---
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

    if(step.classList.contains("active")){
      play(step.dataset.inst);
    }
  });

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

// --- Play / Stop ---
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




// --- Métronome On / Off ---
const metronomeBtn = document.getElementById("metronomeBtn");

metronomeBtn.onclick = ()=>{
  metronomeOn = !metronomeOn;
  metronomeBtn.textContent = metronomeOn
    ? "Métronome On"
    : "Métronome Off";
};




// --- Pads ---
document.querySelectorAll(".pad").forEach(p=>{
  p.onclick = ()=>play(p.dataset.inst);
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




// --- Clavier ---
document.addEventListener("keydown", e=>{
  if(e.key === "s") play("kick");
  if(e.key === "d") play("snare");
  if(e.key === "f") play("hihat");

  if(e.code === "Space"){
    e.preventDefault();
    document.getElementById("play").click();
  }
});

/* ======================================================
   🎯 DÉFINITION DU PATTERN À VALIDER (SEULE PARTIE À CHANGER)
   ====================================================== */

const patternToValidate = {
  kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]
};

/* ======================================================
   ✅ VALIDATION GÉNÉRIQUE (NE PLUS TOUCHER)
   ====================================================== */

function checkPattern(){
  let ok = true;

  grid.forEach(row => {
    const inst = row[0].dataset.inst;

    // ignorer les instruments non évalués
    if(!patternToValidate[inst]) return;

    row.forEach((step, i) => {
      const shouldBeActive = !!patternToValidate[inst][i];
      if(step.classList.contains("active") !== shouldBeActive){
        ok = false;
      }
      step.classList.remove("correct");
    });
  });


  const controlsDiv = document.getElementById("controls"); 
let msg = document.getElementById("successMsg");
  if(!msg){
    msg = document.createElement("div");
    msg.id = "successMsg";
    msg.textContent = "Bravo !";
    controlsDiv.appendChild(msg);
  }

  
 if(ok){
    grid.forEach(row => {
      const inst = row[0].dataset.inst;
      row.forEach((step, i) => {
        if(correctPattern[inst][i]) step.classList.add("correct");
      });
    });
    msg.style.display = "block";
  } else {
    msg.style.display = "none";
  }
}
}
