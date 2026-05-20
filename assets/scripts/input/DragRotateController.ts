import { EventTouch, Node, Rect, UITransform, Vec2, Vec3 } from 'cc';
import { AudioManager } from '../audio/AudioManager';
import { SoundKeys } from '../audio/SoundKeys';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';
import { angleFromPoints } from '../utils/MathUtils';
import { DragSession } from './InputTypes';
import { DraggableOpticObject } from '../objects/DraggableOpticObject';

interface DragRotateCallbacks {
  onSelectionChanged: (object: DraggableOpticObject | null) => void;
  onWorldChanged: () => void;
}

export class DragRotateController {
  private optics: DraggableOpticObject[] = [];
  private selection: DraggableOpticObject | null = null;
  private session: DragSession | null = null;
  private readonly rootTransform: UITransform;
  private lastRotateStep = NaN;

  constructor(
    private readonly root: Node,
    private readonly blankTapNode: Node,
    private readonly playAreaRect: Rect,
    private readonly audio: AudioManager,
    private readonly callbacks: DragRotateCallbacks,
  ) {
    this.rootTransform = this.root.getComponent(UITransform)!;
    this.root.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.root.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.root.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    this.blankTapNode.on(Node.EventType.TOUCH_END, this.onBlankTap, this);
  }

  register(object: DraggableOpticObject) {
    this.optics.push(object);
    object.node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onObjectTouchStart(object, event));
  }

  setSelection(object: DraggableOpticObject | null) {
    if (this.selection === object) {
      return;
    }
    this.selection?.setSelected(false);
    this.selection?.setInteractionMode('idle');
    this.selection = object;
    this.selection?.setSelected(true);
    this.callbacks.onSelectionChanged(this.selection);
  }

  clearSelection() {
    this.setSelection(null);
  }

  dispose() {
    this.root.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.root.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.root.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    this.blankTapNode.off(Node.EventType.TOUCH_END, this.onBlankTap, this);
  }

  private onObjectTouchStart(object: DraggableOpticObject, event: EventTouch) {
    const local = this.toNodeLocal(object.node, event);
    const mode = object.resolveTouchMode(local);
    this.setSelection(object);
    if (!mode) {
      return;
    }
    this.session = { object, mode };
    object.elevate();
    object.setInteractionMode(mode);
    this.audio.play(mode === 'rotate' ? SoundKeys.ObjectRotate : SoundKeys.ObjectPick);
    if (mode === 'rotate') {
      this.lastRotateStep = object.getAngle();
    }
  }

  private onTouchMove(event: EventTouch) {
    if (!this.session) {
      return;
    }
    const session = this.session;
    if (session.mode === 'drag') {
      const local = this.toRootLocal(event);
      const design = new Vec2(local.x + DESIGN_WIDTH * 0.5, local.y + DESIGN_HEIGHT * 0.5);
      session.object.applyDesignPosition(design);
      const valid = session.object.isValidWithin(this.playAreaRect);
      session.object.setInteractionMode(valid ? 'drag' : 'invalid');
      if (valid) {
        session.object.recordValidPosition();
      }
      this.callbacks.onWorldChanged();
      return;
    }
    const center = session.object.node.position;
    const local = this.toRootLocal(event);
    const angle = angleFromPoints(new Vec2(center.x, center.y), new Vec2(local.x, local.y));
    session.object.applyAngle(angle);
    if (session.object.getAngle() !== this.lastRotateStep) {
      this.lastRotateStep = session.object.getAngle();
      this.audio.play(SoundKeys.ObjectRotate);
    }
    this.callbacks.onWorldChanged();
  }

  private onTouchEnd() {
    if (!this.session) {
      return;
    }
    const session = this.session;
    if (session.mode === 'drag') {
      const valid = session.object.isValidWithin(this.playAreaRect);
      if (!valid) {
        session.object.animateToDesignPosition(session.object.getLastValidPosition(), 0.16);
        session.object.setInteractionMode('idle');
        this.audio.play(SoundKeys.InvalidAction);
      } else {
        session.object.setInteractionMode('idle');
        this.audio.play(SoundKeys.ObjectDrop);
      }
    } else {
      session.object.setInteractionMode('idle');
    }
    this.session = null;
    this.callbacks.onWorldChanged();
  }

  private onBlankTap() {
    if (this.session) {
      return;
    }
    this.clearSelection();
  }

  private toRootLocal(event: EventTouch) {
    const ui = event.getUILocation();
    return this.rootTransform.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));
  }

  private toNodeLocal(node: Node, event: EventTouch) {
    const transform = node.getComponent(UITransform)!;
    const ui = event.getUILocation();
    return transform.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));
  }
}
