#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────
const DIRECTORIES = [
  'static',
  'docs',
  // Add more folders here if needed
];

const QUALITY = 92;                 // High quality for screenshots (90–95 recommended)
const MAX_WIDTH = 2560;             // Only resize images wider than this (set to null to disable)
const SKIP_SMALLER_THAN = 15 * 1024; // Skip files already smaller than 15 KB

// ─────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');

let totalOriginal = 0;
let totalCompressed = 0;
let compressedCount = 0;
let skippedCount = 0;

async function compressImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;

  const stats = await fs.stat(filePath);
  if (stats.size < SKIP_SMALLER_THAN) {
    console.log(`⏭  Skipped (small): ${path.relative(process.cwd(), filePath)}`);
    skippedCount++;
    return;
  }

  const tmpPath = `${filePath}.tmp`;

  try {
    let pipeline = sharp(filePath).rotate(); // auto-orient from EXIF

    const metadata = await sharp(filePath).metadata();
    if (MAX_WIDTH && metadata.width && metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize({
        width: MAX_WIDTH,
        withoutEnlargement: true,
      });
    }

    // Strip metadata (saves space, no visual impact)
    pipeline = pipeline.withMetadata({ orientation: undefined });

    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({
        quality: QUALITY,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: '4:4:4', // better color fidelity for UI/text
      });
    } else if (ext === '.png') {
      pipeline = pipeline.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        effort: 10,
      });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({
        quality: QUALITY,
        effort: 6,
      });
    }

    await pipeline.toFile(tmpPath);
    const newStats = await fs.stat(tmpPath);

    const savings = ((stats.size - newStats.size) / stats.size * 100).toFixed(1);
    const relPath = path.relative(process.cwd(), filePath);

    if (newStats.size < stats.size) {
      totalOriginal += stats.size;
      totalCompressed += newStats.size;
      compressedCount++;

      if (DRY_RUN) {
        console.log(`✓ ${relPath}  ${formatSize(stats.size)} → ${formatSize(newStats.size)}  (−${savings}%)`);
        await fs.unlink(tmpPath);
      } else {
        await fs.unlink(filePath);
        await fs.rename(tmpPath, filePath);
        console.log(`✓ ${relPath}  ${formatSize(stats.size)} → ${formatSize(newStats.size)}  (−${savings}%)`);
      }
    } else {
      await fs.unlink(tmpPath);
      console.log(`⏭  No savings: ${relPath}`);
      skippedCount++;
    }
  } catch (err) {
    try { await fs.unlink(tmpPath); } catch {}
    console.error(`✗ Failed ${filePath}:`, err.message);
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'build', 'dist', '.docusaurus'].includes(entry.name)) continue;
      await walk(fullPath);
    } else if (entry.isFile()) {
      await compressImage(fullPath);
    }
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

(async () => {
  console.log(DRY_RUN ? 'Dry run — no files will be modified\n' : 'Compressing images...\n');

  for (const dir of DIRECTORIES) {
    try {
      await walk(dir);
    } catch (err) {
      console.warn(`Could not process "${dir}": ${err.message}`);
    }
  }

  const totalSavings = totalOriginal - totalCompressed;
  const percent = totalOriginal > 0
    ? ((totalSavings / totalOriginal) * 100).toFixed(1)
    : 0;

  console.log('\nSummary:');
  console.log(`  Compressed: ${compressedCount}`);
  console.log(`  Skipped:    ${skippedCount}`);
  if (totalOriginal > 0) {
    console.log(`  Savings:    ${formatSize(totalSavings)} (−${percent}%)`);
  }

  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  } else if (compressedCount > 0) {
    console.log('\nDone. Commit the optimized images when ready.');
  }
})();
