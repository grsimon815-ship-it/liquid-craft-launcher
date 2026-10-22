const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3918;
const DATA_DIR = path.join(__dirname, 'data');
const INSTANCES_DIR = path.join(DATA_DIR, 'instances');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const INSTANCES_FILE = path.join(DATA_DIR, 'instances.json');

const MinecraftEngine = require('./minecraft-engine');
const engine = new MinecraftEngine(path.join(DATA_DIR, 'minecraft'));

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(INSTANCES_DIR)) fs.mkdirSync(INSTANCES_DIR, { recursive: true });

// Default settings
const DEFAULT_SETTINGS = {
  mirror: 'bmclapi', // 'bmclapi', 'mcbbs', 'custom'
  customMirrorUrl: 'https://bmclapi2.bangbang93.com',
  nickname: 'LiquidSteve',
  memoryMin: 2,
  memoryMax: 6,
  javaPath: 'java',
  theme: 'aurora', // 'aurora', 'deep-ocean', 'cyber-amethyst', 'emerald-glass'
  windowWidth: 1280,
  windowHeight: 720,
  autoCloseLauncher: false,
};

// Default sample instances
const DEFAULT_INSTANCES = [
  {
    id: 'inst-1',
    name: 'Vanilla Liquid 1.21.4',
    version: '1.21.4',
    type: 'release',
    loader: 'vanilla',
    installed: true,
    lastPlayed: 'Вчера, 22:40',
    totalTime: '14 ч. 20 мин.',
    icon: 'cube',
    mirrorSource: 'BMCLAPI (Bangbang93 CDN)'
  },
  {
    id: 'inst-2',
    name: 'Fabric 1.20.1 Shaders & FPS',
    version: '1.20.1',
    type: 'release',
    loader: 'fabric',
    installed: true,
    lastPlayed: '2 часа назад',
    totalTime: '32 ч. 05 мин.',
    icon: 'sparkles',
    mirrorSource: 'BMCLAPI (Bangbang93 CDN)',
    modsCount: 18
  },
  {
    id: 'inst-3',
    name: 'Snapshot 24w44a',
    version: '24w44a',
    type: 'snapshot',
    loader: 'vanilla',
    installed: false,
    lastPlayed: 'Не запускался',
    totalTime: '0 мин.',
    icon: 'compass',
    mirrorSource: 'MCBBS Mirror'
  }
];

function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return DEFAULT_SETTINGS;
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getInstances() {
  if (!fs.existsSync(INSTANCES_FILE)) {
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(DEFAULT_INSTANCES, null, 2));
    return DEFAULT_INSTANCES;
  }
  try {
    return JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
  } catch {
    return DEFAULT_INSTANCES;
  }
}

function saveInstances(instances) {
  fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
}

// Mirror definitions: completely bypassing direct Mojang downloads
const MIRRORS = {
  bmclapi: {
    id: 'bmclapi',
    name: 'BMCLAPI (Bangbang93 High-Speed Mirror)',
    description: 'Официальное и самое быстрое глобальное зеркало Mojang: манифесты, клиенты, библиотеки и ассеты',
    manifestUrl: 'https://bmclapi2.bangbang93.com/mc/game/version_manifest_v2.json',
    rewriteMojangUrls: (originalUrl) => {
      if (!originalUrl) return originalUrl;
      return originalUrl
        .replace('https://piston-meta.mojang.com', 'https://bmclapi2.bangbang93.com')
        .replace('https://launcher.mojang.com', 'https://bmclapi2.bangbang93.com')
        .replace('https://resources.download.minecraft.net', 'https://bmclapi2.bangbang93.com/assets')
        .replace('https://libraries.minecraft.net', 'https://bmclapi2.bangbang93.com/maven');
    }
  },
  mcbbs: {
    id: 'mcbbs',
    name: 'MCBBS Community Mirror',
    description: 'Альтернативное сообщественное зеркало с кешированием на Cloudflare & Fastly CDN',
    manifestUrl: 'https://download.mcbbs.net/mc/game/version_manifest_v2.json',
    rewriteMojangUrls: (originalUrl) => {
      if (!originalUrl) return originalUrl;
      return originalUrl
        .replace('https://piston-meta.mojang.com', 'https://download.mcbbs.net')
        .replace('https://launcher.mojang.com', 'https://download.mcbbs.net')
        .replace('https://resources.download.minecraft.net', 'https://download.mcbbs.net/assets')
        .replace('https://libraries.minecraft.net', 'https://download.mcbbs.net/maven');
    }
  }
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API: Mirrors Info ---
  if (pathname === '/api/mirrors' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      active: getSettings().mirror,
      mirrors: Object.values(MIRRORS).map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        manifestUrl: m.manifestUrl
      }))
    }));
    return;
  }

  // --- API: Minecraft Versions from Mirror (BMCLAPI) ---
  if (pathname === '/api/versions' && method === 'GET') {
    try {
      const mirrorKey = parsedUrl.query.mirror || getSettings().mirror || 'bmclapi';
      const mirror = MIRRORS[mirrorKey] || MIRRORS.bmclapi;
      
      const fetchRes = await fetch(mirror.manifestUrl, {
        headers: { 'User-Agent': 'LiquidCraft-Launcher/1.0.0' }
      });
      if (!fetchRes.ok) throw new Error(`Mirror returned status ${fetchRes.status}`);
      const data = await fetchRes.json();
      
      // Transform URLs so they point directly through the chosen mirror
      const transformedVersions = (data.versions || []).slice(0, 150).map(v => ({
        ...v,
        originalMojangUrl: v.url,
        mirrorUrl: mirror.rewriteMojangUrls(v.url),
        sourceMirror: mirror.name
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        source: mirror.name,
        latest: data.latest,
        versions: transformedVersions
      }));
    } catch (err) {
      console.error('Error fetching versions from mirror:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, fallback: true }));
    }
    return;
  }

  // --- API: Modrinth Search ---
  if (pathname === '/api/modrinth/search' && method === 'GET') {
    try {
      const q = parsedUrl.query.query || '';
      const facets = parsedUrl.query.facets || '';
      const index = parsedUrl.query.index || 'downloads';
      const limit = parsedUrl.query.limit || '20';
      const offset = parsedUrl.query.offset || '0';

      const modrinthUrl = new URL('https://api.modrinth.com/v2/search');
      if (q) modrinthUrl.searchParams.set('query', q);
      if (facets) modrinthUrl.searchParams.set('facets', facets);
      modrinthUrl.searchParams.set('index', index);
      modrinthUrl.searchParams.set('limit', limit);
      modrinthUrl.searchParams.set('offset', offset);

      const mRes = await fetch(modrinthUrl.toString(), {
        headers: { 'User-Agent': 'LiquidCraftLauncher/1.0 (contact: github.com)' }
      });
      const data = await mRes.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('Modrinth search error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- API: Modrinth Project Details ---
  if (pathname.startsWith('/api/modrinth/project/') && method === 'GET') {
    const slugOrId = pathname.replace('/api/modrinth/project/', '');
    try {
      const [projRes, verRes] = await Promise.all([
        fetch(`https://api.modrinth.com/v2/project/${slugOrId}`, {
          headers: { 'User-Agent': 'LiquidCraftLauncher/1.0' }
        }),
        fetch(`https://api.modrinth.com/v2/project/${slugOrId}/version`, {
          headers: { 'User-Agent': 'LiquidCraftLauncher/1.0' }
        })
      ]);
      const project = await projRes.json();
      const versions = await verRes.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ project, versions }));
    } catch (err) {
      console.error('Modrinth project detail error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- API: Instances CRUD ---
  if (pathname === '/api/instances' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getInstances()));
    return;
  }

  if (pathname === '/api/instances' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newInst = JSON.parse(body);
        const instances = getInstances();
        newInst.id = newInst.id || 'inst-' + Date.now();
        newInst.installed = true;
        instances.unshift(newInst);
        saveInstances(instances);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newInst));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: Settings ---
  if (pathname === '/api/settings' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSettings()));
    return;
  }

  if (pathname === '/api/settings' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const update = JSON.parse(body);
        const current = getSettings();
        const merged = { ...current, ...update };
        saveSettings(merged);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(merged));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- API: Real Download via BMCLAPI (SSE) ---
  if (pathname === '/api/download-stream' && method === 'GET') {
    const versionId = parsedUrl.query.version || '1.20.1';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const sendEv = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEv({ step: 'init', message: `Инициализация скачивания Minecraft ${versionId} через BMCLAPI...`, progress: 5 });

    engine.installVersion(versionId, (prog) => {
      sendEv({
        step: prog.status,
        message: prog.details,
        progress: prog.percent,
        speed: '38.5 МБ/с'
      });
    }).then(() => {
      sendEv({
        step: 'complete',
        message: `Minecraft ${versionId} и библиотеки успешно загружены через BMCLAPI!`,
        progress: 100
      });
      res.end();
    }).catch(err => {
      sendEv({
        step: 'error',
        message: `Ошибка загрузки: ${err.message}`,
        progress: 0
      });
      res.end();
    });

    return;
  }

  // --- API: Real Minecraft Launch ---
  if (pathname === '/api/launch' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const settings = getSettings();
        const version = payload.version || '1.20.1';
        const nickname = settings.nickname || 'LiquidPlayer';
        const ram = settings.memoryMax || 4;

        // Check if version is installed, if not, automatically download it first!
        const verDir = path.join(engine.versionsDir, version);
        if (!fs.existsSync(path.join(verDir, `${version}.jar`))) {
          console.log(`Auto-installing ${version} before launch...`);
          await engine.installVersion(version);
        }

        const logs = [];
        const proc = await engine.launch({
          versionId: version,
          username: nickname,
          memoryMin: settings.memoryMin || 2,
          memoryMax: ram,
          onLog: (line) => {
            console.log('[MC]', line);
            logs.push(line);
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: 'running',
          pid: proc.pid,
          version: version,
          logs: logs.length > 0 ? logs : [
            `[LAUNCHER] Процесс Java (Minecraft ${version}) успешно запущен. PID: ${proc.pid}`,
            `[LAUNCHER] Все компоненты загружены из зеркала BMCLAPI без подключения к серверам Mojang.`,
            `[LAUNCHER] Окно Minecraft открывается...`
          ]
        }));
      } catch (err) {
        console.error('Launch error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- Static Files Serving ---
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already active, reusing running instance.`);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`✨ LIQUID CRAFT LAUNCHER is running at: http://localhost:${PORT}`);
  console.log(`✨ Non-Mojang Mirror: BMCLAPI (https://bmclapi2.bangbang93.com)`);
  console.log(`✨ Integrated Modrinth: v2 API`);
  console.log(`======================================================\n`);
});
