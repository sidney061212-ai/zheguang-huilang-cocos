import { Color, Graphics, Node } from 'cc';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';

type SolverColor = 'white' | 'red' | 'green' | 'blue' | 'yellow' | 'cyan' | 'magenta' | string;

interface SegmentLike {
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  color: SolverColor;
  beamWidth?: number;
  intensityStart: number;
  intensityEnd: number;
}

interface HitLike {
  type: 'mirror' | 'prism' | 'target' | 'obstacle' | 'boundary' | string;
  point: { x: number; y: number };
  color: SolverColor;
  intensity: number;
}

interface RenderResultLike {
  segments?: SegmentLike[];
  rays?: SegmentLike[];
  impacts?: HitLike[];
  hits?: HitLike[];
}

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

  render(result: RenderResultLike) {
    this.clear();
    const segments = result.rays ?? result.segments ?? [];
    const hits = result.hits ?? result.impacts ?? [];

    segments.forEach((segment) => this.renderSegment(segment));
    hits.forEach((hit) => this.renderHit(hit));
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

  private renderSegment(segment: SegmentLike) {
    const start = segment.from ?? segment.start;
    const end = segment.to ?? segment.end;
    if (!start || !end) {
      return;
    }
    const startLocal = toLocal(start.x, start.y);
    const endLocal = toLocal(end.x, end.y);
    const base = colorToDisplayColor(segment.color);
    const intensity = clamp(average(segment.intensityStart, segment.intensityEnd), 0.15, 1);
    const widthScale = clamp(0.6 + intensity * 0.8, 0.6, 1.4);
    const baseWidth = Math.max(2, (segment.beamWidth ?? 8) * widthScale);

    this.drawLine(this.glow, startLocal.x, startLocal.y, endLocal.x, endLocal.y, baseWidth * 2.6, withAlpha(base, 24 + intensity * 70));
    this.drawLine(this.beam, startLocal.x, startLocal.y, endLocal.x, endLocal.y, baseWidth * 1.18, withAlpha(base, 96 + intensity * 126));
    this.drawLine(
      this.highlight,
      startLocal.x,
      startLocal.y,
      endLocal.x,
      endLocal.y,
      Math.max(1.2, baseWidth * 0.34),
      withAlpha(blend(base, new Color(255, 255, 255, 255), 0.62), 132 + intensity * 110),
    );
  }

  private renderHit(hit: HitLike) {
    const point = toLocal(hit.point.x, hit.point.y);
    const color = colorToDisplayColor(hit.color);
    const intensity = clamp(hit.intensity, 0.15, 1);

    if (hit.type === 'mirror') {
      this.impacts.fillColor = withAlpha(new Color(255, 255, 255, 255), 150 + intensity * 84);
      this.impacts.circle(point.x, point.y, 2.8 + intensity * 3.6);
      this.impacts.fill();
      return;
    }

    if (hit.type === 'prism') {
      this.impacts.fillColor = withAlpha(color, 146 + intensity * 72);
      this.impacts.circle(point.x, point.y, 4 + intensity * 5);
      this.impacts.fill();
      this.impacts.lineWidth = 1.2;
      this.impacts.strokeColor = withAlpha(new Color(255, 255, 255, 255), 120 + intensity * 78);
      this.impacts.circle(point.x, point.y, 6 + intensity * 6);
      this.impacts.stroke();
      return;
    }

    if (hit.type === 'obstacle') {
      this.impacts.fillColor = withAlpha(new Color(255, 184, 118, 255), 138 + intensity * 76);
      this.impacts.circle(point.x, point.y, 3 + intensity * 4.4);
      this.impacts.fill();
      return;
    }

    if (hit.type === 'target') {
      this.impacts.fillColor = withAlpha(color, 132 + intensity * 98);
      this.impacts.circle(point.x, point.y, 3.4 + intensity * 5.2);
      this.impacts.fill();
      return;
    }

    this.impacts.fillColor = withAlpha(color, 82 + intensity * 72);
    this.impacts.circle(point.x, point.y, 2.2 + intensity * 3.2);
    this.impacts.fill();
  }
}

const withAlpha = (base: Color, alpha: number) => new Color(base.r, base.g, base.b, Math.max(0, Math.min(255, Math.round(alpha))));
const average = (a: number, b: number) => (a + b) * 0.5;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const blend = (from: Color, to: Color, t: number) => {
  const ratio = clamp(t, 0, 1);
  return new Color(
    Math.round(from.r + (to.r - from.r) * ratio),
    Math.round(from.g + (to.g - from.g) * ratio),
    Math.round(from.b + (to.b - from.b) * ratio),
    Math.round(from.a + (to.a - from.a) * ratio),
  );
};

const colorToDisplayColor = (color: SolverColor) => {
  switch (color) {
    case 'red':
      return new Color(255, 126, 144, 255);
    case 'green':
      return new Color(128, 230, 172, 255);
    case 'blue':
      return new Color(120, 196, 255, 255);
    case 'yellow':
      return new Color(255, 224, 132, 255);
    case 'cyan':
      return new Color(132, 236, 255, 255);
    case 'magenta':
      return new Color(255, 138, 238, 255);
    case 'white':
    default:
      return new Color(240, 247, 255, 255);
  }
};

const toLocal = (x: number, y: number) => ({
  x: x - DESIGN_WIDTH * 0.5,
  y: y - DESIGN_HEIGHT * 0.5,
});
