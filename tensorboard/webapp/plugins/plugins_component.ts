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
 * Renders an active plugin's dashboard.
 *
 * Note that, for Polymer and iframe-based dashboards, it caches the DOM elements.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {UiPluginMetadata} from './plugins_container';
import {
  LoadingMechanismType,
  CustomElementLoadingMechanism,
} from '../types/api';

@Component({
  selector: 'plugins-component',
  templateUrl: './plugins_component.ng.html',
  styles: [
    '.plugins { height: 100%; }',
    'iframe { border: 0; height: 100%; width: 100%; }',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginsComponent implements OnChanges {
  @ViewChild('pluginContainer', {static: true, read: ElementRef})
  private readonly pluginsContainer!: ElementRef<HTMLDivElement>;

  @Input()
  activePlugin?: UiPluginMetadata;

  @Input()
  lastUpdated?: number;

  readonly LoadingMechanismType = LoadingMechanismType;

  private readonly pluginInstances = new Map<string, HTMLElement>();

  ngOnChanges(change: SimpleChanges): void {
    if (change['activePlugin'] && this.activePlugin) {
      this.renderPlugin(this.activePlugin!);
    }
    if (change['lastUpdated']) {
      this.reload();
    }
  }

  private renderPlugin(plugin: UiPluginMetadata) {
    for (const element of this.pluginInstances.values()) {
      element.style.display = 'none';
    }

    if (this.pluginInstances.has(plugin.id)) {
      const instance = this.pluginInstances.get(plugin.id) as HTMLElement;
      instance.style.removeProperty('display');
      return;
    }

    const pluginElement = this.createPlugin(plugin);
    if (pluginElement) {
      pluginElement.id = plugin.id;
      this.pluginInstances.set(plugin.id, pluginElement);
    }
  }

  private createPlugin(plugin: UiPluginMetadata): HTMLElement | null {
    let pluginElement = null;
    switch (plugin.loading_mechanism.type) {
      case LoadingMechanismType.CUSTOM_ELEMENT: {
        const customElementPlugin = plugin.loading_mechanism as CustomElementLoadingMechanism;
        pluginElement = document.createElement(
          customElementPlugin.element_name
        );
        this.pluginsContainer.nativeElement.appendChild(pluginElement);
        break;
      }
      case LoadingMechanismType.IFRAME: {
        pluginElement = document.createElement('iframe');
        pluginElement.id = plugin.id;
        // Ideally should use the DOMSanitizer but it is not usable in TypeScript.
        pluginElement.setAttribute(
          'src',
          `data/plugin_entry.html?name=${plugin.id}`
        );
        this.pluginsContainer.nativeElement.appendChild(pluginElement);
        break;
      }
      case LoadingMechanismType.NG_COMPONENT:
        // Let the Angular template render the component.
        break;
      case LoadingMechanismType.NONE:
        break;
      default:
        console.error('Unexpected plugin');
    }
    return pluginElement;
  }

  private reload() {
    for (const instance of this.pluginInstances.values()) {
      const maybePolymerDashboard = instance as any;
      if (maybePolymerDashboard.reload) {
        maybePolymerDashboard.reload();
      }
    }
  }
}
