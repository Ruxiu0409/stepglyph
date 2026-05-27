import { deflateSync, inflateSync } from "node:zlib";
import { Annotation } from "./schema.js";

type DecodedPng = {
  width: number;
  height: number;
  pixels: Buffer;
};

const PNG_SIGNATURE = "89504e470d0a1a0a";

export function renderAnnotatedPng(source: Buffer, annotations: Annotation[]): Buffer {
  const image = decodePng(source);
  for (const annotation of annotations) {
    if (annotation.hidden) continue;
    drawAnnotation(image, annotation);
  }
  return encodePng(image);
}

function decodePng(source: Buffer): DecodedPng {
  if (source.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) {
    throw new Error("Screenshot is not a PNG file");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let compression = 0;
  let filter = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  while (offset < source.length) {
    const length = source.readUInt32BE(offset);
    const type = source.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = source.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      compression = data[10];
      filter = data[11];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0) {
    throw new Error("Only 8-bit non-interlaced PNG screenshots are supported");
  }
  if (colorType !== 2 && colorType !== 6) {
    throw new Error("Only RGB and RGBA PNG screenshots are supported");
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rowBytes = width * bytesPerPixel;
  const raw = Buffer.alloc(rowBytes * height);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const rowStart = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const rawValue = inflated[inputOffset + x];
      const left = x >= bytesPerPixel ? raw[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? raw[rowStart + x - rowBytes] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? raw[rowStart + x - rowBytes - bytesPerPixel] : 0;
      raw[rowStart + x] = unfilter(rawValue, filterType, left, up, upLeft);
    }
    inputOffset += rowBytes;
  }

  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rawOffset = y * rowBytes + x * bytesPerPixel;
      const pixelOffset = (y * width + x) * 4;
      pixels[pixelOffset] = raw[rawOffset];
      pixels[pixelOffset + 1] = raw[rawOffset + 1];
      pixels[pixelOffset + 2] = raw[rawOffset + 2];
      pixels[pixelOffset + 3] = colorType === 6 ? raw[rawOffset + 3] : 255;
    }
  }

  return { width, height, pixels };
}

function unfilter(value: number, filterType: number, left: number, up: number, upLeft: number) {
  switch (filterType) {
    case 0:
      return value;
    case 1:
      return (value + left) & 0xff;
    case 2:
      return (value + up) & 0xff;
    case 3:
      return (value + Math.floor((left + up) / 2)) & 0xff;
    case 4:
      return (value + paeth(left, up, upLeft)) & 0xff;
    default:
      throw new Error(`Unsupported PNG filter type: ${filterType}`);
  }
}

function paeth(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function encodePng(image: DecodedPng): Buffer {
  const rowBytes = image.width * 4 + 1;
  const rows = Buffer.alloc(rowBytes * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const rowStart = y * rowBytes;
    rows[rowStart] = 0;
    image.pixels.copy(rows, rowStart + 1, y * image.width * 4, (y + 1) * image.width * 4);
  }

  return Buffer.concat([
    Buffer.from(PNG_SIGNATURE, "hex"),
    chunk("IHDR", header(image.width, image.height)),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function drawAnnotation(image: DecodedPng, annotation: Annotation) {
  const color = parseHexColor(annotation.style.color);
  const strokeWidth = annotation.style.size === "large" ? 6 : annotation.style.size === "small" ? 3 : 4;

  if (annotation.target.kind === "point") {
    const x = Math.round(annotation.target.x * (image.width - 1));
    const y = Math.round(annotation.target.y * (image.height - 1));
    const radius = markerRadius(image, annotation.style.size);
    drawCircleFill(image, x, y, radius + strokeWidth * 2, [...color, 42]);
    drawCircleStroke(image, x, y, radius, strokeWidth, [...color, 240]);
    drawCircleStroke(image, x, y, radius + strokeWidth + 3, Math.max(2, strokeWidth - 1), [...color, 72]);
    return;
  }

  const x = Math.round(annotation.target.x * image.width);
  const y = Math.round(annotation.target.y * image.height);
  const width = Math.round(annotation.target.width * image.width);
  const height = Math.round(annotation.target.height * image.height);
  drawRectFill(image, x, y, width, height, [...color, 26]);
  drawRectStroke(image, x, y, width, height, strokeWidth, [...color, 240]);
}

function markerRadius(image: DecodedPng, size: Annotation["style"]["size"]) {
  const scale = size === "large" ? 0.038 : size === "small" ? 0.022 : 0.03;
  const radius = Math.round(Math.min(image.width, image.height) * scale);
  return clamp(radius, 8, 52);
}

function drawCircleFill(image: DecodedPng, cx: number, cy: number, radius: number, color: Rgba) {
  const radiusSquared = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2;
      if (distanceSquared <= radiusSquared) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function drawCircleStroke(
  image: DecodedPng,
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
  color: Rgba
) {
  const outer = radius + thickness / 2;
  const inner = Math.max(0, radius - thickness / 2);
  const outerSquared = outer * outer;
  const innerSquared = inner * inner;
  const search = Math.ceil(outer);
  for (let y = cy - search; y <= cy + search; y += 1) {
    for (let x = cx - search; x <= cx + search; x += 1) {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2;
      if (distanceSquared >= innerSquared && distanceSquared <= outerSquared) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function drawRectFill(
  image: DecodedPng,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgba
) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      blendPixel(image, px, py, color);
    }
  }
}

function drawRectStroke(
  image: DecodedPng,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  color: Rgba
) {
  drawRectFill(image, x, y, width, thickness, color);
  drawRectFill(image, x, y + height - thickness, width, thickness, color);
  drawRectFill(image, x, y, thickness, height, color);
  drawRectFill(image, x + width - thickness, y, thickness, height, color);
}

type Rgba = [number, number, number, number];

function blendPixel(image: DecodedPng, x: number, y: number, color: Rgba) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  const alpha = color[3] / 255;
  const inverse = 1 - alpha;
  image.pixels[offset] = Math.round(color[0] * alpha + image.pixels[offset] * inverse);
  image.pixels[offset + 1] = Math.round(color[1] * alpha + image.pixels[offset + 1] * inverse);
  image.pixels[offset + 2] = Math.round(color[2] * alpha + image.pixels[offset + 2] * inverse);
  image.pixels[offset + 3] = Math.max(image.pixels[offset + 3], color[3]);
}

function parseHexColor(value: string): [number, number, number] {
  const match = value.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return [37, 99, 235];
  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16)
  ];
}

function header(width: number, height: number) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  return buffer;
}

function chunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
