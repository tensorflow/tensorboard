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

function createItems(num: Number): Item[] {
  return Array.from(Array(num))
      .map((_, i) => ({id: `id${i}`, content: `content_${i}`}));
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

  async function goNext() {
    view.querySelector('.big-page-buttons paper-button:last-of-type').click();
    await flushAllP();
  }

  beforeEach(async () => {
    view = fixture('paginatedViewFixture');
    view._limit = 2;
    view.getItemKey = ({id}) => id;
    view.items = createItems(5);
    view.randomNumber = 42;

    // allow dom-if to be flushed.
    await flushAllP();
  });

  it('renders a page', () => {
    expect(view.querySelector('#id0')).to.be.not.null;
    expect(view.querySelector('#id1')).to.be.not.null;

    // 2-4 should be in another page.
    expect(view.querySelector('#id2')).to.be.null;
  });

  it('responds to ancestor prop change that is bound on template', () => {
    expect(view.querySelector('#id0').getAttribute('number')).to.equal('42');

    view.randomNumber = 7;
    expect(view.querySelector('#id0').getAttribute('number')).to.equal('7');
  });

  it('navigates to next page when clicked on a button', async () => {
    // Sanity check
    expect(view.querySelector('#id2')).to.be.null;
    expect(view.querySelector('#id4')).to.be.null;
    expect(view.querySelector('paper-input')).to.have.property('value', '1');

    await goNext();

    expect(view.querySelector('#id1')).to.be.null;
    expect(view.querySelector('#id2')).to.be.not.null;
    expect(view.querySelector('#id3')).to.be.not.null;
    expect(view.querySelector('#id4')).to.be.null;
    expect(view.querySelector('paper-input')).to.have.property('value', '2');

    await goNext();

    expect(view.querySelector('#id3')).to.be.null;
    expect(view.querySelector('#id4')).to.be.not.null;
    expect(view.querySelector('paper-input')).to.have.property('value', '3');
  });

  it('reacts to limit change', () => {
    // 2-4 should be in another page, initially.
    expect(view.querySelector('#id2')).to.be.null;

    view._limit = 4;
    expect(view.querySelector('#id2')).to.be.not.null;
    expect(view.querySelector('#id3')).to.be.not.null;
    expect(view.querySelector('#id4')).to.be.null;
  });

  it('reacts to items update', () => {
    view.items = view.items.slice().reverse();
    expect(view.querySelector('#id4')).to.be.not.null;
    expect(view.querySelector('#id3')).to.be.not.null;
  });

  it('handles shrinking the number of pages', async () => {
    view.items = createItems(1);
    await flushAllP();

    expect(view.querySelector('#id0')).to.be.not.null;
    expect(view.querySelector('#id1')).to.be.null;
    expect(_getPageCount()).to.equal(1);
  });

  it('handles growing the number of pages', async () => {
    expect(_getPageCount()).to.equal(3);

    view.items = createItems(10);

    await flushAllP();
    expect(_getPageCount()).to.equal(5);
  });

  function _getPageCount(): number {
    // str = `Page <some gibbersh from paper-input> of [pageCount]`
    const str = view.querySelector('#controls-container').innerText.trim();
    return parseInt(str.match(/\d+$/)[0], 10);
  }

});

}  // namespace tf_paginated_view
