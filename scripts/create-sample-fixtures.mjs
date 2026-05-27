import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const width = 1200;
const height = 760;

writeFileSync("fixtures/sample-project/captures/step-001.png", makePng(false));
writeFileSync("fixtures/sample-project/captures/step-002.png", makePng(true));

function makePng(activeSettings) {
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    pixels[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      const color = sampleColor(x, y, activeSettings);
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr()),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function sampleColor(x, y, activeSettings) {
  const bg = [247, 249, 252];
  const ink = [30, 41, 59];
  const border = [203, 213, 225];
  const blue = [37, 99, 235];
  const lightBlue = [219, 234, 254];

  if (inside(x, y, 0, 0, width, 72)) return [255, 255, 255];
  if (inside(x, y, 0, 72, 245, height - 72)) return [248, 250, 252];
  if (line(x, y, 0, 72, width, 74) || line(x, y, 245, 72, 247, height)) return border;

  if (inside(x, y, 28, 24, 110, 18)) return ink;
  if (inside(x, y, 278, 24, 260, 22)) return [51, 65, 85];
  if (inside(x, y, 920, 22, 92, 30)) return lightBlue;
  if (inside(x, y, 1028, 22, 92, 30)) return blue;

  const navItems = [
    [28, 120, 166, 38, activeSettings ? false : true],
    [28, 170, 166, 38, activeSettings]
  ];
  for (const [nx, ny, nw, nh, active] of navItems) {
    if (inside(x, y, nx, ny, nw, nh)) return active ? lightBlue : [255, 255, 255];
    if (line(x, y, nx, ny, nw, 2) || line(x, y, nx, ny + nh, nw, 2)) return border;
  }

  if (inside(x, y, 290, 116, 610, 56)) return [255, 255, 255];
  if (inside(x, y, 320, 136, activeSettings ? 235 : 180, 16)) return activeSettings ? blue : [100, 116, 139];
  if (inside(x, y, 290, 210, 760, 340)) return [255, 255, 255];
  if (line(x, y, 290, 210, 760, 2) || line(x, y, 290, 550, 760, 2)) return border;
  if (inside(x, y, 330, 250, 420, 18)) return [51, 65, 85];
  if (inside(x, y, 330, 292, 620, 14)) return [148, 163, 184];
  if (inside(x, y, 330, 330, 540, 14)) return [148, 163, 184];
  if (inside(x, y, 330, 390, 160, 42)) return activeSettings ? blue : [226, 232, 240];

  return bg;
}

function ihdr() {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function inside(x, y, rx, ry, rw, rh) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

function line(x, y, rx, ry, rw, rh) {
  return inside(x, y, rx, ry, rw, rh);
}
