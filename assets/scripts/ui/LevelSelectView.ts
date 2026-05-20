import { Color, Graphics, Label, Node, Tween, tween, UITransform, Vec3 } from 'cc';
import { LevelConfig } from '../core/LevelConfig';
import { PANEL_BORDER, UI_SUBTEXT, UI_TEXT } from '../core/Constants';
import { createGlassButton } from './GlassButton';
import { createGlassPanelNode, GlassPanel } from './GlassPanel';

export interface LevelSelectCallbacks {
  onBack: () => void;
  onSelectLevel: (index: number) => void;
}

interface LevelCardRef {
  node: Node;
  panel: GlassPanel;
  numberLabel: Label;
  nameLabel: Label;
  hintLabel: Label;
  statusNode: Node;
  statusPanel: GlassPanel;
  statusLabel: Label;
}

export class LevelSelectView {
  public readonly node: Node;
  private readonly cards: LevelCardRef[] = [];

  constructor(layer: number, callbacks: LevelSelectCallbacks) {
    this.node = new Node('LevelSelectView');
    this.node.layer = layer;
    this.node.addComponent(UITransform).setContentSize(390, 844);

    const backButton = createGlassButton('BackButton', layer, {
      text: '返回',
      width: 74,
      height: 48,
      variant: 'ghost',
      fontSize: 14,
      onTap: callbacks.onBack,
    });
    backButton.node.parent = this.node;
    backButton.node.setPosition(-136, 338, 0);

    makeLabel(this.node, layer, '选择回廊', 28, UI_TEXT, new Vec3(0, 336, 0), 180, 34, 'center');
    makeLabel(this.node, layer, '把正确颜色的光送进目标机关。', 14, UI_SUBTEXT, new Vec3(0, 302, 0), 246, 24, 'center');

    const layouts = [
      { x: -88, y: 158, width: 154, height: 132 },
      { x: 88, y: 158, width: 154, height: 132 },
      { x: -88, y: -10, width: 154, height: 132 },
      { x: 88, y: -10, width: 154, height: 132 },
      { x: 0, y: -188, width: 330, height: 126 },
    ];

    layouts.forEach((layout, index) => {
      const ref = this.createCard(layer, index, layout.width, layout.height, callbacks.onSelectLevel);
      ref.node.parent = this.node;
      ref.node.setPosition(layout.x, layout.y, 0);
      this.cards.push(ref);
    });
  }

  refresh(levelList: LevelConfig[], cleared: Set<string>, recommendedIndex: number, currentIndex: number) {
    this.cards.forEach((card, index) => {
      const level = levelList[index];
      if (!level) {
        card.node.active = false;
        return;
      }
      card.node.active = true;
      const isCleared = cleared.has(level.id);
      const isRecommended = index === recommendedIndex;
      const isCurrent = index === currentIndex;
      const status = isCurrent ? '当前' : isRecommended ? '推荐' : isCleared ? '已通关' : '可玩';
      const panelFill = isCurrent
        ? new Color(29, 55, 90, 228)
        : isRecommended
          ? new Color(27, 50, 82, 214)
          : new Color(21, 40, 67, 194);
      const panelStroke = isCurrent
        ? new Color(146, 201, 255, 230)
        : isRecommended
          ? new Color(127, 186, 255, 212)
          : PANEL_BORDER;

      card.panel.setup({
        fillColor: panelFill,
        strokeColor: panelStroke,
        glowColor: isRecommended ? new Color(126, 184, 255, 58) : new Color(115, 170, 255, 28),
      });
      card.numberLabel.string = `0${index + 1}`;
      card.nameLabel.string = level.name;
      card.hintLabel.string = level.hint;
      card.statusLabel.string = isCleared ? '✓ 已通关' : status;
      card.statusPanel.setup({
        width: 78,
        height: 28,
        radius: 14,
        fillColor: isCleared
          ? new Color(40, 86, 78, 214)
          : isRecommended || isCurrent
            ? new Color(32, 66, 104, 212)
            : new Color(19, 37, 62, 188),
        strokeColor: isCleared
          ? new Color(122, 230, 184, 228)
          : isRecommended || isCurrent
            ? new Color(142, 201, 255, 224)
            : new Color(168, 206, 248, 164),
        shadowColor: new Color(9, 16, 30, 102),
        highlightColor: new Color(224, 241, 255, 112),
        glowColor: new Color(122, 180, 255, 34),
      });
      card.statusNode.setPosition(widthByCard(card) * 0.22, heightByCard(card) * 0.22, 0);
    });
  }

  setVisible(visible: boolean) {
    this.node.active = visible;
  }

  private createCard(layer: number, index: number, width: number, height: number, onSelect: (index: number) => void): LevelCardRef {
    const cardNode = new Node(`LevelCard${index + 1}`);
    cardNode.layer = layer;
    cardNode.addComponent(UITransform).setContentSize(width, height);
    const panel = cardNode.addComponent(GlassPanel);
    panel.setup({
      width,
      height,
      radius: 28,
      fillColor: new Color(21, 40, 67, 194),
      strokeColor: new Color(174, 208, 245, 166),
      glowColor: new Color(112, 172, 255, 28),
    });

    const numberLabel = makeLabel(cardNode, layer, `0${index + 1}`, 30, UI_TEXT, new Vec3(-width * 0.25, height * 0.18, 0), 80, 36, 'left');
    const nameLabel = makeLabel(cardNode, layer, '关卡', 18, UI_TEXT, new Vec3(-width * 0.25, -2, 0), width - 56, 28, 'left');
    const hintLabel = makeLabel(cardNode, layer, '提示', 12, UI_SUBTEXT, new Vec3(0, -height * 0.24, 0), width - 38, 40, 'center');
    hintLabel.enableWrapText = true;

    const statusNode = createGlassPanelNode('Status', layer, 78, 28, {
      radius: 14,
      fillColor: new Color(19, 37, 62, 188),
      strokeColor: new Color(168, 206, 248, 164),
      glowColor: new Color(122, 180, 255, 34),
    });
    statusNode.node.parent = cardNode;
    statusNode.node.setPosition(width * 0.22, height * 0.22, 0);
    const statusLabel = makeLabel(statusNode.node, layer, '可玩', 10, UI_SUBTEXT, new Vec3(0, 0, 0), 70, 18, 'center');

    bindTap(cardNode, width, height, () => onSelect(index));

    return {
      node: cardNode,
      panel,
      numberLabel,
      nameLabel,
      hintLabel,
      statusPanel: statusNode.panel,
      statusNode: statusNode.node,
      statusLabel,
    };
  }
}

const widthByCard = (card: LevelCardRef) => card.node.getComponent(UITransform)?.contentSize.width ?? 154;
const heightByCard = (card: LevelCardRef) => card.node.getComponent(UITransform)?.contentSize.height ?? 132;

const bindTap = (node: Node, width: number, height: number, onTap: () => void) => {
  const touchSurface = new Node('TouchSurface');
  touchSurface.parent = node;
  touchSurface.layer = node.layer;
  touchSurface.setSiblingIndex(Number.MAX_SAFE_INTEGER);
  touchSurface.addComponent(UITransform).setContentSize(width, height);
  const graphics = touchSurface.addComponent(Graphics);
  graphics.fillColor = new Color(255, 255, 255, 1);
  graphics.roundRect(-width * 0.5, -height * 0.5, width, height, 28);
  graphics.fill();

  touchSurface.on(Node.EventType.TOUCH_START, () => {
    Tween.stopAllByTarget(node);
    tween(node).to(0.08, { scale: new Vec3(0.98, 0.98, 1) }).start();
  });
  touchSurface.on(Node.EventType.TOUCH_END, () => {
    Tween.stopAllByTarget(node);
    tween(node)
      .to(0.08, { scale: new Vec3(1, 1, 1) })
      .call(onTap)
      .start();
  });
  touchSurface.on(Node.EventType.TOUCH_CANCEL, () => {
    Tween.stopAllByTarget(node);
    tween(node).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
  });
};

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
