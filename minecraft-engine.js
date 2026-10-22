const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

class MinecraftEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(__dirname, 'data', 'minecraft');
    this.versionsDir = path.join(this.baseDir, 'versions');
    this.librariesDir = path.join(this.baseDir, 'libraries');
    this.assetsDir = path.join(this.baseDir, 'assets');
    this.indexesDir = path.join(this.assetsDir, 'indexes');
    this.objectsDir = path.join(this.assetsDir, 'objects');

    this.ensureDirs();
  }

  ensureDirs() {
    [this.baseDir, this.versionsDir, this.librariesDir, this.assetsDir, this.indexesDir, this.objectsDir].forEach(d => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
  }

  // Rewrite any Mojang URL to BMCLAPI mirror
  rewriteUrl(originalUrl) {
    if (!originalUrl) return originalUrl;
    return originalUrl
      .replace('https://piston-meta.mojang.com', 'https://bmclapi2.bangbang93.com')
      .replace('https://piston-data.mojang.com', 'https://bmclapi2.bangbang93.com')
      .replace('https://launcher.mojang.com', 'https://bmclapi2.bangbang93.com')
      .replace('https://libraries.minecraft.net', 'https://bmclapi2.bangbang93.com/maven')
      .replace('https://resources.download.minecraft.net', 'https://bmclapi2.bangbang93.com/assets');
  }

  // Download a single file using fetch with retries and timeout
  async downloadFile(url, destPath, retries = 4) {
    const mirrorUrl = this.rewriteUrl(url);
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      return destPath; // already cached
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(mirrorUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'LiquidCraft-Launcher/1.0 (European CDN)',
            'Accept': '*/*',
            'x-openbmclapi-keep-origin': 'true'
          }
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Status ${res.status}`);

        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(destPath, buffer);
        return destPath;
      } catch (err) {
        if (attempt === retries) {
          console.warn(`Failed after ${retries} attempts: ${mirrorUrl}`);
          throw err;
        }
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
  }

  // Check if library applies to Windows
  isRuleAllowed(rules) {
    if (!rules || rules.length === 0) return true;
    let allowed = false;
    for (const rule of rules) {
      if (rule.action === 'allow') {
        if (!rule.os || rule.os.name === 'windows') allowed = true;
        else allowed = false;
      } else if (rule.action === 'disallow') {
        if (!rule.os || rule.os.name === 'windows') allowed = false;
      }
    }
    return allowed;
  }

  // Install a version completely from BMCLAPI
  async installVersion(versionId, onProgress) {
    const notify = (status, percent, details) => {
      if (onProgress) onProgress({ status, percent, details });
    };

    notify('Инициализация', 5, `Получение версии ${versionId} с BMCLAPI...`);

    // 1. Fetch version JSON
    const versionJsonUrl = `https://bmclapi2.bangbang93.com/version/${versionId}/json`;
    const verRes = await fetch(versionJsonUrl);
    if (!verRes.ok) throw new Error(`BMCLAPI version JSON error: ${verRes.status}`);
    const verData = await verRes.json();

    const verDir = path.join(this.versionsDir, versionId);
    if (!fs.existsSync(verDir)) fs.mkdirSync(verDir, { recursive: true });
    fs.writeFileSync(path.join(verDir, `${versionId}.json`), JSON.stringify(verData, null, 2));

    // 2. Download Client JAR from BMCLAPI
    notify('Скачивание клиента', 15, `Загрузка client.jar с BMCLAPI...`);
    const clientDest = path.join(verDir, `${versionId}.jar`);
    const clientUrl = verData.downloads?.client?.url || `https://bmclapi2.bangbang93.com/version/${versionId}/client`;
    await this.downloadFile(clientUrl, clientDest);

    // 3. Download Asset Index and Critical Assets
    notify('Ассеты', 20, `Загрузка индекса ассетов ${verData.assetIndex?.id}...`);
    if (verData.assetIndex && verData.assetIndex.url) {
      const indexDest = path.join(this.indexesDir, `${verData.assetIndex.id}.json`);
      await this.downloadFile(verData.assetIndex.url, indexDest);

      // Download all critical UI assets (icons, lang, packs, fonts, textures, panorama) from fast mirror
      try {
        const indexContent = JSON.parse(fs.readFileSync(indexDest, 'utf8'));
        const essentials = Object.entries(indexContent.objects).filter(([k]) => {
          return !k.endsWith('.ogg') && !k.endsWith('.mus');
        });

        notify('Ассеты', 25, `Загрузка ${essentials.length} ключевых ресурсов интерфейса (без тяжелых звуков)...`);
        const assetChunkSize = 16;
        for (let i = 0; i < essentials.length; i += assetChunkSize) {
          const chunk = essentials.slice(i, i + assetChunkSize);
          await Promise.all(chunk.map(async ([k, obj]) => {
            const prefix = obj.hash.slice(0, 2);
            const assetUrl = `https://bmclapi2.bangbang93.com/assets/${prefix}/${obj.hash}`;
            const assetDest = path.join(this.objectsDir, prefix, obj.hash);
            try {
              await this.downloadFile(assetUrl, assetDest, 3);
            } catch (e) {
              // Non-fatal for optional asset
            }
          }));
        }
      } catch (err) {
        console.warn('Asset index parse warning:', err.message);
      }
    }

    // 4. Download Libraries from BMCLAPI maven
    const winLibs = verData.libraries.filter(lib => this.isRuleAllowed(lib.rules));
    const totalLibs = winLibs.length;
    let completedLibs = 0;
    const nativesDir = path.join(verDir, 'natives');
    if (!fs.existsSync(nativesDir)) fs.mkdirSync(nativesDir, { recursive: true });

    notify('Библиотеки', 30, `Загрузка ${totalLibs} библиотек через BMCLAPI Maven...`);

    // Download in chunks of 8 concurrent requests for maximum speed
    const chunkSize = 8;
    for (let i = 0; i < winLibs.length; i += chunkSize) {
      const chunk = winLibs.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (lib) => {
        let artifact = lib.downloads?.artifact;
        
        // Handle classifiers/natives
        if (!artifact && lib.downloads?.classifiers) {
          artifact = lib.downloads.classifiers['natives-windows'] ||
                     lib.downloads.classifiers['natives-windows-64'];
        }

        if (!artifact && lib.name) {
          const parts = lib.name.split(':');
          if (parts.length >= 3) {
            const group = parts[0].replace(/\./g, '/');
            const name = parts[1];
            const version = parts[2];
            const classifier = parts[3] ? `-${parts[3]}` : '';
            const jarPath = `${group}/${name}/${version}/${name}-${version}${classifier}.jar`;
            artifact = {
              path: jarPath,
              url: `https://bmclapi2.bangbang93.com/maven/${jarPath}`
            };
          }
        }

        if (artifact && artifact.path) {
          // Exclude arm64 or x86 32-bit natives
          if (artifact.path.includes('arm64') || artifact.path.includes('x86.jar')) {
            return;
          }

          const libDest = path.join(this.librariesDir, artifact.path);
          const libUrl = artifact.url || `https://bmclapi2.bangbang93.com/maven/${artifact.path}`;
          await this.downloadFile(libUrl, libDest);

          // If native windows library, extract dlls
          if (artifact.path.includes('natives') || lib.name.includes('natives-windows')) {
            try {
              execSync(`tar -xf "${libDest}" -C "${nativesDir}" *.dll`, { stdio: 'ignore' });
            } catch (err) {
              // Ignore if no *.dll in archive root or already extracted
            }
          }
        }

        completedLibs++;
        const pct = 30 + Math.floor((completedLibs / totalLibs) * 65);
        notify('Библиотеки', pct, `Загружено ${completedLibs}/${totalLibs} библиотек`);
      }));
    }

    notify('Готово', 100, `Версия ${versionId} полностью установлена через BMCLAPI!`);
    return {
      versionId,
      verData,
      clientJar: clientDest,
      nativesDir
    };
  }

  // Build launch command & start real game process
  async launch({ versionId, username, memoryMin, memoryMax, gameDir, onLog, onExit }) {
    const verDir = path.join(this.versionsDir, versionId);
    const verJsonPath = path.join(verDir, `${versionId}.json`);

    if (!fs.existsSync(verJsonPath)) {
      throw new Error(`Версия ${versionId} не установлена. Сначала скачайте её с зеркала.`);
    }

    const verData = JSON.parse(fs.readFileSync(verJsonPath, 'utf8'));
    const clientJar = path.join(verDir, `${versionId}.jar`);
    const nativesDir = path.join(verDir, 'natives');

    // Build Classpath
    const cpList = [];
    const winLibs = verData.libraries.filter(lib => this.isRuleAllowed(lib.rules));
    for (const lib of winLibs) {
      let artifact = lib.downloads?.artifact;
      if (!artifact && lib.downloads?.classifiers) {
        artifact = lib.downloads.classifiers['natives-windows'] ||
                   lib.downloads.classifiers['natives-windows-64'];
      }
      if (!artifact && lib.name) {
        const parts = lib.name.split(':');
        if (parts.length >= 3) {
          const group = parts[0].replace(/\./g, '/');
          const name = parts[1];
          const version = parts[2];
          const classifier = parts[3] ? `-${parts[3]}` : '';
          const jarPath = `${group}/${name}/${version}/${name}-${version}${classifier}.jar`;
          artifact = { path: jarPath };
        }
      }

      if (artifact && artifact.path) {
        if (!artifact.path.includes('arm64') && !artifact.path.includes('x86.jar')) {
          const fullPath = path.join(this.librariesDir, artifact.path);
          if (fs.existsSync(fullPath)) {
            cpList.push(fullPath);
          }
        }
      }
    }
    cpList.push(clientJar);

    const classpath = cpList.join(';');
    const effectiveGameDir = gameDir || path.join(this.baseDir, 'instances', versionId);
    if (!fs.existsSync(effectiveGameDir)) fs.mkdirSync(effectiveGameDir, { recursive: true });

    const memMin = memoryMin || 2;
    const memMax = memoryMax || 4;
    const player = username || 'LiquidPlayer';
    const uuid = '00000000-0000-0000-0000-000000000000';

    const jvmArgs = [
      `-Xms${memMin}G`,
      `-Xmx${memMax}G`,
      '-XX:+UseG1GC',
      '-XX:-UseAdaptiveSizePolicy',
      '-XX:-OmitStackTraceInFastThrow',
      `-Djava.library.path=${nativesDir}`,
      `-Djna.tmpdir=${nativesDir}`,
      `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesDir}`,
      `-Dio.netty.native.workdir=${nativesDir}`,
      '-Dminecraft.launcher.brand=LiquidCraft',
      '-Dminecraft.launcher.version=1.0.0',
      '-cp',
      classpath,
      verData.mainClass || 'net.minecraft.client.main.Main'
    ];

    const gameArgs = [
      '--username', player,
      '--version', versionId,
      '--gameDir', effectiveGameDir,
      '--assetsDir', this.assetsDir,
      '--assetIndex', verData.assetIndex?.id || versionId,
      '--uuid', uuid,
      '--accessToken', 'offline',
      '--userType', 'mojang',
      '--versionType', verData.type || 'release'
    ];

    const fullArgs = [...jvmArgs, ...gameArgs];

    if (onLog) {
      onLog(`[LAUNCHER] Запуск Minecraft ${versionId} (Игрок: ${player})...`);
      onLog(`[LAUNCHER] Рабочая папка: ${effectiveGameDir}`);
      onLog(`[LAUNCHER] Источник компонентов: 100% BMCLAPI Mirror CDN (Не Mojang)`);
      onLog(`[LAUNCHER] Аргументы JVM: java ${jvmArgs.slice(0, 8).join(' ')} ...`);
    }

    const proc = spawn('java', fullArgs, {
      cwd: effectiveGameDir,
      detached: false
    });

    proc.stdout.on('data', data => {
      const lines = data.toString().split(/\r?\n/).filter(l => l.trim().length > 0);
      lines.forEach(line => onLog && onLog(line));
    });

    proc.stderr.on('data', data => {
      const lines = data.toString().split(/\r?\n/).filter(l => l.trim().length > 0);
      lines.forEach(line => onLog && onLog(line));
    });

    proc.on('close', code => {
      if (onLog) onLog(`[LAUNCHER] Процесс Minecraft завершен с кодом: ${code}`);
      if (onExit) onExit(code);
    });

    return proc;
  }
}

module.exports = MinecraftEngine;
