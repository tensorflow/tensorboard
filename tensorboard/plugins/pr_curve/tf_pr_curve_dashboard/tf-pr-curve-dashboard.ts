"use strict";
import {RequestManager} from '../tf-backend/requestManager.js';
import {getTags} from '../tf-backend/backend.js';
import {getRouter} from '../tf-backend/router.js';
import {categorizeTags} from '../tf-categorization-utils/categorizationUtils.js';
import {runsColorScale} from "../tf-color-scale/colorScale.js";

Polymer({
  is: 'tf-pr-curve-dashboard',
  properties: {
    _selectedRuns: Array,
    _runToTag: Object,  // map<run: string, tags: string[]>
    // The steps that the step slider for each run should use.
    _stepsPerRun: {
      type: Object, // map<run: string, steps: number[]>
      value: {},
    },
    _listOfRuns: Array,  // string[]
    // The actual step value that each run should use. If a run + tag lacks a PR
    // curve at this exact step value, the greatest step value less than this
    // value will be used.
    _stepPerRun: {
      type: Object,  // map<run: string, step: number>
      notify: true,
      value: {},
    },
    _dataNotFound: Boolean,
    _tagFilter: {
      type: String,  // upward bound from paper-input
      value: '.*',
    },
    _categories: {
      type: Array,
      computed:
        '_makeCategories(_runToTag, _selectedRuns, _tagFilter)',
    },
    _requestManager: {
      type: Object,
      value: () => new RequestManager(),
    },
    _step: {
      type: Number,
      value: 0,
      notify: true,
    },
    _colorScale: {
      type: Object,
      value: () => ({scale: runsColorScale}),
      readOnly: true,
    },
  },
  // TODO(chizeng): Create a widget with multiple sliders. That uses
  // parts of that slider widget, except we store the mapping directly.
  ready() {
    this.reload();
  },
  reload() {
    Promise.all([this._fetchTags(), this._fetchStepsPerRun()]).then(() => {
      this._reloadCards();
    });
  },
  _fetchTags() {
    const url = getRouter().pluginRoute('pr_curves', '/tags');
    return this._requestManager.request(url).then(runToTag => {
      if (_.isEqual(runToTag, this._runToTag)) {
        // No need to update anything if there are no changes.
        return;
      }
      const tags = getTags(runToTag);
      this.set('_dataNotFound', tags.length === 0);
      this.set('_runToTag', runToTag);
    });
  },
  _fetchStepsPerRun() {
    const url = getRouter().pluginRoute('pr_curves', '/steps_per_run');
    return this._requestManager.request(url).then(stepsPerRun => {
      this.set('_stepsPerRun', stepsPerRun);

      const listOfRuns = _.keys(stepsPerRun).sort();
      if (!_.isEqual(listOfRuns, this._listOfRuns)) {
        this.set('_listOfRuns', listOfRuns);
      }
    });
  },
  _reloadCards() {
    this.querySelectorAll('tf-pr-curve-card').forEach(card => {
      card.reload();
    });
  },
  _makeCategories(runToTag, selectedRuns, tagFilter) {
    return categorizeTags(runToTag, selectedRuns, tagFilter);
  },
  _computeColorForRun(run) {
    return this._colorScale.scale(run);
  },
});
