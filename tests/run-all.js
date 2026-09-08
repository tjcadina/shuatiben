const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testFiles = fs.readdirSync(__dirname)
  .filter((f) => /^test-.*\.js$/.test(f))
  .sort();
let failed = false;
for (const f of testFiles) {
  console.log(`\n=== ${f} ===`);
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed = true;
}
if (failed) {
  console.error('\nSOME TESTS FAILED');
  process.exit(1);
}
console.log('\nALL TESTS PASSED');
