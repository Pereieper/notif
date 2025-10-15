import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplatePage } from './template.page';

describe('TemplatePage', () => {
  let component: TemplatePage;
  let fixture: ComponentFixture<TemplatePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
