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

/**
 * @fileoverview MeshViewer aims to provide 3D rendering capabilities.
 */

import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

interface LayerConfig {
  showBoundingBox?: boolean;
  showAxes?: boolean;
}

interface CanvasSize {
  height: number;
  width: number;
}

interface PointCloudConfig {
  material: {
    cls: string;
    size: number;
  };
}

export class MeshViewer extends THREE.EventDispatcher {
  private _lastMesh: THREE.Mesh | THREE.Points | null = null;
  private _clock = new THREE.Clock();
  /** @type {!Object} Contains width and height of the canvas. */
  private _canvasSize: CanvasSize | null = null;
  /** @type {!Object} Describes what layers must be rendered in addition
   to a mesh or a point cloud layers. */
  private _layersConfig: LayerConfig | null = null;
  private _runColor: string;

  private _animationFrameIndex?: number;

  private _camera?: THREE.PerspectiveCamera;
  private initCameraPosition?: THREE.Vector3;
  private initCameraLookAt?: THREE.Vector3;
  private _cameraControls?: OrbitControls;
  private _renderer: THREE.WebGLRenderer;

  private _scene?: THREE.Scene;
  private _silent?: boolean;

  /**
   * MeshViewer constructor. Initializes the component and underlying objects.
   * @param {string} runColor Run color to use in case when colors are absent.
   */
  constructor(runColor) {
    super();
    this._runColor = runColor;
  }

  // TODO(b/130030314) replace with some thirdparty library call.
  /**
   * Returns true if the specified value is an object.
   * @param {?} val Variable to test.
   * @private
   * @return {boolean} Whether variable is an object.
   */
  _isObject(val) {
    var type = typeof val;
    // We're interested in objects representing dictionaries only. Everything
    // else is "not mergeable", so we consider it as primitive types.
    return type == 'object' && val != null && !Array.isArray(val);
  }

  /**
   * Merges two configs together.
   * @param {!Object} userConfig User configuration has higher priority.
   * @param {!Object} defaultConfig Default configuration has lower priority and
   *   will be overridden by any conflicting keys from userConfig.
   * @private
   * @return {!Object} Merged dictionary from two configuration dictionaries.
   */
  _applyDefaults(userConfig, defaultConfig) {
    let mergedConfig = {};
    const configs = [userConfig, defaultConfig];
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      for (let key in config) {
        const is_key_present = key in mergedConfig;
        if (this._isObject(config[key])) {
          mergedConfig[key] = this._applyDefaults(
            mergedConfig[key] || {},
            config[key]
          );
        } else if (!is_key_present) {
          mergedConfig[key] = config[key];
        }
      }
    }
    return mergedConfig;
  }

  /**
   * Creates additional layers to render on top of a mesh or a point cloud
   * layers.
   * @private
   */
  _createLayers() {
    if (!this._layersConfig || !this._scene || !this._lastMesh) return;
    if (this._layersConfig.showBoundingBox) {
      var box = new THREE.BoxHelper(
        this._lastMesh,
        new THREE.Color('rgb(0, 0, 255)')
      );
      this._scene.add(box);
    }
    if (this._layersConfig.showAxes) {
      var axesHelper = new THREE.AxesHelper(5);
      this._scene.add(axesHelper);
    }
  }
  /**
   * Sets layers config.
   * @param {!Object} layersConfig Config object describing what layers should
   *  be rendered.
   */
  setLayersConfig(layersConfig) {
    this._layersConfig = this._applyDefaults(
      layersConfig,
      this._layersConfig || {}
    );
  }
  /**
   * Creates scene, camera and renderer.
   * @param {!Object} config Scene rendering configuration.
   * @param {!HTMLDOMElement} domElement The HTML element used for event listeners.
   * @private
   */
  _createWorld(config, domElement) {
    if (this.isReady()) {
      // keep world objects as singleton objects.
      return;
    }
    this._scene = new THREE.Scene();
    var camera = new THREE[config.camera.cls](
      config.camera.fov,
      this._canvasSize?.width! / this._canvasSize?.height!,
      config.camera.near,
      config.camera.far
    );
    this._camera = camera;

    this.initCameraPosition = undefined;
    if (config.camera.position) {
      this.initCameraPosition = new THREE.Vector3().fromArray(
        config.camera.position
      );
    }

    this.initCameraLookAt = undefined;
    if (config.camera.lookAt) {
      this.initCameraLookAt = new THREE.Vector3().fromArray(
        config.camera.lookAt
      );
    }

    var camControls = new OrbitControls(camera, domElement);
    const anyCamControls = camControls as any;
    // TODO(tensorboard-team): check whether these are depreacted; they no longer exist
    // in API docs.
    anyCamControls.lookSpeed = 0.4;
    anyCamControls.movementSpeed = 20;
    anyCamControls.noFly = true;
    anyCamControls.lookVertical = true;
    anyCamControls.constrainVertical = true;
    anyCamControls.verticalMin = 1;
    anyCamControls.verticalMax = 2;
    anyCamControls.addEventListener(
      'change',
      this._onCameraPositionChange.bind(this)
    );
    this._cameraControls = camControls;
    this._renderer = new THREE.WebGLRenderer({antialias: true});
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(this._canvasSize?.width!, this._canvasSize?.height!);
    this._renderer.setClearColor(0xffffff, 1);
  }

  /**
   * Clears scene from any 3D geometry.
   */
  _clearScene() {
    if (this._scene) {
      while (this._scene.children.length > 0) {
        this._scene.remove(this._scene?.children[0]);
      }
    }
  }

  /**
   * Returns underlying renderer.
   * @public
   */
  getRenderer() {
    return this._renderer;
  }

  /**
   * Returns underlying camera controls.
   * @public
   */
  getCameraControls() {
    return this._cameraControls;
  }

  /**
   * Returns true when all underlying components were initialized.
   * @public
   */
  isReady() {
    return !!this._camera && !!this._cameraControls;
  }

  /**
   * Returns current camera position.
   * @public
   */
  getCameraPosition() {
    return {
      far: this._camera?.far,
      position: this._camera?.position.clone(),
      target: this._cameraControls?.target.clone(),
    };
  }

  /**
   * Sets new canvas size.
   * @param {!Object} canvasSize Contains current canvas width and height.
   * @public
   */
  setCanvasSize(canvasSize) {
    this._canvasSize = canvasSize;
  }

  /**
   * Renders component into the browser.
   * @public
   */
  draw() {
    // Cancel any previous requests to perform redraw.
    if (this._animationFrameIndex) {
      cancelAnimationFrame(this._animationFrameIndex);
    }
    if (this._camera) {
      this._camera.aspect =
        this._canvasSize?.width! / this._canvasSize?.height!;
      this._camera.updateProjectionMatrix();
    }
    this._renderer.setSize(this._canvasSize?.width!, this._canvasSize?.height!);
    const animate = function () {
      var delta = this._clock.getDelta();
      this._cameraControls.update(delta);
      this._animationFrameIndex = requestAnimationFrame(animate);
      this._renderer.render(this._scene, this._camera);
    }.bind(this);
    animate();
  }
  /**
   * Updates the scene.
   * @param {!Object} currentStep Step datum.
   * @param {!HTMLDOMElement} domElement The HTML element used for event listeners.
   * @public
   */
  updateScene(currentStep, domElement) {
    let config = {};
    if ('config' in currentStep && currentStep.config) {
      config = JSON.parse(currentStep.config) as {};
    }
    // This event is an opportunity for UI-responsible component (parent) to set
    // proper canvas size.
    this.dispatchEvent({type: 'beforeUpdateScene'});
    const default_config = {
      camera: {cls: 'PerspectiveCamera', fov: 75, near: 0.1, far: 1000},
      lights: [
        {cls: 'AmbientLight', color: '#ffffff', intensity: 0.75},
        {
          cls: 'DirectionalLight',
          color: '#ffffff',
          intensity: 0.75,
          position: [0, -1, 2],
        },
      ],
    };
    config = this._applyDefaults(config, default_config);
    this._createWorld(config, domElement);
    this._clearScene();
    this._createLights(this._scene, config);
    this._createGeometry(currentStep, config);
    this._createLayers();
    this.draw();
  }
  /**
   * Sets camera to default position and zoom.
   * @param {?THREE.Mesh} mesh Mesh to fit into viewport.
   * @public
   */
  resetView(mesh?: THREE.Mesh) {
    if (!this.isReady()) return;
    this._cameraControls?.reset();

    let nextMesh: any;
    if (!mesh && this._lastMesh) {
      nextMesh = this._lastMesh;
    }
    if (nextMesh) {
      this._fitObjectToViewport(nextMesh);
      // Store last mesh in case of resetView method called due to some events.
      this._lastMesh = nextMesh;
    }
    this._cameraControls?.update();
  }
  /**
   * Creates geometry for current step data.
   * @param {!Object} currentStep Step datum.
   * @param {!Object} config Scene rendering configuration.
   * @private
   */
  _createGeometry(currentStep, config) {
    const mesh = currentStep.mesh;
    if (mesh.vertices && mesh.faces && mesh.faces.length) {
      this._createMesh(mesh, config);
    } else {
      this._createPointCloud(mesh, config);
    }
  }
  /**
   * Creates point cloud geometry for current step data.
   * @param {!Object} pointCloudData Object with point cloud data.
   * @param {!Object} config Scene rendering configuration.
   * @private
   */
  _createPointCloud(pointCloudData, config: Partial<PointCloudConfig>) {
    const points = pointCloudData.vertices;
    const colors = pointCloudData.colors;
    let defaultConfig: PointCloudConfig = {
      material: {
        cls: 'PointsMaterial',
        size: 0.005,
      },
    };
    // Determine what colors will be used.
    if (colors && colors.length == points.length) {
      defaultConfig.material['vertexColors'] = true;
    } else {
      defaultConfig.material['color'] = this._runColor;
    }
    const pc_config = this._applyDefaults(
      config,
      defaultConfig
    ) as PointCloudConfig;
    const geometry = new THREE.BufferGeometry();
    // Flattens the [N, 3] shaped `points` into a N*3 length array.
    const flatPoints = new Float32Array(points.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(flatPoints, 3));

    if (colors && colors.length == points.length) {
      // Flattens the N colors into a N*3 length array.
      const flatColors = new Float32Array(colors.flat());
      for (let i = 0; i < flatColors.length; i++) {
        flatColors[i] = flatColors[i] / 255;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(flatColors, 3));
    }
    var material = new THREE[pc_config.material.cls](pc_config.material);
    var mesh = new THREE.Points(geometry, material);
    this._scene?.add(mesh);
    this._lastMesh = mesh;
  }
  /**
   * Creates mesh geometry for current step data.
   * @param {!THREE.Vector3} position Position of the camera.
   * @param {number} far Camera frustum far plane.
   * @param {!THREE.Vector3} target Point in space for camera to look at.
   * @public
   */
  setCameraViewpoint(position, far, target) {
    this._silent = true;
    if (this._camera) {
      this._camera.far = far;
      this._camera.position.set(position.x, position.y, position.z);
      this._camera.lookAt(target.clone());
      this._camera.updateProjectionMatrix();
    }
    if (this._cameraControls) {
      this._cameraControls.target = target.clone();
      this._cameraControls.update();
    }
    this._silent = false;
  }
  /**
   * Triggered when camera position changed.
   * @private
   */
  _onCameraPositionChange(event) {
    if (this._silent) return;
    this.dispatchEvent({type: 'cameraPositionChange', event: event});
  }
  /**
   * Positions camera on such distance from the object that the whole object is
   * visible.
   * @param {!THREE.Mesh} mesh Mesh to fit into viewport.
   * @private
   */
  _fitObjectToViewport(mesh) {
    // Small offset multiplicator to avoid edges of mesh touching edges of
    // viewport.
    const offset = 1.25;
    const boundingBox = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    boundingBox.setFromObject(mesh);
    boundingBox.getCenter(center);
    boundingBox.getSize(size);
    const max_dim = Math.max(size.x, size.y, size.z);
    const fov = this._camera?.fov! * (Math.PI / 180);
    let camera_z = Math.abs(max_dim / (2 * Math.tan(fov / 2))) * offset;
    const min_z = boundingBox.min.z;
    // Make sure that even after arbitrary rotation mesh won't be clipped.
    const camera_to_far_edge = min_z < 0 ? -min_z + camera_z : camera_z - min_z;
    // Set camera position and orientation.
    const cameraPosition =
      this.initCameraPosition ??
      new THREE.Vector3(center.x, center.y, camera_z);
    const lookAt = this.initCameraLookAt ?? center;
    this.setCameraViewpoint(cameraPosition, camera_to_far_edge * 3, lookAt);
  }
  /**
   * Creates mesh geometry for current step data.
   * @param {!Object} meshData Object with mesh data.
   * @param {!Object} config Scene rendering configuration.
   * @private
   */
  _createMesh(meshData, config) {
    const vertices = meshData.vertices;
    const faces = meshData.faces;
    const colors = meshData.colors;
    const mesh_config = this._applyDefaults(config, {
      material: {
        cls: 'MeshStandardMaterial',
        color: '#a0a0a0',
        roughness: 1,
        metalness: 0,
      },
    }) as any;
    const geometry = new THREE.BufferGeometry();
    // Flattens the [N, 3] shaped `vertices` into a N*3 length array.
    // THREE.BufferAttribute expects values to be a shallow list, with the
    // itemSize specified.
    const flatPoints = new Float32Array(vertices.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(flatPoints, 3));

    /**
     * Flattens the [N, 3] shaped `faces` into a N*3 length array of indices.
     * This array of integers corresponds to triplets in the 'position'
     * attribute. For example,
     *   flatPoints = new Float32Array([7.5, 0, 0, 8.5, 0, 0, 9.5, 0, 0]);
     *   vertexIndicesPerFace = new Uint16Array([2, 0, 1]);
     *
     * corresponds to 1 face with vertices
     *   vertex1 at (9.5, 0, 0)
     *   vertex2 at (7.5, 0, 0)
     *   vertex3 at (8.5, 0, 0)
     */
    const vertexIndicesPerFace = new Uint16Array(faces.flat());

    if (colors && colors.length) {
      // Flat colors is a N*3*3 length array of colors, where there are N faces,
      // each face has 3 colors, and each color has 3 components (RGB).
      const flatColors = colors.flat();
      for (let i = 0; i < flatColors.length; i++) {
        flatColors[i] = flatColors[i] / 255;
      }
      geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(flatColors), 3)
      );

      mesh_config.material = mesh_config.material || {};
      mesh_config.material.vertexColors = true;
    }

    geometry.center();
    geometry.computeBoundingSphere();
    // We intentionally set the index before `computeVertexNormals()`, which may
    // check for indexed values.
    geometry.setIndex(new THREE.BufferAttribute(vertexIndicesPerFace, 1));
    geometry.computeVertexNormals();

    let material = new THREE[mesh_config.material.cls](mesh_config.material);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this._scene?.add(mesh);
    this._lastMesh = mesh;
  }
  /**
   * Creates lights for a given scene based on passed configuration.
   * @param {!Scene} scene Scene object to add lights to.
   * @param {!Object} config Scene rendering configuration.
   * @private
   */
  _createLights(scene, config) {
    for (let i = 0; i < config.lights.length; i++) {
      const light_config = config.lights[i];
      let light = new THREE[light_config.cls](
        light_config.color,
        light_config.intensity
      );
      if (light_config.position) {
        light.position.set(
          light_config.position[0],
          light_config.position[1],
          light_config.position[2]
        );
      }
      scene.add(light);
    }
  }
}
