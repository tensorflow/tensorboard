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
import {computed, customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as THREE from 'three';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import '../../../components/tf_card_heading/tf-card-heading';
import {formatDate} from '../../../components/tf_card_heading/util';
import {runsColorScale} from '../../../components/tf_color_scale/colorScale';
import {
  ArrayBufferDataProvider,
  ErrorCodes,
} from './array-buffer-data-provider';
import {MeshViewer} from './mesh-viewer';

export interface TfMeshLoader extends HTMLElement {
  reload(): void;
  redraw(): void;
  setCameraViewpoint(
    position: THREE.Vector3,
    far: number,
    target: THREE.Vector3
  ): void;
}

@customElement('tf-mesh-loader')
class TfMeshLoaderImpl
  extends LegacyElementMixin(PolymerElement)
  implements TfMeshLoader
{
  static readonly template = html`
    <tf-card-heading color="[[_runColor]]" class="tf-mesh-loader-header">
      <template is="dom-if" if="[[_hasMultipleSamples(ofSamples)]]">
        <div>sample: [[_getSampleText(sample)]] of [[ofSamples]]</div>
      </template>
      <template is="dom-if" if="[[_hasAtLeastOneStep(_steps)]]">
        <div class="heading-row">
          <div class="heading-label">
            step
            <span style="font-weight: bold"
              >[[toLocaleString_(_stepValue)]]</span
            >
          </div>
          <div class="heading-label heading-right">
            <template is="dom-if" if="[[_currentWallTime]]">
              [[_currentWallTime]]
            </template>
          </div>
          <div class="label right">
            <paper-spinner-lite active hidden$="[[!_isMeshLoading]]">
            </paper-spinner-lite>
          </div>
        </div>
      </template>
      <template is="dom-if" if="[[_hasMultipleSteps(_steps)]]">
        <div>
          <paper-slider
            id="steps"
            immediate-value="{{_stepIndex}}"
            max="[[_getMaxStepIndex(_steps)]]"
            max-markers="[[_getMaxStepIndex(_steps)]]"
            snaps
            step="1"
            value="{{_stepIndex}}"
          ></paper-slider>
        </div>
      </template>
    </tf-card-heading>
    <style>
      paper-slider {
        width: 100%;
        margin-left: 1px;
        margin-right: 1px;
      }
      .tf-mesh-loader-header {
        display: block;
        height: 105px;
      }
      [hidden] {
        display: none;
      }
    </style>
  `;

  @property({type: String})
  run: string;

  @property({type: String})
  tag: string;

  @property({type: Number})
  sample: number;

  @property({type: Number})
  ofSamples: number;

  @property({type: String})
  selectedView: string = 'all';

  @property({type: Boolean})
  active: boolean = false;

  @property({type: Object})
  requestManager: RequestManager;

  @property({type: Object})
  _meshViewer: MeshViewer;

  @property({type: Object})
  _dataProvider: ArrayBufferDataProvider;

  @property({type: Object})
  _colorScaleFunction = runsColorScale;

  @property({
    type: Array,
    notify: true,
  })
  _steps: unknown[] = [];

  @property({
    type: Number,
    notify: true,
  })
  _stepIndex: number;

  @property({type: Boolean})
  _meshViewerAttached: boolean = false;

  @property({type: Boolean})
  _cameraPositionInitialized: boolean = false;

  @property({type: Boolean})
  _isMeshLoading: boolean = false;

  @computed('run')
  get _runColor(): string {
    var run = this.run;
    return this._colorScaleFunction(run);
  }

  /**
   * Called by parent when component attached to DOM.
   * @public
   */
  connectedCallback() {
    super.connectedCallback();
    // Defer reloading until after we're attached, because that ensures that
    // the requestManager has been set from above. (Polymer is tricky
    // sometimes)
    this._dataProvider = new ArrayBufferDataProvider(this.requestManager);
    const meshViewer = new MeshViewer(this._runColor);
    meshViewer.addEventListener(
      'beforeUpdateScene',
      this._updateCanvasSize.bind(this)
    );
    meshViewer.addEventListener(
      'cameraPositionChange',
      this._onCameraPositionChange.bind(this)
    );
    this._meshViewer = meshViewer;
  }

  /**
   * Function to call when component must be reloaded.
   */
  @observe('run', 'tag', 'active', '_dataProvider', '_meshViewer')
  reload() {
    if (!this.active || !this._dataProvider) {
      return;
    }
    this._isMeshLoading = true;
    this._dataProvider
      .reload(this.run, this.tag, this.sample)
      .then((steps: unknown[]) => {
        if (!steps) return; // Happens when request was cancelled at some point.
        this._steps = steps;
        this._stepIndex = steps.length - 1;
      })
      .catch((error) => {
        if (!error || !error.code || error.code != ErrorCodes.CANCELLED) {
          error = error || 'Response processing failed.';
          throw new Error(error);
        }
      });
  }
  /**
   * Updates the scene.
   * @private
   */
  @observe('_currentStep.*', '_meshViewer')
  _updateScene() {
    const currentStep = this._currentStep as any;
    // Mesh data is not fetched yet. Please see `_maybeFetchMesh`.
    if (!currentStep || !currentStep.mesh) return;
    this._meshViewer.updateScene(currentStep, this);
    if (!this._cameraPositionInitialized) {
      this._meshViewer.resetView();
      this._cameraPositionInitialized = true;
    }
    if (!this._meshViewerAttached) {
      // Mesh viewer should be added to the dom once.
      this.shadowRoot?.appendChild(this._meshViewer.getRenderer().domElement);
      this._meshViewerAttached = true;
    }
  }

  @observe('_currentStep')
  _debouncedFetchMesh() {
    this.debounce('fetchMesh', () => this._maybeFetchMesh(), 100);
  }

  async _maybeFetchMesh() {
    const currentStep = this._currentStep as any;
    if (!currentStep || currentStep.mesh || currentStep.meshFetching) return;
    currentStep.meshFetching = true;
    this._isMeshLoading = true;
    try {
      const meshData = await this._dataProvider.fetchData(
        currentStep,
        this.run,
        this.tag,
        this.sample
      );
      currentStep.mesh = meshData[0];
      this.notifyPath('_currentStep.mesh');
    } catch (error: any) {
      if (!error || !error.code || error.code != ErrorCodes.CANCELLED) {
        error = error || 'Response processing failed.';
        throw new Error(error);
      }
    } finally {
      this._isMeshLoading = false;
      currentStep.meshFetching = false;
    }
  }
  /**
   * Propagates camera position change event outside of the loader.
   * @private
   */
  _onCameraPositionChange() {
    if (!this._meshViewer.isReady()) return;
    const event = new CustomEvent('camera-position-change', {
      detail: this._meshViewer.getCameraPosition(),
    });
    this.dispatchEvent(event);
  }
  /**
   * Creates mesh geometry for current step data.
   * @param position Position of the camera.
   * @param far Camera frustum far plane.
   * @param target Point in space for camera to look at.
   */
  setCameraViewpoint(
    position: THREE.Vector3,
    far: number,
    target: THREE.Vector3
  ) {
    this._meshViewer.setCameraViewpoint(position, far, target);
  }
  /**
   * Updates size of the canvas.
   * @private
   */
  _updateCanvasSize() {
    const width = this.offsetWidth;
    const height = width; // Keep the whole mesh viewer square at all times.
    const headerHeight = (this.$$('.tf-mesh-loader-header') as HTMLElement)
      .offsetHeight;
    const canvasSize = {
      width: width,
      height: height - headerHeight,
    };
    this._meshViewer.setCanvasSize(canvasSize);
  }
  /**
   * Re-renders component in the browser.
   */
  redraw() {
    this._updateCanvasSize();
    // Do not render if not in the DOM.
    if (!this.isConnected) return;
    this._meshViewer.draw();
  }
  _hasAtLeastOneStep(steps) {
    return !!steps && steps.length > 0;
  }
  _hasMultipleSteps(steps) {
    return !!steps && steps.length > 1;
  }

  @computed('_steps', '_stepIndex')
  get _currentStep(): object | null {
    var steps = this._steps as any;
    var stepIndex = this._stepIndex;
    return steps[stepIndex] || null;
  }

  @computed('_currentStep')
  get _stepValue(): number {
    const currentStep = this._currentStep as any;
    if (!currentStep) return 0;
    return currentStep.step;
  }

  @computed('_currentStep')
  get _currentWallTime(): string {
    const currentStep = this._currentStep as any;
    if (!currentStep) return '';
    return formatDate(currentStep.wall_time);
  }
  _getMaxStepIndex(steps) {
    return steps.length - 1;
  }
  _getSampleText(sample) {
    return String(sample + 1);
  }
  _hasMultipleSamples(ofSamples) {
    return ofSamples > 1;
  }

  @observe('selectedView')
  _updateView() {
    var selectedView = this.selectedView;
    if (this._meshViewer && selectedView == 'all') {
      this._meshViewer.resetView();
    }
  }
  toLocaleString_(number) {
    // Shows commas (or locale-appropriate punctuation) for large numbers.
    return number.toLocaleString();
  }
}
