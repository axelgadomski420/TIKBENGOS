import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pet-friendly-stars',
  templateUrl: './pet-friendly-stars.component.html',
  styleUrl: './pet-friendly-stars.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class PetFriendlyStarsComponent {
  @Input({ required: true }) level!: number;
  @Input() compact = false;

  readonly stars = [1, 2, 3, 4, 5];

  isFilled(star: number): boolean {
    return star <= this.level;
  }
}

