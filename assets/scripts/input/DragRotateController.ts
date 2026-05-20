import { EventTouch, Node, Rect, UITransform, Vec2, Vec3 } from 'cc';
import { AudioManager } from '../audio/AudioManager';
import { SoundKeys } from '../audio/SoundKeys';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';
import { clamp } from '../utils/MathUtils';
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
    private readonly blockedZones: Rect[],
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

  getSelection() {
    return this.selection;
  }

  rotateSelection(deltaDegrees: number) {
    if (!this.selection || !this.selection.rotatable) {
      this.audio.play(SoundKeys.InvalidAction);
      return false;
    }
    this.selection.elevate();
    this.selection.setInteractionMode('rotate');
    this.selection.applyAngle(this.selection.getAngle() + deltaDegrees);
    this.lastRotateStep = this.selection.getAngle();
    this.audio.play(SoundKeys.ObjectRotate);
    this.callbacks.onSelectionChanged(this.selection);
    this.callbacks.onWorldChanged();
    return true;
  }

  finishRotateInteraction() {
    if (!this.selection) {
      return;
    }
    this.selection.setInteractionMode('idle');
    this.callbacks.onSelectionChanged(this.selection);
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
    this.session = { object, mode, dragOffset: mode === 'drag' ? new Vec2(local.x, local.y) : undefined };
    object.elevate();
    object.setInteractionMode(mode);
    this.audio.play(mode === 'rotate' ? SoundKeys.Rotate : SoundKeys.DragStart);
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
      const unclamped = new Vec2(
        local.x + DESIGN_WIDTH * 0.5 - (session.dragOffset?.x ?? 0),
        local.y + DESIGN_HEIGHT * 0.5 - (session.dragOffset?.y ?? 0),
      );
      const radius = session.object.getTouchRadius();
      const draggingFromInventory = session.object.isInInventory();
      const design = draggingFromInventory
        ? this.clampToCanvas(unclamped, radius)
        : this.clampToPlayArea(unclamped, radius);

      session.object.applyDesignPosition(design);
      const outOfBounds = !draggingFromInventory && (design.x !== unclamped.x || design.y !== unclamped.y);
      const insidePlayArea = this.isInsidePlayArea(design, radius);
      const blocked = insidePlayArea && this.isBlocked(design, radius);
      session.invalid = outOfBounds || blocked;
      session.object.setInteractionMode(session.invalid ? 'invalid' : 'drag');
      if (!session.invalid && !draggingFromInventory) {
        session.object.recordValidPosition();
      }
      this.audio.play(SoundKeys.DragMove);
      this.callbacks.onWorldChanged();
      return;
    }
    const center = session.object.node.position;
    const local = this.toRootLocal(event);
    const angle = angleFromPoints(new Vec2(center.x, center.y), new Vec2(local.x, local.y));
    session.object.applyAngle(angle);
    if (session.object.getAngle() !== this.lastRotateStep) {
      this.lastRotateStep = session.object.getAngle();
      this.audio.play(SoundKeys.Rotate);
    }
    this.callbacks.onWorldChanged();
  }

  private onTouchEnd() {
    if (!this.session) {
      return;
    }
    const session = this.session;
    if (session.mode === 'drag') {
      const radius = session.object.getTouchRadius();
      const draggingFromInventory = session.object.isInInventory();

      if (draggingFromInventory) {
        const placement = session.object.getDesignPosition();
        const canPlace = this.isInsidePlayArea(placement, radius) && !this.isBlocked(placement, radius);
        if (!canPlace) {
          session.object.setInteractionMode('invalid');
          session.object.animateToDesignPosition(session.object.getInventoryAnchor(), 0.16);
          this.audio.play(SoundKeys.InvalidAction);
          this.callbacks.onSelectionChanged(session.object);
          setTimeout(() => {
            this.callbacks.onWorldChanged();
          }, 170);
          session.object.setInteractionMode('idle');
          this.session = null;
          this.callbacks.onWorldChanged();
          return;
        }
        const clamped = this.clampToPlayArea(placement, radius);
        session.object.applyDesignPosition(clamped);
        session.object.recordValidPosition();
        session.object.setInventoryState(false);
        this.callbacks.onSelectionChanged(session.object);
      }

      if (session.invalid) {
        session.object.setInteractionMode('invalid');
        session.object.animateToDesignPosition(session.object.getLastValidPosition(), 0.12);
        this.audio.play(SoundKeys.InvalidAction);
        setTimeout(() => {
          this.callbacks.onWorldChanged();
        }, 130);
      }
      session.object.setInteractionMode('idle');
      if (!session.invalid) {
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

  private clampToPlayArea(position: Vec2, radius: number) {
    return new Vec2(
      clamp(position.x, this.playAreaRect.x + radius, this.playAreaRect.x + this.playAreaRect.width - radius),
      clamp(position.y, this.playAreaRect.y + radius, this.playAreaRect.y + this.playAreaRect.height - radius),
    );
  }

  private clampToCanvas(position: Vec2, radius: number) {
    return new Vec2(
      clamp(position.x, radius, DESIGN_WIDTH - radius),
      clamp(position.y, radius, DESIGN_HEIGHT - radius),
    );
  }

  private isInsidePlayArea(position: Vec2, radius: number) {
    return (
      position.x >= this.playAreaRect.x + radius &&
      position.x <= this.playAreaRect.x + this.playAreaRect.width - radius &&
      position.y >= this.playAreaRect.y + radius &&
      position.y <= this.playAreaRect.y + this.playAreaRect.height - radius
    );
  }

  private isBlocked(position: Vec2, radius: number) {
    return this.blockedZones.some((zone) => {
      const left = zone.x - radius;
      const right = zone.x + zone.width + radius;
      const bottom = zone.y - radius;
      const top = zone.y + zone.height + radius;
      return position.x >= left && position.x <= right && position.y >= bottom && position.y <= top;
    });
  }
}
