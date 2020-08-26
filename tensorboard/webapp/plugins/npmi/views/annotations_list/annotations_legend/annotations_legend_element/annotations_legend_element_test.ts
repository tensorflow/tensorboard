import {TestBed, ComponentFixture} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {AnnotationsLegendElementComponent} from './annotations_legend_element_component';

describe('Npmi Annotations Legend Element Container', () => {
  let fixture: ComponentFixture<AnnotationsLegendElementComponent>;
  const css = {
    GLYPH: 'svg',
    TITLE: '.legend-element-title',
    CIRCLE: 'circle',
    BAR: 'rect',
    RUN: 'path',
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationsLegendElementComponent],
      imports: [],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnotationsLegendElementComponent);
    fixture.componentInstance.text = 'test';
    fixture.componentInstance.color = 'red';
  });

  it('renders circle', () => {
    fixture.componentInstance.shape = 'circle';
    fixture.detectChanges();

    const glyph = fixture.debugElement.query(By.css(css.GLYPH));
    expect(glyph).toBeTruthy();

    const circle = fixture.debugElement.query(By.css(css.CIRCLE));
    expect(circle).toBeTruthy();

    const title = fixture.debugElement.query(By.css(css.TITLE));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('test');
  });

  it('renders bar', () => {
    fixture.componentInstance.shape = 'bar';
    fixture.detectChanges();

    const glyph = fixture.debugElement.query(By.css(css.GLYPH));
    expect(glyph).toBeTruthy();

    const bar = fixture.debugElement.query(By.css(css.BAR));
    expect(bar).toBeTruthy();

    const title = fixture.debugElement.query(By.css(css.TITLE));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('test');
  });

  it('renders run glyph', () => {
    fixture.componentInstance.shape = 'runIndicator';
    fixture.detectChanges();

    const glyph = fixture.debugElement.query(By.css(css.GLYPH));
    expect(glyph).toBeTruthy();

    const run = fixture.debugElement.query(By.css(css.RUN));
    expect(run).toBeTruthy();

    const title = fixture.debugElement.query(By.css(css.TITLE));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('test');
  });
});
