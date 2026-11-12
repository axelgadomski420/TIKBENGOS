import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-readiness-score',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './readiness-score.component.html',
  styleUrl: './readiness-score.component.scss'
})
export class ReadinessScoreComponent {
  @Input() score = 0;
  @Input() compact = false;

  get normalizedScore(): number {
    const value = Number(this.score ?? 0);
    if (Number.isNaN(value)) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }

  get scoreLabel(): string {
    if (this.normalizedScore >= 85) {
      return 'Excellent';
    }

    if (this.normalizedScore >= 65) {
      return 'Strong';
    }

    if (this.normalizedScore >= 40) {
      return 'Improving';
    }

    return 'Needs Work';
  }

  get toneClass(): string {
    if (this.normalizedScore >= 85) {
      return 'tone-excellent';
    }

    if (this.normalizedScore >= 65) {
      return 'tone-strong';
    }

    if (this.normalizedScore >= 40) {
      return 'tone-improving';
    }

    return 'tone-critical';
  }
}
