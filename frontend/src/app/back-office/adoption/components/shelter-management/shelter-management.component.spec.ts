import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelterManagementComponent } from './shelter-management.component';

describe('ShelterManagementComponent', () => {
  let component: ShelterManagementComponent;
  let fixture: ComponentFixture<ShelterManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShelterManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelterManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
