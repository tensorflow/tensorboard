/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

// import {Directive, ViewContainerRef} from '@angular/core';

// @Directive({
//   selector: '[ng-plugin-host]',
// })
// export class NgPluginDirective {
//   constructor(public viewContainerRef: ViewContainerRef) { }
// }

import {ComponentFactoryResolver, Injectable, Inject, ViewContainerRef, ViewRef} from '@angular/core';

import {DebuggerContainer} from '../../plugins/debugger_v2/tf_debugger_v2_plugin/debugger.container';

// TODO(cais): Explore tightening value type.
const NG_PLUGINS: {[pluginName: string]: any} = {
  'tf-debugger-v2': DebuggerContainer,
};

@Injectable()
export class NgPluginLoaderService {

  private factoryResolver: ComponentFactoryResolver;
  private rootViewContainer: ViewContainerRef | null = null;

  constructor(@Inject(ComponentFactoryResolver) factoryResolver: ComponentFactoryResolver) {
    this.factoryResolver = factoryResolver;
  }

  setRootViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.rootViewContainer = viewContainerRef;
  }

  addNgPlugin(ngPluginName: string): HTMLElement {
    console.log(`addNgPlugin(): ngPluginName = ${ngPluginName}`);  // DEBUG
    if (NG_PLUGINS[ngPluginName] == null) {
      throw new Error(
          `Unknown Angular Plugin name: "${ngPluginName}". ` +
          `Known names are: ${JSON.stringify(Object.keys(NG_PLUGINS))}`);
    }
    const factory = this.factoryResolver.resolveComponentFactory(
        NG_PLUGINS[ngPluginName]);
    if (this.rootViewContainer !== null) {
      // const viewRef = this.rootViewContainer.get(0) as ViewRef;
      // console.log('viewRef:', viewRef);  // DEBUG
      const component = factory.create(this.rootViewContainer.injector);
      this.rootViewContainer.insert(component.hostView);
      console.log('component =', component);  // DEBUG
      return ((component.hostView as any).rootNodes as HTMLElement[])[0];
    } else {
      throw new Error('Missing root view container');
    }
  }
}