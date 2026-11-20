// Pix → PNG 파일. 미리보기 도구가 쓴다. 의존성 없이 zlib 만 쓴다.
import fs from 'node:fs';
import zlib from 'node:zlib';

const table = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(buf) { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, cr]);
}
/** pix: {w,h,d(RGBA)}. scale 배로 키워서 쓴다. bg 가 있으면 빈 자리를 그 색으로 채운다. */
export function writePng(file, pix, scale = 1, bg = null) {
  const W = pix.w * scale, H = pix.h * scale;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 4 + 1);
    const sy = Math.floor(y / scale);
    for (let x = 0; x < W; x++) {
      const i = (sy * pix.w + Math.floor(x / scale)) * 4, o = row + 1 + x * 4;
      const a = pix.d[i + 3] / 255;
      if (bg) { raw[o] = pix.d[i] * a + bg[0] * (1 - a); raw[o + 1] = pix.d[i + 1] * a + bg[1] * (1 - a); raw[o + 2] = pix.d[i + 2] * a + bg[2] * (1 - a); raw[o + 3] = 255; }
      else { raw[o] = pix.d[i]; raw[o + 1] = pix.d[i + 1]; raw[o + 2] = pix.d[i + 2]; raw[o + 3] = pix.d[i + 3]; }
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
