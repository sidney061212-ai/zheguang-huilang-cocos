import { Color, Graphics, Label, Node, UITransform, Vec3 } from 'cc';
import { UI_SUBTEXT, UI_TEXT } from '../core/Constants';
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

    const badge = createGlassPanelNode('HomeBadge', layer, 180, 36, {
      radius: 18,
      fillColor: new Color(18, 36, 62, 168),
      strokeColor: new Color(182, 215, 255, 122),
      glowColor: new Color(121, 178, 255, 46),
    });
    badge.node.parent = this.node;
    badge.node.setPosition(0, 338, 0);
    makeLabel(badge.node, layer, 'Refraction Corridor', 12, UI_SUBTEXT, new Vec3(0, 0, 0), 148, 24);

    const hero = createGlassPanelNode('HomeHero', layer, 334, 314, {
      radius: 34,
      fillColor: new Color(18, 35, 58, 198),
      strokeColor: new Color(184, 216, 255, 134),
      glowColor: new Color(121, 178, 255, 54),
    });
    hero.node.parent = this.node;
    hero.node.setPosition(0, 106, 0);

    const beam = new Node('HeroBeam');
    beam.parent = hero.node;
    beam.layer = layer;
    beam.setPosition(0, -46, 0);
    const beamGraphics = beam.addComponent(Graphics);
    beamGraphics.lineCap = Graphics.LineCap.ROUND;
    beamGraphics.lineJoin = Graphics.LineJoin.ROUND;
    beamGraphics.lineWidth = 26;
    beamGraphics.strokeColor = new Color(121, 178, 255, 56);
    beamGraphics.moveTo(-124, -26);
    beamGraphics.lineTo(106, 44);
    beamGraphics.stroke();
    beamGraphics.lineWidth = 8;
    beamGraphics.strokeColor = new Color(236, 245, 255, 210);
    beamGraphics.moveTo(-124, -26);
    beamGraphics.lineTo(106, 44);
    beamGraphics.stroke();

    makeLabel(hero.node, layer, '折光回廊', 40, UI_TEXT, new Vec3(0, 72, 0), 240, 56);
    makeLabel(hero.node, layer, '引导光，打开回廊', 17, UI_SUBTEXT, new Vec3(0, 26, 0), 248, 34);
    makeLabel(hero.node, layer, '竖屏光学解谜 · 微信小游戏', 13, new Color(176, 201, 234, 255), new Vec3(0, 112, 0), 240, 24);

    const chips = [
      { text: '5 关卡', x: -92 },
      { text: 'RGB 分光', x: 0 },
      { text: '竖屏手感', x: 92 },
    ];
    chips.forEach((chip) => {
      const node = createGlassPanelNode('Chip', layer, 88, 30, {
        radius: 15,
        fillColor: new Color(28, 48, 78, 186),
        strokeColor: new Color(186, 214, 252, 122),
        glowColor: new Color(118, 176, 255, 34),
      });
      node.node.parent = hero.node;
      node.node.setPosition(chip.x, -118, 0);
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
    startButton.node.setPosition(0, -140, 0);

    const levelButton = createGlassButton('LevelButton', layer, {
      text: '关卡选择',
      width: 268,
      height: 56,
      variant: 'secondary',
      onTap: callbacks.onLevels,
    });
    levelButton.node.parent = this.node;
    levelButton.node.setPosition(0, -208, 0);

    const settingsButton = createGlassButton('SettingsButton', layer, {
      text: '设置',
      width: 268,
      height: 56,
      variant: 'ghost',
      onTap: callbacks.onSettings,
    });
    settingsButton.node.parent = this.node;
    settingsButton.node.setPosition(0, -276, 0);

    makeLabel(this.node, layer, 'Cocos Creator 3.8.x · Portrait', 12, new Color(146, 174, 211, 255), new Vec3(0, -362, 0), 280, 22);
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
