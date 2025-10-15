import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestDocumentPage } from './request-document.page';

describe('RequestDocumentPage', () => {
  let component: RequestDocumentPage;
  let fixture: ComponentFixture<RequestDocumentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestDocumentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
