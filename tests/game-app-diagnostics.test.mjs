import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('GameApp diagnostics label uses a dedicated child node', () => {
  const source = fs.readFileSync(new URL('../assets/scripts/app/GameApp.ts', import.meta.url), 'utf8');

  assert.match(
    source,
    /ensureSceneNode\('DebugOverlayLabel',\s*labelNode\)/,
    'Debug overlay text should live on a child node instead of sharing a node with Graphics',
  );
});
