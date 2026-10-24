// Every fish species: how big it is, how fast it swims, how deep it lives, how common it is, and how to draw it.
// Drawing: origin at the fish's centre, facing right, s = half its length, wag = tail swing in px.
// The first eight are the fish from the Notion fish tank.

const drawTail = (c, s, wag, color, len = 0.55, spread = 0.5) => {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-s * 0.75, 0);
  c.lineTo(-s * (0.75 + len), -s * spread + wag);
  c.quadraticCurveTo(-s * (0.65 + len * 0.6), wag * 0.5, -s * (0.75 + len), s * spread + wag);
  c.closePath();
  c.fill();
};

const drawEye = (c, x, y, r) => {
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#000'; c.beginPath(); c.arc(x + r * 0.25, y, r * 0.55, 0, Math.PI * 2); c.fill();
};

// A plain torpedo-shaped fish; most sea fish here are this with their own colours and markings
function basic(c, s, wag, o) {
  drawTail(c, s, wag, o.fin, o.tail ?? 0.5, o.spread ?? 0.5);
  if (o.dorsal) {
    c.fillStyle = o.fin;
    c.beginPath(); c.moveTo(s * 0.45, -s * o.h * 0.8);
    c.quadraticCurveTo(0, -s * (o.h + o.dorsal), -s * 0.45, -s * o.h * 0.7); c.fill();
  }
  const g = c.createLinearGradient(0, -s * o.h, 0, s * o.h);
  g.addColorStop(0, o.back); g.addColorStop(0.55, o.side ?? o.back); g.addColorStop(1, o.belly);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, s, s * o.h, 0, 0, Math.PI * 2); c.fill();
  if (o.mark) { c.save(); c.clip(); o.mark(c, s); c.restore(); }
  drawEye(c, s * 0.66, -s * o.h * 0.25, s * (o.eye ?? 0.1));
}

// depth: [shallowest, deepest] px below the surface it swims at. weight: how often it spawns (3 common … 0.3 very rare).
// eats: hunts fish much smaller than itself, out where the sea is deep.
export const SPECIES = [
  {
    id: 'tetra', name: 'Neon Tetra', size: 8, speed: 80, depth: [10, 120], weight: 3,
    draw(c, s, wag) {
      drawTail(c, s, wag, 'rgba(220,230,235,.5)', 0.45, 0.45);
      c.beginPath(); c.ellipse(0, 0, s, s * 0.33, 0, 0, Math.PI * 2);
      c.fillStyle = '#c9d4d8'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#ff2a4a'; c.fillRect(-s, s * 0.02, s * 1.2, s * 0.4);
      c.fillStyle = '#2ee6ff'; c.fillRect(-s * 0.7, -s * 0.16, s * 1.5, s * 0.16);
      c.restore();
      drawEye(c, s * 0.62, -s * 0.06, s * 0.14);
    },
  },
  {
    id: 'clown', name: 'Clownfish', size: 15, speed: 55, depth: [20, 130], weight: 2.5,
    draw(c, s, wag) {
      drawTail(c, s, wag, '#ff7b1c');
      c.beginPath(); c.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
      c.fillStyle = '#ff7b1c'; c.fill();
      c.save(); c.clip();
      for (const x of [0.42, -0.12, -0.62]) {
        c.fillStyle = '#111'; c.fillRect(s * x - s * 0.15, -s, s * 0.3, s * 2);
        c.fillStyle = '#fff'; c.fillRect(s * x - s * 0.1, -s, s * 0.2, s * 2);
      }
      c.restore();
      c.fillStyle = '#ff9a3c'; c.beginPath(); c.ellipse(-s * 0.1, -s * 0.55, s * 0.35, s * 0.18, 0, Math.PI, 0); c.fill();
      drawEye(c, s * 0.62, -s * 0.12, s * 0.13);
    },
  },
  {
    id: 'gold', name: 'Goldfish', size: 17, speed: 42, depth: [10, 110], weight: 2,
    draw(c, s, wag) {
      c.fillStyle = 'rgba(255,207,90,.6)';
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(-s * 0.7, 0);
        c.bezierCurveTo(-s * 1.2, side * s * 0.3 + wag, -s * 1.5, side * s * 0.9 + wag * 1.5, -s * 1.9, side * s * 0.6 + wag * 2);
        c.quadraticCurveTo(-s * 1.4, side * s * 0.15 + wag, -s * 0.7, 0);
        c.fill();
      }
      const g = c.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
      g.addColorStop(0, '#ff9d2e'); g.addColorStop(1, '#e8b923');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, s * 0.9, s * 0.6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,207,90,.7)'; c.beginPath(); c.ellipse(-s * 0.1, -s * 0.6, s * 0.4, s * 0.25, -0.3, Math.PI, 0); c.fill();
      drawEye(c, s * 0.55, -s * 0.15, s * 0.14);
    },
  },
  {
    id: 'betta', name: 'Betta', size: 12, speed: 30, depth: [10, 100], weight: 1.5,
    draw(c, s, wag) {
      const fin = c.createLinearGradient(-s * 2, 0, 0, 0);
      fin.addColorStop(0, 'rgba(120,20,160,.55)'); fin.addColorStop(1, 'rgba(220,20,60,.85)');
      c.fillStyle = fin;
      c.beginPath(); c.moveTo(-s * 0.5, 0);
      c.bezierCurveTo(-s * 1.2, -s * 1.1 + wag, -s * 2.1, -s * 0.6 + wag * 1.6, -s * 2, wag * 1.8);
      c.bezierCurveTo(-s * 2.1, s * 0.6 + wag * 1.6, -s * 1.2, s * 1.1 + wag, -s * 0.5, 0); c.fill();
      c.beginPath(); c.moveTo(s * 0.2, -s * 0.25); c.quadraticCurveTo(-s * 0.4, -s * 1.1 + wag * 0.5, -s * 0.9, -s * 0.5 + wag * 0.6); c.lineTo(-s * 0.4, -s * 0.15); c.fill();
      c.beginPath(); c.moveTo(s * 0.2, s * 0.25); c.quadraticCurveTo(-s * 0.4, s * 1.2 + wag * 0.5, -s * 0.9, s * 0.6 + wag * 0.6); c.lineTo(-s * 0.4, s * 0.15); c.fill();
      c.fillStyle = '#d0103a'; c.beginPath(); c.ellipse(0, 0, s * 0.75, s * 0.32, 0, 0, Math.PI * 2); c.fill();
      drawEye(c, s * 0.48, -s * 0.06, s * 0.11);
    },
  },
  {
    id: 'tang', name: 'Blue Tang', size: 14, speed: 60, depth: [30, 200], weight: 2.5,
    draw(c, s, wag) {
      drawTail(c, s, wag, '#ffd21f', 0.5, 0.55);
      c.beginPath(); c.ellipse(0, 0, s, s * 0.68, 0, 0, Math.PI * 2);
      c.fillStyle = '#1f6fff'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#0b1a4a';
      c.beginPath(); c.moveTo(s * 0.45, -s * 0.5); c.quadraticCurveTo(-s * 0.2, -s * 0.15, -s * 0.85, -s * 0.55);
      c.lineTo(-s * 0.85, s * 0.05); c.quadraticCurveTo(-s * 0.35, -s * 0.05, -s * 0.1, s * 0.15);
      c.quadraticCurveTo(s * 0.15, -s * 0.2, s * 0.45, -s * 0.5); c.fill();
      c.restore();
      c.fillStyle = '#ffd21f'; c.beginPath(); c.ellipse(s * 0.1, s * 0.35, s * 0.18, s * 0.08, 0.4, 0, Math.PI * 2); c.fill();
      drawEye(c, s * 0.62, -s * 0.12, s * 0.13);
    },
  },
  {
    id: 'angel', name: 'Angelfish', size: 17, speed: 32, depth: [40, 250], weight: 2,
    draw(c, s, wag) {
      c.strokeStyle = 'rgba(230,235,240,.75)'; c.lineWidth = Math.max(1, s * 0.08);
      c.beginPath(); c.moveTo(0, -s * 0.7); c.quadraticCurveTo(-s * 0.5, -s * 1.3, -s * 0.9 + wag * 0.4, -s * 1.55); c.stroke();
      c.beginPath(); c.moveTo(0, s * 0.7); c.quadraticCurveTo(-s * 0.5, s * 1.3, -s * 0.9 + wag * 0.4, s * 1.55); c.stroke();
      drawTail(c, s * 0.8, wag, 'rgba(230,235,240,.7)', 0.5, 0.5);
      c.beginPath(); c.moveTo(s * 0.9, 0); c.lineTo(0, -s * 0.75); c.lineTo(-s * 0.65, 0); c.lineTo(0, s * 0.75); c.closePath();
      c.fillStyle = '#dfe4e8'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#16181a';
      for (const x of [0.38, -0.08, -0.48]) c.fillRect(s * x - s * 0.07, -s, s * 0.14, s * 2);
      c.restore();
      drawEye(c, s * 0.5, -s * 0.08, s * 0.12);
    },
  },
  {
    id: 'puffer', name: 'Pufferfish', size: 13, speed: 28, depth: [40, 260], weight: 1.5,
    // puffs up when hooked (f.puff goes 0 → 1)
    draw(c, s, wag, f) {
      const puff = f?.puff ?? 0, r = s * (0.62 + 0.45 * puff);
      drawTail(c, s * 0.8, wag, '#c9a83a', 0.4, 0.4);
      if (puff > 0.05) {
        c.strokeStyle = '#8a6a1a'; c.lineWidth = 1.5;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          c.lineTo(Math.cos(a) * (r + s * 0.25 * puff), Math.sin(a) * (r + s * 0.25 * puff)); c.stroke();
        }
      }
      const g = c.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#d9b23a');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(90,60,10,.55)';
      for (const [x, y] of [[-0.3, -0.35], [0.05, -0.5], [-0.5, 0.05], [-0.1, 0.3], [0.25, -0.15]]) {
        c.beginPath(); c.arc(x * r, y * r, r * 0.09, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#fffbe0'; c.beginPath(); c.ellipse(0, r * 0.45, r * 0.6, r * 0.35, 0, 0, Math.PI); c.fill();
      drawEye(c, r * 0.55, -r * 0.2, s * 0.2);
    },
  },
  {
    id: 'lion', name: 'Lionfish', size: 16, speed: 24, depth: [80, 350], weight: 1.2,
    draw(c, s, wag) {
      c.strokeStyle = '#f2e4d8'; c.lineWidth = Math.max(1, s * 0.05);
      for (let i = 0; i < 9; i++) {
        const x = s * (0.45 - i * 0.14);
        c.beginPath(); c.moveTo(x, -s * 0.3); c.lineTo(x - s * 0.15 + wag * 0.1, -s * (1.05 + (i % 2) * 0.2)); c.stroke();
      }
      c.fillStyle = 'rgba(200,70,50,.35)';
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(s * 0.15, side * s * 0.2);
        c.quadraticCurveTo(-s * 0.4, side * s * 1.2, -s * 0.95 + wag * 0.3, side * s * 0.9);
        c.quadraticCurveTo(-s * 0.5, side * s * 0.45, s * 0.15, side * s * 0.2); c.fill();
      }
      drawTail(c, s, wag, 'rgba(240,220,210,.7)', 0.45, 0.4);
      c.beginPath(); c.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2);
      c.fillStyle = '#f4e6dc'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#b8261a';
      for (let i = 0; i < 6; i++) { c.save(); c.translate(s * (0.7 - i * 0.32), 0); c.rotate(0.25); c.fillRect(-s * 0.08, -s, s * 0.16, s * 2); c.restore(); }
      c.restore();
      drawEye(c, s * 0.68, -s * 0.1, s * 0.11);
    },
  },
  {
    id: 'mackerel', name: 'Mackerel', size: 22, speed: 90, depth: [30, 450], weight: 2.5, eats: true,
    draw(c, s, wag) {
      basic(c, s, wag, {
        back: '#235f80', side: '#9fc4d6', belly: '#eef4f6', fin: '#4a7f99', h: 0.3, tail: 0.5, spread: 0.6,
        mark(c, s) {
          c.strokeStyle = '#123a52'; c.lineWidth = s * 0.06;
          for (let i = 0; i < 7; i++) {
            const x = s * (0.4 - i * 0.2);
            c.beginPath(); c.moveTo(x, -s * 0.32); c.quadraticCurveTo(x - s * 0.12, -s * 0.18, x + s * 0.02, -s * 0.06); c.stroke();
          }
        },
      });
    },
  },
  {
    id: 'snapper', name: 'Red Snapper', size: 26, speed: 45, depth: [150, 650], weight: 2, eats: true,
    draw(c, s, wag) {
      basic(c, s, wag, { back: '#c8352f', side: '#ef7a62', belly: '#ffd9c8', fin: '#e0574a', h: 0.48, dorsal: 0.3, eye: 0.11 });
    },
  },
  {
    id: 'tuna', name: 'Bluefin Tuna', size: 45, speed: 110, depth: [250, 1000], weight: 1.6, eats: true,
    draw(c, s, wag) {
      basic(c, s, wag, { back: '#16295c', side: '#7f9bb8', belly: '#e6eef5', fin: '#26407a', h: 0.36, tail: 0.6, spread: 0.8, dorsal: 0.25, eye: 0.08 });
      c.fillStyle = '#ffd23a'; // finlets
      for (let i = 0; i < 5; i++) {
        const x = -s * (0.35 + i * 0.08);
        for (const side of [-1, 1]) {
          c.beginPath(); c.moveTo(x, side * s * 0.25); c.lineTo(x - s * 0.06, side * s * 0.36); c.lineTo(x - s * 0.08, side * s * 0.22); c.fill();
        }
      }
    },
  },
  {
    id: 'marlin', name: 'Blue Marlin', size: 60, speed: 120, depth: [450, 1300], weight: 0.9, eats: true,
    draw(c, s, wag) {
      c.fillStyle = '#2a4fa8'; // sail
      c.beginPath(); c.moveTo(s * 0.55, -s * 0.15); c.quadraticCurveTo(s * 0.3, -s * 0.9, -s * 0.1, -s * 0.75);
      c.quadraticCurveTo(-s * 0.4, -s * 0.4, -s * 0.5, -s * 0.15); c.fill();
      c.strokeStyle = '#d0dcf0'; c.lineWidth = s * 0.03; // bill
      c.beginPath(); c.moveTo(s * 0.9, -s * 0.02); c.lineTo(s * 1.65, -s * 0.06); c.stroke();
      basic(c, s, wag, {
        back: '#183680', side: '#5f8fd0', belly: '#e8f0f8', fin: '#2a4fa8', h: 0.24, tail: 0.65, spread: 0.85, eye: 0.06,
        mark(c, s) {
          c.fillStyle = 'rgba(190,220,255,.45)';
          for (let i = 0; i < 8; i++) c.fillRect(s * (0.5 - i * 0.16), -s, s * 0.04, s * 2);
        },
      });
    },
  },
  {
    id: 'shark', name: 'Shark', size: 90, speed: 70, depth: [450, 2100], weight: 0.8, eats: true,
    draw(c, s, wag) {
      c.fillStyle = '#6c7f8f';
      c.beginPath(); c.moveTo(-s * 0.75, 0); // crescent tail, upper lobe longer
      c.lineTo(-s * 1.25, -s * 0.55 + wag); c.quadraticCurveTo(-s * 1.0, -s * 0.05 + wag * 0.5, -s * 1.12, s * 0.35 + wag);
      c.closePath(); c.fill();
      c.beginPath(); c.moveTo(s * 0.15, -s * 0.24); c.lineTo(-s * 0.12, -s * 0.62); c.lineTo(-s * 0.25, -s * 0.22); c.fill(); // dorsal
      c.beginPath(); c.moveTo(s * 0.25, s * 0.12); c.lineTo(-s * 0.15, s * 0.5); c.lineTo(-s * 0.05, s * 0.12); c.fill(); // pectoral
      const g = c.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
      g.addColorStop(0, '#5b6e7e'); g.addColorStop(0.55, '#8a9caa'); g.addColorStop(0.62, '#e9eef1'); g.addColorStop(1, '#f4f7f8');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(s, s * 0.02); c.quadraticCurveTo(s * 0.7, -s * 0.32, 0, -s * 0.28);
      c.quadraticCurveTo(-s * 0.6, -s * 0.2, -s * 0.85, 0); c.quadraticCurveTo(-s * 0.6, s * 0.18, 0, s * 0.26);
      c.quadraticCurveTo(s * 0.7, s * 0.26, s, s * 0.02); c.fill();
      c.strokeStyle = 'rgba(40,55,70,.5)'; c.lineWidth = s * 0.015;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(s * (0.48 - i * 0.05), -s * 0.1); c.lineTo(s * (0.46 - i * 0.05), s * 0.1); c.stroke(); }
      c.fillStyle = '#111'; c.beginPath(); c.arc(s * 0.72, -s * 0.07, s * 0.035, 0, Math.PI * 2); c.fill();
    },
  },
  {
    id: 'angler', name: 'Anglerfish', size: 24, speed: 20, depth: [1100, 2100], weight: 1, eats: true,
    draw(c, s, wag) {
      drawTail(c, s, wag, '#2d1f33', 0.45, 0.5);
      c.strokeStyle = '#4a3550'; c.lineWidth = s * 0.06; // lure stalk
      c.beginPath(); c.moveTo(s * 0.3, -s * 0.6); c.quadraticCurveTo(s * 0.9, -s * 1.3, s * 1.2, -s * 0.75); c.stroke();
      c.fillStyle = '#3b2a3f'; c.beginPath(); c.ellipse(0, 0, s * 0.9, s * 0.72, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1a0f1d'; // mouth
      c.beginPath(); c.moveTo(s * 0.9, -s * 0.05); c.quadraticCurveTo(s * 0.3, s * 0.15, s * 0.85, s * 0.45); c.closePath(); c.fill();
      c.fillStyle = '#f2eee0';
      for (let i = 0; i < 4; i++) { const x = s * (0.85 - i * 0.12); c.beginPath(); c.moveTo(x, s * (0.0 + i * 0.03)); c.lineTo(x - s * 0.04, s * (0.12 + i * 0.03)); c.lineTo(x - s * 0.08, s * (0.02 + i * 0.03)); c.fill(); }
      drawEye(c, s * 0.45, -s * 0.3, s * 0.12);
    },
    // drawn after the deep-water darkness, so it shines
    glow(c, s) {
      c.save(); c.shadowColor = '#bfffef'; c.shadowBlur = s * 0.9;
      c.fillStyle = '#e8fff6'; c.beginPath(); c.arc(s * 1.2, -s * 0.75, s * 0.13, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  },
  {
    id: 'whaleshark', name: 'Whale Shark', size: 150, speed: 35, depth: [1300, 2100], weight: 0.3,
    draw(c, s, wag) {
      c.fillStyle = '#2f4a63';
      c.beginPath(); c.moveTo(-s * 0.75, 0);
      c.lineTo(-s * 1.2, -s * 0.45 + wag); c.quadraticCurveTo(-s * 1.0, wag * 0.5, -s * 1.12, s * 0.3 + wag); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-s * 0.05, -s * 0.24); c.lineTo(-s * 0.25, -s * 0.48); c.lineTo(-s * 0.35, -s * 0.2); c.fill();
      basic(c, s, 0, {
        back: '#2b4560', side: '#466684', belly: '#dfe6ea', fin: 'rgba(0,0,0,0)', h: 0.27, eye: 0.025,
        mark(c, s) {
          c.fillStyle = 'rgba(240,245,250,.8)';
          for (let i = 0; i < 14; i++) for (let j = 0; j < 3; j++) {
            c.beginPath(); c.arc(s * (0.7 - i * 0.11), -s * (0.2 - j * 0.08) + (i % 2) * s * 0.03, s * 0.018, 0, Math.PI * 2); c.fill();
          }
        },
      });
    },
  },
];

// Sightings: they swim past now and then but can't be caught.

// Flukes seen side-on: a thin crescent at the end of the tail stock
function flukes(c, s, wag, color) {
  c.fillStyle = color;
  c.beginPath(); c.moveTo(-s * 0.84, 0);
  c.quadraticCurveTo(-s * 1.02, -s * 0.04 + wag, -s * 1.18, -s * 0.2 + wag);
  c.quadraticCurveTo(-s * 1.08, wag * 0.6, -s * 1.18, s * 0.18 + wag);
  c.quadraticCurveTo(-s * 1.0, s * 0.05 + wag, -s * 0.84, 0); c.fill();
}

export function drawDolphin(c, s, wag) {
  flukes(c, s, wag, '#5d7d99');
  c.beginPath(); c.moveTo(s * 0.05, -s * 0.22); // dorsal fin
  c.quadraticCurveTo(-s * 0.1, -s * 0.5, -s * 0.32, -s * 0.52);
  c.quadraticCurveTo(-s * 0.2, -s * 0.36, -s * 0.3, -s * 0.18); c.fill();
  const g = c.createLinearGradient(0, -s * 0.26, 0, s * 0.22);
  g.addColorStop(0, '#62839f'); g.addColorStop(0.55, '#8eaac2'); g.addColorStop(0.75, '#e8eef3');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(s, s * 0.04); // beak tip, then over the melon and back, then under the belly
  c.quadraticCurveTo(s * 0.86, -s * 0.06, s * 0.72, -s * 0.1);
  c.quadraticCurveTo(s * 0.6, -s * 0.28, s * 0.2, -s * 0.25);
  c.quadraticCurveTo(-s * 0.5, -s * 0.2, -s * 0.88, -s * 0.02);
  c.quadraticCurveTo(-s * 0.5, s * 0.12, s * 0.1, s * 0.2);
  c.quadraticCurveTo(s * 0.6, s * 0.2, s * 0.78, s * 0.07);
  c.quadraticCurveTo(s * 0.9, s * 0.08, s, s * 0.04); c.fill();
  c.fillStyle = '#5d7d99'; c.beginPath(); c.ellipse(s * 0.32, s * 0.16, s * 0.15, s * 0.05, 0.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1a2430'; c.beginPath(); c.arc(s * 0.6, -s * 0.06, s * 0.032, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3d5568'; c.lineWidth = s * 0.015; c.lineCap = 'round'; // smile
  c.beginPath(); c.moveTo(s * 0.97, s * 0.05); c.quadraticCurveTo(s * 0.82, s * 0.09, s * 0.72, s * 0.03); c.stroke();
}

// A humpback: long white flippers, knobbly head, grooved throat
export function drawWhale(c, s, wag) {
  flukes(c, s, wag, '#2e4256');
  c.fillStyle = '#2e4256';
  c.beginPath(); c.moveTo(-s * 0.28, -s * 0.16); c.quadraticCurveTo(-s * 0.36, -s * 0.24, -s * 0.44, -s * 0.15); c.fill(); // small dorsal hump
  const g = c.createLinearGradient(0, -s * 0.22, 0, s * 0.22);
  g.addColorStop(0, '#2b3e52'); g.addColorStop(0.6, '#3d566e'); g.addColorStop(0.8, '#a9b8c3');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(s, s * 0.02);
  c.quadraticCurveTo(s * 0.95, -s * 0.2, s * 0.5, -s * 0.19);
  c.quadraticCurveTo(-s * 0.3, -s * 0.2, -s * 0.88, -s * 0.03);
  c.quadraticCurveTo(-s * 0.4, s * 0.16, s * 0.2, s * 0.22);
  c.quadraticCurveTo(s * 0.85, s * 0.22, s, s * 0.02); c.fill();
  c.save(); c.clip();
  c.strokeStyle = 'rgba(225,235,240,.55)'; c.lineWidth = s * 0.008; // throat grooves
  for (let i = 0; i < 6; i++) { const y = s * (0.08 + i * 0.025); c.beginPath(); c.moveTo(s * 0.95, y - s * 0.04); c.lineTo(s * 0.2, y); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgba(20,30,40,.5)'; // knobs on the head
  for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(s * (0.92 - i * 0.07), -s * (0.08 + i * 0.016), s * 0.012, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#c9d3da';
  c.beginPath(); c.ellipse(s * 0.28, s * 0.22, s * 0.34, s * 0.05, 0.45, 0, Math.PI * 2); c.fill(); // flipper
  c.fillStyle = '#10181f'; c.beginPath(); c.arc(s * 0.62, s * 0.04, s * 0.012, 0, Math.PI * 2); c.fill();
}

for (const sp of SPECIES) console.assert(sp.depth[0] < sp.depth[1] && sp.size > 0 && sp.weight > 0 && sp.draw, 'bad species', sp.id);
