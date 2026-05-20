import { _decorator, Component, Node, tween, Tween, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('GlowPulse')
export class GlowPulse extends Component {
  private pulseTween: Tween<Node> | null = null;

  startPulse(minScale = 0.98, maxScale = 1.06, duration = 1.2) {
    this.stopPulse();
    this.node.setScale(new Vec3(minScale, minScale, 1));
    this.pulseTween = tween(this.node)
      .repeatForever(
        tween(this.node)
          .to(duration * 0.5, { scale: new Vec3(maxScale, maxScale, 1) })
          .to(duration * 0.5, { scale: new Vec3(minScale, minScale, 1) }),
      )
      .start();
  }

  stopPulse() {
    this.pulseTween?.stop();
    this.pulseTween = null;
  }
}
