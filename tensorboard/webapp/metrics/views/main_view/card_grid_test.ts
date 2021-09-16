import {ScrollingModule} from '@angular/cdk/scrolling';
import {Component, Input} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {PluginType} from '../../data_source';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {CardLazyLoader, CardObserver} from '../card_renderer/card_lazy_loader';

import {CardGridComponent} from './card_grid_component';
import {CardGridContainer} from './card_grid_container';
import {CardViewComponent} from '../card_renderer/card_view_component';
import {CardViewContainer} from '../card_renderer/card_view_container';
import {CardIdWithMetadata} from '../metrics_view_types';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {appStateFromMetricsState} from '../../testing';
import {State} from '../../../app_state';
import {selectors as settingsSelectors} from '../../../settings';
import * as selectors from '../../../selectors';

const scrollElementHeight = 100;

// Utility funciton to allow use of await.
function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        display: block;
        height: ${scrollElementHeight}px;
        overflow-y: scroll;
      }
      .placeholder {
        position: relative;
        height: 700px;
        display: block;
      }
    `,
  ],
})
class TestableComponent {
  @Input() groupName: string = 'test group name';
  @Input() cardIdsWithMetadata: CardIdWithMetadata[] = [
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
  @Input() cardObserver: CardObserver = new CardObserver();
}

describe('card grid', () => {
  let store: MockStore<State>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ScrollingModule],
      declarations: [
        CardGridComponent,
        CardGridContainer,
        TestableComponent,
        CardViewComponent,
        CardViewContainer,
        CardLazyLoader,
      ],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(),
        }),
      ],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(selectors.getRunColorMap, {});
  });

  fit('keeps pagination button position when page size changes', async () => {
    store.overrideSelector(settingsSelectors.getPageSize, 2);
    let scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();
    const nextButtons = fixture.debugElement
      .queryAll(By.css('.next'))
      .map((nextDebugElements) => {
        return nextDebugElements.nativeElement!;
      });
    const previousButtons = fixture.debugElement
      .queryAll(By.css('.prev'))
      .map((nextDebugElements) => {
        return nextDebugElements.nativeElement!;
      });
    const PaginationInput: HTMLInputElement = fixture.debugElement.query(
      By.css('input')
    ).nativeElement;
    const scrollingElement = fixture.nativeElement.children[0];

    // Test scrolling adjustements on bottom next button.
    scrollingElement.scrollTo(0, nextButtons[1].offsetTop - scrollOffset);
    fixture.detectChanges();
    nextButtons[1].click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    await timeout(0);
    expect(nextButtons[1].offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustements on top previous button.
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(0, previousButtons[0].offsetTop - scrollOffset);
    fixture.detectChanges();
    previousButtons[0].click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    await timeout(0);
    expect(previousButtons[0].offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustements on top next button.
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(0, nextButtons[0].offsetTop - scrollOffset);
    fixture.detectChanges();
    nextButtons[0].click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    await timeout(0);
    expect(nextButtons[0].offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test scrolling adjustements on bottom previous button.
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(0, previousButtons[1].offsetTop - scrollOffset);
    fixture.detectChanges();
    previousButtons[1].click();
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    await timeout(0);
    expect(previousButtons[1].offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );

    // Test changes to input.
    scrollOffset = Math.floor(Math.random() * scrollElementHeight);
    scrollingElement.scrollTo(0, PaginationInput.offsetTop - scrollOffset);
    fixture.detectChanges();
    PaginationInput.value = '2';
    PaginationInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // Clear call stack to invoke the scroll adjustement logic.
    await timeout(0);
    expect(PaginationInput.offsetTop - scrollingElement.scrollTop).toEqual(
      scrollOffset
    );
  });
});
