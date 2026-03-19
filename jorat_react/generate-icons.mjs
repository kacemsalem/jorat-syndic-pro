import { writeFile, mkdir } from 'fs/promises';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data: filter byte + RGB per pixel per row
  const rowSize = 1 + width * 3;
  const raw = Buffer.allocUnsafe(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < width; x++) {
      // Rounded square pattern: white "J" region inside blue background
      const cx = x - width / 2, cy = y - height / 2;
      const padding = width * 0.15;
      const inner = width / 2 - padding;
      const isInner = Math.abs(cx) < inner && Math.abs(cy) < inner;
      // Simple letter-like stripe for "J": a vertical bar + bottom curve hint
      const relX = cx / inner, relY = cy / inner;
      const isJ = (relX > 0.1 && relX < 0.45 && relY > -0.8 && relY < 0.8) ||
                  (relX > -0.45 && relX < 0.45 && relY > 0.5 && relY < 0.8) ||
                  (relX > -0.45 && relX < -0.1 && relY > 0.3 && relY < 0.8);
      const pr = y * rowSize + 1 + x * 3;
      if (isInner && isJ) { raw[pr] = 255; raw[pr + 1] = 255; raw[pr + 2] = 255; }
      else { raw[pr] = r; raw[pr + 1] = g; raw[pr + 2] = b; }
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([signature, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
}

await mkdir('public/icons', { recursive: true });
const [r, g, b] = [29, 78, 216]; // #1d4ed8 blue-700
await writeFile('public/icons/icon-192x192.png', createPNG(192, 192, r, g, b));
await writeFile('public/icons/icon-512x512.png', createPNG(512, 512, r, g, b));
console.log('Icons generated: public/icons/icon-192x192.png & icon-512x512.png');
