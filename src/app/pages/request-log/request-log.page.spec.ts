import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestLogPage } from './request-log.page';

describe('RequestLogPage', () => {
  let component: RequestLogPage;
  let fixture: ComponentFixture<RequestLogPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestLogPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
