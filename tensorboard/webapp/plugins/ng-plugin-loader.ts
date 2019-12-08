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

/**
 * A Service that loads plugins written in Angular dynamically.
 *
 * This is *only* for built-in plugins of TensorBoard.
 */

import {
  ComponentFactoryResolver,
  Injectable,
  Inject,
  ViewContainerRef,
} from '@angular/core';

import {DebuggerContainer} from '../../plugins/debugger_v2/tf_debugger_v2_plugin/debugger.container';

// Any built-in Angular plugin should be registered here.
// TODO(cais): Explore tightening value type.
const NG_PLUGINS: {[pluginName: string]: any} = {
  'tf-debugger-v2': DebuggerContainer,
};

@Injectable()
export class NgPluginLoaderService {
  private factoryResolver: ComponentFactoryResolver;

  constructor(
    @Inject(ComponentFactoryResolver) factoryResolver: ComponentFactoryResolver
  ) {
    this.factoryResolver = factoryResolver;
  }

  /**
   * Craete an Angular plugin and attached it as to a container element.
   *
   * @param ngPluginName The name of the Angular plugin component to use to look
   *   up the component.
   * @param rootViewContainer The ViewContainerRef under which the new Angular
   *   plugin component will be craeted.
   * @param pluginsContainer The HTMLElement to which the HTMLElement from the
   *   newly-created components will be appended as a child.
   * @returns The HTMLElement of the newly created plugin component.
   */
  createNgPlugin(
    ngPluginName: string,
    rootViewContainer: ViewContainerRef,
    pluginsContainer: HTMLElement
  ): HTMLElement {
    if (NG_PLUGINS[ngPluginName] == null) {
      throw new Error(
        `Unknown Angular Plugin name: "${ngPluginName}". ` +
          `Known names are: ${JSON.stringify(Object.keys(NG_PLUGINS))}`
      );
    }
    const factory = this.factoryResolver.resolveComponentFactory(
      NG_PLUGINS[ngPluginName]
    );
    if (rootViewContainer == null) {
      throw new Error('Missing root view container');
    }
    if (pluginsContainer == null) {
      throw new Error('Missing plugins parent element.');
    }
    const component = factory.create(rootViewContainer.injector);
    const element = ((component.hostView as any).rootNodes as HTMLElement[])[0];
    if (element == null) {
      throw new Error(
        `Newly created Angular component for plugin "${ngPluginName}" is ` +
          `unexpectedly empty.`
      );
    }
    pluginsContainer.appendChild(element);
    return element;
  }
}
