import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitComponent } from './init.component';

describe('InitComponent', () => {
  let component: InitComponent;
  let fixture: ComponentFixture<InitComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InitComponent]
    });
    fixture = TestBed.createComponent(InitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
