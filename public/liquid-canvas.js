// Interactive Liquid Fluid Shader & Canvas Simulation
class LiquidBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.orbs = [];
    this.ripples = [];
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, targetX: window.innerWidth / 2, targetY: window.innerHeight / 2 };
    this.theme = 'aurora';

    this.init();
    this.bindEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.setupOrbs();
  }

  setTheme(theme) {
    this.theme = theme;
    this.setupOrbs();
  }

  setupOrbs() {
    this.orbs = [];
    const colorPalettes = {
      aurora: [
        { color: 'rgba(0, 240, 255, 0.45)', radius: 340, speed: 0.0008, angle: 0, dist: 220 },
        { color: 'rgba(168, 85, 247, 0.40)', radius: 380, speed: 0.0006, angle: 2, dist: 260 },
        { color: 'rgba(236, 72, 153, 0.35)', radius: 300, speed: 0.0011, angle: 4, dist: 190 },
        { color: 'rgba(56, 189, 248, 0.30)', radius: 420, speed: 0.0005, angle: 1.5, dist: 310 },
        { color: 'rgba(99, 102, 241, 0.35)', radius: 360, speed: 0.0007, angle: 3.5, dist: 240 }
      ],
      'deep-ocean': [
        { color: 'rgba(6, 182, 212, 0.45)', radius: 360, speed: 0.0007, angle: 0, dist: 250 },
        { color: 'rgba(14, 116, 144, 0.50)', radius: 400, speed: 0.0005, angle: 2.2, dist: 280 },
        { color: 'rgba(2, 132, 199, 0.40)', radius: 320, speed: 0.0009, angle: 4.1, dist: 210 },
        { color: 'rgba(56, 189, 248, 0.35)', radius: 390, speed: 0.0006, angle: 1.2, dist: 300 }
      ],
      'cyber-amethyst': [
        { color: 'rgba(192, 38, 211, 0.45)', radius: 350, speed: 0.0008, angle: 0, dist: 230 },
        { color: 'rgba(126, 34, 206, 0.48)', radius: 410, speed: 0.0005, angle: 2, dist: 270 },
        { color: 'rgba(236, 72, 153, 0.38)', radius: 300, speed: 0.0010, angle: 3.8, dist: 200 },
        { color: 'rgba(147, 51, 234, 0.42)', radius: 370, speed: 0.0007, angle: 5.1, dist: 290 }
      ],
      'emerald-glass': [
        { color: 'rgba(16, 185, 129, 0.45)', radius: 350, speed: 0.0008, angle: 0, dist: 240 },
        { color: 'rgba(5, 150, 105, 0.45)', radius: 390, speed: 0.0006, angle: 2.3, dist: 270 },
        { color: 'rgba(6, 182, 212, 0.35)', radius: 320, speed: 0.0010, angle: 4.2, dist: 200 },
        { color: 'rgba(52, 211, 153, 0.38)', radius: 370, speed: 0.0007, angle: 1.5, dist: 290 }
      ]
    };

    const palette = colorPalettes[this.theme] || colorPalettes.aurora;
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.orbs = palette.map((p, i) => ({
      cx,
      cy,
      color: p.color,
      radius: p.radius,
      speed: p.speed,
      angle: p.angle,
      dist: p.dist,
      seed: i * 1.7,
      x: cx,
      y: cy
    }));
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.setupOrbs();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
    });

    window.addEventListener('pointerdown', (e) => {
      this.addRipple(e.clientX, e.clientY);
    });
  }

  addRipple(x, y) {
    this.ripples.push({
      x,
      y,
      radius: 5,
      maxRadius: Math.max(this.width, this.height) * 0.45,
      alpha: 0.4,
      speed: 6
    });
  }

  animate() {
    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Deep luminous fluid background fill
    const bgGrad = ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, 50,
      this.width / 2, this.height / 2, Math.max(this.width, this.height)
    );
    bgGrad.addColorStop(0, '#0a0d18');
    bgGrad.addColorStop(0.6, '#06070e');
    bgGrad.addColorStop(1, '#020306');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw dynamic fluid orbs
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const now = performance.now();
    for (const orb of this.orbs) {
      orb.angle += orb.speed;
      const wave = Math.sin(now * 0.0015 + orb.seed) * 45;
      const targetX = (this.width / 2) + Math.cos(orb.angle) * (orb.dist + wave) + (this.mouse.x - this.width / 2) * 0.12;
      const targetY = (this.height / 2) + Math.sin(orb.angle * 1.2) * (orb.dist + wave) + (this.mouse.y - this.height / 2) * 0.12;

      orb.x += (targetX - orb.x) * 0.08;
      orb.y += (targetY - orb.y) * 0.08;

      const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
      grad.addColorStop(0, orb.color);
      grad.addColorStop(0.5, orb.color.replace(/[\d\.]+\)$/, '0.15)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Interactive fluid ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed;
      r.alpha *= 0.95;

      ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.35})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (r.alpha < 0.01 || r.radius > r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    ctx.restore();

    requestAnimationFrame(() => this.animate());
  }
}

window.LiquidBackground = LiquidBackground;
