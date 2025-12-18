/* ===============================
   🔧 EXERCICE
   =============================== */
const EXERCISE = {
  title: "Backbeat",
  instruction: "Place la snare sur les temps 2 et 4",
  expectedPattern: {
    kick: [
      true,false,false,false,
      true,false,false,false,
      true,false,false,false,
      true,false,false,false
    ],
    snare: [
      false,false,false,false,
      true,false,false,false,
      false,false,false,false,
      true,false,false,false
    ],
    hihat: [
      true,true,true,true,
      true,true,true,true,
      true,true,true,true,
      true,true,true,true
    ]
  }
};

/* ===============================
   ⚙️ MOTEUR
   =============================== */
document.getElementById("instruction").innerHTML =
  `<strong>${EXERCISE.title}</strong> – ${EXERCISE.instruction}`;

const audioCtx = new AudioContext();
let isPlaying = false, currentStep = 0, timer;

const tempoSlider = document.getElementById("tempo");
const bpmLabel = document.getElementById("bpm");
const playBtn = document.getElementById("play");
const result = document.getElementById("result");

// Activation AudioContext au premier clic
document.body.addEventListener("click", () => {
  if(audioCtx.state === "suspended") audioCtx.resume();
}, { once: true });

/* ===============================
   🔊 SONS EXTERNES
   =============================== */
const instruments = {
  kick: { file: "sounds/kick.wav", buffer: null },
  snare: { file: "sounds/snare.wav", buffer: null },
  hihat: { file: "sounds/hihat.wav", buffer: null }
};

// Charger les sons
for (const inst in instruments) {
  fetch(instruments[inst].file)
    .then(r => r.arrayBuffer())
    .then(b => audioCtx.decodeAudioData(b))
    .then(buf => instruments[inst].buffer = buf)
    .catch(err => console.error(inst,"erreur",err));
}

/* ===============================
   🔲 GRILLE
   =============================== */
const rows = document.querySelectorAll(".row");
const grid = [];

rows.forEach((row,r) => {
  const inst = row.dataset.inst;
  const stepsDiv = row.querySelector(".steps");
  grid[r] = [];

  for(let i=0;i<16;i++){
    const step = document.createElement("div");
    step.className = `step ${inst}`;
    if(i%4===0) step.classList.add("group-start");

    step.onclick = () => {
      step.classList.toggle("active");
      playSound(inst);
    };

    stepsDiv.appendChild(step);
    grid[r].push(step);
  }
});

/* ===============================
   🎵 PLAY SOUND
   =============================== */
function playSound(inst){
  const buf = instruments[inst].buffer;
  if(!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start();
}

/* ===============================
   ⏱ SEQUENCEUR
   =============================== */
function tick(){
  grid.flat().forEach(s => s.classList.remove("playing"));
  grid.forEach((row,r)=>{
    const step = row[currentStep];
    step.classList.add("playing");
    if(step.classList.contains("active")) playSound(row.dataset.inst);
  });
  currentStep = (currentStep + 1) % 16;
}

playBtn.onclick = () => {
  if(isPlaying){
    clearInterval(timer);
    playBtn.textContent = "▶️ Play";
    isPlaying = false;
    return;
  }
  const bpm = +tempoSlider.value;
  const interval = (60/bpm)*1000/4;
  currentStep = 0;
  timer = setInterval(tick, interval);
  playBtn.textContent = "⏹ Stop";
  isPlaying = true;
};

tempoSlider.oninput = () => bpmLabel.textContent = tempoSlider.value;

/* ===============================
   ✅ VALIDATION
   =============================== */
document.getElementById("check").onclick = () => {
  const student = {};
  rows.forEach((row,r)=> student[row.dataset.inst] = grid[r].map(s => s.classList.contains("active")));
  let ok = true;
  for(let inst in EXERCISE.expectedPattern){
    for(let i=0;i<16;i++){
      if(student[inst][i] !== EXERCISE.expectedPattern[inst][i]){
        ok = false; break;
      }
    }
  }
  result.textContent = ok ? "✅ Bravo ! Pattern correct" : "❌ Ce n’est pas encore ça";
  result.style.color = ok ? "green" : "red";
};

/* ===============================
   🥁 PADS
   =============================== */
const pads = document.querySelectorAll(".pad");

pads.forEach(pad => {
  pad.addEventListener("pointerdown", ()=> triggerPad(pad,pad.dataset.inst));
});

document.addEventListener("keydown", e => {
  if(e.repeat) return;
  if(e.key==="s") triggerPad(document.querySelector(".pad.kick"), "kick");
  if(e.key==="d") triggerPad(document.querySelector(".pad.snare"), "snare");
  if(e.key==="f") triggerPad(document.querySelector(".pad.hihat"), "hihat");
});

function triggerPad(pad, inst){
  playSound(inst);
  pad.classList.add("active");
  setTimeout(()=> pad.classList.remove("active"), 120);
}

/* ===============================
   ⏱ MÉTRONOME
   =============================== */
let metronomeOn = false, metroTimer = null;
const metroBtn = document.getElementById("metronomeBtn");

function clickSound(){
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 1200;
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

metroBtn.onclick = () => {
  metronomeOn = !metronomeOn;
  metroBtn.classList.toggle("active", metronomeOn);
  metroBtn.textContent = metronomeOn ? "⏹ Clic" : "🟢 Clic";
  if(metronomeOn) startMetronome(); else stopMetronome();
};

function startMetronome(){
  stopMetronome();
  const bpm = +tempoSlider.value;
  const interval = (60/bpm)*1000;
  metroTimer = setInterval(clickSound, interval);
}

function stopMetronome(){
  clearInterval(metroTimer);
  metroTimer = null;
}

tempoSlider.addEventListener("input", ()=> { if(metronomeOn) startMetronome(); });
