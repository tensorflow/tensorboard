import {
  ApplicationRef,
  Injectable,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import {CustomModalComponent} from './custom_modal_component';

/**
 * Enables dynamic creation of modal components.
 *
 * # Prerequisites
 * App root component must define a ViewContainerRef named `modalViewContainerRef`
 * e.g.:
 *
 * ```
 * // Template file
 * <div #modal_container></div>
 * ```
 *
 * ```
 * // Root Component definition
 * class MyAppRoot {
 *   @ViewChild('modal_container', {read: ViewContainerRef})
 *   readonly modalViewContainerRef!: ViewContainerRef;
 *   ...
 * }
 * ```
 *
 * # Usage
 * Define a modal using an ng-template:
 * ```
 * <ng-template #myModalTemplate>
 *   <custom-modal (onOpen)="doSomething" (onClose)="doSomethingElse">
 *     <my-awesome-modal-content
 *      [input1]="input1"
 *      (output1)="output1"
 *     >
 *     </my-awesome-modal-content>
 *   </custom-modal>
 * </ng-template>
 * ```
 *
 * Define a ViewChild to reference the template in the component file:
 * // my_component.ts
 * ```
 * ...
 * @ViewChild('myModalTemplate', {read: TemplateRef})
 * myModalTemplate!: TemplateRef<unknown>;
 * ...
 * ```
 *
 * Inject CustomModal into the component
 * // my_component.ts
 * ```
 * ...
 * constructor(private readonly customModal: CustomModal) {}
 * ...
 * ```
 *
 * To create a modal, call createAtPosition():
 * // my_component.ts
 * ```
 * ...
 * onSomeButtonClick() {
 *   this.customModal.createAtPosition(this.myModalTemplate, {x: 100, y: 100});
 * }
 * ...
 * ```
 *
 * ## Important note
 * runChangeDetection() must be called after view checked to prevent annoying
 * https://angular.io/errors/NG0100 errors when using input bindings (omitting this
 * will not affect functionality). This will correctly run embedded view change detection
 * in the same change detection cycle as the component defining the template.
 *
 * // my_component.ts
 * ngAfterViewChecked() {
 *   this.customModal.runChangeDetection();
 * }
 *
 */
@Injectable({providedIn: 'root'})
export class CustomModal {
  constructor(private appRef: ApplicationRef) {}

  private getModalViewContainerRef(): ViewContainerRef | undefined {
    const appInstance = this.appRef.components[0].instance;
    let viewContainerRef: ViewContainerRef = appInstance.modalViewContainerRef;
    if (!viewContainerRef) {
      console.warn(
        'For proper custom modal function, an ViewContainerRef named `modalViewContainerRef` is required in the root component.'
      );
      return;
    }
    return viewContainerRef;
  }

  createAtPosition(
    templateRef: TemplateRef<unknown>,
    position: {x: number; y: number}
  ): CustomModalComponent | undefined {
    const viewContainerRef = this.getModalViewContainerRef();
    if (!viewContainerRef) return;

    const embeddedViewRef = viewContainerRef.createEmbeddedView(templateRef);
    const modalComponent = CustomModalComponent.latestInstance;
    modalComponent.parentEmbeddedViewRef = embeddedViewRef;
    modalComponent.openAtPosition(position);
    return modalComponent;
  }

  runChangeDetection() {
    const viewContainerRef = this.getModalViewContainerRef();
    if (!viewContainerRef) return;
    for (let i = 0; i < viewContainerRef.length; i++) {
      viewContainerRef.get(i)?.detectChanges();
    }
  }

  closeAll() {
    const viewContainerRef = this.getModalViewContainerRef();
    if (!viewContainerRef) return;
    viewContainerRef.clear();
  }
}
