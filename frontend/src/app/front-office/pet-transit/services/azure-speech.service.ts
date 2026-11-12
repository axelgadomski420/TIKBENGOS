import { Injectable } from '@angular/core';

export type SpeechState =
  'idle' | 'listening' | 'processing' | 'error';

@Injectable({ providedIn: 'root' })
export class AzureSpeechService {

  private recognition: any = null;

  async startRecognition(
    onResult: (text: string) => void,
    onStateChange: (state: SpeechState) => void,
    lang: string = 'fr-FR'
  ): Promise<void> {

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onStateChange('error');
      console.error(
        '[SPEECH] Web Speech API not supported.'
        + ' Use Chrome or Edge.');
      return;
    }

    try {
      onStateChange('processing');

      this.recognition = new SpeechRecognition();
      this.recognition.lang = lang;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      let accumulated = '';

      this.recognition.onstart = () => {
        onStateChange('listening');
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex;
             i < event.results.length; i++) {
          const transcript =
            event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulated += transcript + ' ';
          } else {
            interim = transcript;
          }
        }
        onResult((accumulated + interim).trim());
      };

      this.recognition.onerror = (event: any) => {
        console.error('[SPEECH] Error:', event.error);
        onStateChange('error');
        this.recognition = null;
      };

      this.recognition.onend = () => {
        if (this.recognition) {
          onStateChange('idle');
          this.recognition = null;
        }
      };

      this.recognition.start();

    } catch (err) {
      onStateChange('error');
      console.error('[SPEECH] Init error:', err);
    }
  }

  async stopRecognition(): Promise<void> {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
  }
}
