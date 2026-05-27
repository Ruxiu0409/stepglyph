import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const width = 1200;
const height = 760;

const states = [
  ["step-002.png", "codex-prompt"],
  ["step-003.png", "capture-marker"],
  ["step-004.png", "export-guide"]
];

// step-001.png is a real browser capture of an empty local Studio. Keep it checked in.
states.forEach(([filename, state]) => {
  writeFileSync(
    `fixtures/sample-project/captures/${filename}`,
    makePng(state)
  );
});

function makePng(state) {
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    pixels[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      const color = sampleColor(x, y, state);
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

function sampleColor(x, y, state) {
  if (state === "codex-prompt") return codexColor(x, y);
  return studioColor(x, y, state);
}

function studioColor(x, y, state) {
  const bg = [244, 247, 251];
  const surface = [255, 255, 255];
  const panel = [248, 250, 252];
  const border = [203, 213, 225];
  const ink = [17, 24, 39];
  const muted = [100, 116, 139];
  const blue = [37, 99, 235];
  const blueSoft = [219, 234, 254];
  const teal = [15, 118, 110];

  if (inside(x, y, 0, 0, width, 72)) return surface;
  if (inside(x, y, 0, 72, 250, height - 72)) return panel;
  if (inside(x, y, 930, 72, 270, height - 72)) return [252, 253, 255];
  if (line(x, y, 0, 72, width, 2) || line(x, y, 250, 72, 2, height) || line(x, y, 930, 72, 2, height)) return border;

  if (inside(x, y, 28, 24, 32, 32)) return ink;
  if (inside(x, y, 78, 22, 116, 16)) return ink;
  if (inside(x, y, 78, 46, 130, 12)) return muted;
  if (inside(x, y, 274, 22, state === "blank-studio" ? 150 : 230, 18)) return ink;
  if (inside(x, y, 274, 48, 68, 12)) return muted;
  if (inside(x, y, 836, 22, 72, 30)) return blue;
  if (inside(x, y, 736, 22, 82, 30)) return surface;
  if (line(x, y, 736, 22, 82, 2) || line(x, y, 736, 50, 82, 2)) return border;

  const stepCount = state === "blank-studio" ? 0 : state === "capture-marker" ? 3 : 4;
  for (let index = 0; index < stepCount; index += 1) {
    const y0 = 126 + index * 70;
    const active = (state === "capture-marker" && index === 2) || (state === "export-guide" && index === 3);
    if (inside(x, y, 28, y0, 190, 52)) return active ? blueSoft : surface;
    if (inside(x, y, 46, y0 + 14, 30, 24)) return blueSoft;
    if (inside(x, y, 94, y0 + 14, 96 + index * 10, 12)) return ink;
    if (inside(x, y, 94, y0 + 34, 58, 9)) return muted;
    if (line(x, y, 28, y0, 190, 2) || line(x, y, 28, y0 + 50, 190, 2)) return border;
  }

  if (state === "blank-studio") {
    if (inside(x, y, 330, 204, 520, 300)) return surface;
    if (line(x, y, 330, 204, 520, 2) || line(x, y, 330, 502, 520, 2)) return border;
    if (inside(x, y, 470, 300, 240, 20)) return ink;
    if (inside(x, y, 430, 344, 320, 12)) return muted;
    if (inside(x, y, 460, 374, 260, 12)) return muted;
    if (inside(x, y, 500, 424, 180, 36)) return blueSoft;
  } else {
    if (inside(x, y, 292, 146, 590, 420)) return [235, 239, 247];
    if (inside(x, y, 368, 204, 438, 280)) return surface;
    if (inside(x, y, 440, 244, 250, 14)) return [226, 232, 240];
    if (inside(x, y, 510, 294, 230, 74)) return state === "capture-marker" ? [239, 246, 255] : [245, 247, 251];
    if (inside(x, y, 480, 424, 290, 12)) return border;
  }

  if (state === "capture-marker") {
    if (ring(x, y, 548, 330, 30, 5)) return blue;
    if (inside(x, y, 590, 312, 130, 36)) return blue;
  }

  if (state === "export-guide") {
    if (ring(x, y, 872, 36, 32, 5)) return blue;
    if (inside(x, y, 954, 570, 134, 12)) return muted;
    if (inside(x, y, 954, 600, 92, 10)) return teal;
  }

  if (inside(x, y, 954, 118, 64, 16)) return ink;
  if (inside(x, y, 954, 168, 184, 38)) return surface;
  if (line(x, y, 954, 168, 184, 2) || line(x, y, 954, 204, 184, 2)) return border;
  if (inside(x, y, 954, 250, 192, 110)) return surface;
  if (inside(x, y, 954, 390, 184, 38)) return surface;
  if (inside(x, y, 954, 458, 184, 32)) return state === "capture-marker" ? blue : surface;
  if (line(x, y, 954, 390, 184, 2) || line(x, y, 954, 426, 184, 2)) return border;

  return bg;
}

function codexColor(x, y) {
  const bg = [247, 249, 252];
  const surface = [255, 255, 255];
  const border = [203, 213, 225];
  const ink = [17, 24, 39];
  const muted = [100, 116, 139];
  const teal = [15, 118, 110];
  const blue = [37, 99, 235];

  if (inside(x, y, 0, 0, width, height)) {
    if (inside(x, y, 64, 52, 1072, 656)) return surface;
    if (inside(x, y, 64, 52, 1072, 64)) return ink;
    if (line(x, y, 64, 116, 1072, 2)) return border;
    if (inside(x, y, 104, 86, 128, 12)) return [255, 255, 255];
    if (inside(x, y, 148, 180, 380, 58)) return [248, 250, 252];
    if (inside(x, y, 172, 202, 260, 12)) return muted;
    if (inside(x, y, 476, 310, 470, 96)) return [236, 253, 245];
    if (inside(x, y, 506, 338, 330, 13)) return teal;
    if (inside(x, y, 506, 368, 260, 13)) return muted;
    if (inside(x, y, 148, 534, 760, 64)) return [248, 250, 252];
    if (inside(x, y, 176, 558, 540, 14)) return ink;
    if (inside(x, y, 860, 548, 42, 42)) return blue;
  }
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

function ring(x, y, cx, cy, radius, thickness) {
  const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  return distance >= radius - thickness && distance <= radius + thickness;
}
