/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
import BytesList from 'goog:proto.tensorflow.BytesList';
import Example from 'goog:proto.tensorflow.Example';
import Feature from 'goog:proto.tensorflow.Feature';
import FeatureList from 'goog:proto.tensorflow.FeatureList';
import FeatureLists from 'goog:proto.tensorflow.FeatureLists';
import Features from 'goog:proto.tensorflow.Features';
import FloatList from 'goog:proto.tensorflow.FloatList';
import Int64List from 'goog:proto.tensorflow.Int64List';
import SequenceExample from 'goog:proto.tensorflow.SequenceExample';
var vz_example_viewer;
(function (vz_example_viewer) {
    var INT_FEATURE_NAME = 'int';
    var FLOAT_FEATURE_NAME = 'float';
    var BASE_64_IMAGE_ENCODING_PREFIX = 'base64,';
    var LEGEND_WIDTH_PX = 260;
    var LEGEND_HEIGHT_PX = 20;
    var CHANGE_CALLBACK_TIMER_DELAY_MS = 1000;
    var clipSaliencyRatio = .95;
    // Colors for the saliency color scale.
    var posSaliencyColor = '#0f0';
    var negSaliencyColor = '#f00';
    var neutralSaliencyColor = '#d3d3d3';
    var COLOR_INTERPOLATOR = d3.interpolateRgb;
    // Regex to find bytes features that are encoded images. Follows the guide at
    // go/tf-example.
    var IMG_FEATURE_REGEX = /^image\/([^\/]+\/)*encoded$/;
    // Corresponds to a length of a Uint8Array of size 250MB. Above this size we
    // will not decode a bytes list into a string.
    var MAX_BYTES_LIST_LENGTH = 1024 * 1024 * 250 / 8;
    // The max ratio to blend saliency map colors with a grayscaled version of an
    // image feature, to create a visually-useful saliency mask on an image.
    var IMG_SALIENCY_MAX_COLOR_RATIO = 0.5;
    // String returned when a decoded string feature is too large to display.
    var MAX_STRING_INDICATION = 'String too large to display';
    // D3 zoom extent range for image zooming.
    var ZOOM_EXTENT = [1, 20];
    var DEFAULT_WINDOW_WIDTH = 256;
    var DEFAULT_WINDOW_CENTER = 128;
    Polymer({
        is: 'vz-example-viewer',
        properties: {
            example: { type: Object },
            serializedExample: { type: String, observer: 'updateExample' },
            serializedSeqExample: { type: String, observer: 'updateSeqExample' },
            json: { type: Object, observer: 'createExamplesFromJson' },
            saliency: { type: Object, value: {} },
            saliencyJsonString: { type: String, observer: 'haveSaliencyJson' },
            readonly: { type: Boolean, value: false },
            seqNumber: { type: Number, value: 0, observer: 'newSeqNum' },
            isSequence: Boolean,
            changeCallbackTimer: Number,
            ignoreChange: Boolean,
            minSal: { type: Number, value: 0 },
            maxSal: { type: Number, value: 0 },
            showSaliency: { type: Boolean, value: false },
            imageInfo: { type: Object, value: {} },
            windowWidth: { type: Number, value: DEFAULT_WINDOW_WIDTH },
            windowCenter: { type: Number, value: DEFAULT_WINDOW_CENTER },
            saliencyCutoff: { type: Number, value: 0 },
            hasImage: { type: Boolean, value: true },
            allowImageControls: { type: Boolean, value: false },
            imageScalePercentage: { type: Number, value: 100 },
            features: { type: Object, computed: 'getFeatures(example)' },
            featuresList: { type: Object, computed: 'getFeaturesList(features, compareFeatures)' },
            seqFeatures: { type: Object, computed: 'getSeqFeatures(example)' },
            seqFeaturesList: { type: Object, computed: 'getFeaturesList(seqFeatures, compareSeqFeatures)' },
            maxSeqNumber: { type: Number, computed: 'getMaxSeqNumber(seqFeaturesList)' },
            colors: { type: Object, computed: 'getColors(saliency)', observer: 'createLegend' },
            displayMode: { type: String, value: 'grid' },
            featureSearchValue: { type: String, value: '', notify: true },
            filteredFeaturesList: { type: Object, computed: 'getFilteredFeaturesList(featuresList, featureSearchValue)' },
            filteredSeqFeaturesList: { type: Object, computed: 'getFilteredFeaturesList(seqFeaturesList, featureSearchValue)' },
            focusedFeatureName: String,
            focusedFeatureValueIndex: Number,
            focusedSeqNumber: Number,
            showDeleteValueButton: { type: Boolean, value: false },
            expandedFeatures: { type: Object, value: {} },
            expandPillClass: { type: String, value: 'expandPill' },
            expandAllFeatures: { type: Boolean, value: false },
            zeroIndex: { type: Number, value: 0 },
            compareJson: { type: Object, observer: 'createCompareExamplesFromJson' },
            compareExample: { type: Object },
            compareFeatures: {
                type: Object,
                computed: 'getFeatures(compareExample)',
                observer: 'updateCompareMode'
            },
            compareSeqFeatures: {
                type: Object,
                computed: 'getSeqFeatures(compareExample)',
                observer: 'updateCompareMode'
            },
            compareMode: Boolean,
            compareImageInfo: { type: Object, value: {} },
            compareTitle: String,
        },
        observers: [
            'haveSaliency(featuresList, saliency, colors, showSaliency, saliencyCutoff)',
            'seqSaliency(seqNumber, seqFeaturesList, saliency, colors, showSaliency, saliencyCutoff)',
        ],
        isExpanded: function (featName, expandAllFeatures) {
            return this.expandAllFeatures ||
                this.sanitizeFeature(featName) in this.expandedFeatures;
        },
        updateExample: function () {
            this.deserializeExample(this.serializedExample, Example.deserializeBinary);
        },
        // tslint:disable-next-line:no-unused-variable called as observer
        updateSeqExample: function () {
            this.deserializeExample(this.serializedSeqExample, SequenceExample.deserializeBinary);
        },
        /* Helper method to encode a string into a typed array. */
        stringToUint8Array: function (str) {
            return new window.TextEncoder().encode(str);
        },
        deserializeExample: function (serializedProto, deserializer) {
            // If ignoreChange is set then do not deserialized a newly set serialized
            // example, which would cause the entire visualization to re-render.
            if (this.ignoreChange) {
                return;
            }
            var bytes = this.decodedStringToCharCodes(atob(serializedProto));
            this.example = deserializer(bytes);
        },
        /** A computed map of all standard features in an example. */
        getFeatures: function (example) {
            // Reset our maps of image information when a new example is supplied.
            this.imageInfo = {};
            this.hasImage = false;
            if (example == null) {
                return new Map([]);
            }
            if (example instanceof Example) {
                this.isSequence = false;
                if (!example.hasFeatures()) {
                    example.setFeatures(new Features());
                }
                return example.getFeatures().getFeatureMap();
            }
            else {
                this.isSequence = true;
                if (!example.hasContext()) {
                    example.setContext(new Features());
                }
                return example.getContext().getFeatureMap();
            }
        },
        /**
         * A computed list of all standard features in an example, for driving the
         * display.
         */
        getFeaturesList: function (features, compareFeatures) {
            var featuresList = [];
            var featureSet = {};
            var it = features.keys();
            if (it) {
                var next = it.next();
                while (!next.done) {
                    featuresList.push({ name: next.value, feature: features.get(next.value) });
                    featureSet[next.value] = true;
                    next = it.next();
                }
            }
            it = compareFeatures.keys();
            if (it) {
                var next = it.next();
                while (!next.done) {
                    if (next.value in featureSet) {
                        next = it.next();
                        continue;
                    }
                    featuresList.push({ name: next.value, feature: compareFeatures.get(next.value) });
                    featureSet[next.value] = true;
                    next = it.next();
                }
            }
            return featuresList;
        },
        /** A computed map of all sequence features in an example. */
        getSeqFeatures: function (example) {
            if (example == null || example instanceof Example) {
                return new Map([]);
            }
            return this.example
                .getFeatureLists().getFeatureListMap();
        },
        getFilteredFeaturesList: function (featureList, searchValue) {
            var _this = this;
            var filtered = featureList;
            if (searchValue != '') {
                var re_1 = new RegExp(searchValue, 'i');
                filtered = featureList.filter(function (feature) { return re_1.test(feature.name); });
            }
            var sorted = filtered.sort(function (a, b) {
                if (_this.isImage(a.name) && !_this.isImage(b.name)) {
                    return -1;
                }
                else if (_this.isImage(b.name) && !_this.isImage(a.name)) {
                    return 1;
                }
                else {
                    return a.name.localeCompare(b.name);
                }
            });
            return sorted;
        },
        /**
         * Returns the maximum sequence length in the sequence example, or -1 if
         * there are no sequences.
         */
        getMaxSeqNumber: function () {
            var max = -1;
            for (var _i = 0, _a = this.seqFeaturesList; _i < _a.length; _i++) {
                var feat = _a[_i];
                var list = feat.feature;
                if (list && list.getFeatureList().length - 1 > max) {
                    max = list.getFeatureList().length - 1;
                }
            }
            return max;
        },
        haveSaliencyJson: function () {
            this.saliency = JSON.parse(this.saliencyJsonString);
        },
        getColors: function () {
            var _a;
            _a = this.getMinMaxSaliency(this.saliency), this.minSal = _a[0], this.maxSal = _a[1];
            return d3.scaleLinear()
                .domain([this.minSal, 0, this.maxSal])
                .interpolate(COLOR_INTERPOLATOR)
                .clamp(true)
                .range([
                negSaliencyColor, neutralSaliencyColor,
                posSaliencyColor
            ]);
        },
        haveSaliency: function () {
            var _this = this;
            if (!this.featuresList || !this.saliency ||
                Object.keys(this.saliency).length === 0 || !this.colors) {
                return;
            }
            // TODO(jwexler): Find a way to do this without requestAnimationFrame.
            // If the paper-inputs for the features have yet to be rendered, wait to
            // perform this processing. There should be paper-inputs for all non-image
            // features.
            if (d3.selectAll('.value input').size() <
                (this.featuresList.length - Object.keys(this.imageInfo).length)) {
                requestAnimationFrame(function () { return _this.haveSaliency(); });
                return;
            }
            // Reset all text to black
            d3.selectAll('.value-pill')
                .style('background', 'lightgrey');
            var _loop_1 = function (feat) {
                var val = this_1.saliency[feat.name];
                // If there is no saliency information for the feature, do not color it.
                if (!val) {
                    return "continue";
                }
                var colorFn = Array.isArray(val) ?
                    function (d, i) { return _this.getColorForSaliency(val[i]); } :
                    function () { return _this.getColorForSaliency(val); };
                d3.selectAll("." + this_1.sanitizeFeature(feat.name) + ".value-pill")
                    .style('background', this_1.showSaliency ? colorFn : function () { return 'lightgrey'; });
            };
            var this_1 = this;
            // Color the text of each input element of each feature according to the
            // provided saliency information.
            for (var _i = 0, _a = this.featuresList; _i < _a.length; _i++) {
                var feat = _a[_i];
                _loop_1(feat);
            }
            // TODO(jwexler): Determine how to set non-fixed widths to input boxes
            // inside of grid iron-list.
        },
        /**
         * Updates the saliency coloring of the sequential features when the current
         * sequence number changes.
         */
        newSeqNum: function () {
            this.seqSaliency();
        },
        seqSaliency: function () {
            var _this = this;
            if (!this.seqFeaturesList || !this.saliency ||
                Object.keys(this.saliency).length === 0 || !this.colors) {
                return;
            }
            // TODO(jwexler): Find a way to do this without requestAnimationFrame.
            // If the paper-inputs for the features have yet to be rendered, wait to
            // perform this processing.
            if (d3.selectAll('.value input').size() < this.seqFeaturesList.length) {
                requestAnimationFrame(function () { return _this.seqSaliency(); });
                return;
            }
            var _loop_2 = function (feat) {
                var vals = this_2.saliency[feat.name];
                // If there is no saliency information for the feature, do not color it.
                if (!vals) {
                    return "continue";
                }
                var val = vals[this_2.seqNumber];
                var colorFn = Array.isArray(val) ?
                    function (d, i) { return _this.getColorForSaliency(val[i]); } :
                    function () { return _this.getColorForSaliency(val); };
                d3.selectAll("." + this_2.sanitizeFeature(feat.name) + " input")
                    .style('color', this_2.showSaliency ? colorFn : function () { return 'black'; });
            };
            var this_2 = this;
            // Color the text of each input element of each feature according to the
            // provided saliency information for the current sequence number.
            for (var _i = 0, _a = this.seqFeaturesList; _i < _a.length; _i++) {
                var feat = _a[_i];
                _loop_2(feat);
            }
        },
        /**
         * Returns a list of the min and max saliency values, clipped by the
         * saliency ratio.
         */
        getMinMaxSaliency: function (saliency) {
            var min = Infinity;
            var max = -Infinity;
            var checkSaliencies = function (saliencies) {
                if (Array.isArray(saliencies)) {
                    for (var _i = 0, saliencies_1 = saliencies; _i < saliencies_1.length; _i++) {
                        var s = saliencies_1[_i];
                        checkSaliencies(s);
                    }
                }
                else {
                    if (saliencies < min) {
                        min = saliencies;
                    }
                    if (saliencies > max) {
                        max = saliencies;
                    }
                }
            };
            for (var feat in saliency) {
                if (saliency.hasOwnProperty(feat)) {
                    checkSaliencies(saliency[feat]);
                }
            }
            min = Math.min(0, min) * clipSaliencyRatio;
            max = Math.max(0, max) * clipSaliencyRatio;
            return [min, max];
        },
        /**
         * Returns a list of the feature values for a feature. If keepBytes is true
         * then return the raw bytes. Otherwise convert them to a a readable string.
         */
        getFeatureValues: function (feature, keepBytes, isImage, compareValues) {
            var _this = this;
            var feat = compareValues ?
                this.compareFeatures.get(feature) :
                this.features.get(feature);
            if (!feat) {
                return [];
            }
            if (feat.getBytesList()) {
                if (!keepBytes) {
                    var vals = feat.getBytesList().getValueList_asU8().map(function (u8array) { return _this.decodeBytesListString(u8array, isImage); });
                    return vals;
                }
                return feat.getBytesList().getValueList().slice();
            }
            else if (feat.getInt64List()) {
                return feat.getInt64List().getValueList().slice();
            }
            else if (feat.getFloatList()) {
                return feat.getFloatList().getValueList().slice();
            }
            return [];
        },
        /**
         * Returns a list of the feature values for a the compared example for
         * a feature.
         */
        getCompareFeatureValues: function (feature, keepBytes, isImage) {
            return this.getFeatureValues(feature, keepBytes, isImage, true);
        },
        /** Returns the first feature value for a feature. */
        getFirstFeatureValue: function (feature) {
            return this.getFeatureValues(feature)[0];
        },
        /** Returns the first feature value for a compared example for a feature. */
        getFirstCompareFeatureValue: function (feature) {
            return this.getCompareFeatureValues(feature)[0];
        },
        /** Returns if a feature has more than one feature value. */
        featureHasMultipleValues: function (feature) {
            return this.getFeatureValues(feature).length > 1;
        },
        /**
         * Returns if a feature has more than one feature value in the compared
         * example.
         */
        compareFeatureHasMultipleValues: function (feature) {
            return this.getCompareFeatureValues(feature).length > 1;
        },
        /**
         * Returns a list of the sequence feature values for a feature for a given
         * sequence number. If keepBytes is true then return the raw bytes. Otherwise
         * convert them to a a readable string.
         */
        getSeqFeatureValues: function (feature, seqNum, keepBytes, isImage, compareValues) {
            var _this = this;
            var featlistholder = compareValues ?
                this.compareSeqFeatures.get(feature) :
                this.seqFeatures.get(feature);
            if (!featlistholder) {
                return [];
            }
            var featlist = featlistholder.getFeatureList();
            // It is possible that there are features that do not have sequence lengths
            // as long as the longest sequence length in the example.  In this case,
            // show an empty feature value list for that feature.
            if (!featlist || featlist.length <= seqNum) {
                return [];
            }
            var feat = featlist[seqNum];
            if (!feat) {
                return [];
            }
            if (feat.getBytesList()) {
                if (!keepBytes) {
                    return feat.getBytesList().getValueList_asU8().map(function (u8array) { return _this.decodeBytesListString(u8array, isImage); });
                }
                return feat.getBytesList().getValueList();
            }
            else if (feat.getInt64List()) {
                return feat.getInt64List().getValueList();
            }
            else if (feat.getFloatList()) {
                return feat.getFloatList().getValueList();
            }
            return [];
        },
        /**
         * Returns a list of the sequence feature values for a feature for a given
         * sequence number of the compared example.
         */
        getCompareSeqFeatureValues: function (feature, seqNum, keepBytes, isImage) {
            return this.getSeqFeatureValues(feature, seqNum, keepBytes, isImage, true);
        },
        /** Returns the first feature value for a sequence feature. */
        getFirstSeqFeatureValue: function (feature, seqNum) {
            return this.getSeqFeatureValues(feature, seqNum)[0];
        },
        /** Returns the first feature value for the compared example for a feature. */
        getFirstSeqCompareFeatureValue: function (feature, seqNum) {
            return this.getCompareSeqFeatureValues(feature, seqNum)[0];
        },
        /** Returns if a sequence feature has more than one feature value. */
        seqFeatureHasMultipleValues: function (feature, seqNum) {
            return this.getSeqFeatureValues(feature, seqNum).length > 1;
        },
        /**
         * Returns if a sequence feature has more than one feature value in the
         * compared example.
         */
        compareSeqFeatureHasMultipleValues: function (feature, seqNum) {
            return this.getCompareSeqFeatureValues(feature, seqNum).length > 1;
        },
        /**
         * Decodes a list of bytes into a readable string, treating the bytes as
         * unicode char codes. If singleByteChars is true, then treat each byte as its
         * own char, which is necessary for image strings and serialized protos.
         * Returns an empty string for arrays over 250MB in size, which should not
         * be an issue in practice with tf.Examples.
         */
        decodeBytesListString: function (bytes, singleByteChars) {
            if (bytes.length > MAX_BYTES_LIST_LENGTH) {
                return MAX_STRING_INDICATION;
            }
            return singleByteChars ? this.decodeBytesListToString(bytes) :
                new window.TextDecoder().decode(bytes);
        },
        isBytesFeature: function (feature) {
            var feat = this.features.get(feature);
            if (feat) {
                if (feat.hasBytesList()) {
                    return true;
                }
            }
            var seqfeat = this.seqFeatures.get(feature);
            if (seqfeat) {
                if (seqfeat.getFeatureList()[0].hasBytesList()) {
                    return true;
                }
            }
            return false;
        },
        /**
         * Gets the allowed input type for a feature value, according to its
         * feature type.
         */
        getInputType: function (feature) {
            var feat = this.features.get(feature);
            if (feat) {
                if (feat.getInt64List() || feat.getFloatList()) {
                    return 'number';
                }
            }
            var seqfeat = this.seqFeatures.get(feature);
            if (seqfeat) {
                if (seqfeat.getFeatureList()[0].getInt64List() ||
                    seqfeat.getFeatureList()[0].getFloatList()) {
                    return 'number';
                }
            }
            return 'text';
        },
        /**
         * Returns the feature object from the provided json attribute for a given
         * feature name.
         */
        getJsonFeature: function (feat) {
            if (!this.json) {
                return null;
            }
            if (this.json.features && this.json.features.feature) {
                var jsonFeature = this.json.features.feature[feat];
                if (jsonFeature) {
                    return jsonFeature;
                }
            }
            if (this.json.context && this.json.context.feature) {
                var jsonFeature = this.json.context.feature[feat];
                if (jsonFeature) {
                    return jsonFeature;
                }
            }
            if (this.json.featureLists && this.json.featureLists.featureList) {
                return this.json.featureLists.featureList[feat];
            }
            return null;
        },
        /**
         * Returns the value list from the provided json attribute for a given
         * feature name and sequence number (when the feature is sequential). The
         * sequence number should be NaN for non-sequential features.
         */
        getJsonValueList: function (feat, seqNum) {
            // Get the feature object for the feature name provided.
            var feature = this.getJsonFeature(feat);
            if (!feature) {
                return null;
            }
            // If a sequential feature, get the feature entry for the given sequence
            // number.
            if (!isNaN(seqNum)) {
                feature = feature.feature[seqNum];
            }
            var valueList = feature.bytesList || feature.int64List || feature.floatList;
            return valueList ? valueList.value : null;
        },
        /**
         * From an event, finds the feature, value list index and sequence number
         * that the event corresponds to.
         */
        getDataFromEvent: function (event) {
            var elem = event.target;
            // Get the control that contains the event target. The control will have its
            // data-feature attribute set.
            while (elem.dataFeature == null) {
                if (!elem.parentElement) {
                    throw new Error('Could not find ancestor control element');
                }
                elem = elem.parentElement;
            }
            return {
                feature: elem.dataFeature,
                valueIndex: elem.dataIndex,
                seqNum: elem.dataSeqNum
            };
        },
        /** Gets the Feature object corresponding to the provided DataFromControl. */
        getFeatureFromData: function (data) {
            // If there is no sequence number, then it is a standard feature, not a
            // sequential feature.
            if (isNaN(data.seqNum)) {
                return this.features.get(data.feature);
            }
            else {
                var featureLists = this.seqFeatures.get(data.feature);
                if (!featureLists) {
                    return undefined;
                }
                var featureList = featureLists.getFeatureList();
                if (!featureList) {
                    return undefined;
                }
                return featureList[data.seqNum];
            }
        },
        /** Gets the value list corresponding to the provided DataFromControl. */
        getValueListFromData: function (data) {
            // If there is no sequence number, then it is a standard feature, not a
            // sequential feature.
            if (isNaN(data.seqNum)) {
                return this.getFeatureValues(data.feature, true);
            }
            else {
                return this.getSeqFeatureValues(data.feature, data.seqNum, true);
            }
        },
        /** Sets the value list on the provided feature. */
        setFeatureValues: function (feat, values) {
            var bytesList = feat.getBytesList();
            var int64List = feat.getInt64List();
            var floatList = feat.getFloatList();
            if (bytesList) {
                bytesList.setValueList(values);
            }
            else if (int64List) {
                int64List.setValueList(values);
            }
            else if (floatList) {
                floatList.setValueList(values);
            }
        },
        /**
         * When a feature value changes from a paper-input, updates the example proto
         * appropriately.
         */
        onValueChanged: function (event) {
            var inputControl = event.target;
            var data = this.getDataFromEvent(event);
            var feat = this.getFeatureFromData(data);
            var values = this.getValueListFromData(data);
            if (feat) {
                if (this.isBytesFeature(data.feature)) {
                    // For string features, convert the string into the char code array
                    // for storage in the proto.
                    var cc = this.stringToUint8Array(inputControl.value);
                    // tslint:disable-next-line:no-any cast due to tf.Example typing.
                    values[data.valueIndex] = cc;
                    // If the example was provided as json, update the byteslist in the
                    // json with the base64 encoded string. For non-bytes features we don't
                    // need this separate json update as the proto value list is the same
                    // as the json value list for that case (shallow copy). The byteslist
                    // case is different as the json base64 encoded string is converted to
                    // a list of bytes, one per character.
                    var jsonList = this.getJsonValueList(data.feature, data.seqNum);
                    if (jsonList) {
                        jsonList[data.valueIndex] = btoa(inputControl.value);
                    }
                }
                else {
                    values[data.valueIndex] = +inputControl.value;
                    var jsonList = this.getJsonValueList(data.feature, data.seqNum);
                    if (jsonList) {
                        jsonList[data.valueIndex] = +inputControl.value;
                    }
                }
                this.setFeatureValues(feat, values);
                this.exampleChanged();
            }
        },
        onInputFocus: function (event) {
            var inputControl = event.target;
            var data = this.getDataFromEvent(event);
            this.focusedFeatureName = data.feature;
            this.focusedFeatureValueIndex = data.valueIndex;
            this.focusedSeqNumber = data.seqNum;
            this.$.deletevalue.style.top = (inputControl.getBoundingClientRect().top -
                this.getBoundingClientRect().top - 25) + 'px';
            this.$.deletevalue.style.right = (this.getBoundingClientRect().right -
                inputControl.getBoundingClientRect().right + 30) + 'px';
            this.showDeleteValueButton = true;
        },
        onInputBlur: function (event) {
            this.showDeleteValueButton = false;
        },
        /**
         * When a feature is deleted, updates the example proto appropriately.
         */
        deleteFeature: function (event) {
            var data = this.getDataFromEvent(event);
            if (this.features.del) {
                this.features.del(data.feature);
            }
            if (this.seqFeatures.del) {
                this.seqFeatures.del(data.feature);
            }
            this.deleteJsonFeature(data.feature);
            this.exampleChanged();
            this.refreshExampleViewer();
        },
        /**
         * Helper method to delete a feature from the JSON version of the example,
         * if the example was provided as JSON.
         */
        deleteJsonFeature: function (feature) {
            if (this.json) {
                if (this.json.features && this.json.features.feature) {
                    delete this.json.features.feature[feature];
                }
                if (this.json.context && this.json.context.feature) {
                    delete this.json.context.feature[feature];
                }
                if (this.json.featureLists && this.json.featureLists.featureList) {
                    delete this.json.featureLists.featureList[feature];
                }
            }
        },
        /**
         * When a feature value is deleted, updates the example proto appropriately.
         */
        deleteValue: function (event) {
            var data = this.getDataFromEvent(event);
            var feat = this.getFeatureFromData(data);
            var values = this.getValueListFromData(data);
            if (feat) {
                if (this.isBytesFeature(data.feature)) {
                    // If the example was provided as json, update the byteslist in the
                    // json. For non-bytes features we don't need this separate json update
                    // as the proto value list is the same as the json value list for that
                    // case (shallow copy). The byteslist case is different as the json
                    // base64 encoded string is converted to a list of bytes, one per
                    // character.
                    var jsonList = this.getJsonValueList(data.feature, data.seqNum);
                    if (jsonList) {
                        jsonList.splice(data.valueIndex, 1);
                    }
                }
                values.splice(data.valueIndex, 1);
                this.setFeatureValues(feat, values);
                this.exampleChanged();
                this.refreshExampleViewer();
            }
        },
        openAddFeatureDialog: function () {
            this.$.addFeatureDialog.open();
        },
        /**
         * When a feature is added, updates the example proto appropriately.
         */
        addFeature: function (event) {
            if (!this.json) {
                return;
            }
            var feat = new Feature();
            // tslint:disable-next-line:no-any Using arbitary json.
            var jsonFeat;
            if (this.newFeatureType === INT_FEATURE_NAME) {
                var valueList = [];
                var ints = new FloatList();
                ints.setValueList(valueList);
                feat.setInt64List(ints);
                jsonFeat = { int64List: { value: valueList } };
            }
            else if (this.newFeatureType === FLOAT_FEATURE_NAME) {
                var valueList = [];
                var floats = new FloatList();
                floats.setValueList(valueList);
                feat.setFloatList(floats);
                jsonFeat = { floatList: { value: valueList } };
            }
            else {
                var valueList = [];
                var bytes = new BytesList();
                bytes.setValueList(valueList);
                feat.setBytesList(bytes);
                jsonFeat = { bytesList: { value: valueList } };
            }
            this.features.set(this.newFeatureName, feat);
            this.addJsonFeature(this.newFeatureName, jsonFeat);
            this.newFeatureName = '';
            this.exampleChanged();
            this.refreshExampleViewer();
        },
        /**
         * Helper method to add a feature to the JSON version of the example,
         * if the example was provided as JSON.
         */
        // tslint:disable-next-line:no-any Using arbitary json.
        addJsonFeature: function (feature, jsonFeat) {
            if (this.json && this.json.features && this.json.features.feature) {
                this.json.features.feature[feature] = jsonFeat;
            }
            else if (this.json && this.json.context && this.json.context.feature) {
                this.json.context.feature[feature] = jsonFeat;
            }
        },
        /**
         * When a feature value is added, updates the example proto appropriately.
         */
        addValue: function (event) {
            var data = this.getDataFromEvent(event);
            var feat = this.getFeatureFromData(data);
            var values = this.getValueListFromData(data);
            if (feat) {
                if (this.isBytesFeature(data.feature)) {
                    values.push('');
                }
                else {
                    values.push(0);
                }
                this.setFeatureValues(feat, values);
                this.exampleChanged();
                this.refreshExampleViewer();
            }
        },
        /**
         * Refreshes the example viewer so that it correctly shows the updated
         * example.
         */
        refreshExampleViewer: function () {
            var _this = this;
            // In order for iron-lists to be properly updated based on proto changes,
            // need to bind the example to another (blank) example, and then back the
            // the proper example after that change has been processed.
            // TODO(jwexler): Find better way to update the visuals on proto changes.
            var temp = this.example;
            this.ignoreChange = true;
            this.example = new Example();
            this.ignoreChange = false;
            setTimeout(function () {
                _this.example = temp;
            }, 0);
        },
        exampleChanged: function () {
            // Fire example-change event.
            this.fire('example-change', { example: this.example });
            // This change is performed after a delay in order to debounce rapid updates
            // to a text/number field, as serialization can take some time and freeze
            // the visualization temporarily.
            clearTimeout(this.changeCallbackTimer);
            this.changeCallbackTimer = setTimeout(this.changeCallback.bind(this), CHANGE_CALLBACK_TIMER_DELAY_MS);
        },
        changeCallback: function () {
            // To update the serialized example, we need to ensure we ignore parsing
            // of the updated serialized example back to an example object as they
            // already match and this would cause a lot of unnecessary processing,
            // leading to long freezes in the visualization.
            this.ignoreChange = true;
            if (this.isSequence && this.serializedSeqExample) {
                this.serializedSeqExample = btoa(this.decodeBytesListString(this.example.serializeBinary(), true));
            }
            else if (this.serializedExample) {
                this.serializedExample = btoa(this.decodeBytesListString(this.example.serializeBinary(), true));
            }
            this.ignoreChange = false;
        },
        getInputPillClass: function (feat, displayMode) {
            return this.sanitizeFeature(feat) + ' value-pill' +
                (displayMode == 'grid' ? ' value-pill-grid' : ' value-pill-stacked');
        },
        getCompareInputClass: function (feat, displayMode, index) {
            var str = 'value-compare' +
                (displayMode == 'grid' ? ' value-pill-grid' : ' value-pill-stacked');
            if (index != null) {
                var values = this.getFeatureValues(feat, true);
                var compValues = this.getCompareFeatureValues(feat, true);
                if (index >= values.length || index >= compValues.length ||
                    values[index] != compValues[index]) {
                    str += ' value-different';
                }
                else {
                    str += ' value-same';
                }
            }
            return str;
        },
        getSeqCompareInputClass: function (feat, displayMode, seqNumber, index) {
            var str = 'value-compare' +
                (displayMode == 'grid' ? ' value-pill-grid' : ' value-pill-stacked');
            if (index != null) {
                var values = this.getSeqFeatureValues(feat, seqNumber, true);
                var compValues = this.getCompareSeqFeatureValues(feat, seqNumber, true);
                if (index >= values.length || index >= compValues.length ||
                    values[index] != compValues[index]) {
                    str += ' value-different';
                }
                else {
                    str += ' value-same';
                }
            }
            return str;
        },
        /**
         * Replaces non-standard chars in feature names with underscores so they can
         * be used in css classes/ids.
         */
        sanitizeFeature: function (feat) {
            var sanitized = feat;
            if (!feat.match(/^[A-Za-z].*$/)) {
                sanitized = '_' + feat;
            }
            return sanitized.replace(/[\/\.\#]/g, '_');
        },
        isSeqExample: function (maxSeqNumber) {
            return maxSeqNumber >= 0;
        },
        shouldShowSaliencyLegend: function (saliency) {
            return saliency && Object.keys(saliency).length > 0;
        },
        // tslint:disable-next-line:no-unused-variable called as computed property
        getSaliencyControlsHolderClass: function (saliency) {
            return this.shouldShowSaliencyLegend(saliency) ?
                'saliency-controls-holder' :
                'hide-saliency-controls';
        },
        /** Creates an svg legend for the saliency color mapping. */
        createLegend: function () {
            d3.select(this.$.saliencyLegend).selectAll('*').remove();
            var legendSvg = d3.select(this.$.saliencyLegend).append('g');
            var gradient = legendSvg.append('defs')
                .append('linearGradient')
                .attr('id', 'gradient')
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%")
                .attr('spreadMethod', 'pad');
            var linspace = function (start, end, n) {
                var out = [];
                var delta = (end - start) / (n - 1);
                var i = 0;
                while (i < (n - 1)) {
                    out.push(start + (i * delta));
                    i++;
                }
                out.push(end);
                return out;
            };
            // Create the correct color scale for the legend depending on minimum
            // and maximum saliency for this example.
            var scale = [];
            if (this.minSal < 0) {
                scale.push(negSaliencyColor);
            }
            scale.push(neutralSaliencyColor);
            if (this.maxSal > 0) {
                scale.push(posSaliencyColor);
            }
            // Creates an array of [pct, colour] pairs as stop
            // values for legend
            var pct = linspace(0, 100, scale.length).map(function (d) {
                return Math.round(d) + '%';
            });
            var colourPct = d3.zip(pct, scale);
            colourPct.forEach(function (d) {
                gradient.append('stop')
                    .attr('offset', d[0])
                    .attr('stop-color', d[1])
                    .attr('stop-opacity', 1);
            });
            legendSvg.append('rect')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('width', LEGEND_WIDTH_PX)
                .attr('height', LEGEND_HEIGHT_PX)
                .style('fill', 'url(#gradient)');
            var legendScale = d3.scaleLinear().domain([this.minSal, this.maxSal]).range([
                0, LEGEND_WIDTH_PX
            ]);
            var legendAxis = d3.axisBottom(legendScale);
            legendSvg.append('g')
                .attr('class', 'legend axis')
                .attr('transform', "translate(0," + LEGEND_HEIGHT_PX + ")")
                .call(legendAxis);
        },
        isImage: function (feat) {
            return IMG_FEATURE_REGEX.test(feat);
        },
        /**
         * Returns the data URI src for a feature value that is an encoded image.
         */
        getImageSrc: function (feat) {
            this.setupOnloadCallback(feat);
            return this.getImageSrcForData(feat, this.getFeatureValues(feat, false, true)[0]);
        },
        /**
         * Returns the data URI src for a feature value that is an encoded image, for
         * the compared example.
         */
        getCompareImageSrc: function (feat) {
            this.setupOnloadCallback(feat, true);
            return this.getImageSrcForData(feat, this.getCompareFeatureValues(feat, false, true)[0], true);
        },
        /**
         * Returns the data URI src for a sequence feature value that is an encoded
         * image.
         */
        getSeqImageSrc: function (feat, seqNum) {
            this.setupOnloadCallback(feat);
            return this.getImageSrcForData(feat, this.getSeqFeatureValues(feat, seqNum, false, true)[0]);
        },
        /**
         * Returns the data URI src for a sequence feature value that is an encoded
         * image, for the compared example.
         */
        getCompareSeqImageSrc: function (feat, seqNum) {
            this.setupOnloadCallback(feat, true);
            return this.getImageSrcForData(feat, this.getCompareSeqFeatureValues(feat, seqNum, false, true)[0], true);
        },
        /**
         * On the next frame, sets the onload callback for the image for the given
         * feature. This is delayed until the next frame to ensure the img element
         * is rendered before setting up the onload function.
         */
        setupOnloadCallback: function (feat, compare) {
            var _this = this;
            requestAnimationFrame(function () {
                var img = _this.$$('#' + _this.getImageId(feat, compare));
                img.onload = _this.getOnLoadForImage(feat, img, compare);
            });
        },
        /** Helper method used by getImageSrc and getSeqImageSrc. */
        getImageSrcForData: function (feat, imageData, compare) {
            // Get the format of the encoded image, according to the feature name
            // specified by go/tf-example. Defaults to jpeg as specified in the doc.
            var regExResult = IMG_FEATURE_REGEX.exec(feat);
            if (regExResult == null) {
                return null;
            }
            var featureMiddle = regExResult[1] || '';
            var formatVals = compare ?
                this.getCompareFeatureValues('image' + featureMiddle + '/format', false) :
                this.getFeatureValues('image' + featureMiddle + '/format', false);
            var format = 'jpeg';
            if (formatVals.length > 0) {
                format = formatVals[0].toLowerCase();
            }
            var src = 'data:image/' + format + ';base64,';
            // Encode the image data in base64.
            src = src + btoa(decodeURIComponent(encodeURIComponent(imageData)));
            return src;
        },
        /** Returns the length of an iterator. */
        getIterLength: function (it) {
            var len = 0;
            if (it) {
                var next = it.next();
                while (!next.done) {
                    len++;
                    next = it.next();
                }
            }
            return len;
        },
        /**
         * Updates the compare mode based off of the compared example.
         */
        updateCompareMode: function () {
            var compareMode = false;
            if ((this.compareFeatures &&
                this.getIterLength(this.compareFeatures.keys()) > 0) ||
                (this.compareSeqFeatures &&
                    this.getIterLength(this.compareSeqFeatures.keys()) > 0)) {
                compareMode = true;
            }
            this.compareMode = compareMode;
        },
        /**
         * Creates tf.Example or tf.SequenceExample jspb object from json. Useful when
         * this is embedded into a OnePlatform app that sends protos as json.
         */
        createExamplesFromJson: function (json) {
            this.example = this.createExamplesFromJsonHelper(json);
            this.compareJson = {};
        },
        /**
         * Creates compared tf.Example or tf.SequenceExample jspb object from json.
         * Useful when this is embedded into a OnePlatform app that sends protos as
         * json.
         */
        createCompareExamplesFromJson: function (json) {
            if (!json) {
                return;
            }
            this.compareExample = this.createExamplesFromJsonHelper(json);
        },
        createExamplesFromJsonHelper: function (json) {
            if (!json) {
                return null;
            }
            // If the provided json is a json string, parse it into an object.
            if (typeof this.json === 'string') {
                json = JSON.parse(this.json);
            }
            if (json.features) {
                var ex = new Example();
                ex.setFeatures(this.parseFeatures(json.features));
                return ex;
            }
            else if (json.context || json.featureLists) {
                var seqex = new SequenceExample();
                if (json.context) {
                    seqex.setContext(this.parseFeatures(json.context));
                }
                if (json.featureLists) {
                    seqex.setFeatureLists(this.parseFeatureLists(json.featureLists));
                }
                return seqex;
            }
            else {
                return new Example();
            }
        },
        // tslint:disable-next-line:no-any Parsing arbitary json.
        parseFeatures: function (features) {
            var feats = new Features();
            for (var fname in features.feature) {
                if (features.feature.hasOwnProperty(fname)) {
                    var featentry = features.feature[fname];
                    feats.getFeatureMap().set(fname, this.parseFeature(featentry, this.isImage(fname)));
                }
            }
            return feats;
        },
        // tslint:disable-next-line:no-any Parsing arbitary json.
        parseFeatureLists: function (features) {
            var feats = new FeatureLists();
            for (var fname in features.featureList) {
                if (features.featureList.hasOwnProperty(fname)) {
                    var featlistentry = features.featureList[fname];
                    var featList = new FeatureList();
                    var featureList = [];
                    for (var featentry in featlistentry.feature) {
                        if (featlistentry.feature.hasOwnProperty(featentry)) {
                            var feat = featlistentry.feature[featentry];
                            featureList.push(this.parseFeature(feat, this.isImage(fname)));
                        }
                    }
                    featList.setFeatureList(featureList);
                    feats.getFeatureListMap().set(fname, featList);
                }
            }
            return feats;
        },
        // tslint:disable-next-line:no-any Parsing arbitary json.
        parseFeature: function (featentry, isImage) {
            var feat = new Feature();
            if (featentry.floatList) {
                var floats = new FloatList();
                floats.setValueList(featentry.floatList.value);
                feat.setFloatList(floats);
            }
            else if (featentry.bytesList) {
                // Json byteslist entries are base64.  The JSPB generated Feature class
                // will marshall this to U8 automatically.
                var bytes = new BytesList();
                if (featentry.bytesList.value) {
                    bytes.setValueList(featentry.bytesList.value);
                }
                feat.setBytesList(bytes);
            }
            else if (featentry.int64List) {
                var ints = new Int64List();
                ints.setValueList(featentry.int64List.value);
                feat.setInt64List(ints);
            }
            return feat;
        },
        getImageId: function (feat, compare) {
            if (compare) {
                return this.getCompareImageId(feat);
            }
            return this.sanitizeFeature(feat) + '_image';
        },
        getCanvasId: function (feat, compare) {
            if (compare) {
                return this.getCompareCanvasId(feat);
            }
            return this.sanitizeFeature(feat) + '_canvas';
        },
        getImageCardId: function (feat, compare) {
            if (compare) {
                return this.getCompareImageCardId(feat);
            }
            return this.sanitizeFeature(feat) + '_card';
        },
        getCompareImageId: function (feat) {
            return this.sanitizeFeature(feat) + '_image_compare';
        },
        getCompareCanvasId: function (feat) {
            return this.sanitizeFeature(feat) + '_canvas_compare';
        },
        getCompareImageCardId: function (feat) {
            return this.sanitizeFeature(feat) + '_card_compare';
        },
        getFeatureDialogId: function (feat) {
            return this.sanitizeFeature(feat) + '_dialog';
        },
        featureMoreClicked: function (event) {
            var button = event.srcElement.parentElement;
            var feature = button.dataFeature;
            var dialog = this.$$('#' + this.sanitizeFeature(feature) + '_dialog');
            dialog.positionTarget = button;
            dialog.open();
        },
        expandFeature: function (event) {
            var feature = event.srcElement.dataFeature;
            this.set('expandedFeatures.' + this.sanitizeFeature(feature), true);
            this.refreshExampleViewer();
        },
        decodedStringToCharCodes: function (str) {
            var cc = new Uint8Array(str.length);
            for (var i = 0; i < str.length; ++i) {
                cc[i] = str.charCodeAt(i);
            }
            return cc;
        },
        handleImageUpload: function (event) {
            this.handleFileSelect(event, this);
        },
        // Handle upload image paper button click by delegating to appropriate
        // paper-input file chooser.
        uploadImageClicked: function (event) {
            var data = this.getDataFromEvent(event);
            var inputs = Polymer.dom(this.root).querySelectorAll('paper-input');
            var inputElem = null;
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].dataFeature == data.feature) {
                    inputElem = inputs[i];
                    break;
                }
            }
            if (inputElem) {
                inputElem.querySelector('input').click();
            }
        },
        // Handle file select for image replacement.
        handleFileSelect: function (event, self) {
            event.stopPropagation();
            event.preventDefault();
            var reader = new FileReader();
            var eventAny = event;
            var files = eventAny.dataTransfer ? eventAny.dataTransfer.files : eventAny.target.files;
            if (files.length === 0) {
                return;
            }
            reader.addEventListener('load', function () {
                // Get the image data from the loaded image and convert to a char
                // code array for use in the features value list.
                var index = +reader.result.indexOf(BASE_64_IMAGE_ENCODING_PREFIX) +
                    BASE_64_IMAGE_ENCODING_PREFIX.length;
                var encodedImageData = reader.result.substring(index);
                var cc = self.decodedStringToCharCodes(atob(encodedImageData));
                var data = self.getDataFromEvent(event);
                var feat = self.getFeatureFromData(data);
                var values = self.getValueListFromData(data);
                if (feat) {
                    // Replace the old image data in the feature value list with the new
                    // image data.
                    // tslint:disable-next-line:no-any cast due to tf.Example typing.
                    values[0] = cc;
                    feat.getBytesList().setValueList(values);
                    // If the example was provided as json, update the byteslist in the
                    // json with the base64 encoded string.
                    var jsonList = self.getJsonValueList(data.feature, data.seqNum);
                    if (jsonList) {
                        jsonList[0] = encodedImageData;
                    }
                    // Load the image data into an image element to begin the process
                    // of rendering that image to a canvas for display.
                    var img_1 = new Image();
                    self.addImageElement(data.feature, img_1);
                    img_1.addEventListener('load', function () {
                        // Runs the apppriate onload processing for the new image.
                        self.getOnLoadForImage(data.feature, img_1);
                        // If the example contains appropriately-named features describing
                        // the image width and height then update those feature values for
                        // the new image width and height.
                        var featureMiddle = IMG_FEATURE_REGEX.exec(data.feature)[1] || '';
                        var widthFeature = 'image' + featureMiddle + '/width';
                        var heightFeature = 'image' + featureMiddle + '/height';
                        var widths = self.getFeatureValues(widthFeature, false);
                        var heights = self.getFeatureValues(heightFeature, false);
                        if (widths.length > 0) {
                            widths[0] = +img_1.width;
                            self.features.get(widthFeature).getInt64List().setValueList(widths);
                        }
                        if (heights.length > 0) {
                            heights[0] = +img_1.height;
                            self.features.get(heightFeature).getInt64List().setValueList(heights);
                        }
                        self.exampleChanged();
                    });
                    img_1.src = reader.result;
                }
            }, false);
            // Read the image file as a data URL.
            reader.readAsDataURL(files[0]);
        },
        // Add drag-and-drop image replacement behavior to the canvas.
        addDragDropBehaviorToCanvas: function (canvas) {
            var self = this;
            // Handle drag event for drag-and-drop image replacement.
            function handleDragOver(event) {
                event.stopPropagation();
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
            }
            function handleFileSelect(event) {
                self.handleFileSelect(event, self);
            }
            if (!this.readonly && canvas) {
                canvas.addEventListener('dragover', handleDragOver, false);
                canvas.addEventListener('drop', handleFileSelect, false);
            }
        },
        /**
         * Returns an onload function for an img element. The function draws the image
         * to the appropriate canvas element and adds the saliency information to the
         * canvas if it exists.
         */
        getOnLoadForImage: function (feat, image, compare) {
            var _this = this;
            var f = function (feat, image, compare) {
                var canvas = _this.$$('#' + _this.getCanvasId(feat, compare));
                if (!compare) {
                    _this.addDragDropBehaviorToCanvas(canvas);
                }
                if (image && canvas) {
                    // Draw the image to the canvas and size the canvas.
                    // Set d3.zoom on the canvas to enable zooming and scaling interactions.
                    var context_1 = canvas.getContext('2d');
                    var imageScaleFactor = _this.imageScalePercentage / 100;
                    // If not using image controls then scale the image to match the
                    // available width in the container, considering padding.
                    if (!_this.allowImageControls) {
                        var holder = _this.$$('#' +
                            _this.getImageCardId(feat, compare)).parentElement;
                        var cardWidthForScaling = holder.getBoundingClientRect().width / 2;
                        if (cardWidthForScaling > 16) {
                            cardWidthForScaling -= 16;
                        }
                        if (cardWidthForScaling < image.width) {
                            imageScaleFactor = cardWidthForScaling / image.width;
                        }
                    }
                    canvas.width = image.width * imageScaleFactor;
                    canvas.height = image.height * imageScaleFactor;
                    var transformFn_1 = function (transform) {
                        context_1.save();
                        context_1.clearRect(0, 0, canvas.width, canvas.height);
                        context_1.translate(transform.x, transform.y);
                        context_1.scale(transform.k, transform.k);
                        _this.renderImageOnCanvas(context_1, canvas.width, canvas.height, feat, compare);
                        context_1.restore();
                    };
                    var zoom = function () {
                        var transform = d3.event.transform;
                        _this.addImageTransform(feat, transform, compare);
                        transformFn_1(d3.event.transform);
                    };
                    var d3zoom_1 = d3.zoom().scaleExtent(ZOOM_EXTENT).on('zoom', zoom);
                    d3.select(canvas).call(d3zoom_1).on('dblclick.zoom', function () { return d3.select(canvas).call(d3zoom_1.transform, d3.zoomIdentity); });
                    context_1.save();
                    context_1.scale(imageScaleFactor, imageScaleFactor);
                    context_1.drawImage(image, 0, 0);
                    context_1.restore();
                    _this.setImageDatum(context_1, canvas.width, canvas.height, feat, compare);
                    _this.renderImageOnCanvas(context_1, canvas.width, canvas.height, feat, compare);
                    if (compare) {
                        if (_this.compareImageInfo[feat].transform) {
                            transformFn_1(_this.compareImageInfo[feat].transform);
                        }
                    }
                    else {
                        if (_this.imageInfo[feat].transform) {
                            transformFn_1(_this.imageInfo[feat].transform);
                        }
                    }
                }
                else {
                    // If the image and canvas are not yet rendered, wait to perform this
                    // processing.
                    requestAnimationFrame(function () { return f(feat, image, compare); });
                }
            };
            this.addImageElement(feat, image, compare);
            this.addImageOnLoad(feat, f, compare);
            return f.apply(this, [feat, image, compare]);
        },
        addImageOnLoad: function (feat, onload, compare) {
            this.hasImage = true;
            if (compare) {
                if (!this.compareImageInfo[feat]) {
                    this.compareImageInfo[feat] = {};
                }
                this.compareImageInfo[feat].onload = onload;
            }
            else {
                if (!this.imageInfo[feat]) {
                    this.imageInfo[feat] = {};
                }
                this.imageInfo[feat].onload = onload;
            }
        },
        addImageData: function (feat, imageData, compare) {
            if (compare) {
                if (!this.compareImageInfo[feat]) {
                    this.compareImageInfo[feat] = {};
                }
                this.compareImageInfo[feat].imageData = imageData;
            }
            else {
                if (!this.imageInfo[feat]) {
                    this.imageInfo[feat] = {};
                }
                this.imageInfo[feat].imageData = imageData;
            }
        },
        addImageElement: function (feat, image, compare) {
            if (compare) {
                if (!this.compareImageInfo[feat]) {
                    this.compareImageInfo[feat] = {};
                }
                this.compareImageInfo[feat].imageElement = image;
            }
            else {
                if (!this.imageInfo[feat]) {
                    this.imageInfo[feat] = {};
                }
                this.imageInfo[feat].imageElement = image;
            }
        },
        addImageGrayscaleData: function (feat, imageGrayscaleData) {
            if (!this.imageInfo[feat]) {
                this.imageInfo[feat] = {};
            }
            this.imageInfo[feat].imageGrayscaleData = imageGrayscaleData;
        },
        addImageTransform: function (feat, transform, compare) {
            if (compare) {
                if (!this.compareImageInfo[feat]) {
                    this.compareImageInfo[feat] = {};
                }
                this.compareImageInfo[feat].transform = transform;
            }
            else {
                if (!this.imageInfo[feat]) {
                    this.imageInfo[feat] = {};
                }
                this.imageInfo[feat].transform = transform;
            }
        },
        /**
         * Saves the Uint8ClampedArray image data for an image feature, both for the
         * raw image, and for the image with an applied saliency mask if there is
         * saliency information for the image feature.
         */
        setImageDatum: function (context, width, height, feat, compare) {
            if (!width || !height) {
                return;
            }
            var contextData = context.getImageData(0, 0, width, height);
            var imageData = Uint8ClampedArray.from(contextData.data);
            this.addImageData(feat, imageData, compare);
            if (!this.saliency || !this.showSaliency || !this.saliency[feat] ||
                compare) {
                return;
            }
            // Grayscale the image for later use with a saliency mask.
            var salData = Uint8ClampedArray.from(imageData);
            for (var i = 0; i < imageData.length; i += 4) {
                // Average pixel color value for grayscaling the pixel.
                var avg = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
                salData[i] = avg;
                salData[i + 1] = avg;
                salData[i + 2] = avg;
            }
            this.addImageGrayscaleData(feat, salData);
        },
        /** Updates image data pixels based on windowing parameters. */
        contrastImage: function (d, windowWidth, windowCenter) {
            // See https://www.dabsoft.ch/dicom/3/C.11.2.1.2/ for algorithm description.
            var contrastScale = d3.scaleLinear()
                .domain([
                windowCenter - .5 - (windowWidth / 2),
                windowCenter - .5 + ((windowWidth - 1) / 2)
            ])
                .clamp(true)
                .range([0, 255]);
            for (var i = 0; i < d.length; i++) {
                // Skip alpha channel.
                if (i % 4 !== 3) {
                    d[i] = contrastScale(d[i]);
                }
            }
        },
        /**
         * Returns true if the saliency value provided is higher than the
         * saliency cutoff, under which saliency values aren't displayed.
         */
        showSaliencyForValue: function (salVal) {
            var salExtremeToCompare = salVal >= 0 ? this.maxSal : this.minSal;
            return Math.abs(salVal) >=
                (Math.abs(salExtremeToCompare) * this.saliencyCutoff / 100.);
        },
        /** Returns the color to display for a given saliency value. */
        getColorForSaliency: function (salVal) {
            if (!this.showSaliencyForValue(salVal)) {
                return neutralSaliencyColor;
            }
            else {
                return this.colors(salVal);
            }
        },
        /** Adjusts image data pixels to overlay the saliency mask. */
        addSaliencyToImage: function (d, sal) {
            // If provided an array of SaliencyValue then get the correct saliency map
            // for the currently selected sequence number.
            if (Array.isArray(sal) && sal.length > 0 && Array.isArray(sal[0])) {
                sal = sal[this.seqNumber];
            }
            // Grayscale the image and combine the colored pixels based on saliency at
            // that pixel. This loop examines each pixel, each of which consists of 4
            // values (r, g, b, a) in the data array.
            // Calculate the adjustment factor in order to index into the correct
            // saliency value for each pixel given that the image may have been scaled,
            // meaning that the canvas image data array would not have a one-to-one
            // correspondence with the per-original-image-pixel saliency data.
            var salScaleAdjustment = 1 / Math.pow(this.imageScalePercentage / 100, 2);
            for (var i = 0; i < d.length; i += 4) {
                // Get the saliency value for the pixel. If the saliency map contains only
                // a single value for the image, use it for all pixels.
                var salVal = 0;
                var salIndex = Math.floor(i / 4 * salScaleAdjustment);
                if (Array.isArray(sal)) {
                    if (sal.length > salIndex) {
                        salVal = sal[salIndex];
                    }
                    else {
                        salVal = 0;
                    }
                }
                else {
                    salVal = sal;
                }
                // Blend the grayscale pixel with the saliency mask color for the pixel
                // to get the final r, g, b values for the pixel.
                var ratioToSaliencyExtreme = this.showSaliencyForValue(salVal) ?
                    (salVal >= 0 ? this.maxSal === 0 ? 0 : salVal / this.maxSal :
                        salVal / this.minSal) :
                    0;
                var blendRatio = IMG_SALIENCY_MAX_COLOR_RATIO * ratioToSaliencyExtreme;
                var _a = d3.rgb(salVal > 0 ? posSaliencyColor : negSaliencyColor), r = _a.r, g = _a.g, b = _a.b;
                d[i] = d[i] * (1 - blendRatio) + r * blendRatio;
                d[i + 1] = d[i + 1] * (1 - blendRatio) + g * blendRatio;
                d[i + 2] = d[i + 2] * (1 - blendRatio) + b * blendRatio;
            }
        },
        renderImageOnCanvas: function (context, width, height, feat, compare) {
            if (!width || !height) {
                return;
            }
            // Set the correct image data array.
            var id = context.getImageData(0, 0, width, height);
            if (compare) {
                id.data.set(this.compareImageInfo[feat].imageData);
            }
            else {
                id.data.set(this.saliency && this.showSaliency && this.saliency[feat] ?
                    this.imageInfo[feat].imageGrayscaleData :
                    this.imageInfo[feat].imageData);
            }
            // Adjust the contrast and add saliency mask if neccessary.
            if (this.windowWidth !== DEFAULT_WINDOW_WIDTH ||
                this.windowCenter !== DEFAULT_WINDOW_CENTER) {
                this.contrastImage(id.data, this.windowWidth, this.windowCenter);
            }
            if (!compare && this.saliency && this.showSaliency && this.saliency[feat]) {
                this.addSaliencyToImage(id.data, this.saliency[feat]);
            }
            // Draw the image data to an in-memory canvas and then draw that to the
            // on-screen canvas as an image. This allows for the zoom/translate logic
            // to function correctly. If the image data is directly applied to the
            // on-screen canvas then the zoom/translate does not apply correctly.
            var inMemoryCanvas = document.createElement('canvas');
            inMemoryCanvas.width = width;
            inMemoryCanvas.height = height;
            var inMemoryContext = inMemoryCanvas.getContext('2d');
            inMemoryContext.putImageData(id, 0, 0);
            context.clearRect(0, 0, width, height);
            context.drawImage(inMemoryCanvas, 0, 0);
        },
        showSalCheckboxChange: function () {
            this.showSaliency = this.$.salCheckbox.checked;
        },
        /**
         * If any image settings changes then call onload for each image to redraw the
         * image on the canvas.
         */
        updateImages: function () {
            for (var feat in this.imageInfo) {
                if (this.imageInfo.hasOwnProperty(feat)) {
                    this.imageInfo[feat].onload(feat, this.imageInfo[feat].imageElement);
                }
            }
        },
        shouldShowImageControls: function (hasImage, allowImageControls) {
            return hasImage && allowImageControls;
        },
        /**
         * Only enable the add feature button when a name has been specified.
         */
        shouldEnableAddFeature: function (featureName) {
            return featureName.length > 0;
        },
        getDeleteValueButtonClass: function (readonly, showDeleteValueButton) {
            return readonly || !showDeleteValueButton ? 'delete-value-button delete-value-button-hidden' : 'delete-value-button';
        },
        getDeleteFeatureButtonClass: function (readonly) {
            return readonly ? 'hide-controls' : 'delete-feature-button';
        },
        getAddValueButtonClass: function (readonly) {
            return readonly ? 'hide-controls' : 'add-value-button';
        },
        getAddFeatureButtonClass: function (readonly) {
            return readonly ? 'hide-controls' : 'add-feature-button';
        },
        getUploadImageClass: function (readonly) {
            return readonly ? 'hide-controls' : 'upload-image-button';
        },
        /**
         * Decodes a list of bytes into a readable string, treating the bytes as
         * unicode char codes.
         */
        decodeBytesListToString: function (bytes) {
            // Decode strings in 16K chunks to avoid stack error with use of
            // fromCharCode.apply.
            var decodeChunkBytes = 16 * 1024;
            var res = '';
            var i = 0;
            // Decode in chunks to avoid stack error with use of fromCharCode.apply.
            for (i = 0; i < bytes.length / decodeChunkBytes; i++) {
                res += String.fromCharCode.apply(null, bytes.slice(i * decodeChunkBytes, (i + 1) * decodeChunkBytes));
            }
            res += String.fromCharCode.apply(null, bytes.slice(i * decodeChunkBytes));
            return res;
        },
    });
})(vz_example_viewer || (vz_example_viewer = {}));
