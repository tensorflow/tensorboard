/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
namespace vz_projector {

// tslint:disable-next-line
export let MetadataCardPolymer = PolymerElement({
  is: 'vz-projector-metadata-card',
  properties: {
    hasMetadata: {type: Boolean, value: false},
    isCollapsed: {type: Boolean, value: false},
    collapseIcon: {type: String, value: 'expand-less'},
    metadata: {type: Array},
    label: String
  }
});

export class MetadataCard extends MetadataCardPolymer {
  hasMetadata: boolean;
  isCollapsed: boolean;
  collapseIcon: string;
  metadata: Array<{key: string, value: string}>;
  label: string;

  private labelOption: string;
  private pointMetadata: PointMetadata;

  /** Handles toggle of metadata-container. */
  _toggleMetadataContainer() {
    (this.$$('#metadata-container') as any).toggle();
    this.isCollapsed = !this.isCollapsed;
    this.set('collapseIcon', this.isCollapsed ? 'expand-more' : 'expand-less');
  }

  updateMetadata(pointMetadata?: PointMetadata) {
    this.pointMetadata = pointMetadata;
    this.hasMetadata = (pointMetadata != null);

    if (pointMetadata) {
      let metadata = [];
      for (let metadataKey in pointMetadata) {
        if (!pointMetadata.hasOwnProperty(metadataKey)) {
          continue;
        }
        metadata.push({key: metadataKey, value: pointMetadata[metadataKey]});
      }

      this.metadata = metadata;
      this.label = '' + this.pointMetadata[this.labelOption];
    }
  }

  setLabelOption(labelOption: string) {
    this.labelOption = labelOption;
    if (this.pointMetadata) {
      this.label = '' + this.pointMetadata[this.labelOption];
    }
  }
}

document.registerElement(MetadataCard.prototype.is, MetadataCard);

}  // namespace vz_projector
