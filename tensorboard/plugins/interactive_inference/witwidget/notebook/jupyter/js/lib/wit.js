/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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

var witHtmlLocation = require('file-loader!./wit_jupyter.html');
var widgets = require('@jupyter-widgets/base');

// What-If Tool View. Renders the tool and provides communication with the
// python backend.
var WITView = widgets.DOMWidgetView.extend({
  render: function() {
    this.setupComplete = false;
    // Load up the WIT polymer element.
    this.loadAndCreateWhatIfToolElement();

    // Add listeners for changes from python.
    this.model.on('change:examples', this.examplesChanged, this);
    this.model.on('change:config', this.configChanged, this);
    this.model.on('change:inferences', this.inferencesChanged, this);
    this.model.on(
      'change:eligible_features',
      this.eligibleFeaturesChanged,
      this
    );
    this.model.on('change:mutant_charts', this.mutantChartsChanged, this);
    this.model.on('change:sprite', this.spriteChanged, this);
    this.model.on('change:error', this.backendError, this);
    this.model.on(
      'change:custom_distance_dict',
      this.customDistanceComputed,
      this
    );
  },

  /**
   * Loads up the WIT element.
   */
  loadAndCreateWhatIfToolElement: function() {
    const height =
      parseInt(this.model.attributes.layout.attributes.height, 10) - 20;
    const iframe = document.createElement('iframe');

    // Adjust WIT html location if running in a jupyter notebook
    // and not in jupyterlab.
    if (document.body.getAttribute('data-base-url') != null) {
      witHtmlLocation = window.__nbextension_path__ + 'wit_jupyter.html';
    }

    const src = `<link rel="import" href="${witHtmlLocation}">
    <tf-interactive-inference-dashboard local id="wit"></tf-interactive-inference-dashboard>
    <script>
      const wit = document.getElementById('wit');
      wit.style.height = "${height}px";
      wit.style.display = "block";
    </script>
    `;
    iframe.frameBorder = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.srcdoc = src;
    this.el.appendChild(iframe);
    this.iframe = iframe;

    // Invoke change listeners for initial settings.
    this.configChanged();
    this.examplesChanged();
    this.spriteChanged();
  },

  /**
   * Returns whether or not WIT is ready for calls to be made on it.
   */
  isViewReady: function() {
    // Checks if the iframe has been created, WIT has been created in the iframe
    // and WIT has completed setup and its methods are created.
    return (
      this.iframe.contentDocument &&
      this.iframe.contentDocument.getElementById('wit') &&
      this.iframe.contentDocument.getElementById('wit').updateExampleContents
    );
  },

  /**
   * Creates and configure the WIT polymer element.
   */
  setupView: function() {
    this.view_ = this.iframe.contentDocument.getElementById('wit');
    // Add listeners for changes from WIT Polymer element. Passes changes
    // along to python.
    this.view_.addEventListener('infer-examples', (e) => {
      let i = this.model.get('infer') + 1;
      this.model.set('infer', i);
      this.touch();
    });
    this.view_.addEventListener('delete-example', (e) => {
      this.model.set('delete_example', {index: e.detail.index});
      this.touch();
    });
    this.view_.addEventListener('duplicate-example', (e) => {
      this.model.set('duplicate_example', {index: e.detail.index});
      this.touch();
    });
    this.view_.addEventListener('update-example', (e) => {
      this.model.set('update_example', {
        index: e.detail.index,
        example: e.detail.example,
      });
      this.touch();
    });
    this.view_.addEventListener('get-eligible-features', (e) => {
      let i = this.model.get('get_eligible_features') + 1;
      this.model.set('get_eligible_features', i);
      this.touch();
    });
    this.view_.addEventListener('sort-eligible-features', (e) => {
      this.model.set('sort_eligible_features', e.detail);
      this.touch();
    });
    this.inferMutantsCounter = 0;
    this.view_.addEventListener('infer-mutants', (e) => {
      this.model.set(
        'infer_mutants',
        Object.assign({}, e.detail, {
          infer_mutants_counter_for_busting_cache: this.inferMutantsCounter++,
        })
      );
      this.mutantFeature = e.detail.feature_name;
      this.touch();
    });
    this.computeDistanceCounter = 0;
    this.view_.addEventListener('compute-custom-distance', (e) => {
      this.model.set(
        'compute_custom_distance',
        Object.assign({}, e.detail, {
          compute_distance_counter_for_busting_cache: this
            .computeDistanceCounter++,
        })
      );
      this.touch();
    });
    this.setupComplete = true;
  },

  // Callback functions for when changes made on python side.
  examplesChanged: function() {
    if (!this.setupComplete) {
      if (this.isViewReady()) {
        this.setupView();
      }
      requestAnimationFrame(() => this.examplesChanged());
      return;
    }

    const examples = this.model.get('examples');
    if (examples && examples.length > 0) {
      this.view_.updateExampleContents(examples, false);
    }
  },
  inferencesChanged: function() {
    if (!this.setupComplete) {
      if (this.isViewReady()) {
        this.setupView();
      }
      requestAnimationFrame(() => this.inferencesChanged());
      return;
    }
    const inferences = this.model.get('inferences');
    this.view_.labelVocab = inferences['label_vocab'];
    this.view_.inferences = inferences['inferences'];
    this.view_.extraOutputs = {
      indices: this.view_.inferences.indices,
      extra: inferences['extra_outputs'],
    };
  },
  eligibleFeaturesChanged: function() {
    if (!this.setupComplete) {
      if (this.isViewReady()) {
        this.setupView();
      }
      requestAnimationFrame(() => this.eligibleFeaturesChanged());
      return;
    }
    const features = this.model.get('eligible_features');
    this.view_.partialDepPlotEligibleFeatures = features;
  },
  mutantChartsChanged: function() {
    if (!this.setupComplete) {
      if (this.isViewReady()) {
        this.setupView();
      }
      requestAnimationFrame(() => this.mutantChartsChanged());
      return;
    }
    const chartInfo = this.model.get('mutant_charts');
    this.view_.makeChartForFeature(
      chartInfo.chartType,
      this.mutantFeature,
      chartInfo.data
    );
  },
  configChanged: function() {
    if (!this.setupComplete) {
      if (this.isViewReady()) {
        this.setupView();
      }
      requestAnimationFrame(() => this.configChanged());
      return;
    }
    const config = this.model.get('config');
    if (config == null) {
      return;
    }
    if ('inference_address' in config) {
      let addresses = config['inference_address'];
      if ('inference_address_2' in config) {
        addresses += ',' + config['inference_address_2'];
      }
      this.view_.inferenceAddress = addresses;
    }
    if ('model_name' in config) {
      let names = config['model_name'];
      if ('model_name_2' in config) {
        names += ',' + config['model_name_2'];
      }
      this.view_.modelName = names;
    }
    if ('model_type' in config) {
      this.view_.modelType = config['model_type'];
    }
    if ('are_sequence_examples' in config) {
      this.view_.sequenceExamples = config['are_sequence_examples'];
    }
    if ('max_classes' in config) {
      this.view_.maxInferenceEntriesPerRun = config['max_classes'];
    }
    if ('multiclass' in config) {
      this.view_.multiClass = config['multiclass'];
    }
    this.view_.updateNumberOfModels();
    if ('target_feature' in config) {
      this.view_.selectedLabelFeature = config['target_feature'];
    }
    if ('uses_custom_distance_fn' in config) {
      this.view_.customDistanceFunctionSet = true;
    } else {
      this.view_.customDistanceFunctionSet = false;
    }
  },
  spriteChanged: function() {
    if (!this.setupComplete) {
      if (this.isViewReady()) {
        this.setupView();
      }
      requestAnimationFrame(() => this.spriteChanged());
      return;
    }
    const spriteUrl = this.model.get('sprite');
    this.view_.hasSprite = true;
    this.view_.localAtlasUrl = spriteUrl;
    this.view_.updateSprite();
  },
  backendError: function() {
    const error = this.model.get('error');
    this.view_.handleError(error['msg']);
  },
  customDistanceComputed: function() {
    if (!this.setupComplete) {
      if (this.isViewReady()) {
        this.setupView();
      }
      requestAnimationFrame(() => this.customDistanceComputed());
      return;
    }
    const customDistanceDict = this.model.get('custom_distance_dict');
    this.view_.invokeCustomDistanceCallback(customDistanceDict);
  },
});

module.exports = {
  WITView: WITView,
};
