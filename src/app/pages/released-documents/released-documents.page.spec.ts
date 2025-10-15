import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReleasedDocumentsPage } from './released-documents.page';

describe('ReleasedDocumentsPage', () => {
  let component: ReleasedDocumentsPage;
  let fixture: ComponentFixture<ReleasedDocumentsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReleasedDocumentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
