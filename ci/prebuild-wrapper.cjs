#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');

function runIfExists(relPath) {
  if (fs.existsSync(relPath)) {
    const res = spawnSync(process.execPath, [relPath], { stdio: 'inherit' });
    if (res.status !== 0) process.exit(res.status);
  }
}

// run check-inflight if present
runIfExists('scripts/check-inflight.cjs');

process.exit(0);
