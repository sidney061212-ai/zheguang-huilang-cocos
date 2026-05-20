import { SoundKey } from './SoundKeys';

export class AudioManager {
  constructor(private readonly isEnabled: () => boolean) {}

  play(_key: SoundKey) {
    if (!this.isEnabled()) {
      return;
    }
    // MVP: reserve the event hooks so real audio clips can be dropped in without touching gameplay code.
  }
}
