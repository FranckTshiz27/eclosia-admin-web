import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CursusComponent } from './cursus.component';

describe('CursusComponent', () => {
  let component: CursusComponent;
  let fixture: ComponentFixture<CursusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CursusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
