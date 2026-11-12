import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  DESTINATION_TYPE_CONFIG,
  DestinationType
} from '../../models/travel-destination.model';

type CategoryItem = {
  label: string;
  icon: string;
  type: DestinationType | null;
  color: string;
  bgColor: string;
};

@Component({
  selector: 'app-category-carousel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './category-carousel.component.html',
  styleUrl: './category-carousel.component.scss'
})
export class CategoryCarouselComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() selectedType: DestinationType | null = null;
  @Output() typeSelected = new EventEmitter<DestinationType | null>();

  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  // ── Premium icon overrides ────────────────────────────────────────────────
  readonly categories: CategoryItem[] = [
    {
      label: 'All Destinations',
      icon: 'pets',
      type: null,
      color: 'var(--color-primary)',
      bgColor: '#f0fdf4'
    },
    ...Object.entries(DESTINATION_TYPE_CONFIG).map(([key, value]) => {
      const iconOverrides: Partial<Record<DestinationType, string>> = {
        MOUNTAIN: 'landscape',
        INTERNATIONAL: 'flight_takeoff'
      };
      const type = key as DestinationType;
      return {
        label: value.label,
        icon: iconOverrides[type] ?? value.icon,
        type,
        color: value.color,
        bgColor: value.bgColor
      };
    })
  ];

  /**
   * Tracks the current visual scroll position (which card the carousel
   * is scrolled to). This is INDEPENDENT from selectedType — auto-play
   * and arrow buttons only change this, never the filter.
   */
  private scrollIndex = 0;

  private autoPlayTimer: number | null = null;
  private resumeTimer: number | null = null;
  private hoverPaused = false;
  private manualPauseUntil = 0;

  ngOnInit(): void {
    this.syncScrollIndexWithSelectedType();
  }

  ngAfterViewInit(): void {
    this.startAutoPlay();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedType']) {
      this.syncScrollIndexWithSelectedType();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    this.clearResumeTimer();
  }

  // ── Mouse hover: pause / resume ──────────────────────────────────────────
  onMouseEnter(): void {
    this.hoverPaused = true;
    this.stopAutoPlay();
  }

  onMouseLeave(): void {
    this.hoverPaused = false;

    if (Date.now() >= this.manualPauseUntil) {
      this.startAutoPlay();
      return;
    }

    this.scheduleResume();
  }

  // ── Card click: ONLY action that changes the destination filter ───────────
  onCategoryClick(category: CategoryItem, index: number): void {
    this.scrollIndex = index;
    this.typeSelected.emit(category.type); // ← filter change happens HERE only
    this.scrollToIndex(index);
    this.pauseForManualInteraction();
  }

  // ── Arrow buttons: visual scroll only, no filter change ──────────────────
  scrollBackward(): void {
    this.scrollIndex =
      this.scrollIndex === 0 ? this.categories.length - 1 : this.scrollIndex - 1;
    this.scrollToIndex(this.scrollIndex);
    this.pauseForManualInteraction();
  }

  scrollForward(): void {
    this.scrollIndex =
      this.scrollIndex === this.categories.length - 1 ? 0 : this.scrollIndex + 1;
    this.scrollToIndex(this.scrollIndex);
    this.pauseForManualInteraction();
  }

  // ── Active class: driven ONLY by selectedType (user click) ───────────────
  isActive(category: CategoryItem): boolean {
    return this.selectedType === category.type;
  }

  trackByCategory(index: number, category: CategoryItem): string {
    return `${category.label}-${index}`;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Sync the visual scroll position with the externally set selectedType.
   * Called on init and when @Input selectedType changes.
   */
  private syncScrollIndexWithSelectedType(): void {
    const idx = this.categories.findIndex((c) => c.type === this.selectedType);
    this.scrollIndex = idx >= 0 ? idx : 0;
  }

  /**
   * Pause auto-play briefly after any manual interaction (arrow or click).
   * Auto-play resumes 4 seconds after the last interaction.
   */
  private pauseForManualInteraction(): void {
    this.manualPauseUntil = Date.now() + 4000;
    this.stopAutoPlay();

    if (!this.hoverPaused) {
      this.scheduleResume();
    }
  }

  /**
   * Auto-play: advances scrollIndex and scrolls the DOM track.
   * Does NOT emit typeSelected → filter is NEVER changed by auto-play.
   */
  private startAutoPlay(): void {
    if (this.autoPlayTimer !== null) {
      return;
    }

    this.autoPlayTimer = window.setInterval(() => {
      if (this.hoverPaused || Date.now() < this.manualPauseUntil) {
        return;
      }

      this.scrollIndex =
        this.scrollIndex >= this.categories.length - 1 ? 0 : this.scrollIndex + 1;

      this.scrollToIndex(this.scrollIndex); // visual scroll only
    }, 2500);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer === null) {
      return;
    }
    window.clearInterval(this.autoPlayTimer);
    this.autoPlayTimer = null;
  }

  private scheduleResume(): void {
    this.clearResumeTimer();
    const delay = Math.max(this.manualPauseUntil - Date.now(), 0);

    this.resumeTimer = window.setTimeout(() => {
      if (!this.hoverPaused) {
        this.startAutoPlay();
      }
    }, delay);
  }

  private clearResumeTimer(): void {
    if (this.resumeTimer === null) {
      return;
    }
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
  }

  /**
   * Scrolls the carousel track so the card at `index` is visible.
   * Uses the card's actual DOM offsetLeft instead of hardcoded pixel math,
   * so it works regardless of font size, gap, or padding values.
   */
  private scrollToIndex(index: number): void {
    const track = this.carouselTrack?.nativeElement;
    if (!track) {
      return;
    }

    // Get the actual rendered card elements (direct children of the track)
    const cards = Array.from(track.children) as HTMLElement[];
    const targetCard = cards[index];
    if (!targetCard) {
      return;
    }

    // offsetLeft is relative to the offsetParent.
    // Since the track is position:relative (via overflow), cards report
    // their left edge relative to the track's content area.
    const scrollTarget = targetCard.offsetLeft - track.offsetLeft;

    track.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
  }
}
