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
import {
  Component,
  EventEmitter,
  Input,
  NO_ERRORS_SCHEMA,
  Output,
} from '@angular/core';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import * as selectors from '../../../selectors';
import {
  getCardStateMap,
  getMetricsCardMinWidth,
  getMetricsTagGroupExpansionState,
} from '../../../selectors';
import {selectors as settingsSelectors} from '../../../settings';
import {provideMockTbStore} from '../../../testing/utils';
import {PluginType} from '../../data_source';
import {CardIdWithMetadata} from '../metrics_view_types';
import {CardGridComponent} from './card_grid_component';
import {CardGridContainer} from './card_grid_container';

const scrollElementHeight = 100;

@Component({
  standalone: false,
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

/**
 * Stub 'card-view' component for ease of testing.
 */
@Component({standalone: false, selector: 'card-view'})
class TestableCardView {
  @Output() fullHeightChanged = new EventEmitter<boolean>();
  @Output() fullWidthChanged = new EventEmitter<boolean>();
}

describe('card grid', () => {
  let store: MockStore<State>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ScrollingModule],
      declarations: [
        CardGridComponent,
        CardGridContainer,
        TestableCardView,
        TestableScrollingContainer,
      ],
      providers: [provideMockTbStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(selectors.getRunColorMap, {});
    store.overrideSelector(getMetricsTagGroupExpansionState, true);
    store.overrideSelector(getMetricsCardMinWidth, 30);
    store.overrideSelector(settingsSelectors.getPageSize, 10);
    store.overrideSelector(getCardStateMap, {});
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

  describe('card dimensions', () => {
    let fixture: ComponentFixture<TestableScrollingContainer>;

    function createComponent() {
      fixture = TestBed.createComponent(TestableScrollingContainer);
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
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card3',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
      ];
      fixture.detectChanges();

      return fixture;
    }

    it('shows cards at min dimensions by default', () => {
      const fixture = createComponent();
      const cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[0].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[1].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[2].nativeElement.classList).not.toContain('full-width');
    });

    it('changes height after card event', () => {
      const fixture = createComponent();
      const cardViews = fixture.debugElement.queryAll(By.css('card-view'));
      const cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));

      cardViews[1].componentInstance.fullHeightChanged.emit(true);
      fixture.detectChanges();
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      cardViews[0].componentInstance.fullHeightChanged.emit(true);
      fixture.detectChanges();
      expect(cardSpaces[0].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      cardViews[1].componentInstance.fullHeightChanged.emit(false);
      fixture.detectChanges();
      expect(cardSpaces[0].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[1].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      cardViews[0].componentInstance.fullHeightChanged.emit(false);
      fixture.detectChanges();
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );
    });

    it('does not change height if emitted value is same', () => {
      const fixture = createComponent();
      const cardViews = fixture.debugElement.queryAll(By.css('card-view'));
      const cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));

      cardViews[1].componentInstance.fullHeightChanged.emit(true);
      fixture.detectChanges();
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      cardViews[0].componentInstance.fullHeightChanged.emit(false);
      fixture.detectChanges();
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      cardViews[1].componentInstance.fullHeightChanged.emit(true);
      fixture.detectChanges();
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );
    });

    it('renders card width based on card state table expanded', () => {
      store.overrideSelector(getCardStateMap, {card2: {tableExpanded: true}});
      let fixture = createComponent();
      let cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      store.overrideSelector(getCardStateMap, {
        card1: {tableExpanded: true},
        card2: {tableExpanded: true},
      });
      fixture = createComponent();
      cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      store.overrideSelector(getCardStateMap, {
        card1: {tableExpanded: false},
        card2: {tableExpanded: true},
      });
      fixture = createComponent();
      cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).toContain('full-height');
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );

      store.overrideSelector(getCardStateMap, {});
      fixture = createComponent();
      cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[1].nativeElement.classList).not.toContain(
        'full-height'
      );
      expect(cardSpaces[2].nativeElement.classList).not.toContain(
        'full-height'
      );
    });

    it('renders card width based on card state full width', () => {
      store.overrideSelector(getCardStateMap, {card3: {fullWidth: true}});
      let fixture = createComponent();
      let cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[1].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[2].nativeElement.classList).toContain('full-width');

      store.overrideSelector(getCardStateMap, {
        card2: {fullWidth: true},
        card3: {fullWidth: true},
      });
      fixture = createComponent();
      cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[1].nativeElement.classList).toContain('full-width');
      expect(cardSpaces[2].nativeElement.classList).toContain('full-width');

      store.overrideSelector(getCardStateMap, {
        card2: {fullWidth: false},
        card3: {fullWidth: true},
      });
      fixture = createComponent();
      cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[1].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[2].nativeElement.classList).toContain('full-width');

      store.overrideSelector(getCardStateMap, {});
      fixture = createComponent();
      cardSpaces = fixture.debugElement.queryAll(By.css('.card-space'));
      expect(cardSpaces[0].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[1].nativeElement.classList).not.toContain('full-width');
      expect(cardSpaces[2].nativeElement.classList).not.toContain('full-width');
    });
  });
});
