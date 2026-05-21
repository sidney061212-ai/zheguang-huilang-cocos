import { Color, EventTouch, Graphics, Node, Rect, UITransform, Vec2, Vec3 } from 'cc';
import { AudioManager } from '../audio/AudioManager';
import { SoundKeys } from '../audio/SoundKeys';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../core/Constants';
import { PlayfieldTransform } from '../core/PlayfieldTransform';
import { DraggableOpticObject } from '../objects/DraggableOpticObject';
import { angleFromPoints, clamp } from '../utils/MathUtils';
import { DragSession } from './InputTypes';

interface DragRotateCallbacks {
  onSelectionChanged: (object: DraggableOpticObject | null) => void;
  onWorldChanged: () => void;
  onInteractionCommitted?: (object: DraggableOpticObject, mode: 'dragging' | 'rotating', changed: boolean) => void;
}

export class DragRotateController {
  private optics: DraggableOpticObject[] = [];
  private selection: DraggableOpticObject | null = null;
  private session: DragSession | null = null;
  private readonly rootTransform: UITransform;
  private readonly moveBoundsHintNode: Node;
  private readonly moveBoundsHintGraphics: Graphics;
  private lastRotateStep = NaN;
  private readonly dragStartThreshold = 4;
  private readonly dragMoveAudioCooldownMs = 96;
  private lastDragMoveAudioAt = 0;

  constructor(
    private readonly root: Node,
    private readonly blankTapNode: Node,
    private readonly playAreaRect: Rect,
    private readonly blockedZones: Rect[],
    private readonly audio: AudioManager,
    private readonly callbacks: DragRotateCallbacks,
  ) {
    this.rootTransform = this.root.getComponent(UITransform)!;
    PlayfieldTransform.configureContext({
      rootTransform: this.rootTransform,
      playfieldRect: this.playAreaRect,
      designWidth: DESIGN_WIDTH,
      designHeight: DESIGN_HEIGHT,
    });
    this.moveBoundsHintNode = new Node('MoveBoundsHint');
    this.moveBoundsHintNode.layer = this.root.layer;
    this.moveBoundsHintNode.parent = this.root;
    this.moveBoundsHintNode.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    this.moveBoundsHintNode.setPosition(0, 0, 0);
    this.moveBoundsHintGraphics = this.moveBoundsHintNode.addComponent(Graphics);
    this.moveBoundsHintNode.active = false;
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
    this.hideMoveBoundsHint();
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
    this.selection.setInteractionMode('rotating');
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
    this.moveBoundsHintNode.destroy();
    PlayfieldTransform.setRootTransform(null);
  }

  private onObjectTouchStart(object: DraggableOpticObject, event: EventTouch) {
    if (this.session) {
      return;
    }
    const local = this.toNodeLocal(object.node, event);
    this.setSelection(object);
    const mode = object.resolveTouchMode(local);
    if (!mode) {
      return;
    }

    const pressStartPlayfieldPos = this.eventToPlayfield(event);
    const objectStartPos = object.getDesignPosition();
    const objectStartAngle = object.getAngle();
    const startTouchAngle = angleFromPoints(objectStartPos, pressStartPlayfieldPos);
    this.session = {
      object,
      mode: mode === 'rotate' ? 'rotating' : 'pressing',
      pressStartPlayfieldPos,
      objectStartPos,
      objectStartAngle,
      startTouchAngle,
      lastValidPos: object.getLastValidPosition(),
      startedFromInventory: object.isInInventory(),
      isCurrentPlacementValid: true,
      hasChanged: false,
    };

    object.elevate();
    if (mode === 'rotate') {
      object.setInteractionMode('rotating');
      this.lastRotateStep = object.getAngle();
      this.audio.play(SoundKeys.Rotate);
    } else {
      object.setInteractionMode('pressing');
      this.audio.play(SoundKeys.DragStart);
    }
  }

  private onTouchMove(event: EventTouch) {
    if (!this.session) {
      return;
    }
    const session = this.session;
    const currentTouch = this.eventToPlayfield(event);

    if (session.mode === 'pressing') {
      const distance = currentTouch.clone().subtract(session.pressStartPlayfieldPos).length();
      if (distance < this.dragStartThreshold) {
        return;
      }
      session.mode = 'dragging';
      session.object.setInteractionMode('dragging');
    }

    if (session.mode === 'dragging') {
      this.updateDragging(session, currentTouch);
      return;
    }

    if (session.mode === 'rotating') {
      this.updateRotating(session, currentTouch);
    }
  }

  private onTouchEnd() {
    if (!this.session) {
      return;
    }
    const session = this.session;
    const endedMode: 'dragging' | 'rotating' = session.mode === 'rotating' ? 'rotating' : 'dragging';
    if (session.mode === 'dragging') {
      this.finishDragging(session);
    } else if (session.mode === 'rotating') {
      session.object.setInteractionMode('idle');
      this.callbacks.onSelectionChanged(session.object);
    } else {
      session.object.setInteractionMode('idle');
    }

    const changed = this.hasSessionChanged(session);
    this.callbacks.onInteractionCommitted?.(session.object, endedMode, changed);
    this.session = null;
    this.hideMoveBoundsHint();
    this.callbacks.onWorldChanged();
  }

  private onBlankTap() {
    if (this.session) {
      return;
    }
    this.clearSelection();
  }

  private updateDragging(session: DragSession, currentTouch: Vec2) {
    const delta = currentTouch.clone().subtract(session.pressStartPlayfieldPos);
    const unclamped = session.objectStartPos.clone().add(delta);
    const radius = session.object.getTouchRadius();
    const moveBounds = session.object.getMoveBounds();

    if (session.startedFromInventory) {
      const inCanvas = this.clampToCanvas(unclamped, radius);
      const bounded = moveBounds ? this.clampToMoveBounds(inCanvas, moveBounds) : inCanvas;
      const snapped = this.softSnapIntoPlayfield(bounded, radius);
      session.object.applyDesignPosition(snapped);
      const insidePlayfield = PlayfieldTransform.isInsidePlayfield(snapped, radius);
      const blocked = insidePlayfield && this.isBlocked(snapped, radius);
      session.isCurrentPlacementValid = insidePlayfield && !blocked;
      session.object.setInteractionMode(session.isCurrentPlacementValid ? 'dragging' : 'invalid');
    } else {
      const bounded = moveBounds ? this.clampToMoveBounds(unclamped, moveBounds) : unclamped;
      const clamped = PlayfieldTransform.clampToPlayfield(bounded, radius);
      const outOfBounds = clamped.x !== bounded.x || clamped.y !== bounded.y;
      const blocked = this.isBlocked(clamped, radius);
      session.isCurrentPlacementValid = !outOfBounds && !blocked;
      session.object.applyDesignPosition(clamped);
      session.object.setInteractionMode(session.isCurrentPlacementValid ? 'dragging' : 'invalid');
      if (session.isCurrentPlacementValid) {
        session.lastValidPos = clamped.clone();
        session.object.recordValidPosition();
      }
    }
    session.hasChanged = this.hasSessionChanged(session);
    this.refreshMoveBoundsHint(session.object);
    this.playDragMoveAudio();
    this.callbacks.onWorldChanged();
  }

  private updateRotating(session: DragSession, currentTouch: Vec2) {
    const center = session.object.getDesignPosition();
    const touchAngle = angleFromPoints(center, currentTouch);
    const angleDelta = this.normalizeAngleDelta(touchAngle - session.startTouchAngle);
    session.object.applyAngle(session.objectStartAngle + angleDelta);
    if (session.object.getAngle() !== this.lastRotateStep) {
      this.lastRotateStep = session.object.getAngle();
      this.audio.play(SoundKeys.Rotate);
    }
    session.hasChanged = this.hasSessionChanged(session);
    this.callbacks.onSelectionChanged(session.object);
    this.callbacks.onWorldChanged();
  }

  private finishDragging(session: DragSession) {
    const object = session.object;
    const radius = object.getTouchRadius();

    if (session.startedFromInventory) {
      const placement = object.getDesignPosition();
      const canPlace = PlayfieldTransform.isInsidePlayfield(placement, radius) && !this.isBlocked(placement, radius);
      if (!canPlace) {
        object.setInteractionMode('invalid');
        object.animateToDesignPosition(object.getInventoryAnchor(), 0.16);
        object.setInventoryState(true);
        this.audio.play(SoundKeys.InvalidAction);
        this.callbacks.onSelectionChanged(object);
        setTimeout(() => {
          object.setInteractionMode('idle');
          this.callbacks.onWorldChanged();
        }, 170);
        return;
      }

      const clamped = PlayfieldTransform.clampToPlayfield(placement, radius);
      object.applyDesignPosition(clamped);
      object.recordValidPosition();
      object.setInventoryState(false);
      object.setInteractionMode('idle');
      object.playDropFeedback();
      this.audio.play(SoundKeys.ObjectDrop);
      this.callbacks.onSelectionChanged(object);
      return;
    }

    const placement = object.getDesignPosition();
    const stillValid = PlayfieldTransform.isInsidePlayfield(placement, radius)
      && !this.isBlocked(placement, radius)
      && session.isCurrentPlacementValid;
    if (!stillValid) {
      object.setInteractionMode('invalid');
      object.animateToDesignPosition(session.lastValidPos, 0.12);
      this.audio.play(SoundKeys.InvalidAction);
      setTimeout(() => {
        object.setInteractionMode('idle');
        this.callbacks.onWorldChanged();
      }, 130);
      return;
    }

    object.recordValidPosition();
    object.setInteractionMode('idle');
    object.playDropFeedback();
    this.audio.play(SoundKeys.ObjectDrop);
  }

  private eventToPlayfield(event: EventTouch) {
    const ui = event.getUILocation();
    return PlayfieldTransform.screenToPlayfield(new Vec2(ui.x, ui.y));
  }

  private toNodeLocal(node: Node, event: EventTouch) {
    const transform = node.getComponent(UITransform)!;
    const ui = event.getUILocation();
    return transform.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));
  }

  private clampToCanvas(position: Vec2, radius: number) {
    return new Vec2(
      clamp(position.x, radius, DESIGN_WIDTH - radius),
      clamp(position.y, radius, DESIGN_HEIGHT - radius),
    );
  }

  private clampToMoveBounds(position: Vec2, moveBounds: { x: number; y: number; width: number; height: number }) {
    return new Vec2(
      clamp(position.x, moveBounds.x, moveBounds.x + moveBounds.width),
      clamp(position.y, moveBounds.y, moveBounds.y + moveBounds.height),
    );
  }

  private softSnapIntoPlayfield(position: Vec2, radius: number) {
    const snapZoneY = this.playAreaRect.y - 26;
    if (position.y < snapZoneY) {
      return position.clone();
    }
    const clamped = PlayfieldTransform.clampToPlayfield(position, radius);
    return new Vec2(
      position.x + (clamped.x - position.x) * 0.38,
      position.y + (clamped.y - position.y) * 0.38,
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

  private playDragMoveAudio() {
    const now = Date.now();
    if (now - this.lastDragMoveAudioAt < this.dragMoveAudioCooldownMs) {
      return;
    }
    this.lastDragMoveAudioAt = now;
    this.audio.play(SoundKeys.DragMove);
  }

  private refreshMoveBoundsHint(object: DraggableOpticObject) {
    const moveBounds = object.getMoveBounds();
    if (!moveBounds) {
      this.hideMoveBoundsHint();
      return;
    }
    this.moveBoundsHintNode.active = true;
    this.moveBoundsHintGraphics.clear();
    this.moveBoundsHintGraphics.fillColor = new Color(148, 204, 255, 24);
    this.moveBoundsHintGraphics.strokeColor = new Color(148, 204, 255, 118);
    this.moveBoundsHintGraphics.lineWidth = 2;
    const uiOrigin = PlayfieldTransform.playfieldToUi(new Vec2(moveBounds.x, moveBounds.y));
    this.moveBoundsHintGraphics.roundRect(uiOrigin.x, uiOrigin.y, moveBounds.width, moveBounds.height, 12);
    this.moveBoundsHintGraphics.fill();
    this.moveBoundsHintGraphics.roundRect(uiOrigin.x, uiOrigin.y, moveBounds.width, moveBounds.height, 12);
    this.moveBoundsHintGraphics.stroke();
  }

  private hideMoveBoundsHint() {
    this.moveBoundsHintGraphics.clear();
    this.moveBoundsHintNode.active = false;
  }

  private normalizeAngleDelta(delta: number) {
    let normalized = delta % 360;
    if (normalized > 180) {
      normalized -= 360;
    } else if (normalized < -180) {
      normalized += 360;
    }
    return normalized;
  }

  private hasSessionChanged(session: DragSession) {
    if (session.hasChanged) {
      return true;
    }
    const position = session.object.getDesignPosition();
    const angle = session.object.getAngle();
    const moved = position.subtract(session.objectStartPos).lengthSqr() > 0.25;
    const rotated = Math.abs(this.normalizeAngleDelta(angle - session.objectStartAngle)) > 0.1;
    const inventoryChanged = session.object.isInInventory() !== session.startedFromInventory;
    return moved || rotated || inventoryChanged;
  }
}
