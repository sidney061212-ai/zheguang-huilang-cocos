import { _decorator, Color, Graphics, Vec2 } from 'cc';
import { PrismSnapshot } from '../core/LightTypes';
import { DraggableOpticObject } from './DraggableOpticObject';

const { ccclass } = _decorator;

@ccclass('PrismObject')
export class PrismObject extends DraggableOpticObject {
  private size = 58;
  private dispersion = 8;

  setup(snapshot: PrismSnapshot, options?: { movable?: boolean; rotatable?: boolean }) {
    this.size = snapshot.size;
    this.dispersion = snapshot.dispersion;
    this.setupBase(
      snapshot.id,
      snapshot.position,
      snapshot.angle,
      options?.movable ?? true,
      options?.rotatable ?? true,
    );
  }

  toSnapshot(): PrismSnapshot {
    return {
      id: this.opticId,
      position: this.getDesignPosition(),
      angle: this.getAngle(),
      size: this.size,
      dispersion: this.dispersion,
    };
  }

  getTouchRadius() {
    return this.size + 8;
  }

  getDisplayName() {
    return '三棱镜';
  }

  protected drawVisual(graphics: Graphics) {
    const tint = this.getTintColor();
    graphics.fillColor = new Color(218, 235, 255, Math.min(194, tint.a));
    graphics.strokeColor = new Color(232, 244, 255, tint.a);
    graphics.lineWidth = 4;
    graphics.moveTo(0, this.size);
    graphics.lineTo(-this.size * 0.866, -this.size * 0.5);
    graphics.lineTo(this.size * 0.866, -this.size * 0.5);
    graphics.close();
    graphics.fill();
    graphics.stroke();
    graphics.lineWidth = 2;
    graphics.strokeColor = new Color(255, 146, 164, 152);
    graphics.moveTo(-this.size * 0.42, -this.size * 0.12);
    graphics.lineTo(this.size * 0.18, this.size * 0.48);
    graphics.stroke();
    graphics.strokeColor = new Color(126, 198, 255, 152);
    graphics.moveTo(0, -this.size * 0.36);
    graphics.lineTo(this.size * 0.52, 0.12 * this.size);
    graphics.stroke();
  }
}
