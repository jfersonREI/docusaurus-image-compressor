# Docusaurus Image Compressor

In-place image compressor for Docusaurus sites using [Sharp](https://sharp.pixelplumbing.com/).

Designed for documentation sites full of screenshots. It prioritizes sharpness over maximum compression so text and UI elements stay crisp.

- Works on images in place (no need to move files or update references)
- Recursive — scans all subfolders
- Dry-run mode to preview savings before changing anything
- High-quality settings tuned for screenshots
- Only replaces a file when the compressed version is actually smaller **and** meets the minimum savings threshold
- Parallel processing for faster runs on large image sets
- Confirmation prompt before any real changes
- Command-line folder targeting

## Features

- JPEG: quality 92 + mozjpeg + 4:4:4 chroma (excellent for UI text)
- PNG: lossless maximum compression
- WebP: high quality
- Optional mild resize only for very large images (> 2560px)
- Minimum savings threshold (default 10%) — skips files that barely shrink
- Parallel processing (auto-detects CPU cores, or set manually)
- Live progress indicator with ETA for large runs
- Tracks failed files and shows them in the summary
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

You can customize settings by editing `compress.config.js` (recommended).  
If the file is missing, the script falls back to the same defaults.

**Example `compress.config.js`:**

```js
export default {
  directories: ['static', 'docs'],
  quality: 92,
  maxWidth: 2560,
  skipSmallerThan: 15 * 1024,
  minSavingsPercent: 10,
  concurrency: 8,
};
```

### Config options

| Option               | Type          | Default          | Description |
|----------------------|---------------|------------------|-------------|
| `directories`        | `string[]`    | `['static', 'docs']` | Folders scanned when you don’t pass a folder on the command line |
| `quality`            | `number`      | `92`             | JPEG and WebP quality (0–100). 90–95 keeps screenshots sharp |
| `maxWidth`           | `number` \| `null` | `2560`      | Resize images wider than this. Set to `null` to never resize |
| `skipSmallerThan`    | `number`      | `15360` (15 KB)  | Skip files smaller than this (in bytes) |
| `minSavingsPercent`  | `number`      | `10`             | Only replace a file if the compressed version is at least this % smaller |
| `concurrency`        | `number` \| `null` | `null` (auto) | How many images to process in parallel. `null` = auto-detect based on CPU cores |


**Notes**
- PNG compression is always lossless (the `quality` setting does not apply to PNGs).
- Command-line folders always override the `directories` list.
- You can omit any option — missing ones fall back to the defaults above.


## Example output

```
Settings: quality=92, min savings=10%, concurrency=8 (auto)

Found 142 files to check...

Progress: 71/142 (50%)  ETA: 12s
✓ docs/screenshots/login.png          1.42 MB → 612 KB  (−57.0%)
✓ static/img/dashboard.png            890 KB → 310 KB  (−65.2%)

Progress: 142/142 (100%)

Summary:
  Compressed: 3
  Skipped:    2
  Failed:     1
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
