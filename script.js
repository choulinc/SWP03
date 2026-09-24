const STORAGE_KEY = 'daily-todo-list-v1';
const form = document.querySelector('#add-form');
const input = document.querySelector('#new-task');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const statusMessage = document.querySelector('#status-message');
const formError = document.querySelector('#form-error');
const filters = [...document.querySelectorAll('[data-filter]')];
let tasks = loadTasks();
let activeFilter = 'all';

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.completed === 'boolean');
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    formError.textContent = '無法儲存清單。請確認瀏覽器允許本機儲存，並檢查可用空間。';
    formError.hidden = false;
    return false;
  }
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function makeIcon(paths) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths;
  return svg;
}

function render() {
  const completed = tasks.filter(task => task.completed).length;
  const remaining = tasks.length - completed;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const visible = tasks.filter(task => activeFilter === 'all' || (activeFilter === 'completed' ? task.completed : !task.completed));

  taskList.replaceChildren();
  for (const task of visible) {
    const item = document.createElement('li');
    item.className = `task-item${task.completed ? ' is-complete' : ''}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'task-toggle';
    toggle.dataset.action = 'toggle';
    toggle.dataset.id = task.id;
    toggle.setAttribute('aria-label', `${task.completed ? '標記未完成' : '標記已完成'}：${task.text}`);
    toggle.setAttribute('aria-pressed', String(task.completed));
    toggle.append(makeIcon('<path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'));
    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-task';
    edit.dataset.action = 'edit';
    edit.dataset.id = task.id;
    edit.setAttribute('aria-label', `編輯：${task.text}`);
    edit.append(makeIcon('<path d="m15 5 4 4M4 20l4.5-.9L19 8.6 15.4 5 4.9 15.5 4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-task';
    remove.dataset.action = 'delete';
    remove.dataset.id = task.id;
    remove.setAttribute('aria-label', `刪除：${task.text}`);
    remove.append(makeIcon('<path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 4v5m4-5v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'));
    item.append(toggle, text, edit, remove);
    taskList.append(item);
  }

  document.querySelector('#task-count').textContent = tasks.length;
  document.querySelector('#remaining-count').textContent = `${remaining} 件待完成`;
  document.querySelector('#progress-percent').textContent = `${percent}%`;
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  document.querySelector('#progress-bar').setAttribute('aria-valuenow', String(percent));
  document.querySelector('#progress-caption').textContent = tasks.length === 0
    ? '新增第一件待辦，開始今天的安排。'
    : remaining === 0 ? '太棒了，清單上的事都完成了！' : `已完成 ${completed} 件，還有 ${remaining} 件待辦。`;
  const clearButton = document.querySelector('#clear-completed');
  clearButton.hidden = completed === 0;
  emptyState.hidden = visible.length > 0;
  if (visible.length === 0) {
    const copy = tasks.length === 0
      ? ['從一件小事開始', '在上方輸入待辦事項，讓今天有個好開始。']
      : activeFilter === 'active'
        ? ['都完成了！', '目前沒有待完成的事項，好好享受這份輕鬆。']
        : activeFilter === 'completed'
          ? ['還沒有完成的事項', '完成一件待辦後，就會出現在這裡。']
          : ['清單空空的', '在上方新增一件待辦事項。'];
    document.querySelector('#empty-title').textContent = copy[0];
    document.querySelector('#empty-description').textContent = copy[1];
  }
  filters.forEach(button => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    formError.textContent = '請先輸入待辦事項。';
    formError.hidden = false;
    input.focus();
    return;
  }
  formError.hidden = true;
  const task = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, text, completed: false };
  tasks.unshift(task);
  if (!saveTasks()) { tasks.shift(); return; }
  input.value = '';
  activeFilter = 'all';
  render();
  setStatus(`已新增：${text}`);
  input.focus();
});

input.addEventListener('input', () => { formError.hidden = true; });

taskList.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const task = tasks.find(item => item.id === button.dataset.id);
  if (!task) return;
  if (button.dataset.action === 'edit') {
    const item = button.closest('.task-item');
    const editor = document.createElement('input');
    editor.className = 'task-edit-input';
    editor.type = 'text';
    editor.maxLength = 200;
    editor.value = task.text;
    editor.setAttribute('aria-label', '編輯待辦事項');
    item.querySelector('.task-text').replaceWith(editor);
    button.dataset.action = 'save';
    button.setAttribute('aria-label', '儲存編輯');
    button.replaceChildren(makeIcon('<path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'));
    const cancel = item.querySelector('.delete-task');
    cancel.dataset.action = 'cancel';
    cancel.setAttribute('aria-label', '取消編輯');
    cancel.replaceChildren(makeIcon('<path d="M5 5 19 19M19 5 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'));
    editor.focus();
    editor.select();
    return;
  }
  if (button.dataset.action === 'cancel') { render(); return; }
  if (button.dataset.action === 'save') {
    const editor = button.closest('.task-item').querySelector('.task-edit-input');
    const updated = editor.value.trim();
    if (!updated) {
      editor.setCustomValidity('請輸入待辦事項。');
      editor.reportValidity();
      editor.addEventListener('input', () => editor.setCustomValidity(''), { once: true });
      return;
    }
    const previous = [...tasks];
    tasks = tasks.map(item => item.id === task.id ? { ...item, text: updated } : item);
    if (!saveTasks()) { tasks = previous; return; }
    render();
    setStatus(`已更新：${updated}`);
    return;
  }
  const previous = [...tasks];
  if (button.dataset.action === 'toggle') {
    tasks = tasks.map(item => item.id === task.id ? { ...item, completed: !item.completed } : item);
    setStatus(`${task.text}，${task.completed ? '標記為未完成' : '已完成'}`);
  } else {
    tasks = tasks.filter(item => item.id !== task.id);
    setStatus(`已刪除：${task.text}`);
  }
  if (!saveTasks()) { tasks = previous; return; }
  render();
});

taskList.addEventListener('keydown', event => {
  if (!event.target.matches('.task-edit-input')) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    event.target.closest('.task-item').querySelector('[data-action="save"]').click();
  } else if (event.key === 'Escape') {
    event.target.closest('.task-item').querySelector('[data-action="cancel"]').click();
  }
});

filters.forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  render();
}));

document.querySelector('#clear-completed').addEventListener('click', () => {
  const previous = [...tasks];
  tasks = tasks.filter(task => !task.completed);
  if (!saveTasks()) { tasks = previous; return; }
  render();
  setStatus('已清除所有完成的事項');
});

document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
render();
