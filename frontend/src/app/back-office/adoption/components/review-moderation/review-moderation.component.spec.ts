import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewModerationComponent } from './review-moderation.component';

describe('ReviewModerationComponent', () => {
  let component: ReviewModerationComponent;
  let fixture: ComponentFixture<ReviewModerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReviewModerationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewModerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
