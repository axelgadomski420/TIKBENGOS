import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServicesComponent } from './services.component';
import { FormBookingComponent } from './model/form-booking/form-booking.component';

const routes: Routes = [
  { path: '', component: ServicesComponent },
  { path: 'booking/:serviceId', component: FormBookingComponent } // ← nouvelle route pour le booking
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ServicesRoutingModule { }