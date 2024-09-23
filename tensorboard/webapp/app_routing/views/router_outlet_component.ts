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
  ChangeDetectionStrategy,
  Component,
  ComponentFactoryResolver,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';

@Component({
  standalone: false,
  selector: 'router-outlet-component',
  template: ` <ng-container #routeContainer></ng-container> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouterOutletComponent implements OnChanges {
  @ViewChild('routeContainer', {static: true, read: ViewContainerRef})
  private readonly routeContainer!: ViewContainerRef;

  @Input() activeNgComponent!: unknown | null;

  constructor(
    private readonly componentFactoryResolver: ComponentFactoryResolver
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    const activeComponentChange = changes['activeNgComponent'];
    if (activeComponentChange) {
      this.routeContainer.clear();
      if (activeComponentChange.currentValue) {
        const componentFactory =
          this.componentFactoryResolver.resolveComponentFactory(
            activeComponentChange.currentValue
          );
        this.routeContainer.createComponent(componentFactory);
      }
    }
  }
}
