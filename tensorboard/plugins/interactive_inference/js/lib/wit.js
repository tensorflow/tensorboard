var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');

/**
 * Helper method to load the vulcanized template.
 */
function loadVulcanizedTemplate() {
    const templateLocation =
        __webpack_public_path__ + 'wit_jupyter.html';

    // If the vulcanized template is not loaded yet, load it now.
    if (!document.querySelector('link[href="' + templateLocation + '"]')) {
        const link = document.createElement('link');
        link.setAttribute('rel', 'import');
        link.setAttribute('href', templateLocation);
        document.head.appendChild(link);
    }
}

// Custom View. Renders the widget model.
var WITView = widgets.DOMWidgetView.extend({
    render: function() {
        loadVulcanizedTemplate();
        this.inferMutantsCounter = 0;
        this.view_ = document.createElement('tf-interactive-inference-dashboard');
        this.view_.local = true;
        this.el.appendChild(this.view_);
        this.model.on('change:examples', this.examples_changed, this);
        this.model.on('change:config', this.config_changed, this);
        this.model.on('change:inferences', this.inferences_changed, this);
        this.model.on('change:eligible_features', this.eligible_features_changed, this);
        this.model.on('change:mutant_charts', this.mutant_charts_changed, this);
        this.model.on('change:sprite', this.sprite_changed, this);

        this.view_.addEventListener('infer-examples', e => {
            let i = this.model.get('infer') + 1;
            this.model.set('infer', i);
            this.touch();
        });
        this.view_.addEventListener('delete-example', e => {
            this.model.set('delete_example', {'index': e.detail.index});
            this.touch();
        });
        this.view_.addEventListener('duplicate-example', e => {
            this.model.set('duplicate_example', {'index': e.detail.index});
            this.touch();
        });
        this.view_.addEventListener('update-example', e => {
            this.model.set('update_example',
              {'index': e.detail.index, 'example': e.detail.example});
            this.touch();
        });
        this.view_.addEventListener('get-eligible-features', e => {
            let i = this.model.get('get_eligible_features') + 1;
            this.model.set('get_eligible_features', i);
            console.log(this.model.get('get_eligible_features'));
            this.touch();
        });
        this.view_.addEventListener('infer-mutants', e => {
            e.detail['infer_mutants_counter'] = this.inferMutantsCounter++;
            this.model.set('infer_mutants', e.detail);
            this.mutantFeature = e.detail.feature_name;
            this.touch();
        });
        setTimeout(()=> {
            this.config_changed();
            this.examples_changed();
            this.sprite_changed();
        }, 0);
    },

    examples_changed: function() {
        const examples = this.model.get('examples');
        if (!this.view_.updateExampleContents_) {
            setTimeout(() => this.examples_changed(), 100);
            return;
        }
        if (examples && examples.length > 0) {
            this.view_.updateExampleContents_(examples, false);
        }
    },
    inferences_changed: function() {
        const inferences = this.model.get('inferences');
        this.view_.labelVocab = inferences['label_vocab'];
        this.view_.inferences = inferences['inferences'];
    },
    eligible_features_changed: function() {
        const features = this.model.get('eligible_features');
        this.view_.partialDepPlotEligibleFeatures = features
    },
    mutant_charts_changed: function() {
        console.log('mutant charts changed');
        const chartInfo = this.model.get('mutant_charts');
        this.view_.makeChartForFeature_(chartInfo.chartType, this.mutantFeature, chartInfo.data);
    },
    config_changed: function() {
        const config = this.model.get('config');
        if ('inference_address' in config) {
            this.view_.inferenceAddress = config['inference_address'];
        }
        if ('model_name' in config) {
            this.view_.modelName = config['model_name'];
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
    },
    sprite_changed: function() {
        if (!this.view_.updateSprite_) {
            setTimeout(() => this.sprite_changed(), 100);
            return;
        }
        const spriteUrl = this.model.get('sprite');
        this.view_.hasSprite = true;
        this.view_.localAtlasUrl = spriteUrl;
        this.view_.updateSprite_();
    },
});


module.exports = {
    WITView : WITView
};
