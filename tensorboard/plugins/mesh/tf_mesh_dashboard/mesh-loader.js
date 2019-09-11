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
 * @fileoverview MeshLoader provides UI functionality and placeholder to render
 * 3D data.
 */
var vz_mesh;
(function(vz_mesh) {
  /** Polymer wrapper around MeshLoader. */
  Polymer({
    is: 'tf-mesh-loader',
    properties: {
      /** @type {string} Current run. */
      run: String,
      /** @type {string} Current tag. */
      tag: String,
      /** @type {number} Index of current sample. */
      sample: Number,
      /** @type {number} Total number of samples. */
      ofSamples: Number,
      /**
       * Defines behavior for camera location during redraw.
       * @type {string}
       */
      selectedView: {type: String, value: 'all'},
      /** @type {!bool} Defines if component is active and should get data to
       *  display.
       */
      active: {
        type: Boolean,
        value: false,
      },
      /** @type {!Object} Request manager to communicate with the server. */
      requestManager: Object,
      /**
       * @type {!Object} Component to render meshes and point
       * clouds.
       */
      _meshViewer: {type: Object},
      /**
       * @type {!Object} Data provider to
       * communicate with the server and parse raw data.
       */
      _dataProvider: {type: Object},
      /**@type {!Object} Wrapper to function to transform value into color.*/
      _colorScaleFunction: {
        type: Object, // function: string => string
        value: () => tf_color_scale.runsColorScale,
      },
      /**@type {string} Wrapper around function to compute color for a run.*/
      _runColor: {
        type: String,
        computed: '_computeRunColor(run)',
      },
      /** @type {!Array} Contains datums for each step. */
      _steps: {
        type: Array,
        value: () => [],
        notify: true,
      },
      /** @type {number} Contains index of current step. */
      _stepIndex: {
        type: Number,
        notify: true,
      },
      /** @type {!Object} Contains datum of current step. */
      _currentStep: {
        type: Object,
        computed: '_computeCurrentStep(_steps, _stepIndex)',
      },
      /** @type {!bool} Determines if mesh viewer attached to dom. */
      _meshViewerAttached: {type: Boolean, value: false},
      /**
       * @type {!bool} Determines if camera position was initially set to
       * defaults.
       */
      _cameraPositionInitialized: {type: Boolean, value: false},
      /**
       * @type {number} Contains current step value (step number assigned
       * during training).
       */
      _stepValue: {
        type: Number,
        computed: '_computeStepValue(_currentStep)',
      },
      /** @type {string} Contains formatted wall time. */
      _currentWallTime: {
        type: String,
        computed: '_computeCurrentWallTime(_currentStep)',
      },
      /** @type {!bool} Defines if browser still loading data. */
      _isMeshLoading: {
        type: Boolean,
        value: false,
      },
    },

    observers: [
      'reload(run, tag, active, _dataProvider, _meshViewer)',
      '_updateScene(_currentStep.*, _meshViewer)',
      '_debouncedFetchMesh(_currentStep)',
      '_updateView(selectedView)',
    ],

    _computeRunColor: function(run) {
      return this._colorScaleFunction(run);
    },

    /**
     * Called by parent when component attached to DOM.
     * @public
     */
    attached: function() {
      // Defer reloading until after we're attached, because that ensures that
      // the requestManager has been set from above. (Polymer is tricky
      // sometimes)
      this._dataProvider = new vz_mesh.ArrayBufferDataProvider(
        this.requestManager
      );
      const meshViewer = new vz_mesh.MeshViewer(this._runColor);
      meshViewer.addEventListener(
        'beforeUpdateScene',
        this._updateCanvasSize.bind(this)
      );
      meshViewer.addEventListener(
        'cameraPositionChange',
        this._onCameraPositionChange.bind(this)
      );
      this._meshViewer = meshViewer;
    },

    /**
     * Function to call when component must be reloaded.
     */
    reload: function() {
      if (!this.active || !this._dataProvider) {
        return;
      }
      this.set('_isMeshLoading', true);
      this._dataProvider
        .reload(this.run, this.tag, this.sample)
        .then((steps) => {
          if (!steps) return; // Happens when request was cancelled at some point.
          this.set('_steps', steps);
          this.set('_stepIndex', steps.length - 1);
        })
        .catch((error) => {
          if (
            !error ||
            !error.code ||
            error.code != vz_mesh.ErrorCodes.CANCELLED
          ) {
            error = error || 'Response processing failed.';
            throw new Error(error);
          }
        });
    },

    /**
     * Updates the scene.
     * @private
     */
    _updateScene: function() {
      const currentStep = this._currentStep;
      // Mesh data is not fetched yet. Please see `_maybeFetchMesh`.
      if (!currentStep || !currentStep.mesh) return;

      this._meshViewer.updateScene(currentStep, this);
      if (!this._cameraPositionInitialized) {
        this._meshViewer.resetView();
        this._cameraPositionInitialized = true;
      }
      if (!this._meshViewerAttached) {
        // Mesh viewer should be added to the dom once.
        this.root.appendChild(this._meshViewer.getRenderer().domElement);
        this._meshViewerAttached = true;
      }
    },

    _debouncedFetchMesh() {
      this.debounce('fetchMesh', () => this._maybeFetchMesh(), 100);
    },

    async _maybeFetchMesh() {
      const currentStep = this._currentStep;
      if (!currentStep || currentStep.mesh || currentStep.meshFetching) return;
      currentStep.meshFetching = true;
      this._isMeshLoading = true;

      try {
        const meshData = await this._dataProvider.fetchData(
          currentStep,
          this.run,
          this.tag,
          this.sample,
          this._stepIndex
        );
        currentStep.mesh = meshData[0];
        this.notifyPath('_currentStep.mesh');
      } catch (error) {
        if (
          !error ||
          !error.code ||
          error.code != vz_mesh.ErrorCodes.CANCELLED
        ) {
          error = error || 'Response processing failed.';
          throw new Error(error);
        }
      } finally {
        this._isMeshLoading = false;
        currentStep.meshFetching = false;
      }
    },

    /**
     * Propagates camera position change event outside of the loader.
     * @private
     */
    _onCameraPositionChange: function() {
      if (!this._meshViewer.isReady()) return;
      const event = new CustomEvent('camera-position-change', {
        detail: this._meshViewer.getCameraPosition(),
      });
      this.dispatchEvent(event);
    },

    /**
     * Creates mesh geometry for current step data.
     * @param {!THREE.Vector3} position Position of the camera.
     * @param {number} far Camera frustum far plane.
     * @param {!THREE.Vector3} target Point in space for camera to look at.
     * @public
     */
    setCameraViewpoint: function(position, far, target) {
      this._meshViewer.setCameraViewpoint(position, far, target);
    },

    /**
     * Updates size of the canvas.
     * @private
     */
    _updateCanvasSize: function() {
      const width = this.offsetWidth;
      const height = width; // Keep the whole mesh viewer square at all times.
      const headerHeight = this.$$('.tf-mesh-loader-header').offsetHeight;
      const canvasSize = {
        width: width,
        height: height - headerHeight,
      };
      this._meshViewer.setCanvasSize(canvasSize);
    },

    /**
     * Re-renders component in the browser.
     * @public
     */
    redraw: function() {
      this._updateCanvasSize();
      // Do not render if not in the DOM.
      if (!this.isConnected) return;
      this._meshViewer.draw();
    },

    _hasAtLeastOneStep: function(steps) {
      return !!steps && steps.length > 0;
    },

    _hasMultipleSteps: function(steps) {
      return !!steps && steps.length > 1;
    },

    _computeCurrentStep: function(steps, stepIndex) {
      return steps[stepIndex] || null;
    },

    _computeStepValue: function(currentStep) {
      if (!currentStep) return 0;
      return currentStep.step;
    },

    _computeCurrentWallTime: function(currentStep) {
      if (!currentStep) return '';
      return tf_card_heading.formatDate(currentStep.wall_time);
    },

    _getMaxStepIndex: function(steps) {
      return steps.length - 1;
    },

    _getSampleText: function(sample) {
      return String(sample + 1);
    },

    _hasMultipleSamples: function(ofSamples) {
      return ofSamples > 1;
    },

    _updateView: function(selectedView) {
      if (this._meshViewer && selectedView == 'all') {
        this._meshViewer.resetView();
      }
    },

    toLocaleString_: function(number) {
      // Shows commas (or locale-appropriate punctuation) for large numbers.
      return number.toLocaleString();
    },
  });
})(vz_mesh || (vz_mesh = {})); // end of vz_mesh namespace
