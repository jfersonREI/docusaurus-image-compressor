#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import readline from 'readline';
import { pathToFileURL } from 'url';
import os from 'os';

// ─────────────────────────────────────────────────────────────
// Load config (compress.config.js) if it exists, otherwise use defaults
// ─────────────────────────────────────────────────────────────
const DEFAULTS = {
  directories: ['static', 'docs'],
  quality: 92,
  maxWidth: 2560,
  skipSmallerThan: 15 * 1024,
  minSavingsPercent: 10,
  concurrency: null, // null = auto-detect based on CPU cores
};

let config = { ...DEFAULTS };

try {
  const configPath = path.resolve('compress.config.js');
  await fs.access(configPath);
  const imported = await import(pathToFileURL(configPath).href);
  config = { ...DEFAULTS, ...(imported.default || imported) };
  console.log('Loaded compress.config.js\n');
} catch {
  // No config file — use defaults
}

const {
  directories: DIRECTORIES,
  quality: QUALITY,
  maxWidth: MAX_WIDTH,
  skipSmallerThan: SKIP_SMALLER_THAN,
  minSavingsPercent: MIN_SAVINGS_PERCENT,
  concurrency: CONFIG_CONCURRENCY,
} = config;

// Auto-detect concurrency if not set in config
const CONCURRENCY = CONFIG_CONCURRENCY ?? Math.max(2, os.cpus().length);

// ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// Any non-flag argument is treated as a target folder
const targetFolders = args.filter(arg => !arg.startsWith('--'));

// If no folder is specified, fall back to the default list
const DIRECTORIES_TO_PROCESS = targetFolders.length > 0 ? targetFolders : DIRECTORIES;


let totalOriginal = 0;
let totalCompressed = 0;
let compressedCount = 0;
let skippedCount = 0;
let failedCount = 0;

function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function compressImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;

  const stats = await fs.stat(filePath);
  if (stats.size < SKIP_SMALLER_THAN) {
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

    const savingsPercent = ((stats.size - newStats.size) / stats.size) * 100;
    const savings = savingsPercent.toFixed(1);
    const relPath = path.relative(process.cwd(), filePath);

    if (newStats.size < stats.size && savingsPercent >= MIN_SAVINGS_PERCENT) {
      totalOriginal += stats.size;
      totalCompressed += newStats.size;
      compressedCount++;

      if (DRY_RUN) {
        // Log notable results only
        console.log(`\n✓ ${relPath}  ${formatSize(stats.size)} → ${formatSize(newStats.size)}  (−${savings}%)`);
        await fs.unlink(tmpPath);
      } else {
        await fs.unlink(filePath);
        await fs.rename(tmpPath, filePath);
        console.log(`\n✓ ${relPath}  ${formatSize(stats.size)} → ${formatSize(newStats.size)}  (−${savings}%)`);
      }
    } else {
      await fs.unlink(tmpPath);
      const reason = savingsPercent < MIN_SAVINGS_PERCENT && newStats.size < stats.size
        ? `below ${MIN_SAVINGS_PERCENT}% threshold`
        : 'no savings';
      // Quiet skip for large runs — only log if we want verbose later
      skippedCount++;
    }
  } catch (err) {
    try { await fs.unlink(tmpPath); } catch {}
    console.error(`✗ Failed ${path.relative(process.cwd(), filePath)}: ${err.message}`);
    failedCount++;
  }
}

async function collectFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'build', 'dist', '.docusaurus'].includes(entry.name)) continue;
      await collectFiles(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

// Simple concurrency pool with live progress + ETA
async function processInParallel(items, concurrency, fn) {
  const total = items.length;
  let completed = 0;
  const executing = new Set();
  const startTime = Date.now();

  function formatDuration(ms) {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
  }

  function updateProgress() {
    const percent = Math.round((completed / total) * 100);
    let etaText = '';

    if (completed > 5 && completed < total) {
      const elapsed = Date.now() - startTime;
      const avgPerItem = elapsed / completed;
      const remaining = (total - completed) * avgPerItem;
      etaText = `  ETA: ${formatDuration(remaining)}`;
    }

    process.stdout.write(`\rProgress: ${completed}/${total} (${percent}%)${etaText}   `);
  }

  updateProgress();

  for (const item of items) {
    const p = Promise.resolve().then(async () => {
      await fn(item);
      completed++;
      updateProgress();
    });
    executing.add(p);
    p.finally(() => executing.delete(p));

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  process.stdout.write('\n\n');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

(async () => {
  if (!DRY_RUN) {
    console.log('⚠️  This will permanently replace image files that can be made smaller.\n');
    const answer = await askConfirmation('Are you sure you want to continue? (yes/no): ');
    if (answer !== 'yes' && answer !== 'y') {
      console.log('Aborted. No files were changed.');
      process.exit(0);
    }
    console.log('');
  }

  console.log(DRY_RUN ? 'Dry run — no files will be modified\n' : 'Compressing images...\n');

  if (targetFolders.length > 0) {
    console.log(`Target folder(s): ${targetFolders.join(', ')}\n`);
  }

  console.log(`Settings: quality=${QUALITY}, min savings=${MIN_SAVINGS_PERCENT}%, concurrency=${CONCURRENCY}${CONFIG_CONCURRENCY == null ? ' (auto)' : ''}\n`);

  const allFiles = [];
  for (const dir of DIRECTORIES_TO_PROCESS) {
    try {
      await collectFiles(dir, allFiles);
    } catch (err) {
      console.warn(`Could not process "${dir}": ${err.message}`);
    }
  }

  if (allFiles.length === 0) {
    console.log('No image files found.');
    return;
  }

  console.log(`Found ${allFiles.length} files to check...\n`);

  await processInParallel(allFiles, CONCURRENCY, compressImage);

  const totalSavings = totalOriginal - totalCompressed;
  const percent = totalOriginal > 0
    ? ((totalSavings / totalOriginal) * 100).toFixed(1)
    : 0;

  console.log('\nSummary:');
  console.log(`  Compressed: ${compressedCount}`);
  console.log(`  Skipped:    ${skippedCount}`);
  if (failedCount > 0) {
    console.log(`  Failed:     ${failedCount}`);
  }
  if (totalOriginal > 0) {
    console.log(`  Savings:    ${formatSize(totalSavings)} (−${percent}%)`);
  }

  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  } else if (compressedCount > 0) {
    console.log('\nDone. Commit the optimized images when ready.');
  }
})();
