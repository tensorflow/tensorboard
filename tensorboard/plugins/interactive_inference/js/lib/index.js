__webpack_public_path__ =
    document.querySelector('body').getAttribute('data-base-url') +
    'nbextensions/wit-widget/';

// Export widget models and views, and the npm package version number.
module.exports = require('./wit.js');
module.exports['version'] = require('../package.json').version;
