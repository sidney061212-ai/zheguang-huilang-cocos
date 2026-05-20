export const SoundKeys = {
  UiClick: 'ui_click',
  ObjectPick: 'object_pick',
  ObjectDrop: 'object_drop',
  ObjectRotate: 'object_rotate',
  InvalidAction: 'invalid_action',
  RayHitMirror: 'ray_hit_mirror',
  RayHitPrism: 'ray_hit_prism',
  RayHitTarget: 'ray_hit_target',
  TargetCharge: 'target_charge',
  LevelClear: 'level_clear',
} as const;

export type SoundKey = typeof SoundKeys[keyof typeof SoundKeys];
