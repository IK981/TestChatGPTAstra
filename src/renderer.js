const THEMES = {
  midnight: {
    sky: ['#07101e', '#151e35', '#40435b'],
    haze: '#8893ba', ground: '#111b25', mountains: '#182638',
    road: '#242c38', edge: '#758396', stripe: '#e0e5ee', glow: '#91bcf1',
  },
  coast: {
    sky: ['#19334e', '#5a839c', '#d4b7a6'],
    haze: '#ecccbc', ground: '#24383a', mountains: '#3d5963',
    road: '#343b43', edge: '#98adaf', stripe: '#f4ede0', glow: '#fff0d7',
  },
  desert: {
    sky: ['#2c203a', '#985a67', '#e9a17b'],
    haze: '#f9bc90', ground: '#544448', mountains: '#73585b',
    road: '#393440', edge: '#bd9e91', stripe: '#f1ddd0', glow: '#ffdbb4',
  },
};

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** The road and traffic use z=0 at the horizon and z=1 at the camera. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let lastCurve = 0;
  const random = seededRandom(731);
  const stars = Array.from({ length: 85 }, () => ({
    x: random(), y: random() * 0.28, radius: random() * 0.9 + 0.25,
    alpha: random() * 0.45 + 0.15,
  }));
  const buildings = Array.from({ length: 46 }, (_, i) => ({
    x: i / 45, w: 0.01 + random() * 0.019, h: 0.025 + random() * 0.086,
    seed: Math.floor(random() * 100000), antenna: random() > 0.82,
  }));
  const palms = Array.from({ length: 14 }, (_, i) => ({
    z: (i + 1) / 16, side: i % 2 ? 1 : -1, seed: random(),
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const physicalWidth = Math.round(width * pixelRatio);
    const physicalHeight = Math.round(height * pixelRatio);
    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  resize();

  function project(z, x = 0) {
    const depth = clamp(z, 0, 1.16);
    const half = width * (0.024 + 0.425 * Math.pow(depth, 1.24));
    const center = width * (0.5 + lastCurve * 0.28 * Math.pow(1 - depth, 2));
    return {
      x: center + x * half,
      y: height * (0.325 + 0.715 * Math.pow(depth, 1.57)),
      half,
      center,
    };
  }

  function quad(a, b, c, d, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  function drawSky(theme, track) {
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.47);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(0.66, theme.sky[1]);
    sky.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    if (track === 'midnight') {
      for (const star of stars) {
        ctx.fillStyle = `rgba(217,231,255,${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      const moonX = width * 0.78;
      const moonY = height * 0.095;
      const moonRadius = Math.min(width, height) * 0.016;
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 5);
      moonGlow.addColorStop(0, 'rgba(210,224,245,.15)');
      moonGlow.addColorStop(1, 'rgba(210,224,245,0)');
      ctx.fillStyle = moonGlow;
      ctx.fillRect(moonX - moonRadius * 5, moonY - moonRadius * 5, moonRadius * 10, moonRadius * 10);
      ctx.fillStyle = '#d2dcdf';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#becbce';
      ctx.beginPath();
      ctx.arc(moonX - moonRadius * 0.27, moonY - moonRadius * 0.17, moonRadius * 0.21, 0, Math.PI * 2);
      ctx.arc(moonX + moonRadius * 0.34, moonY + moonRadius * 0.28, moonRadius * 0.13, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const sunX = width * 0.77;
      const sunY = height * 0.26;
      const sunRadius = Math.min(width, height) * 0.055;
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 4);
      glow.addColorStop(0, 'rgba(255,213,173,.25)');
      glow.addColorStop(1, 'rgba(255,213,173,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sunX - sunRadius * 4, sunY - sunRadius * 4, sunRadius * 8, sunRadius * 8);
      ctx.fillStyle = track === 'desert' ? '#efb194' : '#ead2ba';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Two layers of hills make the city sit inside the distant landscape.
    ctx.fillStyle = theme.mountains;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.32);
    const ridge = [0.30, 0.275, 0.29, 0.245, 0.28, 0.265, 0.31, 0.295, 0.255, 0.275, 0.29, 0.26, 0.3];
    ridge.forEach((y, i) => ctx.lineTo((i / (ridge.length - 1)) * width, y * height));
    ctx.lineTo(width, height * 0.39);
    ctx.lineTo(0, height * 0.39);
    ctx.closePath();
    ctx.fill();

    if (track !== 'desert') {
      buildings.forEach((building) => {
        const x = building.x * width;
        const w = building.w * width;
        const h = building.h * height;
        const base = height * (track === 'coast' ? 0.331 : 0.335);
        ctx.fillStyle = track === 'coast' ? '#334a57' : '#101d2c';
        ctx.fillRect(x, base - h, w, h);
        ctx.fillStyle = track === 'coast' ? '#4b606c' : '#1a2939';
        ctx.fillRect(x, base - h, w * 0.18, h);
        if (building.antenna) {
          ctx.fillStyle = '#283a4d';
          ctx.fillRect(x + w * 0.46, base - h - 10, Math.max(1, width / 900), 10);
          ctx.fillStyle = 'rgba(246,118,99,.8)';
          ctx.fillRect(x + w * 0.46, base - h - 10, 1.2, 1.2);
        }
        const windowRandom = seededRandom(building.seed);
        const step = Math.max(4, width * 0.005);
        for (let wy = base - h + 5; wy < base - 3; wy += step * 1.25) {
          for (let wx = x + 3; wx < x + w - 2; wx += step) {
            if (windowRandom() < 0.36) {
              ctx.fillStyle = windowRandom() < 0.25 ? 'rgba(154,201,228,.52)' : 'rgba(235,208,153,.55)';
              ctx.fillRect(wx, wy, Math.max(1, step * 0.32), Math.max(1, step * 0.48));
            }
          }
        }
      });
    }

    ctx.fillStyle = theme.ground;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.345);
    ctx.bezierCurveTo(width * 0.25, height * 0.32, width * 0.41, height * 0.37, width * 0.5, height * 0.35);
    ctx.bezierCurveTo(width * 0.66, height * 0.34, width * 0.83, height * 0.31, width, height * 0.348);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    if (track === 'coast') {
      ctx.fillStyle = '#517b88';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.345);
      ctx.lineTo(width * 0.44, height * 0.345);
      ctx.lineTo(0, height * 0.65);
      ctx.fill();
      ctx.strokeStyle = 'rgba(185,214,216,.13)';
      for (let i = 0; i < 9; i++) {
        const y = height * (0.356 + i * 0.016);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width * (0.4 - i * 0.04), y);
        ctx.stroke();
      }
    }

    const haze = ctx.createRadialGradient(width * 0.5, height * 0.34, 0, width * 0.5, height * 0.34, width * 0.48);
    haze.addColorStop(0, track === 'midnight' ? 'rgba(150,172,212,.13)' : 'rgba(255,203,162,.19)');
    haze.addColorStop(1, 'rgba(150,172,212,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, height * 0.23, width, height * 0.3);
  }

  function drawRoad(theme, distance) {
    // Continuous ribbons avoid subpixel seams between road segments.
    const ribbon = (left, right, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const p = project(i / 90, left);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      for (let i = 90; i >= 0; i--) {
        const p = project(i / 90, right);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
    };
    ribbon(-1.13, 1.13, '#353d48');
    ribbon(-1, 1, theme.road);
    for (const side of [-1, 1]) ribbon(side * 0.966, side * 0.975, theme.stripe);

    const roadShade = ctx.createLinearGradient(0, height * 0.33, 0, height);
    roadShade.addColorStop(0, 'rgba(13,20,31,.34)');
    roadShade.addColorStop(0.32, 'rgba(13,20,31,0)');
    roadShade.addColorStop(1, 'rgba(5,11,20,.08)');
    ctx.fillStyle = roadShade;
    ctx.beginPath();
    for (let i = 0; i <= 50; i++) {
      const p = project(i / 50, -0.96);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    for (let i = 50; i >= 0; i--) {
      const p = project(i / 50, 0.96);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();

    const phase = ((distance || 0) % 54 + 54) % 54;
    for (let s = -54; s < 2200; s += 54) {
      const near = s - phase;
      const far = near + 27;
      if (far < 0) continue;
      const zNear = 1 / (1 + Math.max(0, near) / 155);
      const zFar = 1 / (1 + far / 155);
      for (const lane of [-1 / 3, 1 / 3]) {
        const lineWidth = 0.008;
        quad(project(zNear, lane - lineWidth), project(zNear, lane + lineWidth),
          project(zFar, lane + lineWidth), project(zFar, lane - lineWidth), theme.stripe);
      }
    }

    // Steel safety rails trace the curve out toward the vanishing point.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 70; i++) {
        const z = i / 70;
        const p = project(z, side * 1.11);
        const y = p.y - height * 0.044 * z;
        i === 0 ? ctx.moveTo(p.x, y) : ctx.lineTo(p.x, y);
      }
      ctx.strokeStyle = theme.edge;
      ctx.lineWidth = Math.max(1, width * 0.003);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 70; i++) {
        const z = i / 70;
        const p = project(z, side * 1.11);
        const y = p.y - height * 0.035 * z;
        i === 0 ? ctx.moveTo(p.x, y) : ctx.lineTo(p.x, y);
      }
      ctx.strokeStyle = 'rgba(16,24,36,.8)';
      ctx.lineWidth = Math.max(1, width * 0.004);
      ctx.stroke();
      for (let s = 12 - phase % 30; s < 1200; s += 30) {
        if (s <= 0) continue;
        const z = 1 / (1 + s / 155);
        const p = project(z, side * 1.11);
        ctx.fillStyle = theme.edge;
        ctx.fillRect(p.x, p.y - height * 0.044 * z, Math.max(0.7, width * 0.0027 * z), height * 0.048 * z);
        ctx.fillStyle = side < 0 ? '#f5d18e' : '#e4afaa';
        ctx.fillRect(p.x - 0.7, p.y - height * 0.043 * z, Math.max(1, width * 0.004 * z), Math.max(1, height * 0.006 * z));
      }
    }
  }

  function drawPalm(z, side, seed, track) {
    const p = project(z, side * (1.37 + seed * 0.2));
    const trunkHeight = height * (0.015 + z * 0.31);
    const palmWidth = trunkHeight * 0.67;
    const topX = p.x + side * trunkHeight * 0.1;
    const topY = p.y - trunkHeight;
    ctx.strokeStyle = track === 'midnight' ? '#101c23' : '#243438';
    ctx.lineWidth = Math.max(1, trunkHeight * 0.037);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + side * trunkHeight * 0.035, topY + trunkHeight * 0.34, topX, topY);
    ctx.stroke();
    ctx.fillStyle = track === 'midnight' ? '#0e1b22' : '#263d3e';
    for (let leaf = 0; leaf < 7; leaf++) {
      const angle = -Math.PI + leaf * Math.PI / 6;
      const endX = topX + Math.cos(angle) * palmWidth * (0.66 + (leaf % 2) * 0.18);
      const endY = topY + Math.sin(angle) * palmWidth * 0.35 + palmWidth * 0.3;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(angle) * palmWidth * 0.65, topY - palmWidth * 0.27, endX, endY);
      ctx.quadraticCurveTo(topX + Math.cos(angle) * palmWidth * 0.36, topY - palmWidth * 0.06, topX, topY);
      ctx.fill();
    }
  }

  function drawCactus(z, side, seed) {
    const p = project(z, side * (1.42 + seed * 0.4));
    const h = height * z * 0.15;
    const w = Math.max(1, h * 0.11);
    ctx.strokeStyle = '#303b38';
    ctx.lineCap = 'round';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - h);
    ctx.moveTo(p.x, p.y - h * 0.45);
    ctx.lineTo(p.x - h * 0.24, p.y - h * 0.45);
    ctx.lineTo(p.x - h * 0.24, p.y - h * 0.75);
    ctx.moveTo(p.x, p.y - h * 0.64);
    ctx.lineTo(p.x + h * 0.2, p.y - h * 0.64);
    ctx.lineTo(p.x + h * 0.2, p.y - h * 0.88);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function drawLamp(z, side, theme) {
    const p = project(z, side * 1.2);
    const h = height * (0.012 + 0.31 * z);
    const arm = h * 0.3;
    const bulbX = p.x - side * arm;
    const bulbY = p.y - h + h * 0.07;
    ctx.strokeStyle = '#445266';
    ctx.lineWidth = Math.max(0.7, width * 0.0033 * z);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - h * 0.88);
    ctx.quadraticCurveTo(p.x, p.y - h * 1.03, p.x - side * arm * 0.6, p.y - h);
    ctx.lineTo(bulbX, bulbY);
    ctx.stroke();
    const glowSize = Math.max(3, h * 0.16);
    const glow = ctx.createRadialGradient(bulbX, bulbY, 0, bulbX, bulbY, glowSize);
    glow.addColorStop(0, 'rgba(218,234,255,.38)');
    glow.addColorStop(0.25, 'rgba(192,220,255,.1)');
    glow.addColorStop(1, 'rgba(192,220,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(bulbX - glowSize, bulbY - glowSize, glowSize * 2, glowSize * 2);
    ctx.strokeStyle = theme.glow;
    ctx.lineWidth = Math.max(1, h * 0.021);
    ctx.beginPath();
    ctx.moveTo(bulbX - side * h * 0.018, bulbY);
    ctx.lineTo(bulbX + side * h * 0.08, bulbY - h * 0.009);
    ctx.stroke();
  }

  function drawScenery(theme, track, distance) {
    const movement = (((distance || 0) * 0.0016) % 0.09 + 0.09) % 0.09;
    for (const palm of palms) {
      const z = clamp(palm.z + movement, 0, 1.1);
      if (track === 'desert') drawCactus(z, palm.side, palm.seed);
      else drawPalm(z, palm.side, palm.seed, track);
    }
    const lampShift = (((distance || 0) * 0.0012) % 0.15 + 0.15) % 0.15;
    for (let i = 0; i < 6; i++) {
      const z = 0.09 + i * 0.15 + lampShift;
      drawLamp(z, -1, theme);
      drawLamp(z, 1, theme);
    }
  }

  function drawCar(x, z, color, { player = false, boosting = false, invincible = 0, time = 0, steer = 0 } = {}) {
    const p = project(z, x);
    const w = Math.min(p.half * (player ? 0.335 : 0.315), height * 0.16);
    const h = w * 1.72;
    if (w < 1.5) return;
    const y = p.y - h * 0.37;
    ctx.save();
    ctx.translate(p.x, y);
    ctx.rotate(player ? -steer * 0.035 : lastCurve * (1 - z) * 0.025);

    ctx.fillStyle = 'rgba(0,0,0,.48)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.35, w * 0.7, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    if (boosting) {
      for (const side of [-1, 1]) {
        const fire = ctx.createLinearGradient(0, h * 0.45, 0, h * 1.2);
        fire.addColorStop(0, 'rgba(188,238,255,.9)');
        fire.addColorStop(0.25, 'rgba(49,190,255,.58)');
        fire.addColorStop(1, 'rgba(61,141,255,0)');
        ctx.fillStyle = fire;
        ctx.beginPath();
        ctx.moveTo(side * w * 0.26 - w * 0.07, h * 0.43);
        ctx.lineTo(side * w * 0.26 + w * 0.07, h * 0.43);
        ctx.lineTo(side * w * 0.26 + w * 0.13, h * 1.2);
        ctx.lineTo(side * w * 0.26 - w * 0.13, h * 1.2);
        ctx.fill();
      }
    }

    // Tyres and graphite wheel housings remain visible around the body.
    for (const side of [-1, 1]) {
      for (const axle of [-0.28, 0.28]) {
        ctx.fillStyle = '#080e15';
        roundedRect(ctx, side * w * 0.47 - w * 0.09, h * axle - h * 0.09, w * 0.18, h * 0.19, w * 0.055);
        ctx.fill();
        ctx.fillStyle = '#323c46';
        roundedRect(ctx, side * w * 0.49 - w * 0.024, h * axle - h * 0.054, w * 0.048, h * 0.11, w * 0.013);
        ctx.fill();
      }
    }

    const paint = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
    paint.addColorStop(0, '#181c29');
    paint.addColorStop(0.06, color);
    paint.addColorStop(0.44, color);
    paint.addColorStop(0.64, color);
    paint.addColorStop(1, '#171c26');
    ctx.fillStyle = paint;
    ctx.beginPath();
    ctx.moveTo(-w * 0.31, -h * 0.5);
    ctx.quadraticCurveTo(0, -h * 0.56, w * 0.31, -h * 0.5);
    ctx.quadraticCurveTo(w * 0.46, -h * 0.46, w * 0.47, -h * 0.24);
    ctx.lineTo(w * 0.49, h * 0.29);
    ctx.quadraticCurveTo(w * 0.51, h * 0.5, w * 0.34, h * 0.52);
    ctx.lineTo(-w * 0.34, h * 0.52);
    ctx.quadraticCurveTo(-w * 0.51, h * 0.5, -w * 0.49, h * 0.29);
    ctx.lineTo(-w * 0.47, -h * 0.24);
    ctx.quadraticCurveTo(-w * 0.46, -h * 0.46, -w * 0.31, -h * 0.5);
    ctx.fill();

    // White paint reflections on the bonnet, rather than a flat colored sprite.
    const hoodShine = ctx.createLinearGradient(-w * 0.25, -h * 0.5, w * 0.3, -h * 0.18);
    hoodShine.addColorStop(0, 'rgba(255,255,255,.18)');
    hoodShine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hoodShine;
    ctx.beginPath();
    ctx.moveTo(-w * 0.29, -h * 0.48);
    ctx.lineTo(w * 0.3, -h * 0.48);
    ctx.lineTo(w * 0.34, -h * 0.25);
    ctx.lineTo(-w * 0.33, -h * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,225,225,.3)';
    ctx.lineWidth = Math.max(0.6, w * 0.014);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * w * 0.31, -h * 0.46);
      ctx.lineTo(side * w * 0.37, -h * 0.22);
      ctx.lineTo(side * w * 0.39, h * 0.32);
      ctx.stroke();
    }

    const glass = ctx.createLinearGradient(0, -h * 0.24, w * 0.3, h * 0.2);
    glass.addColorStop(0, '#7293a5');
    glass.addColorStop(0.3, '#263d54');
    glass.addColorStop(1, '#0c1829');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.21);
    ctx.lineTo(w * 0.34, -h * 0.21);
    ctx.lineTo(w * 0.26, -h * 0.035);
    ctx.lineTo(-w * 0.26, -h * 0.035);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,198,217,.35)';
    ctx.lineWidth = Math.max(0.6, w * 0.009);
    ctx.beginPath();
    ctx.moveTo(-w * 0.31, -h * 0.2);
    ctx.lineTo(w * 0.31, -h * 0.2);
    ctx.stroke();

    const roof = ctx.createLinearGradient(-w * 0.25, 0, w * 0.25, 0);
    roof.addColorStop(0, 'rgba(0,0,0,.2)');
    roof.addColorStop(0.4, 'rgba(255,255,255,.13)');
    roof.addColorStop(1, 'rgba(0,0,0,.1)');
    ctx.fillStyle = roof;
    roundedRect(ctx, -w * 0.25, -h * 0.014, w * 0.5, h * 0.19, w * 0.06);
    ctx.fill();
    ctx.fillStyle = '#112234';
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, h * 0.175);
    ctx.lineTo(w * 0.25, h * 0.175);
    ctx.lineTo(w * 0.33, h * 0.31);
    ctx.lineTo(-w * 0.33, h * 0.31);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3f5364';
    ctx.lineWidth = Math.max(0.6, w * 0.012);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-w * (0.27 + i * 0.018), h * (0.21 + i * 0.035));
      ctx.lineTo(w * (0.27 + i * 0.018), h * (0.21 + i * 0.035));
      ctx.stroke();
    }
    // Side glass, mirrors, and sculpted rear deck.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#14263b';
      ctx.beginPath();
      ctx.moveTo(side * w * 0.36, -h * 0.15);
      ctx.lineTo(side * w * 0.31, -h * 0.015);
      ctx.lineTo(side * w * 0.31, h * 0.17);
      ctx.lineTo(side * w * 0.4, h * 0.27);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
      roundedRect(ctx, side * w * 0.46 - w * 0.063, -h * 0.095, w * 0.126, h * 0.043, w * 0.024);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    roundedRect(ctx, -w * 0.4, h * 0.355, w * 0.8, h * 0.034, w * 0.012);
    ctx.fill();
    ctx.fillStyle = color;
    roundedRect(ctx, -w * 0.43, h * 0.34, w * 0.86, h * 0.024, w * 0.012);
    ctx.fill();
    ctx.fillStyle = '#0c121b';
    roundedRect(ctx, -w * 0.32, h * 0.459, w * 0.64, h * 0.061, w * 0.025);
    ctx.fill();
    ctx.fillStyle = '#abb8c1';
    roundedRect(ctx, -w * 0.1, h * 0.457, w * 0.2, h * 0.039, w * 0.005);
    ctx.fill();
    for (const side of [-1, 1]) {
      const tailX = side * w * 0.32;
      const tailY = h * 0.42;
      ctx.save();
      ctx.shadowColor = '#ff343f';
      ctx.shadowBlur = w * 0.18;
      ctx.fillStyle = '#ff4e55';
      roundedRect(ctx, tailX - w * 0.105, tailY, w * 0.21, h * 0.028, w * 0.01);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd2cf';
      ctx.fillRect(tailX - w * 0.08, tailY + h * 0.006, w * 0.16, Math.max(0.7, h * 0.006));
      ctx.fillStyle = '#91a0ad';
      roundedRect(ctx, tailX - w * 0.04, h * 0.485, w * 0.08, h * 0.019, w * 0.014);
      ctx.fill();
    }

    if (player && invincible > 0) {
      const sparkRandom = seededRandom(Math.floor(time * 11) + 177);
      ctx.strokeStyle = 'rgba(255,204,112,.86)';
      ctx.lineWidth = Math.max(1, w * 0.012);
      for (let i = 0; i < 9; i++) {
        const angle = sparkRandom() * Math.PI * 2;
        const startX = Math.cos(angle) * w * 0.57;
        const startY = Math.sin(angle) * h * 0.4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(angle) * w * 0.12, startY + Math.sin(angle) * w * 0.17);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function render(game, { track = 'midnight', carColor = '#e94343', reducedMotion = false, time = 0 } = {}) {
    const rect = canvas.getBoundingClientRect();
    if (Math.abs(rect.width - width) > 0.5 || Math.abs(rect.height - height) > 0.5) resize();
    const theme = THEMES[track] || THEMES.midnight;
    lastCurve = clamp(Number(game.roadCurve) || 0, -1, 1);
    const distance = game.distance || 0;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawSky(theme, track);
    drawRoad(theme, distance);
    drawScenery(theme, track, distance);

    const traffic = game.status === 'ready' && !game.traffic?.length
      ? [{ x: -0.58, z: 0.56, color: '#d8d5c4' }, { x: 0.58, z: 0.32, color: '#e2a34a' }, { x: 0, z: 0.14, color: '#77a2b1' }]
      : (game.traffic || []);
    const visibleTraffic = [...traffic].filter((car) => car.z > 0 && car.z < 1.13)
      .sort((a, b) => a.z - b.z);
    visibleTraffic.filter((car) => car.z <= 0.88)
      .forEach((car) => drawCar(car.x, car.z, car.color || '#d4d8de'));

    if (game.boosting && !reducedMotion) {
      ctx.save();
      ctx.strokeStyle = 'rgba(120,208,255,.16)';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 13; i++) {
        const side = i % 2 ? 1 : -1;
        const phase = ((time * 0.8 + i * 0.173) % 1);
        const start = project(0.3 + phase * 0.7, side * (1.3 + (i % 3) * 0.21));
        const end = project(0.4 + phase * 0.8, side * (1.3 + (i % 3) * 0.21));
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawCar(clamp(game.playerX || 0, -1, 1), 0.88, carColor, {
      player: true,
      boosting: Boolean(game.boosting),
      invincible: game.invincible || 0,
      time: reducedMotion ? 0 : time,
      steer: game.playerX || 0,
    });
    visibleTraffic.filter((car) => car.z > 0.88)
      .forEach((car) => drawCar(car.x, car.z, car.color || '#d4d8de'));

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.2,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
    vignette.addColorStop(0, 'rgba(2,6,14,0)');
    vignette.addColorStop(1, track === 'midnight' ? 'rgba(2,6,14,.33)' : 'rgba(2,6,14,.16)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  return {
    render,
    resize,
    destroy() { observer?.disconnect(); },
  };
}
