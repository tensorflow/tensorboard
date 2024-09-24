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
import {Component, NgModule, Optional} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {CustomizationModule} from './customization_module';

/**
 * Marker class for the component that can be customized in these tests.
 * Customizations should implement this type and be provided.
 */
export class CustomizableComponentType {}

/**
 * Parent class that uses the <tb-customization> component.
 */
@Component({
  standalone: false,
  selector: 'parent-component',
  template: `
    <tb-customization [customizableComponent]="customizableComponent">
      <span>Showing </span>
      <span>Default Text!</span>
    </tb-customization>
  `,
})
export class ParentComponent {
  constructor(
    @Optional() readonly customizableComponent: CustomizableComponentType
  ) {}
}

/**
 * Imports CustomizationModule for ParentComponent.
 */
@NgModule({
  imports: [CustomizationModule],
  declarations: [ParentComponent],
})
export class ParentComponentModule {}

/**
 * An implementation of CustomizableComponentType to be provided and injected
 * into the ParentComponent for some tests.
 */
@Component({
  standalone: false,
  selector: 'customizable-component',
  template: ` <div>Showing Customized Text!</div> `,
})
export class CustomizableComponent {}

/**
 * Declares and provides the implementation of CustomizableComponentType.
 */
@NgModule({
  declarations: [CustomizableComponent],
  providers: [
    {
      provide: CustomizableComponentType,
      useClass: CustomizableComponent,
    },
  ],
})
export class CustomizableComponentModule {}

async function setUp(extraImports: any[] = []) {
  await TestBed.configureTestingModule({
    imports: [CustomizationModule, ...extraImports],
    declarations: [ParentComponent],
  }).compileComponents();
}

describe('tb-customization', () => {
  it('renders default if no customization provided', async () => {
    await setUp();

    const fixture = TestBed.createComponent(ParentComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.nativeElement.textContent).toBe(
      'Showing Default Text!'
    );
  });

  it('renders customization if provided', async () => {
    // In this test we import the Module that provides an implementation
    // of CustomizableComponentType.
    await setUp([CustomizableComponentModule]);

    const fixture = TestBed.createComponent(ParentComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.nativeElement.textContent).toBe(
      'Showing Customized Text!'
    );
  });
});
