var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var vz_projector;
(function (vz_projector) {
    // tslint:disable-next-line
    vz_projector.MetadataCardPolymer = vz_projector.PolymerElement({
        is: 'vz-projector-metadata-card',
        properties: {
            hasMetadata: { type: Boolean, value: false },
            isCollapsed: { type: Boolean, value: false },
            collapseIcon: { type: String, value: 'expand-less' },
            metadata: { type: Array },
            label: String
        }
    });
    var MetadataCard = /** @class */ (function (_super) {
        __extends(MetadataCard, _super);
        function MetadataCard() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /** Handles toggle of metadata-container. */
        MetadataCard.prototype._toggleMetadataContainer = function () {
            this.$$('#metadata-container').toggle();
            this.isCollapsed = !this.isCollapsed;
            this.set('collapseIcon', this.isCollapsed ? 'expand-more' : 'expand-less');
        };
        MetadataCard.prototype.updateMetadata = function (pointMetadata) {
            this.pointMetadata = pointMetadata;
            this.hasMetadata = (pointMetadata != null);
            if (pointMetadata) {
                var metadata = [];
                for (var metadataKey in pointMetadata) {
                    if (!pointMetadata.hasOwnProperty(metadataKey)) {
                        continue;
                    }
                    metadata.push({ key: metadataKey, value: pointMetadata[metadataKey] });
                }
                this.metadata = metadata;
                this.label = '' + this.pointMetadata[this.labelOption];
            }
        };
        MetadataCard.prototype.setLabelOption = function (labelOption) {
            this.labelOption = labelOption;
            if (this.pointMetadata) {
                this.label = '' + this.pointMetadata[this.labelOption];
            }
        };
        return MetadataCard;
    }(vz_projector.MetadataCardPolymer));
    vz_projector.MetadataCard = MetadataCard;
    document.registerElement(MetadataCard.prototype.is, MetadataCard);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
