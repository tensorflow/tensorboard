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
import {
  Component,
  ComponentFactoryResolver,
  Input,
  OnInit,
  Type,
  ViewContainerRef,
} from '@angular/core';

/**
 * A Component that defines a customization point. Ideal for use for small
 * surgical customizations deep within the component hierarchy. The
 * customizations can be provided dynamically via Angular dependency injection
 * and providers.
 *
 * Cookbook:
 *
 * 1. Define a customizable Component, for example a button:
 *
 *    const CustomizableButton = new InjectionToken<Type<Component>>('Customizable Button');
 *
 * 2. Where the customization point is desired, use this Component to wrap some
 *    default behavior. Bind to some possibly-empty variable with the
 *    [customizableComponent] attribute:
 *
 *    <tb-customization [customizableComponent]="customButtonIfProvided">
 *      <button mat-button>I am the default button.</button>
 *    </tb-customization>
 *
 * 3. In the constructor of the component containing the customization point,
 *    optionally inject a custom button:
 *
 *    constructor(
 *      @Optional() @Inject(CustomizableButton)
 *      readonly customButtonIfProvided: Type<Component>)
 *
 * If you do not wish to customize the behavior for a certain TensorBoard
 * service (in this case, a button), you're done. The TensorBoard service
 * will receive the default behavior.
 *
 * However, if you need to define a customization for the button:
 *
 * 4. Define a Component with your customization:
 *
 *    @Injectable()
 *    @Component({
 *      standalone: false,
 *      selector: 'my-custom-button-component',
 *      template: '<button mat-button>I am a special button!</button>'
 *    })
 *    export class MyCustomButtonComponent {}
 *
 * 5. Provide the customized Component in an NgModule:
 *
 *    @NgModule({
 *      declarations: [MyCustomButtonComponent],
 *      providers: [{
 *        provide: CustomizableButton,
 *        useClass: MyCustomButtonComponent,
 *      }]
 *    })
 */
@Component({
  standalone: false,
  selector: 'tb-customization',
  template: `
    <ng-container *ngIf="!customizableComponent">
      <ng-content></ng-content>
    </ng-container>
  `,
})
export class CustomizableComponent implements OnInit {
  @Input() customizableComponent!: Type<Component> | undefined;

  constructor(
    private readonly viewContainerRef: ViewContainerRef,
    private readonly componentFactoryResolver: ComponentFactoryResolver
  ) {}

  ngOnInit() {
    if (this.customizableComponent) {
      const componentFactory =
        this.componentFactoryResolver.resolveComponentFactory(
          this.customizableComponent.constructor as Type<unknown>
        );
      this.viewContainerRef.createComponent(componentFactory);
    }
  }
}
