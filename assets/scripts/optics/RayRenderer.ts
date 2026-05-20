import { Color, Graphics, Node } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';
import { colorToDisplayColor, SolveResult } from '../core/LightTypes';
import { average } from '../utils/MathUtils';

export class RayRenderer {
  private readonly glow: Graphics;
  private readonly beam: Graphics;
  private readonly highlight: Graphics;
  private readonly impacts: Graphics;

  constructor(root: Node) {
    this.glow = this.createLayer(root, 'GlowLayer');
    this.beam = this.createLayer(root, 'BeamLayer');
    this.highlight = this.createLayer(root, 'HighlightLayer');
    this.impacts = this.createLayer(root, 'ImpactLayer');
  }

  clear() {
    this.glow.clear();
    this.beam.clear();
    this.highlight.clear();
    this.impacts.clear();
  }

  render(result: SolveResult) {
    this.clear();
    result.segments.forEach((segment) => {
      const base = colorToDisplayColor(segment.color);
      const strength = average(segment.intensityStart, segment.intensityEnd);
      const width = Math.max(2, segment.beamWidth * (0.42 + strength * 0.58));
      const start = toLocal(segment.start.x, segment.start.y);
      const end = toLocal(segment.end.x, segment.end.y);
      this.drawLine(this.glow, start.x, start.y, end.x, end.y, width * 2.8, withAlpha(base, 34 + 82 * strength));
      this.drawLine(this.beam, start.x, start.y, end.x, end.y, width * 1.1, withAlpha(base, 110 + 110 * strength));
      this.drawLine(this.highlight, start.x, start.y, end.x, end.y, Math.max(1.4, width * 0.38), withAlpha(new Color(255, 255, 255, 255), 150 + 90 * strength));
    });
    result.impacts.forEach((impact) => {
      const point = toLocal(impact.point.x, impact.point.y);
      const color = withAlpha(colorToDisplayColor(impact.color), 86 + impact.intensity * 110);
      this.impacts.fillColor = color;
      this.impacts.circle(point.x, point.y, 3 + impact.intensity * 10);
      this.impacts.fill();
    });
  }

  private drawLine(graphics: Graphics, x1: number, y1: number, x2: number, y2: number, width: number, color: Color) {
    graphics.lineWidth = width;
    graphics.strokeColor = color;
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.stroke();
  }

  private createLayer(root: Node, name: string) {
    const node = new Node(name);
    node.parent = root;
    node.layer = root.layer;
    const graphics = node.addComponent(Graphics);
    graphics.lineCap = Graphics.LineCap.ROUND;
    graphics.lineJoin = Graphics.LineJoin.ROUND;
    return graphics;
  }
}

const withAlpha = (base: Color, alpha: number) => new Color(base.r, base.g, base.b, Math.max(0, Math.min(255, Math.round(alpha))));

const toLocal = (x: number, y: number) => ({
  x: x - DESIGN_WIDTH * 0.5,
  y: y - DESIGN_HEIGHT * 0.5,
});
