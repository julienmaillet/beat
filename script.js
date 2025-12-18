const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const sounds = {
  kick: "sounds/kick.wav",
  snare: "sounds/snare.wav",
  hihat: "sounds/hihat.wav"
};

const buffers = {};
let grid = [];
let stepIndex = 0;
let timer = null;

const gridEl = document.getElementById("grid");

// ---- Chargement des sons
async function loadSound(name, url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(buf);
}

Promise.all(
  Object.entries(sounds).map(([k,v]) => loadSound(k,v))
).then(() => console.log("Sons chargés"));

// ---- Création grille
["kick","snare","hihat"].forEach(inst => {
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

// ---- Jouer un son
function play(inst){
  if(!buffers[inst]) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffers[inst];
  src.connect(audioCtx.destination);
  src.start();
}

// ---- Séquenceur
function tick(){
  grid.flat().forEach(s => s.classList.remove("playing"));

  grid.forEach(row => {
    const step = row[stepIndex];
    step.classList.add("playing");

    if(step.classList.contains("active")){
      play(step.dataset.inst);
    }
  });

  stepIndex = (stepIndex + 1) % 16;
}

// ---- Play
document.getElementById("play").onclick = () => {
  if(timer){
    clearInterval(timer);
    timer = null;
    return;
  }

  audioCtx.resume();

  const bpm = +document.getElementById("tempo").value;
  const interval = (60 / bpm / 4) * 1000;
  timer = setInterval(tick, interval);
};
