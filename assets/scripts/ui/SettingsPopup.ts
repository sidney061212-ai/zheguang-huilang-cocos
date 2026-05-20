import { Color, Graphics, Label, Node, UITransform, Vec3 } from 'cc';
import { UI_SUBTEXT, UI_TEXT } from '../core/Constants';
import { createGlassButton, GlassButton } from './GlassButton';
import { createGlassPanelNode } from './GlassPanel';

export interface SettingsPopupCallbacks {
  onToggleSfx: () => void;
  onToggleVibration: () => void;
  onClose: () => void;
}

export class SettingsPopup {
  public readonly node: Node;
  private readonly sfxButton: GlassButton;
  private readonly vibrationButton: GlassButton;

  constructor(layer: number, callbacks: SettingsPopupCallbacks) {
    this.node = new Node('SettingsPopup');
    this.node.layer = layer;
    this.node.addComponent(UITransform).setContentSize(390, 844);
    this.node.active = false;

    const dim = new Node('Dim');
    dim.parent = this.node;
    dim.layer = layer;
    dim.addComponent(UITransform).setContentSize(390, 844);
    const dimGraphics = dim.addComponent(Graphics);
    dimGraphics.fillColor = new Color(6, 12, 24, 172);
    dimGraphics.rect(-195, -422, 390, 844);
    dimGraphics.fill();
    dim.on(Node.EventType.TOUCH_END, callbacks.onClose);

    const panel = createGlassPanelNode('SettingsPanel', layer, 320, 258, {
      radius: 34,
      fillColor: new Color(18, 34, 58, 214),
      strokeColor: new Color(182, 214, 252, 148),
      glowColor: new Color(120, 178, 255, 56),
    });
    panel.node.parent = this.node;
    panel.node.setPosition(0, 0, 0);

    makeLabel(panel.node, layer, '设置', 28, UI_TEXT, new Vec3(0, 88, 0), 160, 34);
    makeLabel(panel.node, layer, '音效与震动开关。', 14, UI_SUBTEXT, new Vec3(0, 50, 0), 230, 24);

    this.sfxButton = createGlassButton('SfxButton', layer, {
      text: '音效：开',
      width: 248,
      height: 52,
      variant: 'secondary',
      onTap: callbacks.onToggleSfx,
    });
    this.sfxButton.node.parent = panel.node;
    this.sfxButton.node.setPosition(0, -2, 0);

    this.vibrationButton = createGlassButton('VibrationButton', layer, {
      text: '震动：开',
      width: 248,
      height: 52,
      variant: 'secondary',
      onTap: callbacks.onToggleVibration,
    });
    this.vibrationButton.node.parent = panel.node;
    this.vibrationButton.node.setPosition(0, -66, 0);

    const closeButton = createGlassButton('CloseButton', layer, {
      text: '返回',
      width: 248,
      height: 48,
      variant: 'ghost',
      onTap: callbacks.onClose,
    });
    closeButton.node.parent = panel.node;
    closeButton.node.setPosition(0, -132, 0);
  }

  show() {
    this.node.active = true;
  }

  hide() {
    this.node.active = false;
  }

  refresh(sfxEnabled: boolean, vibrationEnabled: boolean) {
    this.sfxButton.setLabel(`音效：${sfxEnabled ? '开' : '关'}`);
    this.sfxButton.setVariant(sfxEnabled ? 'primary' : 'secondary');
    this.vibrationButton.setLabel(`震动：${vibrationEnabled ? '开' : '关'}`);
    this.vibrationButton.setVariant(vibrationEnabled ? 'primary' : 'secondary');
  }
}

const makeLabel = (
  parent: Node,
  layer: number,
  text: string,
  fontSize: number,
  color: Color,
  position: Vec3,
  width: number,
  height: number,
) => {
  const node = new Node('Label');
  node.parent = parent;
  node.layer = layer;
  node.setPosition(position);
  node.addComponent(UITransform).setContentSize(width, height);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = fontSize + 8;
  label.color = color;
  label.horizontalAlign = Label.HorizontalAlign.CENTER;
  label.verticalAlign = Label.VerticalAlign.CENTER;
  return label;
};
