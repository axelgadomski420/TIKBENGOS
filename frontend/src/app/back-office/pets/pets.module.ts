import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { PetsComponent } from './pets.component';
import { PetsRoutingModule } from './pets-routing.module';

@NgModule({
  declarations: [PetsComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PetsRoutingModule
  ]
})
export class PetsModule {}
