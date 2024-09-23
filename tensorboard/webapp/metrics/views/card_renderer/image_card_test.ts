/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
import {Component, Input} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSliderModule} from '@angular/material/slider';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {
  getExperimentIdForRunId,
  getExperimentIdToExperimentAliasMap,
  getRun,
} from '../../../selectors';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {DataLoadState} from '../../../types/data';
import {TruncatedPathModule} from '../../../widgets/text/truncated_path_module';
import * as actions from '../../actions';
import {ImageId, MetricsDataSource, PluginType} from '../../data_source';
import * as selectors from '../../store/metrics_selectors';
import {
  appStateFromMetricsState,
  buildMetricsState,
  provideMockCardSeriesData,
} from '../../testing';
import {CardId} from '../../types';
import {ImageCardComponent} from './image_card_component';
import {ImageCardContainer} from './image_card_container';
import {RunNameModule} from './run_name_module';
import {VisLinkedTimeSelectionWarningModule} from './vis_linked_time_selection_warning_module';

@Component({
  standalone: false,
  selector: 'card-view',
  template: `
    <image-card
      [cardId]="cardId"
      [runColorScale]="runColorScale"
      (fullWidthChanged)="onFullWidthChanged($event)"
    ></image-card>
  `,
})
class TestableCardView {
  @Input() cardId!: CardId;
  @Input() runColorScale = (run: string) => '#fff';

  onFullWidthChanged(showFullWidth: boolean): void {}
}

function createImageCardContainer(cardId: CardId) {
  const fixture = TestBed.createComponent(ImageCardContainer);
  fixture.componentInstance.cardId = cardId;
  fixture.componentInstance.runColorScale = (run: string) => '#fff';

  return fixture;
}

class MockMetricsDataSource {
  imageUrl(imageId: ImageId): string {
    return `imageData?imageId=${imageId}`;
  }
}

describe('image card', () => {
  let store: MockStore<State>;
  let selectSpy: jasmine.Spy;
  let dataSource: MetricsDataSource;
  let dispatchedActions: Action[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatButtonModule,
        MatIconTestingModule,
        MatProgressSpinnerModule,
        MatSliderModule,
        RunNameModule,
        TruncatedPathModule,
        VisLinkedTimeSelectionWarningModule,
      ],
      declarations: [ImageCardContainer, ImageCardComponent, TestableCardView],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(buildMetricsState()),
        }),
        {provide: MetricsDataSource, useClass: MockMetricsDataSource},
      ],
    }).compileComponents();

    dispatchedActions = [];
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dataSource = TestBed.inject<MetricsDataSource>(MetricsDataSource);
    selectSpy = spyOn(store, 'select').and.callThrough();
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });

    store.overrideSelector(getExperimentIdForRunId, null);
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {});
    store.overrideSelector(getRun, null);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function expectImageSliderUI(
    fixture: ComponentFixture<ImageCardContainer>,
    imageId: string,
    stepIndex: number | null
  ) {
    const imgEl = fixture.debugElement.query(By.css('img'));
    const thumb = fixture.debugElement.query(By.css('.step-slider input'));
    expect(
      imgEl.nativeElement.src.endsWith(`/imageData?imageId=${imageId}`)
    ).toBe(true);
    expect(thumb.nativeElement.getAttribute('ng-reflect-value')).toBe(
      stepIndex?.toString()
    );
  }

  it('renders empty message when there is no data', () => {
    const cardMetadata = {
      plugin: PluginType.IMAGES,
      tag: 'tagA',
      run: 'run1',
      sample: 999,
    };
    provideMockCardSeriesData(
      selectSpy,
      PluginType.IMAGES,
      'card1',
      cardMetadata,
      null /* timeSeries */
    );

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const metadataEl = fixture.debugElement.query(By.css('.heading'));
    const imgEl = fixture.debugElement.query(By.css('img'));
    expect(metadataEl.nativeElement.textContent).toContain('tagA');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Data failed to load'
    );
    expect(imgEl).not.toBeTruthy();

    const slider = fixture.debugElement.query(By.css('.step-slider'));
    expect(slider).not.toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.FAILED);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Data failed to load');
  });

  it('renders loading spinner when loading', () => {
    provideMockCardSeriesData(selectSpy, PluginType.IMAGES, 'card1');
    store.overrideSelector(
      selectors.getCardLoadState,
      DataLoadState.NOT_LOADED
    );
    store.refreshState();

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();
    let loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).not.toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.LOADING);
    store.refreshState();
    fixture.detectChanges();
    loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.LOADED);
    store.refreshState();
    fixture.detectChanges();
    loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).not.toBeTruthy();

    store.overrideSelector(selectors.getCardLoadState, DataLoadState.FAILED);
    store.refreshState();
    fixture.detectChanges();
    loadingEl = fixture.debugElement.query(By.css('mat-spinner'));
    expect(loadingEl).not.toBeTruthy();
  });

  it('renders data', () => {
    const cardMetadata = {
      plugin: PluginType.IMAGES,
      tag: 'tagA',
      run: 'run1',
      sample: 999,
    };
    const timeSeries = [
      {wallTime: 100, imageId: 'imageId1', step: 333},
      {wallTime: 101, imageId: 'imageId2', step: 555},
      {wallTime: 102, imageId: 'imageId3', step: 777},
    ];
    provideMockCardSeriesData(
      selectSpy,
      PluginType.IMAGES,
      'card1',
      cardMetadata,
      timeSeries,
      1 /* stepIndex */
    );

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const metadataEl = fixture.debugElement.query(By.css('.heading'));
    const emptyEl = fixture.debugElement.query(By.css('.empty-message'));
    expect(metadataEl.nativeElement.textContent).toContain('tagA');
    expect(emptyEl).not.toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Step 555');
    expectImageSliderUI(fixture, 'imageId2', 1);
  });

  it(`renders the slider based on the number of steps`, () => {
    const timeSeries = [
      {wallTime: 100, imageId: 'ImageId1', step: 10},
      {wallTime: 101, imageId: 'ImageId2', step: 20},
      {wallTime: 102, imageId: 'ImageId3', step: 30},
    ];
    provideMockCardSeriesData(
      selectSpy,
      PluginType.IMAGES,
      'card1',
      null /* metadataOverride */,
      timeSeries
    );

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const slider = fixture.debugElement.query(By.css('.step-slider'));
    expect(slider.componentInstance.disabled).toBe(false);
    expect(slider.componentInstance.min).toBe(0);
    expect(slider.componentInstance.max).toBe(2);
  });

  it('does not render a step index that is out of range', () => {
    const timeSeries = [{wallTime: 100, imageId: 'ImageId1', step: 10}];
    provideMockCardSeriesData(
      selectSpy,
      PluginType.IMAGES,
      'card1',
      null /* metadataOverride */,
      timeSeries,
      5 /* stepIndex */
    );

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const imgEl = fixture.debugElement.query(By.css('img'));
    expect(imgEl).not.toBeTruthy();

    const slider = fixture.debugElement.query(By.css('.step-slider'));
    expect(slider).not.toBeTruthy();
  });

  it('renders sample when numSample is larger than 1', () => {
    const timeSeries = [{wallTime: 100, imageId: 'ImageId1', step: 10}];
    provideMockCardSeriesData(
      selectSpy,
      PluginType.IMAGES,
      'card1',
      {sample: 5, numSample: 1.2e4},
      timeSeries,
      0 /* stepIndex */
    );

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const metadata = fixture.debugElement.query(By.css('.metadata'));
    expect(metadata.nativeElement.textContent.trim()).toBe(
      'Step 10Sample 6/12,000'
    );
  });

  it('dispatches event when step slider changes', () => {
    const timeSeries = [
      {wallTime: 100, imageId: 'ImageId1', step: 10},
      {wallTime: 101, imageId: 'ImageId2', step: 20},
      {wallTime: 102, imageId: 'ImageId3', step: 30},
    ];
    provideMockCardSeriesData(
      selectSpy,
      PluginType.IMAGES,
      'card1',
      null /* metadataOverride */,
      timeSeries,
      2 /* stepIndex */
    );

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const thumb = fixture.debugElement.query(By.css('.step-slider input'));
    expect(fixture.nativeElement.textContent).toContain('Step 30');
    expectImageSliderUI(fixture, 'ImageId3', 2);

    // Adjust slider.
    thumb.triggerEventHandler('valueChange', 1);
    fixture.detectChanges();

    expect(dispatchedActions).toEqual([
      actions.cardStepSliderChanged({cardId: 'card1', stepIndex: 1}),
    ]);
  });

  it('disables slider when only 1 step exists', () => {
    const timeSeries = [{wallTime: 100, imageId: 'ImageId1', step: 10}];
    provideMockCardSeriesData(
      selectSpy,
      PluginType.IMAGES,
      'card1',
      null /* metadataOverride */,
      timeSeries
    );

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const slider = fixture.debugElement.query(By.css('.step-slider'));
    expect(slider.componentInstance.disabled).toBe(true);
  });

  it('respects settings from the store', () => {
    provideMockCardSeriesData(selectSpy, PluginType.IMAGES, 'card1');
    store.overrideSelector(selectors.getMetricsImageBrightnessInMilli, 2000);
    store.overrideSelector(selectors.getMetricsImageContrastInMilli, 1000);

    const fixture = createImageCardContainer('card1');
    fixture.detectChanges();

    const imgEl = fixture.debugElement.query(By.css('img'));
    expect(imgEl.styles['filter']).toContain('brightness(2)');
    expect(imgEl.styles['filter']).toContain('contrast(100%)');

    store.overrideSelector(selectors.getMetricsImageBrightnessInMilli, 9876);
    store.overrideSelector(selectors.getMetricsImageContrastInMilli, 0);
    store.refreshState();
    fixture.detectChanges();

    expect(imgEl.styles['filter']).toContain('brightness(9.876)');
    expect(imgEl.styles['filter']).toContain('contrast(0%)');
  });

  describe('actual size', () => {
    it('sets actual size, full width when global setting changes', () => {
      provideMockCardSeriesData(selectSpy, PluginType.IMAGES, 'card1');
      store.overrideSelector(selectors.getMetricsImageShowActualSize, false);

      const fixture = TestBed.createComponent(TestableCardView);
      const fullWidthSpy = spyOn(
        fixture.componentInstance,
        'onFullWidthChanged'
      );
      fixture.componentInstance.cardId = 'card1';
      fixture.detectChanges();

      const imgCardEl = fixture.debugElement.query(
        By.css('image-card-component')
      );
      expect(imgCardEl.classes['actual-size']).not.toBeTruthy();
      expect(fullWidthSpy.calls.allArgs()).toEqual([[false]]);

      store.overrideSelector(selectors.getMetricsImageShowActualSize, true);
      store.refreshState();
      fixture.detectChanges();

      expect(imgCardEl.classes['actual-size']).toBe(true);
      expect(fullWidthSpy.calls.allArgs()).toEqual([[false], [true]]);
    });

    it('sets actual size, full width when UI is toggled', () => {
      provideMockCardSeriesData(selectSpy, PluginType.IMAGES, 'card1');
      store.overrideSelector(selectors.getMetricsImageShowActualSize, false);
      store.refreshState();

      const fixture = TestBed.createComponent(TestableCardView);
      const fullWidthSpy = spyOn(
        fixture.componentInstance,
        'onFullWidthChanged'
      );
      fixture.componentInstance.cardId = 'card1';
      fixture.detectChanges();

      const imgCardEl = fixture.debugElement.query(
        By.css('image-card-component')
      );
      expect(imgCardEl.classes['actual-size']).not.toBeTruthy();
      expect(fullWidthSpy.calls.allArgs()).toEqual([[false]]);

      // Toggle on.
      const button = fixture.debugElement.query(
        By.css('[aria-label="Toggle actual image size"]')
      );
      button.nativeElement.click();
      fixture.detectChanges();

      expect(imgCardEl.classes['actual-size']).toBe(true);
      expect(fullWidthSpy.calls.allArgs()).toEqual([[false], [true]]);

      // Toggle off.
      button.nativeElement.click();
      fixture.detectChanges();

      expect(imgCardEl.classes['actual-size']).not.toBeTruthy();
      expect(fullWidthSpy.calls.allArgs()).toEqual([[false], [true], [false]]);
    });

    it('disables UI toggle when global setting is on', () => {
      provideMockCardSeriesData(selectSpy, PluginType.IMAGES, 'card1');
      store.overrideSelector(selectors.getMetricsImageShowActualSize, false);
      store.refreshState();

      const fixture = createImageCardContainer('card1');
      fixture.detectChanges();

      const button = fixture.debugElement.query(
        By.css('[aria-label="Toggle actual image size"]')
      );
      expect(button.attributes['disabled']).not.toBeTruthy();

      store.overrideSelector(selectors.getMetricsImageShowActualSize, true);
      store.refreshState();
      fixture.detectChanges();

      expect(button.attributes['disabled']).toBe('true');
    });

    it('does not clear local UI toggle state on global setting changes', () => {
      provideMockCardSeriesData(selectSpy, PluginType.IMAGES, 'card1');
      store.overrideSelector(selectors.getMetricsImageShowActualSize, false);
      store.refreshState();

      const fixture = TestBed.createComponent(TestableCardView);
      const fullWidthSpy = spyOn(
        fixture.componentInstance,
        'onFullWidthChanged'
      );
      fixture.componentInstance.cardId = 'card1';
      fixture.detectChanges();

      // Toggle on.
      const button = fixture.debugElement.query(
        By.css('[aria-label="Toggle actual image size"]')
      );
      button.nativeElement.click();
      fixture.detectChanges();

      // Enable global setting.
      store.overrideSelector(selectors.getMetricsImageShowActualSize, true);
      store.refreshState();
      fixture.detectChanges();

      // Disable global setting.
      store.overrideSelector(selectors.getMetricsImageShowActualSize, false);
      store.refreshState();
      fixture.detectChanges();

      const imgCardEl = fixture.debugElement.query(
        By.css('image-card-component')
      );
      expect(imgCardEl.classes['actual-size']).toBe(true);
      expect(fullWidthSpy.calls.mostRecent().args).toEqual([true]);
    });
  });

  describe('linked time', () => {
    // The left and margin-left style for an image card with 4 ticks.
    const TICKS_STYLE = [
      'left: 0%; margin-left: 0px;',
      'left: 33.3333%; margin-left: -4px;',
      'left: 66.6667%; margin-left: -8px;',
      'left: 100%; margin-left: -12px;',
    ];

    describe('ticks', () => {
      beforeEach(() => {
        const timeSeries = [
          {wallTime: 100, imageId: 'ImageId1', step: 10},
          {wallTime: 101, imageId: 'ImageId2', step: 20},
          {wallTime: 102, imageId: 'ImageId3', step: 30},
          {wallTime: 103, imageId: 'ImageId4', step: 40},
        ];
        provideMockCardSeriesData(
          selectSpy,
          PluginType.IMAGES,
          'card1',
          null /* metadataOverride */,
          timeSeries
        );
      });

      it('renders a single tick on linked time selection', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 10},
          end: null,
        });

        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();

        const dots = fixture.debugElement.queryAll(
          By.css('.linked-time-wrapper .linked-time-tick')
        );
        expect(dots.length).toBe(1);
        expect(dots[0].nativeElement.getAttribute('style')).toBe(
          TICKS_STYLE[0]
        );
      });

      it('renders a single tick at correct propositional position', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 20},
          end: null,
        });

        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();
        const dot = fixture.debugElement.query(
          By.css('.linked-time-wrapper .linked-time-tick')
        );

        expect(dot.nativeElement.getAttribute('style')).toBe(TICKS_STYLE[1]);
      });

      it('renders ticks when steps are within linked time selection', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 15},
          end: {step: 35},
        });

        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();

        const dots = fixture.debugElement.queryAll(
          By.css('.linked-time-wrapper .linked-time-tick')
        );
        expect(dots.length).toBe(2);
        // The second and third tick is selected.
        expect(dots[0].nativeElement.getAttribute('style')).toBe(
          TICKS_STYLE[1]
        );
        expect(dots[1].nativeElement.getAttribute('style')).toBe(
          TICKS_STYLE[2]
        );
      });

      it('renders ticks on selected steps are particially in range', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 25},
          end: {step: 350},
        });

        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();

        const dots = fixture.debugElement.queryAll(
          By.css('.linked-time-wrapper .linked-time-tick')
        );
        // The third and fourth ticks are selected.
        expect(dots[0].nativeElement.getAttribute('style')).toBe(
          TICKS_STYLE[2]
        );
        expect(dots[1].nativeElement.getAttribute('style')).toBe(
          TICKS_STYLE[3]
        );
      });

      it('does not render ticks on selected range wrapped between steps ', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 11},
          end: {step: 14},
        });

        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();

        const dots = fixture.debugElement.queryAll(
          By.css('.linked-time-wrapper .linked-time-tick')
        );
        // The third and fourth ticks are selected.
        expect(dots.length).toBe(0);
      });
    });

    describe('thumb movement', () => {
      describe('single selection', () => {
        it('does not move slider thumb to larger closest step when it is clipped', () => {
          store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
            start: {step: 9},
            end: null,
          });
          const timeSeries = [
            {wallTime: 100, imageId: 'ImageId1', step: 10},
            {wallTime: 101, imageId: 'ImageId2', step: 20},
            {wallTime: 102, imageId: 'ImageId3', step: 30},
            {wallTime: 103, imageId: 'ImageId4', step: 40},
          ];
          provideMockCardSeriesData(
            selectSpy,
            PluginType.IMAGES,
            'card1',
            null /* metadataOverride */,
            timeSeries,
            2 /* stepIndex */
          );
          const fixture = createImageCardContainer('card1');
          fixture.detectChanges();
          let slider = fixture.debugElement.query(By.css('mat-slider input'));
          expect(slider.nativeElement.getAttribute('aria-valuetext')).toBe('2');
        });

        it('does not move slider thumb to smaller closest step when it is clipped', () => {
          store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
            // Linked time is clipped since step 41 is larger than the largest step 40.
            start: {step: 41},
            end: null,
          });
          const timeSeries = [
            {wallTime: 100, imageId: 'ImageId1', step: 10},
            {wallTime: 101, imageId: 'ImageId2', step: 20},
            {wallTime: 102, imageId: 'ImageId3', step: 30},
            {wallTime: 103, imageId: 'ImageId4', step: 40},
          ];
          provideMockCardSeriesData(
            selectSpy,
            PluginType.IMAGES,
            'card1',
            null /* metadataOverride */,
            timeSeries,
            2 /* stepIndex */
          );
          const fixture = createImageCardContainer('card1');
          fixture.detectChanges();
          let slider = fixture.debugElement.query(By.css('mat-slider input'));
          expect(slider.nativeElement.getAttribute('aria-valuetext')).toBe('2');
        });

        it('does not move slider thumb to larger closest step when it is clipped', () => {
          store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
            // Linked time is clipped since step 9 is smaller than the smallest step 10.
            start: {step: 9},
            end: null,
          });
          const timeSeries = [
            {wallTime: 100, imageId: 'ImageId1', step: 10},
            {wallTime: 101, imageId: 'ImageId2', step: 20},
            {wallTime: 102, imageId: 'ImageId3', step: 30},
            {wallTime: 103, imageId: 'ImageId4', step: 40},
          ];
          provideMockCardSeriesData(
            selectSpy,
            PluginType.IMAGES,
            'card1',
            null /* metadataOverride */,
            timeSeries,
            2 /* stepIndex */
          );
          const fixture = createImageCardContainer('card1');
          fixture.detectChanges();
          let slider = fixture.debugElement.query(By.css('mat-slider input'));
          expect(slider.nativeElement.getAttribute('aria-valuetext')).toBe('2');
        });
      });

      describe('range selection', () => {
        function createImageCardContainerWithStepIndex(stepIndex: number) {
          const timeSeries = [
            {wallTime: 100, imageId: 'ImageId1', step: 10},
            {wallTime: 101, imageId: 'ImageId2', step: 20},
            {wallTime: 102, imageId: 'ImageId3', step: 30},
            {wallTime: 103, imageId: 'ImageId4', step: 40},
          ];
          provideMockCardSeriesData(
            selectSpy,
            PluginType.IMAGES,
            'card1',
            null /* metadataOverride */,
            timeSeries,
            stepIndex /* stepIndex */
          );
          const fixture = createImageCardContainer('card1');
          fixture.detectChanges();

          return fixture;
        }

        function getSliderThumbPosition(
          fixture: ComponentFixture<ImageCardContainer>
        ) {
          const thumb = fixture.debugElement.query(By.css('mat-slider input'));
          return thumb.nativeElement.getAttribute('aria-valuetext');
        }

        it('does not moves slider thumb when linked time selection is clipped', () => {
          store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
            start: {step: 55},
            end: {step: 65},
          });
          const fixture = createImageCardContainerWithStepIndex(2);

          expect(getSliderThumbPosition(fixture)).toBe('2');

          store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
            start: {step: 5},
            end: {step: 9},
          });
          const fixture2 = createImageCardContainerWithStepIndex(2);

          expect(getSliderThumbPosition(fixture2)).toBe('2');
        });
      });
    });

    describe('linkedTimeSelection beyond range of data', () => {
      it('clips the linkedTimeSelection to max step', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 45},
          end: {step: 50},
        });
        const timeSeries = [
          {wallTime: 100, imageId: 'ImageId1', step: 10},
          {wallTime: 101, imageId: 'ImageId2', step: 20},
          {wallTime: 102, imageId: 'ImageId3', step: 30},
          {wallTime: 103, imageId: 'ImageId4', step: 40},
        ];
        provideMockCardSeriesData(
          selectSpy,
          PluginType.IMAGES,
          'card1',
          null /* metadataOverride */,
          timeSeries
        );
        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();
        const timeSelectionChangeSpy = jasmine.createSpy();
        fixture.componentInstance.linkedTimeSelection$!.subscribe(
          timeSelectionChangeSpy
        );
        fixture.detectChanges();

        expect(timeSelectionChangeSpy).toHaveBeenCalledWith({
          startStep: 40,
          endStep: 40,
          clipped: true,
        });
      });

      it('clips the linkedTimeSelection to min step when it is too small', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 5},
          end: {step: 8},
        });
        const timeSeries = [
          {wallTime: 100, imageId: 'ImageId1', step: 10},
          {wallTime: 101, imageId: 'ImageId2', step: 20},
          {wallTime: 102, imageId: 'ImageId3', step: 30},
          {wallTime: 103, imageId: 'ImageId4', step: 40},
        ];
        provideMockCardSeriesData(
          selectSpy,
          PluginType.IMAGES,
          'card1',
          null /* metadataOverride */,
          timeSeries
        );
        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();

        const timeSelectionChangeSpy = jasmine.createSpy();
        fixture.componentInstance.linkedTimeSelection$!.subscribe(
          timeSelectionChangeSpy
        );

        expect(timeSelectionChangeSpy).toHaveBeenCalledWith({
          startStep: 10,
          endStep: 10,
          clipped: true,
        });
      });

      it('renders warning when the linkedTimeSelection is clipped', () => {
        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 5},
          end: {step: 8},
        });
        const timeSeries = [
          {wallTime: 100, imageId: 'ImageId1', step: 10},
          {wallTime: 101, imageId: 'ImageId2', step: 20},
          {wallTime: 102, imageId: 'ImageId3', step: 30},
          {wallTime: 103, imageId: 'ImageId4', step: 40},
        ];
        provideMockCardSeriesData(
          selectSpy,
          PluginType.IMAGES,
          'card1',
          null /* metadataOverride */,
          timeSeries
        );
        const fixture = createImageCardContainer('card1');
        fixture.detectChanges();

        const indicatorBefore = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warning mat-icon[data-value="clipped"]'
          )
        );
        expect(indicatorBefore).toBeTruthy();

        store.overrideSelector(selectors.getMetricsLinkedTimeSelection, {
          start: {step: 0},
          end: {step: 100},
        });
        store.refreshState();
        fixture.detectChanges();
        const indicatorAfter = fixture.debugElement.query(
          By.css(
            'vis-linked-time-selection-warningmat-icon[data-value="clipped"]'
          )
        );
        expect(indicatorAfter).toBeNull();
      });
    });
  });
});
