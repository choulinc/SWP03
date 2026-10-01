// 英文聽讀練習 APP — 使用 SpeechSynthesis + SpeechRecognition

const WORDS = [
  { word: "apple", meaning: "蘋果" },
  { word: "banana", meaning: "香蕉" },
  { word: "computer", meaning: "電腦" },
  { word: "beautiful", meaning: "美麗的" },
  { word: "library", meaning: "圖書館" },
  { word: "how are you", meaning: "你好嗎" },
  { word: "thank you very much", meaning: "非常感謝你" },
  { word: "nice to meet you", meaning: "很高興認識你" },
  { word: "schedule", meaning: "時間表／行程" },
  { word: "environment", meaning: "環境" },
];

const state = {
  index: 0,
  total: 0,
  correct: 0,
  records: {}, // index -> 'correct' | 'wrong'
};

const els = {
  currentWord: document.getElementById("currentWord"),
  currentMeaning: document.getElementById("currentMeaning"),
  playBtn: document.getElementById("playBtn"),
  recordBtn: document.getElementById("recordBtn"),
  nextBtn: document.getElementById("nextBtn"),
  resultBox: document.getElementById("resultBox"),
  heardText: document.getElementById("heardText"),
  verdict: document.getElementById("verdict"),
  statusMsg: document.getElementById("statusMsg"),
  wordList: document.getElementById("wordList"),
  statTotal: document.getElementById("statTotal"),
  statCorrect: document.getElementById("statCorrect"),
  statAccuracy: document.getElementById("statAccuracy"),
  resetStatsBtn: document.getElementById("resetStatsBtn"),
};

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const synthSupported = "speechSynthesis" in window;
let recognition = null;
let isRecording = false;

function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?'"]/g, "")
    .replace(/\s+/g, " ");
}

function renderWordList() {
  els.wordList.innerHTML = "";
  WORDS.forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = item.word;
    if (i === state.index) li.classList.add("active");
    const mark = document.createElement("span");
    mark.className = "mark";
    if (state.records[i] === "correct") {
      mark.textContent = "✔";
      mark.classList.add("correct");
    } else if (state.records[i] === "wrong") {
      mark.textContent = "✘";
      mark.classList.add("wrong");
    }
    li.appendChild(mark);
    li.addEventListener("click", () => {
      state.index = i;
      loadCurrent();
    });
    els.wordList.appendChild(li);
  });
}

function loadCurrent() {
  const item = WORDS[state.index];
  els.currentWord.textContent = item.word;
  els.currentMeaning.textContent = item.meaning;
  els.resultBox.hidden = true;
  els.statusMsg.textContent = "";
  renderWordList();
}

function speak(text) {
  if (!synthSupported) {
    els.statusMsg.textContent = "此瀏覽器不支援語音合成（SpeechSynthesis）。";
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

function updateStats() {
  els.statTotal.textContent = state.total;
  els.statCorrect.textContent = state.correct;
  const acc = state.total === 0 ? 0 : Math.round((state.correct / state.total) * 100);
  els.statAccuracy.textContent = `${acc}%`;
}

function showResult(heard, isCorrect) {
  els.resultBox.hidden = false;
  els.heardText.textContent = heard || "（沒有聽清楚）";
  els.verdict.textContent = isCorrect ? "✅ 念對了！" : "❌ 再試一次";
  els.verdict.className = "verdict " + (isCorrect ? "correct" : "wrong");
}

function setRecording(on) {
  isRecording = on;
  els.recordBtn.classList.toggle("recording", on);
  els.recordBtn.textContent = on ? "🎙️ 聆聽中…（再按一次停止）" : "🎤 按下開始跟讀";
}

function initRecognition() {
  if (!SpeechRecognitionAPI) return null;
  const rec = new SpeechRecognitionAPI();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  rec.onstart = () => {
    setRecording(true);
    els.statusMsg.textContent = "請開始念出英文單字／片語…";
  };

  rec.onresult = (event) => {
    const results = event.results[0];
    const target = normalize(WORDS[state.index].word);
    let matched = false;
    let bestTranscript = results[0].transcript;

    for (let i = 0; i < results.length; i++) {
      const transcript = results[i].transcript;
      if (normalize(transcript) === target) {
        matched = true;
        bestTranscript = transcript;
        break;
      }
    }

    state.total += 1;
    if (matched) state.correct += 1;
    state.records[state.index] = matched ? "correct" : "wrong";

    showResult(bestTranscript, matched);
    updateStats();
    renderWordList();
  };

  rec.onerror = (event) => {
    els.statusMsg.textContent = `辨識發生錯誤：${event.error}`;
  };

  rec.onend = () => {
    setRecording(false);
  };

  return rec;
}

function toggleRecording() {
  if (!recognition) {
    els.statusMsg.textContent = "此瀏覽器不支援語音辨識（SpeechRecognition），建議改用桌機版 Chrome。";
    return;
  }
  if (isRecording) {
    recognition.stop();
    return;
  }
  els.resultBox.hidden = true;
  try {
    recognition.start();
  } catch (err) {
    els.statusMsg.textContent = "無法啟動麥克風，請確認已授權麥克風權限。";
  }
}

els.playBtn.addEventListener("click", () => speak(WORDS[state.index].word));
els.recordBtn.addEventListener("click", toggleRecording);
els.nextBtn.addEventListener("click", () => {
  state.index = (state.index + 1) % WORDS.length;
  loadCurrent();
});
els.resetStatsBtn.addEventListener("click", () => {
  state.total = 0;
  state.correct = 0;
  state.records = {};
  updateStats();
  renderWordList();
});

recognition = initRecognition();
if (!SpeechRecognitionAPI) {
  els.statusMsg.textContent = "此瀏覽器不支援語音辨識，建議改用桌機版 Chrome 以使用跟讀功能。";
}

loadCurrent();
updateStats();
