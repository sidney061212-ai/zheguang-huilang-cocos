declare module 'cc' {
  export const _decorator: {
    ccclass: (...args: any[]) => any;
    property: (...args: any[]) => any;
  };

  export class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    clone(): Color;
    [key: string]: any;
  }

  export class Size {
    width: number;
    height: number;
    constructor(width?: number, height?: number);
    clone(): Size;
    [key: string]: any;
  }

  export class Vec2 {
    static RIGHT: Vec2;
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    clone(): Vec2;
    add(value: any): Vec2;
    subtract(value: any): Vec2;
    multiplyScalar(value: any): Vec2;
    normalize(): Vec2;
    length(): number;
    lengthSqr(): number;
    dot(value: any): number;
    rotate(value: any): Vec2;
    [key: string]: any;
  }

  export class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    clone(): Vec3;
    add(value: any): Vec3;
    [key: string]: any;
  }

  export class Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
    [key: string]: any;
  }

  export class Node {
    static EventType: any;
    layer: number;
    parent: Node | null;
    active: boolean;
    children: Node[];
    position: Vec3;
    constructor(name?: string);
    addComponent<T = any>(component: any): T;
    getComponent<T = any>(component: any): T;
    on(...args: any[]): void;
    off(...args: any[]): void;
    setPosition(...args: any[]): void;
    setScale(...args: any[]): void;
    setRotationFromEuler(...args: any[]): void;
    setSiblingIndex(...args: any[]): void;
    getChildByName(name: string): Node | null;
    destroy(): void;
    [key: string]: any;
  }

  export class Component {
    node: Node;
    [key: string]: any;
  }

  export class UITransform {
    contentSize: Size;
    setContentSize(...args: any[]): void;
    convertToNodeSpaceAR(...args: any[]): any;
    [key: string]: any;
  }

  export class Canvas {
    [key: string]: any;
  }

  export class Camera {
    [key: string]: any;
  }

  export class Graphics {
    static LineCap: any;
    static LineJoin: any;
    lineWidth: number;
    strokeColor: Color;
    fillColor: Color;
    lineCap: any;
    lineJoin: any;
    moveTo(...args: any[]): void;
    lineTo(...args: any[]): void;
    stroke(): void;
    fill(): void;
    clear(): void;
    roundRect(...args: any[]): void;
    circle(...args: any[]): void;
    rect(...args: any[]): void;
    arc(...args: any[]): void;
    close(): void;
    [key: string]: any;
  }

  export class Label {
    static Overflow: any;
    static HorizontalAlign: any;
    static VerticalAlign: any;
    string: string;
    fontSize: number;
    lineHeight: number;
    color: Color;
    horizontalAlign: any;
    verticalAlign: any;
    overflow: any;
    enableWrapText: boolean;
    [key: string]: any;
  }

  export class EventTouch {
    getUILocation(): any;
    [key: string]: any;
  }

  export class UIOpacity {
    opacity: number;
    [key: string]: any;
  }

  export class Tween<T = any> {
    static stopAllByTarget(target: any): void;
    [key: string]: any;
  }

  export function tween<T = any>(target?: T): any;

  export const sys: {
    localStorage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
    };
    [key: string]: any;
  };
}
