const STORAGE_KEY = "swp08-tm-model-url";
const CONFIDENCE_TRIGGER = 0.7;
const EMOJIS = ["✨", "🔥", "💧", "🌪️", "🌈", "⚡", "🍀", "❄️"];

let model, webcam, maxPredictions;
let rafId = null;
let lastTriggeredClass = null;
let audioCtx = null;

const $ = (sel) => document.querySelector(sel);

const setupPanel = $("#setup-panel");
const setupToggle = $("#setup-toggle");
const modelUrlInput = $("#model-url");
const loadBtn = $("#load-btn");
const setupStatus = $("#setup-status");
const gameArea = $("#game-area");
const webcamContainer = $("#webcam-container");
const effectLayer = $("#effect-layer");
const topClassEl = $("#top-class");
const topConfidenceEl = $("#top-confidence");
const barsEl = $("#bars");
const messageBox = $("#message-box");
const stage = $("#stage");

const savedUrl = localStorage.getItem(STORAGE_KEY);
if (savedUrl) modelUrlInput.value = savedUrl;

setupToggle.addEventListener("click", () => {
  setupPanel.hidden = !setupPanel.hidden;
});

loadBtn.addEventListener("click", () => {
  const url = modelUrlInput.value.trim();
  if (!url) {
    setupStatus.textContent = "請先貼上模型網址。";
    return;
  }
  localStorage.setItem(STORAGE_KEY, url);
  init(url);
});

if (savedUrl) {
  init(savedUrl);
}

async function init(baseUrl) {
  try {
    loadBtn.disabled = true;
    setupStatus.style.color = "#b9b9d0";
    setupStatus.textContent = "正在載入模型與攝影機...";

    const normalizedUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    const modelURL = normalizedUrl + "model.json";
    const metadataURL = normalizedUrl + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    webcam = new tmImage.Webcam(360, 270, true);
    await webcam.setup();
    await webcam.play();

    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);

    buildBars();

    setupPanel.hidden = true;
    gameArea.hidden = false;
    setupStatus.textContent = "";

    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    setupStatus.style.color = "#fca5a5";
    setupStatus.textContent =
      "載入失敗，請確認模型網址正確，且已允許攝影機權限。(" + err.message + ")";
  } finally {
    loadBtn.disabled = false;
  }
}

function buildBars() {
  barsEl.innerHTML = "";
  for (let i = 0; i < maxPredictions; i++) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-name" id="bar-name-${i}">類別 ${i + 1}</span>
      <span class="bar-track"><span class="bar-fill" id="bar-fill-${i}"></span></span>
      <span class="bar-pct" id="bar-pct-${i}">0%</span>
    `;
    barsEl.appendChild(row);
  }
}

async function loop() {
  webcam.update();
  await predict();
  rafId = requestAnimationFrame(loop);
}

async function predict() {
  const predictions = await model.predict(webcam.canvas);
  predictions.sort((a, b) => b.probability - a.probability);
  const top = predictions[0];

  topClassEl.textContent = top.className;
  topConfidenceEl.textContent = `信心分數：${Math.round(top.probability * 100)}%`;

  renderBars(predictions);

  if (top.probability >= CONFIDENCE_TRIGGER) {
    triggerEffect(top.className, top.probability);
  }
}

function renderBars(predictions) {
  predictions.forEach((p, i) => {
    const nameEl = document.getElementById(`bar-name-${i}`);
    const fillEl = document.getElementById(`bar-fill-${i}`);
    const pctEl = document.getElementById(`bar-pct-${i}`);
    if (!nameEl) return;
    const pct = Math.round(p.probability * 100);
    nameEl.textContent = p.className;
    fillEl.style.width = pct + "%";
    pctEl.textContent = pct + "%";
  });
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function triggerEffect(className, probability) {
  if (className === lastTriggeredClass) return;
  lastTriggeredClass = className;

  const hash = hashString(className);
  const themeIndex = hash % 6;
  const emoji = EMOJIS[hash % EMOJIS.length];

  stage.className = "stage theme-" + themeIndex;

  effectLayer.textContent = emoji;
  effectLayer.classList.remove("show");
  void effectLayer.offsetWidth;
  effectLayer.classList.add("show");

  messageBox.textContent = `偵測到「${className}」！信心分數 ${Math.round(
    probability * 100
  )}%，畫面切換中 ${emoji}`;

  playTone(hash);

  setTimeout(() => {
    if (lastTriggeredClass === className) lastTriggeredClass = null;
  }, 1500);
}

function playTone(hash) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const freq = 220 + (hash % 10) * 60;
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    // audio not available, ignore
  }
}
