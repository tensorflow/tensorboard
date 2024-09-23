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
import {
  Component,
  DebugElement,
  Input,
  NO_ERRORS_SCHEMA,
  Type,
} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of, ReplaySubject} from 'rxjs';
import {State} from '../../../app_state';
import {CustomizationModule} from '../../../customization/customization_module';
import * as selectors from '../../../selectors';
import {
  getMetricsCardMinWidth,
  getMetricsTagGroupExpansionState,
} from '../../../selectors';
import {selectors as settingsSelectors} from '../../../settings';
import {KeyType, sendKey, sendKeys} from '../../../testing/dom';
import {DataLoadState} from '../../../types/data';
import {RunColorScale} from '../../../types/ui';
import * as actions from '../../actions';
import {PluginType} from '../../data_source';
import {
  appStateFromMetricsState,
  buildMetricsState,
  createCardMetadata,
} from '../../testing';
import {CardId} from '../../types';
import {CardLazyLoader, CardObserver} from '../card_renderer/card_lazy_loader';
import {CardIdWithMetadata} from '../metrics_view_types';
import {CardGridComponent} from './card_grid_component';
import {CardGridContainer} from './card_grid_container';
import {CardGroupsComponent} from './card_groups_component';
import {CardGroupsContainer} from './card_groups_container';
import {CardGroupToolBarComponent} from './card_group_toolbar_component';
import {CardGroupToolBarContainer} from './card_group_toolbar_container';
import * as common_selectors from './common_selectors';
import {EmptyTagMatchMessageComponent} from './empty_tag_match_message_component';
import {EmptyTagMatchMessageContainer} from './empty_tag_match_message_container';
import {FilteredViewComponent} from './filtered_view_component';
import {
  FilteredViewContainer,
  FILTER_VIEW_DEBOUNCE_IN_MS,
} from './filtered_view_container';
import {MainViewComponent, SHARE_BUTTON_COMPONENT} from './main_view_component';
import {MainViewContainer} from './main_view_container';
import {PinnedViewComponent} from './pinned_view_component';
import {PinnedViewContainer} from './pinned_view_container';
import {buildMockState} from '../../../testing/utils';

@Component({
  standalone: false,
  selector: 'card-view',
  template: `{{ pluginType }}: {{ cardId }}`,
})
class TestableCard {
  @Input() pluginType!: PluginType;
  @Input() cardId!: CardId;
  @Input() runColorScale!: RunColorScale;
}

@Component({
  standalone: false,
  selector: 'test-share-button',
  template: ``,
})
class TestShareButtonContainer {}

function createNScalarCards(size: number, tag: string = 'tagA') {
  return [...new Array(size)].map((unused, index) => {
    return {
      cardId: `card${index}`,
      plugin: PluginType.SCALARS,
      tag: `${tag}/Scalars_${index}`,
      runId: null,
    };
  });
}

const EXPAND_BUTTON = By.css('[aria-label="Expand group"]');
const PAGINATION_INPUT = By.css('.pagination-input');

describe('metrics main view', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[] = [];

  function getCardGroupNames(debugElement: DebugElement): string[] {
    return debugElement
      .queryAll(By.css('metrics-card-groups .group-title'))
      .map((debugEl) => debugEl.nativeElement.textContent);
  }

  function getCardGroupCounts(
    fixture: ComponentFixture<MainViewContainer>
  ): string[] {
    return fixture.debugElement
      .queryAll(By.css('metrics-card-groups .group-toolbar'))
      .map((debugEl) => {
        const debugCardCount = debugEl.query(By.css('.group-card-count'));
        return debugCardCount ? debugCardCount.nativeElement.textContent : '';
      });
  }

  function getCardsInGroup(
    fixture: ComponentFixture<MainViewContainer>,
    groupIndex: number
  ) {
    const groups = fixture.debugElement.queryAll(By.css('.card-group'));
    expect(groups.length).toBeGreaterThan(groupIndex);
    return getCards(groups[groupIndex]);
  }

  function getCards(debugElement: DebugElement) {
    return debugElement.queryAll(By.css('card-view'));
  }

  function getCardContents(debugElements: DebugElement[]): string[] {
    return debugElements.map((debugEl) => debugEl.nativeElement.textContent);
  }

  function getCardLazyLoaders(
    cardDebugElements: DebugElement[]
  ): CardLazyLoader[] {
    return cardDebugElements.map((debugElement) => {
      return debugElement.injector.get(CardLazyLoader);
    });
  }

  function assertPagination(
    fixture: ComponentFixture<MainViewContainer>,
    currentIndex: number,
    size: number
  ) {
    const pagination = fixture.debugElement.query(PAGINATION_INPUT);
    expect(pagination).toBeDefined();

    const indexText = pagination.query(By.css('input')).nativeElement.value;
    const otherText = pagination.nativeElement.textContent;
    expect(`${indexText}${otherText}`).toEqual(`${currentIndex} of ${size}`);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [
        CardGridComponent,
        CardGridContainer,
        CardGroupsComponent,
        CardGroupsContainer,
        CardGroupToolBarComponent,
        CardGroupToolBarContainer,
        EmptyTagMatchMessageComponent,
        EmptyTagMatchMessageContainer,
        FilteredViewComponent,
        FilteredViewContainer,
        MainViewComponent,
        MainViewContainer,
        PinnedViewComponent,
        PinnedViewContainer,
        TestableCard,
        CardLazyLoader,
      ],
      providers: [
        provideMockStore({
          initialState: {
            ...buildMockState({
              ...appStateFromMetricsState(buildMetricsState()),
            }),
          },
        }),
      ],
      // Skip errors for card renderers, which are tested separately.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    dispatchedActions = [];
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
    store.overrideSelector(settingsSelectors.getPageSize, 10);
    store.overrideSelector(selectors.getMetricsTagFilter, '');
    store.overrideSelector(getMetricsTagGroupExpansionState, false);
    store.overrideSelector(
      selectors.getCurrentRouteRunSelection,
      new Map<string, boolean>()
    );
    store.overrideSelector(selectors.getRunColorMap, {});
    store.overrideSelector(
      selectors.getMetricsFilteredPluginTypes,
      new Set<PluginType>()
    );
    store.overrideSelector(selectors.getMetricsTagMetadataLoadState, {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    });
    store.overrideSelector(selectors.isMetricsSettingsPaneOpen, false);
    store.overrideSelector(selectors.isMetricsSlideoutMenuOpen, false);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('toolbar', () => {
    it('displays visible plugin type in the button toggle', () => {
      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set<PluginType>()
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(
        By.css('.filter-view-button')
      );
      expect(
        buttons.map((button) => button.attributes['aria-checked'])
      ).toEqual(['true', 'false', 'false', 'false']);

      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set<PluginType>([PluginType.IMAGES])
      );
      store.refreshState();
      fixture.detectChanges();
      expect(
        buttons.map((button) => button.attributes['aria-checked'])
      ).toEqual(['false', 'false', 'true', 'false']);
    });

    it('dispatches action when clicked on a plugin type', () => {
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const [, scalars, images] = fixture.debugElement.queryAll(
        By.css('.filter-view-button')
      );

      scalars.nativeElement.click();
      scalars.nativeElement.click();
      images.nativeElement.click();
      expect(dispatchedActions).toEqual([
        actions.metricsToggleVisiblePlugin({plugin: PluginType.SCALARS}),
        actions.metricsToggleVisiblePlugin({plugin: PluginType.SCALARS}),
        actions.metricsToggleVisiblePlugin({plugin: PluginType.IMAGES}),
      ]);
    });
  });

  describe('when tags are loading for the first time', () => {
    function isSpinnerVisible(
      fixture: ComponentFixture<MainViewContainer>
    ): boolean {
      return Boolean(fixture.debugElement.query(By.css('mat-spinner')));
    }

    it('shows spinner', () => {
      store.overrideSelector(selectors.getMetricsTagMetadataLoadState, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(isSpinnerVisible(fixture)).toBe(false);

      store.overrideSelector(selectors.getMetricsTagMetadataLoadState, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(isSpinnerVisible(fixture)).toBe(true);
    });

    it('hides spinner when data is loaded', () => {
      store.overrideSelector(selectors.getMetricsTagMetadataLoadState, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      });
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      store.overrideSelector(selectors.getMetricsTagMetadataLoadState, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 1,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(isSpinnerVisible(fixture)).toBe(false);
    });

    it('does not show spinner when data is reloading', () => {
      store.overrideSelector(selectors.getMetricsTagMetadataLoadState, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: 5,
      });
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(isSpinnerVisible(fixture)).toBe(false);
    });
  });

  describe('card grid', () => {
    let selectSpy: jasmine.Spy;

    beforeEach(() => {
      selectSpy = spyOn(store, 'select').and.callThrough();
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, jasmine.any(String))
        .and.throwError(
          'getMetricsTagGroupExpansionState called with unknown groupName'
        );

      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, 'tagA')
        .and.returnValue(of(true));
    });

    it('renders group by tag name', () => {
      store.overrideSelector(
        common_selectors.getSortedRenderableCardIdsWithMetadata,
        [
          {
            cardId: 'card1',
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runId: null,
          },
          {
            cardId: 'card2',
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
        ]
      );

      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      // Group name includes card count if > 1.
      expect(getCardGroupCounts(fixture)).toEqual(['2 cards', '']);
      expect(getCardGroupNames(fixture.debugElement)).toEqual(['tagA', 'tagB']);

      expect(getCardsInGroup(fixture, 0).length).toBe(2);
      expect(getCardsInGroup(fixture, 1).length).toBe(1);
    });

    it('renders plugins', async () => {
      store.overrideSelector(
        common_selectors.getSortedRenderableCardIdsWithMetadata,
        [
          {
            cardId: 'card1',
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runId: null,
          },
          {
            cardId: 'card2',
            plugin: PluginType.IMAGES,
            tag: 'tagB',
            runId: 'run1',
            sample: 0,
          },
        ]
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(getCardContents(getCards(fixture.debugElement))).toEqual([
        'scalars: card1',
        'images: card2',
      ]);
    });

    it('filters out plugin type based on filtered plugin type', () => {
      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set<PluginType>([PluginType.IMAGES, PluginType.HISTOGRAMS])
      );
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );
      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card2',
          plugin: PluginType.IMAGES,
          tag: 'tagB',
          runId: 'run1',
          sample: 0,
        },
      ]);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(getCardContents(getCards(fixture.debugElement))).toEqual([
        'images: card2',
      ]);
    });

    it('handles going from non-empty cardList to empty cardList', async () => {
      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
      ]);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();
      expect(fixture.debugElement.queryAll(By.css('.card-group')).length).toBe(
        1
      );

      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, []);
      store.refreshState();
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('.card-group')).length).toBe(
        0
      );
    });

    describe('lazy loading', () => {
      function createScalarCardMetadata(count: number) {
        const results: CardIdWithMetadata[] = [];
        for (let i = 0; i < count; i++) {
          results.push({
            cardId: `card${i}`,
            plugin: PluginType.SCALARS,
            tag: `tag${i}`,
            runId: null,
          });
        }
        return results;
      }

      function buildIntersectionObserverEntry(
        override: Partial<IntersectionObserverEntry> & {target: Element}
      ): IntersectionObserverEntry {
        return {
          time: 0,
          isIntersecting: false,
          boundingClientRect: new DOMRectReadOnly(),
          intersectionRatio: 0,
          intersectionRect: new DOMRectReadOnly(),
          rootBounds: new DOMRectReadOnly(),
          ...override,
        };
      }

      function simulateIntersection(
        cardObserver: CardObserver,
        entries: Array<Partial<IntersectionObserverEntry> & {target: Element}>
      ) {
        cardObserver.onCardIntersectionForTest(
          entries.map(buildIntersectionObserverEntry)
        );
      }

      it('reuses the same observer for multiple cards', () => {
        store.overrideSelector(
          selectors.getNonEmptyCardIdsWithMetadata,
          createScalarCardMetadata(3)
        );
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const directives = getCardLazyLoaders(getCards(fixture.debugElement));
        const cardObservers = directives.map((x) => x.cardObserver);
        expect(cardObservers.length).toBe(3);
        expect(cardObservers.every((x) => x === cardObservers[0])).toBe(true);
      });

      it('dispatches actions when observers fire', () => {
        store.overrideSelector(
          selectors.getNonEmptyCardIdsWithMetadata,
          createScalarCardMetadata(3)
        );
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const directives = getCardLazyLoaders(getCards(fixture.debugElement));
        const cardObserver = directives[0].cardObserver!;
        simulateIntersection(cardObserver, [
          {
            time: 10,
            target: directives[0].hostForTest().nativeElement,
            isIntersecting: true,
          },
        ]);

        expect(dispatchedActions).toEqual([
          actions.cardVisibilityChanged({
            enteredCards: [
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[0].cardId,
              },
            ],
            exitedCards: [],
          }),
        ]);

        simulateIntersection(cardObserver, [
          {
            time: 20,
            target: directives[0].hostForTest().nativeElement,
            isIntersecting: false,
          },
          {
            time: 20,
            target: directives[1].hostForTest().nativeElement,
            isIntersecting: true,
          },
          {
            time: 20,
            target: directives[2].hostForTest().nativeElement,
            isIntersecting: true,
          },
        ]);

        expect(dispatchedActions).toEqual([
          actions.cardVisibilityChanged({
            enteredCards: [
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[0].cardId,
              },
            ],
            exitedCards: [],
          }),
          actions.cardVisibilityChanged({
            enteredCards: [
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[1].cardId,
              },
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[2].cardId,
              },
            ],
            exitedCards: [
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[0].cardId,
              },
            ],
          }),
        ]);
      });

      it('respects the latest of competing observer entries', () => {
        store.overrideSelector(
          selectors.getNonEmptyCardIdsWithMetadata,
          createScalarCardMetadata(1)
        );
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const directives = getCardLazyLoaders(getCards(fixture.debugElement));
        const cardObserver = directives[0].cardObserver!;
        simulateIntersection(cardObserver, [
          {
            time: 10,
            target: directives[0].hostForTest().nativeElement,
            isIntersecting: true,
          },
          {
            time: 20,
            target: directives[0].hostForTest().nativeElement,
            isIntersecting: false,
          },
        ]);

        // The more recent entry does not intersect.
        expect(dispatchedActions).toEqual([
          actions.cardVisibilityChanged({
            enteredCards: [],
            exitedCards: [
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[0].cardId,
              },
            ],
          }),
        ]);

        simulateIntersection(cardObserver, [
          {
            time: 30,
            target: directives[0].hostForTest().nativeElement,
            isIntersecting: false,
          },
          {
            time: 40,
            target: directives[0].hostForTest().nativeElement,
            isIntersecting: true,
          },
        ]);

        expect(dispatchedActions).toEqual([
          actions.cardVisibilityChanged({
            enteredCards: [],
            exitedCards: [
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[0].cardId,
              },
            ],
          }),
          actions.cardVisibilityChanged({
            enteredCards: [
              {
                elementId: jasmine.any(Symbol) as any,
                cardId: directives[0].cardId,
              },
            ],
            exitedCards: [],
          }),
        ]);
      });
    });

    describe('pagination', () => {
      beforeEach(() => {
        store.overrideSelector(settingsSelectors.getPageSize, 2);
        store.overrideSelector(
          common_selectors.getSortedRenderableCardIdsWithMetadata,
          [
            {
              cardId: 'card1',
              plugin: PluginType.SCALARS,
              tag: 'tagA/Scalars',
              runId: null,
            },
            {
              cardId: 'card2',
              plugin: PluginType.IMAGES,
              tag: 'tagA/Images',
              runId: 'run1',
              sample: 0,
            },
            {
              cardId: 'card3',
              plugin: PluginType.HISTOGRAMS,
              tag: 'tagA/Hist',
              runId: 'run1',
              sample: 0,
            },
          ]
        );
        store.overrideSelector(getMetricsTagGroupExpansionState, true);
      });

      it('renders only single page', () => {
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        expect(getCardsInGroup(fixture, 0).length).toBe(2);
        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'histograms: card3',
          'images: card2',
        ]);

        store.overrideSelector(settingsSelectors.getPageSize, 10);
        store.refreshState();
        fixture.detectChanges();
        expect(getCardsInGroup(fixture, 0).length).toBe(3);
      });

      it('responds to page size changes', () => {
        store.overrideSelector(getMetricsTagGroupExpansionState, true);
        store.overrideSelector(
          common_selectors.getSortedRenderableCardIdsWithMetadata,
          createNScalarCards(20)
        );
        store.overrideSelector(settingsSelectors.getPageSize, 50);
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        expect(getCards(fixture.debugElement).length).toBe(20);
        expect(fixture.debugElement.query(PAGINATION_INPUT)).toBeNull();

        store.overrideSelector(settingsSelectors.getPageSize, 10);
        store.refreshState();
        fixture.detectChanges();

        expect(getCards(fixture.debugElement).length).toBe(10);
        assertPagination(fixture, 1, 2);

        store.overrideSelector(settingsSelectors.getPageSize, 3);
        store.refreshState();
        fixture.detectChanges();

        expect(getCards(fixture.debugElement).length).toBe(3);
        assertPagination(fixture, 1, 7);
      });

      it('navigates pages by click on buttons', () => {
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const prevButton = fixture.debugElement.query(By.css('.prev'));
        const nextButton = fixture.debugElement.query(By.css('.next'));
        nextButton.nativeElement.click();
        fixture.detectChanges();

        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'scalars: card1',
        ]);
        assertPagination(fixture, 2, 2);

        // Clipped since we are at the max.
        nextButton.nativeElement.click();
        fixture.detectChanges();

        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'scalars: card1',
        ]);
        assertPagination(fixture, 2, 2);

        prevButton.nativeElement.click();
        fixture.detectChanges();

        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'histograms: card3',
          'images: card2',
        ]);
        assertPagination(fixture, 1, 2);

        // Stay at 1 when clicking on prev from 1.
        prevButton.nativeElement.click();
        fixture.detectChanges();

        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'histograms: card3',
          'images: card2',
        ]);
        assertPagination(fixture, 1, 2);
      });

      function changeInputValue(
        fixture: ComponentFixture<MainViewContainer>,
        newIndex: number
      ) {
        const input = fixture.debugElement.query(By.css('input'));
        sendKeys(fixture, input, String(newIndex));
        sendKey(fixture, input, {
          type: KeyType.SPECIAL,
          prevString: String(newIndex),
          key: 'Enter',
          startingCursorIndex: 0,
        });
        input.triggerEventHandler('change', {target: input.nativeElement});
        fixture.detectChanges();
      }

      it('navigates when interacting with the input', () => {
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        changeInputValue(fixture, 2);
        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'scalars: card1',
        ]);

        changeInputValue(fixture, 1);
        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'histograms: card3',
          'images: card2',
        ]);

        // clips to the max length.
        changeInputValue(fixture, 5);
        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'scalars: card1',
        ]);
        assertPagination(fixture, 2, 2);

        // clips to 1.
        changeInputValue(fixture, 0);
        expect(getCardContents(getCardsInGroup(fixture, 0))).toEqual([
          'histograms: card3',
          'images: card2',
        ]);
        assertPagination(fixture, 1, 2);
      });

      it('rectifies the input to be max/min', () => {
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        changeInputValue(fixture, 2000);
        assertPagination(fixture, 2, 2);

        changeInputValue(fixture, -10);
        assertPagination(fixture, 1, 2);
      });

      it('does not cause inf loop when items=[] with rectification', () => {
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        store.overrideSelector(
          common_selectors.getSortedRenderableCardIdsWithMetadata,
          []
        );
        store.refreshState();
        fixture.detectChanges();

        expect(
          fixture.debugElement.queryAll(By.css('.card-group')).length
        ).toBe(0);
      });
    });

    describe('card width setting', () => {
      beforeEach(() => {
        store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
          {
            cardId: 'card1',
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runId: null,
          },
        ]);
      });

      it('sets the min width to be cardMinWidth', () => {
        store.overrideSelector(selectors.getMetricsCardMinWidth, 500);
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(By.css('.card-grid')).styles[
            'grid-template-columns'
          ]
        ).toBe('repeat(auto-fill, minmax(500px, 1fr))');
      });

      it('does not set the max width with invalid width value', () => {
        store.overrideSelector(selectors.getMetricsCardMinWidth, null);
        let fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(By.css('.card-grid')).styles[
            'grid-template-columns'
          ]
        ).toBe('');

        store.overrideSelector(selectors.getMetricsCardMinWidth, -50);
        fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();
        expect(
          fixture.debugElement.query(By.css('.card-grid')).styles[
            'grid-template-columns'
          ]
        ).toBe('');

        store.overrideSelector(selectors.getMetricsCardMinWidth, 20);
        fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(By.css('.card-grid')).styles[
            'grid-template-columns'
          ]
        ).toBe('');

        store.overrideSelector(selectors.getMetricsCardMinWidth, 10000);
        fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(By.css('.card-grid')).styles[
            'grid-template-columns'
          ]
        ).toBe('');
      });

      it('resets the card min width', () => {
        const getMetricsCardMinWidthSubject = new ReplaySubject<number | null>(
          1
        );
        getMetricsCardMinWidthSubject.next(500);
        selectSpy
          .withArgs(getMetricsCardMinWidth)
          .and.returnValue(getMetricsCardMinWidthSubject);
        let fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(By.css('.card-grid')).styles[
            'grid-template-columns'
          ]
        ).toBe('repeat(auto-fill, minmax(500px, 1fr))');

        getMetricsCardMinWidthSubject.next(null);
        fixture.detectChanges();

        expect(
          fixture.debugElement.query(By.css('.card-grid')).styles[
            'grid-template-columns'
          ]
        ).toBe('');
      });
    });
  });

  describe('expansion', () => {
    let selectSpy: jasmine.Spy;

    beforeEach(() => {
      selectSpy = spyOn(store, 'select').and.callThrough();
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, jasmine.any(String))
        .and.throwError(
          'getMetricsTagGroupExpansionState called with unknown groupName'
        );

      store.overrideSelector(settingsSelectors.getPageSize, 2);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(5)
      );
    });

    it('renders 0 cards in a collapsed group', () => {
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, 'tagA')
        .and.returnValue(of(false));
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(10)
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(EXPAND_BUTTON)).not.toBeNull();
      expect(getCardContents(getCards(fixture.debugElement))).toEqual([]);
    });

    it('renders N = items.length cards when N < pageSize and expanded', () => {
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, 'tagA')
        .and.returnValue(of(true));
      store.overrideSelector(settingsSelectors.getPageSize, 10);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(4)
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(EXPAND_BUTTON)).not.toBeNull();
      expect(getCardContents(getCards(fixture.debugElement))).toEqual([
        'scalars: card0',
        'scalars: card1',
        'scalars: card2',
        'scalars: card3',
      ]);
    });

    it('renders N = pageSize cards when items.length < N and expanded', () => {
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, 'tagA')
        .and.returnValue(of(true));
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(10)
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(EXPAND_BUTTON)).not.toBeNull();
      expect(getCards(fixture.debugElement).length).toBe(5);
    });

    it('does not render next or prev when collapsed', () => {
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, 'tagA')
        .and.returnValue(of(false));
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(15)
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.prev'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.next'))).toBeNull();
    });

    it('does not render next or prev when items.length <= pageSize and expanded', () => {
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, 'tagA')
        .and.returnValue(of(true));
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(3)
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.prev'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.next'))).toBeNull();
    });

    it('responds to expansion change', () => {
      const getExpansionStateSubject = new ReplaySubject<boolean>(1);
      getExpansionStateSubject.next(false);
      selectSpy
        .withArgs(getMetricsTagGroupExpansionState, 'tagA')
        .and.returnValue(getExpansionStateSubject);
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(10)
      );
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(getCards(fixture.debugElement).length).toBe(0);

      getExpansionStateSubject.next(true);
      fixture.detectChanges();

      expect(getCards(fixture.debugElement).length).toBe(5);

      getExpansionStateSubject.next(false);
      fixture.detectChanges();

      expect(getCards(fixture.debugElement).length).toBe(0);
    });

    it(
      'dispatches `metricsTagGroupExpansionChanged` action when expansion ' +
        'toggle is clicked',
      () => {
        selectSpy
          .withArgs(getMetricsTagGroupExpansionState, 'tagA')
          .and.returnValue(of(true));
        store.overrideSelector(settingsSelectors.getPageSize, 5);
        store.overrideSelector(
          selectors.getNonEmptyCardIdsWithMetadata,
          createNScalarCards(10)
        );
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        fixture.debugElement.query(EXPAND_BUTTON).nativeElement.click();
        expect(dispatchedActions).toEqual([
          actions.metricsTagGroupExpansionChanged({tagGroup: 'tagA'}),
        ]);
      }
    );
  });

  describe('filter view', () => {
    beforeEach(() => {
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([
          ['run1', true],
          ['run2', true],
        ])
      );
      store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tagA',
          runId: null,
        },
        {
          cardId: 'card2',
          plugin: PluginType.IMAGES,
          tag: 'tagA/Images',
          runId: 'run1',
          sample: 0,
        },
        {
          cardId: 'card3',
          plugin: PluginType.IMAGES,
          tag: 'tagB/meow/cat',
          runId: 'run2',
          sample: 0,
        },
      ]);
      store.overrideSelector(
        common_selectors.TEST_ONLY.getScalarTagsForRunSelection,
        new Set(['tagA'])
      );
    });

    function getFilterViewContainer(
      fixture: ComponentFixture<MainViewContainer>
    ): DebugElement {
      return fixture.debugElement.query(By.directive(FilteredViewContainer));
    }

    function getFilterviewCardContents(
      fixture: ComponentFixture<MainViewContainer>
    ) {
      return getCardContents(getCards(getFilterViewContainer(fixture)));
    }

    function createComponent(
      initialTagFilter: string
    ): ComponentFixture<MainViewContainer> {
      store.overrideSelector(selectors.getMetricsTagFilter, initialTagFilter);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();
      updateComponent(fixture);
      return fixture;
    }

    function updateComponent(fixture: ComponentFixture<MainViewContainer>) {
      tick(FILTER_VIEW_DEBOUNCE_IN_MS);
      fixture.detectChanges();
    }

    it('shows flat list of matching cards', fakeAsync(() => {
      const fixture = createComponent('tagA');

      expect(getCardGroupNames(getFilterViewContainer(fixture))).toEqual([]);
      expect(getFilterviewCardContents(fixture)).toEqual([
        'scalars: card1',
        'images: card2',
      ]);
    }));

    it('ignores case when matching the regex', fakeAsync(() => {
      const fixture = createComponent('taga');

      expect(getCardGroupNames(getFilterViewContainer(fixture))).toEqual([]);
      expect(getFilterviewCardContents(fixture)).toEqual([
        'scalars: card1',
        'images: card2',
      ]);
    }));

    it('filters out card based on plugin type and filteredPluginTypes', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set<PluginType>([PluginType.IMAGES, PluginType.HISTOGRAMS])
      );
      const fixture = createComponent('tagA');

      expect(getCardGroupNames(getFilterViewContainer(fixture))).toEqual([]);
      expect(getFilterviewCardContents(fixture)).toEqual(['images: card2']);
    }));

    it('hides the main and pinned views while the filter view is active', fakeAsync(() => {
      store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
        {cardId: 'card1', ...createCardMetadata(PluginType.SCALARS)},
        {cardId: 'card2', ...createCardMetadata(PluginType.IMAGES)},
      ]);
      const fixture = createComponent('tagA');

      const mainView = fixture.debugElement.query(
        By.css('.main metrics-card-groups')
      );
      expect(mainView.styles['display']).toBe('none');
      const pinnedViewDebugEl = fixture.debugElement.query(
        By.css('.main metrics-pinned-view')
      );
      expect(pinnedViewDebugEl.styles['display']).toBe('none');
      const cardContents = getCardContents(getCards(pinnedViewDebugEl));
      expect(cardContents).toEqual(['scalars: card1', 'images: card2']);
    }));

    it('updates the list on tagFilter change', fakeAsync(() => {
      const fixture = createComponent('tagA');

      store.overrideSelector(selectors.getMetricsTagFilter, 'tagA/');
      store.refreshState();
      updateComponent(fixture);

      expect(getFilterviewCardContents(fixture)).toEqual(['images: card2']);
    }));

    it('does not show the collapse/expand control', fakeAsync(() => {
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(10)
      );
      const fixture = createComponent('tagA');

      expect(getFilterViewContainer(fixture).query(EXPAND_BUTTON)).toBeNull();
    }));

    it('does not limit number of items to 3', fakeAsync(() => {
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        common_selectors.getSortedRenderableCardIdsWithMetadata,
        createNScalarCards(10)
      );
      const fixture = createComponent('tagA');

      expect(getFilterviewCardContents(fixture)).toEqual([
        'scalars: card0',
        'scalars: card1',
        'scalars: card2',
        'scalars: card3',
        'scalars: card4',
      ]);
    }));

    it('shows an empty list when started with malformed regex filter', fakeAsync(() => {
      store.overrideSelector(settingsSelectors.getPageSize, 5);
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        createNScalarCards(10)
      );
      const fixture = createComponent('*');

      expect(getFilterviewCardContents(fixture)).toEqual([]);
    }));

    it('shows a warning when no cards match current query', fakeAsync(() => {
      store.overrideSelector(
        common_selectors.getSortedRenderableCardIdsWithMetadata,
        createNScalarCards(100)
      );
      const fixture = createComponent('^no_match_please$');

      expect(
        fixture.debugElement
          .query(By.css('metrics-filtered-view'))
          .nativeElement.textContent.trim()
      ).toContain(
        'No matches for tag filter /^no_match_please$/ out of 100 tags.'
      );
    }));

    it('shows a warning about unmatched plugin type', fakeAsync(() => {
      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set([PluginType.IMAGES, PluginType.HISTOGRAMS])
      );
      store.overrideSelector(
        common_selectors.getSortedRenderableCardIdsWithMetadata,
        createNScalarCards(100)
      );

      const fixture = createComponent('.');

      expect(
        fixture.debugElement
          .query(By.css('metrics-filtered-view'))
          .nativeElement.textContent.trim()
      ).toContain(
        'No matches for tag filter /./ and image or histogram ' +
          'visualization filter out of 100 tags.'
      );
    }));

    it(
      'shows previous list when changed to malformed regex and it shows ' +
        'the correct list when regex is fixed',
      fakeAsync(() => {
        store.overrideSelector(settingsSelectors.getPageSize, 5);
        store.overrideSelector(
          common_selectors.getSortedRenderableCardIdsWithMetadata,
          createNScalarCards(10)
        );

        const fixture = createComponent('tagA');

        store.overrideSelector(selectors.getMetricsTagFilter, 'tagA/Scalars_[');
        store.refreshState();
        updateComponent(fixture);

        expect(getFilterviewCardContents(fixture)).toEqual([
          'scalars: card0',
          'scalars: card1',
          'scalars: card2',
          'scalars: card3',
          'scalars: card4',
        ]);

        store.overrideSelector(
          selectors.getMetricsTagFilter,
          'tagA/Scalars_[0-2]'
        );
        store.refreshState();
        updateComponent(fixture);

        expect(getFilterviewCardContents(fixture)).toEqual([
          'scalars: card0',
          'scalars: card1',
          'scalars: card2',
        ]);
      })
    );

    it('hides single-run cards based on the run selection', fakeAsync(() => {
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([
          ['run1', false],
          ['run2', true],
        ])
      );
      const fixture = createComponent('tag');

      expect(getFilterviewCardContents(fixture)).toEqual([
        'scalars: card1',
        'images: card3',
      ]);

      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([
          ['run1', true],
          ['run2', false],
        ])
      );
      store.refreshState();
      updateComponent(fixture);

      expect(getFilterviewCardContents(fixture)).toEqual([
        'scalars: card1',
        'images: card2',
      ]);
    }));

    describe('perf', () => {
      beforeEach(() => {
        store.overrideSelector(
          selectors.getCurrentRouteRunSelection,
          new Map([
            ['run1', true],
            ['run2', true],
          ])
        );
        store.overrideSelector(selectors.getNonEmptyCardIdsWithMetadata, [
          {
            cardId: 'card1',
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runId: null,
          },
          {
            cardId: 'card2',
            plugin: PluginType.IMAGES,
            tag: 'tagA/Images',
            runId: 'run1',
            sample: 0,
          },
          {
            cardId: 'card3',
            plugin: PluginType.IMAGES,
            tag: 'tagB/meow/cat',
            runId: 'run2',
            sample: 0,
          },
        ]);
      });

      it('does not update the card when irrelevant runSelection changes', fakeAsync(() => {
        store.overrideSelector(
          selectors.getCurrentRouteRunSelection,
          new Map([
            ['run1', true],
            ['run2', true],
          ])
        );
        const fixture = createComponent('tagA');
        const gridContainer = fixture.debugElement.query(
          By.directive(CardGridContainer)
        );

        const before = gridContainer.componentInstance.cardIdsWithMetadata;

        store.overrideSelector(
          selectors.getCurrentRouteRunSelection,
          new Map([
            ['run1', true],
            ['run2', true],
            ['run3', false],
          ])
        );
        store.refreshState();
        updateComponent(fixture);

        const after = gridContainer.componentInstance.cardIdsWithMetadata;
        expect(before).toBe(after);
      }));

      it('updates the card when relevant runSelection changes', fakeAsync(() => {
        // All scalar and image cards are rendered.
        store.overrideSelector(
          selectors.getCurrentRouteRunSelection,
          new Map([
            ['run1', true],
            ['run2', true],
          ])
        );
        const fixture = createComponent('tagA');
        const gridContainer = fixture.debugElement.query(
          By.directive(CardGridContainer)
        );

        const before = gridContainer.componentInstance.cardIdsWithMetadata;

        // While the scalar is still rendered, the image card ('card2') does
        // not render and, thus, should change the cardIdsWithMetadata.
        store.overrideSelector(
          selectors.getCurrentRouteRunSelection,
          new Map([
            ['run1', false],
            ['run2', true],
          ])
        );
        store.refreshState();
        updateComponent(fixture);

        const after = gridContainer.componentInstance.cardIdsWithMetadata;
        expect(before).not.toEqual(after);
      }));
    });
  });

  describe('pinned view', () => {
    function queryDirective(
      fixture: ComponentFixture<MainViewContainer>,
      directive: Type<any>
    ): DebugElement {
      return fixture.debugElement.query(By.directive(directive));
    }

    it('shows an empty message only when there are no pinned cards', () => {
      store.overrideSelector(selectors.getPinnedCardsWithMetadata, []);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const emptyMessage = 'Pin cards for a quick view and comparison';
      const pinnedViewDebugEl = queryDirective(fixture, PinnedViewContainer);
      expect(pinnedViewDebugEl.nativeElement.textContent).toContain(
        emptyMessage
      );

      store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
        {cardId: 'card1', ...createCardMetadata()},
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(pinnedViewDebugEl.nativeElement.textContent).not.toContain(
        emptyMessage
      );
    });

    it('shows pinned card copies', () => {
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );
      store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
        {cardId: 'card1', ...createCardMetadata(PluginType.SCALARS)},
        {cardId: 'card2', ...createCardMetadata(PluginType.IMAGES)},
      ]);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const pinnedViewDebugEl = queryDirective(fixture, PinnedViewContainer);
      const cardContents = getCardContents(getCards(pinnedViewDebugEl));
      expect(cardContents).toEqual(['scalars: card1', 'images: card2']);
    });

    it('ignores the run selection filter', () => {
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', false]])
      );
      const originalCardMetadata = [
        {
          cardId: 'card1',
          plugin: PluginType.IMAGES,
          tag: 'tagA/Images',
          runId: 'run1',
          sample: 0,
        },
      ];
      store.overrideSelector(
        selectors.getNonEmptyCardIdsWithMetadata,
        originalCardMetadata
      );
      store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
        {...originalCardMetadata[0], cardId: 'pinnedCopy1'},
      ]);
      store.overrideSelector(selectors.getMetricsTagFilter, '');
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const pinnedViewDebugEl = queryDirective(fixture, PinnedViewContainer);
      const cardContents = getCardContents(getCards(pinnedViewDebugEl));
      expect(cardContents).toEqual(['images: pinnedCopy1']);
    });

    it('ignores filteredPluginTypes', () => {
      store.overrideSelector(
        selectors.getMetricsFilteredPluginTypes,
        new Set([PluginType.IMAGES])
      );
      store.overrideSelector(
        selectors.getCurrentRouteRunSelection,
        new Map([['run1', true]])
      );
      store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
        {cardId: 'card1', ...createCardMetadata(PluginType.SCALARS)},
        {cardId: 'card2', ...createCardMetadata(PluginType.IMAGES)},
      ]);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const pinnedViewDebugEl = queryDirective(fixture, PinnedViewContainer);
      const cardContents = getCardContents(getCards(pinnedViewDebugEl));
      expect(cardContents).toEqual(['scalars: card1', 'images: card2']);
    });

    describe('new pinned indicator', () => {
      const byCss = {
        INDICATOR: By.css('.new-card-pinned'),
      };

      it('does not show any indicator when no cards ever pinned', () => {
        store.overrideSelector(selectors.getLastPinnedCardTime, 0);
        store.refreshState();

        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const indicator = fixture.debugElement.query(byCss.INDICATOR);
        expect(indicator).toBeNull();
      });

      it('does not show any indicator if card pinned before load', () => {
        store.overrideSelector(selectors.getLastPinnedCardTime, 100);
        store.refreshState();

        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const indicator = fixture.debugElement.query(byCss.INDICATOR);
        expect(indicator).toBeNull();
      });

      it('shows an indication when pin a new card', () => {
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        store.overrideSelector(selectors.getLastPinnedCardTime, 100);
        store.refreshState();
        fixture.detectChanges();

        const indicator = fixture.debugElement.query(byCss.INDICATOR);
        expect(indicator).toBeTruthy();
      });
    });

    describe('clear all pins button', () => {
      beforeEach(() => {
        store.overrideSelector(selectors.getEnableGlobalPins, true);
      });

      it('does not show the button if getEnableGlobalPins is false', () => {
        store.overrideSelector(selectors.getEnableGlobalPins, false);
        store.overrideSelector(selectors.getPinnedCardsWithMetadata, []);
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const clearAllButton = fixture.debugElement.query(
          By.css('[aria-label="Clear all pinned cards"]')
        );
        expect(clearAllButton).toBeNull();
      });

      it('does not show the button if there is no pinned card', () => {
        store.overrideSelector(selectors.getPinnedCardsWithMetadata, []);
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const clearAllButton = fixture.debugElement.query(
          By.css('[aria-label="Clear all pinned cards"]')
        );
        expect(clearAllButton).toBeNull();
      });

      it('shows the button if there is a pinned card', () => {
        store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
          {cardId: 'card1', ...createCardMetadata(PluginType.SCALARS)},
          {cardId: 'card2', ...createCardMetadata(PluginType.IMAGES)},
        ]);
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const clearAllButton = fixture.debugElement.query(
          By.css('[aria-label="Clear all pinned cards"]')
        );
        expect(clearAllButton).toBeTruthy();
      });

      it('dispatch clear all action when the button is clicked', () => {
        store.overrideSelector(selectors.getPinnedCardsWithMetadata, [
          {cardId: 'card1', ...createCardMetadata(PluginType.SCALARS)},
          {cardId: 'card2', ...createCardMetadata(PluginType.IMAGES)},
        ]);
        const fixture = TestBed.createComponent(MainViewContainer);
        fixture.detectChanges();

        const clearAllButton = fixture.debugElement.query(
          By.css('[aria-label="Clear all pinned cards"]')
        );
        clearAllButton.nativeElement.click();

        expect(dispatchedActions).toEqual([
          actions.metricsClearAllPinnedCards(),
        ]);
      });
    });
  });

  describe('slideout menu', () => {
    it('does not render slideout menu when sidepanel when closed', () => {
      store.overrideSelector(selectors.isMetricsSettingsPaneOpen, false);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const slideoutMenu = fixture.debugElement.query(
        By.css('.slide-out-menu')
      );
      expect(slideoutMenu).toBeFalsy();
    });

    it('renders non-expanded slideout menu when closed', () => {
      store.overrideSelector(selectors.isMetricsSettingsPaneOpen, true);
      store.overrideSelector(selectors.isMetricsSlideoutMenuOpen, false);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const slideoutMenu = fixture.debugElement.query(
        By.css('.slide-out-menu')
      );
      expect(slideoutMenu).toBeTruthy();

      expect(
        slideoutMenu.nativeElement.classList.contains('slide-out-menu-expanded')
      ).toBe(false);
    });

    it('renders expanded slideout menu when open', () => {
      store.overrideSelector(selectors.isMetricsSettingsPaneOpen, true);
      store.overrideSelector(selectors.isMetricsSlideoutMenuOpen, true);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const slideoutMenu = fixture.debugElement.query(
        By.css('.slide-out-menu')
      );
      expect(slideoutMenu).toBeTruthy();

      expect(
        slideoutMenu.nativeElement.classList.contains('slide-out-menu-expanded')
      ).toBe(true);
    });
  });

  describe('sidepane', () => {
    it('renders settings pane opened when store says it is opened', () => {
      store.overrideSelector(selectors.isMetricsSettingsPaneOpen, true);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.sidebar'))).toBeTruthy();

      store.overrideSelector(selectors.isMetricsSettingsPaneOpen, false);
      store.refreshState();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.sidebar'))).toBeFalsy();
    });

    it('fires action when toggling a gear button', () => {
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      const settingsButton = fixture.debugElement.query(
        By.css('[aria-label="Toggle settings side pane"]')
      );
      settingsButton.nativeElement.click();
      expect(dispatchedActions).toEqual([actions.metricsSettingsPaneToggled()]);
    });

    it('dispatches closed action when clicked on sidepane close button', () => {
      store.overrideSelector(selectors.isMetricsSettingsPaneOpen, true);
      const fixture = TestBed.createComponent(MainViewContainer);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.sidebar'))).toBeTruthy();

      const closeButton = fixture.debugElement.query(
        By.css('[aria-label="Close side pane"]')
      );
      closeButton.nativeElement.click();

      expect(dispatchedActions).toEqual([actions.metricsSettingsPaneClosed()]);
    });
  });
});

describe('customizable share button ', () => {
  it('renders share button when it is provided', async () => {
    await TestBed.configureTestingModule({
      imports: [CustomizationModule],
      declarations: [
        MainViewComponent,
        MainViewContainer,
        TestShareButtonContainer,
      ],
      providers: [
        {
          provide: SHARE_BUTTON_COMPONENT,
          useClass: TestShareButtonContainer,
        },
        provideMockStore({
          initialState: appStateFromMetricsState(buildMetricsState()),
        }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(MainViewContainer);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('test-share-button'))
    ).toBeTruthy();
  });

  it('does not render share button when it is not provided', async () => {
    await TestBed.configureTestingModule({
      declarations: [MainViewComponent, MainViewContainer],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(buildMetricsState()),
        }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(MainViewContainer);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('test-share-button'))).toBeNull();
  });
});
