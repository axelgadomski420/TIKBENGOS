import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagination-wrapper" [class.pagination-wrapper-admin]="variant === 'admin'">
      <span class="pagination-info" *ngIf="variant !== 'admin'">
        Showing {{ startItem }}-{{ endItem }} of {{ totalItems }} results
      </span>
      <span class="pagination-info" *ngIf="variant === 'admin'">
        Page {{ safeCurrentPage }} of {{ safeTotalPages }} - {{ totalItems }} total records
      </span>
      <div class="pagination-controls">
        <button class="page-btn nav-btn"
                [disabled]="safeCurrentPage <= 1 || safeTotalPages <= 1"
                (click)="changePage(safeCurrentPage - 1)">
          <- Prev
        </button>
        <ng-container *ngFor="let p of visiblePages">
          <span *ngIf="p === '...'" class="ellipsis">...</span>
          <button *ngIf="p !== '...'"
                  class="page-btn"
                  [class.active]="p === safeCurrentPage"
                  (click)="changePage(+p)">
            {{ p }}
          </button>
        </ng-container>
        <button class="page-btn nav-btn"
                [disabled]="safeCurrentPage >= safeTotalPages || safeTotalPages <= 1"
                (click)="changePage(safeCurrentPage + 1)">
          Next ->
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pagination-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-top: 24px;
      padding: 16px 0;
    }
    .pagination-info {
      font-size: 13px;
      color: #888;
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .page-btn {
      min-width: 38px;
      height: 38px;
      padding: 0 12px;
      border: 1.5px solid #3DBDA7;
      background: #fff;
      color: #3DBDA7;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .page-btn:hover:not(:disabled):not(.active) {
      background: #e8f8f5;
    }
    .page-btn.active {
      background: #3DBDA7;
      color: #fff;
      border-color: #3DBDA7;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .nav-btn {
      font-size: 13px;
      padding: 0 14px;
    }
    .ellipsis {
      color: #aaa;
      padding: 0 4px;
      font-size: 16px;
    }
    .pagination-wrapper-admin {
      align-items: flex-end;
      gap: 8px;
      margin-top: 16px;
      padding: 12px 0;
    }
  `]
})
export class PaginationComponent implements OnChanges {
  @Input() totalItems = 0;
  @Input() itemsPerPage = 9;
  @Input() currentPage = 1;
  @Input() variant: 'default' | 'admin' = 'default';
  @Output() pageChange = new EventEmitter<number>();

  get totalPages() {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get safeTotalPages(): number {
    return Math.max(1, this.totalPages);
  }

  get safeCurrentPage(): number {
    return Math.min(Math.max(1, this.currentPage), this.safeTotalPages);
  }

  get startItem() {
    return this.totalItems === 0 ? 0 : Math.min((this.safeCurrentPage - 1) * this.itemsPerPage + 1, this.totalItems);
  }

  get endItem() {
    return Math.min(this.safeCurrentPage * this.itemsPerPage, this.totalItems);
  }

  get visiblePages(): (number | string)[] {
    const total = this.safeTotalPages;
    const cur = this.safeCurrentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];
    if (cur > 3) {
      pages.push('...');
    }

    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i += 1) {
      pages.push(i);
    }

    if (cur < total - 2) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  }

  changePage(p: number): void {
    if (p >= 1 && p <= this.safeTotalPages && p !== this.safeCurrentPage) {
      this.pageChange.emit(p);
    }
  }

  ngOnChanges(): void {
    // reset handled by parent
  }
}
