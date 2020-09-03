/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
namespace tf_wbr_string {
  const {expect} = chai;
  declare function fixture(id: string): void;
  declare function flush(callback: Function): void;

  window.HTMLImports.whenReady(() => {
    describe('tf-wbr-string', () => {
      it('adds wbrs for patterns with a single character', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = 'I/have/a/delimiter';
        testElement.delimiterPattern = '/';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string(
            'I/<wbr>have/<wbr>a/<wbr>delimiter<wbr>'
          );
          expect(testElement.shadowRoot.textContent.trim()).to.equal(
            'I/have/a/delimiter'
          );
          done();
        });
      });

      it('adds wbrs for patterns with multiple single characters', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = 'I_have-multiple_delimiter.s';
        testElement.delimiterPattern = '[_.\\-]';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string(
            'I_<wbr>have-<wbr>multiple_<wbr>delimiter.<wbr>s<wbr>'
          );
          done();
        });
      });

      it('adds wbrs for more complex patterns', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = 'thea_heats_tea';
        testElement.delimiterPattern = 'the|eat';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string(
            'the<wbr>a_heat<wbr>s_tea<wbr>'
          );
          done();
        });
      });

      it('ignores overlapped matches', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = 'the_theatre_heats_tea';
        testElement.delimiterPattern = 'the|eat';
        flush(() => {
          // The "eat" in "theatre" is ignored.
          expect(testElement.shadowRoot.innerHTML).to.have.string(
            'the<wbr>_the<wbr>atre_heat<wbr>s_tea<wbr>'
          );
          done();
        });
      });

      it('allows empty matches to consume remainder of the string', (done) => {
        // The current handling of empty matches may not desirable but we warn
        // against this in the documentation. We could consider improving this
        // in the future.
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = 'the_theatre_heats_tea';
        testElement.delimiterPattern = '(the|eat)?';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string(
            'the<wbr>_theatre_heats_tea<wbr>'
          );
          done();
        });
      });

      it('adds single wbr for empty value', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = '';
        testElement.delimiterPattern = '/';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string('<wbr>');
          expect(testElement.shadowRoot.textContent.trim()).to.equal('');
          done();
        });
      });

      it('adds single wbr for undefined value', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = null;
        testElement.delimiterPattern = '/';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string('<wbr>');
          expect(testElement.shadowRoot.textContent.trim()).to.equal('');
          done();
        });
      });

      it('adds single wbr for empty pattern', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = 'Empty delimiter pattern';
        testElement.delimiterPattern = '';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string(
            'Empty delimiter pattern<wbr>'
          );
          done();
        });
      });

      it('adds single wbr for undefined pattern', (done) => {
        let testElement: any = fixture('tf-wbr-string');
        testElement.value = 'undefined pattern';
        flush(() => {
          expect(testElement.shadowRoot.innerHTML).to.have.string(
            'undefined pattern<wbr>'
          );
          done();
        });
      });
    });
  });
} // namespace tf_wbr_string
