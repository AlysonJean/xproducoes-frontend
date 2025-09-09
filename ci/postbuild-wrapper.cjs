#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');

function runIfExists(path) {
  if (fs.existsSync(path)) {
    const res = spawnSync(process.execPath, [path], { stdio: 'inherit' });
    if (res.status !== 0) {
      process.exit(res.status);
    }
  } else {
    console.log(`Skipping missing ${path}`);
  }
}

runIfExists('esbuild.seed.js');
runIfExists('scripts/postbuild-run-seed.cjs');
