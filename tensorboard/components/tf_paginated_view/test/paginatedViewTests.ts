/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

declare function fixture(id: string): void;

describe('tf-paginated-view tests', () => {
  window.HTMLImports.whenReady(() => {
    let view: any;
    beforeEach(() => {
      view = fixture('paginatedViewFixture');
      view.limit = 5;
      view.items = _.range(13);
    });

    it('renders its subcomponents', () => {
      const child = view.querySelector('#child');
      chai.assert.isNotNull(child);
      chai.assert.equal(child.innerHTML, 'Content within the paginated view.');
    });

    it('emits a list of pages', () => {
      chai.assert.deepEqual(view.pages, [
        {active: true, items: [0, 1, 2, 3, 4]},
        {active: false, items: [5, 6, 7, 8, 9]},
        {active: false, items: [10, 11, 12]},
      ]);
    });

    it('changes its pages when the items change', () => {
      view.items = view.items.slice().reverse();
      chai.assert.deepEqual(view.pages, [
        {active: true, items: [12, 11, 10, 9, 8]},
        {active: false, items: [7, 6, 5, 4, 3]},
        {active: false, items: [2, 1, 0]},
      ]);
    });

    it('handles shrinking the number of pages', () => {
      view.items = _.range(7).map(x => 10 * x);
      chai.assert.deepEqual(view.pages, [
        {active: true, items: [0, 10, 20, 30, 40]},
        {active: false, items: [50, 60]},
      ]);
    });

    it('handles enlarging the number of pages', () => {
      view.items = _.range(22).map(x => 10 * x);
      chai.assert.deepEqual(view.pages, [
        {active: true, items: [0, 10, 20, 30, 40]},
        {active: false, items: [50, 60, 70, 80, 90]},
        {active: false, items: [100, 110, 120, 130, 140]},
        {active: false, items: [150, 160, 170, 180, 190]},
        {active: false, items: [200, 210]},
      ]);
    });
  });
});
