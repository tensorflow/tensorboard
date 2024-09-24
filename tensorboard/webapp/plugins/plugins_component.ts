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
  ComponentFactoryResolver,
  ElementRef,
  Input,
  OnChanges,
  Optional,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {PluginApiHostModule} from '../../components/experimental/plugin_util/plugin_api_host_module';
import {FeatureFlags} from '../feature_flag/types';
import {
  CustomElementLoadingMechanism,
  LoadingMechanismType,
} from '../types/api';
import {DataLoadState} from '../types/data';
import {UiPluginMetadata} from './plugins_container';
import {PluginRegistryModule} from './plugin_registry_module';

interface PolymerDashboard extends HTMLElement {
  reload?: () => void;
}

export enum PluginLoadState {
  ENVIRONMENT_FAILURE_NOT_FOUND,
  ENVIRONMENT_FAILURE_PERMISSION_DENIED,
  ENVIRONMENT_FAILURE_UNKNOWN,
  NO_ENABLED_PLUGINS,
  UNKNOWN_PLUGIN_ID,
  LOADED,
  LOADING,
}

@Component({
  standalone: false,
  selector: 'plugins-component',
  templateUrl: './plugins_component.ng.html',
  styleUrls: ['plugins_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginsComponent implements OnChanges {
  constructor(
    private readonly componentFactoryResolver: ComponentFactoryResolver,
    private readonly pluginRegistry: PluginRegistryModule,
    @Optional() private readonly pluginApiHost: PluginApiHostModule
  ) {}

  @ViewChild('pluginContainer', {static: true, read: ElementRef})
  private readonly pluginsContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('ngPluginContainer', {static: true, read: ViewContainerRef})
  private readonly ngPluginContainer!: ViewContainerRef;

  @Input()
  activePluginId!: string | null;

  @Input()
  activeKnownPlugin!: UiPluginMetadata | null;

  @Input()
  pluginLoadState!: PluginLoadState;

  @Input()
  dataLocation!: string;

  @Input()
  isFeatureFlagsLoaded!: boolean;

  @Input()
  settingsLoadState!: DataLoadState;

  /**
   * Feature flags to pass to underlying plugins. Currently only passed to
   * plugins of type CUSTOM_ELEMENT. The feature flags are set directly on
   * the element as the featureFlags property.
   */
  @Input()
  featureFlags!: FeatureFlags;

  @Input()
  lastUpdated?: number;

  @Input()
  environmentFailureNotFoundTemplate?: TemplateRef<any>;

  @Input()
  environmentFailurePermissionDeniedTemplate?: TemplateRef<any>;

  @Input()
  environmentFailureUnknownTemplate?: TemplateRef<any>;

  readonly PluginLoadState = PluginLoadState;
  readonly LoadingMechanismType = LoadingMechanismType;

  private readonly pluginInstances = new Map<string, HTMLElement>();

  ngOnChanges(change: SimpleChanges): void {
    // TODO: Handle case where this.activeKnownPlugin goes from truthy to falsy.
    //       It might happen when users are navigating between experiments and
    //       the new experiment does not have data for the active dashboard?

    if (
      !this.isFeatureFlagsLoaded ||
      !this.activeKnownPlugin ||
      this.settingsLoadState === DataLoadState.NOT_LOADED ||
      this.settingsLoadState === DataLoadState.LOADING
    ) {
      return;
    }

    const shouldCreatePlugin = Boolean(
      this.activeKnownPlugin &&
        !this.pluginInstances.has(this.activeKnownPlugin.id)
    );

    if (
      change['activeKnownPlugin'] ||
      change['isFeatureFlagsLoaded'] ||
      change['settingsLoadState']
    ) {
      const prevActiveKnownPlugin = change['activeKnownPlugin']?.previousValue;
      if (
        prevActiveKnownPlugin &&
        prevActiveKnownPlugin.id !== this.activeKnownPlugin.id
      ) {
        this.hidePlugin(prevActiveKnownPlugin);
      }
      if (shouldCreatePlugin) {
        const pluginElement = this.createPlugin(this.activeKnownPlugin);
        if (pluginElement) {
          this.pluginInstances.set(this.activeKnownPlugin.id, pluginElement);
        }
      } else {
        this.showPlugin(this.activeKnownPlugin);
      }
    }
    if (shouldCreatePlugin || change['lastUpdated']) {
      this.reload(this.activeKnownPlugin, shouldCreatePlugin);
    }
  }

  private hidePlugin(plugin: UiPluginMetadata) {
    // In case the active plugin does not have a DOM, for example, core plugin, the
    // instance can be falsy.
    if (!this.pluginInstances.has(plugin.id)) return;

    const instance = this.pluginInstances.get(plugin.id) as HTMLElement;
    Object.assign(instance.style, {
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

  private showPlugin(plugin: UiPluginMetadata) {
    // In case the active plugin does not have a DOM, for example, core plugin, the
    // instance can be falsy.
    if (!this.pluginInstances.has(plugin.id)) return;

    const instance = this.pluginInstances.get(plugin.id) as HTMLElement;
    Object.assign(instance.style, {
      maxHeight: null,
      overflow: null,
      visibility: null,
      position: null,
    });
  }

  private createPlugin(plugin: UiPluginMetadata): HTMLElement | null {
    let pluginElement = null;
    switch (plugin.loading_mechanism.type) {
      case LoadingMechanismType.CUSTOM_ELEMENT: {
        const customElementPlugin =
          plugin.loading_mechanism as CustomElementLoadingMechanism;
        pluginElement = document.createElement(
          customElementPlugin.element_name
        );
        (pluginElement as any).reloadOnReady = false;
        (pluginElement as any).featureFlags = this.featureFlags;
        this.pluginsContainer.nativeElement.appendChild(pluginElement);
        break;
      }
      case LoadingMechanismType.IFRAME: {
        if (!this.pluginApiHost) {
          // In order to support iframe-based plugins the top-level module
          // (often named 'AppModule') needs to import PluginApiHostModule.
          throw Error(`IFRAME-based plugins not supported: ${plugin.id}`);
        }

        pluginElement = document.createElement('iframe');
        // Ideally should use the DOMSanitizer but it is not usable in TypeScript.
        pluginElement.setAttribute(
          'src',
          `data/plugin_entry.html?name=${plugin.id}`
        );
        this.pluginApiHost.registerPluginIframe(pluginElement, plugin.id);
        this.pluginsContainer.nativeElement.appendChild(pluginElement);
        break;
      }
      case LoadingMechanismType.NG_COMPONENT:
        const ngComponentClass = this.pluginRegistry.getComponent(plugin.id);
        if (ngComponentClass) {
          const componentFactory =
            this.componentFactoryResolver.resolveComponentFactory(
              ngComponentClass
            );
          const pluginComponent =
            this.ngPluginContainer.createComponent(componentFactory);
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

  private reload(plugin: UiPluginMetadata, initialStamp: boolean) {
    if (!initialStamp && plugin.disable_reload) {
      return;
    }

    const maybeDashboard = this.pluginInstances.get(
      plugin.id
    ) as PolymerDashboard;
    if (maybeDashboard && maybeDashboard.reload) {
      maybeDashboard.reload();
    }
  }
}
