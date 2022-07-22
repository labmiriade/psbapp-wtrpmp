import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPlaceDialogComponent } from './add-place-dialog.component';

describe('AddPlaceDialogComponent', () => {
  let component: AddPlaceDialogComponent;
  let fixture: ComponentFixture<AddPlaceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddPlaceDialogComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddPlaceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
