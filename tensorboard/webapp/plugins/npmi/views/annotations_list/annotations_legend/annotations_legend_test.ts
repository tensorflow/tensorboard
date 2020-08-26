import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {AnnotationsLegendComponent} from './annotations_legend_component';

describe('Npmi Annotations Legend Container', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationsLegendComponent],
      imports: [],
      providers: [],
    }).compileComponents();
  });

  it('renders annotations legend', () => {
    const fixture = TestBed.createComponent(AnnotationsLegendComponent);
    fixture.detectChanges();

    const annotationsLegendElements = fixture.debugElement.queryAll(
      By.css('npmi-annotations-legend-element')
    );
    expect(annotationsLegendElements.length).toBe(4);
  });
});
