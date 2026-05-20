import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('GameApp explicitly orders game layers so play area does not cover gameplay nodes', () => {
  const source = fs.readFileSync(new URL('../assets/scripts/app/GameApp.ts', import.meta.url), 'utf8');

  assert.match(source, /playAreaNode\.setSiblingIndex\(0\)/, 'PlayArea should be forced to the bottom of GameRoot');
  assert.match(source, /this\.rayRoot\.setSiblingIndex\(1\)/, 'RayRoot should render above PlayArea');
  assert.match(source, /this\.blankTapNode\.setSiblingIndex\(2\)/, 'BlankTapNode should sit above rays but below gameplay objects');
  assert.match(source, /this\.objectRoot\.setSiblingIndex\(3\)/, 'ObjectRoot should render above the blank tap surface');
});
