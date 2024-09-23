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
import {Component, Input, NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import * as actions from '../../actions';
import {appStateFromMetricsState, buildMetricsState} from '../../testing';
import {CardId} from '../../types';
import {CardLazyLoader, CardObserver} from '../card_renderer/card_lazy_loader';

@Component({
  standalone: false,
  selector: 'card-view',
  template: `{{ cardId }}`,
})
class TestableCard {
  @Input() cardId!: CardId;
}

interface TestableCardConfig {
  cardId: CardId;
  visible: boolean;
}

@Component({
  standalone: false,
  selector: 'testable-cards',
  template: `
    <ng-container *ngFor="let config of configs">
      <card-view
        *ngIf="config.visible"
        [cardId]="config.cardId"
        [cardLazyLoader]="config.cardId"
      ></card-view>
    </ng-container>
  `,
})
class TestableCards {
  @Input() configs!: TestableCardConfig[];
}

describe('card view test', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[] = [];
  let observeSpy: jasmine.Spy;
  let unobserveSpy: jasmine.Spy;

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

  function getCardLazyLoaders(
    fixture: ComponentFixture<TestableCards>
  ): CardLazyLoader[] {
    const cardDebugElements = fixture.debugElement.queryAll(
      By.css('card-view')
    );
    return cardDebugElements.map((debugElement) => {
      return debugElement.injector.get(CardLazyLoader);
    });
  }

  function simulateIntersection(
    cardObserver: CardObserver,
    entries: Array<Partial<IntersectionObserverEntry> & {target: Element}>
  ) {
    cardObserver.onCardIntersectionForTest(
      entries.map(buildIntersectionObserverEntry)
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [CardLazyLoader, TestableCard, TestableCards],
      providers: [
        provideMockStore({
          initialState: appStateFromMetricsState(buildMetricsState()),
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    dispatchedActions = [];
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });

    observeSpy = spyOn(IntersectionObserver.prototype, 'observe');
    unobserveSpy = spyOn(IntersectionObserver.prototype, 'unobserve');
  });

  it('tracks card removal', () => {
    const fixture = TestBed.createComponent(TestableCards);
    fixture.componentInstance.configs = [
      {cardId: 'card1', visible: true},
    ] as TestableCardConfig[];
    fixture.detectChanges();

    expect(observeSpy).toHaveBeenCalled();

    const directives = getCardLazyLoaders(fixture);
    const cardObserver = directives[0].cardObserver!;

    // Destroy the element.
    fixture.componentInstance.configs = [
      {cardId: 'card1', visible: false},
    ] as TestableCardConfig[];
    fixture.detectChanges();

    // Simulate a pending 'isIntersecting' event.
    simulateIntersection(cardObserver, [
      {
        time: 10,
        target: directives[0].hostForTest().nativeElement,
        isIntersecting: true,
      },
    ]);

    expect(unobserveSpy).not.toHaveBeenCalled();
    expect(dispatchedActions).toEqual([
      actions.cardVisibilityChanged({
        enteredCards: [
          {elementId: jasmine.any(Symbol) as any, cardId: 'card1'},
        ],
        exitedCards: [],
      }),
    ]);

    // Simulate the exiting event.
    simulateIntersection(cardObserver, [
      {
        time: 20,
        target: directives[0].hostForTest().nativeElement,
        isIntersecting: false,
      },
    ]);

    expect(unobserveSpy).toHaveBeenCalled();
    expect(dispatchedActions).toEqual([
      actions.cardVisibilityChanged({
        enteredCards: [
          {elementId: jasmine.any(Symbol) as any, cardId: 'card1'},
        ],
        exitedCards: [],
      }),
      actions.cardVisibilityChanged({
        enteredCards: [],
        exitedCards: [{elementId: jasmine.any(Symbol) as any, cardId: 'card1'}],
      }),
    ]);
  });
});
