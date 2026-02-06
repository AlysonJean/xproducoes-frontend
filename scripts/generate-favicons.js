import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const svgPath = path.join(publicDir, 'xproducoes-logo.svg');

  const sizes = [32, 64, 192, 512];

  const svg = await readFile(svgPath);

  await Promise.all(
    sizes.map(async (s) => {
      const out = path.join(publicDir, `favicon-${s}.png`);
      await sharp(svg).resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(out);
    })
  );

  console.log('Generated favicons:', sizes.map((s) => `favicon-${s}.png`).join(', '));
}

generate().catch((err) => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
});
