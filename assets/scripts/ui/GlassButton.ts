import { _decorator, Color, Component, Label, Node, Tween, tween, UITransform, Vec3 } from 'cc';
import { PANEL_BORDER, PANEL_FILL, PANEL_SHADOW, UI_TEXT } from '../core/Constants';
import { GlassPanel, GlassPanelOptions } from './GlassPanel';

const { ccclass } = _decorator;

export type GlassButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface GlassButtonOptions {
  text: string;
  width: number;
  height: number;
  fontSize?: number;
  radius?: number;
  variant?: GlassButtonVariant;
  enabled?: boolean;
  onTap?: () => void;
}

@ccclass('GlassButton')
export class GlassButton extends Component {
  private options: GlassButtonOptions = {
    text: '按钮',
    width: 180,
    height: 54,
    fontSize: 16,
    radius: 20,
    variant: 'secondary',
    enabled: true,
  };
  private panel: GlassPanel | null = null;
  private labelNode: Node | null = null;
  private label: Label | null = null;
  private pressed = false;

  onLoad() {
    this.ensureNodes();
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    this.refresh();
  }

  onDestroy() {
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  }

  setup(options: Partial<GlassButtonOptions>) {
    this.options = {
      ...this.options,
      ...options,
    };
    this.refresh();
  }

  setLabel(text: string) {
    this.options.text = text;
    this.refresh();
  }

  setVariant(variant: GlassButtonVariant) {
    this.options.variant = variant;
    this.refresh();
  }

  setEnabled(enabled: boolean) {
    this.options.enabled = enabled;
    this.refresh();
  }

  private refresh() {
    this.ensureNodes();
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(this.options.width, this.options.height);

    this.panel!.setup({
      width: this.options.width,
      height: this.options.height,
      radius: this.options.radius ?? 20,
      ...variantStyle(this.options.variant ?? 'secondary', this.options.enabled !== false),
    });

    const labelTransform = this.labelNode!.getComponent(UITransform) ?? this.labelNode!.addComponent(UITransform);
    labelTransform.setContentSize(this.options.width - 20, this.options.height - 14);
    this.label!.string = this.options.text;
    this.label!.fontSize = this.options.fontSize ?? 16;
    this.label!.lineHeight = (this.options.fontSize ?? 16) + 8;
    this.label!.overflow = Label.Overflow.SHRINK;
    this.label!.horizontalAlign = Label.HorizontalAlign.CENTER;
    this.label!.verticalAlign = Label.VerticalAlign.CENTER;
    this.label!.color = variantTextColor(this.options.variant ?? 'secondary', this.options.enabled !== false);
  }

  private onTouchStart() {
    if (this.options.enabled === false) {
      return;
    }
    this.pressed = true;
    this.animateScale(0.97);
  }

  private onTouchEnd() {
    if (!this.pressed) {
      return;
    }
    this.pressed = false;
    this.animateScale(1);
    if (this.options.enabled === false) {
      return;
    }
    this.options.onTap?.();
  }

  private onTouchCancel() {
    this.pressed = false;
    this.animateScale(1);
  }

  private animateScale(target: number) {
    Tween.stopAllByTarget(this.node);
    tween(this.node)
      .to(0.08, { scale: new Vec3(target, target, 1) })
      .start();
  }

  private ensureNodes() {
    this.panel = this.node.getComponent(GlassPanel) ?? this.node.addComponent(GlassPanel);
    if (!this.labelNode) {
      this.labelNode = new Node('Label');
      this.labelNode.parent = this.node;
      this.labelNode.layer = this.node.layer;
      this.labelNode.addComponent(UITransform);
      this.label = this.labelNode.addComponent(Label);
    }
    this.labelNode.layer = this.node.layer;
    this.labelNode.setPosition(0, 0, 0);
    this.label = this.labelNode.getComponent(Label) ?? this.labelNode.addComponent(Label);
  }
}

const variantStyle = (variant: GlassButtonVariant, enabled: boolean): Partial<GlassPanelOptions> => {
  const disabledAlpha = enabled ? 1 : 0.56;
  if (variant === 'primary') {
    return {
      fillColor: new Color(74, 145, 255, Math.round(232 * disabledAlpha)),
      strokeColor: new Color(255, 255, 255, Math.round(138 * disabledAlpha)),
      shadowColor: new Color(85, 144, 255, Math.round(74 * disabledAlpha)),
      highlightColor: new Color(255, 255, 255, Math.round(104 * disabledAlpha)),
      glowColor: new Color(186, 217, 255, Math.round(42 * disabledAlpha)),
    };
  }
  if (variant === 'ghost') {
    return {
      fillColor: new Color(255, 255, 255, Math.round(86 * disabledAlpha)),
      strokeColor: new Color(PANEL_BORDER.r, PANEL_BORDER.g, PANEL_BORDER.b, Math.round(156 * disabledAlpha)),
      shadowColor: new Color(PANEL_SHADOW.r, PANEL_SHADOW.g, PANEL_SHADOW.b, Math.round(28 * disabledAlpha)),
      highlightColor: new Color(255, 255, 255, Math.round(92 * disabledAlpha)),
      glowColor: new Color(255, 255, 255, Math.round(18 * disabledAlpha)),
    };
  }
  return {
    fillColor: new Color(PANEL_FILL.r, PANEL_FILL.g, PANEL_FILL.b, Math.round(138 * disabledAlpha)),
    strokeColor: new Color(PANEL_BORDER.r, PANEL_BORDER.g, PANEL_BORDER.b, Math.round(188 * disabledAlpha)),
    shadowColor: new Color(PANEL_SHADOW.r, PANEL_SHADOW.g, PANEL_SHADOW.b, Math.round(42 * disabledAlpha)),
    highlightColor: new Color(255, 255, 255, Math.round(112 * disabledAlpha)),
    glowColor: new Color(255, 255, 255, Math.round(28 * disabledAlpha)),
  };
};

const variantTextColor = (variant: GlassButtonVariant, enabled: boolean) => {
  const alpha = enabled ? 255 : 146;
  if (variant === 'primary') {
    return new Color(255, 255, 255, alpha);
  }
  return new Color(UI_TEXT.r, UI_TEXT.g, UI_TEXT.b, alpha);
};

export const createGlassButton = (
  name: string,
  layer: number,
  options: GlassButtonOptions,
) => {
  const node = new Node(name);
  node.layer = layer;
  node.addComponent(UITransform).setContentSize(options.width, options.height);
  const button = node.addComponent(GlassButton);
  button.setup(options);
  return button;
};
