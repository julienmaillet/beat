// ---------- AUDIO ----------
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const instruments = {
  kick: "sounds/kick.wav",
  snare: "sounds/snare.wav",
  hihat: "sounds/hihat.wav"
};

const buffers = {};
let grid = [];
let stepIndex = 0;
let timer = null;
let metronomeOn = false;

// ---------- PATTERNS (À MODIFIER ICI) ----------
const patterns = [
  {
    id: "fourfloor",
    name: "Four on the floor",
    inst: "kick",
    steps: [0, 4, 8, 12],
    cssClass: "pattern-fourfloor"
  },
  {
    id: "tresillo",
    name: "Trésillo",
    inst: null,
    steps: [0, 3, 6, 10],
    cssClass: "pattern-tresillo"
  }
];

// ---------- CHARGEMENT SONS ----------
async function loadSound(name, url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  buffers[name] = await audioCtx.decodeAudioData(buf);
}

Promise.all(
  Object.entries(instruments).map(([k, v]) => loadSound(k, v))
);

// ---------- GRILLE ----------
const gridEl = document.getElementById("grid");

Object.keys(instruments).forEach(inst => {
  const row = [];
  const rowEl = document.createElement("div");
  rowEl.className = "row";

  const label = document.createElement("div");
  label.className = "rowLabel";
  label.textContent = inst;
  rowEl.appendChild(label);

  for (let i = 0; i < 16; i++) {
    const step = document.createElement("div");
    step.className = "step";
    if (i % 4 === 0) step.classList.add("groupStart");
    step.dataset.inst = inst;

    step.onclick = () => {
      step.classList.toggle("active");
      play(inst);
      checkPatterns();
    };

    row.push(step);
    rowEl.appendChild(step);
  }

  grid.push(row);
  gridEl.appendChild(rowEl);
});

// ---------- LIGNE DES TEMPS ----------
const timeRow = document.createElement("div");
timeRow.className = "timeRow";
timeRow.appendChild(document.createElement("div"));

for (let i = 0; i < 16; i++) {
  const d = document.createElement("div");
  if (i % 4 === 0) d.textContent = i / 4 + 1;
  timeRow.appendChild(d);
}

gridEl.appendChild(timeRow);

// ---------- PATTERN DISPLAY ----------
const patternContainer = document.createElement("div");
patternContainer.id = "patternContainer";
gridEl.after(patternContainer);

// ---------- PLAY ----------
function play(inst) {
  if (!buffers[inst]) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffers[inst];
  src.connect(audioCtx.destination);
  src.start();
}

// ---------- SEQUENCEUR ----------
function tick() {
  grid.flat().forEach(s => s.classList.remove("playing"));

  grid.forEach(row => {
    const step = row[stepIndex];
    step.classList.add("playing");
    if (step.classList.contains("active")) {
      play(step.dataset.inst);
    }
  });

  stepIndex = (stepIndex + 1) % 16;
}

// ---------- PATTERN CHECK ----------
function checkPatterns() {
  // nettoyage
  grid.flat().forEach(step => {
    patterns.forEach(p => step.classList.remove(p.cssClass));
  });

  const found = [];

  patterns.forEach(pattern => {
    const rows = pattern.inst
      ? [grid.find(r => r[0].dataset.inst === pattern.inst)]
      : grid;

    rows.forEach(row => {
      if (
        row &&
        pattern.steps.every(i => row[i].classList.contains("active"))
      ) {
        found.push(pattern);
        pattern.steps.forEach(i => row[i].classList.add(pattern.cssClass));
      }
    });
  });

  updatePatternDisplay(found);
}

// ---------- AFFICHAGE ----------
function updatePatternDisplay(patternsFound) {
  patternContainer.innerHTML = "";

  [...new Map(patternsFound.map(p => [p.id, p])).values()]
    .forEach(p => {
      const d = document.createElement("div");
      d.textContent = p.name;
      d.className = p.cssClass;
      d.style.fontWeight = "bold";
      patternContainer.appendChild(d);
    });
}

// ---------- CONTROLES ----------
document.getElementById("play").onclick = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    return;
  }
  audioCtx.resume();
  const bpm = +tempo.value;
  timer = setInterval(tick, (60 / bpm / 4) * 1000);
};

document.getElementById("metronomeBtn").onclick = () => {
  metronomeOn = !metronomeOn;
};

// ---------- PADS ----------
document.querySelectorAll(".pad").forEach(p => {
  p.onclick = () => play(p.dataset.inst);
});

document.addEventListener("keydown", e => {
  if (e.key === "s") play("kick");
  if (e.key === "d") play("snare");
  if (e.key === "f") play("hihat");
});
