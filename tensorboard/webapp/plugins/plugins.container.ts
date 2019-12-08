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
import {Component, ElementRef, ViewChild, OnInit, Inject, ViewContainerRef} from '@angular/core';
import {Store, select, createSelector} from '@ngrx/store';
import {filter, distinctUntilChanged} from 'rxjs/operators';

import {getPlugins, getActivePlugin, getPluginsListLoaded} from '../core/store';
import {
  PluginMetadata,
  LoadingMechanismType,
  CustomElementLoadingMechanism,
  IframeLoadingMechanism,
  NgElementLoadingMechanism,
} from '../types/api';
import {LoadState, State} from '../core/store/core.types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
import {NgPluginLoaderService} from './ng-plugin-loader';

interface UiPluginMetadata extends PluginMetadata {
  id: string;
}

const activePlugin = createSelector(
  getPlugins,
  getActivePlugin,
  (plugins, id): UiPluginMetadata | null => {
    if (!id || !plugins) return null;
    return Object.assign({id}, plugins[id]);
  }
);

const lastLoadedTimeInMs = createSelector(
  getPluginsListLoaded,
  (loadState: LoadState) => {
    return loadState.lastLoadedTimeInMs;
  }
);

@Component({
  selector: 'plugins',
  template: `
    <div #plugins class="plugins">
    </div>
  `,
  styles: ['.plugins { height: 100%; }', 'iframe { border: 0; }'],
})
export class PluginsContainer implements OnInit {
  @ViewChild('plugins', {static: true, read: ElementRef})
  private readonly pluginsContainer!: ElementRef<HTMLDivElement>;

  // @ViewChild(NgPluginDirective, {static: true}) ngPluginHost: NgPluginDirective;

  private readonly activePlugin$ = this.store.pipe(select(activePlugin));
  private readonly lastLoadedTimeInMs$ = this.store.pipe(
    select(lastLoadedTimeInMs)
  );

  private readonly ngPluginInstances = new Map<String, HTMLElement>();
  private readonly pluginInstances = new Map<string, HTMLElement>();
  private readonly ngPluginLoaderService: NgPluginLoaderService;

  constructor(private readonly store: Store<State>,
              @Inject(NgPluginLoaderService) ngPluginLoaderService: NgPluginLoaderService,
              @Inject(ViewContainerRef) viewContainerRef: ViewContainerRef) {
    this.ngPluginLoaderService = ngPluginLoaderService;
    this.ngPluginLoaderService.setRootViewContainerRef(viewContainerRef);
  }

  ngOnInit() {
    console.log('this.ngPluginLoaderService:', this.ngPluginLoaderService);  // DEBUG
    // Populate the list of ng (NG_ELEMENT) plugins.

    // Hide all Angular plugins by default.
    this.populateAndHideAllPluginsChildren();

    // We manually create plugin DOM (with custom tagName and script inside
    // an iframe) when the `activePlugin` changes.
    this.activePlugin$
      .pipe(
        filter(Boolean),
        distinctUntilChanged(
          (prev: UiPluginMetadata, curr: UiPluginMetadata) =>
            prev.id === curr.id
        )
      )
      .subscribe((plugin: UiPluginMetadata) => this.renderPlugin(plugin));

    this.lastLoadedTimeInMs$
      .pipe(
        filter(Boolean),
        distinctUntilChanged()
      )
      .subscribe(() => {
        for (const instance of this.pluginInstances.values()) {
          const maybePolymerDashboard = instance as any;
          if (maybePolymerDashboard.reload) {
            maybePolymerDashboard.reload();
          }
        }
      });
  }

  private renderPlugin(plugin: UiPluginMetadata) {
    for (const element of this.ngPluginInstances.values()) {
      element.style.display = 'none';
    }
    for (const element of this.pluginInstances.values()) {
      element.style.display = 'none';
    }

    if (plugin.loading_mechanism.type == LoadingMechanismType.NG_ELEMENT) {
      const ngElementName = (plugin.loading_mechanism as NgElementLoadingMechanism).ng_element_name;
      const ngPluginElement = this.ngPluginLoaderService.addNgPlugin(ngElementName);
      console.log(`ngPluginElement:`, ngPluginElement);  // dEBUG
      return;
    }
    // console.log(`this.pluginInstances:`, this.pluginInstances);  // DEBUG
    if (this.pluginInstances.has(plugin.id)) {
      const instance = this.pluginInstances.get(plugin.id) as HTMLElement;
      instance.style.display = null;
      return;
    }

    this.appendPlugin(plugin);
  }

  private appendPlugin(plugin: UiPluginMetadata) {
    const pluginId = plugin.id;

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
        const iframePlugin = plugin.loading_mechanism as IframeLoadingMechanism;
        pluginElement = document.createElement('iframe');
        this.pluginsContainer.nativeElement.appendChild(pluginElement);
        const subdocument = pluginElement.contentDocument as HTMLDocument;
        const script = subdocument.createElement('script');
        const baseHrefString = JSON.stringify(
          new URL(`data/${pluginId}/`, window.location.href)
        );
        const moduleString = JSON.stringify(iframePlugin.module_path);
        script.textContent = [
          // `setTimeout(..., 0)` and the late `<base>` configuration
          // (in the inline script rather than the host) are needed to
          // work around a Firefox bug:
          // https://github.com/tensorflow/tensorboard/issues/2536
          `setTimeout(() => {`,
          `  const base = document.createElement("base");`,
          `  base.setAttribute("href", ${baseHrefString});`,
          `  document.head.appendChild(base);`,
          `  import(${moduleString}).then((m) => void m.render());`,
          `}, 0);`,
        ].join('\n');
        subdocument.body.appendChild(script);
        break;
      }
      case LoadingMechanismType.NONE: {
        return;
      }
      default:
        console.error('Unexpected plugin');
    }
    if (pluginElement) {
      pluginElement.id = pluginId;
      this.pluginInstances.set(pluginId, pluginElement);
    }
  }

  private populateAndHideAllPluginsChildren() {
    for (
      let i = 0;
      i < this.pluginsContainer.nativeElement.childElementCount;
      ++i
    ) {
      const child = this.pluginsContainer.nativeElement.children[
        i
      ] as HTMLElement;
      this.ngPluginInstances.set(child.tagName, child);
      console.log('Added', child.tagName, child.nodeName); // DEBUG
      child.style.display = 'none'; // TODO(cais): Restore.
    }
  }
}
