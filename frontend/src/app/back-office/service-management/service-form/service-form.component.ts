import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceService, CreateServicePayload } from '../../services/service.service';
import { AuthService } from '../../../auth/auth.service';
import { NotificationService } from '../../services/notification.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { DescriptionGeneratorService } from '../../services/description-generator.service';
import { AvailabilityService, ServiceAvailabilityDTO } from '../../../front-office/services/service/availabiliy.service';

@Component({
  selector: 'app-service-form',
  templateUrl: './service-form.component.html',
  styleUrls: ['./service-form.component.css']
})
export class ServiceFormComponent implements OnInit {

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  isEditMode = false;
  serviceId: number | null = null;
  loading = false;
  saving = false;

  // Image upload
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingImageUrl: string | null = null;
  uploadingImage = false;
  isDragOver = false;

  // Description
  generatingDescription = false;

  selectedCategoryId: number | null = null;
  selectedCategoryName: string = '';
  selectedCategoryLabel: string = '';

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private serviceService: ServiceService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cloudinaryService: CloudinaryService,
    private descriptionGenerator: DescriptionGeneratorService,
    private availabilityService: AvailabilityService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Lire les query params (création depuis le picker)
    this.route.queryParams.subscribe(qp => {
      if (qp['categoryId']) {
        this.selectedCategoryId = +qp['categoryId'];
        this.selectedCategoryName = qp['categoryName'] || '';
        this.selectedCategoryLabel = qp['categoryLabel'] || qp['categoryName'] || '';
      }
      this.buildForm();
    });

    // Lire les route params (édition)
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.serviceId = +params['id'];
        this.loadService(this.serviceId);
      }
    });
  }

  // ==================== CONSTRUCTION DU FORMULAIRE ====================
  private buildForm(): void {
    const cat = this.selectedCategoryName.toUpperCase();

    this.form = this.fb.group({
      // --- Champs communs ---
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      price: [0, [Validators.required, Validators.min(0)]],
      duration: [30, [Validators.required, Validators.min(15), Validators.max(480)]],
      status: ['ACTIVE', Validators.required],
      options: this.fb.array([]),
      availabilitySlots: this.fb.array([]),

      // --- VETERINARY ---
      clinicName: [cat === 'VETERINARY' ? '' : null],
      consultationType: [cat === 'VETERINARY' ? 'general' : null],
      emergencyAvailable: [cat === 'VETERINARY' ? false : null],
      requiresAppointment: [cat === 'VETERINARY' ? true : null],

      // --- GROOMING ---
      petSize: [cat === 'GROOMING' ? 'medium' : null],
      includesBath: [cat === 'GROOMING' ? true : null],
      includesHaircut: [cat === 'GROOMING' ? false : null],
      productsUsed: [cat === 'GROOMING' ? '' : null],

      // --- TRAINING ---
      trainingType: [cat === 'TRAINING' ? 'obedience' : null],
      sessionsCount: [cat === 'TRAINING' ? 1 : null],
      sessionDuration: [cat === 'TRAINING' ? 60 : null],
      groupTraining: [cat === 'TRAINING' ? false : null],

      // --- BOARDING ---
      capacity: [cat === 'BOARDING' ? 1 : null],
      overnight: [cat === 'BOARDING' ? false : null],
      hasOutdoorSpace: [cat === 'BOARDING' ? false : null],
      maxStayDays: [cat === 'BOARDING' ? 7 : null],

      // --- HOTEL ---
      roomType: [cat === 'HOTEL' ? 'standard' : null],
      hasCameraAccess: [cat === 'HOTEL' ? false : null],
      includesFood: [cat === 'HOTEL' ? false : null],
      numberOfStaff: [cat === 'HOTEL' ? 1 : null],

      // --- WALKING ---
      durationPerWalk: [cat === 'WALKING' ? 30 : null],
      groupWalk: [cat === 'WALKING' ? false : null],
      maxDogs: [cat === 'WALKING' ? 1 : null],
      areaCovered: [cat === 'WALKING' ? '' : null],
    });
  }

  // ==================== OPTIONS (FormArray) ====================
  get options(): FormArray {
    return this.form.get('options') as FormArray;
  }

  addOption(): void {
    this.options.push(this.fb.group({
      name: [''],
      price: [0]
    }));
  }

  removeOption(index: number): void {
    this.options.removeAt(index);
  }

  // ==================== AVAILABILITY SLOTS (FormArray) ====================
  get availabilitySlots(): FormArray {
    return this.form.get('availabilitySlots') as FormArray;
  }

  // ==================== SLOT VALIDATORS ====================
  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(control.value);
    return selected < today ? { pastDate: true } : null;
  }

  private endTimeAfterStartValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startTime')?.value;
    const end = group.get('endTime')?.value;
    if (!start || !end) return null;
    return end <= start ? { endBeforeStart: true } : null;
  }

  addAvailabilitySlot(): void {
    // Default: today, 09:00 - 17:00, available
    const today = new Date().toISOString().split('T')[0];
    this.availabilitySlots.push(this.fb.group({
      date: [today, [Validators.required, this.futureDateValidator.bind(this)]],
      startTime: ['09:00', Validators.required],
      endTime: ['17:00', Validators.required],
      isAvailable: [true]
    }, { validators: this.endTimeAfterStartValidator.bind(this) }));
  }

  removeAvailabilitySlot(index: number): void {
    this.availabilitySlots.removeAt(index);
  }

  // ==================== CATÉGORIE GETTERS ====================
  get isVeterinary(): boolean { return this.selectedCategoryName.toUpperCase() === 'VETERINARY'; }
  get isGrooming(): boolean { return this.selectedCategoryName.toUpperCase() === 'GROOMING'; }
  get isTraining(): boolean { return this.selectedCategoryName.toUpperCase() === 'TRAINING'; }
  get isBoarding(): boolean { return this.selectedCategoryName.toUpperCase() === 'BOARDING'; }
  get isHotel(): boolean { return this.selectedCategoryName.toUpperCase() === 'HOTEL'; }
  get isWalking(): boolean { return this.selectedCategoryName.toUpperCase() === 'WALKING'; }

  // ==================== PRIX TOTAL ====================
  getTotalPrice(): number {
    const base = this.form?.get('price')?.value || 0;
    const optTotal = this.options.controls.reduce((sum, opt) => sum + (opt.get('price')?.value || 0), 0);
    return base + optTotal;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  }

  // ==================== CHARGEMENT (édition) ====================
  private loadService(id: number): void {
    this.loading = true;
    this.serviceService.findById(id).subscribe({
      next: (service: any) => {
        if (service.category) {
          this.selectedCategoryId = service.category.id;
          this.selectedCategoryName = service.category.name;
          this.selectedCategoryLabel = service.category.name;
        }
        this.buildForm();

        // Remplir tous les champs (communs + spécifiques à la catégorie)
        this.form.patchValue({
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          status: service.status,
          // Veterinary
          clinicName: service.clinicName,
          consultationType: service.consultationType,
          emergencyAvailable: service.emergencyAvailable,
          requiresAppointment: service.requiresAppointment,
          // Grooming
          petSize: service.petSize,
          includesBath: service.includesBath,
          includesHaircut: service.includesHaircut,
          productsUsed: service.productsUsed,
          // Training
          trainingType: service.trainingType,
          sessionsCount: service.sessionsCount,
          sessionDuration: service.sessionDuration,
          groupTraining: service.groupTraining,
          // Boarding
          capacity: service.capacity,
          overnight: service.overnight,
          hasOutdoorSpace: service.hasOutdoorSpace,
          maxStayDays: service.maxStayDays,
          // Hotel
          roomType: service.roomType,
          hasCameraAccess: service.hasCameraAccess,
          includesFood: service.includesFood,
          numberOfStaff: service.numberOfStaff,
          // Walking
          durationPerWalk: service.durationPerWalk,
          groupWalk: service.groupWalk,
          maxDogs: service.maxDogs,
          areaCovered: service.areaCovered,
        });

        // Image existante
        if (service.imageUrl) {
          this.existingImageUrl = service.imageUrl;
          this.imagePreviewUrl = service.imageUrl;
        }

        // Remplir les options
        this.options.clear();
        (service.options || []).forEach((opt: any) => {
          this.options.push(this.fb.group({ name: [opt.name], price: [opt.price] }));
        });

        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.notificationService.error('Erreur', 'Erreur lors du chargement du service');
        console.error(err);
      }
    });
  }

  // ==================== IMAGE UPLOAD ====================
  openFilePicker(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  private processFile(file: File): void {
    const validation = this.cloudinaryService.validateFile(file);
    if (!validation.valid) {
      this.notificationService.error('Fichier invalide', validation.error || 'Erreur');
      return;
    }
    this.selectedImageFile = file;
    // Aperçu local immédiat
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  // ==================== GÉNÉRATION DESCRIPTION ====================
  generateDescription(): void {
    const name = this.form.get('name')?.value?.trim();
    if (!name) {
      this.notificationService.error('Attention', 'Renseignez d\'abord le nom du service');
      return;
    }
    this.generatingDescription = true;
    setTimeout(() => {
      const desc = this.descriptionGenerator.generate(name, this.selectedCategoryName);
      this.form.get('description')?.setValue(desc);
      this.generatingDescription = false;
    }, 600);
  }

  // ==================== SUBMIT ====================
  onSubmit(): void {
    if (!this.form) return;

    // Marquer les champs communs comme touchés pour afficher les erreurs
    ['name', 'description', 'price', 'duration', 'status'].forEach(f => {
      this.form.get(f)?.markAsTouched();
    });

    // Marquer tous les champs des slots comme touchés
    this.availabilitySlots.controls.forEach(slotGroup => {
      (slotGroup as FormGroup).markAllAsTouched();
    });

    // Vérifier la validité de tous les slots
    const slotsValid = this.availabilitySlots.controls.every(slot => slot.valid);
    if (!slotsValid) {
      this.notificationService.error('Erreur', 'Veuillez corriger les erreurs dans les créneaux de disponibilité');
      return;
    }

    // Vérifier seulement les champs communs obligatoires
    const nameOk = !!this.form.get('name')?.value?.toString().trim();
    const descriptionOk = !!this.form.get('description')?.value?.toString().trim();
    const priceOk = this.form.get('price')?.value !== null && this.form.get('price')?.value !== undefined;
    const durationOk = !!this.form.get('duration')?.value;

    if (!nameOk || !descriptionOk || !priceOk || !durationOk) {
      this.notificationService.error('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!this.selectedCategoryId) {
      this.notificationService.error('Erreur', 'Catégorie non sélectionnée');
      return;
    }

    this.saving = true;

    const currentUser = this.authService.getCurrentUser();

    // Upload de l'image si une nouvelle image est sélectionnée
    const uploadAndSubmit = (imageUrl: string | null) => {
      const payload: any = {
        name: this.form.get('name')?.value,
        description: this.form.get('description')?.value,
        price: this.form.get('price')?.value,
        duration: this.form.get('duration')?.value,
        status: this.form.get('status')?.value || 'ACTIVE',
        categoryId: this.selectedCategoryId,
        providerId: currentUser?.id || null,
        imageUrl: imageUrl,
        options: this.options.value || [],
        clinicName: this.form.get('clinicName')?.value,
        consultationType: this.form.get('consultationType')?.value,
        emergencyAvailable: this.form.get('emergencyAvailable')?.value,
        requiresAppointment: this.form.get('requiresAppointment')?.value,
        petSize: this.form.get('petSize')?.value,
        includesBath: this.form.get('includesBath')?.value,
        includesHaircut: this.form.get('includesHaircut')?.value,
        productsUsed: this.form.get('productsUsed')?.value,
        trainingType: this.form.get('trainingType')?.value,
        sessionsCount: this.form.get('sessionsCount')?.value,
        sessionDuration: this.form.get('sessionDuration')?.value,
        groupTraining: this.form.get('groupTraining')?.value,
        capacity: this.form.get('capacity')?.value,
        overnight: this.form.get('overnight')?.value,
        hasOutdoorSpace: this.form.get('hasOutdoorSpace')?.value,
        maxStayDays: this.form.get('maxStayDays')?.value,
        roomType: this.form.get('roomType')?.value,
        hasCameraAccess: this.form.get('hasCameraAccess')?.value,
        includesFood: this.form.get('includesFood')?.value,
        numberOfStaff: this.form.get('numberOfStaff')?.value,
        durationPerWalk: this.form.get('durationPerWalk')?.value,
        groupWalk: this.form.get('groupWalk')?.value,
        maxDogs: this.form.get('maxDogs')?.value,
        areaCovered: this.form.get('areaCovered')?.value,
      };

      const op = this.isEditMode && this.serviceId
        ? this.serviceService.update(this.serviceId, payload)
        : this.serviceService.create(payload);

      op.subscribe({
        next: (result: any) => {
          const createdServiceId: number = result?.id;
          const slots: ServiceAvailabilityDTO[] = (this.availabilitySlots.value || []).map((slot: any) => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable ?? true,
            serviceId: createdServiceId
          }));

          if (slots.length > 0 && createdServiceId) {
            // Save all slots in parallel
            const saves = slots.map((s: ServiceAvailabilityDTO) => this.availabilityService.create(s));
            let completed = 0;
            let hasError = false;
            saves.forEach(obs => obs.subscribe({
              next: () => {
                completed++;
                if (completed === saves.length && !hasError) {
                  this.saving = false;
                  this.notificationService.success('Succès', this.isEditMode ? 'Service modifié avec ses disponibilités !' : 'Service créé avec ses disponibilités !');
                  setTimeout(() => this.router.navigate(['/admin/services']), 1200);
                }
              },
              error: () => {
                hasError = true;
                this.saving = false;
                this.notificationService.error('Attention', 'Service créé mais erreur lors de la sauvegarde des disponibilités.');
                setTimeout(() => this.router.navigate(['/admin/services']), 1500);
              }
            }));
          } else {
            this.saving = false;
            this.notificationService.success('Succès', this.isEditMode ? 'Service modifié !' : 'Service créé avec succès !');
            setTimeout(() => this.router.navigate(['/admin/services']), 1200);
          }
        },
        error: (err: any) => {
          this.saving = false;
          this.notificationService.error('Erreur', `Erreur: ${err?.error?.message || err?.message || err?.status || 'Inconnue'}`);
        }
      });
    };

    if (this.selectedImageFile) {
      this.uploadingImage = true;
      this.cloudinaryService.uploadImage(this.selectedImageFile).subscribe({
        next: (url: string) => {
          this.uploadingImage = false;
          uploadAndSubmit(url);
        },
        error: (err: any) => {
          this.uploadingImage = false;
          this.saving = false;
          this.notificationService.error('Erreur upload', 'Impossible d\'uploader l\'image. Vérifiez votre connexion.');
        }
      });
    } else {
      uploadAndSubmit(this.existingImageUrl);
    }
  }

  // méthode vide pour remplacer l'ancienne
  private _legacySubmit(): void {
    const currentUser = this.authService.getCurrentUser();
    const payload: any = {
      name: this.form.get('name')?.value,
      description: this.form.get('description')?.value,
      price: this.form.get('price')?.value,
      duration: this.form.get('duration')?.value,
      status: this.form.get('status')?.value || 'ACTIVE',
      categoryId: this.selectedCategoryId,
      providerId: currentUser?.id || null,
      options: this.options.value || [],
      // Champs spécifiques à la catégorie (envoyés directement)
      clinicName: this.form.get('clinicName')?.value,
      consultationType: this.form.get('consultationType')?.value,
      emergencyAvailable: this.form.get('emergencyAvailable')?.value,
      requiresAppointment: this.form.get('requiresAppointment')?.value,
      petSize: this.form.get('petSize')?.value,
      includesBath: this.form.get('includesBath')?.value,
      includesHaircut: this.form.get('includesHaircut')?.value,
      productsUsed: this.form.get('productsUsed')?.value,
      trainingType: this.form.get('trainingType')?.value,
      sessionsCount: this.form.get('sessionsCount')?.value,
      sessionDuration: this.form.get('sessionDuration')?.value,
      groupTraining: this.form.get('groupTraining')?.value,
      capacity: this.form.get('capacity')?.value,
      overnight: this.form.get('overnight')?.value,
      hasOutdoorSpace: this.form.get('hasOutdoorSpace')?.value,
      maxStayDays: this.form.get('maxStayDays')?.value,
      roomType: this.form.get('roomType')?.value,
      hasCameraAccess: this.form.get('hasCameraAccess')?.value,
      includesFood: this.form.get('includesFood')?.value,
      numberOfStaff: this.form.get('numberOfStaff')?.value,
      durationPerWalk: this.form.get('durationPerWalk')?.value,
      groupWalk: this.form.get('groupWalk')?.value,
      maxDogs: this.form.get('maxDogs')?.value,
      areaCovered: this.form.get('areaCovered')?.value,
    };

  }

  onCancel(): void {
    this.router.navigate(['/admin/services']);
  }

  getFieldError(fieldName: string): string | null {
    const ctrl = this.form?.get(fieldName);
    if (ctrl && ctrl.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Champ requis';
      if (ctrl.errors['minlength']) return 'Trop court';
      if (ctrl.errors['maxlength']) return 'Trop long';
      if (ctrl.errors['min']) return 'Valeur trop petite';
    }
    return null;
  }

  // ==================== SLOT ERRORS ====================
  getSlotError(slotIndex: number, fieldName: string): string | null {
    const slotGroup = this.availabilitySlots.at(slotIndex) as FormGroup;
    if (!slotGroup) return null;

    // Erreur au niveau du groupe (endBeforeStart)
    if (fieldName === 'endTime') {
      if (slotGroup.errors?.['endBeforeStart'] &&
          (slotGroup.get('endTime')?.touched || slotGroup.get('startTime')?.touched)) {
        return 'L\'heure de fin doit être après l\'heure de début';
      }
    }

    const ctrl = slotGroup.get(fieldName);
    if (ctrl && ctrl.touched && ctrl.errors) {
      if (ctrl.errors['required']) return 'Ce champ est obligatoire';
      if (ctrl.errors['pastDate']) return 'La date ne peut pas être dans le passé';
    }
    return null;
  }

  getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}