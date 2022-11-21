/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {ScrollingModule} from '@angular/cdk/scrolling';
import {Component, Input, NO_ERRORS_SCHEMA} from '@angular/core';
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import * as selectors from '../../../selectors';
import {
  getMetricsCardMinWidth,
  getMetricsStepSelectorEnabled,
  getMetricsTagGroupExpansionState,
  getMetricsXAxisType,
} from '../../../selectors';
import {selectors as settingsSelectors} from '../../../settings';
import {PluginType} from '../../data_source';
import {XAxisType} from '../../types';
import {CardIdWithMetadata} from '../metrics_view_types';
import {CardGridComponent} from './card_grid_component';
import {CardGridContainer} from './card_grid_container';

const scrollElementHeight = 100;

@Component({
  selector: 'testable-scrolling-container',
  template: `
    <div cdkScrollable>
      <div class="placeholder">placeholder</div>
      <metrics-card-grid
        [cardIdsWithMetadata]="cardIdsWithMetadata"
        [cardObserver]="cardObserver"
        [groupName]="groupName"
      ></metrics-card-grid>
      <div class="placeholder">placeholder</div>
    </div>
  `,
  styles: [
    `
      div {
        position: fixed;
        height: ${scrollElementHeight}px;
        overflow-y: scroll;
      }
      .placeholder {
        position: relative;
        height: 700px;
      }
    `,
  ],
})
class TestableScrollingContainer {
  @Input() cardIdsWithMetadata: CardIdWithMetadata[] = [];
}

describe('card grid', () => {
  let store: MockStore<State>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ScrollingModule],
      declarations: [
        CardGridComponent,
        CardGridContainer,
        TestableScrollingContainer,
      ],
      providers: [provideMockStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(selectors.getRunColorMap, {});
    store.overrideSelector(getMetricsTagGroupExpansionState, true);
    store.overrideSelector(getMetricsCardMinWidth, 30);
    store.overrideSelector(settingsSelectors.getPageSize, 10);
    store.overrideSelector(getMetricsStepSelectorEnabled, false);
    store.overrideSelector(getMetricsXAxisType, XAxisType.STEP);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('keeps pagination button position when page size changes', fakeAsync(() => {
    store.overrideSelector(settingsSelectors.getPageSize, 2);
    let scrollOffset = 30;
    const fixture = TestBed.createComponent(TestableScrollingContainer);
    // With 3 cards and a page size of 2 the number of cards on a page changes
    // from 2 to 1 when going from the first to second page. This is crucial for
    // this test.
    fixture.componentInstance.cardIdsWithMetadata = [
      {
        cardId: 'card1',
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      },
      {
        cardId: 'card2',
        plugin: PluginType.SCALARS,
        tag: 'tagA/Images',
        runId: 'run1',
        sample: 0,
      },
      {
        cardId: 'card3',
        plugin: PluginType.SCALARS,
        tag: 'tagB/meow/cat',
        runId: 'run1',
        sample: 0,
      },
    ];
    fixture.detectChanges();
    const [topNextButtons, bottomNextButtons] = fixture.debugElement
      .queryAll(By.css('.next'))
      .map((nextDebugElements) => {
        return nextDebugElements.nativeElement!;
      });
    const [topPreviousButtons, bottomPreviousButtons] = fixture.debugElement
      .queryAll(By.css('.prev'))
      .map((nextDebugElements) => {
        return nextDebugElements.nativeElement!;
      });
    const PaginationInput: HTMLInputElement = fixture.debugElement.query(
      By.css('input')
    ).nativeElement;
    const scrollingElement = fixture.nativeElement.children[0];

    // Test scrolling adjustments on bottom next button.
    scrollingElement.scrollTo(0, bottomNextButtons.offsetTop - scrollOffset);
    bottomNextButtons.click();
    fixture.detectChanges();
    // To ensure the click did change the size of the CardGrid ensure make sure
    // the button has moved.
    expect(
      bottomNextButtons.offsetTop - scrollingElement.scrollTop
    ).not.toEqual(scrollOffset);
    // Clear call stack to invoke the scroll adjustement logic.
    tick(0);
    expect(bottomNextButtons.offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustments on top previous button.
    scrollingElement.scrollTo(0, topPreviousButtons.offsetTop - scrollOffset);
    topPreviousButtons.click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    tick(0);
    expect(topPreviousButtons.offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustments on top next button.
    scrollingElement.scrollTo(0, topNextButtons.offsetTop - scrollOffset);
    topNextButtons.click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    tick(0);
    expect(topNextButtons.offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustments on bottom previous button.
    scrollingElement.scrollTo(
      0,
      bottomPreviousButtons.offsetTop - scrollOffset
    );
    bottomPreviousButtons.click();
    fixture.detectChanges();
    // To ensure the click did change the size of the CardGrid ensure make sure
    // the button has moved.
    expect(
      bottomPreviousButtons.offsetTop - scrollingElement.scrollTop
    ).not.toEqual(scrollOffset);
    // Clear call stack to invoke the scroll adjustement logic.
    tick(0);
    expect(
      bottomPreviousButtons.offsetTop - scrollingElement.scrollTop
    ).toEqual(scrollOffset);

    // Test changes to input.
    scrollingElement.scrollTo(0, PaginationInput.offsetTop - scrollOffset);
    PaginationInput.value = '2';
    PaginationInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // To ensure the click did change the size of the CardGrid ensure make sure
    // the next button has moved.
    expect(PaginationInput.offsetTop - scrollingElement.scrollTop).not.toEqual(
      scrollOffset
    );
    // Clear call stack to invoke the scroll adjustement logic.
    tick(0);
    expect(PaginationInput.offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );
    discardPeriodicTasks();
  }));

  describe('step selector', () => {
    it('updates scalar card height when step selector is enabled', fakeAsync(() => {
      store.overrideSelector(getMetricsStepSelectorEnabled, true);
      const fixture = TestBed.createComponent(TestableScrollingContainer);
      fixture.componentInstance.cardIdsWithMetadata = [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
      ];
      fixture.detectChanges();

      const scalarCardViewElement = fixture.debugElement.query(
        By.css('card-view')
      ).nativeElement;

      expect(scalarCardViewElement.classList).toContain('height-with-table');
    }));

    it('does not update card height when step selector is disabled', fakeAsync(() => {
      store.overrideSelector(getMetricsStepSelectorEnabled, false);
      const fixture = TestBed.createComponent(TestableScrollingContainer);
      fixture.componentInstance.cardIdsWithMetadata = [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB',
          runId: 'run1',
        },
      ];
      fixture.detectChanges();

      const cardViewElements = fixture.debugElement
        .queryAll(By.css('card-view'))
        .map((debugElement) => debugElement.nativeElement);

      expect(cardViewElements[0].classList).not.toContain('height-with-table');
      expect(cardViewElements[1].classList).not.toContain('height-with-table');
    }));

    it('does not update card height when step selector is enabled but axis type is RELATIVE', fakeAsync(() => {
      store.overrideSelector(getMetricsStepSelectorEnabled, true);
      store.overrideSelector(getMetricsXAxisType, XAxisType.RELATIVE);
      const fixture = TestBed.createComponent(TestableScrollingContainer);
      fixture.componentInstance.cardIdsWithMetadata = [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB',
          runId: 'run1',
        },
      ];
      fixture.detectChanges();

      const cardViewElements = fixture.debugElement
        .queryAll(By.css('card-view'))
        .map((debugElement) => debugElement.nativeElement);

      expect(cardViewElements[0].classList).not.toContain('height-with-table');
      expect(cardViewElements[1].classList).not.toContain('height-with-table');
    }));

    it('does not update card height when step selector is enabled but axis type is WALL_TIME', fakeAsync(() => {
      store.overrideSelector(getMetricsStepSelectorEnabled, true);
      store.overrideSelector(getMetricsXAxisType, XAxisType.WALL_TIME);
      const fixture = TestBed.createComponent(TestableScrollingContainer);
      fixture.componentInstance.cardIdsWithMetadata = [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB',
          runId: 'run1',
        },
      ];
      fixture.detectChanges();

      const cardViewElements = fixture.debugElement
        .queryAll(By.css('card-view'))
        .map((debugElement) => debugElement.nativeElement);

      expect(cardViewElements[0].classList).not.toContain('height-with-table');
      expect(cardViewElements[1].classList).not.toContain('height-with-table');
    }));

    it('does not update non-scalar card height when step selector is enabled', fakeAsync(() => {
      store.overrideSelector(getMetricsStepSelectorEnabled, true);
      const fixture = TestBed.createComponent(TestableScrollingContainer);
      fixture.componentInstance.cardIdsWithMetadata = [
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagB',
          runId: 'run1',
        },
        {
          cardId: 'card2',
          plugin: PluginType.HISTOGRAMS,
          tag: 'tagA',
          runId: 'run2',
        },
      ];
      fixture.detectChanges();

      const nonScalarCardViewElements = fixture.debugElement
        .queryAll(By.css('card-view'))
        .map((debugElement) => debugElement.nativeElement);

      expect(nonScalarCardViewElements[0].classList).not.toContain(
        'height-with-table'
      );
      expect(nonScalarCardViewElements[1].classList).not.toContain(
        'height-with-table'
      );
    }));
  });
});
