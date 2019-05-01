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
namespace tf_paginated_view {

const {expect} = chai;

declare function fixture(id: string): void;
type Item = {
  id: String,
  content: String,
};
type ItemCategory = tf_categorization_utils.Category<Item>;

function createCategory(numItems: Number): ItemCategory {
  const items = Array.from(Array(numItems))
    .map((_, i) => ({id: `id${i}`, content: `content_${i}`}));

  return {
    name: 'Category1',
    metadata: {
      type: tf_categorization_utils.CategoryType.PREFIX_GROUP,
    },
    items,
  };
}
function flushP(): Promise<void> {
  return new Promise(resolve => window.flush(resolve));
}
function flushAnimationFrameP(): Promise<void> {
  return new Promise(resolve => window.animationFrameFlush(resolve));
}
function flushAllP(): Promise<[void, void]> {
  return Promise.all([flushP(), flushAnimationFrameP()]);
}
describe('tf-paginated-view tests', () => {
  let view: any;

  function querySelector(cssSelector: string): HTMLElement {
    return view.$.view.root.querySelector(cssSelector);
  }
  async function goNext() {
    querySelector('.big-page-buttons paper-button:last-of-type').click();
    await flushAllP();
  }

  beforeEach(async () => {
    view = fixture('paginatedViewFixture');
    view._limit = 2;
    view.category = createCategory(5);
    view.randomNumber = 42;

    // allow dom-if to be flushed.
    await flushAllP();
  });

  it('renders a page', () => {
    expect(querySelector('#id0')).to.be.not.null;
    expect(querySelector('#id1')).to.be.not.null;

    // 2-4 should be in another page.
    expect(querySelector('#id2')).to.be.null;
  });

  it('responds to ancestor prop change that is bound on template', () => {
    expect(querySelector('#id0').getAttribute('number')).to.equal('42');

    view.randomNumber = 7;
    expect(querySelector('#id0').getAttribute('number')).to.equal('7');
  });

  it('navigates to next page when clicked on a button', async () => {
    // Sanity check
    expect(querySelector('#id2')).to.be.null;
    expect(querySelector('#id4')).to.be.null;
    expect(querySelector('paper-input')).to.have.property('value', '1');

    await goNext();

    expect(querySelector('#id1')).to.be.null;
    expect(querySelector('#id2')).to.be.not.null;
    expect(querySelector('#id3')).to.be.not.null;
    expect(querySelector('#id4')).to.be.null;
    expect(querySelector('paper-input')).to.have.property('value', '2');

    await goNext();

    expect(querySelector('#id3')).to.be.null;
    expect(querySelector('#id4')).to.be.not.null;
    expect(querySelector('paper-input')).to.have.property('value', '3');
  });

  it('reacts to limit change', () => {
    // 2-4 should be in another page, initially.
    expect(querySelector('#id2')).to.be.null;

    view._limit = 4;
    expect(querySelector('#id2')).to.be.not.null;
    expect(querySelector('#id3')).to.be.not.null;
    expect(querySelector('#id4')).to.be.null;
  });

  it('reacts to category update', async () => {
    view.category = Object.assign(
      {},
      view.category,
      {items: view.category.items.slice().reverse()},
    );
    await flushAllP();
    expect(querySelector('#id4')).to.be.not.null;
    expect(querySelector('#id3')).to.be.not.null;
  });

  it('reacts to items update', async () => {
    // Mutate the property of category in Polymeric way.
    view.set('category.items', view.category.items.slice().reverse());
    await flushAllP();
    expect(querySelector('#id4')).to.be.not.null;
    expect(querySelector('#id3')).to.be.not.null;
  });

  it('handles shrinking the number of pages', async () => {
    view.category = createCategory(1);
    await flushAllP();

    expect(querySelector('#id0')).to.be.not.null;
    expect(querySelector('#id1')).to.be.null;
    expect(_getPageCount()).to.equal(1);
  });

  it('handles growing the number of pages', async () => {
    expect(_getPageCount()).to.equal(3);

    view.category = createCategory(10);

    await flushAllP();
    expect(_getPageCount()).to.equal(5);
  });

  function _getPageCount(): number {
    return view.$.view._pageCount;
  }

});

}  // namespace tf_paginated_view
