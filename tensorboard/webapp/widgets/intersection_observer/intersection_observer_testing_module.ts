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
import {Directive, EventEmitter, NgModule, Output} from '@angular/core';
import {ComponentFixture} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

@Directive({
  standalone: false,
  selector: '[observeIntersection]',
  jit: true,
})
class IntersectionObserverTestingDirective {
  @Output() onVisibilityChange = new EventEmitter<{visible: boolean}>();

  simulateVisibilityChange(visible: boolean) {
    this.onVisibilityChange.emit({visible});
  }
}

@NgModule({
  exports: [IntersectionObserverTestingDirective],
  declarations: [IntersectionObserverTestingDirective],
  jit: true,
})
export class IntersectionObserverTestingModule {
  simulateVisibilityChange<T>(fixture: ComponentFixture<T>, visible: boolean) {
    const directive = fixture.debugElement
      .query(By.directive(IntersectionObserverTestingDirective))
      .injector.get(IntersectionObserverTestingDirective);
    directive.simulateVisibilityChange(visible);
  }
}
