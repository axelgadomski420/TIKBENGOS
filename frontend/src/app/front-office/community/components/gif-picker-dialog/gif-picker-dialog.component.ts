import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GifResult, GifService } from '../../services/gif.service';

export interface GifPickerDialogData {
  initialQuery?: string;
  title?: string;
}

@Component({
  selector: 'app-gif-picker-dialog',
  templateUrl: './gif-picker-dialog.component.html',
  styleUrl: './gif-picker-dialog.component.css'
})
export class GifPickerDialogComponent implements OnInit {
  private static readonly RECENT_QUERIES_KEY = 'community-gif-recent-queries';

  readonly quickTopics = ['celebration', 'laughing', 'thanks', 'wow', 'applause', 'good job'];
  query = 'funny';
  loading = false;
  error = '';
  results: GifResult[] = [];
  recentQueries: string[] = [];
  activeTopic = '';

  constructor(
    private gifService: GifService,
    private dialogRef: MatDialogRef<GifPickerDialogComponent, GifResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: GifPickerDialogData
  ) {}

  ngOnInit(): void {
    this.recentQueries = this.readRecentQueries();
    this.query = this.data.initialQuery?.trim() || this.query;
    this.search();
  }

  search(): void {
    const trimmed = this.query.trim();
    if (!trimmed) {
      this.error = 'Enter a search term.';
      this.results = [];
      return;
    }

    this.loading = true;
    this.error = '';
    this.activeTopic = trimmed;
    this.gifService.search(trimmed).subscribe({
      next: (results) => {
        this.results = results;
        this.loading = false;
        this.saveRecentQuery(trimmed);
      },
      error: () => {
        this.error = 'Unable to load GIFs.';
        this.loading = false;
      }
    });
  }

  selectGif(gif: GifResult): void {
    this.dialogRef.close(gif);
  }

  close(): void {
    this.dialogRef.close(null);
  }

  runTopic(topic: string): void {
    this.query = topic;
    this.search();
  }

  clearRecentQueries(): void {
    this.recentQueries = [];
    localStorage.removeItem(GifPickerDialogComponent.RECENT_QUERIES_KEY);
  }

  private readRecentQueries(): string[] {
    try {
      const raw = localStorage.getItem(GifPickerDialogComponent.RECENT_QUERIES_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6) : [];
    } catch {
      return [];
    }
  }

  private saveRecentQuery(query: string): void {
    const next = [query, ...this.recentQueries.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 6);
    this.recentQueries = next;

    try {
      localStorage.setItem(GifPickerDialogComponent.RECENT_QUERIES_KEY, JSON.stringify(next));
    } catch {
      // Keep GIF search usable even if local storage is unavailable.
    }
  }
}
