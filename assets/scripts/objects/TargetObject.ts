import { _decorator, Color, Component, Graphics, UITransform, Vec2, Vec3 } from 'cc';
import { GlowPulse } from '../effects/GlowPulse';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';

const { ccclass } = _decorator;

type TargetColor = 'white' | 'red' | 'green' | 'blue' | 'yellow' | 'cyan' | 'magenta' | string;

interface TargetSnapshotLike {
  id: string;
  position: Vec2;
  radius: number;
  acceptedColors: TargetColor[];
  requiredIntensity: number;
  required: boolean;
}

interface TargetRuntimeVisualState {
  hit: boolean;
  completed: boolean;
  colorMatched: boolean;
  intensityEnough: boolean;
  chargeRatio: number;
  reason: 'none' | 'wrong_color' | 'low_intensity' | 'not_hit';
}

const colorToDisplayColor = (color: TargetColor) => {
  switch (color) {
    case 'red':
      return new Color(255, 130, 148, 255);
    case 'green':
      return new Color(122, 236, 176, 255);
    case 'blue':
      return new Color(120, 196, 255, 255);
    case 'yellow':
      return new Color(255, 224, 126, 255);
    case 'cyan':
      return new Color(130, 238, 255, 255);
    case 'magenta':
      return new Color(255, 142, 240, 255);
    case 'white':
    default:
      return new Color(241, 248, 255, 255);
  }
};

@ccclass('TargetObject')
export class TargetObject extends Component {
  private snapshot!: TargetSnapshotLike;
  private visualState: TargetRuntimeVisualState = {
    hit: false,
    completed: false,
    colorMatched: false,
    intensityEnough: false,
    chargeRatio: 0,
    reason: 'not_hit',
  };
  private wrongColorFlashUntil = 0;

  setup(snapshot: TargetSnapshotLike) {
    this.snapshot = snapshot;
    this.node.layer = 33554432;
    this.node.setPosition(new Vec3(snapshot.position.x - DESIGN_WIDTH * 0.5, snapshot.position.y - DESIGN_HEIGHT * 0.5, 0));
    this.node.addComponent(UITransform).setContentSize(snapshot.radius * 4, snapshot.radius * 4);
    this.refresh();
  }

  setHit(hit: boolean) {
    this.setRuntimeState({
      hit,
      completed: hit,
      colorMatched: hit,
      intensityEnough: hit,
      chargeRatio: hit ? 1 : 0,
      reason: hit ? 'none' : 'not_hit',
    });
  }

  setRuntimeState(next: Partial<TargetRuntimeVisualState>) {
    const merged: TargetRuntimeVisualState = {
      ...this.visualState,
      ...next,
      chargeRatio: Math.max(0, Math.min(1, next.chargeRatio ?? this.visualState.chargeRatio)),
    };
    const reasonChanged = this.visualState.reason !== merged.reason;
    this.visualState = merged;

    if (merged.reason === 'wrong_color' && reasonChanged) {
      this.wrongColorFlashUntil = Date.now() + 180;
      setTimeout(() => {
        if (Date.now() >= this.wrongColorFlashUntil) {
          this.refresh();
        }
      }, 200);
    }

    const pulse = this.node.getComponent(GlowPulse) ?? this.node.addComponent(GlowPulse);
    if (merged.completed) {
      pulse.startPulse(0.96, 1.12, 0.56);
    } else if (merged.hit && merged.colorMatched && merged.intensityEnough) {
      pulse.startPulse(0.96, 1.08, 0.82);
    } else if (merged.hit && merged.colorMatched) {
      pulse.startPulse(0.98, 1.05, 1.08);
    } else {
      pulse.stopPulse();
      this.node.setScale(1, 1, 1);
    }
    this.refresh();
  }

  toSnapshot() {
    return this.snapshot;
  }

  private refresh() {
    const graphics = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
    graphics.clear();
    const accepted = this.snapshot.acceptedColors[0] ?? 'white';
    const acceptedColor = colorToDisplayColor(accepted);
    const wrongColor = new Color(255, 166, 112, 255);
    const ring = this.visualState.reason === 'wrong_color' ? wrongColor : acceptedColor;
    const completed = this.visualState.completed;
    const hit = this.visualState.hit;
    const colorMatched = this.visualState.colorMatched;
    const intensityEnough = this.visualState.intensityEnough;
    const flashingWrongColor = this.visualState.reason === 'wrong_color' && Date.now() < this.wrongColorFlashUntil;
    const outerAlpha = completed
      ? 166
      : hit
        ? colorMatched
          ? intensityEnough
            ? 142
            : 110
          : flashingWrongColor
            ? 176
            : 86
        : 58;

    graphics.fillColor = new Color(225, 238, 255, outerAlpha);
    graphics.circle(0, 0, this.snapshot.radius + 10);
    graphics.fill();

    graphics.lineWidth = 6;
    graphics.strokeColor = new Color(ring.r, ring.g, ring.b, completed ? 255 : hit ? 228 : 198);
    graphics.circle(0, 0, this.snapshot.radius);
    graphics.stroke();

    const coreAlpha = completed
      ? 210
      : hit
        ? colorMatched
          ? intensityEnough
            ? 176
            : 132
          : 120
        : 78;
    const coreRadius = completed
      ? this.snapshot.radius - 2
      : hit
        ? this.snapshot.radius - (1 + (1 - this.visualState.chargeRatio) * 4)
        : this.snapshot.radius - 8;
    graphics.fillColor = new Color(ring.r, ring.g, ring.b, coreAlpha);
    graphics.circle(0, 0, coreRadius);
    graphics.fill();

    if (!completed && this.visualState.chargeRatio > 0.01) {
      graphics.lineWidth = 4;
      graphics.strokeColor = new Color(acceptedColor.r, acceptedColor.g, acceptedColor.b, 230);
      graphics.arc(0, 0, this.snapshot.radius + 6, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * this.visualState.chargeRatio, false);
      graphics.stroke();
    }

    if (!completed && hit && colorMatched && !intensityEnough) {
      graphics.lineWidth = 2;
      graphics.strokeColor = new Color(acceptedColor.r, acceptedColor.g, acceptedColor.b, 118);
      graphics.circle(0, 0, this.snapshot.radius - 6);
      graphics.stroke();
    }
  }
}
