import { _decorator, Color, Component, Graphics, UITransform, Vec2 } from 'cc';
import { SourceSnapshot } from '../core/LightTypes';
import { GlowPulse } from '../effects/GlowPulse';
import { colorToDisplayColor } from '../core/LightTypes';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';

const { ccclass } = _decorator;

@ccclass('LightSourceObject')
export class LightSourceObject extends Component {
  private snapshot!: SourceSnapshot;

  setup(snapshot: SourceSnapshot) {
    this.snapshot = snapshot;
    this.node.layer = 33554432;
    this.node.setPosition(snapshot.position.x - DESIGN_WIDTH * 0.5, snapshot.position.y - DESIGN_HEIGHT * 0.5);
    const transform = this.node.addComponent(UITransform);
    transform.setContentSize(64, 64);
    const graphics = this.node.addComponent(Graphics);
    graphics.fillColor = new Color(255, 255, 255, 120);
    graphics.circle(0, 0, 24);
    graphics.fill();
    graphics.fillColor = colorToDisplayColor(snapshot.color);
    graphics.circle(0, 0, 12);
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 180);
    graphics.lineWidth = 2;
    const dir = Vec2.RIGHT.rotate((snapshot.angle * Math.PI) / 180);
    graphics.moveTo(0, 0);
    graphics.lineTo(dir.x * 30, dir.y * 30);
    graphics.stroke();
    this.node.addComponent(GlowPulse).startPulse(0.96, 1.05, 1.6);
  }

  toSnapshot() {
    return this.snapshot;
  }
}
