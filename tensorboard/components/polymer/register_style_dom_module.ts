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
import '@polymer/polymer/lib/elements/dom-module';

export interface DomModuleOptions {
  moduleName: string;
  styleDependencies?: string[];
  styleContent: string;
}

/**
 * Interop for Polymer 3 styling
 *
 * From https://polymer-library.polymer-project.org/3.0/docs/devguide/style-shadow-dom:
 *   The following process is a workaround. While Polymer 3.0 does not use
 *   <dom-module> elements for templating, style modules do. The following process
 *   is a workaround for this fact. This process may be updated as required.
 */
export function registerStyleDomModule(args: DomModuleOptions): void {
  const {moduleName, styleContent} = args;
  const domModule = document.createElement('dom-module');
  const template = document.createElement('template');

  const styleIncludes: HTMLStyleElement[] = [];
  if (args.styleDependencies) {
    args.styleDependencies.forEach((dep) => {
      const style = document.createElement('style');
      style.setAttribute('include', dep);
      styleIncludes.push(style);
    });
  }
  const style = document.createElement('style');
  Object.assign(style, {textContent: styleContent});

  styleIncludes.forEach((styleElement) => {
    template.content.appendChild(styleElement);
  });
  template.content.appendChild(style);
  domModule.appendChild(template);
  (domModule as any).register(moduleName);
}
