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

const buildPlacedMirrors = (level, placements = []) => {
  const byId = new Map(placements.map((placement) => [placement.id, placement]));
  return (level.mirrors ?? []).flatMap((mirror) => {
    const placement = byId.get(mirror.id);
    const inInventory = placement?.inInventory ?? mirror.startsInInventory ?? false;
    if (inInventory) {
      return [];
    }
    return [{
      id: mirror.id,
      position: toVec2(placement?.x ?? mirror.x, placement?.y ?? mirror.y),
      angle: placement?.angle ?? mirror.angle,
      length: mirror.length,
      reflectivity: mirror.reflectivity ?? 0.92,
    }];
  });
};

const buildPlacedPrisms = (level, placements = []) => {
  const byId = new Map(placements.map((placement) => [placement.id, placement]));
  return (level.prisms ?? []).flatMap((prism) => {
    const placement = byId.get(prism.id);
    const inInventory = placement?.inInventory ?? prism.startsInInventory ?? false;
    if (inInventory) {
      return [];
    }
    return [{
      id: prism.id,
      position: toVec2(placement?.x ?? prism.x, placement?.y ?? prism.y),
      angle: placement?.angle ?? prism.angle,
      size: prism.size,
      dispersion: prism.dispersion ?? prism.dispersionAngle ?? 12,
      dispersionAngle: prism.dispersionAngle,
      throughput: prism.throughput ?? 0.82,
    }];
  });
};

const buildWorld = (level, constants, solution = null) => {
  const playArea = constants.PLAY_AREA_RECT;
  const mirrorPlacements = solution?.mirrors ?? [];
  const prismPlacements = solution?.prisms ?? [];
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
    mirrors: buildPlacedMirrors(level, mirrorPlacements),
    prisms: buildPlacedPrisms(level, prismPlacements),
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
      angle: obstacle.angle,
    })),
  };
};

test('levels expose solvable runtime solutions for all 8 stages', () => {
  const { levels, constants, RaySolver } = loadRuntime();
  assert.equal(levels.length, 8, 'levels.ts should contain exactly 8 levels');

  const solver = new RaySolver();
  levels.forEach((level, index) => {
    assert.ok(level.solution, `level ${index + 1} should define solution data`);

    const initialResult = solver.solve(buildWorld(level, constants));
    assert.equal(initialResult.cleared, false, `level ${index + 1} should not clear from its initial state`);

    const solvedResult = solver.solve(buildWorld(level, constants, level.solution));
    assert.equal(solvedResult.cleared, true, `level ${index + 1} should clear after applying solution`);

    const requiredTargets = (level.targets ?? []).filter((target) => target.required ?? true);
    requiredTargets.forEach((target) => {
      assert.equal(
        Boolean(solvedResult.targetStates?.[target.id]?.completed),
        true,
        `level ${index + 1} target ${target.id} should complete after applying solution`,
      );
    });

    const segments = solvedResult.rays ?? solvedResult.segments ?? [];
    assert.ok(segments.length >= 1, `level ${index + 1} should produce at least one ray segment`);

    if (requiredTargets.length >= 2) {
      const completedRequired = requiredTargets.filter((target) => solvedResult.targetStates?.[target.id]?.completed).length;
      assert.equal(
        completedRequired,
        requiredTargets.length,
        `level ${index + 1} should complete all required targets`,
      );
    }

    if ((level.prisms ?? []).length > 0) {
      const emittedColors = new Set(segments.map((segment) => segment.color));
      const hasSplitColor = ['red', 'green', 'blue'].some((color) => emittedColors.has(color));
      assert.equal(hasSplitColor, true, `level ${index + 1} should emit colored rays after prism split`);
    }
  });
});
