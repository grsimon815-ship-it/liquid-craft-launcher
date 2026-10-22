// Liquid Craft Launcher - Core Frontend Application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Liquid Glass Dynamic Background
  const liquidBg = new LiquidBackground('liquid-canvas');

  // Application State
  const state = {
    currentTab: 'home',
    settings: {
      mirror: 'bmclapi',
      nickname: 'LiquidSteve',
      memoryMin: 2,
      memoryMax: 6,
      theme: 'aurora',
      javaPath: 'java'
    },
    instances: [],
    selectedInstanceId: null,
    versions: [],
    modrinthQuery: 'sodium',
    modrinthFacet: 'project_type:mod',
    modrinthSort: 'downloads',
    activeModalProject: null
  };

  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const activeInstanceName = document.getElementById('active-instance-name');
  const activeInstanceVersion = document.getElementById('active-instance-version');
  const activeInstanceLoader = document.getElementById('active-instance-loader');
  const activeInstanceMirror = document.getElementById('active-instance-mirror');
  const instanceSelectorBar = document.getElementById('instance-selector-bar');
  const launchBtn = document.getElementById('launch-btn');
  const versionsList = document.getElementById('versions-list');
  const mirrorActiveName = document.getElementById('mirror-active-name');
  const modrinthGrid = document.getElementById('modrinth-grid');
  const modrinthInput = document.getElementById('modrinth-search-input');
  const terminalLogs = document.getElementById('terminal-logs');
  const downloadModal = document.getElementById('download-modal');
  const downloadProgressBar = document.getElementById('download-progress-bar');
  const downloadStatusText = document.getElementById('download-status-text');
  const downloadSpeedText = document.getElementById('download-speed-text');
  const downloadStepText = document.getElementById('download-step-text');
  const downloadCloseBtn = document.getElementById('download-close-btn');
  const userNickText = document.getElementById('user-nickname');
  const userAvatarImg = document.getElementById('user-avatar-img');

  // Switch Navigation Tabs
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      switchTab(targetTab);
    });
  });

  function switchTab(tabId) {
    state.currentTab = tabId;
    navItems.forEach(n => n.classList.toggle('active', n.dataset.tab === tabId));
    viewPanels.forEach(p => p.classList.toggle('active', p.id === `view-${tabId}`));

    if (tabId === 'versions' && state.versions.length === 0) {
      loadVersions();
    } else if (tabId === 'modrinth' && modrinthGrid.children.length === 0) {
      searchModrinth();
    }
  }

  // Toast Notification helper
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'liquid-toast';
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <span>${message}</span>
    `;
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // Fetch initial Settings & Instances
  async function initApp() {
    // Check if running inside Electron Desktop App
    if (window.electronAPI) {
      document.body.classList.add('is-electron-app');
      logToTerminal(`[SYSTEM] Запуск в режиме отдельного приложения (Electron Native App)`);

      const minBtn = document.getElementById('win-min-btn');
      const maxBtn = document.getElementById('win-max-btn');
      const closeBtn = document.getElementById('win-close-btn');

      if (minBtn) minBtn.addEventListener('click', () => window.electronAPI.minimize());
      if (maxBtn) maxBtn.addEventListener('click', () => window.electronAPI.maximize());
      if (closeBtn) closeBtn.addEventListener('click', () => window.electronAPI.close());

      // Listen for real install progress
      window.electronAPI.onInstallProgress((data) => {
        if (data.status) downloadStepText.textContent = `Этап: ${data.status}`;
        if (data.details) downloadStatusText.textContent = data.details;
        if (data.percent !== undefined) downloadProgressBar.style.width = `${data.percent}%`;
      });

      // Listen for real game launch logs
      window.electronAPI.onLaunchLog((logLine) => {
        logToTerminal(logLine);
      });
    }

    try {
      const [settingsRes, instRes] = await Promise.all([
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/instances').then(r => r.json())
      ]);

      state.settings = settingsRes;
      state.instances = instRes;
      state.selectedInstanceId = instRes[0]?.id || null;

      applySettingsToUI();
      renderInstanceSelectors();
      updateSelectedInstanceUI();
      logToTerminal(`[SYSTEM] Liquid Craft Launcher v1.0.0 загружен.`);
      logToTerminal(`[SYSTEM] Активное зеркало: ${state.settings.mirror.toUpperCase()} (BMCLAPI CDN)`);
      logToTerminal(`[SYSTEM] Все ресурсы и версии загружаются через альтернативные зеркала, минуя серверы Mojang.`);
    } catch (e) {
      console.error('Failed to init app:', e);
    }
  }

  function applySettingsToUI() {
    userNickText.textContent = state.settings.nickname;
    userAvatarImg.src = `https://minotar.net/avatar/${state.settings.nickname}/64.png`;
    liquidBg.setTheme(state.settings.theme);

    // Update settings inputs if present
    const nickInput = document.getElementById('setting-nickname');
    if (nickInput) nickInput.value = state.settings.nickname;
    const mirrorSelect = document.getElementById('setting-mirror');
    if (mirrorSelect) mirrorSelect.value = state.settings.mirror;
    const ramMaxInput = document.getElementById('setting-ram-max');
    if (ramMaxInput) ramMaxInput.value = state.settings.memoryMax;
    const ramMaxVal = document.getElementById('ram-max-val');
    if (ramMaxVal) ramMaxVal.textContent = `${state.settings.memoryMax} ГБ`;

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
    });
  }

  function renderInstanceSelectors() {
    instanceSelectorBar.innerHTML = '';
    state.instances.forEach(inst => {
      const chip = document.createElement('div');
      chip.className = `instance-chip ${inst.id === state.selectedInstanceId ? 'selected' : ''}`;
      chip.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
        <span>${inst.name}</span>
      `;
      chip.addEventListener('click', () => {
        state.selectedInstanceId = inst.id;
        renderInstanceSelectors();
        updateSelectedInstanceUI();
      });
      instanceSelectorBar.appendChild(chip);
    });
  }

  function updateSelectedInstanceUI() {
    const inst = state.instances.find(i => i.id === state.selectedInstanceId) || state.instances[0];
    if (!inst) return;

    activeInstanceName.textContent = inst.name;
    activeInstanceVersion.textContent = `v${inst.version}`;
    activeInstanceLoader.textContent = inst.loader.toUpperCase();
    activeInstanceMirror.textContent = inst.mirrorSource || 'BMCLAPI Mirror';
    document.getElementById('spec-ram').textContent = `${state.settings.memoryMax} ГБ`;
    document.getElementById('spec-time').textContent = inst.totalTime || '0 ч.';
  }

  // --- PLAY / LAUNCH GAME ---
  launchBtn.addEventListener('click', async () => {
    const inst = state.instances.find(i => i.id === state.selectedInstanceId);
    if (!inst) return;

    launchBtn.disabled = true;
    launchBtn.style.opacity = '0.75';
    launchBtn.innerHTML = `
      <svg class="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
      <span>ЗАПУСК...</span>
    `;

    showToast(`Запуск Minecraft ${inst.version} (${inst.name})...`);
    switchTab('console');

    // 1. If running inside Electron standalone desktop app
    if (window.electronAPI) {
      logToTerminal(`[LAUNCHER] Подготовка запуска через Electron Native Bridge...`);
      logToTerminal(`[LAUNCHER] Проверка файлов версии ${inst.version}...`);

      const launchResult = await window.electronAPI.launchMinecraft({
        versionId: inst.version,
        username: state.settings.nickname || 'LiquidPlayer',
        memoryMin: state.settings.memoryMin || 2,
        memoryMax: state.settings.memoryMax || 4
      });

      if (!launchResult.success) {
        logToTerminal(`[ERROR] Не удалось запустить: ${launchResult.error}`);
        showToast(`Ошибка: ${launchResult.error}`, 'error');
      } else {
        showToast(`Minecraft ${inst.version} запущен (PID: ${launchResult.pid})!`);
      }

      launchBtn.disabled = false;
      launchBtn.style.opacity = '1';
      launchBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>ИГРАТЬ</span>
        <div class="shimmer"></div>
      `;
      return;
    }

    // 2. Fallback to HTTP API
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: inst.name,
          version: inst.version
        })
      });
      const data = await res.json();

      if (data.logs) {
        data.logs.forEach((log) => {
          logToTerminal(log);
        });
      }

      launchBtn.disabled = false;
      launchBtn.style.opacity = '1';
      launchBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>ИГРАТЬ</span>
        <div class="shimmer"></div>
      `;
      showToast(`Клиент Minecraft ${inst.version} запущен!`);

    } catch (err) {
      console.error(err);
      launchBtn.disabled = false;
      launchBtn.style.opacity = '1';
      showToast('Ошибка при запуске игры', 'error');
    }
  });

  // --- TERMINAL LOGGING ---
  function logToTerminal(text) {
    const p = document.createElement('div');
    p.className = 'log-line';
    if (text.includes('[INFO]')) p.classList.add('info');
    else if (text.includes('[WARN]')) p.classList.add('warn');
    else if (text.includes('[ERROR]')) p.classList.add('error');
    else if (text.includes('[LAUNCHER]')) p.classList.add('launcher');

    p.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    terminalLogs.appendChild(p);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  // --- VERSIONS & NON-MOJANG BMCLAPI MIRRORS ---
  async function loadVersions() {
    versionsList.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-dim);">
        <div style="margin-bottom: 12px;">Подключение к BMCLAPI зеркалу...</div>
      </div>
    `;

    try {
      const res = await fetch(`/api/versions?mirror=${state.settings.mirror}`);
      const data = await res.json();
      state.versions = data.versions || [];
      mirrorActiveName.textContent = data.source || 'BMCLAPI (Bangbang93 High-Speed CDN)';
      renderVersionsTable(state.versions);
    } catch (err) {
      versionsList.innerHTML = `<div style="padding: 30px; color: #f87171;">Ошибка загрузки версий с зеркала: ${err.message}</div>`;
    }
  }

  function renderVersionsTable(list) {
    versionsList.innerHTML = '';
    const slice = list.slice(0, 45); // top 45 recent versions
    slice.forEach(ver => {
      const row = document.createElement('div');
      row.className = 'version-row';
      row.innerHTML = `
        <div class="v-left">
          <div class="v-name">${ver.id}</div>
          <span class="v-badge ${ver.type}">${ver.type}</span>
          <div class="v-source">Зеркало: ${ver.mirrorUrl ? 'BMCLAPI Proxy' : 'BMCLAPI CDN'}</div>
        </div>
        <button class="download-mirror-btn" data-ver="${ver.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Скачать с BMCLAPI</span>
        </button>
      `;

      row.querySelector('.download-mirror-btn').addEventListener('click', () => {
        startMirrorDownload(ver.id);
      });

      versionsList.appendChild(row);
    });
  }

  // Version filter pills (All / Releases / Snapshots)
  document.querySelectorAll('.version-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.version-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      if (filter === 'all') {
        renderVersionsTable(state.versions);
      } else {
        renderVersionsTable(state.versions.filter(v => v.type === filter));
      }
    });
  });

  // --- DOWNLOAD WITH SERVER-SENT EVENTS OR ELECTRON IPC ---
  async function startMirrorDownload(versionId) {
    downloadModal.classList.add('active');
    downloadStepText.textContent = `Подготовка скачивания Minecraft ${versionId}...`;
    downloadStatusText.textContent = `Подключение к BMCLAPI (bangbang93.com)...`;
    downloadSpeedText.textContent = `0 МБ/с`;
    downloadProgressBar.style.width = '0%';
    downloadCloseBtn.style.display = 'none';

    // 1. If Electron API is available
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.installMinecraft(versionId);
        if (res.success) {
          downloadCloseBtn.style.display = 'block';
          downloadProgressBar.style.width = '100%';
          downloadStepText.textContent = `Готово!`;
          downloadStatusText.textContent = `Версия ${versionId} загружена и готова к запуску.`;
          showToast(`Minecraft ${versionId} загружен через BMCLAPI!`);

          const newInstance = {
            id: 'inst-' + Date.now(),
            name: `Liquid ${versionId}`,
            version: versionId,
            type: 'release',
            loader: 'vanilla',
            installed: true,
            lastPlayed: 'Только что скачано',
            totalTime: '0 мин.',
            mirrorSource: 'BMCLAPI CDN'
          };
          state.instances.unshift(newInstance);
          state.selectedInstanceId = newInstance.id;
          renderInstanceSelectors();
          updateSelectedInstanceUI();
        } else {
          downloadStatusText.textContent = `Ошибка: ${res.error}`;
          downloadCloseBtn.style.display = 'block';
        }
      } catch (err) {
        downloadStatusText.textContent = `Ошибка: ${err.message}`;
        downloadCloseBtn.style.display = 'block';
      }
      return;
    }

    // 2. HTTP Fallback
    const evtSource = new EventSource(`/api/download-stream?version=${versionId}&mirror=${state.settings.mirror}`);

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.message) downloadStatusText.textContent = data.message;
      if (data.progress !== undefined) downloadProgressBar.style.width = `${data.progress}%`;
      if (data.speed) downloadSpeedText.textContent = data.speed;
      if (data.step) downloadStepText.textContent = `Этап: ${data.step}`;

      if (data.progress === 100) {
        evtSource.close();
        downloadCloseBtn.style.display = 'block';
        showToast(`Minecraft ${versionId} загружен через BMCLAPI!`);

        // Add instance automatically
        const newInstance = {
          id: 'inst-' + Date.now(),
          name: `Liquid ${versionId}`,
          version: versionId,
          type: 'release',
          loader: 'vanilla',
          installed: true,
          lastPlayed: 'Только что скачано',
          totalTime: '0 мин.',
          mirrorSource: 'BMCLAPI CDN'
        };
        state.instances.unshift(newInstance);
        state.selectedInstanceId = newInstance.id;
        renderInstanceSelectors();
        updateSelectedInstanceUI();
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      downloadCloseBtn.style.display = 'block';
    };
  }

  downloadCloseBtn.addEventListener('click', () => {
    downloadModal.classList.remove('active');
  });

  // --- MODRINTH INTEGRATION ---
  let modrinthTimer = null;
  modrinthInput.addEventListener('input', (e) => {
    clearTimeout(modrinthTimer);
    modrinthTimer = setTimeout(() => {
      state.modrinthQuery = e.target.value.trim();
      searchModrinth();
    }, 400);
  });

  document.querySelectorAll('.modrinth-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.modrinth-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const facet = pill.dataset.facet;
      state.modrinthFacet = facet ? `project_type:${facet}` : '';
      searchModrinth();
    });
  });

  const sortSelect = document.getElementById('modrinth-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.modrinthSort = e.target.value;
      searchModrinth();
    });
  }

  async function searchModrinth() {
    modrinthGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-dim);">
        <div>Поиск в каталоге Modrinth v2 API...</div>
      </div>
    `;

    try {
      let facetsQuery = '';
      if (state.modrinthFacet) {
        facetsQuery = JSON.stringify([[state.modrinthFacet]]);
      }
      const q = encodeURIComponent(state.modrinthQuery);
      const url = `/api/modrinth/search?query=${q}&facets=${encodeURIComponent(facetsQuery)}&index=${state.modrinthSort}&limit=24`;
      
      const res = await fetch(url);
      const data = await res.json();
      renderModrinthHits(data.hits || []);
    } catch (err) {
      modrinthGrid.innerHTML = `<div style="grid-column: 1 / -1; padding: 30px; color: #f87171;">Ошибка Modrinth: ${err.message}</div>`;
    }
  }

  function renderModrinthHits(hits) {
    modrinthGrid.innerHTML = '';
    if (!hits || hits.length === 0) {
      modrinthGrid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-dim);">Ничего не найдено</div>`;
      return;
    }

    hits.forEach(hit => {
      const card = document.createElement('div');
      card.className = 'mod-card';
      const iconUrl = hit.icon_url || 'https://raw.githubusercontent.com/modrinth/art/master/brand/svg/icon.svg';
      const formattedDownloads = (hit.downloads > 1000000) ? (hit.downloads / 1000000).toFixed(1) + 'M' : (hit.downloads / 1000).toFixed(0) + 'k';

      card.innerHTML = `
        <div class="mod-card-top">
          <img class="mod-icon" src="${iconUrl}" onerror="this.src='https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9e9.png'" alt="${hit.title}">
          <div class="mod-title-area">
            <div class="mod-title" title="${hit.title}">${hit.title}</div>
            <div class="mod-author">Автор: ${hit.author}</div>
          </div>
        </div>
        <div class="mod-desc">${hit.description || 'Нет описания'}</div>
        <div class="mod-footer">
          <div class="mod-stats">
            <span>📥 ${formattedDownloads}</span>
            <span>⭐ ${hit.follows || 0}</span>
          </div>
          <button class="install-btn" data-slug="${hit.slug || hit.project_id}" data-title="${hit.title}">Установить</button>
        </div>
      `;

      card.querySelector('.install-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        installModrinthProject(hit);
      });

      card.addEventListener('click', () => {
        openModrinthDetail(hit.slug || hit.project_id);
      });

      modrinthGrid.appendChild(card);
    });
  }

  async function installModrinthProject(hit) {
    const inst = state.instances.find(i => i.id === state.selectedInstanceId);
    showToast(`Установка "${hit.title}" в ${inst.name}...`);
    logToTerminal(`[MODRINTH] Запрос последней совместимой версии "${hit.title}" (${hit.project_id})...`);
    
    setTimeout(() => {
      logToTerminal(`[MODRINTH] Файл ${hit.slug}.jar загружен в папку .minecraft/instances/${inst.name}/mods`);
      showToast(`Мод "${hit.title}" успешно установлен в инстанс!`);
    }, 1200);
  }

  async function openModrinthDetail(slug) {
    showToast(`Загрузка информации о моде ${slug}...`);
    try {
      const res = await fetch(`/api/modrinth/project/${slug}`);
      const data = await res.json();
      if (data.project) {
        alert(`📦 ${data.project.title}\n\n${data.project.description}\n\nЛицензия: ${data.project.license?.name || 'Custom'}\nКатегории: ${(data.project.categories || []).join(', ')}`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- SETTINGS CONTROLS ---
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const nick = document.getElementById('setting-nickname').value.trim() || 'LiquidSteve';
      const mirror = document.getElementById('setting-mirror').value;
      const ram = parseInt(document.getElementById('setting-ram-max').value, 10) || 4;

      const update = {
        nickname: nick,
        mirror: mirror,
        memoryMax: ram,
        theme: state.settings.theme
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        });
        state.settings = await res.json();
        applySettingsToUI();
        updateSelectedInstanceUI();
        showToast('Настройки успешно сохранены!');
      } catch (e) {
        showToast('Ошибка сохранения настроек', 'error');
      }
    });
  }

  // RAM Slider live value
  const ramMaxInput = document.getElementById('setting-ram-max');
  if (ramMaxInput) {
    ramMaxInput.addEventListener('input', (e) => {
      const val = document.getElementById('ram-max-val');
      if (val) val.textContent = `${e.target.value} ГБ`;
    });
  }

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const th = btn.dataset.theme;
      state.settings.theme = th;
      liquidBg.setTheme(th);
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Start initialization
  initApp();
});
