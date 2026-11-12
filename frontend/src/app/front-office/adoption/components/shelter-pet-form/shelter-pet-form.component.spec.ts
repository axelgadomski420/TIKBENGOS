import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelterPetFormComponent } from './shelter-pet-form.component';

describe('ShelterPetFormComponent', () => {
  let component: ShelterPetFormComponent;
  let fixture: ComponentFixture<ShelterPetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShelterPetFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelterPetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
