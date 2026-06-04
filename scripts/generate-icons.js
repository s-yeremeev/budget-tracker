// Генератор PWA-іконок: гаманець на індиго-фоні. Без зовнішніх залежностей.
// Запуск: node scripts/generate-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// --- CRC32 ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// --- Малювання ---
const BG = [99, 102, 241]; // #6366f1
const WHITE = [255, 255, 255];

function roundRect(x, y, x0, y0, w, h, r) {
  const x1 = x0 + w, y1 = y0 + h;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  // кути
  const corners = [
    [x0 + r, y0 + r], [x1 - r, y0 + r], [x0 + r, y1 - r], [x1 - r, y1 - r],
  ];
  if ((x < x0 + r || x > x1 - r) && (y < y0 + r || y > y1 - r)) {
    const cx = x < x0 + r ? (y < y0 + r ? corners[0][0] : corners[2][0]) : (y < y0 + r ? corners[1][0] : corners[3][0]);
    const cy = y < y0 + r ? (x < x0 + r ? corners[0][1] : corners[1][1]) : (x < x0 + r ? corners[2][1] : corners[3][1]);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  }
  return true;
}

function drawIcon(size, bodyFactor) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const bw = size * bodyFactor;
  const bh = bw * 0.74;
  const bx0 = cx - bw / 2;
  const by0 = cy - bh / 2;
  const r = bw * 0.16;
  const btnX = bx0 + bw - bw * 0.2;
  const btnR = bw * 0.085;
  const stripeY = by0 + bh * 0.3;
  const stripeH = bh * 0.13;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let col = BG;
      if (roundRect(x, y, bx0, by0, bw, bh, r)) {
        col = WHITE;
        // верхня смужка-«клапан»
        if (y >= stripeY && y <= stripeY + stripeH && x > bx0 + r * 0.4 && x < bx0 + bw - r * 0.4) col = BG;
        // кнопка-застібка
        if ((x - btnX) ** 2 + (y - cy + bh * 0.05) ** 2 <= btnR * btnR) col = BG;
      }
      const i = (y * size + x) * 4;
      buf[i] = col[0];
      buf[i + 1] = col[1];
      buf[i + 2] = col[2];
      buf[i + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

const root = path.join(__dirname, "..");
const targets = [
  { file: "public/web-icon-192.png", size: 192, body: 0.52 },
  { file: "public/web-icon-512.png", size: 512, body: 0.52 },
  { file: "public/web-icon-maskable.png", size: 512, body: 0.42 },
  { file: "src/app/icon.png", size: 512, body: 0.52 },
  { file: "src/app/apple-icon.png", size: 180, body: 0.5 },
];
for (const t of targets) {
  const out = path.join(root, t.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, drawIcon(t.size, t.body));
  console.log("✓", t.file, `(${t.size}x${t.size})`);
}
