import { Color, Graphics, Label, Node, UITransform, Vec3 } from 'cc';
import { BACKGROUND_TOP, UI_SUBTEXT, UI_TEXT } from '../core/Constants';
import { createGlassButton } from './GlassButton';
import { createGlassPanelNode } from './GlassPanel';

export interface HomeViewCallbacks {
  onStart: () => void;
  onLevels: () => void;
  onSettings: () => void;
}

export class HomeView {
  public readonly node: Node;

  constructor(layer: number, callbacks: HomeViewCallbacks) {
    this.node = new Node('HomeView');
    this.node.layer = layer;
    this.node.addComponent(UITransform).setContentSize(390, 844);

    const badge = createGlassPanelNode('HomeBadge', layer, 154, 34, {
      radius: 17,
      fillColor: new Color(255, 255, 255, 96),
      glowColor: new Color(188, 214, 255, 34),
    });
    badge.node.parent = this.node;
    badge.node.setPosition(0, 334, 0);
    makeLabel(badge.node, layer, '微信小游戏原型', 12, UI_SUBTEXT, new Vec3(0, 0, 0), 130, 24);

    const hero = createGlassPanelNode('HomeHero', layer, 324, 292, {
      radius: 34,
      fillColor: new Color(255, 255, 255, 132),
      glowColor: new Color(199, 225, 255, 38),
    });
    hero.node.parent = this.node;
    hero.node.setPosition(0, 108, 0);

    const beam = new Node('HeroBeam');
    beam.parent = hero.node;
    beam.layer = layer;
    beam.setPosition(0, -58, 0);
    const beamGraphics = beam.addComponent(Graphics);
    beamGraphics.lineCap = Graphics.LineCap.ROUND;
    beamGraphics.lineJoin = Graphics.LineJoin.ROUND;
    beamGraphics.lineWidth = 20;
    beamGraphics.strokeColor = new Color(142, 199, 255, 38);
    beamGraphics.moveTo(-108, -10);
    beamGraphics.lineTo(92, 38);
    beamGraphics.stroke();
    beamGraphics.lineWidth = 7;
    beamGraphics.strokeColor = new Color(255, 255, 255, 170);
    beamGraphics.moveTo(-108, -10);
    beamGraphics.lineTo(92, 38);
    beamGraphics.stroke();

    makeLabel(hero.node, layer, '折光回廊', 38, UI_TEXT, new Vec3(0, 56, 0), 240, 50);
    makeLabel(hero.node, layer, '拖拽镜子与三棱镜，让光在回廊中找到正确去向。', 16, UI_SUBTEXT, new Vec3(0, 8, 0), 248, 52);
    makeLabel(hero.node, layer, 'Apple-like optical puzzle', 13, new Color(93, 126, 175, 255), new Vec3(0, 100, 0), 220, 24);

    const chips = [
      { text: '5 关卡', x: -92 },
      { text: 'RGB 分光', x: 0 },
      { text: '竖屏手感', x: 92 },
    ];
    chips.forEach((chip) => {
      const node = createGlassPanelNode('Chip', layer, 88, 30, {
        radius: 15,
        fillColor: new Color(255, 255, 255, 88),
        glowColor: new Color(BACKGROUND_TOP.r, BACKGROUND_TOP.g, BACKGROUND_TOP.b, 28),
      });
      node.node.parent = hero.node;
      node.node.setPosition(chip.x, -108, 0);
      makeLabel(node.node, layer, chip.text, 11, UI_SUBTEXT, new Vec3(0, 0, 0), 72, 18);
    });

    const startButton = createGlassButton('StartButton', layer, {
      text: '开始游戏',
      width: 268,
      height: 56,
      variant: 'primary',
      onTap: callbacks.onStart,
    });
    startButton.node.parent = this.node;
    startButton.node.setPosition(0, -124, 0);

    const levelButton = createGlassButton('LevelButton', layer, {
      text: '关卡选择',
      width: 268,
      height: 56,
      variant: 'secondary',
      onTap: callbacks.onLevels,
    });
    levelButton.node.parent = this.node;
    levelButton.node.setPosition(0, -194, 0);

    const settingsButton = createGlassButton('SettingsButton', layer, {
      text: '设置',
      width: 268,
      height: 56,
      variant: 'ghost',
      onTap: callbacks.onSettings,
    });
    settingsButton.node.parent = this.node;
    settingsButton.node.setPosition(0, -264, 0);

    makeLabel(this.node, layer, 'Cocos Creator 3.8.x · portrait · WeChat Mini Game', 12, new Color(120, 143, 178, 255), new Vec3(0, -360, 0), 280, 22);
  }

  setVisible(visible: boolean) {
    this.node.active = visible;
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
