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
import {Directive, ElementRef, Input, OnDestroy, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../../app_state';
import {ElementId, nextElementId} from '../../../util/dom';
import * as actions from '../../actions';
import {CardId} from '../../types';

const elementToIds = new WeakMap<
  Element,
  {elementId: ElementId; cardId: CardId}
>();

type CardObserverCallback = (
  enteredCards: Set<Element>,
  exitedCards: Set<Element>
) => void;

export class CardObserver {
  private intersectionObserver?: IntersectionObserver;
  private intersectionCallback?: CardObserverCallback;
  private readonly destroyedTargets = new WeakSet<Element>();

  /**
   * Buffer determines how far a card can be, beyond the root's bounding rect,
   * and still be loaded. It corresponds to an IntersectionObserver's
   * 'rootMargin'. For example, "50px 0 100px 0"' will treat observed elements
   * as 'intersecting' when they come within 50px of the root top or within
   * 100px of the root's bottom. Adding buffer allows nearby, offscreen cards
   * to load, preventing blank cards from being seen too often.
   *
   * If positive 'rootMargin' is provided, a scrollable 'root' is required.
   *
   * https://w3c.github.io/IntersectionObserver/#dom-intersectionobserverinit-rootmargin
   * https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
   */
  constructor(
    private readonly root?: Element,
    private readonly buffer?: string
  ) {}

  initialize(intersectionCallback: CardObserverCallback) {
    if (this.intersectionObserver) {
      return;
    }
    this.intersectionCallback = intersectionCallback;

    const init: IntersectionObserverInit = {
      threshold: 0,
      root: this.root ?? null,
    };
    if (this.buffer) {
      init.rootMargin = this.buffer;
    }
    this.intersectionObserver = new IntersectionObserver(
      this.onCardIntersection.bind(this),
      init
    );
  }

  add(target: Element) {
    if (this.ensureInitialized()) {
      this.intersectionObserver!.observe(target);
    }
  }

  /**
   * Adds a target to a list of elements to-be-destroyed, so that we can notify
   * listeners that they become 'exitedCards' before unobserving it.
   */
  willDestroy(target: Element) {
    if (this.ensureInitialized()) {
      this.destroyedTargets.add(target);
    }
  }

  private ensureInitialized() {
    if (!this.intersectionObserver) {
      throw new Error('CardObserver must be initialized before use');
    }
    return true;
  }

  private onCardIntersection(entries: IntersectionObserverEntry[]) {
    /**
     * Within a single callback firing, `entries` may include separate entries
     * representing the same target element entering (isIntersecting) and
     * leaving (!isIntersecting). To account for this, we sort entries by
     * increasing timestamp and respect the latest one.
     */
    entries.sort((a, b) => a.time - b.time);

    const enteredElements = new Set<Element>();
    const exitedElements = new Set<Element>();
    for (const {isIntersecting, target} of entries) {
      if (isIntersecting) {
        enteredElements.add(target);
        exitedElements.delete(target);
      } else {
        enteredElements.delete(target);
        exitedElements.add(target);
      }

      /**
       * Cleanup destroyed targets. Defend against speculative case when
       * - A enters viewport
       * - B added to destroyed targets
       * - Callback fires for just A, unobserving B
       * - B's callback never fires
       */
      if (this.destroyedTargets.has(target) && !isIntersecting) {
        this.destroyedTargets.delete(target);
        this.intersectionObserver!.unobserve(target);
      }
    }
    this.intersectionCallback!(enteredElements, exitedElements);
  }

  onCardIntersectionForTest(entries: IntersectionObserverEntry[]) {
    this.onCardIntersection(entries);
  }
}

/**
 * A directive applied to elements that represent a card container. When the
 * element is ready to be loaded, this is responsible for marking cardId as
 * visible.
 *
 * Card container:
 *
 * <div [cardLazyLoader]="card1"></div>
 *
 * Card container that can load within 100px of a scrollable element's bounding
 * box:
 *
 * <div
 *   [cardLazyLoader]="card1"
 *   [cardObserver]="new CardObserver(scrollableElement, '100px')"
 * ></div>
 */
@Directive({
  standalone: false,
  selector: '[cardLazyLoader]',
})
export class CardLazyLoader implements OnInit, OnDestroy {
  @Input('cardLazyLoader') cardId!: CardId;
  @Input() cardObserver?: CardObserver;

  constructor(
    private readonly host: ElementRef,
    private readonly store: Store<State>
  ) {}

  onCardIntersection(
    enteredElements: Set<Element>,
    exitedElements: Set<Element>
  ) {
    const enteredCards = [...enteredElements].map((element) => {
      const ids = elementToIds.get(element);
      if (!ids) {
        throw new Error(
          'A CardObserver element must have an associated element id and card id.'
        );
      }
      return {elementId: ids.elementId, cardId: ids.cardId};
    });
    const exitedCards = [...exitedElements].map((element) => {
      const ids = elementToIds.get(element);
      if (!ids) {
        throw new Error(
          'A CardObserver element must have an associated element id and card id.'
        );
      }
      return {elementId: ids.elementId, cardId: ids.cardId};
    });
    this.store.dispatch(
      actions.cardVisibilityChanged({enteredCards, exitedCards})
    );
  }

  ngOnInit() {
    const element = this.host.nativeElement;
    elementToIds.set(element, {
      elementId: nextElementId(),
      cardId: this.cardId,
    });

    if (!this.cardObserver) {
      this.cardObserver = new CardObserver();
    }
    this.cardObserver.initialize(this.onCardIntersection.bind(this));
    this.cardObserver.add(element);
  }

  ngOnDestroy() {
    if (this.cardObserver) {
      this.cardObserver.willDestroy(this.host.nativeElement);
    }
  }

  hostForTest() {
    return this.host;
  }
}
