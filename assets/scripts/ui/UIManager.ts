import { ClearPopup, ClearPopupPayload } from './ClearPopup';
import { GameHUD, HUDDebugMetrics } from './GameHUD';

export interface UIManagerInit {
  hud: GameHUD;
  clearPopup: ClearPopup;
}

export interface HUDSnapshot {
  levelTitle: string;
  levelHint: string;
  hitCount: number;
  totalCount: number;
  energyPercent: number;
  selectionText: string;
  selectionAngle: number | null;
  hintText: string;
}

export class UIManager {
  private readonly hud: GameHUD;
  private readonly clearPopup: ClearPopup;

  constructor(init: UIManagerInit) {
    this.hud = init.hud;
    this.clearPopup = init.clearPopup;
  }

  showGameplayUI() {
    this.hud.setVisible(true);
    this.clearPopup.hide();
  }

  showLevelHUD(snapshot: HUDSnapshot) {
    this.hud.setVisible(true);
    this.hud.setLevelTitle(snapshot.levelTitle);
    this.hud.setLevelHint(snapshot.levelHint);
    this.hud.setTargetSummary(snapshot.hitCount, snapshot.totalCount, snapshot.energyPercent);
    this.hud.setSelectionInfo(snapshot.selectionText);
    this.hud.setSelectionAngle(snapshot.selectionAngle);
    this.hud.setHint(snapshot.hintText);
  }

  updateTargetSummary(hitCount: number, totalCount: number, energyPercent: number) {
    this.hud.setTargetSummary(hitCount, totalCount, energyPercent);
  }

  updateSelection(selectionText: string, selectionAngle: number | null) {
    this.hud.setSelectionInfo(selectionText);
    this.hud.setSelectionAngle(selectionAngle);
  }

  updateHint(hintText: string) {
    this.hud.setHint(hintText);
  }

  updateDebugMetrics(metrics: Partial<HUDDebugMetrics>) {
    this.hud.setDebugMetrics(metrics);
  }

  showFailureReason(reason: string, durationMs = 1500) {
    this.hud.showFailureReason(reason, durationMs);
  }

  clearFailureReason() {
    this.hud.clearFailureReason();
  }

  showLevelClearPopup(payload: ClearPopupPayload) {
    this.hud.setVisible(true);
    this.clearPopup.show(payload);
  }

  hideLevelClearPopup() {
    this.clearPopup.hide();
  }

  hideAllGameUI() {
    this.hud.setVisible(false);
    this.clearPopup.hide();
  }
}
