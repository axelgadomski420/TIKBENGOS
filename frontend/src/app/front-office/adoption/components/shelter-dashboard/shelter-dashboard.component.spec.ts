import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelterDashboardComponent } from './shelter-dashboard.component';

describe('ShelterDashboardComponent', () => {
  let component: ShelterDashboardComponent;
  let fixture: ComponentFixture<ShelterDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShelterDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelterDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
