import { TestBed } from '@angular/core/testing';

import { AvailabiliyService } from './availabiliy.service';

describe('AvailabiliyService', () => {
  let service: AvailabiliyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvailabiliyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
