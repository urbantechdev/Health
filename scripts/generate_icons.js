import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer: width * 4 bytes per row, plus 1 filter byte per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.46;
  const cornerRadius = isMaskable ? 0 : width * 0.22;

  // Colors
  const bgR = 5, bgG = 150, bgB = 105; // #059669 emerald
  const bg2R = 4, bg2G = 120, bg2B = 87; // #047857 dark emerald
  const whiteR = 255, whiteG = 255, whiteB = 255;
  const pulseR = 5, pulseG = 150, pulseB = 105;

  const crossW = width * (isMaskable ? 0.16 : 0.20);
  const crossLen = width * (isMaskable ? 0.50 : 0.60);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Determine if pixel is inside rounded rect background
      let inBg = true;
      if (!isMaskable) {
        // Rounded rect check
        const dx = Math.max(Math.abs(x - cx) - (cx - cornerRadius), 0);
        const dy = Math.max(Math.abs(y - cy) - (cy - cornerRadius), 0);
        inBg = Math.sqrt(dx * dx + dy * dy) <= cornerRadius;
      }

      if (!inBg) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Check if inside cross
      const inVertBar = Math.abs(x - cx) <= crossW / 2 && Math.abs(y - cy) <= crossLen / 2;
      const inHorizBar = Math.abs(y - cy) <= crossW / 2 && Math.abs(x - cx) <= crossLen / 2;
      const inCross = inVertBar || inHorizBar;

      // Pulse line in center
      const inPulseLine = inCross && Math.abs(y - cy) <= crossW * 0.14 && Math.abs(x - cx) <= crossLen * 0.40;

      if (inPulseLine) {
        rawData[pxOffset] = pulseR;
        rawData[pxOffset + 1] = pulseG;
        rawData[pxOffset + 2] = pulseB;
        rawData[pxOffset + 3] = 255;
      } else if (inCross) {
        rawData[pxOffset] = whiteR;
        rawData[pxOffset + 1] = whiteG;
        rawData[pxOffset + 2] = whiteB;
        rawData[pxOffset + 3] = 255;
      } else {
        // Gradient from top to bottom
        const t = y / height;
        rawData[pxOffset] = Math.round(bgR * (1 - t) + bg2R * t);
        rawData[pxOffset + 1] = Math.round(bgG * (1 - t) + bg2G * t);
        rawData[pxOffset + 2] = Math.round(bgB * (1 - t) + bg2B * t);
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // Helper to write chunk
  function chunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  // CRC32 table
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) | 0;
  }

  // Header PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Pre-build CRC table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, false));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, false));
fs.writeFileSync('public/favicon.ico', createPNG(32, 32, false));

console.log('Successfully generated all PWA icons!');
