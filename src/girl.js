// The girl in the boat: seated, facing right, with the deck at y = 0 (the boat's own coordinates).
// mood: 'calm' | 'alert' (a fish is biting) | 'happy' (holding up a catch)
// crank: angle of the reel handle, which turns while reeling. hood: 0..1, up when it rains.

const HAIR = '#3dbd7d', HAIR_DARK = '#278e5a', HAIR_LIGHT = '#7fe0a8';
const SKIN = '#ffe0c8', SKIN_SHADE = '#f5c4a8';
const COAT = '#ffcf4a', COAT_DARK = '#e8b02e', TROUSERS = '#3b5fa0', BOOTS = '#e0493e';
const INK = '#2a2230';

export const ROD_BUTT = { x: -2, y: -14 };
const HEAD = { x: -11, y: -60 };

function ponytail(c, t, sway) {
  const tipX = -44 + sway, tipY = -36 + Math.sin(t * 3.1) * 2;
  c.fillStyle = HAIR_DARK;
  c.beginPath(); c.moveTo(-20, -68);
  c.bezierCurveTo(-40, -70, -46 + sway * 0.4, -54, tipX, tipY);
  c.bezierCurveTo(-34 + sway * 0.5, -44, -30, -54, -19, -58); c.fill();
  c.strokeStyle = HAIR; c.lineWidth = 1.5; // a couple of strands
  c.beginPath(); c.moveTo(-24, -66); c.quadraticCurveTo(-38, -62, tipX + 4, tipY + 4); c.stroke();
  c.fillStyle = '#ff7eb6'; // scrunchie
  c.beginPath(); c.ellipse(-22, -66, 3, 4.5, 0.4, 0, Math.PI * 2); c.fill();
}

function face(c, t, mood) {
  const ex = -3, ey = -59;
  c.strokeStyle = INK; c.fillStyle = INK; c.lineCap = 'round';
  if (mood === 'happy') { // ^ eye
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(ex - 3, ey + 1); c.quadraticCurveTo(ex, ey - 4, ex + 3, ey + 1); c.stroke();
  } else if (mood !== 'alert' && t % 4.2 < 0.13) { // blink
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 3, ey); c.lineTo(ex + 3, ey); c.stroke();
  } else {
    const h = mood === 'alert' ? 4.6 : 3.8;
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 2.8, h, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2f6b4f'; c.beginPath(); c.ellipse(ex + 0.6, ey + 0.4, 2.1, h - 0.9, 0, 0, Math.PI * 2); c.fill(); // green iris
    c.fillStyle = INK; c.beginPath(); c.ellipse(ex + 0.8, ey + 0.6, 1.1, h - 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 1.4, ey - 1.2, 0.9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.4; // lashes
    c.beginPath(); c.moveTo(ex - 3, ey - h + 0.6); c.quadraticCurveTo(ex, ey - h - 1, ex + 3.4, ey - h + 0.2); c.stroke();
  }
  c.strokeStyle = HAIR_DARK; c.lineWidth = 1.3; // eyebrow, raised when alert
  const lift = mood === 'alert' ? 2 : 0;
  c.beginPath(); c.moveTo(ex - 3, ey - 7 - lift); c.quadraticCurveTo(ex, ey - 8.5 - lift, ex + 3, ey - 7 - lift); c.stroke();
  c.fillStyle = SKIN_SHADE; c.beginPath(); c.arc(1.5, -55, 1.1, 0, Math.PI * 2); c.fill(); // nose
  c.fillStyle = 'rgba(255,120,140,.45)'; c.beginPath(); c.ellipse(-6, -53, 3.2, 2, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 1.3;
  if (mood === 'alert') { c.beginPath(); c.ellipse(-0.5, -50, 1.5, 2, 0, 0, Math.PI * 2); c.fill(); }
  else if (mood === 'happy') {
    c.beginPath(); c.moveTo(-3, -51.5); c.quadraticCurveTo(-0.5, -46.5, 2, -51.5); c.closePath(); c.fill();
    c.fillStyle = '#ff8fa3'; c.beginPath(); c.arc(-0.5, -49.3, 1.2, 0, Math.PI * 2); c.fill();
  } else { c.strokeStyle = '#c0566a'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-2, -50.5); c.quadraticCurveTo(-0.3, -49.2, 1.2, -50.6); c.stroke(); }
}

function hair(c) {
  c.fillStyle = HAIR;
  c.beginPath(); // cap over the back and top of the head
  c.arc(HEAD.x - 0.5, HEAD.y - 1.5, 14.6, Math.PI * 0.72, Math.PI * 1.98);
  c.quadraticCurveTo(4, -62, 1, -64); // fringe swoops down over the forehead
  c.quadraticCurveTo(-4, -60, -7, -64);
  c.quadraticCurveTo(-10, -58, -16, -60);
  c.quadraticCurveTo(-21, -54, -23, -48); // lock down past the ear
  c.closePath(); c.fill();
  c.fillStyle = HAIR; // side lock falling in front of the ear to the cheek
  c.beginPath(); c.moveTo(-15, -62); c.quadraticCurveTo(-11, -54, -13, -45);
  c.quadraticCurveTo(-16, -50, -19, -56); c.closePath(); c.fill();
  c.strokeStyle = HAIR_DARK; c.lineWidth = 1; // strand lines so it reads as hair, not a hat
  for (const [x0, y0, x1, y1] of [[-14, -72, -4, -63], [-20, -68, -12, -61], [-8, -73, 1, -66]]) {
    c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + 2, (y0 + y1) / 2 - 2, x1, y1); c.stroke();
  }
  c.strokeStyle = HAIR_LIGHT; c.lineWidth = 1.6; c.lineCap = 'round'; // shine
  c.beginPath(); c.arc(HEAD.x - 1, HEAD.y - 2, 10.5, Math.PI * 1.25, Math.PI * 1.55); c.stroke();
  c.fillStyle = '#ffd84a'; // star hair clip
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.6 : 3.8;
    c.lineTo(-6 + Math.cos(a) * r, -70 + Math.sin(a) * r);
  }
  c.fill();
}

function hoodUp(c) {
  c.fillStyle = COAT;
  c.beginPath(); c.arc(HEAD.x - 1, HEAD.y - 1, 16.5, Math.PI * 0.62, Math.PI * 1.9);
  c.quadraticCurveTo(0, -66, -2, -60); c.quadraticCurveTo(-14, -62, -16, -46); c.closePath(); c.fill();
  c.strokeStyle = COAT_DARK; c.lineWidth = 1.5;
  c.beginPath(); c.arc(HEAD.x - 1, HEAD.y - 1, 16.5, Math.PI * 1.2, Math.PI * 1.85); c.stroke();
  c.fillStyle = HAIR; // fringe peeking out
  c.beginPath(); c.moveTo(-1, -66); c.quadraticCurveTo(-6, -60, -10, -64); c.quadraticCurveTo(-8, -68, -1, -66); c.fill();
}

export function drawGirl(c, { t, mood, crank, hood, sway }) {
  ponytail(c, t, sway);
  // legs and boots
  c.strokeStyle = TROUSERS; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-14, -15); c.lineTo(5, -17); c.lineTo(9, -9); c.stroke();
  c.fillStyle = BOOTS; c.beginPath(); c.roundRect(4, -10, 14, 8, [3, 5, 3, 3]); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(6, -9, 6, 1.5);
  // back arm, holding the rod
  c.strokeStyle = COAT_DARK; c.lineWidth = 6.5;
  c.beginPath(); c.moveTo(-9, -41); c.quadraticCurveTo(-2, -30, 8, -31); c.stroke();
  // coat: body, collar, buttons, pocket
  c.fillStyle = COAT;
  c.beginPath(); c.moveTo(-24, -44); c.quadraticCurveTo(-12, -49, -2, -44);
  c.lineTo(1, -14); c.quadraticCurveTo(-13, -10, -29, -14); c.closePath(); c.fill();
  c.fillStyle = COAT_DARK;
  c.beginPath(); c.moveTo(-14, -46); c.lineTo(-4, -45); c.lineTo(-8, -39); c.closePath(); c.fill();
  c.fillStyle = '#fff6d8';
  for (const y of [-36, -28, -20]) { c.beginPath(); c.arc(-3.5, y, 1.3, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = COAT_DARK; c.lineWidth = 1.2; c.strokeRect(-22, -24, 8, 6);
  // head
  c.fillStyle = SKIN; c.beginPath(); c.arc(HEAD.x, HEAD.y, 13, 0, Math.PI * 2); c.fill();
  c.fillStyle = SKIN_SHADE; c.beginPath(); c.arc(-17, -57, 3, 0, Math.PI * 2); c.fill(); // ear
  if (hood > 0.5) hoodUp(c); else hair(c);
  face(c, t, mood);
  // front arm: turning the reel, or held up high with the catch
  const hand = mood === 'happy' ? { x: 14, y: -86 } : { x: 9 + Math.cos(crank) * 4, y: -26 + Math.sin(crank) * 4 };
  c.strokeStyle = COAT; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-15, -40);
  if (mood === 'happy') c.quadraticCurveTo(-4, -60, hand.x, hand.y); else c.quadraticCurveTo(-8, -26, hand.x - 3, hand.y);
  c.stroke();
  c.fillStyle = SKIN; c.beginPath(); c.arc(hand.x, hand.y, 3.6, 0, Math.PI * 2); c.fill();
}

// The rod with its reel, from the butt at her side to the tip
export function drawRod(c, tip, crank) {
  c.strokeStyle = '#6b4226'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(ROD_BUTT.x, ROD_BUTT.y);
  c.quadraticCurveTo(40, -70, tip.x, tip.y); c.stroke();
  c.strokeStyle = '#3a2416'; c.lineWidth = 4.5; // cork grip
  c.beginPath(); c.moveTo(ROD_BUTT.x, ROD_BUTT.y); c.lineTo(10, -30); c.stroke();
  c.fillStyle = '#9aa6b2'; c.beginPath(); c.arc(8, -24, 4.5, 0, Math.PI * 2); c.fill(); // reel
  c.fillStyle = '#5c6670'; c.beginPath(); c.arc(8, -24, 1.6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#5c6670'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(8, -24); c.lineTo(9 + Math.cos(crank) * 4, -26 + Math.sin(crank) * 4); c.stroke();
}
