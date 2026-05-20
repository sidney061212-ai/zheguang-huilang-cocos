import { Color, Label, Node, UITransform, Vec3 } from 'cc';
import { UI_SUBTEXT, UI_TEXT } from '../core/Constants';
import { createGlassButton } from './GlassButton';
import { createGlassPanelNode } from './GlassPanel';

export interface GameHUDCallbacks {
  onBack: () => void;
  onReset: () => void;
  onSettings: () => void;
}

export class GameHUD {
  public readonly node: Node;
  private readonly titleLabel: Label;
  private readonly statusLabel: Label;
  private readonly selectionLabel: Label;
  private readonly hintLabel: Label;

  constructor(layer: number, callbacks: GameHUDCallbacks) {
    this.node = new Node('GameHUD');
    this.node.layer = layer;
    this.node.addComponent(UITransform).setContentSize(390, 844);

    const top = createGlassPanelNode('TopPanel', layer, 350, 76, {
      radius: 28,
      fillColor: new Color(255, 255, 255, 124),
      glowColor: new Color(189, 218, 255, 36),
    });
    top.node.parent = this.node;
    top.node.setPosition(0, 370, 0);

    const backButton = createGlassButton('HudBack', layer, {
      text: '‹',
      width: 52,
      height: 48,
      fontSize: 28,
      variant: 'ghost',
      onTap: callbacks.onBack,
    });
    backButton.node.parent = top.node;
    backButton.node.setPosition(-132, 0, 0);

    const resetButton = createGlassButton('HudReset', layer, {
      text: '重置',
      width: 66,
      height: 44,
      fontSize: 14,
      variant: 'secondary',
      onTap: callbacks.onReset,
    });
    resetButton.node.parent = top.node;
    resetButton.node.setPosition(90, 0, 0);

    const settingsButton = createGlassButton('HudSettings', layer, {
      text: '设置',
      width: 58,
      height: 44,
      fontSize: 13,
      variant: 'ghost',
      onTap: callbacks.onSettings,
    });
    settingsButton.node.parent = top.node;
    settingsButton.node.setPosition(146, 0, 0);

    this.titleLabel = makeLabel(top.node, layer, '镜面初识', 20, UI_TEXT, new Vec3(0, 12, 0), 180, 28, 'center');
    this.statusLabel = makeLabel(top.node, layer, '目标 0/1 · 光能 0%', 13, UI_SUBTEXT, new Vec3(0, -18, 0), 180, 20, 'center');

    const bottom = createGlassPanelNode('BottomPanel', layer, 350, 108, {
      radius: 30,
      fillColor: new Color(255, 255, 255, 126),
      glowColor: new Color(188, 215, 255, 32),
    });
    bottom.node.parent = this.node;
    bottom.node.setPosition(0, -356, 0);

    this.selectionLabel = makeLabel(bottom.node, layer, '未选择装置', 16, UI_TEXT, new Vec3(0, 18, 0), 290, 24, 'center');
    this.hintLabel = makeLabel(bottom.node, layer, '拖动移动，沿外环旋转，光路会实时更新。', 13, UI_SUBTEXT, new Vec3(0, -16, 0), 298, 38, 'center');
    this.hintLabel.enableWrapText = true;
  }

  setVisible(visible: boolean) {
    this.node.active = visible;
  }

  setLevelTitle(title: string) {
    this.titleLabel.string = title;
  }

  setTargetSummary(hitCount: number, totalCount: number, energyPercent: number) {
    this.statusLabel.string = `目标 ${hitCount}/${totalCount} · 光能 ${energyPercent}%`;
  }

  setSelectionInfo(text: string) {
    this.selectionLabel.string = text;
  }

  setHint(text: string) {
    this.hintLabel.string = text;
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
  align: 'left' | 'center',
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
  label.horizontalAlign = align === 'left' ? Label.HorizontalAlign.LEFT : Label.HorizontalAlign.CENTER;
  label.verticalAlign = Label.VerticalAlign.CENTER;
  return label;
};
