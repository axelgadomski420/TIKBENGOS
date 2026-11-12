import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { RequestService } from '../../services/request.service';
import { ShelterService } from '../../services/shelter.service';
import { ContractService } from '../../services/contract.service';
import { AppointmentService } from '../../services/appointment.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';

@Component({
  selector: 'app-shelter-requests',
  templateUrl: './shelter-requests.component.html',
  styleUrls: ['./shelter-requests.component.css']
})
export class ShelterRequestsComponent implements OnInit {

  // â”€â”€ DonnÃ©es â”€â”€
  requests: any[]         = [];
  filteredRequests: any[] = [];
  scoredRequests: any[]   = [];
  appointments: any[]     = [];

  loading = true;
  error: string | null = null;
  shelterId: number | null = null;
  petId: number | null = null;
  selectedPetName = '';

  // â”€â”€ Reject modal â”€â”€
  rejectionReason: string | null = null;
  selectedRequestId: number | null = null;

  // â”€â”€ Schedule modal (calendrier) â”€â”€
  showScheduleModal  = false;
  schedulingRequest: any = null;
  shelterNotes       = '';
  scheduling         = false;

  // â”€â”€ Calendrier â”€â”€
  calendarYear  = 0;
  calendarMonth = 0;   // 0-based (JS)
  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;
  selectedHour  = '';
  selectedMinute = '00';
  bookedSlots: string[] = [];   // heures dÃ©jÃ  prises le jour sÃ©lectionnÃ© ("09:00", etc.)
  appointmentTime = '';         // heure finale "HH:MM"

  readonly HOURS = [
    '08:00','08:30','09:00','09:30','10:00','10:30',
    '11:00','11:30','12:00','13:00','13:30',
    '14:00','14:30','15:00','15:30','16:00','16:30','17:00'
  ];

  readonly MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // â”€â”€ Respond modal â”€â”€
  showRespondModal    = false;
  respondingAppointment: any = null;
  consultationResult  = '';
  responseMessage     = '';
  responding          = false;

  // â”€â”€ Vue active â”€â”€
  activeTab: 'requests' | 'appointments' = 'requests';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private requestService: RequestService,
    private shelterService: ShelterService,
    private contractService: ContractService,
    public appointmentService: AppointmentService,
    private router: Router,
    private notificationService: NotificationService,
    private confirmDialogService: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.petId = params['petId'] ? +params['petId'] : null;
    });

    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'SHELTER') {
      this.router.navigate(['/']);
      return;
    }

    this.shelterService.getShelterByUserId(user.id).subscribe({
      next: (shelter) => {
        this.shelterId = shelter.id ?? null;
        this.loadRequests();
        this.loadAppointments();
      },
      error: () => {
        this.error = 'Shelter not found';
        this.loading = false;
      }
    });
  }

  goBackToPets(): void {
    this.router.navigate(['/app/adoption/shelter/pets']);
  }

  // ============================================================
  // CHARGEMENT DES DONNÃ‰ES
  // ============================================================

  loadRequests(): void {
    if (!this.shelterId) return;
    this.loading = true;

    this.requestService.getByShelter(this.shelterId).subscribe({
      next: (data) => {
        this.requests = data;

        if (this.petId) {
          this.filteredRequests = data.filter(req =>
            req.petId === this.petId &&
            req.status !== 'CANCELLED' &&
            req.status !== 'REJECTED'
          );
          this.selectedPetName = this.filteredRequests[0]?.petName || `Pet #${this.petId}`;
          this.loadScoredRequests(this.petId);
        } else {
          this.filteredRequests = data;
          this.loadAllScoredRequests();
        }

        this.loading = false;
      },
      error: () => {
        this.error = 'Error loading requests';
        this.loading = false;
      }
    });
  }

  loadScoredRequests(petId: number): void {
    this.appointmentService.getScoredRequestsForPet(petId).subscribe({
      next: (data) => { this.scoredRequests = data; },
      error: (err) => console.error('Error loading scores', err)
    });
  }

  loadAllScoredRequests(): void {
    if (!this.shelterId) return;
    this.appointmentService.getScoredRequestsForShelter(this.shelterId).subscribe({
      next: (data) => { this.scoredRequests = data; },
      error: (err) => console.error('Error loading scores', err)
    });
  }

  loadAppointments(): void {
    if (!this.shelterId) return;
    this.appointmentService.getAppointmentsByShelter(this.shelterId).subscribe({
      next: (data) => {
        this.appointments = data;
        if (this.showScheduleModal) {
          this.buildCalendar();
        }
      },
      error: (err) => console.error('Error loading appointments', err)
    });
  }

  // ============================================================
  // APPROVE / REJECT
  // ============================================================

  async approveRequest(requestId: number): Promise<void> {
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      'Approve this adoption request?',
      {
        title: 'Approve adoption request',
        confirmText: 'Approve',
        cancelText: 'Cancel',
        tone: 'neutral'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.requestService.approve(requestId).subscribe({
      next: (approvedRequest) => {
        this.createContract(approvedRequest);
      },
      error: (err) => {
        console.error('Error approving request', err);
        this.notificationService.showError('Error', 'Error approving request');
      }
    });
  }

  createContract(request: any): void {
    if (!this.shelterId) { 
      this.notificationService.showError('Error', 'Shelter ID not found');
      return; 
    }

    const contractData = {
      shelterId: this.shelterId,
      adoptantId: request.adopterId,
      animalId: request.petId,
      conditionsSpecifiques: `Adoption approved on ${new Date().toLocaleDateString()}`
    };

    this.contractService.create(contractData).subscribe({
      next: () => {
        this.notificationService.showSuccess('âœ… Adoption Approved', 'Contract generated successfully.');
        this.loadRequests();
        this.loadAppointments();
      },
      error: () => {
        this.notificationService.showError('âš ï¸ Warning', 'Adoption approved but contract generation failed.');
        this.loadRequests();
      }
    });
  }

  showRejectModal(id: number): void {
    this.selectedRequestId = id;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.selectedRequestId) return;
    this.requestService.reject(this.selectedRequestId, this.rejectionReason || 'No reason provided').subscribe({
      next: () => {
        this.loadRequests();
        this.selectedRequestId = null;
        this.rejectionReason = null;
        this.notificationService.showSuccess('âŒ Request Rejected', 'The request has been rejected');
      },
      error: () => this.notificationService.showError('Error', 'Error rejecting request')
    });
  }

  cancelReject(): void {
    this.selectedRequestId = null;
    this.rejectionReason = null;
  }

  // ============================================================
  // CALENDRIER â€” OUVRIR / FERMER
  // ============================================================

  openScheduleModal(request: any): void {
    this.schedulingRequest = request;
    this.shelterNotes      = '';
    this.selectedDay       = null;
    this.selectedHour      = '';
    this.selectedMinute    = '00';
    this.appointmentTime   = '';
    this.bookedSlots       = [];

    const today = new Date();
    this.calendarYear  = today.getFullYear();
    this.calendarMonth = today.getMonth();

    this.buildCalendar();
    this.showScheduleModal = true;
  }

  closeScheduleModal(): void {
    this.showScheduleModal  = false;
    this.schedulingRequest  = null;
    this.scheduling         = false;
    this.selectedDay        = null;
  }

  // ============================================================
  // CALENDRIER â€” NAVIGATION
  // ============================================================

  prevMonth(): void {
    if (this.calendarMonth === 0) {
      this.calendarMonth = 11;
      this.calendarYear--;
    } else {
      this.calendarMonth--;
    }
    this.selectedDay = null;
    this.bookedSlots = [];
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.calendarMonth === 11) {
      this.calendarMonth = 0;
      this.calendarYear++;
    } else {
      this.calendarMonth++;
    }
    this.selectedDay = null;
    this.bookedSlots = [];
    this.buildCalendar();
  }

  // ============================================================
  // CALENDRIER â€” CONSTRUCTION
  // ============================================================

  buildCalendar(): void {
    const year  = this.calendarYear;
    const month = this.calendarMonth;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const apptMap: Map<string, any[]> = new Map();
    for (const appt of this.appointments) {
      if (appt.status === 'SCHEDULED') {
        const d = new Date(appt.appointmentDate);
        const key = this.toDateKey(d);
        if (!apptMap.has(key)) apptMap.set(key, []);
        apptMap.get(key)!.push(appt);
      }
    }

    const days: CalendarDay[] = [];

    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: null, dayNum: 0, isPast: false, isToday: false, isSelected: false, appointments: [], key: '' });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key  = this.toDateKey(date);
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      days.push({
        date,
        dayNum: d,
        isPast,
        isToday,
        isSelected: false,
        appointments: apptMap.get(key) || [],
        key
      });
    }

    this.calendarDays = days;
  }

  selectDay(day: CalendarDay): void {
    if (!day.date || day.isPast) return;

    if (this.selectedDay) this.selectedDay.isSelected = false;

    day.isSelected = true;
    this.selectedDay = day;
    this.selectedHour = '';
    this.appointmentTime = '';

    this.bookedSlots = day.appointments.map(a => {
      const d = new Date(a.appointmentDate);
      return this.padTwo(d.getHours()) + ':' + this.padTwo(d.getMinutes());
    });
  }

  selectHour(slot: string): void {
    if (this.isSlotBooked(slot)) return;
    this.selectedHour    = slot;
    this.appointmentTime = slot;
  }

  isSlotBooked(slot: string): boolean {
    return this.bookedSlots.includes(slot);
  }

  // ============================================================
  // CALENDRIER â€” CONFIRMATION (MODIFIÃ‰ AVEC NOTIFICATION)
  // ============================================================

  confirmSchedule(): void {
    if (!this.selectedDay?.date || !this.appointmentTime) {
      this.notificationService.showWarning('Missing Information', 'Please select a date and time slot.');
      return;
    }

    this.scheduling = true;

    const d = this.selectedDay.date;
    const [hh, mm] = this.appointmentTime.split(':');
    const dateTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +hh, +mm);
    const iso = this.toISOLocal(dateTime);

    this.appointmentService.scheduleAppointment({
      requestId:          this.schedulingRequest.id,
      appointmentDate:    iso,
      shelterNotes:       this.shelterNotes,
      compatibilityScore: this.schedulingRequest.compatibilityScore
    }).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          'âœ… Appointment Scheduled!',
          `Appointment scheduled for ${this.schedulingRequest.adopterName}!\nAn email notification has been sent.`
        );
        this.closeScheduleModal();
        this.loadRequests();
        this.loadAppointments();
      },
      error: (err) => {
        this.notificationService.showError('âŒ Error', err.error?.message || 'Error scheduling appointment');
        this.scheduling = false;
      }
    });
  }

  // ============================================================
  // RÃ‰PONDRE APRÃˆS CONSULTATION (MODIFIÃ‰ AVEC NOTIFICATION)
  // ============================================================

  openRespondModal(appointment: any): void {
    this.respondingAppointment = appointment;
    this.consultationResult    = '';
    this.responseMessage       = '';
    this.showRespondModal      = true;
  }

  closeRespondModal(): void {
    this.showRespondModal      = false;
    this.respondingAppointment = null;
    this.responding            = false;
  }

  confirmRespond(): void {
    if (!this.consultationResult) { 
      this.notificationService.showWarning('Missing Information', 'Please select a result.');
      return; 
    }
    this.responding = true;

    this.appointmentService.respondAfterConsultation(
      this.respondingAppointment.id,
      this.consultationResult,
      this.responseMessage
    ).subscribe({
      next: () => {
        const label = this.consultationResult === 'APPROVED' ? 'approved âœ…' : 'rejected âŒ';
        this.notificationService.showSuccess(`Adoption ${label}`, 'Email sent to adopter.');
        this.closeRespondModal();
        this.loadAppointments();
        this.loadRequests();
      },
      error: () => {
        this.notificationService.showError('Error', 'Error sending response');
        this.responding = false;
      }
    });
  }

  // ============================================================
  // ANNULER UN RENDEZ-VOUS (MODIFIÃ‰ AVEC NOTIFICATION)
  // ============================================================

  async cancelAppointment(appointmentId: number): Promise<void> {
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      'Are you sure you want to cancel this appointment?',
      {
        title: 'Cancel appointment',
        confirmText: 'Cancel appointment',
        cancelText: 'Keep appointment',
        tone: 'danger'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.appointmentService.cancelAppointment(appointmentId, 'Cancelled by shelter').subscribe({
      next: () => {
        this.loadAppointments();
        this.notificationService.showSuccess('âœ… Appointment Cancelled', 'Appointment cancelled successfully');
      },
      error: () => this.notificationService.showError('âŒ Error', 'Error cancelling appointment')
    });
  }

  // ============================================================
  // HELPERS UTILITAIRES
  // ============================================================

  private toDateKey(d: Date): string {
    return `${d.getFullYear()}-${this.padTwo(d.getMonth() + 1)}-${this.padTwo(d.getDate())}`;
  }

  private padTwo(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }

  private toISOLocal(d: Date): string {
    return `${d.getFullYear()}-${this.padTwo(d.getMonth()+1)}-${this.padTwo(d.getDate())}T${this.padTwo(d.getHours())}:${this.padTwo(d.getMinutes())}:00`;
  }

  get calendarMonthLabel(): string {
    return `${this.MONTH_NAMES[this.calendarMonth]} ${this.calendarYear}`;
  }

  get canGoPrev(): boolean {
    const today = new Date();
    return !(this.calendarYear === today.getFullYear() && this.calendarMonth === today.getMonth());
  }

  get selectedDateLabel(): string {
    if (!this.selectedDay?.date) return '';
    const d = this.selectedDay.date;
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ============================================================
  // HELPERS AFFICHAGE
  // ============================================================

  getScoreRequest(requestId: number): any {
    return this.scoredRequests.find(r => r.id === requestId);
  }

  getScoreBarWidth(score: number): string { return `${score}%`; }

  getScoreBgColor(score: number): string {
    if (score >= 85) return '#f0fff4';
    if (score >= 70) return '#fffff0';
    if (score >= 55) return '#fff8f0';
    return '#fff5f5';
  }

  getScoreTextColor(score: number): string {
    if (score >= 85) return '#38a169';
    if (score >= 70) return '#d69e2e';
    if (score >= 55) return '#ed8936';
    return '#e53e3e';
  }

  getStatusBadge(status: string): string {
    const badges: any = { 'PENDING':'bg-warning text-dark','UNDER_REVIEW':'bg-info text-dark','APPROVED':'bg-success','REJECTED':'bg-danger','CANCELLED':'bg-secondary' };
    return badges[status] || 'bg-secondary';
  }

  getStatusClass(status: string): string { return `status-${status}`; }

  getStatusText(status: string): string {
    const texts: any = { 'PENDING':'â³ Pending','UNDER_REVIEW':'ðŸ“‹ Under Review','APPROVED':'âœ… Approved','REJECTED':'âŒ Rejected','CANCELLED':'ðŸ—‘ï¸ Cancelled' };
    return texts[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: any = { 'PENDING':'fa-clock','UNDER_REVIEW':'fa-eye','APPROVED':'fa-check-circle','REJECTED':'fa-times-circle','CANCELLED':'fa-ban' };
    return icons[status] || 'fa-question-circle';
  }

  getHousingIcon(housingType: string): string {
    const icons: any = { 'APARTMENT':'fa-building','HOUSE':'fa-home','FARM':'fa-tractor','OTHER':'fa-question-circle' };
    return icons[housingType] || 'fa-home';
  }

  getPetIcon(petName: string): string { return petName ? petName.charAt(0).toUpperCase() : 'ðŸ¾'; }

  getAppointmentStatusLabel(status: string): string {
    const map: any = { 'SCHEDULED':'ðŸ“… Scheduled','COMPLETED':'âœ… Completed','CANCELLED':'âŒ Cancelled','NO_SHOW':'ðŸš« No Show' };
    return map[status] || status;
  }

  get pageTitle(): string {
    if (this.petId && this.selectedPetName) return `ðŸ“‹ Requests for ${this.selectedPetName}`;
    if (this.petId) return `ðŸ“‹ Requests for Pet #${this.petId}`;
    return 'ðŸ“‹ Adoption Requests';
  }

  get pageSubtitle(): string {
    if (this.petId && this.filteredRequests.length > 0) return `${this.filteredRequests.length} request(s) â€” sorted by compatibility score`;
    return 'Manage adoption requests â€” candidates ranked by compatibility';
  }

  get pendingRequests(): any[] { return this.filteredRequests.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW'); }
  get processedRequests(): any[] { return this.filteredRequests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CANCELLED'); }
  get pendingAppointments(): any[] { return this.appointments.filter(a => a.status === 'SCHEDULED'); }
  get completedAppointments(): any[] { return this.appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED'); }
}

// ============================================================
// INTERFACE CALENDRIER
// ============================================================
interface CalendarDay {
  date: Date | null;
  dayNum: number;
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointments: any[];
  key: string;
}

