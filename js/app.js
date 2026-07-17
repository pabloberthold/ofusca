'use strict';

const APP_VERSION = '1.2.0';
const PROFILES_KEY = 'ofusca-profiles';
const MAX_UNDO = 50;
const MAX_FILE_MB = 100;

let rules         = [];
let selectedFiles = [];
let activeTab     = 'text';
let profilesData  = {};
let dropdownOpen  = false;

let dragSrcIndex  = null;
let rulesFilter   = '';
let undoStack     = [];
let redoStack     = [];
let diffMode      = false;

/* ════════════════════════════════
   THEME
   ════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem('ofusca-theme');
  if (saved) { applyTheme(saved, false); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light', false);
}

function applyTheme(t, animate = true) {
  if (animate) document.documentElement.style.transition = 'background 0.2s, color 0.2s';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('ofusca-theme', t);
  document.getElementById('icon-moon').style.display = t === 'dark' ? '' : 'none';
  document.getElementById('icon-sun').style.display  = t === 'light' ? '' : 'none';
  if (animate) setTimeout(() => document.documentElement.style.transition = '', 300);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

/* ════════════════════════════════
   TRANSFORM ENGINE
   ════════════════════════════════ */
function applyRules(text, rules) {
  let totalMatches = 0;
  let rulesUsed = 0;
  for (const rule of rules) {
    if (rule.enabled === false) continue;
    const fromVal = rule.from || '';
    const toVal = rule.to || '';
    const caseSensitive = rule.case_sensitive || false;
    if (!fromVal) continue;
    try {
      let pattern;
      if (rule.type === 'regex') {
        const flags = caseSensitive ? 'gm' : 'gim';
        pattern = new RegExp(fromVal, flags);
      } else {
        const escaped = fromVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'gm' : 'gim';
        pattern = new RegExp(escaped, flags);
      }
      const matches = text.match(pattern);
      const count = matches ? matches.length : 0;
      if (count) {
        text = text.replace(pattern, toVal);
        totalMatches += count;
        rulesUsed++;
      }
    } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
  }
  return { result: text, matches: totalMatches, rulesUsed };
}

/* ════════════════════════════════
   UNDO / REDO
   ════════════════════════════════ */
function pushUndo() {
  undoStack.push(JSON.parse(JSON.stringify(rules)));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.parse(JSON.stringify(rules)));
  rules = undoStack.pop();
  renderRules();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.parse(JSON.stringify(rules)));
  rules = redoStack.pop();
  renderRules();
}

/* ════════════════════════════════
   RULES
   ════════════════════════════════ */
function addRule(type) {
  pushUndo();
  rules.push({ id: Date.now(), type, from: '', to: '', case_sensitive: false, enabled: true });
  renderRules();
}

function removeRule(id) {
  pushUndo();
  rules = rules.filter(r => r.id !== id);
  renderRules();
}

function updateRule(id, field, value) {
  const r = rules.find(r => r.id === id);
  if (r) r[field] = value;
}

function toggleRuleEnabled(id) {
  pushUndo();
  const r = rules.find(r => r.id === id);
  if (r) r.enabled = !r.enabled;
}

function validateRegex(str) {
  if (!str) return null;
  try { new RegExp(str); return null; }
  catch (e) { return e.message; }
}

function filterRules(val) {
  rulesFilter = val.toLowerCase();
  renderRules();
}

/* ── DRAG & DROP ── */
function handleDragStart(e) {
  dragSrcIndex = Array.from(document.getElementById('rules-list').children).indexOf(e.target.closest('.rule-card'));
  e.target.closest('.rule-card').classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  const card = e.target.closest('.rule-card');
  if (!card) return;
  const list = document.getElementById('rules-list');
  const idx = Array.from(list.children).indexOf(card);
  if (idx === dragSrcIndex) return;
  const rect = card.getBoundingClientRect();
  const mid = rect.top + rect.height / 2;
  if (e.clientY < mid) list.insertBefore(list.children[dragSrcIndex], card);
  else list.insertBefore(list.children[dragSrcIndex], card.nextSibling);
  dragSrcIndex = idx;
}

function handleDragEnd(e) {
  e.target.closest('.rule-card').classList.remove('dragging');
  const list = document.getElementById('rules-list');
  const newOrder = Array.from(list.children).map(c => rules.find(r => r.id === +c.dataset.ruleId));
  const changed = JSON.stringify(rules) !== JSON.stringify(newOrder.filter(Boolean));
  if (changed) pushUndo();
  rules = newOrder.filter(Boolean);
  renderRules();
}

function renderRules() {
  const c = document.getElementById('rules-list');
  c.innerHTML = '';
  const filtered = rulesFilter ? rules.filter(r =>
    (r.from || '').toLowerCase().includes(rulesFilter) ||
    (r.to || '').toLowerCase().includes(rulesFilter)
  ) : rules;

  filtered.forEach(rule => {
    const d = document.createElement('div');
    d.className = 'rule-card' + (rule.enabled === false ? ' rule-disabled' : '');
    d.draggable = true;
    d.dataset.ruleId = rule.id;
    d.addEventListener('dragstart', handleDragStart);
    d.addEventListener('dragover', handleDragOver);
    d.addEventListener('dragend', handleDragEnd);

    const regexErr = rule.type === 'regex' && rule.from ? validateRegex(rule.from) : null;
    const fromClass = regexErr ? 'rule-field rule-field-error' : 'rule-field';

    d.innerHTML = `
      <div class="rule-card-top">
        <span class="drag-handle" title="Arrastrar para reordenar">⠿</span>
        <span class="type-pill pill-${rule.type}">${rule.type}</span>
        <label class="rule-enable-toggle" title="${rule.enabled === false ? 'Desactivada' : 'Activada'}">
          <input type="checkbox" ${rule.enabled !== false ? 'checked' : ''}
                 onchange="toggleRuleEnabled(${rule.id});renderRules()" />
          <span class="toggle-track"><span class="toggle-knob"></span></span>
        </label>
        <label class="cs-toggle" title="Case sensitive">
          <input type="checkbox" ${rule.case_sensitive ? 'checked' : ''}
                 onchange="updateRule(${rule.id},'case_sensitive',this.checked)" />
          <span class="cs-label">Aa</span>
        </label>
        <button class="rule-delete" onclick="removeRule(${rule.id})" title="Eliminar regla">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="rule-row">
        <span class="rule-label">de</span>
        <input class="${fromClass}" type="text"
               placeholder="${rule.type === 'regex' ? 'patrón regex…' : 'texto a buscar…'}"
               value="${esc(rule.from)}"
               oninput="updateRule(${rule.id},'from',this.value);renderRules()" />
      </div>
      ${regexErr ? `<div class="regex-error">${esc(regexErr)}</div>` : ''}
      <div class="rule-row">
        <span class="rule-label">a</span>
        <input class="rule-field" type="text"
               placeholder="reemplazar por…"
               value="${esc(rule.to)}"
               oninput="updateRule(${rule.id},'to',this.value);renderRules()" />
      </div>`;
    c.appendChild(d);
  });
  if (rulesFilter && !filtered.length) {
    c.innerHTML = '<div class="profile-dropdown-empty">Sin reglas que coincidan</div>';
  }
  document.getElementById('rule-counter').textContent = rules.length;
}

/* ════════════════════════════════
   PROFILES
   ════════════════════════════════ */
function loadProfiles() {
  try {
    profilesData = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
  } catch {
    profilesData = {};
  }
  renderProfileDropdown();
  if (profilesData['default'] && profilesData['default'].length > 0) {
    applyProfile('default');
  }
}

function renderProfileDropdown() {
  const list = document.getElementById('profile-dropdown-list');
  list.innerHTML = '';
  let names = Object.keys(profilesData).sort((a, b) => {
    if (a.toLowerCase() === 'default') return -1;
    if (b.toLowerCase() === 'default') return 1;
    return a.localeCompare(b);
  });
  if (!names.length) {
    list.innerHTML = '<div class="profile-dropdown-empty">Sin perfiles guardados</div>';
    return;
  }
  names.forEach(name => {
    const ruleCount = (profilesData[name] || []).length;
    const isDefault = name.toLowerCase() === 'default';
    const d = document.createElement('div');
    d.className = 'profile-option' + (isDefault ? ' profile-option-default' : '');
    d.innerHTML = `
      <span class="profile-option-name" title="${esc(name)}">${esc(name)}${isDefault ? ' <span class="default-badge">default</span>' : ''}</span>
      <span class="profile-option-count">${ruleCount} regla${ruleCount !== 1 ? 's' : ''}</span>
      <button class="btn-profile-load" onclick="applyProfile('${esc(name)}')">Cargar</button>
      <button class="btn-profile-delete" onclick="deleteProfile('${esc(name)}')">Borrar</button>`;
    list.appendChild(d);
  });
}

function toggleProfileDropdown() {
  const dd = document.getElementById('profile-dropdown');
  const chevron = document.getElementById('profile-chevron');
  dropdownOpen = !dropdownOpen;
  dd.style.display = dropdownOpen ? 'block' : 'none';
  chevron.classList.toggle('open', dropdownOpen);
}

document.addEventListener('click', e => {
  if (dropdownOpen && !e.target.closest('.profile-selector-wrap')) {
    document.getElementById('profile-dropdown').style.display = 'none';
    document.getElementById('profile-chevron').classList.remove('open');
    dropdownOpen = false;
  }
});

function _persistProfiles() {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesData));
}

function saveProfile() {
  const name = document.getElementById('profile-name').value.trim();
  if (!name) { document.getElementById('profile-name').focus(); return; }
  profilesData[name] = serializeRules();
  _persistProfiles();
  document.getElementById('profile-name').value = '';
  loadProfiles();
  const btn = document.querySelector('.btn-save-profile');
  const orig = btn.textContent;
  btn.textContent = '✓ Guardado';
  btn.style.background = 'var(--success)';
  setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
}

function applyProfile(name) {
  pushUndo();
  const profileRules = profilesData[name] || [];
  const existingRuleIds = rules.map(r => r.id);
  profileRules.forEach((r, i) => {
    if (!existingRuleIds.includes(r.id)) {
      rules.push({ ...r, id: Date.now() + i, case_sensitive: !!r.case_sensitive, enabled: r.enabled !== false });
    }
  });
  renderRules();
  document.getElementById('profile-select-label').textContent = name;
  document.getElementById('profile-dropdown').style.display = 'none';
  document.getElementById('profile-chevron').classList.remove('open');
  dropdownOpen = false;
}

function deleteProfile(name) {
  delete profilesData[name];
  _persistProfiles();
  renderProfileDropdown();
  if (document.getElementById('profile-select-label').textContent === name) {
    document.getElementById('profile-select-label').textContent = 'Cargar perfil…';
  }
}

/* ── IMPORT / EXPORT profiles ── */
function exportProfiles() {
  const keys = Object.keys(profilesData);
  if (!keys.length) return showError('No hay perfiles para exportar.');
  const blob = new Blob([JSON.stringify(profilesData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ofusca-perfiles.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function importProfiles(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Formato inválido');
      for (const key of Object.keys(data)) {
        if (!Array.isArray(data[key])) throw new Error(`"${key}" no es una lista de reglas`);
      }
      Object.assign(profilesData, data);
      _persistProfiles();
      loadProfiles();
      showSuccess(`Importados ${Object.keys(data).length} perfil(es)`);
    } catch (e) { showError('Error al importar: ' + e.message); }
  };
  reader.readAsText(input.files[0], 'utf-8');
  input.value = '';
}

/* ════════════════════════════════
   URL SHARING
   ════════════════════════════════ */
function getHashParams() {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const params = {};
  if (hash.includes('=')) {
    hash.split('&').forEach(p => { const [k, v] = p.split('='); if (k && v) params[k] = v; });
  } else {
    params._legacy = hash;
  }
  return params;
}

function buildHash(params) {
  const parts = [];
  if (params.r) parts.push('r=' + params.r);
  if (params.o) parts.push('o=' + params.o);
  return parts.length ? '#' + parts.join('&') : '';
}

function encodeRulesToURL() {
  const active = rules.filter(r => r.from || r.to);
  const params = getHashParams();
  if (!active.length && !params.o) {
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }
  try {
    if (active.length) {
      params.r = btoa(JSON.stringify(active.map(r => ({
        type: r.type, from: r.from, to: r.to,
        case_sensitive: !!r.case_sensitive, enabled: r.enabled !== false
      }))));
    } else {
      delete params.r;
    }
    const hash = buildHash(params);
    window.history.replaceState({}, '', hash ? window.location.pathname + hash : window.location.pathname);
  } catch {}
}

function encodeResultToURL(text) {
  const params = getHashParams();
  if (!text) { delete params.o; }
  else { params.o = btoa(unescape(encodeURIComponent(text))); }
  const hash = buildHash(params);
  window.history.replaceState({}, '', hash ? window.location.pathname + hash : window.location.pathname);
}

function decodeRulesFromURL() {
  const params = getHashParams();
  const raw = params.r || params._legacy;
  if (!raw) return;
  try {
    const data = JSON.parse(atob(raw));
    if (!Array.isArray(data)) return;
    rules = data.map((r, i) => ({ ...r, id: Date.now() + i }));
    renderRules();
  } catch {}
}

function decodeResultFromURL() {
  const params = getHashParams();
  if (!params.o) return;
  try {
    const text = decodeURIComponent(escape(atob(params.o)));
    document.getElementById('output-text').value = text;
  } catch {}
}

function copyShareLink(withResult = false) {
  const base = window.location.pathname;
  const params = [];
  const activeRules = rules.filter(r => r.from || r.to);
  if (activeRules.length) {
    try {
      params.push('r=' + btoa(JSON.stringify(activeRules.map(r => ({
        type: r.type, from: r.from, to: r.to,
        case_sensitive: !!r.case_sensitive, enabled: r.enabled !== false
      })))));
    } catch {}
  }
  if (withResult) {
    const output = document.getElementById('output-text').value;
    if (output) {
      try { params.push('o=' + btoa(unescape(encodeURIComponent(output)))); } catch {}
    }
  }
  const url = window.location.origin + base + (params.length ? '#' + params.join('&') : '');
  copyToClipboard(url);
  showSuccess('Enlace copiado al portapapeles');
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
}

/* ════════════════════════════════
   EXPORT RULES AS TEXT
   ════════════════════════════════ */
function exportRulesSnippet() {
  const serialized = serializeRules().filter(r => r.from);
  if (!serialized.length) return showError('No hay reglas para exportar.');
  const text = serialized.map(r => `${r.type === 'regex' ? 'REGEX' : 'LITERAL'}  ${r.from}  →  ${r.to}`).join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showSuccess('Reglas copiadas al portapapeles'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showSuccess('Reglas copiadas al portapapeles');
  }
}

/* ════════════════════════════════
   CONFIGURATION PANEL
   ════════════════════════════════ */
/* ════════════════════════════════
   TABS
   ════════════════════════════════ */
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
}

/* ════════════════════════════════
   TEXT TRANSFORM
   ════════════════════════════════ */
function updateInputCount() {
  const len = document.getElementById('input-text').value.length;
  document.getElementById('input-count').textContent =
    len === 0 ? '0 caracteres' : `${len.toLocaleString('es')} caracteres`;
}

function runText(reverse = false) {
  const text = document.getElementById('input-text').value;
  if (!text.trim()) return showError('No hay texto en la entrada.');
  clearError();
  const rulesToApply = reverse
    ? serializeRules().slice().reverse().map(r => ({ type: r.type, from: r.to, to: r.from }))
    : serializeRules();
  const t0 = performance.now();
  const { result, matches, rulesUsed } = applyRules(text, rulesToApply);
  const ms = Math.round((performance.now() - t0) * 100) / 100;
  document.getElementById('output-text').value = result;
  updateDiffView(text, result);
  showStats({ matches, rules_used: rulesUsed, ms });
  flashHighlight(text, result);
}

function runTextReverse() {
  runText(true);
}

function clearOutput() {
  document.getElementById('output-text').value = '';
  document.getElementById('stats-panel').style.display = 'none';
  diffMode = false;
  document.getElementById('diff-view').style.display = 'none';
  document.getElementById('output-text').style.display = '';
  document.getElementById('diff-btn').textContent = 'Diff';
}

/* ════════════════════════════════
   DIFF VIEW
   ════════════════════════════════ */
function toggleDiff() {
  const input = document.getElementById('input-text').value;
  const output = document.getElementById('output-text').value;
  if (!output) return;
  diffMode = !diffMode;
  if (diffMode) {
    document.getElementById('output-text').style.display = 'none';
    document.getElementById('diff-view').style.display = 'block';
    document.getElementById('diff-view').innerHTML = generateDiffHTML(input, output);
    document.getElementById('diff-btn').textContent = 'Resultado';
  } else {
    document.getElementById('diff-view').style.display = 'none';
    document.getElementById('output-text').style.display = '';
    document.getElementById('diff-btn').textContent = 'Diff';
  }
}

function updateDiffView(input, output) {
  if (diffMode) {
    document.getElementById('diff-view').innerHTML = generateDiffHTML(input, output);
  }
}

function generateDiffHTML(a, b) {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const max = Math.max(linesA.length, linesB.length);
  let idxA = 0, idxB = 0;
  const parts = ['<table class="diff-table">'];
  for (let i = 0; i < max; i++) {
    const lineA = i < linesA.length ? linesA[i] : null;
    const lineB = i < linesB.length ? linesB[i] : null;
    if (lineA !== null && lineB !== null) {
      idxA++; idxB++;
      if (lineA === lineB) {
        parts.push(`<tr class="diff-same"><td class="diff-num">${idxA}</td><td class="diff-code">${esc(lineA)}</td></tr>`);
      } else {
        parts.push(`<tr class="diff-removed"><td class="diff-num">${idxA}</td><td class="diff-code">${esc(lineA)}</td></tr>`);
        parts.push(`<tr class="diff-added"><td class="diff-num">${idxB}</td><td class="diff-code">${esc(lineB)}</td></tr>`);
      }
    } else if (lineA !== null) {
      idxA++;
      parts.push(`<tr class="diff-removed"><td class="diff-num">${idxA}</td><td class="diff-code">${esc(lineA)}</td></tr>`);
    } else {
      idxB++;
      parts.push(`<tr class="diff-added"><td class="diff-num">${idxB}</td><td class="diff-code">${esc(lineB)}</td></tr>`);
    }
  }
  parts.push('</table>');
  return parts.join('');
}

/* ════════════════════════════════
   FILE / BATCH TRANSFORM
   ════════════════════════════════ */
function handleFileSelect(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  if (files.length === 1) {
    setFile(files[0]);
  } else {
    setFiles(files);
  }
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  if (!files.length) return;
  if (files.length === 1) setFile(files[0]);
  else setFiles(files);
}

function setFile(f) {
  selectedFiles = [f];
  document.getElementById('drop-zone').style.display = 'none';
  document.getElementById('file-info').style.display = 'flex';
  document.getElementById('file-multi').style.display = 'none';
  document.getElementById('file-name').textContent = f.name;
  document.getElementById('file-size').textContent = fmtBytes(f.size);
  document.getElementById('btn-transform-file').textContent = 'Transformar y descargar';
}

function setFiles(files) {
  selectedFiles = files;
  document.getElementById('drop-zone').style.display = 'none';
  document.getElementById('file-info').style.display = 'none';
  document.getElementById('file-multi').style.display = 'flex';
  document.getElementById('file-count').textContent = `${files.length} archivos seleccionados`;
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  document.getElementById('file-total-size').textContent = fmtBytes(totalSize);
}

function clearFile() {
  selectedFiles = [];
  document.getElementById('file-input').value = '';
  document.getElementById('drop-zone').style.display = 'flex';
  document.getElementById('file-info').style.display = 'none';
  document.getElementById('file-multi').style.display = 'none';
  document.getElementById('file-progress').style.display = 'none';
}

function runFile() {
  if (!selectedFiles.length) return showError('Seleccioná un archivo primero.');
  for (const f of selectedFiles) {
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      return showError(`"${f.name}" supera el límite de ${MAX_FILE_MB} MB.`);
    }
  }
  clearError();
  if (selectedFiles.length === 1) {
    processFile(selectedFiles[0], 0, 1);
  } else {
    processFileBatch();
  }
}

function processFile(file, idx, total) {
  const progress = document.getElementById('file-progress');
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  progress.style.display = 'flex';
  fill.style.width = '10%';
  label.textContent = total > 1 ? `[${idx + 1}/${total}] Leyendo ${file.name}…` : 'Leyendo archivo…';

  const reader = new FileReader();
  reader.onprogress = e => {
    if (e.lengthComputable) {
      const pct = 10 + Math.round((e.loaded / e.total) * 40);
      fill.style.width = pct + '%';
    }
  };
  reader.onload = () => {
    fill.style.width = '55%';
    label.textContent = total > 1 ? `[${idx + 1}/${total}] Aplicando reglas…` : 'Aplicando reglas…';

    let text;
    try {
      text = typeof reader.result === 'string' ? reader.result : new TextDecoder('utf-8').decode(reader.result);
    } catch {
      try { text = new TextDecoder('latin-1').decode(reader.result); }
      catch { progress.style.display = 'none'; showError(`No se pudo decodificar "${file.name}".`); return; }
    }

    const t0 = performance.now();
    const { result, matches, rulesUsed } = applyRules(text, serializeRules());
    const ms = Math.round((performance.now() - t0) * 100) / 100;

    fill.style.width = '85%';
    label.textContent = total > 1 ? `[${idx + 1}/${total}] Descargando ${file.name}…` : 'Preparando descarga…';

    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const extIdx = file.name.lastIndexOf('.');
    const outName = extIdx !== -1 ? `${file.name.slice(0, extIdx)}-ofusca${file.name.slice(extIdx)}` : `${file.name}-ofusca`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = outName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    if (idx + 1 < total) {
      fill.style.width = '100%';
      setTimeout(() => { fill.style.width = '10%'; processFile(selectedFiles[idx + 1], idx + 1, total); }, 500);
    } else {
      fill.style.width = '100%';
      label.textContent = `✓ ${total} archivo${total !== 1 ? 's' : ''} transformado${total !== 1 ? 's' : ''}`;
      showStats({ matches, rules_used: rulesUsed, ms });
      flashHighlight(text, result);
      setTimeout(() => { progress.style.display = 'none'; fill.style.width = '0%'; }, 5000);
    }
  };
  reader.onerror = () => { progress.style.display = 'none'; showError(`Error al leer "${file.name}".`); };
  reader.readAsText(file, 'utf-8');
}

function processFileBatch() {
  processFile(selectedFiles[0], 0, selectedFiles.length);
}

/* ════════════════════════════════
   CLEAR / COPY
   ════════════════════════════════ */
function clearAll() {
  document.getElementById('input-text').value = '';
  document.getElementById('output-text').value = '';
  document.getElementById('diff-view').innerHTML = '';
  document.getElementById('diff-view').style.display = 'none';
  document.getElementById('output-text').style.display = '';
  diffMode = false;
  const db = document.getElementById('diff-btn');
  if (db) db.textContent = 'Diff';
  document.getElementById('input-count').textContent = '0 caracteres';
  document.getElementById('stats-panel').style.display = 'none';
  clearError();
  clearFile();
}

async function copyResult() {
  const text = document.getElementById('output-text').value;
  if (!text) return;
  let success = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text); success = true;
    }
  } catch (_) {}
  if (!success) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { success = document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  }
  if (success) {
    const btn = document.getElementById('copy-btn');
    btn.classList.add('success');
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiado';
    setTimeout(() => {
      btn.classList.remove('success');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar';
    }, 2200);
  }
}

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
function serializeRules() {
  return rules.map(r => ({
    type: r.type, from: r.from, to: r.to,
    case_sensitive: !!r.case_sensitive,
    enabled: r.enabled !== undefined ? r.enabled : undefined
  }));
}

function showStats(s) {
  document.getElementById('stats-panel').style.display = 'flex';
  document.getElementById('stat-matches').textContent = s.matches ?? 0;
  document.getElementById('stat-rules').textContent = s.rules_used ?? 0;
  document.getElementById('stat-ms').textContent = s.ms != null ? (s.ms < 1 ? '<1' : s.ms) : 0;
}

function showSuccess(msg) {
  const b = document.getElementById('error-bar');
  b.textContent = '✓ ' + msg;
  b.style.display = 'block';
  b.style.background = 'var(--success)';
  setTimeout(() => { b.style.display = 'none'; b.style.background = ''; }, 4000);
}

function showError(msg) {
  const b = document.getElementById('error-bar');
  b.textContent = msg;
  b.style.display = 'block';
  b.style.background = '';
  setTimeout(() => { b.style.display = 'none'; }, 6000);
}

function clearError() {
  document.getElementById('error-bar').style.display = 'none';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/* ════════════════════════════════
   KEYBOARD SHORTCUTS
   ════════════════════════════════ */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault(); undo(); return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault(); redo(); return;
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    if (activeTab === 'text') runTextReverse();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (activeTab === 'text') runText();
    else if (activeTab === 'file' && selectedFiles.length) runFile();
  }
  if (e.key === 'Escape' && dropdownOpen) {
    document.getElementById('profile-dropdown').style.display = 'none';
    document.getElementById('profile-chevron').classList.remove('open');
    dropdownOpen = false;
  }
});

/* ════════════════════════════════
   PWA
   ════════════════════════════════ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

/* ════════════════════════════════
   INIT
   ════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  registerSW();
  document.getElementById('footer-version').textContent = `v${APP_VERSION}`;
  decodeRulesFromURL();
  decodeResultFromURL();
  rules = [
    { id: 1, type: 'literal', from: 'dominio.com', to: 'localhost.local', case_sensitive: false, enabled: true },
    { id: 2, type: 'regex', from: '10\\.1\\.', to: '192.168.', case_sensitive: false, enabled: true },
  ];
  if (!window.location.hash.slice(1)) {
    renderRules();
  }
  loadProfiles();
});

function activarNeonBox(selector = '.editor-pane') {
  const el = document.querySelector(selector);
  if (!el) return;
  if (el._neonTimeout) clearTimeout(el._neonTimeout);
  el.classList.add('neon-box');
  el._neonTimeout = setTimeout(() => { el.classList.remove('neon-box'); el._neonTimeout = null; }, 3000);
}

function flashHighlight(input, output) {
  if (!output) return;

  const existing = document.getElementById('output-flash');
  if (existing) existing.remove();

  const linesA = input ? input.split('\n') : [];
  const linesB = output.split('\n');
  const max = Math.max(linesA.length, linesB.length);
  const parts = [];

  for (let i = 0; i < max; i++) {
    const lineA = i < linesA.length ? linesA[i] : '';
    const lineB = i < linesB.length ? linesB[i] : '';
    if (lineA === lineB) {
      parts.push(`<div>${esc(lineB || ' ')}</div>`);
    } else {
      parts.push(`<div>${tokenHighlight(lineA, lineB)}</div>`);
    }
  }

  const flash = document.createElement('div');
  flash.id = 'output-flash';
  flash.className = 'output-flash';
  flash.innerHTML = parts.join('');

  const textarea = document.getElementById('output-text');
  const diffView = document.getElementById('diff-view');
  textarea.style.display = 'none';
  diffView.style.display = 'none';
  textarea.parentNode.insertBefore(flash, diffView);

  setTimeout(() => {
    flash.remove();
    textarea.style.display = '';
  }, 3000);
}

function tokenHighlight(lineA, lineB) {
  const tokensA = lineA.split(/(\s+)/);
  const tokensB = lineB.split(/(\s+)/);
  const maxLen = Math.max(tokensA.length, tokensB.length);
  let html = '';
  for (let i = 0; i < maxLen; i++) {
    const a = i < tokensA.length ? tokensA[i] : '';
    const b = i < tokensB.length ? tokensB[i] : '';
    if (a !== b) {
      html += `<span class="flash-changed">${esc(b)}</span>`;
    } else {
      html += esc(b);
    }
  }
  return html || ' ';
}
