import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecretaryDashboardPage } from './secretary-dashboard.page';

describe('SecretaryDashboardPage', () => {
  let component: SecretaryDashboardPage;
  let fixture: ComponentFixture<SecretaryDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SecretaryDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
