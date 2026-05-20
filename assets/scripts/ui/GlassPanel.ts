import { _decorator, Color, Component, Graphics, Node, UITransform, Vec3 } from 'cc';
import { PANEL_BORDER, PANEL_FILL, PANEL_SHADOW } from '../core/Constants';

const { ccclass } = _decorator;

export interface GlassPanelOptions {
  width: number;
  height: number;
  radius: number;
  fillColor: Color;
  strokeColor: Color;
  shadowColor: Color;
  highlightColor: Color;
  glowColor: Color;
}

const defaultStyle = (): GlassPanelOptions => ({
  width: 220,
  height: 120,
  radius: 26,
  fillColor: PANEL_FILL,
  strokeColor: PANEL_BORDER,
  shadowColor: PANEL_SHADOW,
  highlightColor: new Color(224, 240, 255, 122),
  glowColor: new Color(136, 190, 255, 34),
});

@ccclass('GlassPanel')
export class GlassPanel extends Component {
  private style: GlassPanelOptions = defaultStyle();
  private shadowNode: Node | null = null;
  private highlightNode: Node | null = null;
  private glowNode: Node | null = null;

  onLoad() {
    this.ensureNodes();
    this.redraw();
  }

  setup(options: Partial<GlassPanelOptions>) {
    this.style = {
      ...this.style,
      ...options,
    };
    this.redraw();
  }

  private redraw() {
    this.ensureNodes();
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(this.style.width, this.style.height);

    const body = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
    const shadow = this.shadowNode!.getComponent(Graphics) ?? this.shadowNode!.addComponent(Graphics);
    const highlight = this.highlightNode!.getComponent(Graphics) ?? this.highlightNode!.addComponent(Graphics);
    const glow = this.glowNode!.getComponent(Graphics) ?? this.glowNode!.addComponent(Graphics);

    shadow.clear();
    shadow.fillColor = this.style.shadowColor;
    shadow.roundRect(-this.style.width * 0.5, -this.style.height * 0.5, this.style.width, this.style.height, this.style.radius);
    shadow.fill();

    body.clear();
    body.fillColor = this.style.fillColor;
    body.roundRect(-this.style.width * 0.5, -this.style.height * 0.5, this.style.width, this.style.height, this.style.radius);
    body.fill();
    body.lineWidth = 1.6;
    body.strokeColor = this.style.strokeColor;
    body.roundRect(-this.style.width * 0.5, -this.style.height * 0.5, this.style.width, this.style.height, this.style.radius);
    body.stroke();

    highlight.clear();
    highlight.lineWidth = 1.4;
    highlight.strokeColor = this.style.highlightColor;
    highlight.moveTo(-this.style.width * 0.5 + 16, this.style.height * 0.5 - 16);
    highlight.lineTo(this.style.width * 0.5 - 16, this.style.height * 0.5 - 16);
    highlight.stroke();
    highlight.fillColor = new Color(this.style.highlightColor.r, this.style.highlightColor.g, this.style.highlightColor.b, Math.round(this.style.highlightColor.a * 0.28));
    highlight.roundRect(
      -this.style.width * 0.5 + 14,
      this.style.height * 0.16,
      Math.max(52, this.style.width * 0.36),
      12,
      6,
    );
    highlight.fill();

    glow.clear();
    glow.fillColor = this.style.glowColor;
    glow.circle(-this.style.width * 0.2, this.style.height * 0.14, Math.min(this.style.width, this.style.height) * 0.2);
    glow.fill();
    glow.fillColor = new Color(this.style.glowColor.r, this.style.glowColor.g, this.style.glowColor.b, Math.round(this.style.glowColor.a * 0.55));
    glow.circle(this.style.width * 0.18, -this.style.height * 0.08, Math.min(this.style.width, this.style.height) * 0.1);
    glow.fill();
  }

  private ensureNodes() {
    this.shadowNode = this.ensureChild('GlassShadow', new Vec3(0, -8, 0));
    this.highlightNode = this.ensureChild('GlassHighlight', new Vec3(0, 0, 0));
    this.glowNode = this.ensureChild('GlassGlow', new Vec3(0, 0, 0));
  }

  private ensureChild(name: string, position: Vec3) {
    let node = this.node.getChildByName(name);
    if (!node) {
      node = new Node(name);
      node.parent = this.node;
      node.layer = this.node.layer;
      node.addComponent(UITransform);
    }
    node.layer = this.node.layer;
    node.setPosition(position);
    return node;
  }
}

export const createGlassPanelNode = (
  name: string,
  layer: number,
  width: number,
  height: number,
  options: Partial<GlassPanelOptions> = {},
) => {
  const node = new Node(name);
  node.layer = layer;
  node.addComponent(UITransform).setContentSize(width, height);
  const panel = node.addComponent(GlassPanel);
  panel.setup({
    width,
    height,
    ...options,
  });
  return { node, panel };
};
