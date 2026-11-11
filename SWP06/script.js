const DATA_URL =
  "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json";
const REFRESH_SECONDS = 60;
const FETCH_TIMEOUT_MS = 12000;

const state = {
  stations: [],
  loadedOnce: false,
  search: "",
  district: "",
  sort: "bikes-desc",
  hideOffline: false,
};

const el = {
  statusLine: document.getElementById("status-line"),
  statusText: document.getElementById("status-text"),
  errorBanner: document.getElementById("error-banner"),
  errorDetail: document.getElementById("error-detail"),
  retryBtn: document.getElementById("retry-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  countdown: document.getElementById("refresh-countdown"),
  statStations: document.getElementById("stat-stations"),
  statActive: document.getElementById("stat-active"),
  statBikes: document.getElementById("stat-bikes"),
  statDocks: document.getElementById("stat-docks"),
  searchInput: document.getElementById("search-input"),
  districtSelect: document.getElementById("district-select"),
  sortSelect: document.getElementById("sort-select"),
  hideOffline: document.getElementById("hide-offline"),
  resultCount: document.getElementById("result-count"),
  skeletonGrid: document.getElementById("skeleton-grid"),
  stationGrid: document.getElementById("station-grid"),
  emptyMessage: document.getElementById("empty-message"),
  themeToggle: document.getElementById("theme-toggle"),
};

let countdownTimer = null;
let refreshTimer = null;

function setStatus(mode, text) {
  el.statusLine.classList.remove("status-loading", "status-ok", "status-error");
  el.statusLine.classList.add(`status-${mode}`);
  el.statusText.textContent = text;
}

function showError(detail) {
  el.errorDetail.textContent = detail;
  el.errorBanner.hidden = false;
}

function hideError() {
  el.errorBanner.hidden = true;
}

function renderSkeleton(count = 8) {
  el.skeletonGrid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML = `
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line mid"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    `;
    el.skeletonGrid.appendChild(card);
  }
}

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal, cache: "no-store" }).finally(() =>
    clearTimeout(timer)
  );
}

async function loadData({ isManual = false } = {}) {
  hideError();
  if (!state.loadedOnce) {
    setStatus("loading", "正在連線臺北市資料開放平台…");
    el.skeletonGrid.hidden = false;
    el.stationGrid.hidden = true;
    renderSkeleton();
  } else {
    setStatus("loading", isManual ? "正在重新整理…" : "正在自動更新…");
  }

  try {
    const res = await fetchWithTimeout(DATA_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("回傳資料為空");
    }

    state.stations = data;
    state.loadedOnce = true;
    populateDistricts(data);
    renderAll();

    const now = new Date();
    setStatus(
      "ok",
      `已連線，最後整理時間 ${now.toLocaleTimeString("zh-TW", { hour12: false })}`
    );
    el.skeletonGrid.hidden = true;
    el.stationGrid.hidden = false;
  } catch (err) {
    console.error("YouBike fetch failed", err);
    const reason =
      err.name === "AbortError"
        ? "連線逾時，資料來源伺服器可能忙碌中。"
        : `連線失敗（${err.message}），資料來源可能暫時掛掉或網路不穩。`;

    if (state.loadedOnce) {
      setStatus("error", "自動更新失敗，目前顯示的是上一次成功取得的資料。");
      showError(reason);
    } else {
      setStatus("error", "資料載入失敗。");
      showError(reason);
      el.skeletonGrid.hidden = true;
      el.emptyMessage.hidden = false;
      el.emptyMessage.textContent = "目前無法取得任何站點資料，請稍後按重試。";
    }
  } finally {
    startCountdown();
  }
}

function populateDistricts(data) {
  if (el.districtSelect.dataset.filled === "1") return;
  const districts = Array.from(new Set(data.map((d) => d.sarea))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant")
  );
  for (const d of districts) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    el.districtSelect.appendChild(opt);
  }
  el.districtSelect.dataset.filled = "1";
}

function cleanName(name) {
  return name.replace(/^YouBike2\.0_/, "").replace(/^YouBike_/, "");
}

function gaugeClass(value, capacity) {
  if (capacity <= 0) return "empty";
  const ratio = value / capacity;
  if (value === 0) return "empty";
  if (ratio <= 0.2) return "low";
  return null;
}

function renderSummary(stations) {
  const active = stations.filter((s) => s.act === "1" || s.act === 1);
  const totalBikes = active.reduce((sum, s) => sum + Number(s.available_rent_bikes || 0), 0);
  const totalDocks = active.reduce((sum, s) => sum + Number(s.available_return_bikes || 0), 0);

  el.statStations.textContent = stations.length.toLocaleString("zh-TW");
  el.statActive.textContent = active.length.toLocaleString("zh-TW");
  el.statBikes.textContent = totalBikes.toLocaleString("zh-TW");
  el.statDocks.textContent = totalDocks.toLocaleString("zh-TW");
}

function getFiltered() {
  const q = state.search.trim().toLowerCase();
  let list = state.stations.filter((s) => {
    if (state.district && s.sarea !== state.district) return false;
    if (state.hideOffline && !(s.act === "1" || s.act === 1)) return false;
    if (!q) return true;
    const haystack = `${s.sna} ${s.ar}`.toLowerCase();
    return haystack.includes(q);
  });

  const byBikesDesc = (a, b) => b.available_rent_bikes - a.available_rent_bikes;
  const byBikesAsc = (a, b) => a.available_rent_bikes - b.available_rent_bikes;
  const byDocksDesc = (a, b) => b.available_return_bikes - a.available_return_bikes;
  const byName = (a, b) => a.sna.localeCompare(b.sna, "zh-Hant");

  const sorters = {
    "bikes-desc": byBikesDesc,
    "bikes-asc": byBikesAsc,
    "docks-desc": byDocksDesc,
    name: byName,
  };
  list = [...list].sort(sorters[state.sort] || byBikesDesc);
  return list;
}

function renderStations(list) {
  el.resultCount.textContent = `顯示 ${list.length.toLocaleString("zh-TW")} / ${state.stations.length.toLocaleString(
    "zh-TW"
  )} 個站點`;

  if (list.length === 0) {
    el.stationGrid.innerHTML = "";
    el.emptyMessage.hidden = false;
    el.emptyMessage.textContent = "找不到符合條件的站點，試試看調整篩選條件。";
    return;
  }
  el.emptyMessage.hidden = true;

  const frag = document.createDocumentFragment();
  for (const s of list) {
    const bikes = Number(s.available_rent_bikes || 0);
    const docks = Number(s.available_return_bikes || 0);
    const capacity = Number(s.Quantity || bikes + docks) || 1;
    const isOffline = !(s.act === "1" || s.act === 1);

    const card = document.createElement("article");
    card.className = "station-card" + (isOffline ? " offline" : "");

    const bikeClass = gaugeClass(bikes, capacity);
    const dockClass = gaugeClass(docks, capacity);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`;

    card.innerHTML = `
      <div class="station-name">${escapeHtml(cleanName(s.sna))}</div>
      <div class="station-meta">
        <span class="district-tag">${escapeHtml(s.sarea)}</span>
        ${isOffline ? '<span class="offline-tag">暫停營運</span>' : ""}
      </div>
      <div class="station-address">${escapeHtml(s.ar)}</div>
      <div class="gauge-row">
        <div class="gauge">
          <span class="gauge-label">可借車輛</span>
          <span class="gauge-track"><span class="gauge-fill bike${bikeClass ? " " + bikeClass : ""}" style="width:${Math.min(100, (bikes / capacity) * 100)}%"></span></span>
          <span class="gauge-value">${bikes}</span>
        </div>
        <div class="gauge">
          <span class="gauge-label">可還空位</span>
          <span class="gauge-track"><span class="gauge-fill dock${dockClass ? " " + dockClass : ""}" style="width:${Math.min(100, (docks / capacity) * 100)}%"></span></span>
          <span class="gauge-value">${docks}</span>
        </div>
      </div>
      <div class="station-footer">
        <span>更新於 ${escapeHtml(formatTime(s.infoTime))}</span>
        <a href="${mapUrl}" target="_blank" rel="noopener noreferrer">在地圖開啟 →</a>
      </div>
    `;
    frag.appendChild(card);
  }
  el.stationGrid.innerHTML = "";
  el.stationGrid.appendChild(frag);
}

function formatTime(infoTime) {
  if (!infoTime) return "未知";
  const parts = infoTime.split(" ");
  return parts.length > 1 ? parts[1] : infoTime;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAll() {
  renderSummary(state.stations);
  renderStations(getFiltered());
}

function startCountdown() {
  clearInterval(countdownTimer);
  clearTimeout(refreshTimer);
  let remaining = REFRESH_SECONDS;
  el.countdown.textContent = `${remaining} 秒後自動更新`;
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      el.countdown.textContent = "更新中…";
      return;
    }
    el.countdown.textContent = `${remaining} 秒後自動更新`;
  }, 1000);
  refreshTimer = setTimeout(() => loadData(), REFRESH_SECONDS * 1000);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

el.searchInput.addEventListener(
  "input",
  debounce((e) => {
    state.search = e.target.value;
    renderStations(getFiltered());
  }, 150)
);

el.districtSelect.addEventListener("change", (e) => {
  state.district = e.target.value;
  renderStations(getFiltered());
});

el.sortSelect.addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderStations(getFiltered());
});

el.hideOffline.addEventListener("change", (e) => {
  state.hideOffline = e.target.checked;
  renderStations(getFiltered());
});

el.refreshBtn.addEventListener("click", () => loadData({ isManual: true }));
el.retryBtn.addEventListener("click", () => loadData({ isManual: true }));

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  el.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  el.themeToggle.querySelector("span[aria-hidden]").textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem("swp06-theme");
  } catch (_) {
    /* private browsing / storage blocked: fall back to system preference */
  }
  const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(theme);
}

el.themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem("swp06-theme", next);
  } catch (_) {
    /* ignore */
  }
});

initTheme();
loadData();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.loadedOnce) {
    // page regained focus; let the existing countdown keep running
  }
});
