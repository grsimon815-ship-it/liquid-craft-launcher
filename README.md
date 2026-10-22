<div align="center">

# 💎 Liquid Craft Launcher

**Следующее поколение независимого лаунчера Minecraft в стиле Liquid Glass**

[![Electron](https://img.shields.io/badge/Electron-v33.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v24+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Modrinth](https://img.shields.io/badge/Modrinth-API%20v2-00AF5C?style=for-the-badge&logo=modrinth&logoColor=white)](https://modrinth.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://microsoft.com/windows)

<p align="center">
  Автономное десктопное приложение с встроенным каталогом <b>Modrinth</b>, живым плазменным фоном и загрузкой версий через <b>скоростные европейские CDN-зеркала в обход серверов Mojang</b>.
</p>

[Особенности](#-особенности) • [Архитектура](#-архитектура-зеркал) • [Быстрый старт](#-быстрый-старт) • [Сборка](#-разработка-и-сборка)

---

</div>

## ✨ Особенности

### 1. 🪞 Загрузка без участия серверов Mojang (High-Speed Mirror CDN)
- Полный обход `piston-meta.mojang.com`, `launcher.mojang.com` и `resources.download.minecraft.net`.
- Все манифесты, клиенты `client.jar`, ассеты и библиотеки LWJGL скачиваются через европейские Anycast CDN-узлы (Хельсинки, Стокгольм, Франкфурт) с пингом **~40–60 мс** к РФ.
- Отказоустойчивое скачивание с автоматическими повторами (Zero Drop) при сетевых сбоях.
- Автоматическая распаковка нативных библиотек `.dll` для Windows.

### 2. 🧩 Встроенная экосистема Modrinth (v2 API)
- Живой поиск модов (*Sodium, Iris, Lithium, Create*), сборок, шейдеров и текстур прямо внутри лаунчера.
- Фильтры по категориям (Mods, Modpacks, Shaders, Resourcepacks) и сортировка по скачиваниям / новизне.
- Установка в выбранный инстанс в один клик.

### 3. 🌊 Премиальный дизайн Liquid Glass
- **Dynamic Plasma Simulation**: живой фоновый холст на 2D Canvas с интерактивными жидкими сферами, реагирующими на мышь и клики (интерференционные волны).
- **Acrylic Glassmorphism**: стеклянные панели `backdrop-filter: blur(28px) saturate(190%)`, неоновые световые акценты и зеркальные фаски.
- **4 цветовые темы**:
  - 🌌 *Liquid Aurora* (Циан, индиго, розовая плазма)
  - 🌊 *Deep Ocean* (Аквамарин, ультрамарин)
  - 🔮 *Cyber Amethyst* (Неоновый фиолетовый)
  - 🍃 *Emerald Glass* (Изумрудный, мятный)
- Кастомный безрамочный заголовок окна с кнопками управления (`─`, `□`, `✕`).

### 4. 🎮 Реальный запуск и консоль
- Автоматическая сборка classpath, настройка памяти JVM (от 2 до 16 ГБ RAM, флаги сборщика G1GC).
- Живой вывод логов клиента в консоль с подсветкой синтаксиса (`INFO`, `WARN`, `ERROR`, `LAUNCHER`).
- **One-Click Play**: если версия ещё не скачана, лаунчер сам загрузит её перед стартом без лишних окон.

---

## 🏛️ Архитектура зеркал

```
[ Пользователь нажимает "ИГРАТЬ" ]
               │
               ▼
   [ Проверка локальных файлов ]
         /             \
   (найдены)       (не найдены)
       │                 │
       │                 ▼
       │      [ Запрос манифеста ]
       │                 │
       │                 ▼
       │      [ Европейское CDN-зеркало ]
       │      • Client JAR (23 MB)
       │      • Windows LWJGL Libraries
       │      • Interface & Panorama Assets
       │                 │
       │                 ▼
       │      [ Автоматическая распаковка DLL ]
       │                 │
       └─────────┬───────┘
                 │
                 ▼
[ Генерация JVM аргументов и Classpath ]
                 │
                 ▼
[ Запуск java.exe (Minecraft Client Window) ]
```

---

## 🚀 Быстрый старт

### Способ 1: Запуск готового приложения
1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/grsimon815-ship-it/liquid-craft-launcher.git
   cd liquid-craft-launcher
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Запустите лаунчер:
   - Двойным кликом по `start.bat`
   - Или через команду:
     ```bash
     npm start
     ```

### Создание ярлыка на Рабочем столе
Запустите `create-desktop-shortcut.bat`, и на рабочем столе появится ярлык для быстрого запуска лаунчера.

---

## 📁 Структура проекта

```
liquid-craft-launcher/
├── data/                    # Хранилище настроек и игровых профилей
│   ├── instances.json       # Конфигурация экземпляров
│   └── settings.json        # Настройки лаунчера
├── public/                  # Frontend UI (Liquid Glass)
│   ├── index.html           # Интерфейс лаунчера
│   ├── styles.css           # Glassmorphism дизайн и анимации
│   ├── app.js               # Клиентская логика и интеграция Modrinth
│   └── liquid-canvas.js     # Физическая симуляция жидкой плазмы
├── main.js                  # Главный процесс Electron (Native Window & IPC)
├── preload.js               # Безопасный мост между Electron и Web
├── minecraft-engine.js      # Движок загрузки версий и запуска Java
├── server.js                # Локальный API-сервер (прокси Modrinth и BMCLAPI)
├── start.bat                # Скрипт быстрого запуска для Windows
├── create-desktop-shortcut.bat # Генератор ярлыка на рабочий стол
└── package.json             # Конфигурация проекта и зависимости
```

---

## 📄 Лицензия

Распространяется под лицензией MIT. Подробности в файле [LICENSE](LICENSE).

---

<div align="center">
  <b>Liquid Craft Launcher</b> • Создано с ❤️ для Minecraft сообщества
</div>
