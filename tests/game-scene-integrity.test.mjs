import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const scenePath = path.resolve('assets/scenes/Game.scene');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

const refAt = (id) => scene[id];

const walkRefs = (value, visitor) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkRefs(item, (ref, trail) => visitor(ref, `${index}${trail ? `.${trail}` : ''}`)));
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Object.keys(value).length === 1 && typeof value.__id__ === 'number') {
    visitor(value.__id__, '');
    return;
  }
  Object.entries(value).forEach(([key, child]) => {
    walkRefs(child, (ref, trail) => visitor(ref, `${key}${trail ? `.${trail}` : ''}`));
  });
};

test('Game.scene only references existing objects', () => {
  const missing = [];
  walkRefs(scene, (ref, trail) => {
    if (!refAt(ref)) {
      missing.push({ ref, trail });
    }
  });
  assert.deepEqual(missing, []);
});

test('Game.scene root references the expected prefab and globals records', () => {
  const rootScene = scene[1];
  assert.equal(refAt(rootScene._prefab.__id__).__type__, 'cc.PrefabInfo');
  assert.equal(refAt(rootScene._globals.__id__).__type__, 'cc.SceneGlobals');
});
