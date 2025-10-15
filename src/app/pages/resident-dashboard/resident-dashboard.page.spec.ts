import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResidentDashboardPage } from './resident-dashboard.page';

describe('ResidentDashboardPage', () => {
  let component: ResidentDashboardPage;
  let fixture: ComponentFixture<ResidentDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ResidentDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
