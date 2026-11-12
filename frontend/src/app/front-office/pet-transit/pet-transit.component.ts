import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PetTransitToastContainerComponent } from './components/pet-transit-toast-container/pet-transit-toast-container.component';

@Component({
  selector: 'app-pet-transit',
  standalone: true,
  imports: [RouterOutlet, PetTransitToastContainerComponent],
  templateUrl: './pet-transit.component.html',
  styleUrl: './pet-transit.component.scss'
})
export class PetTransitComponent {}
