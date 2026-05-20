import { DraggableOpticObject } from '../objects/DraggableOpticObject';

export interface DragSession {
  object: DraggableOpticObject;
  mode: 'drag' | 'rotate';
}
