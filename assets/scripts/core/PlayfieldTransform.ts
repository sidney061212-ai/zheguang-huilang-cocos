import { Rect, UITransform, Vec2, Vec3 } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH, PLAY_AREA_RECT } from './Constants';
import { clamp } from '../utils/MathUtils';

export class PlayfieldTransform {
  private static rootTransform: UITransform | null = null;
  private static playfieldRect = new Rect(
    PLAY_AREA_RECT.x,
    PLAY_AREA_RECT.y,
    PLAY_AREA_RECT.width,
    PLAY_AREA_RECT.height,
  );
  private static designWidth = DESIGN_WIDTH;
  private static designHeight = DESIGN_HEIGHT;

  static configureContext(context: {
    rootTransform?: UITransform | null;
    playfieldRect?: Rect | null;
    designWidth?: number;
    designHeight?: number;
  }) {
    if (context.rootTransform !== undefined) {
      this.rootTransform = context.rootTransform;
    }
    if (context.playfieldRect) {
      this.playfieldRect = new Rect(
        context.playfieldRect.x,
        context.playfieldRect.y,
        context.playfieldRect.width,
        context.playfieldRect.height,
      );
    }
    if (typeof context.designWidth === 'number' && context.designWidth > 0) {
      this.designWidth = context.designWidth;
    }
    if (typeof context.designHeight === 'number' && context.designHeight > 0) {
      this.designHeight = context.designHeight;
    }
  }

  static setRootTransform(rootTransform: UITransform | null) {
    this.rootTransform = rootTransform;
  }

  static setPlayfieldRect(playfieldRect: Rect) {
    this.playfieldRect = new Rect(playfieldRect.x, playfieldRect.y, playfieldRect.width, playfieldRect.height);
  }

  static uiToPlayfield(uiPos: Vec2): Vec2 {
    return new Vec2(uiPos.x + this.designWidth * 0.5, uiPos.y + this.designHeight * 0.5);
  }

  static playfieldToUi(levelPos: Vec2): Vec2 {
    return new Vec2(levelPos.x - this.designWidth * 0.5, levelPos.y - this.designHeight * 0.5);
  }

  static screenToPlayfield(touchUiPos: Vec2): Vec2 {
    if (!this.rootTransform) {
      return touchUiPos.clone();
    }
    const local = this.rootTransform.convertToNodeSpaceAR(new Vec3(touchUiPos.x, touchUiPos.y, 0));
    return this.uiToPlayfield(new Vec2(local.x, local.y));
  }

  static clampToPlayfield(levelPos: Vec2, radius = 0): Vec2 {
    const rect = this.playfieldRect;
    return new Vec2(
      clamp(levelPos.x, rect.x + radius, rect.x + rect.width - radius),
      clamp(levelPos.y, rect.y + radius, rect.y + rect.height - radius),
    );
  }

  static isInsidePlayfield(levelPos: Vec2, margin = 0): boolean {
    const rect = this.playfieldRect;
    return (
      levelPos.x >= rect.x + margin &&
      levelPos.x <= rect.x + rect.width - margin &&
      levelPos.y >= rect.y + margin &&
      levelPos.y <= rect.y + rect.height - margin
    );
  }
}
