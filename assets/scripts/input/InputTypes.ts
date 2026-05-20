import { Vec2 } from 'cc';
import { DraggableOpticObject } from '../objects/DraggableOpticObject';

export type InteractionMode = 'idle' | 'pressing' | 'dragging' | 'rotating';

export interface DragSession {
  object: DraggableOpticObject;
  mode: InteractionMode;
  pressStartPlayfieldPos: Vec2;
  objectStartPos: Vec2;
  objectStartAngle: number;
  startTouchAngle: number;
  lastValidPos: Vec2;
  startedFromInventory: boolean;
  isCurrentPlacementValid: boolean;
}
