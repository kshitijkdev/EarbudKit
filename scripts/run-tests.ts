import { readdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const testDir = join(__dirname, '../src/store/__tests__');
const files = readdirSync(testDir).filter((f) => f.endsWith('.test.ts'));

console.log(`Found ${files.length} test suites.`);
let failed = false;

for (const file of files) {
  console.log(`\n=============================`);
  console.log(`Running ${file}`);
  console.log(`=============================`);
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'cmd.exe' : 'npx';
  const args = isWin ? ['/c', 'npx', 'tsx', join(testDir, file)] : ['tsx', join(testDir, file)];
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\n❌ Test ${file} failed with exit code ${result.status}`);
    failed = true;
    break;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('\n✅ All test suites passed successfully!');
}
