import { _decorator, Color, Component, Graphics, UITransform, Vec3 } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';
import { ObstacleSnapshot } from '../core/LightTypes';

const { ccclass } = _decorator;

@ccclass('ObstacleObject')
export class ObstacleObject extends Component {
  private snapshot!: ObstacleSnapshot;

  setup(snapshot: ObstacleSnapshot) {
    this.snapshot = snapshot;
    this.node.layer = 33554432;
    this.node.setPosition(new Vec3(snapshot.position.x - DESIGN_WIDTH * 0.5, snapshot.position.y - DESIGN_HEIGHT * 0.5, 0));
    this.node.addComponent(UITransform).setContentSize(snapshot.width, snapshot.height);
    const graphics = this.node.addComponent(Graphics);
    graphics.fillColor = new Color(113, 129, 158, 196);
    graphics.roundRect(-snapshot.width * 0.5, -snapshot.height * 0.5, snapshot.width, snapshot.height, 18);
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 70);
    graphics.lineWidth = 2;
    graphics.roundRect(-snapshot.width * 0.5, -snapshot.height * 0.5, snapshot.width, snapshot.height, 18);
    graphics.stroke();
  }

  toSnapshot() {
    return this.snapshot;
  }
}
