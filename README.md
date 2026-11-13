# Docusaurus Image Compressor

In-place image compressor for Docusaurus sites using [Sharp](https://sharp.pixelplumbing.com/).

Designed for documentation sites full of screenshots. It prioritizes sharpness over maximum compression so text and UI elements stay crisp.

- Works on images in place (no need to move files or update references)
- Recursive — scans all subfolders
- Dry-run mode to preview savings before changing anything
- High-quality settings tuned for screenshots
- Only replaces a file when the compressed version is actually smaller

## Features

- JPEG: quality 92 + mozjpeg + 4:4:4 chroma (excellent for UI text)
- PNG: lossless maximum compression
- WebP: high quality
- Optional mild resize only for very large images (> 2560px)
- Skips tiny files and folders like `node_modules`, `build`, `.git`

## Installation

```bash
npm install
```

Or if you want to use it as a dependency in an existing Docusaurus project:

```bash
npm install sharp
```

Then copy `compress-images.js` into your project (e.g. into a `scripts/` folder) and add the npm scripts below.

## Usage

### Dry run (recommended first)

```bash
npm run compress:dry
```

or

```bash
node compress-images.js --dry-run
```

This shows what *would* be compressed and the estimated savings without modifying any files.

### Compress a specific folder only

```bash
# Dry run on one folder
npm run compress:dry -- docs/screenshots

# Or
node compress-images.js --dry-run docs/screenshots

# Actually compress one folder
npm run compress -- static/img

# Or
node compress-images.js static/img
```

You can pass multiple folders:

```bash
node compress-images.js docs/screenshots static/img --dry-run
```

If you don’t specify a folder, it falls back to the default list in the script (`static` and `docs`).

### Actual compression

```bash
npm run compress
```

or

```bash
node compress-images.js
```

You’ll be asked to confirm before any files are replaced:

```
⚠️  This will permanently replace image files that can be made smaller.

Are you sure you want to continue? (yes/no):
```

Type `yes` (or `y`) to proceed. Anything else aborts with no changes.

## Configuration

Open `compress-images.js` and edit the constants at the top:

```js
const DIRECTORIES = [
  'static',
  'docs',
  // add more folders
];

const QUALITY = 92;                 // 90–95 is ideal for screenshots
const MAX_WIDTH = 2560;             // set to null to disable resizing
const SKIP_SMALLER_THAN = 15 * 1024;
```

## Example output

```
Dry run — no files will be modified

✓ docs/screenshots/login.png          1.42 MB → 612 KB  (−57.0%)
✓ static/img/dashboard.png            890 KB → 310 KB  (−65.2%)
⏭  docs/images/icon.png               Skipped (small)
✓ docs/screenshots/error.png          2.10 MB → 740 KB  (−64.8%)

Summary:
  Compressed: 3
  Skipped:    1
  Savings:    2.75 MB (−62.1%)

This was a dry run. Run without --dry-run to apply changes.
```

## Recommended workflow

1. Commit your current images (or make a backup).
2. Run `npm run compress:dry` and review the savings.
3. Spot-check a few images at 100% zoom.
4. Run `npm run compress` to apply the changes.
5. Commit the optimized images.

## License

MIT
