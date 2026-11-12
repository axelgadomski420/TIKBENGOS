import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { EventsRoutingModule } from './events-routing.module';
import { EventsComponent } from './events.component';
import { EventsListComponent } from './pages/events-list/events-list.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { RecommendationsComponent } from './pages/recommendations/recommendations.component';
import { EventDetailComponent } from './pages/detail/event-detail.component';

@NgModule({
  declarations: [EventsComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    EventsRoutingModule,
    EventsListComponent,
    CalendarComponent,
    RecommendationsComponent,
    EventDetailComponent,
  ],
})
export class EventsModule {}
