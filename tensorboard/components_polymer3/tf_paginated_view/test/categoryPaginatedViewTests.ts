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
    id: String;
    content: String;
  };
  type ItemCategory = tf_categorization_utils.Category<Item>;

  function createCategory(numItems: Number): ItemCategory {
    const items = Array.from(Array(numItems)).map((_, i) => ({
      id: `id${i}`,
      content: `content_${i}`,
    }));

    return {
      name: 'Category1',
      metadata: {
        type: tf_categorization_utils.CategoryType.PREFIX_GROUP,
      },
      items,
    };
  }
  function flushP(): Promise<void> {
    return new Promise((resolve) => window.flush(resolve));
  }
  function flushAnimationFrameP(): Promise<void> {
    return new Promise((resolve) => window.animationFrameFlush(resolve));
  }
  function flushAllP(): Promise<[void, void]> {
    return Promise.all([flushP(), flushAnimationFrameP()]);
  }
  describe('tf-paginated-view tests', () => {
    let view: any;

    /**
     * Returns stamped template item.
     */
    function getItem(id: string): HTMLElement {
      return view.$.view.querySelector(`#${id}`);
    }
    /**
     * Returns element inside shadowRoot of tf-category-paginated-view.
     */
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
      expect(getItem('id0')).to.be.not.null;
      expect(getItem('id1')).to.be.not.null;

      // 2-4 should be in another page.
      expect(getItem('id2')).to.be.null;
    });

    it('responds to ancestor prop change that is bound on template', () => {
      expect(getItem('id0').getAttribute('number')).to.equal('42');

      view.randomNumber = 7;
      expect(getItem('id0').getAttribute('number')).to.equal('7');
    });

    it('navigates to next page when clicked on a button', async () => {
      // Sanity check
      expect(getItem('id2')).to.be.null;
      expect(getItem('id4')).to.be.null;
      expect(querySelector('paper-input')).to.have.property('value', '1');

      await goNext();

      expect(getItem('id1')).to.be.null;
      expect(getItem('id2')).to.be.not.null;
      expect(getItem('id3')).to.be.not.null;
      expect(getItem('id4')).to.be.null;
      expect(querySelector('paper-input')).to.have.property('value', '2');

      await goNext();

      expect(getItem('id3')).to.be.null;
      expect(getItem('id4')).to.be.not.null;
      expect(querySelector('paper-input')).to.have.property('value', '3');
    });

    it('reacts to limit change', () => {
      // 2-4 should be in another page, initially.
      expect(getItem('id2')).to.be.null;

      view._limit = 4;
      expect(getItem('id2')).to.be.not.null;
      expect(getItem('id3')).to.be.not.null;
      expect(getItem('id4')).to.be.null;
    });

    it('reacts to category update', async () => {
      view.category = Object.assign({}, view.category, {
        items: view.category.items.slice().reverse(),
      });
      await flushAllP();
      expect(getItem('id4')).to.be.not.null;
      expect(getItem('id3')).to.be.not.null;
    });

    it('reacts to items update', async () => {
      // Mutate the property of category in Polymeric way.
      view.set('category.items', view.category.items.slice().reverse());
      await flushAllP();
      expect(getItem('id4')).to.be.not.null;
      expect(getItem('id3')).to.be.not.null;
    });

    it('handles shrinking the number of pages', async () => {
      view.category = createCategory(1);
      await flushAllP();

      expect(getItem('id0')).to.be.not.null;
      expect(getItem('id1')).to.be.null;
      expect(_getPageCount()).to.equal(1);
    });

    it('handles growing the number of pages', async () => {
      expect(_getPageCount()).to.equal(3);

      view.category = createCategory(10);

      await flushAllP();
      expect(_getPageCount()).to.equal(5);
    });

    it('sets all items to active=true when opened is true', () => {
      expect(getItem('id0').hasAttribute('active')).to.be.true;
      expect(getItem('id1').hasAttribute('active')).to.be.true;
    });

    it('sets all items to active=false when opened is false', async () => {
      querySelector('button').click();
      await flushAllP();

      expect(getItem('id0').hasAttribute('active')).to.be.false;
      expect(getItem('id1').hasAttribute('active')).to.be.false;
    });

    it('sets item to inactive when it is out of view', async () => {
      // The DOM will be removed from document but it will be updated. Hold
      // references to them here.
      const item0 = getItem('id0');
      const item1 = getItem('id1');

      await goNext();

      expect(item0.hasAttribute('active')).to.be.false;
      expect(item1.hasAttribute('active')).to.be.false;
      expect(getItem('id2').hasAttribute('active')).to.be.true;
      expect(getItem('id3').hasAttribute('active')).to.be.true;
    });

    function _getPageCount(): number {
      return view.$.view._pageCount;
    }
  });
} // namespace tf_paginated_view
