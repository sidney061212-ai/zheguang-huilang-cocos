export const SoundKeys = {
  Tap: 'tap',
  DragStart: 'drag_start',
  DragMove: 'drag_move',
  Rotate: 'rotate',
  InvalidAction: 'invalid_action',
  RayHitMirror: 'ray_hit_mirror',
  RayHitPrism: 'ray_hit_prism',
  RayHitTarget: 'ray_hit_target',
  TargetCharge: 'target_charge',
  LevelClear: 'level_clear',
  UiClick: 'tap',
  ObjectPick: 'drag_start',
  ObjectDrop: 'drag_move',
  ObjectRotate: 'rotate',
} as const;

export type SoundKey = typeof SoundKeys[keyof typeof SoundKeys];
