import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServiceManagementComponent } from './service-management.component';
import { ServiceListComponent } from './service-list/service-list.component';
import { ServiceFormComponent } from './service-form/service-form.component';
import { ServiceCategoryPickerComponent } from './service-category-picker/service-category-picker.component';
import { BookingComponent } from './booking/booking.component';
import { ProviderRequestComponent } from './provider-request/provider-request.component';
import { ProviderRequestAdminComponent } from './provider-request/provider-request-admin.component';
import { ProviderDashboardComponent } from './provider-dashboard/provider-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: ServiceManagementComponent,
    children: [
      { path: '', component: ServiceListComponent },
      { path: 'pick-category', component: ServiceCategoryPickerComponent },
      { path: 'new', component: ServiceFormComponent },
      { path: ':id/edit', component: ServiceFormComponent },
      { path: 'service-bookings/:serviceId', component: BookingComponent },
      { path: 'provider-request', component: ProviderRequestComponent },
      { path: 'provider-request-admin', component: ProviderRequestAdminComponent },
      { path: 'provider-dashboard', component: ProviderDashboardComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ServiceManagementRoutingModule {}
