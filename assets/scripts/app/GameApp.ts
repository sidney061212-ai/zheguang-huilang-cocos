import { _decorator, Color, Component, Graphics, Label, Node, Rect, Tween, tween, UITransform, Vec2, Vec3 } from 'cc';
import { AudioManager } from '../audio/AudioManager';
import { SoundKeys } from '../audio/SoundKeys';
import { GameMode } from './GameMode';
import {
  BACKGROUND_BOTTOM,
  BACKGROUND_TOP,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  LANDSCAPE_HINT,
  PLAY_AREA_RECT,
  PLAY_AREA_TINT,
  ROTATE_STEP_DEGREES,
  UI_TEXT,
} from '../core/Constants';
import { GameState } from '../core/GameState';
import { LevelConfig, LightSourceConfig, MirrorConfig, ObstacleConfig, PrismConfig, TargetConfig } from '../core/LevelConfig';
import { levels } from '../data/levels';
import { ClearEffect } from '../effects/ClearEffect';
import { HitSpark } from '../effects/HitSpark';
import { DragRotateController } from '../input/DragRotateController';
import { DraggableOpticObject } from '../objects/DraggableOpticObject';
import { LightSourceObject } from '../objects/LightSourceObject';
import { MirrorObject } from '../objects/MirrorObject';
import { ObstacleObject } from '../objects/ObstacleObject';
import { PrismObject } from '../objects/PrismObject';
import { TargetObject } from '../objects/TargetObject';
import { RayRenderer } from '../optics/RayRenderer';
import { RaySolver } from '../optics/RaySolver';
import { CoordinateSystem } from '../utils/CoordinateSystem';
import { clamp } from '../utils/MathUtils';
import { SafeArea } from '../utils/SafeArea';
import { ClearPopup } from '../ui/ClearPopup';
import { GameHUD } from '../ui/GameHUD';
import { HomeView } from '../ui/HomeView';
import { LevelSelectView } from '../ui/LevelSelectView';
import { SettingsPopup } from '../ui/SettingsPopup';
import { UIManager } from '../ui/UIManager';
import { LevelManager } from './LevelManager';

const { ccclass } = _decorator;

type SolverColor = 'white' | 'red' | 'green' | 'blue' | 'yellow' | 'cyan' | 'magenta' | string;

interface SolveHitLike {
  type: 'mirror' | 'prism' | 'target' | 'obstacle' | 'boundary' | string;
  objectId?: string;
  point: Vec2;
  color: SolverColor;
  intensity: number;
}

interface SolveSegmentLike {
  start?: Vec2;
  end?: Vec2;
  from?: Vec2;
  to?: Vec2;
  color: SolverColor;
  intensityStart: number;
  intensityEnd: number;
}

interface TargetFrameState {
  targetId: string;
  hit: boolean;
  colorMatched: boolean;
  intensityEnough: boolean;
  bestIntensity: number;
  bestColor?: SolverColor;
  reason: 'none' | 'wrong_color' | 'low_intensity' | 'not_hit';
}

interface RuntimeTargetState {
  targetId: string;
  charge: number;
  chargeTime: number;
  completed: boolean;
  bestIntensity: number;
  bestColor?: SolverColor;
  lastReason?: TargetFrameState['reason'];
}

interface OpticUndoState {
  id: string;
  type: 'mirror' | 'prism';
  position: Vec2;
  angle: number;
  inInventory: boolean;
}

type SolverResultLike = {
  segments?: SolveSegmentLike[];
  rays?: SolveSegmentLike[];
  impacts?: SolveHitLike[];
  hits?: SolveHitLike[];
  targetHits?: Record<string, { hit?: boolean; color?: SolverColor; intensity?: number }>;
  targetStates?: Record<string, {
    hit?: boolean;
    completed?: boolean;
    colorMatched?: boolean;
    intensityEnough?: boolean;
    color?: SolverColor;
    bestColor?: SolverColor;
    intensity?: number;
    bestIntensity?: number;
    reason?: TargetFrameState['reason'];
  }>;
};

const colorToDisplayColor = (color: SolverColor) => {
  switch (color) {
    case 'red':
      return new Color(255, 128, 146, 255);
    case 'green':
      return new Color(122, 236, 176, 255);
    case 'blue':
      return new Color(120, 196, 255, 255);
    case 'yellow':
      return new Color(255, 220, 120, 255);
    case 'cyan':
      return new Color(120, 238, 255, 255);
    case 'magenta':
      return new Color(255, 136, 238, 255);
    case 'white':
    default:
      return new Color(241, 248, 255, 255);
  }
};

@ccclass('GameApp')
export class GameApp extends Component {
  public static enableDiagnostics = false;
  private readonly coordinateSystem = new CoordinateSystem();
  private readonly gameState = new GameState();
  private readonly solver = new RaySolver();
  private readonly audio = new AudioManager(() => this.gameState.sfxEnabled);
  private levelManager: LevelManager | null = null;
  private uiManager: UIManager | null = null;

  private canvasTransform!: UITransform;
  private frame!: Node;
  private safeAreaRoot!: Node;
  private homeRoot!: Node;
  private levelSelectRoot!: Node;
  private hudRoot!: Node;
  private popupRoot!: Node;
  private objectRoot!: Node;
  private diagnosticRoot!: Node;
  private bootFallbackNode: Node | null = null;
  private backgroundNode!: Node;
  private landscapeHintNode!: Node;
  private debugLabel: Label | null = null;
  private lastStatus = 'booting';
  private lastError = 'none';

  private homeView!: HomeView;
  private levelSelectView!: LevelSelectView;
  private hud!: GameHUD;
  private clearPopup!: ClearPopup;
  private settingsPopup!: SettingsPopup;

  private gameRoot!: Node;
  private blankTapNode!: Node;
  private sourceRoot!: Node;
  private obstacleRoot!: Node;
  private rayRoot!: Node;
  private targetRoot!: Node;
  private opticRoot!: Node;
  private effectRoot!: Node;
  private toolTraySlotsRoot!: Node;

  private rayRenderer!: RayRenderer;
  private dragRotateController: DragRotateController | null = null;

  private currentMode = GameMode.Home;
  private currentLevelIndex = 0;
  private currentLevel: LevelConfig | null = null;
  private levelStartedAt = 0;
  private clearShowing = false;

  private sourceObjects: LightSourceObject[] = [];
  private mirrorObjects: MirrorObject[] = [];
  private prismObjects: PrismObject[] = [];
  private targetObjects = new Map<string, TargetObject>();
  private obstacleObjects: ObstacleObject[] = [];
  private latestSolveResult: SolverResultLike | null = null;
  private latestFrameTargetStates = new Map<string, TargetFrameState>();
  private runtimeTargetStates = new Map<string, RuntimeTargetState>();
  private previousTargetHits: Record<string, boolean> = {};
  private previousTargetCompleted: Record<string, boolean> = {};
  private previousImpactKeys = new Set<string>();
  private impactCooldowns = new Map<string, number>();
  private lastFailureReason = '';
  private recomputeQueued = false;
  private recomputeMinIntervalMs = 16;
  private lastRecomputeAt = 0;
  private lastRecomputeMs = 0;
  private undoStack: OpticUndoState[][] = [];

  private lastCanvasKey = '';

  start() {
    this.installErrorHooks();
    this.setStatus('Creator started');
    try {
      this.canvasTransform = this.node.getComponent(UITransform)!;
      this.captureSceneRoots();
      this.buildDiagnostics();
      this.setStatus('GameApp mounted');
      this.buildBackground();
      this.buildGameRoot();
      this.buildViews();
      this.levelManager = new LevelManager({ levels, gameState: this.gameState });
      this.buildLandscapeHint();

      this.syncLayout();
      this.showHome();
      this.hideBootFallback();
    } catch (error) {
      this.reportError('start', error);
    }
  }

  update(deltaTime = 0) {
    if (!this.canvasTransform) {
      return;
    }
    try {
      const size = this.canvasTransform.contentSize;
      const nextKey = `${Math.round(size.width)}x${Math.round(size.height)}`;
      if (nextKey !== this.lastCanvasKey) {
        this.syncLayout();
      }
      this.flushQueuedRecompute();
      this.tickRuntimeTargets(deltaTime);
      this.refreshDiagnostics();
    } catch (error) {
      this.reportError('update', error);
    }
  }

  onDestroy() {
    this.dragRotateController?.dispose();
    this.dragRotateController = null;
  }

  private installErrorHooks() {
    const globalTarget = globalThis as typeof globalThis & {
      addEventListener?: (type: string, listener: (event: unknown) => void) => void;
    };
    globalTarget.addEventListener?.('error', (event: unknown) => {
      this.reportError('window-error', event);
    });
    globalTarget.addEventListener?.('unhandledrejection', (event: unknown) => {
      this.reportError('unhandled-rejection', event);
    });
  }

  private captureSceneRoots() {
    this.frame = this.ensureSceneNode('Root', this.node);
    (this.frame.getComponent(UITransform) ?? this.frame.addComponent(UITransform)).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);

    this.safeAreaRoot = this.ensureSceneNode('SafeAreaRoot', this.frame);
    this.homeRoot = this.ensureSceneNode('HomeRoot', this.safeAreaRoot);
    this.levelSelectRoot = this.ensureSceneNode('LevelSelectRoot', this.safeAreaRoot);
    this.gameRoot = this.ensureSceneNode('GameRoot', this.safeAreaRoot);
    this.hudRoot = this.ensureSceneNode('HUDRoot', this.safeAreaRoot);
    this.popupRoot = this.ensureSceneNode('PopupRoot', this.safeAreaRoot);
    this.rayRoot = this.ensureSceneNode('RayRoot', this.gameRoot);
    this.objectRoot = this.ensureSceneNode('ObjectRoot', this.gameRoot);
    this.diagnosticRoot = this.ensureSceneNode('DiagnosticRoot', this.node);
    this.bootFallbackNode = this.node.getChildByName('BootFallback');
  }

  private buildDiagnostics() {
    this.clearLayer(this.diagnosticRoot);
    if (!GameApp.enableDiagnostics) {
      this.debugLabel = null;
      return;
    }
    const labelNode = this.ensureSceneNode('DebugOverlay', this.diagnosticRoot);
    (labelNode.getComponent(UITransform) ?? labelNode.addComponent(UITransform)).setContentSize(320, 124);
    labelNode.setPosition(-30, 372, 0);
    const labelBg = labelNode.getComponent(Graphics) ?? labelNode.addComponent(Graphics);
    labelBg.clear();
    labelBg.fillColor = new Color(245, 250, 255, 216);
    labelBg.roundRect(-160, -62, 320, 124, 20);
    labelBg.fill();
    labelBg.strokeColor = new Color(167, 195, 232, 188);
    labelBg.lineWidth = 2;
    labelBg.roundRect(-160, -62, 320, 124, 20);
    labelBg.stroke();
    const textNode = this.ensureSceneNode('DebugOverlayLabel', labelNode);
    (textNode.getComponent(UITransform) ?? textNode.addComponent(UITransform)).setContentSize(288, 96);
    textNode.setPosition(0, 0, 0);
    this.debugLabel = textNode.getComponent(Label) ?? textNode.addComponent(Label);
    this.debugLabel.fontSize = 14;
    this.debugLabel.lineHeight = 18;
    this.debugLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.debugLabel.verticalAlign = Label.VerticalAlign.CENTER;
    this.debugLabel.color = new Color(52, 78, 116, 255);

    this.createDebugButton('DebugHome', -118, 296, 'Home', () => this.showHome());
    this.createDebugButton('DebugSelect', -32, 296, 'Select', () => this.showLevelSelect());
    this.createDebugButton('DebugL1', 54, 296, 'L1', () => this.enterLevel(0));
    this.refreshDiagnostics();
  }

  private refreshDiagnostics() {
    if (!this.debugLabel) {
      return;
    }
    this.debugLabel.string = [
      this.lastStatus,
      `GameApp mounted: ${this.frame ? 'yes' : 'no'}`,
      `current mode: ${this.currentMode}`,
      `current level index: ${this.currentLevel ? this.currentLevelIndex : -1}`,
      `last error: ${this.lastError}`,
    ].join('\n');
  }

  private setStatus(status: string) {
    this.lastStatus = status;
    this.refreshDiagnostics();
  }

  private reportError(scope: string, error: unknown) {
    const detail = this.stringifyError(error);
    this.lastError = `${scope}: ${detail}`;
    this.refreshDiagnostics();
    console.error?.(`[GameApp:${scope}]`, error);
    if (this.bootFallbackNode) {
      this.bootFallbackNode.setPosition(0, 0, 0);
      this.bootFallbackNode.active = true;
    }
  }

  private stringifyError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'unknown';
  }

  private hideBootFallback() {
    if (this.bootFallbackNode) {
      this.bootFallbackNode.active = false;
    }
  }

  private buildBackground() {
    this.backgroundNode = this.ensureSceneNode('BackgroundRoot', this.frame);
    this.clearLayer(this.backgroundNode);
    const graphics = this.backgroundNode.getComponent(Graphics) ?? this.backgroundNode.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = BACKGROUND_TOP;
    graphics.roundRect(-DESIGN_WIDTH * 0.5, -DESIGN_HEIGHT * 0.5, DESIGN_WIDTH, DESIGN_HEIGHT, 40);
    graphics.fill();
    graphics.fillColor = new Color(BACKGROUND_BOTTOM.r, BACKGROUND_BOTTOM.g, BACKGROUND_BOTTOM.b, 222);
    graphics.circle(128, -260, 282);
    graphics.fill();
    graphics.fillColor = new Color(75, 120, 186, 112);
    graphics.circle(-128, 252, 194);
    graphics.fill();
    graphics.fillColor = new Color(54, 92, 148, 124);
    graphics.circle(148, 204, 144);
    graphics.fill();
    graphics.fillColor = new Color(128, 176, 244, 38);
    graphics.roundRect(-176, -382, 352, 764, 36);
    graphics.fill();

    this.createAmbientBeam(new Vec3(-126, 234, 0), 18, 248, new Color(108, 170, 255, 48), new Color(238, 245, 255, 188), 18);
    this.createAmbientBeam(new Vec3(118, -38, 0), -24, 224, new Color(126, 182, 255, 42), new Color(234, 244, 255, 168), 22);
    this.createAmbientBeam(new Vec3(-30, -280, 0), 8, 198, new Color(142, 194, 255, 34), new Color(230, 242, 255, 142), 24);
  }

  private buildGameRoot() {
    (this.gameRoot.getComponent(UITransform) ?? this.gameRoot.addComponent(UITransform)).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    this.gameRoot.active = false;

    const playAreaNode = this.ensureSceneNode('PlayArea', this.gameRoot);
    const playAreaGraphics = playAreaNode.getComponent(Graphics) ?? playAreaNode.addComponent(Graphics);
    playAreaGraphics.clear();
    const left = PLAY_AREA_RECT.x - DESIGN_WIDTH * 0.5;
    const bottom = PLAY_AREA_RECT.y - DESIGN_HEIGHT * 0.5;
    playAreaGraphics.fillColor = PLAY_AREA_TINT;
    playAreaGraphics.roundRect(left, bottom, PLAY_AREA_RECT.width, PLAY_AREA_RECT.height, 34);
    playAreaGraphics.fill();
    playAreaGraphics.strokeColor = new Color(181, 214, 255, 154);
    playAreaGraphics.lineWidth = 1.6;
    playAreaGraphics.roundRect(left, bottom, PLAY_AREA_RECT.width, PLAY_AREA_RECT.height, 34);
    playAreaGraphics.stroke();
    playAreaGraphics.strokeColor = new Color(124, 172, 238, 36);
    playAreaGraphics.lineWidth = 1;
    for (let i = 1; i <= 3; i += 1) {
      const y = bottom + (PLAY_AREA_RECT.height / 4) * i;
      playAreaGraphics.moveTo(left + 24, y);
      playAreaGraphics.lineTo(left + PLAY_AREA_RECT.width - 24, y);
      playAreaGraphics.stroke();
    }
    for (let i = 1; i <= 2; i += 1) {
      const x = left + (PLAY_AREA_RECT.width / 3) * i;
      playAreaGraphics.moveTo(x, bottom + 24);
      playAreaGraphics.lineTo(x, bottom + PLAY_AREA_RECT.height - 24);
      playAreaGraphics.stroke();
    }

    const trayLeft = -166;
    const trayBottom = -410;
    const trayWidth = 332;
    const trayHeight = 110;
    playAreaGraphics.fillColor = new Color(16, 31, 54, 208);
    playAreaGraphics.roundRect(trayLeft, trayBottom, trayWidth, trayHeight, 28);
    playAreaGraphics.fill();
    playAreaGraphics.strokeColor = new Color(172, 206, 246, 130);
    playAreaGraphics.lineWidth = 1.4;
    playAreaGraphics.roundRect(trayLeft, trayBottom, trayWidth, trayHeight, 28);
    playAreaGraphics.stroke();

    const trayTitle = this.ensureSceneNode('ToolTrayTitle', playAreaNode);
    trayTitle.setPosition(0, -362, 0);
    (trayTitle.getComponent(UITransform) ?? trayTitle.addComponent(UITransform)).setContentSize(168, 24);
    const trayTitleLabel = trayTitle.getComponent(Label) ?? trayTitle.addComponent(Label);
    trayTitleLabel.fontSize = 13;
    trayTitleLabel.lineHeight = 18;
    trayTitleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    trayTitleLabel.verticalAlign = Label.VerticalAlign.CENTER;
    trayTitleLabel.color = new Color(164, 190, 226, 255);
    trayTitleLabel.string = '道具栏 · 拖动到可玩区';

    this.toolTraySlotsRoot = this.ensureSceneNode('ToolTraySlots', playAreaNode);
    this.clearLayer(this.toolTraySlotsRoot);

    this.blankTapNode = this.ensureSceneNode('BlankTapNode', this.gameRoot);
    (this.blankTapNode.getComponent(UITransform) ?? this.blankTapNode.addComponent(UITransform)).setContentSize(PLAY_AREA_RECT.width, PLAY_AREA_RECT.height);
    this.blankTapNode.setPosition(
      PLAY_AREA_RECT.x + PLAY_AREA_RECT.width * 0.5 - DESIGN_WIDTH * 0.5,
      PLAY_AREA_RECT.y + PLAY_AREA_RECT.height * 0.5 - DESIGN_HEIGHT * 0.5,
      0,
    );
    this.blankTapNode.on(Node.EventType.TOUCH_START, () => {});

    this.obstacleRoot = this.ensureSceneNode('ObstacleRoot', this.objectRoot);
    this.targetRoot = this.ensureSceneNode('TargetRoot', this.objectRoot);
    this.sourceRoot = this.ensureSceneNode('SourceRoot', this.objectRoot);
    this.opticRoot = this.ensureSceneNode('OpticRoot', this.objectRoot);
    this.effectRoot = this.ensureSceneNode('EffectRoot', this.objectRoot);
    this.rayRenderer = new RayRenderer(this.rayRoot);

    // Creator may preserve scene children in arbitrary serialized order.
    // Force a stable gameplay stack so the play area background never covers
    // rays or optic objects, while blank taps still clear selection.
    playAreaNode.setSiblingIndex(0);
    this.rayRoot.setSiblingIndex(1);
    this.blankTapNode.setSiblingIndex(2);
    this.objectRoot.setSiblingIndex(3);
  }

  private buildViews() {
    const layer = this.node.layer;
    this.homeView = new HomeView(layer, {
      onStart: () => this.handleUiClick(() => this.enterLevel(this.getRecommendedLevelIndex())),
      onLevels: () => this.handleUiClick(() => this.showLevelSelect()),
      onSettings: () => this.handleUiClick(() => this.openSettings()),
    });
    this.homeView.node.parent = this.homeRoot;

    this.levelSelectView = new LevelSelectView(layer, {
      onBack: () => this.handleUiClick(() => this.showHome()),
      onSelectLevel: (index) => this.handleUiClick(() => this.enterLevel(index)),
    });
    this.levelSelectView.node.parent = this.levelSelectRoot;
    this.levelSelectView.setVisible(false);

    this.hud = new GameHUD(layer, {
      onBack: () => this.handleUiClick(() => this.showLevelSelect()),
      onReset: () => this.handleUiClick(() => this.resetCurrentLevel()),
      onSettings: () => this.handleUiClick(() => this.openSettings()),
      onRotateLeft: () => this.handleUiClick(() => this.rotateSelection(-ROTATE_STEP_DEGREES)),
      onRotateRight: () => this.handleUiClick(() => this.rotateSelection(ROTATE_STEP_DEGREES)),
      onUndo: () => this.handleUiClick(() => this.undoLastMove()),
    }, {
      enableDiagnostics: GameApp.enableDiagnostics,
    });
    this.hud.node.parent = this.hudRoot;
    this.hud.setVisible(false);

    this.clearPopup = new ClearPopup(layer, {
      onNext: () => this.handleUiClick(() => this.advanceLevel()),
      onReplay: () => this.handleUiClick(() => this.resetCurrentLevel()),
      onLevelSelect: () => this.handleUiClick(() => this.showLevelSelect()),
    });
    this.clearPopup.node.parent = this.popupRoot;
    this.uiManager = new UIManager({ hud: this.hud, clearPopup: this.clearPopup });

    this.settingsPopup = new SettingsPopup(layer, {
      onToggleSfx: () => this.handleUiClick(() => {
        this.gameState.setSfxEnabled(!this.gameState.sfxEnabled);
        this.settingsPopup.refresh(this.gameState.sfxEnabled, this.gameState.vibrationEnabled);
      }),
      onToggleVibration: () => this.handleUiClick(() => {
        this.gameState.setVibrationEnabled(!this.gameState.vibrationEnabled);
        this.settingsPopup.refresh(this.gameState.sfxEnabled, this.gameState.vibrationEnabled);
      }),
      onClose: () => this.handleUiClick(() => this.closeSettings()),
    });
    this.settingsPopup.node.parent = this.popupRoot;
  }

  private buildLandscapeHint() {
    this.landscapeHintNode = this.ensureSceneNode('LandscapeHint', this.diagnosticRoot);
    (this.landscapeHintNode.getComponent(UITransform) ?? this.landscapeHintNode.addComponent(UITransform)).setContentSize(320, 64);
    const label = this.landscapeHintNode.getComponent(Label) ?? this.landscapeHintNode.addComponent(Label);
    label.string = LANDSCAPE_HINT;
    label.fontSize = 28;
    label.lineHeight = 36;
    label.color = UI_TEXT;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    this.landscapeHintNode.active = false;
  }

  private syncLayout() {
    const scale = this.coordinateSystem.applyToFrame(this.frame, this.canvasTransform);
    const insets = SafeArea.createInsets(scale);
    this.frame.setPosition(0, (insets.bottom - insets.top) * 0.12, 0);

    const landscape = this.coordinateSystem.isLandscape();
    this.frame.active = true;
    this.landscapeHintNode.active = landscape;
    this.landscapeHintNode.setPosition(0, 0, 0);
    this.lastCanvasKey = `${Math.round(this.canvasTransform.contentSize.width)}x${Math.round(this.canvasTransform.contentSize.height)}`;
  }

  private showHome() {
    this.currentMode = GameMode.Home;
    this.setStatus('current mode: home');
    this.homeView.setVisible(true);
    this.levelSelectView.setVisible(false);
    this.gameRoot.active = false;
    if (this.uiManager) {
      this.uiManager.hideAllGameUI();
    } else {
      this.hud.setVisible(false);
      this.clearPopup.hide();
    }
    this.clearShowing = false;
    this.closeSettings();
    this.dragRotateController?.clearSelection();
  }

  private showLevelSelect() {
    this.currentMode = GameMode.LevelSelect;
    this.setStatus('current mode: select');
    const levelList = this.levelManager?.getLevels() ?? levels;
    this.levelSelectView.refresh(
      levelList,
      this.gameState.getClearedIds(),
      this.getRecommendedLevelIndex(),
      this.currentLevel ? this.currentLevelIndex : -1,
    );
    this.homeView.setVisible(false);
    this.levelSelectView.setVisible(true);
    this.gameRoot.active = false;
    if (this.uiManager) {
      this.uiManager.hideAllGameUI();
    } else {
      this.hud.setVisible(false);
      this.clearPopup.hide();
    }
    this.clearShowing = false;
    this.closeSettings();
    this.dragRotateController?.clearSelection();
  }

  private enterLevel(index: number) {
    const fallbackIndex = clamp(index, 0, levels.length - 1);
    const resolvedLevel = this.levelManager ? this.levelManager.loadLevel(index) : levels[fallbackIndex];
    const resolvedIndex = this.levelManager ? this.levelManager.getCurrentLevelIndex() : fallbackIndex;
    this.currentMode = GameMode.Game;
    this.currentLevelIndex = resolvedIndex;
    this.setStatus(`current mode: game`);
    this.homeView.setVisible(false);
    this.levelSelectView.setVisible(false);
    this.gameRoot.active = true;
    if (this.uiManager) {
      this.uiManager.showGameplayUI();
    } else {
      this.hud.setVisible(true);
      this.clearPopup.hide();
    }
    this.clearShowing = false;
    this.closeSettings();
    this.loadLevel(resolvedLevel ?? levels[resolvedIndex]);
  }

  private loadLevel(level: LevelConfig) {
    try {
      this.currentLevel = level;
      this.levelStartedAt = Date.now();
      this.previousTargetHits = {};
      this.previousTargetCompleted = {};
      this.previousImpactKeys.clear();
      this.impactCooldowns.clear();
      this.latestSolveResult = null;
      this.latestFrameTargetStates.clear();
      this.runtimeTargetStates.clear();
      this.lastFailureReason = '';
      this.undoStack = [];
      this.recomputeQueued = false;
      this.lastRecomputeMs = 0;

      this.dragRotateController?.dispose();
      this.dragRotateController = null;
      this.clearLayer(this.sourceRoot);
      this.clearLayer(this.obstacleRoot);
      this.clearLayer(this.targetRoot);
      this.clearLayer(this.opticRoot);
      this.clearLayer(this.effectRoot);
      this.rayRenderer.clear();

      this.sourceObjects = [];
      this.mirrorObjects = [];
      this.prismObjects = [];
      this.targetObjects.clear();
      this.obstacleObjects = [];

      level.sources.forEach((source) => this.sourceObjects.push(this.createSource(source)));
      level.obstacles.forEach((obstacle) => this.obstacleObjects.push(this.createObstacle(obstacle)));
      level.targets.forEach((target) => {
        this.targetObjects.set(target.id, this.createTarget(target));
        this.runtimeTargetStates.set(target.id, {
          targetId: target.id,
          charge: 0,
          chargeTime: Math.max(0.25, Number((target as { chargeTime?: number }).chargeTime ?? 0.25)),
          completed: false,
          bestIntensity: 0,
        });
      });
      const toolSlots = this.computeToolInventoryPositions(level.mirrors.length + level.prisms.length);
      let toolIndex = 0;
      level.mirrors.forEach((mirror) => {
        this.mirrorObjects.push(this.createMirror(mirror, toolSlots[toolIndex]));
        toolIndex += 1;
      });
      level.prisms.forEach((prism) => {
        this.prismObjects.push(this.createPrism(prism, toolSlots[toolIndex]));
        toolIndex += 1;
      });
      this.refreshToolTraySlots(toolSlots);

      const blockedZones = this.obstacleObjects.map((obstacle) => {
        const snapshot = obstacle.toSnapshot();
        return new Rect(
          snapshot.position.x - snapshot.width * 0.5,
          snapshot.position.y - snapshot.height * 0.5,
          snapshot.width,
          snapshot.height,
        );
      });

      this.dragRotateController = new DragRotateController(
        this.frame,
        this.blankTapNode,
        new Rect(PLAY_AREA_RECT.x, PLAY_AREA_RECT.y, PLAY_AREA_RECT.width, PLAY_AREA_RECT.height),
        blockedZones,
        this.audio,
        {
          onSelectionChanged: (object) => this.onSelectionChanged(object),
          onWorldChanged: () => this.queueRecompute(),
          onInteractionCommitted: (_object, _mode, changed) => this.onInteractionCommitted(changed),
        },
      );
      [...this.mirrorObjects, ...this.prismObjects].forEach((object) => this.dragRotateController?.register(object));

      this.recordUndoState();
      const requiredTargetCount = level.targets.filter((target) => target.required).length;
      if (this.uiManager) {
        this.uiManager.showLevelHUD({
          levelTitle: level.name,
          levelHint: level.hint,
          hitCount: 0,
          totalCount: requiredTargetCount,
          energyPercent: 0,
          selectionText: '未选择道具',
          selectionAngle: null,
          hintText: '从下方道具栏拖入，选中后沿外圈拖动可旋转方向。',
        });
        this.uiManager.clearFailureReason();
      } else {
        this.hud.setLevelTitle(level.name);
        this.hud.setLevelHint(level.hint);
        this.hud.setTargetSummary(0, requiredTargetCount, 0);
        this.hud.setSelectionInfo('未选择道具');
        this.hud.setSelectionAngle(null);
        this.hud.setHint('从下方道具栏拖入，选中后沿外圈拖动可旋转方向。');
        this.hud.clearFailureReason();
      }
      this.setStatus(`current mode: game · ${level.name}`);
      this.recalculateWorldImmediate();
    } catch (error) {
      this.reportError(`loadLevel:${level.id}`, error);
    }
  }

  private resetCurrentLevel() {
    if (!this.currentLevel) {
      return;
    }
    const index = this.levelManager?.getCurrentLevelIndex() ?? this.currentLevelIndex;
    this.enterLevel(index);
  }

  private advanceLevel() {
    if (!(this.levelManager?.hasNextLevel() ?? (this.currentLevelIndex < levels.length - 1))) {
      this.showLevelSelect();
      return;
    }
    const nextLevel = this.levelManager?.loadNextLevel();
    if (nextLevel) {
      this.enterLevel(this.levelManager?.getCurrentLevelIndex() ?? this.currentLevelIndex + 1);
      return;
    }
    this.enterLevel(this.currentLevelIndex + 1);
  }

  private openSettings() {
    this.settingsPopup.refresh(this.gameState.sfxEnabled, this.gameState.vibrationEnabled);
    this.settingsPopup.show();
  }

  private closeSettings() {
    this.settingsPopup.hide();
  }

  private onSelectionChanged(object: DraggableOpticObject | null) {
    if (!object) {
      if (this.uiManager) {
        this.uiManager.updateSelection('未选择道具', null);
        this.uiManager.updateHint(this.currentLevel?.hint ?? '从道具栏拖入，沿外圈拖动旋转。');
      } else {
        this.hud.setSelectionInfo('未选择道具');
        this.hud.setSelectionAngle(null);
        this.hud.setHint(this.currentLevel?.hint ?? '从道具栏拖入，沿外圈拖动旋转。');
      }
      return;
    }
    const status = object.isInInventory() ? '（道具栏）' : '';
    if (this.uiManager) {
      this.uiManager.updateSelection(`${object.getDisplayName()} ${status}`.trim(), object.getAngle());
      this.uiManager.updateHint(object.isInInventory() ? '继续上拖放入可玩区。' : '拖动移动，沿外圈拖动可旋转方向。');
    } else {
      this.hud.setSelectionInfo(`${object.getDisplayName()} ${status}`.trim());
      this.hud.setSelectionAngle(object.getAngle());
      this.hud.setHint(object.isInInventory() ? '继续上拖放入可玩区。' : '拖动移动，沿外圈拖动可旋转方向。');
    }
  }

  private queueRecompute() {
    this.recomputeQueued = true;
  }

  private flushQueuedRecompute() {
    if (!this.recomputeQueued || !this.currentLevel) {
      return;
    }
    const now = Date.now();
    if (now - this.lastRecomputeAt < this.recomputeMinIntervalMs) {
      return;
    }
    this.recomputeQueued = false;
    this.recalculateWorldImmediate();
  }

  private recalculateWorldImmediate() {
    if (!this.currentLevel) {
      return;
    }
    this.recomputeQueued = false;
    const startedAt = Date.now();
    const result = this.solver.solve(this.buildSolveWorld(this.currentLevel)) as SolverResultLike;
    this.lastRecomputeAt = startedAt;
    this.lastRecomputeMs = Date.now() - startedAt;
    this.latestSolveResult = result;
    this.latestFrameTargetStates = this.buildFrameTargetStates(this.currentLevel, result);
    this.rayRenderer.render(result);
    this.applyImpactFeedback(result);
    this.refreshHudDebugMetrics(result);
    this.tickRuntimeTargets(0);
  }

  private onInteractionCommitted(changed: boolean) {
    if (!changed) {
      return;
    }
    this.recordUndoState();
  }

  private refreshHudDebugMetrics(result: SolverResultLike) {
    if (!this.currentLevel) {
      return;
    }
    const raySegments = (result.rays ?? result.segments ?? []).length;
    const requiredTargets = this.currentLevel.targets.filter((target) => target.required);
    const hitTargets = requiredTargets.filter((target) => this.latestFrameTargetStates.get(target.id)?.hit).length;
    const metrics = {
      levelId: this.currentLevel.numericId,
      raySegments,
      hitTargets: `${hitTargets}/${requiredTargets.length}`,
      recomputeMs: this.lastRecomputeMs,
    };
    if (this.uiManager) {
      this.uiManager.updateDebugMetrics(metrics);
    } else {
      this.hud.setDebugMetrics(metrics);
    }
  }

  private rotateSelection(deltaDegrees: number) {
    if (!this.dragRotateController) {
      return;
    }
    const before = this.captureUndoState();
    const rotated = this.dragRotateController.rotateSelection(deltaDegrees);
    this.dragRotateController.finishRotateInteraction();
    if (!rotated) {
      if (this.uiManager) {
        this.uiManager.showFailureReason('请先选择可旋转道具', 1000);
      } else {
        this.hud.showFailureReason('请先选择可旋转道具', 1000);
      }
      return;
    }
    this.recordUndoStateFromSnapshots(before, this.captureUndoState());
    this.queueRecompute();
    this.flushQueuedRecompute();
  }

  private undoLastMove() {
    if (this.undoStack.length <= 1) {
      if (this.uiManager) {
        this.uiManager.showFailureReason('没有可撤销步骤', 1000);
      } else {
        this.hud.showFailureReason('没有可撤销步骤', 1000);
      }
      this.audio.play(SoundKeys.InvalidAction);
      return;
    }
    this.undoStack.pop();
    const snapshot = this.undoStack[this.undoStack.length - 1];
    if (!snapshot) {
      return;
    }
    this.applyUndoState(snapshot);
    this.onSelectionChanged(this.dragRotateController?.getSelection() ?? null);
    this.queueRecompute();
    this.recalculateWorldImmediate();
  }

  private recordUndoState() {
    this.recordUndoStateFromSnapshots(undefined, this.captureUndoState());
  }

  private recordUndoStateFromSnapshots(previous: OpticUndoState[] | undefined, next: OpticUndoState[]) {
    const top = this.undoStack[this.undoStack.length - 1];
    if (previous && (!top || !this.isUndoStateEqual(top, previous))) {
      this.undoStack.push(previous);
    }
    const latest = this.undoStack[this.undoStack.length - 1];
    if (!latest || !this.isUndoStateEqual(latest, next)) {
      this.undoStack.push(next);
    }
    if (this.undoStack.length > 48) {
      this.undoStack.shift();
    }
  }

  private captureUndoState() {
    const mirrorStates = this.mirrorObjects.map((mirror) => ({
      id: mirror.opticId,
      type: 'mirror' as const,
      position: mirror.getDesignPosition(),
      angle: mirror.getAngle(),
      inInventory: mirror.isInInventory(),
    }));
    const prismStates = this.prismObjects.map((prism) => ({
      id: prism.opticId,
      type: 'prism' as const,
      position: prism.getDesignPosition(),
      angle: prism.getAngle(),
      inInventory: prism.isInInventory(),
    }));
    return [...mirrorStates, ...prismStates];
  }

  private applyUndoState(snapshot: OpticUndoState[]) {
    const mirrorMap = new Map(this.mirrorObjects.map((mirror) => [mirror.opticId, mirror]));
    const prismMap = new Map(this.prismObjects.map((prism) => [prism.opticId, prism]));
    snapshot.forEach((state) => {
      const target = state.type === 'mirror' ? mirrorMap.get(state.id) : prismMap.get(state.id);
      if (!target) {
        return;
      }
      target.applyDesignPosition(state.position);
      target.applyAngle(state.angle);
      target.setInventoryState(state.inInventory);
      if (!state.inInventory) {
        target.recordValidPosition();
      }
      target.setInteractionMode('idle');
    });
  }

  private isUndoStateEqual(a: OpticUndoState[], b: OpticUndoState[]) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      const left = a[i];
      const right = b[i];
      if (
        left.id !== right.id
        || left.type !== right.type
        || left.inInventory !== right.inInventory
        || Math.abs(left.position.x - right.position.x) > 0.05
        || Math.abs(left.position.y - right.position.y) > 0.05
        || Math.abs(left.angle - right.angle) > 0.1
      ) {
        return false;
      }
    }
    return true;
  }

  private handleLevelClear(energyPercent: number) {
    if (!this.currentLevel) {
      return;
    }
    this.clearShowing = true;
    this.currentMode = GameMode.Clear;
    this.setStatus(`current mode: clear · ${this.currentLevel.name}`);
    this.levelManager?.markCurrentLevelCleared();
    if (!this.levelManager) {
      this.gameState.markCleared(String(this.currentLevel.id));
    }
    this.audio.play(SoundKeys.LevelClear);

    this.targetObjects.forEach((target) => {
      const snapshot = target.toSnapshot();
      const local = this.toLocal(snapshot.position);
      ClearEffect.play(this.effectRoot, local.x, local.y, snapshot.radius + 54);
    });
    ClearEffect.play(this.effectRoot, 0, 0, 168);

    const elapsedSeconds = (Date.now() - this.levelStartedAt) / 1000;
    const stars = elapsedSeconds <= 14 ? 3 : elapsedSeconds <= 28 ? 2 : 1;
    const payload = {
      timeSeconds: elapsedSeconds,
      energyPercent,
      stars,
      hasNext: this.currentLevelIndex < levels.length - 1,
    };
    if (this.uiManager) {
      this.uiManager.showLevelClearPopup(payload);
    } else {
      this.clearPopup.show(payload);
    }

  }

  private applyImpactFeedback(result: SolverResultLike) {
    const newKeys = new Set<string>();
    const watchTypes: Array<SolveHitLike['type']> = ['mirror', 'prism'];
    const hits = this.extractHits(result);
    watchTypes.forEach((type) => {
      const impact = hits.find((item) => item.type === type);
      if (!impact) {
        return;
      }
      const key = `${type}:${impact.objectId}:${impact.color}`;
      newKeys.add(key);
      const now = Date.now();
      const cooldown = this.impactCooldowns.get(type) ?? 0;
      if (!this.previousImpactKeys.has(key) && now >= cooldown) {
        const local = this.toLocal(impact.point);
        HitSpark.spawn(this.effectRoot, local.x, local.y, colorToDisplayColor(impact.color), type === 'mirror' ? 10 : 14);
        this.audio.play(type === 'mirror' ? SoundKeys.RayHitMirror : SoundKeys.RayHitPrism);
        this.impactCooldowns.set(type, now + 220);
      }
    });
    this.previousImpactKeys = newKeys;
  }

  private tickRuntimeTargets(deltaTime: number) {
    if (!this.currentLevel || !this.latestSolveResult) {
      return;
    }
    if (this.currentMode !== GameMode.Game) {
      return;
    }

    const frameStates = this.latestFrameTargetStates;
    const hits = this.extractHits(this.latestSolveResult);
    const requiredTargets = this.currentLevel.targets.filter((target) => target.required);
    const targetById = new Map(this.currentLevel.targets.map((target) => [target.id, target]));
    const dt = Math.max(0, deltaTime);

    let completedCount = 0;
    let energyRatioTotal = 0;

    this.targetObjects.forEach((targetObject, id) => {
      const runtime = this.runtimeTargetStates.get(id);
      const frameState = frameStates.get(id) ?? {
        targetId: id,
        hit: false,
        colorMatched: false,
        intensityEnough: false,
        bestIntensity: 0,
        reason: 'not_hit',
      };
      if (!runtime) {
        return;
      }

      const target = targetById.get(id);
      const chargeTime = target
        ? Math.max(0.25, Number((target as { chargeTime?: number }).chargeTime ?? runtime.chargeTime))
        : runtime.chargeTime;
      runtime.chargeTime = chargeTime;

      const wasCompleted = runtime.completed;
      const validHit = frameState.hit && frameState.colorMatched && frameState.intensityEnough;
      const decayRate = frameState.hit ? 0.7 : 0.45;
      runtime.charge = validHit
        ? Math.min(chargeTime, runtime.charge + dt)
        : Math.max(0, runtime.charge - dt * decayRate);
      runtime.completed = runtime.charge + 1e-4 >= chargeTime;
      runtime.bestIntensity = Math.max(frameState.bestIntensity, validHit ? runtime.bestIntensity : runtime.bestIntensity * 0.6);
      runtime.bestColor = frameState.bestColor;
      runtime.lastReason = frameState.reason;

      const justHit = frameState.hit && !this.previousTargetHits[id];
      if (justHit) {
        const snapshot = targetObject.toSnapshot();
        const local = this.toLocal(snapshot.position);
        const color = colorToDisplayColor(frameState.bestColor ?? snapshot.acceptedColors[0] ?? 'white');
        HitSpark.spawn(this.effectRoot, local.x, local.y, color, snapshot.radius + 10);
        this.audio.play(SoundKeys.RayHitTarget);
      }

      const justCompleted = runtime.completed && !wasCompleted;
      if (justCompleted) {
        const snapshot = targetObject.toSnapshot();
        const local = this.toLocal(snapshot.position);
        HitSpark.spawn(this.effectRoot, local.x, local.y, colorToDisplayColor(frameState.bestColor ?? 'white'), snapshot.radius + 16);
        this.audio.play(SoundKeys.TargetCharge);
      }

      targetObject.setRuntimeState({
        hit: frameState.hit,
        completed: runtime.completed,
        colorMatched: frameState.colorMatched,
        intensityEnough: frameState.intensityEnough,
        chargeRatio: clamp(runtime.charge / Math.max(chargeTime, 0.001), 0, 1),
        reason: frameState.reason,
      });

      this.previousTargetHits[id] = frameState.hit;
      this.previousTargetCompleted[id] = runtime.completed;
    });

    requiredTargets.forEach((target) => {
      const runtime = this.runtimeTargetStates.get(target.id);
      if (!runtime) {
        return;
      }
      if (runtime.completed) {
        completedCount += 1;
      }
      energyRatioTotal += clamp(runtime.charge / Math.max(runtime.chargeTime, 0.001), 0, 1);
    });

    const energyPercent = requiredTargets.length
      ? Math.round((energyRatioTotal / requiredTargets.length) * 100)
      : 100;
    if (this.uiManager) {
      this.uiManager.updateTargetSummary(completedCount, requiredTargets.length, energyPercent);
    } else {
      this.hud.setTargetSummary(completedCount, requiredTargets.length, energyPercent);
    }

    const reason = this.resolveFailureReason(requiredTargets, frameStates, hits);
    if (reason && reason !== this.lastFailureReason) {
      if (this.uiManager) {
        this.uiManager.showFailureReason(reason, 1500);
      } else {
        this.hud.showFailureReason(reason, 1500);
      }
      this.lastFailureReason = reason;
    }
    if (!reason) {
      this.lastFailureReason = '';
    }

    if (!this.clearShowing && requiredTargets.length > 0 && completedCount === requiredTargets.length) {
      this.handleLevelClear(energyPercent);
    }
  }

  private buildFrameTargetStates(level: LevelConfig, result: SolverResultLike) {
    const stateMap = new Map<string, TargetFrameState>();
    const targetHits = this.extractHits(result).filter((hit) => hit.type === 'target');
    const solverTargetStates = result.targetStates ?? {};
    const legacyTargetHits = result.targetHits ?? {};

    level.targets.forEach((target) => {
      const solverState = solverTargetStates[target.id];
      const legacyState = legacyTargetHits[target.id];
      const acceptedColors = target.acceptedColors ?? [];
      const targetEvents = targetHits.filter((hit) => hit.objectId === target.id);

      let hit = false;
      let colorMatched = false;
      let intensityEnough = false;
      let bestIntensity = 0;
      let bestColor: SolverColor | undefined;
      let reason: TargetFrameState['reason'] = 'not_hit';

      if (solverState) {
        hit = Boolean(solverState.hit ?? solverState.completed ?? false);
        colorMatched = Boolean(solverState.colorMatched ?? solverState.completed ?? false);
        intensityEnough = Boolean(solverState.intensityEnough ?? solverState.completed ?? false);
        bestIntensity = Number(solverState.bestIntensity ?? solverState.intensity ?? 0);
        bestColor = solverState.bestColor ?? solverState.color;
        reason = solverState.reason ?? (hit ? (colorMatched ? (intensityEnough ? 'none' : 'low_intensity') : 'wrong_color') : 'not_hit');
      } else if (legacyState) {
        hit = Boolean(legacyState.hit);
        bestIntensity = Number(legacyState.intensity ?? 0);
        bestColor = legacyState.color;
        colorMatched = hit;
        intensityEnough = hit;
        reason = hit ? 'none' : 'not_hit';
      }

      if (!hit && targetEvents.length > 0) {
        hit = true;
      }
      if (targetEvents.length > 0) {
        const strongest = targetEvents.reduce((best, current) => (current.intensity > best.intensity ? current : best));
        bestIntensity = Math.max(bestIntensity, strongest.intensity);
        bestColor = strongest.color;
        colorMatched = acceptedColors.includes(strongest.color);
        intensityEnough = strongest.intensity >= target.requiredIntensity;
        reason = colorMatched ? (intensityEnough ? 'none' : 'low_intensity') : 'wrong_color';
      }

      if (!hit) {
        reason = 'not_hit';
      } else if (!colorMatched) {
        reason = 'wrong_color';
      } else if (!intensityEnough) {
        reason = 'low_intensity';
      } else {
        reason = 'none';
      }

      stateMap.set(target.id, {
        targetId: target.id,
        hit,
        colorMatched,
        intensityEnough,
        bestIntensity,
        bestColor,
        reason,
      });
    });

    return stateMap;
  }

  private resolveFailureReason(
    requiredTargets: TargetConfig[],
    frameStates: Map<string, TargetFrameState>,
    hits: SolveHitLike[],
  ) {
    if (!requiredTargets.length) {
      return '';
    }
    const pending = requiredTargets.filter((target) => !this.runtimeTargetStates.get(target.id)?.completed);
    if (!pending.length) {
      return '';
    }
    if (pending.some((target) => frameStates.get(target.id)?.reason === 'wrong_color')) {
      return '颜色不匹配';
    }
    if (pending.some((target) => frameStates.get(target.id)?.reason === 'low_intensity')) {
      return '光强不足';
    }
    if (hits.some((hit) => hit.type === 'obstacle')) {
      return '光线被阻挡';
    }
    return '需要点亮全部目标';
  }

  private extractHits(result: SolverResultLike) {
    const raw = result.hits ?? result.impacts ?? [];
    return raw.filter((hit): hit is SolveHitLike => Boolean(hit && hit.point && hit.type));
  }

  private buildSolveWorld(level: LevelConfig) {
    return {
      bounds: {
        x: PLAY_AREA_RECT.x,
        y: PLAY_AREA_RECT.y,
        width: PLAY_AREA_RECT.width,
        height: PLAY_AREA_RECT.height,
      },
      rules: level.rules,
      sources: this.sourceObjects.map((source) => source.toSnapshot()),
      mirrors: this.mirrorObjects.filter((mirror) => !mirror.isInInventory()).map((mirror) => mirror.toSnapshot()),
      prisms: this.prismObjects.filter((prism) => !prism.isInInventory()).map((prism) => prism.toSnapshot()),
      targets: [...this.targetObjects.values()].map((target) => target.toSnapshot()),
      obstacles: this.obstacleObjects.map((obstacle) => obstacle.toSnapshot()),
    };
  }

  private createSource(source: LightSourceConfig) {
    const node = this.createLayerNode(`Source:${source.id}`, this.sourceRoot);
    const component = node.addComponent(LightSourceObject);
    component.setup({
      id: source.id,
      position: new Vec2(source.x, source.y),
      angle: source.angle,
      color: source.color,
      intensity: source.intensity,
      beamWidth: source.beamWidth,
    });
    return component;
  }

  private createMirror(mirror: MirrorConfig, inventoryPosition: Vec2) {
    const node = this.createLayerNode(`Mirror:${mirror.id}`, this.opticRoot);
    const component = node.addComponent(MirrorObject);
    const startsInInventory = Boolean(mirror.startsInInventory);
    const startPosition = startsInInventory ? inventoryPosition.clone() : new Vec2(mirror.x, mirror.y);
    component.setup(
      {
        id: mirror.id,
        position: startPosition,
        angle: mirror.angle,
        length: mirror.length,
        reflectivity: mirror.reflectivity,
      },
      {
        movable: mirror.movable,
        rotatable: mirror.rotatable,
      },
    );
    component.setMoveBounds(mirror.moveBounds);
    component.setInventoryState(startsInInventory, inventoryPosition);
    if (!startsInInventory) {
      component.recordValidPosition();
    }
    return component;
  }

  private createPrism(prism: PrismConfig, inventoryPosition: Vec2) {
    const node = this.createLayerNode(`Prism:${prism.id}`, this.opticRoot);
    const component = node.addComponent(PrismObject);
    const startsInInventory = Boolean(prism.startsInInventory);
    const startPosition = startsInInventory ? inventoryPosition.clone() : new Vec2(prism.x, prism.y);
    component.setup(
      {
        id: prism.id,
        position: startPosition,
        angle: prism.angle,
        size: prism.size,
        dispersion: prism.dispersion,
      },
      {
        movable: prism.movable,
        rotatable: prism.rotatable,
      },
    );
    component.setMoveBounds(prism.moveBounds);
    component.setInventoryState(startsInInventory, inventoryPosition);
    if (!startsInInventory) {
      component.recordValidPosition();
    }
    return component;
  }

  private createTarget(target: TargetConfig) {
    const node = this.createLayerNode(`Target:${target.id}`, this.targetRoot);
    const component = node.addComponent(TargetObject);
    component.setup({
      id: target.id,
      position: new Vec2(target.x, target.y),
      radius: target.radius,
      acceptedColors: target.acceptedColors,
      requiredIntensity: target.requiredIntensity,
      required: target.required,
    });
    return component;
  }

  private createObstacle(obstacle: ObstacleConfig) {
    const node = this.createLayerNode(`Obstacle:${obstacle.id}`, this.obstacleRoot);
    const component = node.addComponent(ObstacleObject);
    component.setup({
      id: obstacle.id,
      position: new Vec2(obstacle.x, obstacle.y),
      width: obstacle.width,
      height: obstacle.height,
    });
    return component;
  }

  private createAmbientBeam(position: Vec3, rotation: number, length: number, glow: Color, core: Color, duration: number) {
    const node = this.createLayerNode('AmbientBeam', this.backgroundNode);
    node.setPosition(position);
    node.setRotationFromEuler(0, 0, rotation);

    const graphics = node.addComponent(Graphics);
    graphics.lineCap = Graphics.LineCap.ROUND;
    graphics.lineJoin = Graphics.LineJoin.ROUND;
    graphics.lineWidth = 22;
    graphics.strokeColor = glow;
    graphics.moveTo(-length * 0.5, 0);
    graphics.lineTo(length * 0.5, 0);
    graphics.stroke();
    graphics.lineWidth = 7;
    graphics.strokeColor = core;
    graphics.moveTo(-length * 0.5, 0);
    graphics.lineTo(length * 0.5, 0);
    graphics.stroke();

    Tween.stopAllByTarget(node);
    tween(node)
      .repeatForever(
        tween(node)
          .to(duration, { position: position.clone().add(new Vec3(18, 8, 0)) })
          .to(duration, { position: position.clone().add(new Vec3(-14, -6, 0)) }),
      )
      .start();
  }

  private computeToolInventoryPositions(toolCount: number) {
    if (toolCount <= 0) {
      return [];
    }
    const spacing = toolCount <= 2 ? 108 : toolCount === 3 ? 94 : 78;
    const centerX = DESIGN_WIDTH * 0.5;
    const startX = centerX - ((toolCount - 1) * spacing) * 0.5;
    const y = 74;
    return new Array(toolCount).fill(0).map((_, index) => new Vec2(startX + spacing * index, y));
  }

  private refreshToolTraySlots(slots: Vec2[]) {
    this.clearLayer(this.toolTraySlotsRoot);
    slots.forEach((slot, index) => {
      const slotNode = this.createLayerNode(`ToolSlot:${index + 1}`, this.toolTraySlotsRoot);
      slotNode.setPosition(this.toLocal(slot));
      (slotNode.getComponent(UITransform) ?? slotNode.addComponent(UITransform)).setContentSize(76, 76);
      const graphics = slotNode.getComponent(Graphics) ?? slotNode.addComponent(Graphics);
      graphics.clear();
      graphics.fillColor = new Color(34, 58, 92, 182);
      graphics.circle(0, 0, 32);
      graphics.fill();
      graphics.strokeColor = new Color(168, 204, 246, 146);
      graphics.lineWidth = 1.5;
      graphics.circle(0, 0, 32);
      graphics.stroke();
    });
  }

  private getRecommendedLevelIndex() {
    if (this.levelManager) {
      return this.levelManager.getRecommendedLevelIndex();
    }
    const firstUncleared = levels.findIndex((level) => !this.gameState.isCleared(String(level.id)));
    return firstUncleared >= 0 ? firstUncleared : levels.length - 1;
  }

  private handleUiClick(action: () => void) {
    try {
      this.audio.play(SoundKeys.Tap);
      action();
    } catch (error) {
      this.reportError('ui-action', error);
    }
  }

  private createDebugButton(name: string, x: number, y: number, text: string, onTap: () => void) {
    const node = this.ensureSceneNode(name, this.diagnosticRoot);
    node.setPosition(x, y, 0);
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(72, 34);
    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = new Color(255, 255, 255, 230);
    graphics.roundRect(-36, -17, 72, 34, 14);
    graphics.fill();
    graphics.strokeColor = new Color(142, 182, 232, 220);
    graphics.lineWidth = 2;
    graphics.roundRect(-36, -17, 72, 34, 14);
    graphics.stroke();

    let labelNode = node.getChildByName('Label');
    if (!labelNode) {
      labelNode = new Node('Label');
      labelNode.parent = node;
      labelNode.layer = node.layer;
      labelNode.addComponent(UITransform).setContentSize(68, 24);
      const label = labelNode.addComponent(Label);
      label.fontSize = 14;
      label.lineHeight = 18;
      label.horizontalAlign = Label.HorizontalAlign.CENTER;
      label.verticalAlign = Label.VerticalAlign.CENTER;
      label.color = new Color(57, 88, 129, 255);
    }
    const label = labelNode.getComponent(Label)!;
    label.string = text;

    node.off(Node.EventType.TOUCH_END);
    node.on(Node.EventType.TOUCH_END, () => {
      try {
        onTap();
      } catch (error) {
        this.reportError(`debug:${text}`, error);
      }
    });
  }

  private createLayerNode(name: string, parent: Node) {
    const node = new Node(name);
    node.parent = parent;
    node.layer = this.node.layer;
    return node;
  }

  private ensureSceneNode(name: string, parent: Node) {
    let node = parent.getChildByName(name);
    if (!node) {
      node = this.createLayerNode(name, parent);
    }
    node.layer = this.node.layer;
    return node;
  }

  private clearLayer(node: Node) {
    [...node.children].forEach((child) => child.destroy());
  }

  private toLocal(point: Vec2) {
    return new Vec3(point.x - DESIGN_WIDTH * 0.5, point.y - DESIGN_HEIGHT * 0.5, 0);
  }
}
