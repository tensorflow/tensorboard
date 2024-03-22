/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
  ApplicationRef,
  Injectable,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import {ConnectedPosition, Overlay, OverlayRef} from '@angular/cdk/overlay';
import {TemplatePortal} from '@angular/cdk/portal';
import {Subscription} from 'rxjs';
import {isMouseEventInElement} from '../../util/dom';

/**
 * Enables dynamic creation of modal components.
 *
 * # Prerequisites
 * App root component must define a ViewContainerRef named `vcRef`
 * e.g.:
 * ```
 * // my_app_root.ts
 * constructor(readonly vcRef: ViewContainerRef) {}
 * ```
 *
 * # Usage
 * Define a modal using an ng-template:
 * ```
 * <ng-template #myModalTemplate>
 *    <my-awesome-modal-content
 *      [input1]="input1"
 *      (output1)="output1"
 *    >
 *    </my-awesome-modal-content>
 * </ng-template>
 * ```
 *
 * Define a ViewChild to reference the template in the component file:
 * ```
 * // my_component.ts
 * ...
 * @ViewChild('myModalTemplate', {read: TemplateRef})
 * myModalTemplate!: TemplateRef<unknown>;
 * ...
 * ```
 *
 * Inject CustomModal into the component
 * ```
 * // my_component.ts
 * ...
 * constructor(private readonly customModal: CustomModal) {}
 * ...
 * ```
 *
 * To create a modal, call createNextToElement():
 * ```
 * // my_component.ts
 * ...
 * onSomeButtonClick(mouseEvent: MouseEventj) {
 *   this.customModal.createNextToElement(this.myModalTemplate, mouseEvent.target as HTMLElement);
 * }
 * ...
 * ```
 *
 * # Testing
 * A similar setup is required for testing modal behavior from another component.
 *
 * Define a separate root component to hold the modal container and ref:
 * ```
 * @Component({
 *   ...,
 *   template: `<actual-component-to-test></actual-component-to-test>`
 * })
 * class TestableComponent {
 *   constructor(readonly vcRef: ViewContainerRef) {}
 *   ...
 * }
 * ```
 *
 * Before each test (e.g. in beforeEach), make sure to add the TestableComponent
 * to the app component list:
 * ```
 * ...
 * const fixture = TestBed.createComponent(TestableComponent);
 * const appRef = TestBed.inject(ApplicationRef);
 * appRef.components.push(fixture.componentRef);
 * ```
 */

export class CustomModalRef {
  overlayRef: OverlayRef;
  subscriptions: Subscription[];

  constructor(overlayRef: OverlayRef, subscriptions: Subscription[] = []) {
    this.overlayRef = overlayRef;
    this.subscriptions = subscriptions;
  }
}

@Injectable({providedIn: 'root'})
export class CustomModal {
  private customModalRefs: CustomModalRef[] = [];

  constructor(
    private readonly appRef: ApplicationRef,
    private readonly overlay: Overlay
  ) {}

  /** Gets the ViewContainerRef of the app's root component if it exists. */
  private getModalViewContainerRef(): ViewContainerRef | undefined {
    const appComponents = this.appRef.components;
    if (appComponents.length === 0) {
      // appComponents can potentially be empty in tests.
      return;
    }

    const appInstance = appComponents[0].instance;
    let viewContainerRef: ViewContainerRef = appInstance.vcRef;
    if (!viewContainerRef) {
      console.warn(
        'For proper custom modal function, an ViewContainerRef named `vcRef` is required in the root component.'
      );
      return;
    }
    return viewContainerRef;
  }

  /** Creates a modal from a template next to an element. */
  createNextToElement(
    templateRef: TemplateRef<unknown>,
    element: Element,
    connectedPosition: ConnectedPosition = {
      originX: 'end',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
    }
  ): CustomModalRef | undefined {
    const viewContainerRef = this.getModalViewContainerRef();
    if (!viewContainerRef) return;

    let positionStrategy = this.overlay.position().flexibleConnectedTo(element);
    if (connectedPosition) {
      positionStrategy = positionStrategy.withPositions([connectedPosition]);
    }

    const overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: false,
    });
    overlayRef.attach(new TemplatePortal(templateRef, viewContainerRef));
    const customModalRef = new CustomModalRef(overlayRef);
    this.customModalRefs.push(customModalRef);

    // setTimeout to prevent closing immediately after modal open.
    setTimeout(() => {
      const outsidePointerEventsSubscription = overlayRef
        .outsidePointerEvents()
        .subscribe((event) => {
          // Only close when click is outside of every modal
          if (
            this.customModalRefs.every(
              (ref) =>
                !isMouseEventInElement(event, ref.overlayRef.overlayElement)
            )
          ) {
            this.closeAll();
          }
        });
      customModalRef.subscriptions.push(outsidePointerEventsSubscription);
    });

    const keydownEventsSubscription = overlayRef
      .keydownEvents()
      .subscribe((event) => {
        if (event.key === 'Escape') {
          this.closeAll();
        }
      });
    customModalRef.subscriptions.push(keydownEventsSubscription);

    return customModalRef;
  }

  /** Destroys given custom modal and related resources. */
  close(customModalRef: CustomModalRef) {
    const index = this.customModalRefs.findIndex(
      (ref) => ref === customModalRef
    );
    if (index === -1) {
      console.warn('Could not find customModalRef', customModalRef);
      return;
    }

    customModalRef.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    customModalRef.subscriptions = [];
    customModalRef.overlayRef?.dispose();

    this.customModalRefs.splice(index, 1);
  }

  /** Destroys all created modals. */
  closeAll() {
    while (this.customModalRefs.length) {
      this.close(this.customModalRefs[0]);
    }
  }
}
