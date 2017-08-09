"use strict";
import {RequestManager} from '../tf-backend/requestManager.js';
import {getTags} from '../tf-backend/backend.js';
import {getRouter} from '../tf-backend/router.js';
import {categorizeTags} from '../tf-categorization-utils/categorizationUtils.js';
import {runsColorScale} from "../tf-color-scale/colorScale.js";

// Used to remember the step that each run is at. The runs may differ in
// step for various reasons. One run might write summaries more often or
// just run more slowly.
interface RunStepPair {
  run: string;
  step: number;
};

Polymer({
  is: 'tf-pr-curve-dashboard',
  properties: {
    _selectedRuns: Array,
    _runToTag: Object,  // map<run: string, tags: string[]>
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
    // An array of steps (numbers) to show in the slider for the dashboard.
    _stepsForSlider: {
      type: Array,
      notify: true,
    },
    _colorScale: {
      type: Object,
      value: () => ({scale: runsColorScale}),
      readOnly: true,
    },
    _runToStepMapping: {
      type: Object,
      value: {},
    },
    _runStepPairs: {
      type: Array,
      notify: true,
    },
  },
  listeners: {
    'data-updated': '_handleNewRunToDataMapping',
    'run-step-updated': '_handleRunStepUpdated',
  },
  ready() {
    this.reload();
  },
  reload() {
    this._fetchTags().then(() => {
      this._reloadCards();
    });
  },
  _fetchTags() {
    const url = getRouter().pluginRoute('pr_curve', '/tags');
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
  _reloadCards() {
    this.querySelectorAll('tf-pr-curve-card').forEach(card => {
      card.reload();
    });
  },
  _makeCategories(runToTag, selectedRuns, tagFilter) {
    return categorizeTags(runToTag, selectedRuns, tagFilter);
  },
  _handleNewRunToDataMapping(e) {
    const runToData = e.detail.runToData;
    _.forOwn(runToData, (entries, run) => {
      if (!entries.length) {
        return;
      }

      if (!this._stepsForSlider ||
          !this._stepsForSlider.length ||
          entries[entries.length - 1].step >
              this._stepsForSlider[this._stepsForSlider.length - 1]) {
        // We have encountered a new step greater than any that we have seen
        // before. Update the slider so the user can see PR curves at that
        // step.
        this.set('_stepsForSlider', entries.map(entry => entry.step));
      }
    });
  },
  _handleRunStepUpdated(e) {
    this._runToStepMapping[e.detail.run] = e.detail.step;
    const runStepPairs: RunStepPair[] = [];
    _.forOwn(this._runToStepMapping, (step, run) => {
      runStepPairs.push({
        run: run,
        step: step,
      });
    });
    runStepPairs.sort((pair0, pair1) => {
      if (pair0.run < pair1.run) {
        return -1;
      }
      if (pair0.run > pair1.run) {
        return 1;
      }
      return 0;
    });
    this.set('_runStepPairs', runStepPairs);
  },
  _shouldShowStepsSlider(stepsForSlider) {
    // Only show the slider if we have more than 1 step.
    return stepsForSlider && stepsForSlider.length;
  },
  _computeColorForRun(run) {
    return this._colorScale.scale(run);
  },
});