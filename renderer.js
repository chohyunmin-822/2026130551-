// Renderer logic for web version using localStorage

// DOM Elements
const currentDateDisplay = document.getElementById('current-date-display');
const ingredientsList = document.getElementById('ingredients-list');
const searchInput = document.getElementById('search-input');

const tabAll = document.getElementById('tab-all');
const tabImminent = document.getElementById('tab-imminent');
const countAll = document.getElementById('count-all');
const countImminent = document.getElementById('count-imminent');

const summaryTotal = document.getElementById('summary-total');
const summaryImminent = document.getElementById('summary-imminent');
const summaryExpired = document.getElementById('summary-expired');

const ingredientForm = document.getElementById('ingredient-form');
const formTitle = document.getElementById('form-title');
const formDesc = document.getElementById('form-desc');
const editIdInput = document.getElementById('edit-id');
const inputName = document.getElementById('input-name');
const inputCount = document.getElementById('input-count');
const inputExp = document.getElementById('input-exp');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');

const btnMinus = document.getElementById('btn-minus');
const btnPlus = document.getElementById('btn-plus');

// CSV Import/Export UI elements
const btnImportCsv = document.getElementById('btn-import-csv');
const btnExportCsv = document.getElementById('btn-export-csv');
const csvFileInput = document.getElementById('csv-file-input');

// Application state
let allIngredients = [];
let activeTab = 'all'; // 'all' or 'imminent'
let searchQuery = '';

// Date handling (fallback to a known date if system date is off)
const SYSTEM_DATE = new Date('2026-06-25');
const TODAY = (function () {
  const now = new Date();
  return (now.getFullYear() === 2026 && now.getMonth() === 5) ? now : SYSTEM_DATE;
})();

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getRemainingDays(expirationDateStr) {
  const exp = new Date(expirationDateStr);
  const today = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const target = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// ---------- LocalStorage helpers ----------
function loadFromStorage() {
  const raw = localStorage.getItem('ingredients');
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { console.error('Parse error', e); return []; }
  }
  // Default seed data (5 items)
  return [
    { id: 'item-1', name: '우유', count: 2, expirationDate: formatDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 5)) },
    { id: 'item-2', name: '계란', count: 12, expirationDate: formatDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 10)) },
    { id: 'item-3', name: '두부', count: 1, expirationDate: formatDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 2)) },
    { id: 'item-4', name: '시금치', count: 1, expirationDate: formatDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1)) },
    { id: 'item-5', name: '요거트', count: 4, expirationDate: formatDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 7)) }
  ];
}

function saveToStorage() {
  localStorage.setItem('ingredients', JSON.stringify(allIngredients));
}

// ---------- CSV Export ----------
function exportCsv() {
  const header = ['name', 'count', 'expirationDate'];
  const rows = allIngredients.map(i => [i.name, i.count, i.expirationDate]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ingredients.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- CSV Import ----------
function importCsv(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return;
    const hasHeader = lines[0].toLowerCase().includes('name');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const imported = [];
    dataLines.forEach(line => {
      const [name, countStr, exp] = line.split(',');
      if (!name) return;
      const count = parseInt(countStr, 10) || 1;
      const id = `item-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
      imported.push({ id, name: name.trim(), count, expirationDate: exp.trim() });
    });
    allIngredients = imported;
    saveToStorage();
    render();
  };
  reader.readAsText(file);
}

// ---------- UI Initialization ----------
async function init() {
  const days = ['일','월','화','수','목','금','토'];
  currentDateDisplay.textContent = `${TODAY.getFullYear()}년 ${String(TODAY.getMonth()+1).padStart(2,'0')}월 ${String(TODAY.getDate()).padStart(2,'0')}일 (${days[TODAY.getDay()]})`;
  inputExp.value = formatDate(TODAY);
  await fetchIngredients();
  setupEventListeners();
}

async function fetchIngredients() {
  ingredientsList.innerHTML = '<div class="loading-state">식재료 정보를 불러오는 중입니다...</div>';
  allIngredients = loadFromStorage();
  render();
}

function render() {
  // calculate D‑days
  allIngredients.forEach(i => i.remainingDays = getRemainingDays(i.expirationDate));

  const filtered = allIngredients.filter(i => {
    const match = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'imminent') return match && i.remainingDays <= 3;
    return match;
  }).sort((a,b) => a.remainingDays - b.remainingDays);

  const total = allIngredients.length;
  const imminent = allIngredients.filter(i => i.remainingDays <= 3 && i.remainingDays >= 0).length;
  const expired = allIngredients.filter(i => i.remainingDays < 0).length;
  const totalImminentOrExpired = allIngredients.filter(i => i.remainingDays <= 3).length;

  countAll.textContent = total;
  countImminent.textContent = totalImminentOrExpired;
  summaryTotal.textContent = total;
  summaryImminent.textContent = imminent;
  summaryExpired.textContent = expired;

  document.getElementById('summary-imminent-box').classList.toggle('pulse-subtle', imminent > 0);
  document.getElementById('summary-expired-box').classList.toggle('pulse-subtle', expired > 0);

  if (filtered.length === 0) {
    ingredientsList.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-emoji">🍃</span>
        <h4>보관 중인 식재료가 없습니다</h4>
        <p>${searchQuery ? '검색 결과에 맞는 식재료가 없습니다.' : '오른쪽 폼을 사용하여 첫 식재료를 등록해 보세요.'}</p>
      </div>`;
    return;
  }

  ingredientsList.innerHTML = filtered.map(item => {
    let cardClass = 'card-normal';
    let ddayClass = 'dday-normal';
    let ddayText = '';
    if (item.remainingDays < 0) {
      cardClass = 'card-expired';
      ddayClass = 'dday-expired';
      ddayText = `D+${Math.abs(item.remainingDays)} (만료됨)`;
    } else if (item.remainingDays === 0) {
      cardClass = 'card-imminent';
      ddayClass = 'dday-imminent';
      ddayText = 'D-0 (오늘까지)';
    } else if (item.remainingDays <= 3) {
      cardClass = 'card-imminent';
      ddayClass = 'dday-imminent';
      ddayText = `D-${item.remainingDays}`;
    } else {
      ddayText = `D-${item.remainingDays}`;
    }
    return `
      <div class="ingredient-card ${cardClass}" data-id="${item.id}">
        <div class="card-qty-badge">${item.count}</div>
        <div class="card-info">
          <span class="card-name">${escapeHtml(item.name)}</span>
          <span class="card-date-info"><span>📅 유통기한: ${item.expirationDate}</span></span>
        </div>
        <div class="card-right">
          <span class="dday-badge ${ddayClass}">${ddayText}</span>
          <div class="card-actions">
            <button class="btn-icon btn-edit" title="수정">✏️</button>
            <button class="btn-icon btn-delete" title="삭제">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // attach listeners to card buttons
  document.querySelectorAll('.ingredient-card').forEach(card => {
    const id = card.getAttribute('data-id');
    card.querySelector('.btn-edit').addEventListener('click', e => { e.stopPropagation(); startEdit(id); });
    card.querySelector('.btn-delete').addEventListener('click', e => { e.stopPropagation(); deleteIngredient(id); });
  });
}

function startEdit(id) {
  const item = allIngredients.find(x => x.id === id);
  if (!item) return;
  editIdInput.value = item.id;
  inputName.value = item.name;
  inputCount.value = item.count;
  inputExp.value = item.expirationDate;
  formTitle.textContent = '식재료 수정';
  formDesc.textContent = '선택한 식재료 정보를 변경합니다.';
  btnSubmit.textContent = '수정 완료';
  btnCancel.style.display = 'inline-flex';
  inputName.focus();
}

function cancelEdit() {
  editIdInput.value = '';
  ingredientForm.reset();
  inputCount.value = '1';
  inputExp.value = formatDate(TODAY);
  formTitle.textContent = '식재료 추가';
  formDesc.textContent = '새로운 식재료 정보를 등록합니다.';
  btnSubmit.textContent = '등록하기';
  btnCancel.style.display = 'none';
}

async function deleteIngredient(id) {
  const item = allIngredients.find(x => x.id === id);
  if (!item) return;
  if (confirm(`'${item.name}'을(를) 삭제하시겠습니까?`)) {
    allIngredients = allIngredients.filter(x => x.id !== id);
    saveToStorage();
    if (editIdInput.value === id) cancelEdit();
    render();
  }
}

function setupEventListeners() {
  // search
  searchInput.addEventListener('input', e => { searchQuery = e.target.value; render(); });
  // tabs
  tabAll.addEventListener('click', () => { tabAll.classList.add('active'); tabImminent.classList.remove('active'); activeTab = 'all'; render(); });
  tabImminent.addEventListener('click', () => { tabImminent.classList.add('active'); tabAll.classList.remove('active'); activeTab = 'imminent'; render(); });
  // quantity +/-
  btnMinus.addEventListener('click', () => {
    const v = parseInt(inputCount.value,10) || 1;
    if (v>1) inputCount.value = v-1;
  });
  btnPlus.addEventListener('click', () => {
    const v = parseInt(inputCount.value,10) || 0;
    inputCount.value = v+1;
  });
  // cancel edit
  btnCancel.addEventListener('click', cancelEdit);
  // form submit (add / edit)
  ingredientForm.addEventListener('submit', async () => {
    const name = inputName.value.trim();
    const count = parseInt(inputCount.value,10) || 1;
    const expirationDate = inputExp.value;
    const editId = editIdInput.value;
    if (!name) { alert('식재료 이름을 입력해 주세요.'); return; }
    if (editId) {
      const idx = allIngredients.findIndex(x => x.id === editId);
      if (idx !== -1) { allIngredients[idx].name = name; allIngredients[idx].count = count; allIngredients[idx].expirationDate = expirationDate; }
    } else {
      const newItem = { id: `item-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, name, count, expirationDate };
      allIngredients.push(newItem);
    }
    saveToStorage();
    cancelEdit();
    render();
  });
  // CSV import/export
  btnImportCsv.addEventListener('click', () => csvFileInput.click());
  csvFileInput.addEventListener('change', e => { const file = e.target.files[0]; if (file) importCsv(file); e.target.value = ''; });
  btnExportCsv.addEventListener('click', exportCsv);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Start the app
init();
