// src/app/front-office/events/pages/calendar/calendar.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventService } from '../../services/event.service';
import { EventSummary } from '../../models/event.models';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: EventSummary[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, OnDestroy {
  
  currentDate = new Date();
  currentYear = this.currentDate.getFullYear();
  currentMonth = this.currentDate.getMonth(); // 0-11
  
  calendarDays: CalendarDay[] = [];
  eventsByDate: Map<string, EventSummary[]> = new Map();
  
  loading = false;
  selectedDate: Date | null = null;
  selectedEvents: EventSummary[] = [];
  
  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  private destroy$ = new Subject<void>();

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.loadCalendar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCalendar(): void {
    this.loading = true;
    // Month is 1-12 for API
    this.eventService.getCalendar(this.currentYear, this.currentMonth + 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Response format: { "2025-04-12": [...events], ... }
          this.eventsByDate.clear();
          Object.entries(response).forEach(([dateStr, events]) => {
            this.eventsByDate.set(dateStr, events);
          });
          this.generateCalendarDays();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading calendar:', err);
          this.loading = false;
        }
      });
  }

  generateCalendarDays(): void {
    this.calendarDays = [];
    
    // First day of the month
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    // Day of week (0 = Sunday, we want Monday = 0)
    let startDayOfWeek = firstDayOfMonth.getDay();
    // Adjust to Monday as first day (Sunday = 6, Monday = 0)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    // Last day of previous month
    const lastDayOfPrevMonth = new Date(this.currentYear, this.currentMonth, 0);
    const prevMonthDays = lastDayOfPrevMonth.getDate();
    
    // Last day of current month
    const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Generate previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(this.currentYear, this.currentMonth - 1, prevMonthDays - i);
      this.calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    // Generate current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      this.calendarDays.push({
        date,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    // Generate next month days (to complete 6 rows = 42 days)
    const remainingDays = 42 - this.calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, i);
      this.calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
  }

  getEventsForDate(date: Date): EventSummary[] {
    const dateStr = this.formatDateKey(date);
    return this.eventsByDate.get(dateStr) || [];
  }

  formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  hasEvents(date: Date): boolean {
    return this.getEventsForDate(date).length > 0;
  }

  onDateClick(day: CalendarDay): void {
    if (day.events.length > 0) {
      this.selectedDate = day.date;
      this.selectedEvents = day.events;
    } else {
      this.selectedDate = null;
      this.selectedEvents = [];
    }
  }

  closeModal(): void {
    this.selectedDate = null;
    this.selectedEvents = [];
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.loadCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.loadCalendar();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth();
    this.loadCalendar();
  }

  formatMonthYear(): string {
    return `${this.months[this.currentMonth]} ${this.currentYear}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PLANNED': 'status-planned',
      'ONGOING': 'status-ongoing',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled',
      'FULL': 'status-full'
    };
    return classes[status] || 'status-planned';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'PLANNED': 'Upcoming',
      'ONGOING': 'In Progress',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'FULL': 'Full'
    };
    return texts[status] || status;
  }
}
