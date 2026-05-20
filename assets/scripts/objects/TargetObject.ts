import { _decorator, Color, Component, Graphics, UITransform, Vec2, Vec3 } from 'cc';
import { TargetSnapshot, colorToDisplayColor } from '../core/LightTypes';
import { GlowPulse } from '../effects/GlowPulse';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';

const { ccclass } = _decorator;

@ccclass('TargetObject')
export class TargetObject extends Component {
  private snapshot!: TargetSnapshot;
  private hit = false;

  setup(snapshot: TargetSnapshot) {
    this.snapshot = snapshot;
    this.node.layer = 33554432;
    this.node.setPosition(new Vec3(snapshot.position.x - DESIGN_WIDTH * 0.5, snapshot.position.y - DESIGN_HEIGHT * 0.5, 0));
    this.node.addComponent(UITransform).setContentSize(snapshot.radius * 4, snapshot.radius * 4);
    this.refresh();
  }

  setHit(hit: boolean) {
    if (this.hit === hit) {
      return;
    }
    this.hit = hit;
    const pulse = this.node.getComponent(GlowPulse) ?? this.node.addComponent(GlowPulse);
    if (hit) {
      pulse.startPulse(0.94, 1.1, 0.8);
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
    const ring = colorToDisplayColor(accepted);
    graphics.fillColor = new Color(255, 255, 255, this.hit ? 120 : 52);
    graphics.circle(0, 0, this.snapshot.radius + 10);
    graphics.fill();
    graphics.lineWidth = 6;
    graphics.strokeColor = new Color(ring.r, ring.g, ring.b, this.hit ? 255 : 196);
    graphics.circle(0, 0, this.snapshot.radius);
    graphics.stroke();
    graphics.fillColor = new Color(ring.r, ring.g, ring.b, this.hit ? 175 : 70);
    graphics.circle(0, 0, this.hit ? this.snapshot.radius - 3 : this.snapshot.radius - 8);
    graphics.fill();
  }
}
