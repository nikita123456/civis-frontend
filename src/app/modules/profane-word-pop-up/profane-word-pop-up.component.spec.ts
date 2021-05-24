import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfaneWordPopUpComponent } from './profane-word-pop-up.component';

describe('ProfaneWordPopUpComponent', () => {
  let component: ProfaneWordPopUpComponent;
  let fixture: ComponentFixture<ProfaneWordPopUpComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfaneWordPopUpComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfaneWordPopUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
