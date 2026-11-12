import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CalendarComponent } from './pages/calendar/calendar.component';
import { EventDetailComponent } from './pages/detail/event-detail.component';
import { EventsListComponent } from './pages/events-list/events-list.component';
import { RecommendationsComponent } from './pages/recommendations/recommendations.component';

const routes: Routes = [
  {
    path: '',
    component: EventsListComponent,
  },
  {
    path: 'calendar',
    component: CalendarComponent,
  },
  {
    path: 'recommendations',
    component: RecommendationsComponent,
  },
  {
    path: ':id/waitlist/confirm',
    component: EventDetailComponent,
  },
  {
    path: ':id',
    component: EventDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventsRoutingModule {}
