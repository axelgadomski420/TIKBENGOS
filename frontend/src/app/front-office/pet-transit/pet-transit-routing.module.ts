import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PET_TRANSIT_ROUTES } from './pet-transit.routes';

@NgModule({
  imports: [RouterModule.forChild(PET_TRANSIT_ROUTES)],
  exports: [RouterModule]
})
export class PetTransitRoutingModule {}
