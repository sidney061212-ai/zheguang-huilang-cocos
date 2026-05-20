import { Vec2 } from 'cc';
import { DraggableOpticObject } from '../objects/DraggableOpticObject';

export interface DragSession {
  object: DraggableOpticObject;
  mode: 'drag' | 'rotate';
  dragOffset?: Vec2;
  invalid?: boolean;
}
