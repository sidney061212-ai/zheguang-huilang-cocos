import { sys } from 'cc';

interface PersistedState {
  cleared: string[];
  sfxEnabled: boolean;
  vibrationEnabled: boolean;
}

const STORAGE_KEY = 'zheguang-huilang-cocos.save';

export class GameState {
  private cleared = new Set<string>();
  public sfxEnabled = true;
  public vibrationEnabled = true;

  constructor() {
    this.load();
  }

  isCleared(levelId: string) {
    return this.cleared.has(levelId);
  }

  getClearedIds() {
    return new Set(this.cleared);
  }

  markCleared(levelId: string) {
    if (!this.cleared.has(levelId)) {
      this.cleared.add(levelId);
      this.save();
    }
  }

  setSfxEnabled(value: boolean) {
    this.sfxEnabled = value;
    this.save();
  }

  setVibrationEnabled(value: boolean) {
    this.vibrationEnabled = value;
    this.save();
  }

  private load() {
    try {
      const raw = sys.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as PersistedState;
      this.cleared = new Set(parsed.cleared ?? []);
      this.sfxEnabled = parsed.sfxEnabled ?? true;
      this.vibrationEnabled = parsed.vibrationEnabled ?? true;
    } catch (error) {
      console.warn('[GameState] load failed', error);
    }
  }

  private save() {
    const payload: PersistedState = {
      cleared: [...this.cleared],
      sfxEnabled: this.sfxEnabled,
      vibrationEnabled: this.vibrationEnabled,
    };
    try {
      sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('[GameState] save failed', error);
    }
  }
}
