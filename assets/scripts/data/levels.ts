import {
  DEFAULT_MAX_BOUNCES,
  DEFAULT_MAX_DISTANCE,
  DEFAULT_MAX_RAYS,
  DEFAULT_MAX_SPLIT_DEPTH,
  DEFAULT_MIN_INTENSITY,
  PLAY_AREA_RECT,
} from '../core/Constants';
import { LevelConfig } from '../core/LevelConfig';

const baseRules = {
  maxBounces: DEFAULT_MAX_BOUNCES,
  maxRays: DEFAULT_MAX_RAYS,
  maxDistance: DEFAULT_MAX_DISTANCE,
  minIntensity: DEFAULT_MIN_INTENSITY,
  maxSplitDepth: DEFAULT_MAX_SPLIT_DEPTH,
};

export const levels: LevelConfig[] = [
  {
    id: 'level-1',
    name: '镜面初识',
    hint: '从下方拖出镜子，放到光束前方并旋转，让白光折向上方目标。',
    playArea: { width: PLAY_AREA_RECT.width, height: PLAY_AREA_RECT.height },
    sources: [
      { id: 'source-1', x: 54, y: 300, angle: 0, color: 'white', intensity: 1, beamWidth: 10 },
    ],
    mirrors: [
      { id: 'mirror-1', x: 140, y: 300, angle: 24, length: 96, movable: true, rotatable: true, reflectivity: 0.9 },
    ],
    prisms: [],
    targets: [
      { id: 'target-1', x: 192, y: 570, radius: 22, acceptedColors: ['white'], requiredIntensity: 0.32, required: true },
    ],
    obstacles: [],
    rules: baseRules,
  },
  {
    id: 'level-2',
    name: '二次反射',
    hint: '从道具栏拖出两面镜子，接力反射，把光路送往右上终点。',
    playArea: { width: PLAY_AREA_RECT.width, height: PLAY_AREA_RECT.height },
    sources: [
      { id: 'source-1', x: 54, y: 238, angle: 0, color: 'white', intensity: 1, beamWidth: 10 },
    ],
    mirrors: [
      { id: 'mirror-1', x: 80, y: 238, angle: 20, length: 90, movable: true, rotatable: true, reflectivity: 0.88 },
      { id: 'mirror-2', x: 120, y: 408, angle: 12, length: 90, movable: true, rotatable: true, reflectivity: 0.88 },
    ],
    prisms: [],
    targets: [
      { id: 'target-1', x: 322, y: 528, radius: 22, acceptedColors: ['white'], requiredIntensity: 0.28, required: true },
    ],
    obstacles: [],
    rules: baseRules,
  },
  {
    id: 'level-3',
    name: '绕开遮挡',
    hint: '先把镜子抬高绕开障碍，再微调角度，让光线贴着墙体上沿命中目标。',
    playArea: { width: PLAY_AREA_RECT.width, height: PLAY_AREA_RECT.height },
    sources: [
      { id: 'source-1', x: 54, y: 236, angle: 0, color: 'white', intensity: 1, beamWidth: 10 },
    ],
    mirrors: [
      { id: 'mirror-1', x: 80, y: 236, angle: 40, length: 92, movable: true, rotatable: true, reflectivity: 0.88 },
      { id: 'mirror-2', x: 120, y: 492, angle: 30, length: 92, movable: true, rotatable: true, reflectivity: 0.88 },
    ],
    prisms: [],
    targets: [
      { id: 'target-1', x: 322, y: 612, radius: 22, acceptedColors: ['white'], requiredIntensity: 0.24, required: true },
    ],
    obstacles: [
      { id: 'obstacle-1', x: 206, y: 406, width: 82, height: 214 },
    ],
    rules: baseRules,
  },
  {
    id: 'level-4',
    name: '三棱分光',
    hint: '拖出三棱镜并旋转，让白光在中段分光后，把红光送到目标。',
    playArea: { width: PLAY_AREA_RECT.width, height: PLAY_AREA_RECT.height },
    sources: [
      { id: 'source-1', x: 54, y: 372, angle: 0, color: 'white', intensity: 1, beamWidth: 10 },
    ],
    mirrors: [],
    prisms: [
      { id: 'prism-1', x: 110, y: 372, angle: -20, size: 56, movable: true, rotatable: true, dispersion: 8.5 },
    ],
    targets: [
      { id: 'target-1', x: 316, y: 462, radius: 22, acceptedColors: ['red'], requiredIntensity: 0.18, required: true },
    ],
    obstacles: [],
    rules: {
      ...baseRules,
      maxRays: 48,
      maxSplitDepth: 2,
    },
  },
  {
    id: 'level-5',
    name: '颜色匹配',
    hint: '先把棱镜分出蓝光，再拖镜子调整，让红光也折向上方目标。',
    playArea: { width: PLAY_AREA_RECT.width, height: PLAY_AREA_RECT.height },
    sources: [
      { id: 'source-1', x: 52, y: 360, angle: 0, color: 'white', intensity: 1, beamWidth: 10 },
    ],
    mirrors: [
      { id: 'mirror-1', x: 152, y: 364, angle: 0, length: 92, movable: true, rotatable: true, reflectivity: 0.88 },
    ],
    prisms: [
      { id: 'prism-1', x: 80, y: 304, angle: -12, size: 58, movable: true, rotatable: true, dispersion: 9.5 },
    ],
    targets: [
      { id: 'target-red', x: 318, y: 498, radius: 22, acceptedColors: ['red'], requiredIntensity: 0.16, required: true },
      { id: 'target-blue', x: 324, y: 248, radius: 22, acceptedColors: ['blue'], requiredIntensity: 0.16, required: true },
    ],
    obstacles: [],
    rules: {
      ...baseRules,
      maxRays: 56,
      maxSplitDepth: 2,
    },
  },
];
