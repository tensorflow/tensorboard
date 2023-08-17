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
import {OverlayContainer} from '@angular/cdk/overlay';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {sendKeys} from '../../../testing/dom';
import {getAutocompleteOptions} from '../../../testing/material';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {metricsTagFilterChanged} from '../../actions';
import {PluginType} from '../../data_source';
import * as selectors from '../../store/metrics_selectors';
import {appStateFromMetricsState, buildMetricsState} from '../../testing';
import {MetricsFilterInputComponent} from './filter_input_component';
import {MetricsFilterInputContainer} from './filter_input_container';

describe('metrics filter input', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatIconTestingModule,
        FilterInputModule,
      ],
      declarations: [MetricsFilterInputComponent, MetricsFilterInputContainer],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(buildMetricsState()),
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    overlayContainer = TestBed.inject(OverlayContainer);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });

    store.overrideSelector(selectors.getMetricsTagFilter, '');
    store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
      {
        cardId: 'card1',
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      },
      {
        cardId: 'card1',
        plugin: PluginType.IMAGES,
        tag: 'tagA/Images',
        runId: 'run1',
        sample: 0,
      },
      {
        cardId: 'card3',
        plugin: PluginType.IMAGES,
        tag: 'tagB/meow/cat',
        runId: 'run1',
        sample: 0,
      },
    ]);
    store.overrideSelector(
      selectors.getMetricsFilteredPluginTypes,
      new Set<PluginType>()
    );
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('input interaction', () => {
    it('dispatches metricsTagFilterChanged when typing on input', () => {
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      sendKeys(fixture, input, 'ab');

      expect(dispatchedActions).toEqual([
        metricsTagFilterChanged({tagFilter: 'a'}),
        metricsTagFilterChanged({tagFilter: 'ab'}),
      ]);
    });
  });

  describe('autocomplete', () => {
    it('shows all tags on focus', () => {
      store.overrideSelector(selectors.getMetricsTagFilter, '');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['tagA', 'tagA/Images', 'tagB/meow/cat']
      );
    });

    it('truncates to 25 tags when there are more', () => {
      const cards = [...new Array(30)].map((_, index) => {
        return {
          cardId: `card${index}`,
          plugin: PluginType.SCALARS,
          tag: `tag${index}`,
          runId: null,
        };
      });
      const tags = cards.map(({tag}) => tag);
      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, cards);
      store.overrideSelector(selectors.getMetricsTagFilter, '');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        tags.slice(0, 25)
      );
      expect(
        overlayContainer.getContainerElement().querySelector('.and-more')!
          .textContent
      ).toEqual('and 5 more tags matched');

      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        cards.slice(0, 25)
      );
      store.refreshState();
      fixture.detectChanges();
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        tags.slice(0, 25)
      );
      expect(
        overlayContainer.getContainerElement().querySelector('.and-more')
      ).toBeNull();
    });

    it('renders empty when no tags match', () => {
      store.overrideSelector(
        selectors.getMetricsTagFilter,
        'YOU CANNOT MATCH ME'
      );
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        []
      );
    });

    it('filters by plugin type when filteredPluginTypes is non-empty', () => {
      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set<PluginType>([])
      );
      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB/Images',
          runId: 'run1',
          sample: 0,
        },
        {
          cardId: 'card2',
          plugin: PluginType.HISTOGRAMS,
          tag: 'tagC/woof',
          runId: 'run1',
          sample: 0,
        },
      ]);
      store.overrideSelector(selectors.getMetricsTagFilter, '');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const optionBefore = getAutocompleteOptions(overlayContainer);
      expect(
        optionBefore.map((option) => option.nativeElement.textContent)
      ).toEqual(['tagA', 'tagB/Images', 'tagC/woof']);

      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set<PluginType>([PluginType.SCALARS, PluginType.HISTOGRAMS])
      );

      store.refreshState();
      fixture.detectChanges();

      const optionAfter = getAutocompleteOptions(overlayContainer);
      expect(
        optionAfter.map((option) => option.nativeElement.textContent)
      ).toEqual(['tagA', 'tagC/woof']);
    });

    it('filters de-duplicating tags', () => {
      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set<PluginType>([])
      );
      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB/Images',
          runId: 'run1',
          sample: 0,
        },
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB/Images',
          runId: 'run1',
          sample: 1,
        },
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB/Images',
          runId: 'run1',
          sample: 2,
        },
      ]);
      store.overrideSelector(selectors.getMetricsTagFilter, '');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const optionBefore = getAutocompleteOptions(overlayContainer);
      expect(
        optionBefore.map((option) => option.nativeElement.textContent)
      ).toEqual(['tagA', 'tagB/Images']);
    });

    it('filters by regex', () => {
      store.overrideSelector(selectors.getMetricsTagFilter, '[/I]m');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['tagA/Images', 'tagB/meow/cat']
      );
    });

    it('filters by regex ignoring casing', () => {
      store.overrideSelector(selectors.getMetricsTagFilter, '[ib]');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['tagA/Images', 'tagB/meow/cat']
      );
    });

    it('responds to input changes', () => {
      store.overrideSelector(selectors.getMetricsTagFilter, '');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      store.overrideSelector(selectors.getMetricsTagFilter, 'tagA$');
      store.refreshState();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['tagA']
      );
    });

    it('dispatches action when clicking on option', () => {
      store.overrideSelector(selectors.getMetricsTagFilter, '');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      options[0].nativeElement.click();

      expect(dispatchedActions).toEqual([
        metricsTagFilterChanged({tagFilter: 'tagA'}),
      ]);
    });

    it('applies a regex-escaped version upon clicking the option', () => {
      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA.(foo)',
          runId: null,
        },
      ]);
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.focus();
      fixture.detectChanges();

      const options = getAutocompleteOptions(overlayContainer);
      expect(options.map((option) => option.nativeElement.textContent)).toEqual(
        ['tagA.(foo)']
      );

      options[0].nativeElement.click();

      expect(dispatchedActions).toEqual([
        metricsTagFilterChanged({tagFilter: 'tagA\\.\\(foo\\)'}),
      ]);
    });

    it('shows error icon for an invalid regex', () => {
      store.overrideSelector(selectors.getMetricsTagFilter, '*');
      const fixture = TestBed.createComponent(MetricsFilterInputContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.error-icon'))).not.toBeNull();
    });
  });
});
