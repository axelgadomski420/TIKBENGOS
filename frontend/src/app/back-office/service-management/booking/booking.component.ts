import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookingService, ServiceBooking } from '../../services/booking.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {

  serviceId!: number;

  private bookingsSubject = new BehaviorSubject<ServiceBooking[]>([]);
  bookings$ = this.bookingsSubject.asObservable();

  loading = false;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.serviceId = Number(this.route.snapshot.paramMap.get('serviceId'));
    if (this.serviceId) {
      this.loadBookings();
    }
  }

  // 🔹 Charger les bookings + récupérer les users
  loadBookings(): void {
    this.loading = true;

    this.bookingService.findByServiceId(this.serviceId).subscribe({
      next: (bookings) => {

        // Pour chaque booking → récupérer le user
        bookings.forEach(booking => {
          this.bookingService.getUserById(booking.user_id).subscribe({
            next: (user) => {
              booking.user = user; // on ajoute le user dans l'objet booking
              this.updateView();
            },
            error: () => {
              booking.user = { name: 'Inconnu' };
              this.updateView();
            }
          });
        });

        this.bookingsSubject.next(bookings);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement bookings:', err);
        this.bookingsSubject.next([]);
        this.loading = false;
      }
    });
  }

  // 🔹 Force Angular à rafraîchir la vue après ajout du user
  updateView() {
    this.bookingsSubject.next([...this.bookingsSubject.value]);
  }

  // 🔹 Accepter / Refuser
  updateBookingStatus(
    booking: ServiceBooking,
    newStatus: 'ACCEPTED' | 'REJECTED'
  ) {
    if (!booking.id) return;

    this.bookingService
      .approveBooking(booking.id, newStatus === 'ACCEPTED')
      .subscribe({
        next: (updatedBooking) => {
          const updatedList = this.bookingsSubject.value.map(b =>
            b.id === updatedBooking.id ? updatedBooking : b
          );
          this.bookingsSubject.next(updatedList);
        },
        error: (err) =>
          console.error('Erreur mise à jour status:', err)
      });
  }

  // 🔹 Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}