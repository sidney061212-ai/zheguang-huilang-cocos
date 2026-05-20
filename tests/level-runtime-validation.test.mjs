import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const cjsRequire = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const moduleCache = new Map();

const transpileTs = (filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
};

const resolveTsImport = (baseDir, specifier) => {
  const direct = path.resolve(baseDir, specifier);
  const candidates = [
    direct,
    `${direct}.ts`,
    `${direct}.js`,
    path.join(direct, 'index.ts'),
    path.join(direct, 'index.js'),
  ];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!resolved) {
    throw new Error(`Unable to resolve "${specifier}" from "${baseDir}"`);
  }
  return resolved;
};

const loadTsModule = (entryFile) => {
  const resolved = path.resolve(entryFile);
  if (moduleCache.has(resolved)) {
    return moduleCache.get(resolved);
  }

  const code = transpileTs(resolved);
  const module = { exports: {} };
  moduleCache.set(resolved, module.exports);

  const dirname = path.dirname(resolved);
  const localRequire = (specifier) => {
    if (specifier === 'cc') {
      return cjsRequire('cc');
    }
    if (specifier.startsWith('.')) {
      const nextFile = resolveTsImport(dirname, specifier);
      return loadTsModule(nextFile);
    }
    return cjsRequire(specifier);
  };

  const wrapped = `(function(require, module, exports, __filename, __dirname) { ${code}\n})`;
  const script = new vm.Script(wrapped, { filename: resolved });
  const executor = script.runInThisContext();
  executor(localRequire, module, module.exports, resolved, dirname);

  moduleCache.set(resolved, module.exports);
  return module.exports;
};

const toVec2 = (x, y) => {
  const { Vec2 } = cjsRequire('cc');
  return new Vec2(x, y);
};

const loadRuntime = () => {
  const constants = loadTsModule(path.join(projectRoot, 'assets/scripts/core/Constants.ts'));
  const { levels } = loadTsModule(path.join(projectRoot, 'assets/scripts/data/levels.ts'));
  const { RaySolver } = loadTsModule(path.join(projectRoot, 'assets/scripts/optics/RaySolver.ts'));
  return { constants, levels, RaySolver };
};

const buildWorld = (level, constants) => {
  const playArea = constants.PLAY_AREA_RECT;
  return {
    bounds: {
      x: playArea.x,
      y: playArea.y,
      width: playArea.width,
      height: playArea.height,
    },
    rules: {
      maxDistance: level.rules?.maxDistance ?? constants.DEFAULT_MAX_DISTANCE,
      maxBounces: level.rules?.maxBounces ?? constants.DEFAULT_MAX_BOUNCES,
      maxRays: level.rules?.maxRays ?? constants.DEFAULT_MAX_RAYS,
      maxSplitDepth: level.rules?.maxSplitDepth ?? constants.DEFAULT_MAX_SPLIT_DEPTH,
      minIntensity: level.rules?.minIntensity ?? constants.DEFAULT_MIN_INTENSITY,
    },
    sources: (level.sources ?? []).map((source) => ({
      id: source.id,
      position: toVec2(source.x, source.y),
      angle: source.angle,
      color: source.color ?? 'white',
      intensity: source.intensity ?? 1,
      beamWidth: source.beamWidth ?? 8,
    })),
    mirrors: (level.mirrors ?? []).map((mirror) => ({
      id: mirror.id,
      position: toVec2(mirror.x, mirror.y),
      angle: mirror.angle,
      length: mirror.length,
      reflectivity: mirror.reflectivity ?? 0.92,
    })),
    prisms: (level.prisms ?? []).map((prism) => ({
      id: prism.id,
      position: toVec2(prism.x, prism.y),
      angle: prism.angle,
      size: prism.size,
      dispersion: prism.dispersion ?? prism.dispersionAngle ?? 12,
    })),
    targets: (level.targets ?? []).map((target) => ({
      id: target.id,
      position: toVec2(target.x, target.y),
      radius: target.radius,
      acceptedColors: target.acceptedColors ?? ['white'],
      requiredIntensity: target.requiredIntensity ?? 0.2,
      required: target.required ?? true,
    })),
    obstacles: (level.obstacles ?? []).map((obstacle) => ({
      id: obstacle.id,
      position: toVec2(obstacle.x, obstacle.y),
      width: obstacle.width,
      height: obstacle.height,
    })),
  };
};

const isClearedFromResult = (result, level) => {
  if (typeof result?.cleared === 'boolean') {
    return result.cleared;
  }
  const required = (level.targets ?? []).filter((target) => target.required ?? true);
  if (result?.targetStates) {
    return required.every((target) => Boolean(result.targetStates[target.id]?.completed));
  }
  if (result?.targetHits) {
    return required.every((target) => Boolean(result.targetHits[target.id]?.hit));
  }
  return false;
};

test('levels should contain 8 mechanism validation stages', () => {
  const { levels } = loadRuntime();
  assert.equal(levels.length, 8, 'levels.ts should contain exactly 8 levels for mechanism validation');
});

test('initial runtime clear state: level 1 may clear, levels 2-8 must not clear', () => {
  const { levels, constants, RaySolver } = loadRuntime();
  assert.equal(levels.length, 8, 'this validation expects 8 levels');

  const solver = new RaySolver();
  const initialClears = levels.map((level) => {
    const world = buildWorld(level, constants);
    const result = solver.solve(world);
    return isClearedFromResult(result, level);
  });

  assert.equal(initialClears[0], true, 'level 1 should support initial clear as tutorial demonstration');
  initialClears.slice(1).forEach((cleared, index) => {
    assert.equal(cleared, false, `level ${index + 2} should not be cleared in initial state`);
  });
});
