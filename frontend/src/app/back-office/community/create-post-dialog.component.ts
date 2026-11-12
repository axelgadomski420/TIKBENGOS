import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create-post-dialog',
  templateUrl: './create-post-dialog.component.html',
  styleUrls: ['./create-post-dialog.component.scss']
})
export class CreatePostDialogComponent {
  form: FormGroup;
  readonly imageInputId = 'create-post-dialog-image-upload';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreatePostDialogComponent>
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(140)]],
      content: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
      type: ['DISCUSSION', Validators.required],
      imageUrl: ['']
    });
  }

  get titleControl() {
    return this.form.get('title');
  }

  get contentControl() {
    return this.form.get('content');
  }

  get typeControl() {
    return this.form.get('type');
  }

  get imageUrl(): string {
    return this.form.get('imageUrl')?.value ?? '';
  }

  chooseType(type: 'DISCUSSION' | 'QUESTION'): void {
    this.typeControl?.setValue(type);
    this.typeControl?.markAsDirty();
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      this.form.patchValue({ imageUrl: value });
    };
    reader.readAsDataURL(file);

    input.value = '';
  }

  clearImage(): void {
    this.form.patchValue({ imageUrl: '' });
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
