// compress.config.js
// Optional configuration file. If this file exists, the script will use these values.
// Delete or rename this file to fall back to the defaults in compress-images.js.

export default {
  // Folders to scan when no folder is passed on the command line
  directories: [
    'static',
    'docs',
  ],

  // JPEG / WebP quality (90–95 recommended for screenshots)
  quality: 92,

  // Only resize images wider than this (set to null to disable)
  maxWidth: 2560,

  // Skip files smaller than this (bytes)
  skipSmallerThan: 15 * 1024,

  // Only replace a file if savings are at least this percentage
  minSavingsPercent: 10,

  // Number of images to process in parallel
  // Set to a number to override, or null / omit for auto-detect (based on CPU cores)
  concurrency: null,
};
