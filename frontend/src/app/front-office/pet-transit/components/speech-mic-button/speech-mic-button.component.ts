import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AzureSpeechService, SpeechState } from '../../services/azure-speech.service';

@Component({
  selector: 'app-speech-mic-button',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './speech-mic-button.component.html',
  styleUrl: './speech-mic-button.component.scss'
})
export class SpeechMicButtonComponent implements OnInit, OnDestroy {
  @Input() targetFieldId: string = '';
  @Output() textRecognized = new EventEmitter<string>();
  @Output() stateChanged = new EventEmitter<SpeechState>();

  state: SpeechState = 'idle';
  isListening = false;

  constructor(
    private readonly speechService: AzureSpeechService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async toggleRecording(): Promise<void> {
    console.log('[MIC] toggleRecording called — current state:', this.state);

    if (this.state === 'processing') {
      console.log('[MIC] Ignored — still processing');
      return;
    }

    if (this.state === 'listening') {
      console.log('[MIC] Stopping recognition...');
      await this.speechService.stopRecognition();
      this.ngZone.run(() => {
        this.state = 'idle';
        this.isListening = false;
        this.stateChanged.emit('idle');
        this.cdr.detectChanges();
      });
      console.log('[MIC] Stopped. State → idle');
      return;
    }

    // idle or error → start
    console.log('[MIC] Starting recognition...');
    this.ngZone.run(() => {
      this.state = 'processing';
      this.stateChanged.emit('processing');
      this.cdr.detectChanges();
    });

    try {
      await this.speechService.startRecognition(
        (text: string) => {
          console.log('[MIC] Text received:', text);
          // Emit inside zone so parent detects change
          this.ngZone.run(() => {
            this.textRecognized.emit(text);
          });
        },
        (state: SpeechState) => {
          console.log('[MIC] State changed →', state);
          this.ngZone.run(() => {
            this.state = state;
            this.stateChanged.emit(state);
            this.cdr.detectChanges();
          });
        }
      );
    } catch (err) {
      console.error('[MIC] startRecognition error:', err);
      this.ngZone.run(() => {
        this.state = 'error';
        this.stateChanged.emit('error');
        this.cdr.detectChanges();
      });
    }
  }

  ngOnInit(): void {
    console.log('[MIC COMPONENT] Initialized — targetFieldId:', this.targetFieldId);
  }

  getLabel(): string {
    switch (this.state) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Starting...';
      case 'error':
        return 'Try again';
      case 'idle':
      default:
        return 'Voice input';
    }
  }

  getTooltip(): string {
    switch (this.state) {
      case 'idle':
        return 'Click to start voice input'
          + ' (Chrome or Edge required)';
      case 'listening':
        return 'Click to stop recording';
      case 'processing':
        return 'Starting microphone...';
      case 'error':
        return 'Microphone not available.'
          + ' Please use Chrome or Edge.';
      default:
        return '';
    }
  }

  ngOnDestroy(): void {
    void this.speechService.stopRecognition();
  }
}
