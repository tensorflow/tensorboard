var wit-widget = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: 'wit-widget',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
      widgets.registerWidget({
          name: 'wit-widget',
          version: wit-widget.version,
          exports: wit-widget
      });
  },
  autoStart: true
};

