import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ServiceManagementComponent } from './service-management.component';
import { ServiceManagementRoutingModule } from './service-management-routing.module';
import { ServiceListComponent } from './service-list/service-list.component';
import { ServiceFormComponent } from './service-form/service-form.component';
import { ServiceCategoryPickerComponent } from './service-category-picker/service-category-picker.component';
import { SharedModule } from '../../shared/shared.module';
import { BookingComponent } from './booking/booking.component';
import { ProviderRequestComponent } from './provider-request/provider-request.component';
import { ProviderRequestAdminComponent } from './provider-request/provider-request-admin.component';
import { ProviderDashboardComponent } from './provider-dashboard/provider-dashboard.component';

@NgModule({
  declarations: [
    ServiceManagementComponent,
    ServiceListComponent,
    ServiceFormComponent,
    ServiceCategoryPickerComponent,
    BookingComponent,
    ProviderRequestComponent,
    ProviderRequestAdminComponent,
    ProviderDashboardComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ServiceManagementRoutingModule,
    SharedModule
  ]
})
export class ServiceManagementModule {}
