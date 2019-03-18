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
(function() { // Private scope.
  /**
   * Display only devices matching one of the following regex.
   */
  var DEVICE_NAMES_INCLUDE = [
    {
      // Don't include GPU stream, memcpy, etc. devices
      regex: /device:[^:]+:[0-9]+$/,
    }
  ];

  /**
   * Stats from device names that match these regexes will be disabled by default.
   * The user can still turn on a device by selecting the checkbox in the device list.
   */
  var DEVICE_STATS_DEFAULT_OFF = [
  //  {
  //    regex: //,
  //    msg: 'Excluded by default since...'
  //  }
  ];

  /**
   * TODO(stephanwlee): Convert this to proper type when converting to TypeScript.
   * @typedef {{
   *   run: string,
   *   tag: ?string,
   *   type: tf.graph.SelectionType,
   * }}
   */
  const Selection = {};

  Polymer({
      is: 'tf-graph-controls',
      properties: {
        // Public API.
        stats: {
          value: null,
          type: Object,
          observer: '_statsChanged'
        },
        devicesForStats: {
          value: null,
          type: Object,
          notify: true,
          // TODO(stephanwlee): Change readonly -> readOnly and fix the setter.
          readonly: true,
        },
        colorBy: {
          type: String,
          value: 'structure',
          notify: true,
        },
        colorByParams: {
          type: Object,
          notify: true,
          // TODO(stephanwlee): Change readonly -> readOnly and fix the setter.
          readonly: true,
        },
        datasets: {
          type: Array,
          observer: '_datasetsChanged',
          value: () => [],
        },
        renderHierarchy: {
          type: Object,
          notify: true,
        },
        /**
         * @type {!Selection}
         */
        selection: {
          type: Object,
          notify: true,
          readOnly: true,
          computed: '_computeSelection(datasets, _selectedRunIndex, _selectedTagIndex, _selectedGraphType)',
        },
        selectedFile: {
          type: Object,
          notify: true
        },
        _selectedRunIndex: {
          type: Number,
          value: 0,
          observer: '_selectedRunIndexChanged',
        },
        _selectedTagIndex: {
          type: Number,
          value: 0,
          observer: '_selectedTagIndexChanged',
        },
        /**
         * @type {tf.graph.SelectionType}
         */
        _selectedGraphType: {
          type: String,
          value: tf.graph.SelectionType.OP_GRAPH,
        },
        selectedNode: {
          type: String,
          notify: true
        },
        _currentDevices: {
          type: Array,
          computed: '_getCurrentDevices(devicesForStats)'
        },
        _currentDeviceParams: {
          type: Array,
          computed: '_getCurrentDeviceParams(colorByParams)'
        },
        _currentXlaClusterParams: {
          type: Array,
          computed: '_getCurrentXlaClusterParams(colorByParams)'
        },
        _currentGradientParams: {
          type: Object,
          computed: '_getCurrentGradientParams(colorByParams, colorBy)'
        },
        showSessionRunsDropdown: {
          type: Boolean,
          value: true
        },
        showUploadButton: {
          type: Boolean,
          value: true
        },
        // This stores whether the feature for showing health pills is enabled in the first place.
        healthPillsFeatureEnabled: Boolean,
        // This stores whether to show health pills. Only relevant if healthPillsFeatureEnabled. The
        // user can toggle this value.
        healthPillsToggledOn: {
          type: Boolean,
          notify: true,
        },
        _legendOpened: {
          type: Boolean,
          value: true,
        },
      },
      listeners: {
        'trace-inputs.change': '_traceInputToggleChanged'
      },
      _traceInputToggleChanged: function(event) {
        // Flip the state of the trace inputs flag.
        this.renderHierarchy.traceInputs = event.target.active;
        tf.graph.scene.node.traceInputs(this.renderHierarchy);
      },
      _xlaClustersProvided: function(renderHierarchy) {
        return renderHierarchy &&
            renderHierarchy.hierarchy &&
            renderHierarchy.hierarchy.xlaClusters.length > 0;
      },
      _statsChanged: function(stats) {
        if (stats == null) {
          return;
        }
        var devicesForStats = {};
        var devices = _.each(stats.dev_stats, function(d) {
          // Only considered included devices.
          var include = _.some(DEVICE_NAMES_INCLUDE, function(rule) {
            return rule.regex.test(d.device);
          });
          // Exclude device names that are ignored by default.
          var exclude = _.some(DEVICE_STATS_DEFAULT_OFF, function(rule) {
            return rule.regex.test(d.device);
          });
          if (include && !exclude) {
            devicesForStats[d.device] = true;
          }
        });
        this.set('devicesForStats', devicesForStats);
      },
      _getCurrentDevices: function(devicesForStats) {
        var all_devices = _.map(this.stats && this.stats.dev_stats, function(d) {
          return d.device;
        });
        var devices = _.filter(all_devices, function(d) {
          return _.some(DEVICE_NAMES_INCLUDE, function(rule) {
            return rule.regex.test(d);
          });
        });
        // Devices names can be long so we remove the longest common prefix
        // before showing the devices in a list.
        var suffixes = tf.graph.util.removeCommonPrefix(devices);
        if (suffixes.length == 1) {
          var found = suffixes[0].match(/device:([^:]+:[0-9]+)$/);
          if (found) {
            suffixes[0] = found[1];
          }
        }
        return _.map(devices, function(device, i) {
          var ignoredMsg = null;
          _.each(DEVICE_STATS_DEFAULT_OFF, function(rule) {
            if (rule.regex.test(device)) {
              ignoredMsg = rule.msg;
            }
          });
          return {
            device: device,
            suffix: suffixes[i],
            used: devicesForStats[device],
            ignoredMsg: ignoredMsg
          };
        });
      },
      _deviceCheckboxClicked: function(checkbox) {
        // Update the device map.
        var devicesForStats = _.extend({}, this.devicesForStats);
        var device = checkbox.target.value;
        if (checkbox.target.checked) {
          devicesForStats[device] = true;
        } else {
          delete devicesForStats[device];
        }
        this.set('devicesForStats', devicesForStats);
      },
      _numTags: function(datasets, _selectedRunIndex) {
        return this._getTags(datasets, _selectedRunIndex).length;
      },
      _getTags: function(datasets, _selectedRunIndex) {
        if (!datasets || !datasets[_selectedRunIndex]) {
          return [];
        }
        return datasets[_selectedRunIndex].tags;
      },
      fit: function() {
        document.querySelector('#scene').fit();
      },
      _isGradientColoring: function(stats, colorBy) {
        return ["compute_time", "memory"].indexOf(colorBy) !== -1
            && stats != null;
      },
      _equals: function(a, b) {
        return a === b;
      },
      _getCurrentDeviceParams: function(colorByParams) {
        var deviceParams = _.filter(colorByParams.device, function(param) {
          return _.some(DEVICE_NAMES_INCLUDE, function(rule) {
            return rule.regex.test(param.device);
          });
        });
        // Remove common prefix and merge back corresponding color. If
        // there is only one device then remove everything up to "/device:".
        var suffixes = tf.graph.util.removeCommonPrefix(
                _.map(deviceParams, function(d) { return d.device; }));
        if (suffixes.length == 1) {
          var found = suffixes[0].match(/device:([^:]+:[0-9]+)$/);
          if (found) {
            suffixes[0] = found[1];
          }
        }
        return _.map(deviceParams, function(d, i) {
          return { device : suffixes[i], color : d.color };
        });
      },
      _getCurrentXlaClusterParams: function(colorByParams) {
        return colorByParams.xla_cluster;
      },
      _getCurrentGradientParams: function(colorByParams, colorBy) {
        if (!this._isGradientColoring(this.stats, colorBy)) {
          return;
        }
        var params = colorByParams[colorBy];
        var minValue = params.minValue;
        var maxValue = params.maxValue;
        if (colorBy === 'memory') {
          minValue = tf.graph.util.convertUnitsToHumanReadable(
              minValue, tf.graph.util.MEMORY_UNITS);
          maxValue = tf.graph.util.convertUnitsToHumanReadable(
              maxValue, tf.graph.util.MEMORY_UNITS);
        } else if (colorBy === 'compute_time') {
          minValue = tf.graph.util.convertUnitsToHumanReadable(
              minValue, tf.graph.util.TIME_UNITS);
          maxValue = tf.graph.util.convertUnitsToHumanReadable(
              maxValue, tf.graph.util.TIME_UNITS);
        }
        return {
          minValue: minValue,
          maxValue: maxValue,
          startColor: params.startColor,
          endColor: params.endColor
        };
      },
      download: function() {
        this.$.graphdownload.click();
      },
      _updateFileInput: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Strip off everything before the last "/" and strip off the file
        // extension in order to get the name of the PNG for the graph.
        let filePath = file.name;
        const dotIndex = filePath.lastIndexOf('.');
        if (dotIndex >= 0) {
          filePath = filePath.substring(0, dotIndex);
        }
        const lastSlashIndex = filePath.lastIndexOf('/');
        if (lastSlashIndex >= 0) {
          filePath = filePath.substring(lastSlashIndex + 1);
        }
        this._setDownloadFilename(filePath);
        this.set('selectedFile', e);
      },
      _datasetsChanged: function(newDatasets, oldDatasets) {
        if (oldDatasets != null) {
          // Select the first dataset by default.
          this._selectedRunIndex = 0;
        }
      },
      _computeSelection: function(datasets, _selectedRunIndex, _selectedTagIndex, _selectedGraphType) {
        if (!datasets[_selectedRunIndex] ||
            !datasets[_selectedRunIndex].tags[_selectedTagIndex]) {
          return null;
        }

        return {
          run: datasets[_selectedRunIndex].name,
          tag: datasets[_selectedRunIndex].tags[_selectedTagIndex].tag,
          type: _selectedGraphType,
        }
      },
      _selectedRunIndexChanged: function(runIndex) {
        if (!this.datasets) return;
        // Reset the states when user pick a different run.
        this.colorBy = 'structure';
        this._selectedTagIndex = 0;
        this._selectedGraphType = this._getDefaultSelectionType();
        this.$['trace-inputs'].active = false; // Set trace input to off-state.
        this._setDownloadFilename(this.datasets[runIndex] ? this.datasets[runIndex].name : '');
      },
      _selectedTagIndexChanged() {
         this._selectedGraphType = this._getDefaultSelectionType();
      },
      _getDefaultSelectionType() {
        const {
          datasets,
          _selectedRunIndex: run,
          _selectedTagIndex: tag,
        } = this;
        if (!datasets ||
            !datasets[run] ||
            !datasets[run].tags[tag] ||
            datasets[run].tags[tag].opGraph) {
          return tf.graph.SelectionType.OP_GRAPH;
        }
        if (datasets[run].tags[tag].profile) {
          return tf.graph.SelectionType.PROFILE;
        }
        if (datasets[run].tags[tag].conceptualGraph) {
          return tf.graph.SelectionType.CONCEPTUAL_GRAPH;
        }
        return tf.graph.SelectionType.OP_GRAPH;
      },
      _getFile: function() {
        this.$$("#file").click();
      },
      _setDownloadFilename: function(name) {
        this.$.graphdownload.setAttribute('download', name + '.png');
      },
      _statsNotNull: function(stats) {
        return stats !== null;
      },
      _toggleLegendOpen() {
        this.set('_legendOpened', !this._legendOpened);
      },
      _getToggleText(legendOpened) {
        return legendOpened ? "Close legend." : "Expand legend.";
      },
      _getToggleLegendIcon(legendOpened) {
        // This seems counter-intuitive, but actually makes sense because the
        // expand-more button points downwards, and the expand-less button points
        // upwards. For most collapsibles, this works because the collapsibles
        // expand in the downwards direction. This collapsible expands upwards
        // though, so we reverse the icons.
        return legendOpened ? "expand-more" : "expand-less";
      },
      _getSelectionOpGraphDisabled(datasets, _selectedRunIndex, _selectedTagIndex) {
        return !datasets[_selectedRunIndex] ||
            !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
            !datasets[_selectedRunIndex].tags[_selectedTagIndex].opGraph;
      },
      _getSelectionProfileDisabled(datasets, _selectedRunIndex, _selectedTagIndex) {
        return !datasets[_selectedRunIndex] ||
            !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
            !datasets[_selectedRunIndex].tags[_selectedTagIndex].profile;
      },
      _getSelectionConceptualGraphDisabled(datasets, _selectedRunIndex, _selectedTagIndex) {
        return !datasets[_selectedRunIndex] ||
            !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
            !datasets[_selectedRunIndex].tags[_selectedTagIndex].conceptualGraph;
      },
    });
})(); // Closing private scope.