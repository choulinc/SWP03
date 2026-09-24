const STORAGE_KEY = "daily-todo-list-v1";
const THEME_KEY = "bds-theme-v1";
const $ = (selector) => document.querySelector(selector);
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const priorityLabels = { high: "高優先", medium: "中優先", low: "低優先" };
const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
const repeatLabels = { daily: "每天", weekly: "每週", monthly: "每月" };
const filters = [...document.querySelectorAll("[data-filter]")];
let tasks = loadTasks();
let activeFilter = "all";
let selected = new Set();
let selectionMode = false;
let editingId = null;
let draftSubtasks = [];
let undoSnapshot = null;
let toastTimer = null;

function normalizeTask(item) {
  if (
    !item ||
    typeof item !== "object" ||
    typeof item.text !== "string" ||
    !item.text.trim()
  )
    return null;
  const dateParts =
    typeof item.dueDate === "string" &&
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.dueDate);
  const validDate =
    dateParts &&
    Number(dateParts[1]) >= 1900 &&
    Number(dateParts[1]) <= 9999 &&
    Number(dateParts[2]) >= 1 &&
    Number(dateParts[2]) <= 12 &&
    Number(dateParts[3]) >= 1 &&
    Number(dateParts[3]) <=
      new Date(Number(dateParts[1]), Number(dateParts[2]), 0).getDate()
      ? item.dueDate
      : "";
  return {
    id: typeof item.id === "string" && item.id ? item.id : uid(),
    text: item.text.trim().slice(0, 200),
    completed: item.completed === true,
    createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
    dueDate: validDate,
    priority: Object.hasOwn(priorityOrder, item.priority)
      ? item.priority
      : "none",
    category:
      typeof item.category === "string"
        ? item.category.trim().slice(0, 40)
        : "",
    notes: typeof item.notes === "string" ? item.notes.slice(0, 2000) : "",
    subtasks: Array.isArray(item.subtasks)
      ? item.subtasks
          .filter(
            (sub) => sub && typeof sub.text === "string" && sub.text.trim(),
          )
          .map((sub) => ({
            id: typeof sub.id === "string" ? sub.id : uid(),
            text: sub.text.trim().slice(0, 120),
            completed: sub.completed === true,
          }))
      : [],
    repeat: Object.hasOwn(repeatLabels, item.repeat) ? item.repeat : "none",
    pinned: item.pinned === true,
    archived: item.archived === true,
  };
}

function loadTasks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.map(normalizeTask).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function persist(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    tasks = next;
    $("#form-error").hidden = true;
    return true;
  } catch {
    $("#form-error").textContent = "無法儲存清單。請檢查瀏覽器的本機儲存空間。";
    $("#form-error").hidden = false;
    showToast("儲存失敗，變更尚未套用。");
    return false;
  }
}

function announce(message) {
  $("#status-message").textContent = message;
}
function showToast(message, snapshot = null) {
  clearTimeout(toastTimer);
  undoSnapshot = snapshot;
  $("#toast-message").textContent = message;
  $("#undo-button").hidden = !snapshot;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
    undoSnapshot = null;
  }, 8000);
  announce(message);
}
function commit(next, message, undo = false) {
  const previous = tasks.map((task) => ({
    ...task,
    subtasks: task.subtasks.map((sub) => ({ ...sub })),
  }));
  if (!persist(next)) return false;
  render();
  showToast(message, undo ? previous : null);
  return true;
}
function icon(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = paths;
  return svg;
}
function button(label, className, action, id, svgPath) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.dataset.action = action;
  element.dataset.id = id;
  element.setAttribute("aria-label", label);
  if (svgPath) element.append(icon(svgPath));
  else element.textContent = label;
  return element;
}
function nextDueDate(dueDate, repeat) {
  const base = dueDate || today();
  const [year, month, day] = base.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (repeat === "daily") date.setDate(date.getDate() + 1);
  else if (repeat === "weekly") date.setDate(date.getDate() + 7);
  else {
    const maxDay = new Date(year, month + 1, 0).getDate();
    date.setFullYear(year, month, Math.min(day, maxDay));
  }
  while (formatDate(date) <= today()) {
    if (repeat === "daily") date.setDate(date.getDate() + 1);
    else if (repeat === "weekly") date.setDate(date.getDate() + 7);
    else {
      const y = date.getFullYear(),
        m = date.getMonth();
      date.setFullYear(
        y,
        m + 1,
        Math.min(day, new Date(y, m + 2, 0).getDate()),
      );
    }
  }
  return formatDate(date);
}
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function shortDate(value) {
  const [y, m, d] = value.split("-");
  return `${Number(m)}/${Number(d)}`;
}
function nextOccurrence(task) {
  return {
    ...task,
    id: uid(),
    completed: false,
    dueDate: nextDueDate(task.dueDate, task.repeat),
    createdAt: Date.now(),
    subtasks: task.subtasks.map((sub) => ({
      ...sub,
      id: uid(),
      completed: false,
    })),
  };
}
function visibleTasks() {
  const query = $("#search-input").value.trim().toLocaleLowerCase();
  const priority = $("#priority-filter").value;
  const category = $("#category-filter").value;
  const sort = $("#sort-select").value;
  const visible = tasks.filter((task) => {
    if (activeFilter === "archived") {
      if (!task.archived) return false;
    } else if (task.archived) return false;
    if (activeFilter === "active" && task.completed) return false;
    if (activeFilter === "completed" && !task.completed) return false;
    if (
      activeFilter === "overdue" &&
      (task.completed || !task.dueDate || task.dueDate >= today())
    )
      return false;
    if (priority !== "all" && task.priority !== priority) return false;
    if (category !== "all" && task.category !== category) return false;
    if (
      query &&
      !`${task.text} ${task.notes} ${task.category} ${task.subtasks.map((s) => s.text).join(" ")}`
        .toLocaleLowerCase()
        .includes(query)
    )
      return false;
    return true;
  });
  visible.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "oldest") return a.createdAt - b.createdAt;
    if (sort === "due")
      return (
        (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
        b.createdAt - a.createdAt
      );
    if (sort === "priority")
      return (
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        b.createdAt - a.createdAt
      );
    if (sort === "name") return a.text.localeCompare(b.text, "zh-Hant");
    return b.createdAt - a.createdAt;
  });
  return visible;
}
function updateCategories() {
  const select = $("#category-filter");
  const current = select.value;
  const values = [
    ...new Set(tasks.map((task) => task.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  select.replaceChildren(
    new Option("所有分類", "all"),
    ...values.map((value) => new Option(value, value)),
  );
  select.value = values.includes(current) ? current : "all";
}
function renderTask(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-complete" : ""}${task.archived ? " is-archived" : ""}`;
  item.dataset.id = task.id;
  if (selectionMode) {
    const select = document.createElement("input");
    select.type = "checkbox";
    select.className = "batch-checkbox";
    select.dataset.id = task.id;
    select.checked = selected.has(task.id);
    select.setAttribute("aria-label", `選取：${task.text}`);
    item.append(select);
  }
  const toggle = button(
    `${task.completed ? "標記未完成" : "標記已完成"}：${task.text}`,
    "task-toggle",
    "toggle",
    task.id,
    '<path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  );
  toggle.setAttribute("aria-pressed", String(task.completed));
  toggle.disabled = task.archived;
  const main = button(
    `編輯詳細：${task.text}`,
    "task-main",
    "details",
    task.id,
  );
  main.replaceChildren();
  const title = document.createElement("span");
  title.className = "task-text";
  title.textContent = task.text;
  main.append(title);
  const meta = document.createElement("span");
  meta.className = "task-meta";
  const addBadge = (text, className = "") => {
    const badge = document.createElement("span");
    badge.className = `task-badge ${className}`;
    badge.textContent = text;
    meta.append(badge);
  };
  if (task.pinned) addBadge("置頂", "badge-pin");
  if (task.dueDate)
    addBadge(
      `${task.dueDate < today() && !task.completed ? "已逾期 · " : ""}${shortDate(task.dueDate)}`,
      task.dueDate < today() && !task.completed ? "badge-overdue" : "",
    );
  if (task.priority !== "none")
    addBadge(priorityLabels[task.priority], `badge-${task.priority}`);
  if (task.category) addBadge(task.category, "badge-category");
  if (task.repeat !== "none") addBadge(`↻ ${repeatLabels[task.repeat]}`);
  if (task.subtasks.length)
    addBadge(
      `子任務 ${task.subtasks.filter((sub) => sub.completed).length}/${task.subtasks.length}`,
    );
  if (task.notes) addBadge("有備註");
  if (meta.childElementCount) main.append(meta);
  const more = button(
    `更多操作：${task.text}`,
    "more-task",
    "menu",
    task.id,
    '<circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/>',
  );
  more.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "task-menu";
  menu.hidden = true;
  const actions = task.archived
    ? [["還原到清單", "archive"]]
    : [
        [task.pinned ? "取消置頂" : "置頂", "pin"],
        ["複製事項", "duplicate"],
        ["封存事項", "archive"],
      ];
  actions.push(["刪除事項", "delete"]);
  actions.forEach(([label, action]) =>
    menu.append(
      button(label, action === "delete" ? "danger-text" : "", action, task.id),
    ),
  );
  item.append(toggle, main, more, menu);
  return item;
}
function render() {
  updateCategories();
  const active = tasks.filter((task) => !task.archived);
  const completed = active.filter((task) => task.completed).length;
  const remaining = active.length - completed;
  const percent = active.length
    ? Math.round((completed / active.length) * 100)
    : 0;
  const visible = visibleTasks();
  $("#task-list").replaceChildren(...visible.map(renderTask));
  $("#task-count").textContent = active.length;
  $("#remaining-count").textContent = `${remaining} 件待完成`;
  $("#progress-percent").textContent = `${percent}%`;
  $("#progress-fill").style.width = `${percent}%`;
  $("#progress-bar").setAttribute("aria-valuenow", String(percent));
  $("#progress-caption").textContent =
    active.length === 0
      ? "新增第一件待辦，開始今天的安排。"
      : remaining === 0
        ? "太棒了，清單上的事都完成了！"
        : `已完成 ${completed} 件，還有 ${remaining} 件待辦。`;
  $("#clear-completed").hidden = completed === 0;
  $("#empty-state").hidden = visible.length > 0;
  if (!visible.length) {
    const copy =
      activeFilter === "archived"
        ? ["封存區是空的", "封存後的事項會出現在這裡。"]
        : !tasks.length
          ? ["從一件小事開始", "在上方輸入待辦事項，讓今天有個好開始。"]
          : activeFilter === "active" && !remaining
            ? ["都完成了！", "目前沒有待完成的事項。"]
            : ["沒有符合條件的事項", "試試其他篩選條件或搜尋關鍵字。"];
    $("#empty-title").textContent = copy[0];
    $("#empty-description").textContent = copy[1];
  }
  filters.forEach((btn) => {
    const on = btn.dataset.filter === activeFilter;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
  $("#select-mode").setAttribute("aria-pressed", String(selectionMode));
  $("#select-mode").textContent = selectionMode ? "完成選取" : "選取多項";
  $("#batch-actions").hidden = !selectionMode;
  $("#selected-count").textContent = `已選 ${selected.size} 件`;
  $("#batch-complete").disabled = selected.size === 0;
  $("#batch-delete").disabled = selected.size === 0;
}
function closeMenus() {
  document.querySelectorAll(".task-menu:not([hidden])").forEach((menu) => {
    menu.hidden = true;
    menu.previousElementSibling.setAttribute("aria-expanded", "false");
  });
}
function openDetails(task) {
  editingId = task.id;
  draftSubtasks = task.subtasks.map((sub) => ({ ...sub }));
  $("#detail-text").value = task.text;
  $("#detail-due").value = task.dueDate;
  $("#detail-priority").value = task.priority;
  $("#detail-category").value = task.category;
  $("#detail-repeat").value = task.repeat;
  $("#detail-notes").value = task.notes;
  $("#subtask-input").value = "";
  renderSubtasks();
  $("#task-dialog").showModal();
  $("#detail-text").focus();
}
function renderSubtasks() {
  const list = $("#subtask-list");
  list.replaceChildren();
  for (const sub of draftSubtasks) {
    const item = document.createElement("li");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = sub.completed;
    check.dataset.id = sub.id;
    check.setAttribute("aria-label", `完成子任務：${sub.text}`);
    const label = document.createElement("span");
    label.textContent = sub.text;
    if (sub.completed) label.className = "is-complete";
    const remove = button(
      `刪除子任務：${sub.text}`,
      "subtask-remove",
      "remove-subtask",
      sub.id,
      '<path d="M5 5 19 19M19 5 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    );
    item.append(check, label, remove);
    list.append(item);
  }
  $("#subtask-progress").textContent =
    `${draftSubtasks.filter((sub) => sub.completed).length} / ${draftSubtasks.length}`;
}
function changeTask(task, changes, message) {
  commit(
    tasks.map((item) => (item.id === task.id ? { ...item, ...changes } : item)),
    message,
  );
}

$("#add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("#new-task").value.trim();
  if (!text) {
    $("#form-error").textContent = "請先輸入待辦事項。";
    $("#form-error").hidden = false;
    $("#new-task").focus();
    return;
  }
  const task = normalizeTask({ id: uid(), text, createdAt: Date.now() });
  if (commit([task, ...tasks], `已新增：${text}`)) {
    $("#new-task").value = "";
    activeFilter = "all";
    render();
    $("#new-task").focus();
  }
});
$("#new-task").addEventListener("input", () => {
  $("#form-error").hidden = true;
});
$("#task-list").addEventListener("click", (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const task = tasks.find((item) => item.id === target.dataset.id);
  if (!task) return;
  const action = target.dataset.action;
  if (action === "menu") {
    const menu = target.nextElementSibling;
    const open = menu.hidden;
    closeMenus();
    menu.hidden = !open;
    target.setAttribute("aria-expanded", String(open));
    return;
  }
  if (action === "details") {
    closeMenus();
    openDetails(task);
    return;
  }
  if (action === "toggle") {
    const updated = tasks.map((item) =>
      item.id === task.id ? { ...item, completed: !item.completed } : item,
    );
    if (!task.completed && task.repeat !== "none")
      updated.unshift(nextOccurrence(task));
    commit(
      updated,
      task.completed
        ? `已改為待完成：${task.text}`
        : task.repeat === "none"
          ? `已完成：${task.text}`
          : `已完成，並建立下一次：${task.text}`,
    );
    return;
  }
  closeMenus();
  if (action === "pin")
    changeTask(
      task,
      { pinned: !task.pinned },
      task.pinned ? "已取消置頂" : "已置頂",
    );
  else if (action === "duplicate") {
    const copy = {
      ...task,
      id: uid(),
      text: `${task.text}（複製）`,
      completed: false,
      archived: false,
      createdAt: Date.now(),
      subtasks: task.subtasks.map((sub) => ({
        ...sub,
        id: uid(),
        completed: false,
      })),
    };
    commit([copy, ...tasks], "已複製事項");
  } else if (action === "archive")
    changeTask(
      task,
      { archived: !task.archived },
      task.archived ? "已還原到清單" : "已封存事項",
    );
  else if (action === "delete")
    commit(
      tasks.filter((item) => item.id !== task.id),
      `已刪除：${task.text}`,
      true,
    );
});
$("#task-list").addEventListener("change", (event) => {
  if (!event.target.matches(".batch-checkbox")) return;
  if (event.target.checked) selected.add(event.target.dataset.id);
  else selected.delete(event.target.dataset.id);
  $("#selected-count").textContent = `已選 ${selected.size} 件`;
  $("#batch-complete").disabled = selected.size === 0;
  $("#batch-delete").disabled = selected.size === 0;
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".task-menu,.more-task")) closeMenus();
});
filters.forEach((btn) =>
  btn.addEventListener("click", () => {
    activeFilter = btn.dataset.filter;
    selected.clear();
    render();
  }),
);
[
  "#search-input",
  "#priority-filter",
  "#category-filter",
  "#sort-select",
].forEach((selector) =>
  $(selector).addEventListener(
    selector === "#search-input" ? "input" : "change",
    () => {
      selected.clear();
      render();
    },
  ),
);
$("#select-mode").addEventListener("click", () => {
  selectionMode = !selectionMode;
  selected.clear();
  render();
});
$("#select-all").addEventListener("click", () => {
  visibleTasks().forEach((task) => selected.add(task.id));
  render();
});
$("#batch-complete").addEventListener("click", () => {
  const count = selected.size;
  if (!count) return;
  const repeated = [];
  const next = tasks.map((task) => {
    if (!selected.has(task.id) || task.archived || task.completed) return task;
    if (task.repeat !== "none") repeated.push(nextOccurrence(task));
    return { ...task, completed: true };
  });
  if (commit([...repeated, ...next], `已將 ${count} 件事項標記完成`)) {
    selected.clear();
    selectionMode = false;
    render();
  }
});
$("#batch-delete").addEventListener("click", () => {
  const count = selected.size;
  if (!count) return;
  if (
    commit(
      tasks.filter((task) => !selected.has(task.id)),
      `已刪除 ${count} 件事項`,
      true,
    )
  ) {
    selected.clear();
    selectionMode = false;
    render();
  }
});
$("#clear-completed").addEventListener("click", () => {
  const count = tasks.filter((task) => task.completed && !task.archived).length;
  commit(
    tasks.filter((task) => !task.completed || task.archived),
    `已清除 ${count} 件完成事項`,
    true,
  );
});
$("#detail-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("#detail-text").value.trim();
  if (!text) {
    $("#detail-text").focus();
    return;
  }
  const task = tasks.find((item) => item.id === editingId);
  if (!task) return;
  const next = tasks.map((item) =>
    item.id === editingId
      ? {
          ...item,
          text,
          dueDate: $("#detail-due").value,
          priority: $("#detail-priority").value,
          category: $("#detail-category").value.trim(),
          repeat: $("#detail-repeat").value,
          notes: $("#detail-notes").value.trim(),
          subtasks: draftSubtasks.map((sub) => ({ ...sub })),
        }
      : item,
  );
  if (commit(next, `已更新：${text}`)) $("#task-dialog").close();
});
$("#close-dialog").addEventListener("click", () => $("#task-dialog").close());
$("#cancel-dialog").addEventListener("click", () => $("#task-dialog").close());
$("#task-dialog").addEventListener("click", (event) => {
  if (event.target === $("#task-dialog")) $("#task-dialog").close();
});
$("#add-subtask").addEventListener("click", () => {
  const text = $("#subtask-input").value.trim();
  if (!text) return;
  draftSubtasks.push({ id: uid(), text, completed: false });
  $("#subtask-input").value = "";
  renderSubtasks();
  $("#subtask-input").focus();
});
$("#subtask-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    $("#add-subtask").click();
  }
});
$("#subtask-list").addEventListener("change", (event) => {
  const sub = draftSubtasks.find((item) => item.id === event.target.dataset.id);
  if (sub) {
    sub.completed = event.target.checked;
    renderSubtasks();
  }
});
$("#subtask-list").addEventListener("click", (event) => {
  const target = event.target.closest('[data-action="remove-subtask"]');
  if (target) {
    draftSubtasks = draftSubtasks.filter(
      (item) => item.id !== target.dataset.id,
    );
    renderSubtasks();
  }
});
$("#undo-button").addEventListener("click", () => {
  if (undoSnapshot && persist(undoSnapshot)) {
    undoSnapshot = null;
    $("#toast").hidden = true;
    clearTimeout(toastTimer);
    render();
    announce("已復原刪除");
  }
});
$("#dismiss-toast").addEventListener("click", () => {
  $("#toast").hidden = true;
  undoSnapshot = null;
  clearTimeout(toastTimer);
});
$("#export-button").addEventListener("click", () => {
  const data = JSON.stringify(
    { app: "辦點事", version: 2, exportedAt: new Date().toISOString(), tasks },
    null,
    2,
  );
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `bandianshi-backup-${today()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`已匯出 ${tasks.length} 件事項`);
});
$("#import-button").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error("檔案超過 5 MB");
    const parsed = JSON.parse(await file.text());
    const source = Array.isArray(parsed) ? parsed : parsed.tasks;
    if (!Array.isArray(source)) throw new Error("找不到事項清單");
    const imported = source.map(normalizeTask).filter(Boolean);
    const existingIds = new Set(tasks.map((task) => task.id));
    const additions = imported.filter((task) => {
      if (existingIds.has(task.id)) return false;
      existingIds.add(task.id);
      return true;
    });
    if (commit([...additions, ...tasks], `已匯入 ${additions.length} 件事項`)) {
      activeFilter = "all";
      render();
    }
  } catch (error) {
    showToast(`匯入失敗：${error.message}`);
  }
  event.target.value = "";
});
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#theme-toggle").setAttribute(
    "aria-label",
    theme === "dark" ? "切換淺色模式" : "切換深色模式",
  );
  $("#theme-toggle").title = theme === "dark" ? "切換淺色模式" : "切換深色模式";
  $('meta[name="theme-color"]').content =
    theme === "dark" ? "#17223b" : "#eff3f8";
}
$("#theme-toggle").addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
});
document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "Escape") {
    closeMenus();
    if (selectionMode) {
      selectionMode = false;
      selected.clear();
      render();
    }
    return;
  }
  if (
    event.target.matches("input,textarea,select,[contenteditable]") ||
    $("#task-dialog").open
  )
    return;
  if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    $("#new-task").focus();
  } else if (event.key === "/") {
    event.preventDefault();
    $("#search-input").focus();
  }
});
$("#today-date").textContent = new Intl.DateTimeFormat("zh-TW", {
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(new Date());
try {
  applyTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
} catch {
  applyTheme("light");
}
render();
