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

namespace vz_example_viewer {

// SaliencyMap is a map of feature names to saliency values for their feature
// values. The saliency can be a single number for all values in a feature value
// list, or a number per value. For sequence examples, there is saliency
// information for each sequence number in the example.
// TODO(jwexler): Strengthen the difference between array of SaliencyValues and
// arrays of numbers in a SaliencyValue.
export type SaliencyValue = number|number[];
export type SaliencyMap = {[feature: string]: SaliencyValue|SaliencyValue[]};

// A helper interface that tracks a feature's values and its name.
export interface NameAndFeature {
  name: string;
  feature: Feature|FeatureList;
}

export type OnloadFunction = (feat: string, image: HTMLImageElement) => void;
// Information about a single image feature.
interface ImageInformation {
  // image onload function, for re-calling when saliency setting changes.
  onload?: OnloadFunction;
  // Raw ImageData arrays for the image. One for the original image, one for the
  // grayscale image, to be overlaid with a saliency mask.
  imageData?: Uint8ClampedArray;
  imageGrayscaleData?: Uint8ClampedArray;

  // The image element that initially loads the image data for the feature.
  imageElement?: HTMLImageElement;

  // Currently applied transform to the image.
  transform?: d3.ZoomTransform;
}

// Information stored in data attributes of controls in the visualization.
interface DataFromControl {
  // The feature being altered by this control.
  feature: string;
  // The index of the value in the value list being altered by this control.
  valueIndex: number;
  // The sequence number of the value list being altered by this control.
  seqNum: number;
}

// HTMLElement with bound data attributes to track feature value information.
interface HTMLElementWithData extends HTMLElement {
  dataFeature: string;
  dataIndex: number;
  dataSeqNum: number;
}

export interface HTMLDialogElement extends HTMLElement { open: () => void; }

const INT_FEATURE_NAME = 'int';
const FLOAT_FEATURE_NAME = 'float';
const BASE_64_IMAGE_ENCODING_PREFIX = 'base64,';
const LEGEND_WIDTH_PX = 260;
const LEGEND_HEIGHT_PX = 20;
const CHANGE_CALLBACK_TIMER_DELAY_MS = 1000;
const clipSaliencyRatio = .95;

// Colors for the saliency color scale.
const posSaliencyColor = '#0f0';
const negSaliencyColor = '#f00';
const neutralSaliencyColor = '#e8eaed';


const COLOR_INTERPOLATOR = d3.interpolateRgb;

// Regex to find bytes features that are encoded images. Follows the guide at
// go/tf-example.
const IMG_FEATURE_REGEX = /^image\/([^\/]+\/)*encoded$/;

// Corresponds to a length of a Uint8Array of size 250MB. Above this size we
// will not decode a bytes list into a string.
const MAX_BYTES_LIST_LENGTH = 1024 * 1024 * 250 / 8;

// The max ratio to blend saliency map colors with a grayscaled version of an
// image feature, to create a visually-useful saliency mask on an image.
const IMG_SALIENCY_MAX_COLOR_RATIO = 0.5;

// String returned when a decoded string feature is too large to display.
const MAX_STRING_INDICATION = 'String too large to display';

// D3 zoom extent range for image zooming.
const ZOOM_EXTENT: [number, number] = [1, 20];

const DEFAULT_WINDOW_WIDTH = 256;
const DEFAULT_WINDOW_CENTER = 128;

Polymer({
  is: 'vz-example-viewer',
  properties: {
    example: {type: Object},
    serializedExample: {type: String, observer: 'updateExample'},
    serializedSeqExample: {type: String, observer: 'updateSeqExample'},
    json: {type: Object, observer: 'createExamplesFromJson'},
    saliency: {type: Object, value: {}},
    saliencyJsonString: {type: String, observer: 'haveSaliencyJson'},
    readonly: {type: Boolean, value: false},
    seqNumber: {type: Number, value: 0, observer: 'newSeqNum'},
    isSequence: Boolean,
    changeCallbackTimer: Number,
    ignoreChange: Boolean,
    minSal: {type: Number, value: 0},
    maxSal: {type: Number, value: 0},
    showSaliency: {type: Boolean, value: true},
    imageInfo: {type: Object, value: {}},
    windowWidth: {type: Number, value: DEFAULT_WINDOW_WIDTH},
    windowCenter: {type: Number, value: DEFAULT_WINDOW_CENTER},
    saliencyCutoff: {type: Number, value: 0},
    hasImage: {type: Boolean, value: true},
    allowImageControls: {type: Boolean, value: false},
    imageScalePercentage: {type: Number, value: 100},
    features: {type: Object, computed: 'getFeatures(example)'},
    featuresList: {type: Object, computed: 'getFeaturesList(features, compareFeatures)'},
    seqFeatures: {type: Object, computed: 'getSeqFeatures(example)'},
    seqFeaturesList: {type: Object, computed: 'getFeaturesList(seqFeatures, compareSeqFeatures)'},
    maxSeqNumber: {type: Number, computed: 'getMaxSeqNumber(seqFeaturesList)'},
    colors: {type: Object, computed: 'getColors(saliency)', observer: 'createLegend'},
    displayMode: {type: String, value: 'grid'},
    featureSearchValue: {type: String, value: '', notify: true},
    filteredFeaturesList: {type: Object, computed: 'getFilteredFeaturesList(featuresList, featureSearchValue, saliency)'},
    filteredSeqFeaturesList: {type: Object, computed: 'getFilteredFeaturesList(seqFeaturesList, featureSearchValue, saliency)'},
    focusedFeatureName: String,
    focusedFeatureValueIndex: Number,
    focusedSeqNumber: Number,
    showDeleteValueButton: {type: Boolean, value: false},
    expandedFeatures: {type: Object, value: {}},
    expandAllFeatures: {type: Boolean, value: false},
    zeroIndex: {type: Number, value: 0},
    compareJson: {type: Object, observer: 'createCompareExamplesFromJson'},
    compareExample: {type: Object},
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
    compareImageInfo: {type: Object, value: {}},
    compareTitle: String,
  },
  observers: [
    'haveSaliency(filteredFeaturesList, saliency, colors, showSaliency, saliencyCutoff)',
    'seqSaliency(seqNumber, seqFeaturesList, saliency, colors, showSaliency, saliencyCutoff)',
  ],

  isExpanded: function(featName: string, expandAllFeatures: boolean) {
    return this.expandAllFeatures ||
        this.sanitizeFeature(featName) in this.expandedFeatures;
  },

  updateExample: function() {
    this.deserializeExample(this.serializedExample, Example.deserializeBinary);
  },

  // tslint:disable-next-line:no-unused-variable called as observer
  updateSeqExample: function() {
    this.deserializeExample(
        this.serializedSeqExample, SequenceExample.deserializeBinary);
  },

  /* Helper method to encode a string into a typed array. */
  stringToUint8Array: function(str: string) {
    return new (window as any).TextEncoder().encode(str);
  },

  deserializeExample: function(
      serializedProto: string,
      deserializer: (arr: Uint8Array) => Example | SequenceExample) {
    // If ignoreChange is set then do not deserialized a newly set serialized
    // example, which would cause the entire visualization to re-render.
    if (this.ignoreChange) {
      return;
    }
    const bytes = this.decodedStringToCharCodes(atob(serializedProto));
    this.example = deserializer(bytes);
  },

  /** A computed map of all standard features in an example. */
  getFeatures: function(example: Example|SequenceExample) {
    // Reset our maps of image information when a new example is supplied.
    this.imageInfo = {};
    this.hasImage = false;

    if (example == null) {
      return new Map<string, FeatureList>([]);
    }
    if (example instanceof Example) {
      this.isSequence = false;
      if (!example.hasFeatures()) {
        example.setFeatures(new Features());
      }
      return example.getFeatures()!.getFeatureMap();
    } else {
      this.isSequence = true;
      if (!example.hasContext()) {
        example.setContext(new Features());
      }
      return example.getContext()!.getFeatureMap();
    }
  },

  /**
   * A computed list of all standard features in an example, for driving the
   * display.
   */
  getFeaturesList: function(features: any, compareFeatures: any) {
    const featuresList: NameAndFeature[] = [];
    const featureSet: {[key: string]: boolean} = {};
    let it = features.keys();
    if (it) {
      let next = it.next();
      while (!next.done) {
        featuresList.push(
            {name: next.value, feature: features.get(next.value)!});
        featureSet[next.value] = true;
        next = it.next();
      }
    }
    it = compareFeatures.keys();
    if (it) {
      let next = it.next();
      while (!next.done) {
        if (next.value in featureSet) {
          next = it.next();
          continue;
        }
        featuresList.push(
            {name: next.value, feature: compareFeatures.get(next.value)!});
        featureSet[next.value] = true;
        next = it.next();
      }
    }
    return featuresList;
  },

  /** A computed map of all sequence features in an example. */
  getSeqFeatures: function(example: Example|SequenceExample) {
    if (example == null || example instanceof Example) {
      return new Map<string, FeatureList>([]);
    }
    return (this.example as SequenceExample)
        .getFeatureLists()!.getFeatureListMap();
  },

  getFilteredFeaturesList: function(featureList: NameAndFeature[],
      searchValue: string, saliency: SaliencyMap) {
    let filtered = featureList;
    const checkSal = saliency && Object.keys(saliency).length > 0;
    // Create a dict of feature names to the total absolute saliency of all
    // its feature values, to sort features with the most salienct features at
    // the top.
    const saliencyTotals = checkSal ?
         Object.assign({}, ...Object.keys(saliency).map(
           name => ({[name]: typeof saliency[name] == 'number' ?
                      Math.abs(saliency[name] as number) :
                      (saliency[name] as Array<number>).reduce((total, cur) =>
                          Math.abs(total) + Math.abs(cur) , 0)}))) :
                    {};

    if (searchValue != '') {
      const re = new RegExp(searchValue, 'i');
      filtered = featureList.filter(feature => re.test(feature.name));
    }
    const sorted = filtered.sort((a, b) => {
      if (this.isImage(a.name) && !this.isImage(b.name)) {
        return -1;
      } else if (this.isImage(b.name) && !this.isImage(a.name)) {
        return 1;
      } else {
        if (checkSal) {
          if (a.name in saliency && !(b.name in saliency)) {
            return -1;
          } else if (b.name in saliency && !(a.name in saliency)) {
            return 1;
          } else {
            const diff = saliencyTotals[b.name] - saliencyTotals[a.name];
            if (diff != 0) {
              return diff;
            }
          }
        }
        return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  },

  /**
   * Returns the maximum sequence length in the sequence example, or -1 if
   * there are no sequences.
   */
  getMaxSeqNumber: function() {
    let max = -1;
    for (const feat of this.seqFeaturesList) {
      const list = feat.feature as FeatureList;
      if (list && list.getFeatureList().length - 1 > max) {
        max = list.getFeatureList().length - 1;
      }
    }
    return max;
  },

  haveSaliencyJson: function() {
    this.saliency = JSON.parse(this.saliencyJsonString);
  },

  getColors: function() {
    [this.minSal, this.maxSal] = this.getMinMaxSaliency(this.saliency);

    return d3.scaleLinear<string>()
        .domain([this.minSal, 0, this.maxSal])
        .interpolate(COLOR_INTERPOLATOR)
        .clamp(true)
        .range([
          negSaliencyColor, neutralSaliencyColor,
          posSaliencyColor
        ]);
  },

  selectAll: function(query: string) {
    return d3.selectAll(
      Polymer.dom(this.root).querySelectorAll(query) as any);
  },

  haveSaliency: function() {
    if (!this.filteredFeaturesList || !this.saliency ||
        Object.keys(this.saliency).length === 0 || !this.colors) {
      return;
    }

    // TODO(jwexler): Find a way to do this without requestAnimationFrame.
    // If the inputs for the features have yet to be rendered, wait to
    // perform this processing. There should be inputs for all non-image
    // features.
    if (this.selectAll('input.value-pill').size() <
        (this.filteredFeaturesList.length - Object.keys(this.imageInfo).length)) {
      requestAnimationFrame(() => this.haveSaliency());
      return;
    }

    // Reset all backgrounds to the neutral color.
    this.selectAll('.value-pill').style('background', neutralSaliencyColor);
    // Color the text of each input element of each feature according to the
    // provided saliency information.
    for (const feat of this.filteredFeaturesList) {
      const val = this.saliency[feat.name] as SaliencyValue;
      // If there is no saliency information for the feature, do not color it.
      if (!val) {
        continue;
      }
      const colorFn = Array.isArray(val) ?
          (d: {}, i: number) => this.getColorForSaliency(val[i]) :
          () => this.getColorForSaliency(val);
      this.selectAll(
            `input.${this.sanitizeFeature(feat.name)}.value-pill`)
          .style('background',
              this.showSaliency ? colorFn : () => neutralSaliencyColor);

      // Color the "more feature values" button with the most extreme saliency
      // of any of the feature values hidden behind the button.
      if (Array.isArray(val)) {
        const valArray = val as Array<number>;
        const moreButton = this.selectAll(
          `paper-button.${this.sanitizeFeature(feat.name)}.value-pill`);
        let mostExtremeSal = 0;
        for (let i = 1; i < valArray.length; i++) {
          if (Math.abs(valArray[i]) > Math.abs(mostExtremeSal)) {
            mostExtremeSal = valArray[i];
          }
        }
        moreButton.style('background', this.showSaliency ?
            () => this.getColorForSaliency(mostExtremeSal) :
            () => neutralSaliencyColor);
      }
    }
  },

  /**
   * Updates the saliency coloring of the sequential features when the current
   * sequence number changes.
   */
  newSeqNum: function() {
    this.seqSaliency();
  },

  seqSaliency: function() {
    if (!this.seqFeaturesList || !this.saliency ||
        Object.keys(this.saliency).length === 0 || !this.colors) {
      return;
    }
    // TODO(jwexler): Find a way to do this without requestAnimationFrame.
    // If the paper-inputs for the features have yet to be rendered, wait to
    // perform this processing.
    if (this.selectAll('.value input').size() < this.seqFeaturesList.length) {
      requestAnimationFrame(() => this.seqSaliency());
      return;
    }

    // Color the text of each input element of each feature according to the
    // provided saliency information for the current sequence number.
    for (const feat of this.seqFeaturesList) {
      const vals: SaliencyValue[] = this.saliency[feat.name] as SaliencyValue[];
      // If there is no saliency information for the feature, do not color it.
      if (!vals) {
        continue;
      }
      const val = vals[this.seqNumber];

      const colorFn = Array.isArray(val) ?
          (d: {}, i: number) => this.getColorForSaliency(val[i]) :
          () => this.getColorForSaliency(val);

      this.selectAll(
            `.${this.sanitizeFeature(feat.name)} input`)
          .style('color', this.showSaliency ? colorFn : () => 'black');
    }
  },

  /**
   * Returns a list of the min and max saliency values, clipped by the
   * saliency ratio.
   */
  getMinMaxSaliency: function(saliency: SaliencyMap) {
    let min = Infinity;
    let max = -Infinity;

    const checkSaliencies = (saliencies: SaliencyValue|SaliencyValue[]) => {
      if (Array.isArray(saliencies)) {
        for (const s of saliencies) {
          checkSaliencies(s);
        }
      } else {
        if (saliencies < min) {
          min = saliencies;
        }
        if (saliencies > max) {
          max = saliencies;
        }
      }
    };
    for (const feat in saliency) {
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
   * then return the raw bytes. Otherwise convert them to a readable string.
   */
  getFeatureValues: function(
      feature: string, keepBytes?: boolean,
      isImage?: boolean, compareValues?: boolean): Array<string|number> {
    const feat = compareValues ?
      this.compareFeatures.get(feature) :
      this.features.get(feature);
    if (!feat) {
      return [];
    }
    if (feat.getBytesList()) {
      if (!keepBytes) {
        const vals = feat.getBytesList()!.getValueList_asU8().map(
            u8array => this.decodeBytesListString(u8array, isImage));
        return vals;
      }
      return feat.getBytesList()!.getValueList().slice();
    } else if (feat.getInt64List()) {
      return feat.getInt64List()!.getValueList().slice();
    } else if (feat.getFloatList()) {
      return feat.getFloatList()!.getValueList().slice();
    }
    return [];
  },

  /**
   * Returns a list of the feature values for a the compared example for
   * a feature.
   */
  getCompareFeatureValues: function(
    feature: string, keepBytes?: boolean,
    isImage?: boolean): Array<string|number> {
  return this.getFeatureValues(feature, keepBytes, isImage, true);
},

  /** Returns the first feature value for a feature. */
  getFirstFeatureValue: function(feature: string) {
    return this.getFeatureValues(feature)[0];
  },

  /** Returns the first feature value for a compared example for a feature. */
  getFirstCompareFeatureValue: function(feature: string) {
    return this.getCompareFeatureValues(feature)[0];
  },

  /** Returns if a feature has more than one feature value. */
  featureHasMultipleValues: function(feature: string) {
    return this.getFeatureValues(feature).length > 1;
  },

  /**
   * Returns if a feature has more than one feature value in the compared
   * example.
   */
  compareFeatureHasMultipleValues: function(feature: string) {
    return this.getCompareFeatureValues(feature).length > 1;
  },

  /**
   * Returns a list of the sequence feature values for a feature for a given
   * sequence number. If keepBytes is true then return the raw bytes. Otherwise
   * convert them to a readable string.
   */
  getSeqFeatureValues: function(
      feature: string, seqNum: number, keepBytes?: boolean, isImage?: boolean,
      compareValues?: boolean) {
    const featlistholder = compareValues ?
        this.compareSeqFeatures!.get(feature) :
        this.seqFeatures!.get(feature);
    if (!featlistholder) {
      return [];
    }
    const featlist = featlistholder.getFeatureList();
    // It is possible that there are features that do not have sequence lengths
    // as long as the longest sequence length in the example.  In this case,
    // show an empty feature value list for that feature.
    if (!featlist || featlist.length <= seqNum) {
      return [];
    }
    const feat = featlist[seqNum];
    if (!feat) {
      return [];
    }
    if (feat.getBytesList()) {
      if (!keepBytes) {
        return feat.getBytesList()!.getValueList_asU8().map(
            u8array => this.decodeBytesListString(u8array, isImage));
      }
      return feat.getBytesList()!.getValueList();
    } else if (feat.getInt64List()) {
      return feat.getInt64List()!.getValueList();
    } else if (feat.getFloatList()) {
      return feat.getFloatList()!.getValueList();
    }
    return [];
  },

  /**
   * Returns a list of the sequence feature values for a feature for a given
   * sequence number of the compared example.
   */
  getCompareSeqFeatureValues: function(
      feature: string, seqNum: number,  keepBytes?: boolean,
      isImage?: boolean): Array<string|number> {
    return this.getSeqFeatureValues(feature, seqNum, keepBytes, isImage, true);
  },

  /** Returns the first feature value for a sequence feature. */
  getFirstSeqFeatureValue: function(feature: string, seqNum: number) {
    return this.getSeqFeatureValues(feature, seqNum)[0];
  },

  /** Returns the first feature value for the compared example for a feature. */
  getFirstSeqCompareFeatureValue: function(feature: string, seqNum: number) {
    return this.getCompareSeqFeatureValues(feature, seqNum)[0];
  },

  /** Returns if a sequence feature has more than one feature value. */
  seqFeatureHasMultipleValues: function(feature: string, seqNum: number) {
    return this.getSeqFeatureValues(feature, seqNum).length > 1;
  },

  /**
   * Returns if a sequence feature has more than one feature value in the
   * compared example.
   */
  compareSeqFeatureHasMultipleValues: function(
      feature: string, seqNum: number) {
    return this.getCompareSeqFeatureValues(feature, seqNum).length > 1;
  },

  /**
   * Decodes a list of bytes into a readable string, treating the bytes as
   * unicode char codes. If singleByteChars is true, then treat each byte as its
   * own char, which is necessary for image strings and serialized protos.
   * Returns an empty string for arrays over 250MB in size, which should not
   * be an issue in practice with tf.Examples.
   */
  decodeBytesListString: function(
      bytes: Uint8Array, singleByteChars?: boolean) {
    if (bytes.length > MAX_BYTES_LIST_LENGTH) {
      return MAX_STRING_INDICATION;
    }
    return singleByteChars ? this.decodeBytesListToString(bytes) :
                             new (window as any).TextDecoder().decode(bytes);
  },

  isBytesFeature: function(feature: string) {
    const feat = this.features.get(feature);
    if (feat) {
      if (feat.hasBytesList()) {
        return true;
      }
    }
    const seqfeat = this.seqFeatures.get(feature);
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
  getInputType: function(feature: string) {
    const feat = this.features.get(feature);
    if (feat) {
      if (feat.getInt64List() || feat.getFloatList()) {
        return 'number'
      }
    }
    const seqfeat = this.seqFeatures.get(feature);
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
  getJsonFeature: function(feat: string) {
    if (!this.json) {
      return null;
    }

    if (this.json.features && this.json.features.feature) {
      const jsonFeature = this.json.features.feature[feat];
      if (jsonFeature) {
        return jsonFeature;
      }
    }
    if (this.json.context && this.json.context.feature) {
      const jsonFeature = this.json.context.feature[feat];
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
  getJsonValueList: function(feat: string, seqNum: number) {
    // Get the feature object for the feature name provided.
    let feature = this.getJsonFeature(feat);
    if (!feature) {
      return null;
    }

    // If a sequential feature, get the feature entry for the given sequence
    // number.
    if (!isNaN(seqNum)) {
      feature = feature.feature[seqNum];
    }

    const valueList =
        feature.bytesList || feature.int64List || feature.floatList;
    return valueList ? valueList.value : null;
  },

  /**
   * From an event, finds the feature, value list index and sequence number
   * that the event corresponds to.
   */
  getDataFromEvent: function(event: Event): DataFromControl {
    let elem = event.target as HTMLElementWithData;
    // Get the control that contains the event target. The control will have its
    // data-feature attribute set.
    while (elem.dataFeature == null) {
      if (!elem.parentElement) {
        throw new Error('Could not find ancestor control element');
      }
      elem = elem.parentElement as HTMLElementWithData;
    }
    return {
      feature: elem.dataFeature,
      valueIndex: elem.dataIndex,
      seqNum: elem.dataSeqNum
    };
  },

  /** Gets the Feature object corresponding to the provided DataFromControl. */
  getFeatureFromData: function(data: DataFromControl): Feature|undefined {
    // If there is no sequence number, then it is a standard feature, not a
    // sequential feature.
    if (isNaN(data.seqNum)) {
      return this.features.get(data.feature);
    } else {
      const featureLists = this.seqFeatures.get(data.feature);
      if (!featureLists) {
        return undefined;
      }
      const featureList = featureLists.getFeatureList();
      if (!featureList) {
        return undefined;
      }
      return featureList[data.seqNum];
    }
  },

  /** Gets the value list corresponding to the provided DataFromControl. */
  getValueListFromData: function(data: DataFromControl): Array<string|number> {
    // If there is no sequence number, then it is a standard feature, not a
    // sequential feature.
    if (isNaN(data.seqNum)) {
      return this.getFeatureValues(data.feature, true);
    } else {
      return this.getSeqFeatureValues(data.feature, data.seqNum, true);
    }
  },

  /** Sets the value list on the provided feature. */
  setFeatureValues: function(feat: Feature, values: Array<string|number>) {
    const bytesList = feat.getBytesList();
    const int64List = feat.getInt64List();
    const floatList = feat.getFloatList();
    if (bytesList) {
      bytesList.setValueList((values as string[]));
    } else if (int64List) {
      int64List.setValueList((values as number[]));
    } else if (floatList) {
      floatList.setValueList((values as number[]));
    }
  },

  /**
   * When a feature value changes from a paper-input, updates the example proto
   * appropriately.
   */
  onValueChanged: function(event: Event) {
    const inputControl = event.target as HTMLInputElement;
    const data = this.getDataFromEvent(event);
    const feat = this.getFeatureFromData(data);
    const values = this.getValueListFromData(data);

    if (feat) {
      if (this.isBytesFeature(data.feature)) {
        // For string features, convert the string into the char code array
        // for storage in the proto.

        const cc = this.stringToUint8Array(inputControl.value);
        // tslint:disable-next-line:no-any cast due to tf.Example typing.
        values[data.valueIndex] = cc as any;

        // If the example was provided as json, update the byteslist in the
        // json with the base64 encoded string. For non-bytes features we don't
        // need this separate json update as the proto value list is the same
        // as the json value list for that case (shallow copy). The byteslist
        // case is different as the json base64 encoded string is converted to
        // a list of bytes, one per character.
        const jsonList = this.getJsonValueList(data.feature, data.seqNum);
        if (jsonList) {
          jsonList[data.valueIndex] = btoa(inputControl.value);
        }
      } else {
        values[data.valueIndex] = +inputControl.value;
        const jsonList = this.getJsonValueList(data.feature, data.seqNum);
        if (jsonList) {
          jsonList[data.valueIndex] = +inputControl.value;
        }
      }
      this.setFeatureValues(feat, values);
      this.exampleChanged();
    }
  },

  onInputFocus: function(event: Event) {
    const inputControl = event.target as HTMLInputElement;
    const data = this.getDataFromEvent(event);
    this.focusedFeatureName = data.feature;
    this.focusedFeatureValueIndex = data.valueIndex;
    this.focusedSeqNumber = data.seqNum;
    this.$.deletevalue.style.top = (
      inputControl.getBoundingClientRect().top -
      this.getBoundingClientRect().top- 25) + 'px';
    this.$.deletevalue.style.right = (
      this.getBoundingClientRect().right -
      inputControl.getBoundingClientRect().right + 30) + 'px';
    this.showDeleteValueButton = true;

  },


  onInputBlur: function(event: Event) {
    this.showDeleteValueButton = false;
  },

  /**
   * When a feature is deleted, updates the example proto appropriately.
   */
  deleteFeature: function(event: Event) {
    const data = this.getDataFromEvent(event);
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
  deleteJsonFeature: function(feature: string) {
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
  deleteValue: function(event: Event) {
    const data = this.getDataFromEvent(event);
    const feat = this.getFeatureFromData(data);
    const values = this.getValueListFromData(data);

    if (feat) {
      if (this.isBytesFeature(data.feature)) {
        // If the example was provided as json, update the byteslist in the
        // json. For non-bytes features we don't need this separate json update
        // as the proto value list is the same as the json value list for that
        // case (shallow copy). The byteslist case is different as the json
        // base64 encoded string is converted to a list of bytes, one per
        // character.
        const jsonList = this.getJsonValueList(data.feature, data.seqNum);
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

  openAddFeatureDialog: function() {
    this.$.addFeatureDialog.open();
  },

  /**
   * When a feature is added, updates the example proto appropriately.
   */
  addFeature: function(event: Event) {
    if (!this.json) {
      return;
    }

    const feat = new Feature();
    // tslint:disable-next-line:no-any Using arbitary json.
    let jsonFeat: any;
    if (this.newFeatureType === INT_FEATURE_NAME) {
      const valueList: number[] = [];
      const ints = new FloatList();
      ints.setValueList(valueList);
      feat.setInt64List(ints);
      jsonFeat = {int64List: {value: valueList}};
    } else if (this.newFeatureType === FLOAT_FEATURE_NAME) {
      const valueList: number[] = [];
      const floats = new FloatList();
      floats.setValueList(valueList);
      feat.setFloatList(floats);
      jsonFeat = {floatList: {value: valueList}};
    } else {
      const valueList: string[] = [];
      const bytes = new BytesList();
      bytes.setValueList(valueList);
      feat.setBytesList(bytes);
      jsonFeat = {bytesList: {value: valueList}};
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
  addJsonFeature: function(feature: string, jsonFeat: any) {
    if (this.json && this.json.features && this.json.features.feature) {
      this.json.features.feature[feature] = jsonFeat;
    } else if (this.json && this.json.context && this.json.context.feature) {
      this.json.context.feature[feature] = jsonFeat;
    }
  },

  /**
   * When a feature value is added, updates the example proto appropriately.
   */
  addValue: function(event: Event) {
    const data = this.getDataFromEvent(event);
    const feat = this.getFeatureFromData(data);
    const values = this.getValueListFromData(data);

    if (feat) {
      if (this.isBytesFeature(data.feature)) {
        values.push('');
      } else {
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
  refreshExampleViewer: function() {
    // In order for iron-lists to be properly updated based on proto changes,
    // need to bind the example to another (blank) example, and then back the
    // the proper example after that change has been processed.
    // TODO(jwexler): Find better way to update the visuals on proto changes.
    const temp = this.example;
    this.ignoreChange = true;
    this.example = new Example();
    this.ignoreChange = false;
    setTimeout(() => {
      this.example = temp;
      this.haveSaliency();
    }, 0);
  },

  exampleChanged: function() {
    // Fire example-change event.
    this.fire('example-change', {example: this.example});

    // This change is performed after a delay in order to debounce rapid updates
    // to a text/number field, as serialization can take some time and freeze
    // the visualization temporarily.
    clearTimeout(this.changeCallbackTimer);
    this.changeCallbackTimer = setTimeout(
        this.changeCallback.bind(this), CHANGE_CALLBACK_TIMER_DELAY_MS);
  },

  changeCallback: function() {
    // To update the serialized example, we need to ensure we ignore parsing
    // of the updated serialized example back to an example object as they
    // already match and this would cause a lot of unnecessary processing,
    // leading to long freezes in the visualization.
    this.ignoreChange = true;
    if (this.isSequence && this.serializedSeqExample) {
      this.serializedSeqExample = btoa(
          this.decodeBytesListString(this.example.serializeBinary(), true));
    } else if (this.serializedExample) {
      this.serializedExample = btoa(
          this.decodeBytesListString(this.example.serializeBinary(), true));
    }
    this.ignoreChange = false;
  },

  getInputPillClass: function(feat: string, displayMode: string) {
    return this.sanitizeFeature(feat) + ' value-pill' +
        (displayMode == 'grid' ? ' value-pill-grid' : ' value-pill-stacked');
  },

  getCompareInputClass: function(feat: string, displayMode: string,
      index?: number) {
    let str = 'value-compare' +
        (displayMode == 'grid' ? ' value-pill-grid' : ' value-pill-stacked');
    if (index != null) {
      const values = this.getFeatureValues(feat, true);
      const compValues = this.getCompareFeatureValues(feat, true);
      if (index >= values.length || index >= compValues.length ||
          values[index] != compValues[index]) {
        str += ' value-different'
      } else {
        str += ' value-same';
      }
    }
    return str;
  },

  getSeqCompareInputClass: function(feat: string, displayMode: string,
      seqNumber: number, index?: number) {
    let str = 'value-compare' +
        (displayMode == 'grid' ? ' value-pill-grid' : ' value-pill-stacked');
    if (index != null) {
      const values = this.getSeqFeatureValues(feat, seqNumber, true);
      const compValues = this.getCompareSeqFeatureValues(feat, seqNumber, true);
      if (index >= values.length || index >= compValues.length ||
          values[index] != compValues[index]) {
        str += ' value-different'
      } else {
        str += ' value-same';
      }
    }
    return str;
  },

  /**
   * Replaces non-standard chars in feature names with underscores so they can
   * be used in css classes/ids.
   */
  sanitizeFeature: function(feat: string) {
   let sanitized = feat;
    if (!feat.match(/^[A-Za-z].*$/)) {
      sanitized = '_' + feat;
    }
    return sanitized.replace(/[\/\.\#]/g, '_');
  },

  isSeqExample: function(maxSeqNumber: number) {
    return maxSeqNumber >= 0;
  },

  shouldShowSaliencyLegend: function(saliency: SaliencyMap) {
    return saliency && Object.keys(saliency).length > 0;
  },

  // tslint:disable-next-line:no-unused-variable called as computed property
  getSaliencyControlsHolderClass(saliency: SaliencyMap) {
    return this.shouldShowSaliencyLegend(saliency) ?
        'saliency-controls-holder' :
        'hide-saliency-controls';
  },

  /** Creates an svg legend for the saliency color mapping. */
  createLegend: function() {
    d3.select(this.$.saliencyLegend).selectAll('*').remove();
    const legendSvg = d3.select(this.$.saliencyLegend).append('g');
    const gradient = legendSvg.append('defs')
        .append('linearGradient')
        .attr('id', 'vzexampleviewergradient')
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr('spreadMethod', 'pad');

    const linspace = (start: number, end: number, n: number) => {
      const out = [];
      const delta = (end - start) / (n - 1);
      let i = 0;
      while(i < (n - 1)) {
          out.push(start + (i * delta));
          i++;
      }
      out.push(end);
      return out;
    };

    // Create the correct color scale for the legend depending on minimum
    // and maximum saliency for this example.
    const scale: string[] = [];
    if (this.minSal < 0) {
      scale.push(negSaliencyColor);
    }
    scale.push(neutralSaliencyColor);
    if (this.maxSal > 0) {
      scale.push(posSaliencyColor);
    }
    // Creates an array of [pct, colour] pairs as stop
    // values for legend
    const pct = linspace(0, 100, scale.length).map((d: number) => {
        return Math.round(d) + '%';
    });

    const colourPct = d3.zip(pct, scale);

    colourPct.forEach((d: string[]) => {
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
        .style('fill', 'url(#vzexampleviewergradient)');

    const legendScale =
        d3.scaleLinear().domain([this.minSal, this.maxSal]).range([
          0, LEGEND_WIDTH_PX
        ]);

    const legendAxis = d3.axisBottom(legendScale);

    legendSvg.append('g')
        .attr('class', 'legend axis')
        .attr('transform', `translate(0,${LEGEND_HEIGHT_PX})`)
        .call(legendAxis);
  },

  isImage: function(feat: string) {
    return IMG_FEATURE_REGEX.test(feat);
  },

  /**
   * Returns the data URI src for a feature value that is an encoded image.
   */
  getImageSrc: function(feat: string) {
    this.setupOnloadCallback(feat);
    return this.getImageSrcForData(
        feat, this.getFeatureValues(feat, false, true)[0] as string);
  },

  /**
   * Returns the data URI src for a feature value that is an encoded image, for
   * the compared example.
   */
  getCompareImageSrc: function(feat: string) {
    this.setupOnloadCallback(feat, true);
    return this.getImageSrcForData(
        feat, this.getCompareFeatureValues(feat, false, true)[0] as string,
        true);
  },

  /**
   * Returns the data URI src for a sequence feature value that is an encoded
   * image.
   */
  getSeqImageSrc: function(feat: string, seqNum: number) {
    this.setupOnloadCallback(feat);
    return this.getImageSrcForData(
        feat, this.getSeqFeatureValues(feat, seqNum, false, true)[0] as string);
  },

  /**
   * Returns the data URI src for a sequence feature value that is an encoded
   * image, for the compared example.
   */
  getCompareSeqImageSrc: function(feat: string, seqNum: number) {
    this.setupOnloadCallback(feat, true);
    return this.getImageSrcForData(
        feat, this.getCompareSeqFeatureValues(
          feat, seqNum, false, true)[0] as string,
        true);
  },

  /**
   * On the next frame, sets the onload callback for the image for the given
   * feature. This is delayed until the next frame to ensure the img element
   * is rendered before setting up the onload function.
   */
  setupOnloadCallback: function(feat: string, compare?: boolean) {
    requestAnimationFrame(() => {
      const img = this.$$(
        '#' + this.getImageId(feat, compare)) as HTMLImageElement;
      img.onload = this.getOnLoadForImage(feat, img, compare);
    });
  },

  /** Helper method used by getImageSrc and getSeqImageSrc. */
  getImageSrcForData: function(feat: string, imageData: string,
      compare?: boolean) {
    // Get the format of the encoded image, according to the feature name
    // specified by go/tf-example. Defaults to jpeg as specified in the doc.
    const regExResult = IMG_FEATURE_REGEX.exec(feat);
    if (regExResult == null) {
      return null;
    }
    const featureMiddle = regExResult[1] || '';
    const formatVals = compare ?
        this.getCompareFeatureValues(
          'image' + featureMiddle + '/format', false) :
        this.getFeatureValues('image' + featureMiddle + '/format', false);
    let format = 'jpeg';
    if (formatVals.length > 0) {
        format = (formatVals[0] as string).toLowerCase();
    }
    let src = 'data:image/' + format + ';base64,';

    // Encode the image data in base64.
    src = src + btoa(decodeURIComponent(encodeURIComponent(imageData)));
    return src;
  },

  /** Returns the length of an iterator. */
  getIterLength: function(it: any) {
    let len = 0;
    if (it) {
      let next = it.next();
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
  updateCompareMode: function() {
    let compareMode = false;
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
  createExamplesFromJson: function(json: string) {
    this.example = this.createExamplesFromJsonHelper(json);
    this.compareJson = {};
  },

  /**
   * Creates compared tf.Example or tf.SequenceExample jspb object from json.
   * Useful when this is embedded into a OnePlatform app that sends protos as
   * json.
   */
  createCompareExamplesFromJson: function(json: string) {
    if (!json) {
      return;
    }
    this.compareExample = this.createExamplesFromJsonHelper(json);
  },

  createExamplesFromJsonHelper: function(json: any) {
    if (!json) {
      return null;
    }
    // If the provided json is a json string, parse it into an object.
    if (typeof this.json === 'string') {
      json = JSON.parse(this.json);
    }
    if (json.features) {
      const ex = new Example();
      ex.setFeatures(this.parseFeatures(json.features));
      return ex;
    } else if (json.context || json.featureLists) {
      const seqex = new SequenceExample();
      if (json.context) {
        seqex.setContext(this.parseFeatures(json.context));
      }
      if (json.featureLists) {
        seqex.setFeatureLists(this.parseFeatureLists(json.featureLists));
      }
      return seqex;
    } else {
      return new Example();
    }
  },

  // tslint:disable-next-line:no-any Parsing arbitary json.
  parseFeatures: function(features: any) {
    const feats = new Features();
    for (const fname in features.feature) {
      if (features.feature.hasOwnProperty(fname)) {
        const featentry = features.feature[fname];
        feats.getFeatureMap().set(
            fname, this.parseFeature(featentry, this.isImage(fname)));
      }
    }
    return feats;
  }
,
  // tslint:disable-next-line:no-any Parsing arbitary json.
  parseFeatureLists: function(features: any) {
    const feats = new FeatureLists();
    for (const fname in features.featureList) {
      if (features.featureList.hasOwnProperty(fname)) {
        const featlistentry = features.featureList[fname];
        const featList = new FeatureList();
        const featureList: Feature[] = [];
        for (const featentry in featlistentry.feature) {
          if (featlistentry.feature.hasOwnProperty(featentry)) {
            const feat = featlistentry.feature[featentry];
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
  parseFeature: function(featentry: any, isImage: boolean) {
    const feat = new Feature();
    if (featentry.floatList) {
      const floats = new FloatList();
      floats.setValueList(featentry.floatList.value);
      feat.setFloatList(floats);
    } else if (featentry.bytesList) {
      // Json byteslist entries are base64.  The JSPB generated Feature class
      // will marshall this to U8 automatically.
      const bytes = new BytesList();
      if (featentry.bytesList.value) {
        bytes.setValueList(featentry.bytesList.value);
      }
      feat.setBytesList(bytes);
    } else if (featentry.int64List) {
      const ints = new Int64List();
      ints.setValueList(featentry.int64List.value);
      feat.setInt64List(ints);
    }
    return feat;
  },

  getImageId: function(feat: string, compare?: boolean) {
    if (compare) {
      return this.getCompareImageId(feat);
    }
    return this.sanitizeFeature(feat) + '_image';
  },

  getCanvasId: function(feat: string, compare?: boolean) {
    if (compare) {
      return this.getCompareCanvasId(feat);
    }
    return this.sanitizeFeature(feat) + '_canvas';
  },

  getImageCardId: function(feat: string, compare?: boolean) {
    if (compare) {
      return this.getCompareImageCardId(feat);
    }
    return this.sanitizeFeature(feat) + '_card';
  },

  getCompareImageId: function(feat: string) {
    return this.sanitizeFeature(feat) + '_image_compare';
  },

  getCompareCanvasId: function(feat: string) {
    return this.sanitizeFeature(feat) + '_canvas_compare';
  },

  getCompareImageCardId: function(feat: string) {
    return this.sanitizeFeature(feat) + '_card_compare';
  },

  getFeatureDialogId: function(feat: string) {
    return this.sanitizeFeature(feat) + '_dialog';
  },

  featureMoreClicked: function(event: Event) {
    const button = event.srcElement.parentElement;
    const feature = (button as any).dataFeature;
    const dialog = this.$$('#' + this.sanitizeFeature(feature) + '_dialog');
    dialog.positionTarget = button;
    dialog.open();
  },

  expandFeature: function(event: Event) {
    const feature = (event.srcElement as any).dataFeature;
    this.set('expandedFeatures.' + this.sanitizeFeature(feature), true);
    this.refreshExampleViewer();
  },

  decodedStringToCharCodes: function(str: string): Uint8Array {
    const cc = new Uint8Array(str.length);
    for (let i = 0; i < str.length; ++i) {
      cc[i] = str.charCodeAt(i);
    }
    return cc;
  },


  handleImageUpload: function(event: Event) {
    this.handleFileSelect(event, this)
  },

  // Handle upload image paper button click by delegating to appropriate
  // paper-input file chooser.
  uploadImageClicked: function(event: Event) {
    const data = this.getDataFromEvent(event);
    const inputs = Polymer.dom(this.root).querySelectorAll('paper-input');
    let inputElem = null;
    for (let i = 0; i < inputs.length; i++) {
      if ((inputs[i] as any).dataFeature == data.feature) {
        inputElem = inputs[i];
        break;
      }
    }
    if (inputElem) {
      inputElem.querySelector('input').click();
    }
  },

  // Handle file select for image replacement.
  handleFileSelect: function(event: Event, self: any) {
    event.stopPropagation();
    event.preventDefault();
    const reader = new FileReader();
    const eventAny = event as any;
    const files = eventAny.dataTransfer ? eventAny.dataTransfer.files : eventAny.target.files;
    if (files.length === 0) {
      return;
    }
    reader.addEventListener('load', () => {
      // Get the image data from the loaded image and convert to a char
      // code array for use in the features value list.
      const index = +reader.result.indexOf(BASE_64_IMAGE_ENCODING_PREFIX) +
          BASE_64_IMAGE_ENCODING_PREFIX.length;
      const encodedImageData = reader.result.substring(index);
      const cc = self.decodedStringToCharCodes(atob(encodedImageData));

      const data = self.getDataFromEvent(event);
      const feat = self.getFeatureFromData(data);
      const values = self.getValueListFromData(data);
      if (feat) {
        // Replace the old image data in the feature value list with the new
        // image data.
        // tslint:disable-next-line:no-any cast due to tf.Example typing.
        values[0] = cc as any;
        feat.getBytesList()!.setValueList((values as string[]));

        // If the example was provided as json, update the byteslist in the
        // json with the base64 encoded string.
        const jsonList = self.getJsonValueList(data.feature, data.seqNum);
        if (jsonList) {
          jsonList[0] = encodedImageData;
        }

        // Load the image data into an image element to begin the process
        // of rendering that image to a canvas for display.
        const img = new Image();
        self.addImageElement(data.feature, img);
        img.addEventListener('load', () => {
          // Runs the apppriate onload processing for the new image.
          self.getOnLoadForImage(data.feature, img);

          // If the example contains appropriately-named features describing
          // the image width and height then update those feature values for
          // the new image width and height.
          const featureMiddle =
              IMG_FEATURE_REGEX.exec(data.feature)![1] || '';
          const widthFeature = 'image' + featureMiddle + '/width';
          const heightFeature = 'image' + featureMiddle + '/height';
          const widths = self.getFeatureValues(widthFeature, false);
          const heights = self.getFeatureValues(heightFeature, false);
          if (widths.length > 0) {
            widths[0] = +img.width;
            self.features.get(widthFeature)!.getInt64List()!.setValueList(
                (widths as number[]));
          }
          if (heights.length > 0) {
            heights[0] = +img.height;
            self.features.get(heightFeature)!.getInt64List()!.setValueList(
                (heights as number[]));
          }
          self.exampleChanged();
        });
        img.src = reader.result;
      }
    }, false);

    // Read the image file as a data URL.
    reader.readAsDataURL(files[0]);
  },

  // Add drag-and-drop image replacement behavior to the canvas.
  addDragDropBehaviorToCanvas: function(canvas: HTMLElement) {
    const self = this;

    // Handle drag event for drag-and-drop image replacement.
    function handleDragOver(event: DragEvent) {
      event.stopPropagation();
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }

    function handleFileSelect(event: DragEvent) {
      self.handleFileSelect(event, self)
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
  getOnLoadForImage: function(feat: string, image: HTMLImageElement,
      compare?: boolean) {
    const f = (feat: string, image: HTMLImageElement, compare?: boolean) => {
      const canvas = this.$$(
        '#' + this.getCanvasId(feat, compare)) as HTMLCanvasElement;
      if (!compare) {
        this.addDragDropBehaviorToCanvas(canvas);
      }

      if (image && canvas) {
        // Draw the image to the canvas and size the canvas.
        // Set d3.zoom on the canvas to enable zooming and scaling interactions.
        const context = canvas.getContext('2d')!;
        let imageScaleFactor = this.imageScalePercentage / 100;

        // If not using image controls then scale the image to match the
        // available width in the container, considering padding.
        if (!this.allowImageControls) {
          const holder = this.$$(
            '#' +
            this.getImageCardId(feat, compare)).parentElement as HTMLElement;
          let cardWidthForScaling = holder.getBoundingClientRect().width / 2;
          if (cardWidthForScaling > 16) {
            cardWidthForScaling -= 16;
          }
          if (cardWidthForScaling < image.width) {
            imageScaleFactor = cardWidthForScaling / image.width;
          }
        }
        canvas.width = image.width * imageScaleFactor;
        canvas.height = image.height * imageScaleFactor;
        const transformFn = (transform: d3.ZoomTransform) => {
          context.save();
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.translate(transform.x, transform.y);
          context.scale(transform.k, transform.k);
          this.renderImageOnCanvas(context, canvas.width, canvas.height, feat,
            compare);
          context.restore();
        };
        const zoom = () => {
          const transform = d3.event.transform;
          this.addImageTransform(feat, transform, compare);
          transformFn(d3.event.transform);
        };
        const d3zoom = d3.zoom().scaleExtent(ZOOM_EXTENT).on('zoom', zoom);
        d3.select(canvas).call(d3zoom).on(
            'dblclick.zoom',
            () => d3.select(canvas).call(d3zoom.transform, d3.zoomIdentity));

        context.save();
        context.scale(imageScaleFactor, imageScaleFactor);
        context.drawImage(image, 0, 0);
        context.restore();
        this.setImageDatum(context, canvas.width, canvas.height, feat, compare);
        this.renderImageOnCanvas(context, canvas.width, canvas.height, feat,
          compare);
        if (compare) {
          if (this.compareImageInfo[feat].transform) {
            transformFn(this.compareImageInfo[feat].transform!);
          }
        } else {
          if (this.imageInfo[feat].transform) {
            transformFn(this.imageInfo[feat].transform!);
          }
        }
      } else {
        // If the image and canvas are not yet rendered, wait to perform this
        // processing.
        requestAnimationFrame(() => f(feat, image, compare));
      }
    };
    this.addImageElement(feat, image, compare);
    this.addImageOnLoad(feat, f, compare);
    return f.apply(this, [feat, image, compare]);
  },

  addImageOnLoad: function(feat: string, onload: OnloadFunction,
      compare?: boolean) {
    this.hasImage = true;
    if (compare) {
      if (!this.compareImageInfo[feat]) {
        this.compareImageInfo[feat] = {};
       }
       this.compareImageInfo[feat].onload = onload;
    } else {
      if (!this.imageInfo[feat]) {
       this.imageInfo[feat] = {};
      }
      this.imageInfo[feat].onload = onload;
    }
  },

  addImageData: function(feat: string, imageData: Uint8ClampedArray,
      compare?: boolean) {
    if (compare) {
      if (!this.compareImageInfo[feat]) {
        this.compareImageInfo[feat] = {};
       }
       this.compareImageInfo[feat].imageData = imageData;
    } else {
      if (!this.imageInfo[feat]) {
       this.imageInfo[feat] = {};
      }
      this.imageInfo[feat].imageData = imageData;
    }
  },

  addImageElement: function(feat: string, image: HTMLImageElement,
      compare?: boolean) {
    if (compare) {
      if (!this.compareImageInfo[feat]) {
        this.compareImageInfo[feat] = {};
      }
      this.compareImageInfo[feat].imageElement = image;
    } else {
      if (!this.imageInfo[feat]) {
        this.imageInfo[feat] = {};
      }
      this.imageInfo[feat].imageElement = image;
    }
  },

  addImageGrayscaleData: function(
      feat: string, imageGrayscaleData: Uint8ClampedArray) {
    if (!this.imageInfo[feat]) {
      this.imageInfo[feat] = {};
    }
    this.imageInfo[feat].imageGrayscaleData = imageGrayscaleData;
  },

  addImageTransform: function(feat: string, transform: d3.ZoomTransform,
      compare?: boolean) {
    if (compare) {
      if (!this.compareImageInfo[feat]) {
        this.compareImageInfo[feat] = {};
      }
      this.compareImageInfo[feat].transform = transform;
    } else {
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
  setImageDatum: function(
      context: CanvasRenderingContext2D, width: number, height: number,
      feat: string, compare?: boolean) {
    if (!width || !height) {
      return;
    }
    const contextData = context.getImageData(0, 0, width, height);
    const imageData = Uint8ClampedArray.from(contextData.data);
    this.addImageData(feat, imageData, compare);

    if (!this.saliency || !this.showSaliency || !this.saliency[feat] ||
        compare) {
      return;
    }

    // Grayscale the image for later use with a saliency mask.
    const salData = Uint8ClampedArray.from(imageData);
    for (let i = 0; i < imageData.length; i += 4) {
      // Average pixel color value for grayscaling the pixel.
      const avg = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
      salData[i] = avg;
      salData[i + 1] = avg;
      salData[i + 2] = avg;
    }
    this.addImageGrayscaleData(feat, salData);
  },

  /** Updates image data pixels based on windowing parameters. */
  contrastImage: function(
      d: Uint8ClampedArray, windowWidth: number, windowCenter: number) {
    // See https://www.dabsoft.ch/dicom/3/C.11.2.1.2/ for algorithm description.
    const contrastScale = d3.scaleLinear<number>()
                              .domain([
                                windowCenter - .5 - (windowWidth / 2),
                                windowCenter - .5 + ((windowWidth - 1) / 2)
                              ])
                              .clamp(true)
                              .range([0, 255]);
    for (let i = 0; i < d.length; i++) {
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
  showSaliencyForValue: function(salVal: number) {
    const salExtremeToCompare = salVal >= 0 ? this.maxSal : this.minSal;
    return Math.abs(salVal) >=
        (Math.abs(salExtremeToCompare) * this.saliencyCutoff / 100.);
  },

  /** Returns the color to display for a given saliency value. */
  getColorForSaliency: function(salVal: number) {
    if (!this.showSaliencyForValue(salVal)) {
      return neutralSaliencyColor;
    } else {
      return this.colors(salVal);
    }
  },

  /** Adjusts image data pixels to overlay the saliency mask. */
  addSaliencyToImage: function(
      d: Uint8ClampedArray, sal: SaliencyValue|SaliencyValue[]) {
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
    const salScaleAdjustment = 1 / Math.pow(this.imageScalePercentage / 100, 2);

    for (let i = 0; i < d.length; i += 4) {
      // Get the saliency value for the pixel. If the saliency map contains only
      // a single value for the image, use it for all pixels.
      let salVal = 0;
      const salIndex = Math.floor(i / 4 * salScaleAdjustment);
      if (Array.isArray(sal)) {
        if (sal.length > salIndex) {
          salVal = sal[salIndex] as number;
        } else {
          salVal = 0;
        }
      } else {
        salVal = sal as number;
      }

      // Blend the grayscale pixel with the saliency mask color for the pixel
      // to get the final r, g, b values for the pixel.
      const ratioToSaliencyExtreme = this.showSaliencyForValue(salVal) ?
          (salVal >= 0 ? this.maxSal === 0 ? 0 : salVal / this.maxSal :
                         salVal / this.minSal) :
          0;
      const blendRatio =
          IMG_SALIENCY_MAX_COLOR_RATIO * ratioToSaliencyExtreme;

      const {r, g, b} =
          d3.rgb(salVal > 0 ? posSaliencyColor : negSaliencyColor);
      d[i] = d[i] * (1 - blendRatio) + r * blendRatio;
      d[i + 1] = d[i + 1] * (1 - blendRatio) + g * blendRatio;
      d[i + 2] = d[i + 2] * (1 - blendRatio) + b * blendRatio;
    }
  },

  renderImageOnCanvas: function(
      context: CanvasRenderingContext2D, width: number, height: number,
      feat: string, compare?: boolean) {
    if (!width || !height) {
      return;
    }
    // Set the correct image data array.
    const id = context.getImageData(0, 0, width, height);
    if (compare) {
      id.data.set(this.compareImageInfo[feat].imageData!)
    } else {
    id.data.set(
        this.saliency && this.showSaliency && this.saliency[feat] ?
            this.imageInfo[feat].imageGrayscaleData! :
            this.imageInfo[feat].imageData!);
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
    const inMemoryCanvas = document.createElement('canvas');
    inMemoryCanvas.width = width;
    inMemoryCanvas.height = height;
    const inMemoryContext = inMemoryCanvas.getContext('2d')!;
    inMemoryContext.putImageData(id, 0, 0);

    context.clearRect(0, 0, width, height);
    context.drawImage(inMemoryCanvas, 0, 0);
  },

  showSalCheckboxChange: function() {
    this.showSaliency = this.$.salCheckbox.checked;
  },

  /**
   * If any image settings changes then call onload for each image to redraw the
   * image on the canvas.
   */
  updateImages: function() {
    for (const feat in this.imageInfo) {
      if (this.imageInfo.hasOwnProperty(feat)) {
        this.imageInfo[feat].onload!(feat, this.imageInfo[feat].imageElement!);
      }
    }
  },

  shouldShowImageControls: function(
      hasImage: boolean, allowImageControls: boolean) {
    return hasImage && allowImageControls;
  },

  /**
   * Only enable the add feature button when a name has been specified.
   */
  shouldEnableAddFeature: function(featureName: string) {
    return featureName.length > 0;
  },

  getDeleteValueButtonClass: function(readonly: boolean, showDeleteValueButton: boolean) {
    return readonly || !showDeleteValueButton ? 'delete-value-button delete-value-button-hidden' : 'delete-value-button';
  },

  getDeleteFeatureButtonClass: function(readonly: boolean) {
    return readonly ? 'hide-controls' : 'delete-feature-button';
  },

  getAddValueButtonClass: function(readonly: boolean) {
    return readonly ? 'hide-controls' : 'add-value-button';
  },

  getAddFeatureButtonClass: function(readonly: boolean) {
    return readonly ? 'hide-controls' : 'add-feature-button';
  },

  getUploadImageClass: function(readonly: boolean) {
    return readonly ? 'hide-controls' : 'upload-image-button';
  },

  /**
   * Decodes a list of bytes into a readable string, treating the bytes as
   * unicode char codes.
   */
  decodeBytesListToString: function(bytes: Uint8Array) {
    // Decode strings in 16K chunks to avoid stack error with use of
    // fromCharCode.apply.
    const decodeChunkBytes = 16 * 1024;
    let res = '';
    let i = 0;
    // Decode in chunks to avoid stack error with use of fromCharCode.apply.
    for (i = 0; i < bytes.length / decodeChunkBytes; i++) {
      res += String.fromCharCode.apply(
          null, bytes.slice(i * decodeChunkBytes, (i + 1) * decodeChunkBytes));
    }
    res += String.fromCharCode.apply(null, bytes.slice(i * decodeChunkBytes));
    return res;
  },
});

}
