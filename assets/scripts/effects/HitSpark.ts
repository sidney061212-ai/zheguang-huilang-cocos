import { _decorator, Color, Component, Graphics, Node, tween, UIOpacity, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('HitSpark')
export class HitSpark extends Component {
  static spawn(parent: Node, x: number, y: number, color: Color, radius = 16) {
    const node = new Node('HitSpark');
    node.parent = parent;
    node.setPosition(new Vec3(x, y, 0));
    const spark = node.addComponent(HitSpark);
    spark.play(color, radius);
  }

  play(color: Color, radius: number) {
    const graphics = this.node.addComponent(Graphics);
    const opacity = this.node.addComponent(UIOpacity);
    graphics.fillColor = color;
    graphics.circle(0, 0, radius);
    graphics.fill();
    this.node.setScale(new Vec3(0.35, 0.35, 1));
    tween(this.node)
      .parallel(
        tween(this.node).to(0.28, { scale: new Vec3(1.4, 1.4, 1) }),
        tween(opacity).to(0.28, { opacity: 0 }),
      )
      .call(() => this.node.destroy())
      .start();
  }
}
