module.exports = function(config) {
  // config.set({
  //   frameworks: ['jasmine'],
  //   files: [
  //     'tensorboard/ dtype-utils-test.js'
  //   ],
  //   port: 9876
  // });
  config.files.push({
    // pattern: 'tensorboard/components/tensor_widget/dtype-utils-test.js',
    pattern: 'dtype-utils-test.js',
    // Set as a script tag in the browser
    included: true,
    // Watch the file for changes
    watched: true
  });
};
