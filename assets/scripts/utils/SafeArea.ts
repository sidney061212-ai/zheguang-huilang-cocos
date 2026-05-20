import { SAFE_MARGIN } from '../core/Constants';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export class SafeArea {
  static createInsets(scale: number): SafeAreaInsets {
    const extra = Math.max(0, 8 / Math.max(scale, 0.5));
    return {
      top: SAFE_MARGIN + extra,
      bottom: SAFE_MARGIN + extra,
      left: SAFE_MARGIN,
      right: SAFE_MARGIN,
    };
  }
}
