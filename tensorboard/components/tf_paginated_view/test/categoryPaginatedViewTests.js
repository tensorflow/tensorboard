var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var tf_paginated_view;
(function (tf_paginated_view) {
    const { expect } = chai;
    function createCategory(numItems) {
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
    function flushP() {
        return new Promise((resolve) => window.flush(resolve));
    }
    function flushAnimationFrameP() {
        return new Promise((resolve) => window.animationFrameFlush(resolve));
    }
    function flushAllP() {
        return Promise.all([flushP(), flushAnimationFrameP()]);
    }
    describe('tf-paginated-view tests', () => {
        let view;
        /**
         * Returns stamped template item.
         */
        function getItem(id) {
            return view.$.view.querySelector(`#${id}`);
        }
        /**
         * Returns element inside shadowRoot of tf-category-paginated-view.
         */
        function querySelector(cssSelector) {
            return view.$.view.root.querySelector(cssSelector);
        }
        function goNext() {
            return __awaiter(this, void 0, void 0, function* () {
                querySelector('.big-page-buttons paper-button:last-of-type').click();
                yield flushAllP();
            });
        }
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            view = fixture('paginatedViewFixture');
            view._limit = 2;
            view.category = createCategory(5);
            view.randomNumber = 42;
            // allow dom-if to be flushed.
            yield flushAllP();
        }));
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
        it('navigates to next page when clicked on a button', () => __awaiter(this, void 0, void 0, function* () {
            // Sanity check
            expect(getItem('id2')).to.be.null;
            expect(getItem('id4')).to.be.null;
            expect(querySelector('paper-input')).to.have.property('value', '1');
            yield goNext();
            expect(getItem('id1')).to.be.null;
            expect(getItem('id2')).to.be.not.null;
            expect(getItem('id3')).to.be.not.null;
            expect(getItem('id4')).to.be.null;
            expect(querySelector('paper-input')).to.have.property('value', '2');
            yield goNext();
            expect(getItem('id3')).to.be.null;
            expect(getItem('id4')).to.be.not.null;
            expect(querySelector('paper-input')).to.have.property('value', '3');
        }));
        it('reacts to limit change', () => {
            // 2-4 should be in another page, initially.
            expect(getItem('id2')).to.be.null;
            view._limit = 4;
            expect(getItem('id2')).to.be.not.null;
            expect(getItem('id3')).to.be.not.null;
            expect(getItem('id4')).to.be.null;
        });
        it('reacts to category update', () => __awaiter(this, void 0, void 0, function* () {
            view.category = Object.assign({}, view.category, {
                items: view.category.items.slice().reverse(),
            });
            yield flushAllP();
            expect(getItem('id4')).to.be.not.null;
            expect(getItem('id3')).to.be.not.null;
        }));
        it('reacts to items update', () => __awaiter(this, void 0, void 0, function* () {
            // Mutate the property of category in Polymeric way.
            view.set('category.items', view.category.items.slice().reverse());
            yield flushAllP();
            expect(getItem('id4')).to.be.not.null;
            expect(getItem('id3')).to.be.not.null;
        }));
        it('handles shrinking the number of pages', () => __awaiter(this, void 0, void 0, function* () {
            view.category = createCategory(1);
            yield flushAllP();
            expect(getItem('id0')).to.be.not.null;
            expect(getItem('id1')).to.be.null;
            expect(_getPageCount()).to.equal(1);
        }));
        it('handles growing the number of pages', () => __awaiter(this, void 0, void 0, function* () {
            expect(_getPageCount()).to.equal(3);
            view.category = createCategory(10);
            yield flushAllP();
            expect(_getPageCount()).to.equal(5);
        }));
        function _getPageCount() {
            return view.$.view._pageCount;
        }
    });
})(tf_paginated_view || (tf_paginated_view = {})); // namespace tf_paginated_view
