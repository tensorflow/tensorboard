import {ScrollingModule} from '@angular/cdk/scrolling';
import {Component, Input, NO_ERRORS_SCHEMA} from '@angular/core';
import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {PluginType} from '../../data_source';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {CardObserver} from '../card_renderer/card_lazy_loader';

import {CardGridComponent} from './card_grid_component';
import {CardGridContainer} from './card_grid_container';
import {CardIdWithMetadata} from '../metrics_view_types';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {appStateFromMetricsState} from '../../testing';
import {State} from '../../../app_state';
import {selectors as settingsSelectors} from '../../../settings';
import * as selectors from '../../../selectors';

const scrollElementHeight = 100;

@Component({
  selector: 'testing-component',
  template: `
    <div cdkScrollable>
      <div class="placeholder">placeholder</div>
      <metrics-card-grid
        [cardIdsWithMetadata]="cardIdsWithMetadata"
        [cardObserver]="cardObserver"
        [groupName]="cardObserver"
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
class TestableComponent {
  @Input() groupName: string = 'test group name';
  @Input() cardIdsWithMetadata: CardIdWithMetadata[] = [];
  @Input() cardObserver: CardObserver = new CardObserver();
}

describe('card grid', () => {
  let store: MockStore<State>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ScrollingModule],
      declarations: [CardGridComponent, CardGridContainer, TestableComponent],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(),
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(selectors.getRunColorMap, {});
  });

  fit('keeps pagination button position when page size changes', fakeAsync(() => {
    store.overrideSelector(settingsSelectors.getPageSize, 2);
    let scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    const fixture = TestBed.createComponent(TestableComponent);
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
    const [
      topPreviousButtons,
      bottomPreviousButtons,
    ] = fixture.debugElement
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
    fixture.detectChanges();
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
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(0, topPreviousButtons.offsetTop - scrollOffset);
    fixture.detectChanges();
    topPreviousButtons.click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    tick(0);
    expect(topPreviousButtons.offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustments on top next button.
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(0, topNextButtons.offsetTop - scrollOffset);
    fixture.detectChanges();
    topNextButtons.click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    tick(0);
    expect(topNextButtons.offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustments on bottom previous button.
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(
      0,
      bottomPreviousButtons.offsetTop - scrollOffset
    );
    fixture.detectChanges();
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
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(0, PaginationInput.offsetTop - scrollOffset);
    fixture.detectChanges();
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
});
