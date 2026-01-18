import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportToExcel } from './export-to-excel';

describe('ExportToExcel', () => {
  let component: ExportToExcel;
  let fixture: ComponentFixture<ExportToExcel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportToExcel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportToExcel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
