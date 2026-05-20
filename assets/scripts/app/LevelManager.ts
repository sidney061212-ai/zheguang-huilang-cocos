import { GameState } from '../core/GameState';
import { LevelConfig } from '../core/LevelConfig';

export interface LevelManagerInit {
  levels: LevelConfig[];
  gameState: GameState;
  initialLevelIndex?: number;
}

export class LevelManager {
  private readonly levels: LevelConfig[];
  private readonly gameState: GameState;
  private currentLevelIndex = 0;

  constructor(init: LevelManagerInit) {
    this.levels = init.levels;
    this.gameState = init.gameState;
    this.currentLevelIndex = this.clampIndex(init.initialLevelIndex ?? 0);
  }

  getLevels() {
    return this.levels;
  }

  getLevelCount() {
    return this.levels.length;
  }

  getCurrentLevelIndex() {
    return this.currentLevelIndex;
  }

  getCurrentLevel() {
    return this.levels[this.currentLevelIndex] ?? null;
  }

  getLevelByIndex(index: number) {
    const safeIndex = this.clampIndex(index);
    return this.levels[safeIndex] ?? null;
  }

  loadLevel(index: number) {
    this.currentLevelIndex = this.clampIndex(index);
    return this.getCurrentLevel();
  }

  resetCurrentLevel() {
    return this.getCurrentLevel();
  }

  hasNextLevel() {
    return this.currentLevelIndex < this.levels.length - 1;
  }

  loadNextLevel() {
    if (!this.hasNextLevel()) {
      return null;
    }
    this.currentLevelIndex += 1;
    return this.getCurrentLevel();
  }

  markCurrentLevelCleared() {
    const level = this.getCurrentLevel();
    if (!level) {
      return;
    }
    this.gameState.markCleared(String(level.id));
  }

  isLevelCleared(levelId: string) {
    return this.gameState.isCleared(levelId);
  }

  getRecommendedLevelIndex() {
    const firstUncleared = this.levels.findIndex((level) => !this.gameState.isCleared(String(level.id)));
    return firstUncleared >= 0 ? firstUncleared : Math.max(0, this.levels.length - 1);
  }

  private clampIndex(index: number) {
    if (this.levels.length <= 0) {
      return 0;
    }
    if (index < 0) {
      return 0;
    }
    if (index > this.levels.length - 1) {
      return this.levels.length - 1;
    }
    return index;
  }
}
