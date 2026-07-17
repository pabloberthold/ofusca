'use strict';

let rules        = [];
let globalRules  = [];
let selectedFile = null;
let activeTab    = 'text';
let profilesData = {};
let dropdownOpen = false;
let configOpen   = false;

const PROFILES_KEY    = 'ofusca-profiles';
const GLOBAL_RULES_KEY = 'ofusca-global-rules';

/* ════════════════════════════════
   THEME
   ════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem('ofusca-theme') || 'light';
  applyTheme(saved, false);
}

function applyTheme(t, animate = true) {
  if (animate) document.documentElement.style.transition = 'background 0.2s, color 0.2s';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('ofusca-theme', t);
  document.getElementById('icon-moon').style.display = t === 'dark'  ? '' : 'none';
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
    } catch (e) {
      /* skip invalid regex */;
    }
  }
  return { result: text, matches: totalMatches, rulesUsed };
}

/* ════════════════════════════════
   RULES
   ════════════════════════════════ */
function addRule(type) {
  rules.push({ id: Date.now(), type, from: '', to: '', case_sensitive: false });
  renderRules();
}

function removeRule(id) {
  rules = rules.filter(r => r.id !== id);
  renderRules();
}

function updateRule(id, field, value) {
  const r = rules.find(r => r.id === id);
  if (r) r[field] = value;
}

function renderRules() {
  const c = document.getElementById('rules-list');
  c.innerHTML = '';
  rules.forEach(rule => {
    const d = document.createElement('div');
    d.className = 'rule-card';
    d.innerHTML = `
      <div class="rule-card-top">
        <span class="type-pill pill-${rule.type}">${rule.type}</span>
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
        <input class="rule-field" type="text"
               placeholder="${rule.type === 'regex' ? 'patrón regex…' : 'texto a buscar…'}"
               value="${esc(rule.from)}"
               oninput="updateRule(${rule.id},'from',this.value)" />
      </div>
      <div class="rule-row">
        <span class="rule-label">a</span>
        <input class="rule-field" type="text"
               placeholder="reemplazar por…"
               value="${esc(rule.to)}"
               oninput="updateRule(${rule.id},'to',this.value)" />
      </div>`;
    c.appendChild(d);
  });
  document.getElementById('rule-counter').textContent = rules.length;
}

/* ════════════════════════════════
   PROFILES (localStorage)
   ════════════════════════════════ */
function loadProfiles() {
  try {
    profilesData = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
  } catch {
    profilesData = {};
  }
  renderProfileDropdown();
  const enabledGlobals = globalRules.filter(r => r.enabled);
  if (enabledGlobals.length > 0) {
    const existingRuleIds = rules.map(r => r.id);
    enabledGlobals.forEach(g => {
      if (!existingRuleIds.includes(g.id)) {
        rules.push({ ...g });
      }
    });
    renderRules();
  }
  if (profilesData['default'] && profilesData['default'].length > 0) {
    applyProfile('default');
  }
}

function renderProfileDropdown() {
  const list  = document.getElementById('profile-dropdown-list');
  list.innerHTML = '';
  let names = Object.keys(profilesData).sort((a, b) => {
    if (a.toLowerCase() === 'default') return -1;
    if (b.toLowerCase() === 'default') return  1;
    return a.localeCompare(b);
  });
  if (!names.length) {
    list.innerHTML = '<div class="profile-dropdown-empty">Sin perfiles guardados</div>';
    return;
  }
  names.forEach(name => {
    const ruleCount  = (profilesData[name] || []).length;
    const isDefault  = name.toLowerCase() === 'default';
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
  const dd      = document.getElementById('profile-dropdown');
  const chevron = document.getElementById('profile-chevron');
  dropdownOpen  = !dropdownOpen;
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
  if (!name) {
    document.getElementById('profile-name').focus();
    return;
  }
  profilesData[name] = serializeRules();
  _persistProfiles();
  document.getElementById('profile-name').value = '';
  loadProfiles();
  const btn = document.querySelector('.btn-save-profile');
  const orig = btn.innerHTML;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Guardado';
  btn.style.background = 'var(--success)';
  setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2000);
}

function applyProfile(name) {
  const profileRules = profilesData[name] || [];
  const existingRuleIds = rules.map(r => r.id);
  const filteredProfileRules = profileRules.filter(r => !globalRules.some(g => g.id === r.id));
  filteredProfileRules.forEach((r, i) => {
    if (!existingRuleIds.includes(r.id)) {
      rules.push({ ...r, id: Date.now() + i, case_sensitive: !!r.case_sensitive });
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

/* ════════════════════════════════
   CONFIGURATION PANEL
   ════════════════════════════════ */
function toggleConfigPanel() {
  configOpen = true;
  document.getElementById('config-overlay').style.display = 'flex';
  renderConfigPanel();
}

function closeConfigPanel() {
  configOpen = false;
  document.getElementById('config-overlay').style.display = 'none';
}

function renderConfigPanel() {
  const globalRulesContainer = document.getElementById('config-global-rules');
  globalRulesContainer.innerHTML = '';
  globalRules.forEach(rule => {
    const div = document.createElement('div');
    div.className = 'config-item';
    div.innerHTML = `
      <input type="checkbox" ${rule.enabled ? 'checked' : ''}
             onchange="toggleGlobalRule('${rule.id}')"
             title="Activar/desactivar esta regla">
      <div class="config-item-readonly">
        <strong>${esc(rule.from)}</strong> → <strong>${esc(rule.to)}</strong>
        <span class="type-pill pill-${rule.type}">${rule.type}</span>
      </div>
    `;
    globalRulesContainer.appendChild(div);
  });
  const profilesContainer = document.getElementById('config-profiles');
  profilesContainer.innerHTML = '';
  const names = Object.keys(profilesData).sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    profilesContainer.innerHTML = '<div class="config-section-empty">Sin perfiles guardados</div>';
  } else {
    names.forEach(name => {
      const d = document.createElement('div');
      d.className = 'config-item';
      d.innerHTML = `
        <input type="checkbox" ${name === 'default' ? 'checked' : ''}
               onchange="applyProfile('${esc(name)}')"
               ${name === 'default' ? 'disabled' : ''}
               title="${name === 'default' ? 'Perfil por defecto' : 'Cargar perfil'}">
        <span class="config-item-readonly">${esc(name)}${name === 'default' ? ' <span class="default-badge">default</span>' : ''}</span>
      `;
      profilesContainer.appendChild(d);
    });
  }
}

function toggleGlobalRule(id) {
  const rule = globalRules.find(r => r.id === id);
  if (rule) {
    rule.enabled = !rule.enabled;
    const currentRule = rules.find(r => r.id === id);
    if (currentRule) {
      currentRule.enabled = rule.enabled;
    }
    renderConfigPanel();
  }
}

function addGlobalRule() {
  const newRule = {
    id: 'global-' + Date.now(),
    type: 'regex',
    from: '',
    to: '',
    case_sensitive: false,
    enabled: true
  };
  globalRules.push(newRule);
  renderConfigPanel();
}

function saveConfig() {
  const globals = globalRules.map(r => ({
    id: r.id, type: r.type, from: r.from, to: r.to,
    case_sensitive: !!r.case_sensitive, enabled: r.enabled
  }));
  localStorage.setItem(GLOBAL_RULES_KEY, JSON.stringify(globals));
  closeConfigPanel();
  loadProfiles();
  showError('Configuración guardada exitosamente');
}

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

function runText() {
  activarNeonBox('#output-pane');
  const text = document.getElementById('input-text').value;
  if (!text.trim()) return showError('No hay texto en la entrada.');
  clearError();
  const btn = document.querySelector('.run-btn');
  btn.style.transform = 'scale(0.93)';
  setTimeout(() => btn.style.transform = '', 120);
  const t0 = performance.now();
  const { result, matches, rulesUsed } = applyRules(text, serializeRules());
  const ms = Math.round((performance.now() - t0) * 100) / 100;
  document.getElementById('output-text').value = result;
  showStats({ matches, rules_used: rulesUsed, ms });
}

function runTextReverse() {
  activarNeonBox('#output-pane');
  const text = document.getElementById('input-text').value;
  if (!text.trim()) return showError('No hay texto en la entrada.');
  clearError();
  const btn = document.querySelector('.run-btn-reverse');
  btn.style.transform = 'scale(0.93)';
  setTimeout(() => btn.style.transform = '', 120);
  const reversedRules = serializeRules().slice().reverse().map(r => ({ type: r.type, from: r.to, to: r.from }));
  const t0 = performance.now();
  const { result, matches, rulesUsed } = applyRules(text, reversedRules);
  const ms = Math.round((performance.now() - t0) * 100) / 100;
  document.getElementById('output-text').value = result;
  showStats({ matches, rules_used: rulesUsed, ms });
}

function clearOutput() {
  document.getElementById('output-text').value = '';
  document.getElementById('stats-panel').style.display = 'none';
}

/* ════════════════════════════════
   FILE TRANSFORM (client-side)
   ════════════════════════════════ */
function handleFileSelect(input) { if (input.files[0]) setFile(input.files[0]); }

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
}

function setFile(f) {
  selectedFile = f;
  document.getElementById('drop-zone').style.display   = 'none';
  document.getElementById('file-info').style.display   = 'flex';
  document.getElementById('file-name').textContent     = f.name;
  document.getElementById('file-size').textContent     = fmtBytes(f.size);
}

function clearFile() {
  selectedFile = null;
  document.getElementById('file-input').value          = '';
  document.getElementById('drop-zone').style.display   = 'flex';
  document.getElementById('file-info').style.display   = 'none';
  document.getElementById('file-progress').style.display = 'none';
}

const MAX_FILE_MB = 200;

function runFile() {
  if (!selectedFile) return showError('Seleccioná un archivo primero.');
  if (selectedFile.size > MAX_FILE_MB * 1024 * 1024) {
    return showError(`El archivo supera el límite de ${MAX_FILE_MB} MB.`);
  }
  clearError();

  const progress = document.getElementById('file-progress');
  const fill     = document.getElementById('progress-fill');
  const label    = document.getElementById('progress-label');
  progress.style.display = 'flex';
  fill.style.width = '10%';
  label.textContent = 'Leyendo archivo…';

  const reader = new FileReader();
  reader.onprogress = e => {
    if (e.lengthComputable) {
      const pct = 10 + Math.round((e.loaded / e.total) * 40);
      fill.style.width = pct + '%';
    }
  };

  reader.onload = () => {
    fill.style.width = '55%';
    label.textContent = 'Aplicando reglas…';

    let text;
    const raw = reader.result;
    try {
      text = typeof raw === 'string' ? raw : new TextDecoder('utf-8').decode(raw);
    } catch {
      try {
        text = new TextDecoder('latin-1').decode(raw);
      } catch {
        progress.style.display = 'none';
        return showError('No se pudo decodificar el archivo.');
      }
    }

    const t0 = performance.now();
    const { result, matches, rulesUsed } = applyRules(text, serializeRules());
    const ms = Math.round((performance.now() - t0) * 100) / 100;

    fill.style.width = '85%';
    label.textContent = 'Preparando descarga…';

    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const original = selectedFile.name;
    const idx = original.lastIndexOf('.');
    const outName = idx !== -1 ? `${original.slice(0, idx)}-ofusca${original.slice(idx)}` : `${original}-ofusca`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    fill.style.width = '100%';
    label.textContent = `✓ Listo — ${matches} reemplazos · ${rulesUsed} reglas · ${ms} ms`;
    showStats({ matches, rules_used: rulesUsed, ms });
    setTimeout(() => { progress.style.display = 'none'; fill.style.width = '0%'; }, 6000);
  };

  reader.onerror = () => {
    progress.style.display = 'none';
    showError('Error al leer el archivo.');
  };

  reader.readAsText(selectedFile, 'utf-8');
}

/* ════════════════════════════════
   CLEAR / COPY
   ════════════════════════════════ */
function clearAll() {
  document.getElementById('input-text').value  = '';
  document.getElementById('output-text').value = '';
  document.getElementById('input-count').textContent = '0 caracteres';
  document.getElementById('stats-panel').style.display = 'none';
  clearError();
  clearFile();
}

async function copyResult() {
  const textArea = document.getElementById('output-text');
  const text = textArea.value;
  if (!text) return;
  let success = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      success = true;
    }
  } catch (_) {}
  if (!success) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      success = document.execCommand('copy');
    } catch (_) {}
    document.body.removeChild(textarea);
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
    type: r.type,
    from: r.from,
    to: r.to,
    case_sensitive: !!r.case_sensitive,
    enabled: r.enabled !== undefined ? r.enabled : undefined
  }));
}

function showStats(s) {
  document.getElementById('stats-panel').style.display = 'flex';
  document.getElementById('stat-matches').textContent  = s.matches    ?? 0;
  document.getElementById('stat-rules').textContent    = s.rules_used ?? 0;
  document.getElementById('stat-ms').textContent       = s.ms != null ? (s.ms < 1 ? '<1' : s.ms) : 0;
}

function showError(msg) {
  const b = document.getElementById('error-bar');
  b.textContent = msg;
  b.style.display = 'block';
  setTimeout(() => { b.style.display = 'none'; }, 6000);
}

function clearError() {
  document.getElementById('error-bar').style.display = 'none';
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtBytes(b) {
  if (b < 1024)     return `${b} B`;
  if (b < 1048576)  return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/* ════════════════════════════════
   KEYBOARD SHORTCUTS
   ════════════════════════════════ */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    if (activeTab === 'text') runTextReverse();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (activeTab === 'text') runText();
    else if (activeTab === 'file' && selectedFile) runFile();
  }
  if (e.key === 'Escape' && dropdownOpen) {
    document.getElementById('profile-dropdown').style.display = 'none';
    document.getElementById('profile-chevron').classList.remove('open');
    dropdownOpen = false;
  }
});

/* ════════════════════════════════
   INIT
   ════════════════════════════════ */
function initGlobalRules() {
  try {
    globalRules = JSON.parse(localStorage.getItem(GLOBAL_RULES_KEY)) || [];
  } catch {
    globalRules = [];
  }
  if (!globalRules.length) {
    globalRules = [
      {
        id: 'global-usuario',
        type: 'regex',
        from: '([A-Za-z])([0-9]{6})',
        to: 'USUARIO-\\1',
        case_sensitive: false,
        enabled: true
      }
    ];
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initGlobalRules();
  rules = [
    { id: 1, type: 'literal', from: 'dominio.com', to: 'localhost.local', case_sensitive: false },
    { id: 2, type: 'regex',   from: '10\\.1\\.',   to: '192.168.',        case_sensitive: false },
  ];
  renderRules();
  loadProfiles();
});

function activarNeonBox(selector = '.editor-pane') {
  const el = document.querySelector(selector);
  if (!el) return;
  if (el._neonTimeout) {
    clearTimeout(el._neonTimeout);
  }
  el.classList.add('neon-box');
  el._neonTimeout = setTimeout(() => {
    el.classList.remove('neon-box');
    el._neonTimeout = null;
  }, 15000);
}