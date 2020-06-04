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
  ComponentFactoryResolver,
  ViewContainerRef,
} from '@angular/core';

import {UiPluginMetadata} from './plugins_container';
import {
  LoadingMechanismType,
  CustomElementLoadingMechanism,
} from '../types/api';
import {PluginRegistryModule} from './plugin_registry_module';

@Component({
  selector: 'plugins-component',
  templateUrl: './plugins_component.ng.html',
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .plugins {
        height: 100%;
        position: relative;
      }
      .no-plugin {
        background-color: #fff;
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
      .warning-message {
        margin: 80px auto 0;
        max-width: 540px;
      }
      .last-reload-time {
        font-style: italic;
      }
    `,
    'iframe { border: 0; height: 100%; width: 100%; }',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginsComponent implements OnChanges {
  constructor(
    private readonly componentFactoryResolver: ComponentFactoryResolver,
    private readonly pluginRegistry: PluginRegistryModule
  ) {}

  @ViewChild('pluginContainer', {static: true, read: ElementRef})
  private readonly pluginsContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('ngPluginContainer', {static: true, read: ViewContainerRef})
  private readonly ngPluginContainer!: ViewContainerRef;

  @Input()
  activePlugin!: UiPluginMetadata | null;

  @Input()
  noEnabledPlugin!: boolean;

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
      Object.assign(element.style, {
        maxHeight: 0,
        overflow: 'hidden',
        /**
         * We further make containers invisible. Some elements may anchor to
         * the viewport instead of the container, in which case setting the max
         * height here to 0 will not hide them.
         **/
        visibility: 'hidden',
        position: 'absolute',
      });
    }

    if (this.pluginInstances.has(plugin.id)) {
      const instance = this.pluginInstances.get(plugin.id) as HTMLElement;
      Object.assign(instance.style, {
        maxHeight: null,
        overflow: null,
        visibility: null,
        position: null,
      });
      return;
    }

    const pluginElement = this.createPlugin(plugin);
    if (pluginElement) {
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
        // Ideally should use the DOMSanitizer but it is not usable in TypeScript.
        pluginElement.setAttribute(
          'src',
          `data/plugin_entry.html?name=${plugin.id}`
        );
        this.pluginsContainer.nativeElement.appendChild(pluginElement);
        break;
      }
      case LoadingMechanismType.NG_COMPONENT:
        const ngComponentClass = this.pluginRegistry.getComponent(plugin.id);
        if (ngComponentClass) {
          const componentFactory = this.componentFactoryResolver.resolveComponentFactory(
            ngComponentClass
          );
          const pluginComponent = this.ngPluginContainer.createComponent(
            componentFactory
          );
          pluginElement = pluginComponent.location.nativeElement;
        } else {
          console.error(
            `No registered Angular component for plugin: ${plugin.id}`
          );
        }
        break;
      case LoadingMechanismType.NONE:
        break;
      default:
        console.error('Unexpected plugin');
    }
    return pluginElement;
  }

  private reload() {
    if (!this.activePlugin || this.activePlugin.disable_reload) {
      return;
    }

    const maybeDashboard = this.pluginInstances.get(
      this.activePlugin.id
    ) as any;
    if (maybeDashboard.reload) {
      maybeDashboard.reload();
    }
  }
}
