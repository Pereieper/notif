import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaptainDashboardPage } from './captain-dashboard.page';

describe('CaptainDashboardPage', () => {
  let component: CaptainDashboardPage;
  let fixture: ComponentFixture<CaptainDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CaptainDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
