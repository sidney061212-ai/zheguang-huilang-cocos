import { Color, Label, Node, UITransform, Vec3 } from 'cc';
import { UI_SUBTEXT, UI_TEXT } from '../core/Constants';
import { createGlassButton } from './GlassButton';
import { createGlassPanelNode } from './GlassPanel';

export interface GameHUDCallbacks {
  onBack: () => void;
  onReset: () => void;
  onSettings: () => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onUndo?: () => void;
}

export interface HUDDebugMetrics {
  levelId: string | number;
  raySegments: number;
  hitTargets: string | number;
  recomputeMs: number;
}

interface GameHUDOptions {
  enableDiagnostics?: boolean;
}

export class GameHUD {
  public readonly node: Node;
  private readonly titleLabel: Label;
  private readonly statusLabel: Label;
  private readonly selectionLabel: Label;
  private readonly angleLabel: Label;
  private readonly levelHintLabel: Label;
  private readonly hintLabel: Label;
  private readonly debugLabel: Label | null;
  private readonly reasonLabel: Label;
  private reasonTimer: ReturnType<typeof setTimeout> | null = null;
  private debugMetrics: HUDDebugMetrics = {
    levelId: '--',
    raySegments: 0,
    hitTargets: '0/0',
    recomputeMs: 0,
  };

  constructor(layer: number, callbacks: GameHUDCallbacks, options: GameHUDOptions = {}) {
    this.node = new Node('GameHUD');
    this.node.layer = layer;
    this.node.addComponent(UITransform).setContentSize(390, 844);

    const top = createGlassPanelNode('TopPanel', layer, 356, 80, {
      radius: 30,
      fillColor: new Color(18, 35, 60, 192),
      strokeColor: new Color(188, 220, 255, 124),
      glowColor: new Color(120, 178, 255, 52),
    });
    top.node.parent = this.node;
    top.node.setPosition(0, 364, 0);

    const backButton = createGlassButton('HudBack', layer, {
      text: '返回',
      width: 64,
      height: 48,
      fontSize: 14,
      variant: 'ghost',
      onTap: callbacks.onBack,
    });
    backButton.node.parent = top.node;
    backButton.node.setPosition(-132, 0, 0);

    const resetButton = createGlassButton('HudReset', layer, {
      text: '重置',
      width: 70,
      height: 44,
      fontSize: 14,
      variant: 'secondary',
      onTap: callbacks.onReset,
    });
    resetButton.node.parent = top.node;
    resetButton.node.setPosition(96, 0, 0);

    const settingsButton = createGlassButton('HudSettings', layer, {
      text: '设置',
      width: 62,
      height: 44,
      fontSize: 13,
      variant: 'ghost',
      onTap: callbacks.onSettings,
    });
    settingsButton.node.parent = top.node;
    settingsButton.node.setPosition(146, 0, 0);

    this.titleLabel = makeLabel(top.node, layer, '镜面初识', 21, UI_TEXT, new Vec3(0, 12, 0), 180, 30, 'center');
    this.statusLabel = makeLabel(top.node, layer, '目标 0/1 · 光能 0%', 13, UI_SUBTEXT, new Vec3(0, -16, 0), 190, 22, 'center');

    const controls = createGlassPanelNode('ControlPanel', layer, 220, 50, {
      radius: 22,
      fillColor: new Color(18, 34, 58, 184),
      strokeColor: new Color(174, 208, 245, 110),
      glowColor: new Color(112, 172, 255, 36),
    });
    controls.node.parent = this.node;
    controls.node.setPosition(0, 262, 0);

    const rotateLeftButton = createGlassButton('HudRotateLeft', layer, {
      text: '左转',
      width: 62,
      height: 38,
      fontSize: 13,
      variant: 'secondary',
      onTap: () => callbacks.onRotateLeft?.(),
    });
    rotateLeftButton.node.parent = controls.node;
    rotateLeftButton.node.setPosition(-72, 0, 0);

    const rotateRightButton = createGlassButton('HudRotateRight', layer, {
      text: '右转',
      width: 62,
      height: 38,
      fontSize: 13,
      variant: 'secondary',
      onTap: () => callbacks.onRotateRight?.(),
    });
    rotateRightButton.node.parent = controls.node;
    rotateRightButton.node.setPosition(0, 0, 0);

    const undoButton = createGlassButton('HudUndo', layer, {
      text: '撤销',
      width: 62,
      height: 38,
      fontSize: 13,
      variant: 'ghost',
      onTap: () => callbacks.onUndo?.(),
    });
    undoButton.node.parent = controls.node;
    undoButton.node.setPosition(72, 0, 0);

    const reason = createGlassPanelNode('ReasonPanel', layer, 292, 42, {
      radius: 22,
      fillColor: new Color(36, 24, 22, 196),
      strokeColor: new Color(255, 174, 164, 124),
      glowColor: new Color(255, 138, 128, 42),
    });
    reason.node.parent = this.node;
    reason.node.setPosition(0, 312, 0);
    this.reasonLabel = makeLabel(reason.node, layer, '', 13, new Color(255, 188, 178, 255), new Vec3(0, 0, 0), 252, 24, 'center');
    reason.node.active = false;

    const info = createGlassPanelNode('InfoPanel', layer, 356, 118, {
      radius: 28,
      fillColor: new Color(18, 34, 58, 166),
      strokeColor: new Color(174, 208, 245, 116),
      glowColor: new Color(112, 172, 255, 38),
    });
    info.node.parent = this.node;
    info.node.setPosition(0, -234, 0);

    this.levelHintLabel = makeLabel(info.node, layer, '提示：将光线引导到目标', 12, UI_SUBTEXT, new Vec3(0, 34, 0), 308, 20, 'center');
    this.selectionLabel = makeLabel(info.node, layer, '未选择道具', 15, UI_TEXT, new Vec3(0, 10, 0), 304, 22, 'center');
    this.angleLabel = makeLabel(info.node, layer, '角度 --', 12, UI_SUBTEXT, new Vec3(0, -12, 0), 304, 18, 'center');
    this.hintLabel = makeLabel(info.node, layer, '从下方道具栏拖入，再用手指外圈拖动调整角度。', 12, UI_SUBTEXT, new Vec3(0, -34, 0), 308, 30, 'center');
    this.hintLabel.enableWrapText = true;

    if (options.enableDiagnostics) {
      const debugPanel = createGlassPanelNode('DebugPanel', layer, 168, 72, {
        radius: 18,
        fillColor: new Color(12, 24, 44, 198),
        strokeColor: new Color(136, 184, 242, 110),
        glowColor: new Color(92, 152, 228, 24),
      });
      debugPanel.node.parent = this.node;
      debugPanel.node.setPosition(104, 208, 0);
      this.debugLabel = makeLabel(
        debugPanel.node,
        layer,
        '',
        11,
        new Color(184, 210, 238, 255),
        new Vec3(0, 0, 0),
        150,
        58,
        'left',
      );
      this.debugLabel.enableWrapText = true;
    } else {
      this.debugLabel = null;
    }
    this.refreshDebugMetrics();
  }

  setVisible(visible: boolean) {
    this.node.active = visible;
    if (!visible) {
      this.clearFailureReason();
    }
  }

  setLevelTitle(title: string) {
    this.titleLabel.string = title;
  }

  setLevelHint(text: string) {
    this.levelHintLabel.string = `提示：${text}`;
  }

  setTargetSummary(hitCount: number, totalCount: number, energyPercent: number) {
    this.statusLabel.string = `目标 ${hitCount}/${totalCount} · 光能 ${energyPercent}%`;
  }

  setSelectionInfo(text: string) {
    this.selectionLabel.string = text;
  }

  setSelectionAngle(angle: number | null) {
    this.angleLabel.string = angle === null ? '角度 --' : `角度 ${Math.round(angle)}°`;
  }

  setHint(text: string) {
    this.hintLabel.string = text;
  }

  setDebugMetrics(metrics: Partial<HUDDebugMetrics>) {
    this.debugMetrics = {
      ...this.debugMetrics,
      ...metrics,
    };
    this.refreshDebugMetrics();
  }

  showFailureReason(text: string, durationMs = 1500) {
    this.reasonLabel.string = text;
    this.reasonLabel.node.parent!.active = true;
    if (this.reasonTimer) {
      clearTimeout(this.reasonTimer);
    }
    this.reasonTimer = setTimeout(() => {
      this.reasonLabel.node.parent!.active = false;
      this.reasonTimer = null;
    }, durationMs);
  }

  clearFailureReason() {
    if (this.reasonTimer) {
      clearTimeout(this.reasonTimer);
      this.reasonTimer = null;
    }
    this.reasonLabel.node.parent!.active = false;
  }

  private refreshDebugMetrics() {
    if (!this.debugLabel) {
      return;
    }
    const recomputeMs = Number.isFinite(this.debugMetrics.recomputeMs)
      ? this.debugMetrics.recomputeMs.toFixed(2)
      : '--';
    this.debugLabel.string = [
      `L: ${this.debugMetrics.levelId}`,
      `Rays: ${this.debugMetrics.raySegments}`,
      `Hits: ${this.debugMetrics.hitTargets}`,
      `Δt: ${recomputeMs}ms`,
    ].join('\n');
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
  align: 'left' | 'center',
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
  label.horizontalAlign = align === 'left' ? Label.HorizontalAlign.LEFT : Label.HorizontalAlign.CENTER;
  label.verticalAlign = Label.VerticalAlign.CENTER;
  return label;
};
