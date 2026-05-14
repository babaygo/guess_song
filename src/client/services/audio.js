import { actions } from '../state/actions.js';

// Service de gestion audio
export class AudioService {
  constructor() {
    this.currentAudio = null;
    this.isPlaying = false;
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isPlaying = false;
      actions.setAudio(null);
    }
  }

  async play(previewUrl) {
    this.stop();

    if (!previewUrl) return;

    try {
      this.currentAudio = new Audio(previewUrl);
      this.currentAudio.volume = 0.7;

      this.currentAudio.addEventListener('ended', () => {
        this.isPlaying = false;
        actions.setAudio(null);
      });

      this.currentAudio.addEventListener('error', (e) => {
        console.error('Erreur audio:', e);
        this.isPlaying = false;
        actions.setAudio(null);
      });

      await this.currentAudio.play();
      this.isPlaying = true;
      actions.setAudio(this.currentAudio);
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      this.isPlaying = false;
    }
  }

  getCurrentAudio() {
    return this.currentAudio;
  }

  isCurrentlyPlaying() {
    return this.isPlaying;
  }
}

export const audioService = new AudioService();