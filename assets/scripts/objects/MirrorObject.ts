import { _decorator, Color, Graphics, Vec2 } from 'cc';
import { MirrorSnapshot } from '../core/LightTypes';
import { DraggableOpticObject } from './DraggableOpticObject';

const { ccclass } = _decorator;

@ccclass('MirrorObject')
export class MirrorObject extends DraggableOpticObject {
  private length = 90;
  private reflectivity = 0.9;

  setup(snapshot: MirrorSnapshot, options?: { movable?: boolean; rotatable?: boolean }) {
    this.length = snapshot.length;
    this.reflectivity = snapshot.reflectivity;
    this.setupBase(
      snapshot.id,
      snapshot.position,
      snapshot.angle,
      options?.movable ?? true,
      options?.rotatable ?? true,
    );
  }

  toSnapshot(): MirrorSnapshot {
    return {
      id: this.opticId,
      position: this.getDesignPosition(),
      angle: this.getAngle(),
      length: this.length,
      reflectivity: this.reflectivity,
    };
  }

  getTouchRadius() {
    return this.length * 0.5 + 8;
  }

  getDisplayName() {
    return '镜子';
  }

  protected drawVisual(graphics: Graphics) {
    const tint = this.getTintColor();
    graphics.lineWidth = 14;
    graphics.strokeColor = new Color(88, 140, 206, tint.a);
    graphics.moveTo(-this.length * 0.5, 0);
    graphics.lineTo(this.length * 0.5, 0);
    graphics.stroke();
    graphics.lineWidth = 6;
    graphics.strokeColor = new Color(234, 245, 255, tint.a);
    graphics.moveTo(-this.length * 0.5, 0);
    graphics.lineTo(this.length * 0.5, 0);
    graphics.stroke();
    graphics.fillColor = new Color(226, 240, 255, tint.a);
    graphics.circle(-this.length * 0.5, 0, 5);
    graphics.circle(this.length * 0.5, 0, 5);
    graphics.fill();
  }
}
