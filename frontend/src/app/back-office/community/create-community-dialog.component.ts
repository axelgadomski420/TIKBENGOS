import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-community-dialog',
  templateUrl: './create-community-dialog.component.html',
  styleUrls: ['./create-community-dialog.component.scss']
})
export class CreateCommunityDialogComponent {
  form: FormGroup;
  readonly bannerInputId = 'create-community-dialog-banner-upload';
  readonly iconInputId = 'create-community-dialog-icon-upload';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateCommunityDialogComponent>
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
      type: ['PUBLIC', Validators.required],
      bannerUrl: [''],
      iconUrl: ['']
    });
  }

  get nameControl() {
    return this.form.get('name');
  }

  get descriptionControl() {
    return this.form.get('description');
  }

  get typeControl() {
    return this.form.get('type');
  }

  get bannerUrl(): string {
    return this.form.get('bannerUrl')?.value ?? '';
  }

  get iconUrl(): string {
    return this.form.get('iconUrl')?.value ?? '';
  }

  get communityInitial(): string {
    const value = (this.nameControl?.value ?? '').trim();
    return value ? value.charAt(0).toUpperCase() : 'C';
  }

  chooseType(type: 'PUBLIC' | 'PRIVATE'): void {
    this.typeControl?.setValue(type);
    this.typeControl?.markAsDirty();
  }

  onImagePicked(event: Event, target: 'bannerUrl' | 'iconUrl'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      this.form.patchValue({ [target]: value });
    };
    reader.readAsDataURL(file);

    input.value = '';
  }

  clearImage(target: 'bannerUrl' | 'iconUrl'): void {
    this.form.patchValue({ [target]: '' });
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
