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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {PluginType} from '../../data_source';

declare namespace Intl {
  class ListFormat {
    constructor(
      locale?: string,
      options?: {
        localeMatcher?: 'lookup' | 'best fit';
        style?: 'long' | 'short' | 'narrow';
        type?: 'unit' | 'conjunction' | 'disjunction';
      }
    );
    format: (items: string[]) => string;
  }
}

@Component({
  standalone: false,
  selector: 'metrics-empty-tag-match-component',
  template: `No matches for tag filter <code>/{{ tagFilterRegex }}/</code
    ><span *ngIf="pluginTypes.size">
      and {{ getPluginTypeFilterString(pluginTypes) }} visualization
      filter</span
    >
    out of {{ tagCounts | number }} tags.`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyTagMatchMessageComponent {
  readonly PluginType = PluginType;
  private readonly listFormatter = new Intl.ListFormat(undefined, {
    style: 'long',
    type: 'disjunction',
  });

  @Input() pluginTypes!: Set<PluginType>;
  @Input() tagFilterRegex!: string;
  @Input() tagCounts!: number;

  getPluginTypeFilterString(pluginTypes: Set<PluginType>): string {
    const humanReadableTypes = [...pluginTypes].map((type) => {
      switch (type) {
        case PluginType.SCALARS:
          return 'scalar';
        case PluginType.IMAGES:
          return 'image';
        case PluginType.HISTOGRAMS:
          return 'histogram';
        default:
          const _: never = type;
          throw new RangeError(
            `Please implement human readable name for plugin type: ${type}`
          );
      }
    });

    return this.listFormatter.format(humanReadableTypes);
  }
}
