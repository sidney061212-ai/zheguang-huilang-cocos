import { Color, Graphics, Label, Node, UITransform, Vec3 } from 'cc';
import { UI_SUBTEXT, UI_TEXT } from '../core/Constants';
import { createGlassButton, GlassButton } from './GlassButton';
import { createGlassPanelNode } from './GlassPanel';

export interface ClearPopupCallbacks {
  onNext: () => void;
  onReplay: () => void;
  onLevelSelect: () => void;
}

export interface ClearPopupPayload {
  timeSeconds: number;
  energyPercent: number;
  stars: number;
  hasNext: boolean;
}

export class ClearPopup {
  public readonly node: Node;
  private readonly metaLabel: Label;
  private readonly nextButton: GlassButton;

  constructor(layer: number, callbacks: ClearPopupCallbacks) {
    this.node = new Node('ClearPopup');
    this.node.layer = layer;
    this.node.addComponent(UITransform).setContentSize(390, 844);
    this.node.active = false;

    const dim = new Node('Dim');
    dim.parent = this.node;
    dim.layer = layer;
    dim.addComponent(UITransform).setContentSize(390, 844);
    const dimGraphics = dim.addComponent(Graphics);
    dimGraphics.fillColor = new Color(33, 50, 76, 92);
    dimGraphics.rect(-195, -422, 390, 844);
    dimGraphics.fill();
    dim.on(Node.EventType.TOUCH_START, () => {});
    dim.on(Node.EventType.TOUCH_END, () => {});

    const panel = createGlassPanelNode('ClearPanel', layer, 318, 316, {
      radius: 34,
      fillColor: new Color(255, 255, 255, 138),
      glowColor: new Color(196, 222, 255, 38),
    });
    panel.node.parent = this.node;
    panel.node.setPosition(0, 0, 0);

    makeLabel(panel.node, layer, '光路连通', 28, UI_TEXT, new Vec3(0, 104, 0), 220, 34);
    makeLabel(panel.node, layer, '这一段回廊已经被点亮。', 15, UI_SUBTEXT, new Vec3(0, 66, 0), 230, 24);
    this.metaLabel = makeLabel(panel.node, layer, '用时 0.0s · 光能 0% · 星级 ★', 15, UI_TEXT, new Vec3(0, 20, 0), 240, 24);

    this.nextButton = createGlassButton('NextButton', layer, {
      text: '下一关',
      width: 248,
      height: 54,
      variant: 'primary',
      onTap: callbacks.onNext,
    });
    this.nextButton.node.parent = panel.node;
    this.nextButton.node.setPosition(0, -48, 0);

    const replayButton = createGlassButton('ReplayButton', layer, {
      text: '重玩本关',
      width: 248,
      height: 50,
      variant: 'secondary',
      onTap: callbacks.onReplay,
    });
    replayButton.node.parent = panel.node;
    replayButton.node.setPosition(0, -114, 0);

    const selectButton = createGlassButton('SelectButton', layer, {
      text: '返回选关',
      width: 248,
      height: 48,
      variant: 'ghost',
      onTap: callbacks.onLevelSelect,
    });
    selectButton.node.parent = panel.node;
    selectButton.node.setPosition(0, -176, 0);
  }

  show(payload: ClearPopupPayload) {
    this.node.active = true;
    const stars = '★'.repeat(Math.max(1, payload.stars));
    this.metaLabel.string = `用时 ${payload.timeSeconds.toFixed(1)}s · 光能 ${payload.energyPercent}% · 星级 ${stars}`;
    this.nextButton.setLabel(payload.hasNext ? '下一关' : '完成回廊');
  }

  hide() {
    this.node.active = false;
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
