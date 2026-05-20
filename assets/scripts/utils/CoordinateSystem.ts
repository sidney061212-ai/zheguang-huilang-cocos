import { Node, Size, UITransform, Vec2, Vec3 } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';

export class CoordinateSystem {
  private readonly designSize = new Size(DESIGN_WIDTH, DESIGN_HEIGHT);
  private scale = 1;
  private canvasSize = new Size(DESIGN_WIDTH, DESIGN_HEIGHT);

  applyToFrame(frame: Node, canvasTransform: UITransform) {
    this.canvasSize = canvasTransform.contentSize.clone();
    this.scale = Math.min(this.canvasSize.width / this.designSize.width, this.canvasSize.height / this.designSize.height);
    frame.setScale(this.scale, this.scale, 1);
    frame.setPosition(new Vec3(0, 0, 0));
    return this.scale;
  }

  getScale() {
    return this.scale;
  }

  isLandscape() {
    return this.canvasSize.width > this.canvasSize.height;
  }

  getCanvasSize() {
    return this.canvasSize.clone();
  }

  designToLocal(point: Vec2) {
    return new Vec3(point.x - this.designSize.width * 0.5, point.y - this.designSize.height * 0.5, 0);
  }

  localToDesign(point: Vec2) {
    return new Vec2(point.x + this.designSize.width * 0.5, point.y + this.designSize.height * 0.5);
  }

  getDesignSize() {
    return this.designSize.clone();
  }
}
