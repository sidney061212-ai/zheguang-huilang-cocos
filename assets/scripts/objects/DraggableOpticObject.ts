import { _decorator, Color, Component, Graphics, Label, Node, tween, UITransform, Vec2, Vec3 } from 'cc';
import { ANGLE_SNAP_DEGREES, DESIGN_HEIGHT, DESIGN_WIDTH, DRAG_SCALE, INVALID_TINT, PANEL_BORDER, UI_SUBTEXT } from '../core/Constants';
import { snapAngle } from '../utils/MathUtils';

const { ccclass } = _decorator;

export type InteractionMode = 'idle' | 'drag' | 'rotate' | 'invalid';

@ccclass('DraggableOpticObject')
export abstract class DraggableOpticObject extends Component {
  public opticId = '';
  public movable = false;
  public rotatable = false;
  protected designPosition = new Vec2();
  protected lastValidPosition = new Vec2();
  protected angle = 0;
  protected selected = false;
  protected interactionMode: InteractionMode = 'idle';
  protected readonly graphics!: Graphics;
  protected readonly uiTransform!: UITransform;
  private angleLabelNode: Node | null = null;
  private inInventory = false;
  private inventoryAnchor = new Vec2();

  onLoad() {
    this.node.layer = 33554432;
    this.node.addComponent(UITransform).setContentSize(140, 140);
    this.node.addComponent(Graphics);
  }

  setupBase(id: string, position: Vec2, angle: number, movable: boolean, rotatable: boolean) {
    this.opticId = id;
    this.designPosition = position.clone();
    this.lastValidPosition = position.clone();
    this.angle = angle;
    this.movable = movable;
    this.rotatable = rotatable;
    this.applyDesignPosition(position);
    this.applyAngle(angle);
    this.refreshVisual();
  }

  applyDesignPosition(position: Vec2) {
    this.designPosition = position.clone();
    this.node.setPosition(new Vec3(position.x - DESIGN_WIDTH * 0.5, position.y - DESIGN_HEIGHT * 0.5, 0));
  }

  getDesignPosition() {
    return this.designPosition.clone();
  }

  getLastValidPosition() {
    return this.lastValidPosition.clone();
  }

  recordValidPosition() {
    this.lastValidPosition = this.designPosition.clone();
  }

  restoreLastValidPosition() {
    this.applyDesignPosition(this.lastValidPosition);
  }

  applyAngle(angle: number) {
    this.angle = snapAngle(angle, ANGLE_SNAP_DEGREES);
    this.node.setRotationFromEuler(0, 0, this.angle);
    this.refreshVisual();
  }

  getAngle() {
    return this.angle;
  }

  setSelected(selected: boolean) {
    if (this.selected === selected) {
      return;
    }
    this.selected = selected;
    this.refreshVisual();
  }

  setInteractionMode(mode: InteractionMode) {
    if (this.interactionMode === mode) {
      return;
    }
    this.interactionMode = mode;
    tween(this.node).stop();
    const targetScale = mode === 'idle' ? 1 : DRAG_SCALE;
    tween(this.node)
      .to(0.12, { scale: new Vec3(targetScale, targetScale, 1) })
      .start();
    this.refreshVisual();
  }

  animateToDesignPosition(position: Vec2, duration = 0.14) {
    this.designPosition = position.clone();
    tween(this.node).stop();
    tween(this.node)
      .to(duration, {
        position: new Vec3(position.x - DESIGN_WIDTH * 0.5, position.y - DESIGN_HEIGHT * 0.5, 0),
      })
      .start();
  }

  isValidWithin(playRect: { x: number; y: number; width: number; height: number }) {
    const radius = this.getTouchRadius();
    return (
      this.designPosition.x >= playRect.x + radius &&
      this.designPosition.x <= playRect.x + playRect.width - radius &&
      this.designPosition.y >= playRect.y + radius &&
      this.designPosition.y <= playRect.y + playRect.height - radius
    );
  }

  resolveTouchMode(local: Vec2): 'drag' | 'rotate' | null {
    const dist = local.length();
    const ringOuter = this.getTouchRadius() + 22;
    const ringInner = this.getTouchRadius() - 2;
    if (this.rotatable && this.selected && this.supportsRingRotation() && dist >= ringInner && dist <= ringOuter) {
      return 'rotate';
    }
    if (this.movable && dist <= this.getTouchRadius() + 12) {
      return 'drag';
    }
    return null;
  }

  elevate() {
    this.node.setSiblingIndex(this.node.parent!.children.length - 1);
  }

  describeSelection() {
    return `${this.getDisplayName()}  角度 ${Math.round(this.angle)}°`;
  }

  setInventoryState(inInventory: boolean, anchor?: Vec2) {
    this.inInventory = inInventory;
    if (anchor) {
      this.inventoryAnchor = anchor.clone();
    }
    this.refreshVisual();
  }

  isInInventory() {
    return this.inInventory;
  }

  getInventoryAnchor() {
    return this.inventoryAnchor.clone();
  }

  protected refreshVisual() {
    const graphics = this.node.getComponent(Graphics)!;
    graphics.clear();
    this.drawVisual(graphics);
    if (this.selected) {
      graphics.lineWidth = this.interactionMode === 'invalid' ? 3 : 2;
      graphics.strokeColor = this.interactionMode === 'invalid' ? INVALID_TINT : PANEL_BORDER;
      graphics.circle(0, 0, this.getTouchRadius() + 10);
      graphics.stroke();
    }
    if (this.rotatable && this.selected) {
      const handleRadius = this.getTouchRadius() + 22;
      graphics.lineWidth = 3;
      graphics.strokeColor = new Color(UI_SUBTEXT.r, UI_SUBTEXT.g, UI_SUBTEXT.b, 88);
      graphics.circle(0, 0, handleRadius);
      graphics.stroke();
      graphics.lineWidth = 2;
      graphics.moveTo(this.getTouchRadius() + 6, 0);
      graphics.lineTo(handleRadius - 8, 0);
      graphics.stroke();
      graphics.fillColor = new Color(255, 255, 255, 232);
      graphics.circle(handleRadius, 0, 7);
      graphics.fill();
    }
    this.refreshAngleLabel();
  }

  protected getTintColor() {
    if (this.interactionMode === 'invalid') {
      return INVALID_TINT;
    }
    return this.selected ? PANEL_BORDER : new Color(255, 255, 255, 255);
  }

  private refreshAngleLabel() {
    const labelNode = this.ensureAngleLabel();
    labelNode.active = this.selected;
    if (!this.selected) {
      return;
    }
    labelNode.setPosition(0, this.getTouchRadius() + 34, 0);
    labelNode.setRotationFromEuler(0, 0, -this.angle);
    const label = labelNode.getComponent(Label)!;
    label.string = `${Math.round(this.angle)}°`;
    label.color = this.interactionMode === 'invalid' ? INVALID_TINT : UI_SUBTEXT;
  }

  private ensureAngleLabel() {
    if (!this.angleLabelNode) {
      this.angleLabelNode = new Node('AngleLabel');
      this.angleLabelNode.parent = this.node;
      this.angleLabelNode.layer = this.node.layer;
      this.angleLabelNode.addComponent(UITransform).setContentSize(88, 26);
      const label = this.angleLabelNode.addComponent(Label);
      label.fontSize = 14;
      label.lineHeight = 18;
      label.horizontalAlign = Label.HorizontalAlign.CENTER;
      label.verticalAlign = Label.VerticalAlign.CENTER;
    }
    this.angleLabelNode.layer = this.node.layer;
    return this.angleLabelNode;
  }

  protected supportsRingRotation() {
    return true;
  }

  abstract getTouchRadius(): number;
  abstract getDisplayName(): string;
  protected abstract drawVisual(graphics: Graphics): void;
}
