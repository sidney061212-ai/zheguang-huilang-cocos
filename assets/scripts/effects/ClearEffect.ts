import { _decorator, Color, Component, Graphics, Node, tween, UIOpacity, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('ClearEffect')
export class ClearEffect extends Component {
  static play(parent: Node, x: number, y: number, radius = 120) {
    const node = new Node('ClearEffect');
    node.parent = parent;
    node.setPosition(new Vec3(x, y, 0));
    const effect = node.addComponent(ClearEffect);
    effect.run(radius);
  }

  run(radius: number) {
    const graphics = this.node.addComponent(Graphics);
    const opacity = this.node.addComponent(UIOpacity);
    graphics.lineWidth = 5;
    graphics.strokeColor = new Color(255, 255, 255, 220);
    graphics.circle(0, 0, radius);
    graphics.stroke();
    this.node.setScale(new Vec3(0.35, 0.35, 1));
    tween(this.node)
      .parallel(
        tween(this.node).to(0.6, { scale: new Vec3(1.1, 1.1, 1) }),
        tween(opacity).to(0.6, { opacity: 0 }),
      )
      .call(() => this.node.destroy())
      .start();
  }
}
