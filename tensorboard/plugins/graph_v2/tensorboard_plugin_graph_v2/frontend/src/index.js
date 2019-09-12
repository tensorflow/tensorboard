// Programmatically reconstitute the contents of the index.html that Angular
// generates, in order to meet the TensorBoard Plugin `render()` contract.
export function render() {
  // See https://github.com/angular/angular-cli/issues/15157
  // re. file naming inconsistency.
  // For now we just include both sets; half of them will 404 in one situation
  // or the other.

  // `ng build` makes these
  import('./runtime-es2015.js');
  import('./polyfills-es2015.js');
  import('./styles-es2015.js');
  import('./polyfills-es5.js');
  import('./vendor-es2015.js');
  import('./main-es2015.js');

  // `ng build --watch` makes these
  import('./runtime.js');
  import('./polyfills.js');
  import('./styles.js');
  import('./polyfills.js');
  import('./vendor.js');
  import('./main.js');

  document.body.appendChild(document.createElement('app-root'));
}
