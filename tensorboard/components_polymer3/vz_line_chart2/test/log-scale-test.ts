/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
namespace vz_line_chart2 {
  const {expect} = chai;

  describe('LogScale', () => {
    beforeEach(function() {
      this.scale = new LogScale();
      this.scale.range([0, 1]);
      this.scale.setValueProviderForDomain(() => [1, 1000]);
    });

    describe('manual domain', () => {
      beforeEach(function() {
        this.scale.domain([1, 1000]);
      });

      it('returns scales input correctly to an output between 0-1', function() {
        expect(this.scale.scale(1)).to.equal(0);
        expect(this.scale.scale(1000)).to.equal(1);
      });

      it(
        'returns value outside of range when given input smaller/larger ' +
          'than the domain',
        function() {
          expect(this.scale.scale(1e-3)).to.equal(-1);
          expect(this.scale.scale(1e6)).to.equal(2);
          expect(this.scale.scale(1e9)).to.equal(3);
        }
      );

      it('returns NaN for non-positive values', function() {
        expect(this.scale.scale(0)).to.be.NaN;
        expect(this.scale.scale(-1)).to.be.NaN;
        expect(this.scale.scale(-0.00001)).to.be.NaN;
        expect(this.scale.scale(-Infinity)).to.be.NaN;
        expect(this.scale.scale(NaN)).to.be.NaN;
      });

      it('ignores padProportion', function() {
        this.scale.padProportion(0.3);
        expect(this.scale.scale(1)).to.equal(0);
        expect(this.scale.scale(1000)).to.equal(1);

        this.scale.padProportion(1);
        expect(this.scale.scale(1)).to.equal(0);
        expect(this.scale.scale(1000)).to.equal(1);
      });
    });

    describe('auto domain', () => {
      beforeEach(function() {
        this.scale.autoDomain();
      });

      describe('padding-less', () => {
        beforeEach(function() {
          this.scale.padProportion(0);
        });

        it('returns scales input correctly to an output between 0-1', function() {
          expect(this.scale.scale(1)).to.equal(0);
          expect(this.scale.scale(1000)).to.equal(1);
        });

        it(
          'returns value outside of range when given input smaller/larger ' +
            'than the domain',
          function() {
            expect(this.scale.scale(1e-3)).to.equal(-1);
            expect(this.scale.scale(1e6)).to.equal(2);
            expect(this.scale.scale(1e9)).to.equal(3);
          }
        );

        it('returns NaN for non-positive values', function() {
          expect(this.scale.scale(0)).to.be.NaN;
          expect(this.scale.scale(-1)).to.be.NaN;
          expect(this.scale.scale(-0.00001)).to.be.NaN;
          expect(this.scale.scale(-Infinity)).to.be.NaN;
          expect(this.scale.scale(NaN)).to.be.NaN;
        });
      });

      describe('padding-full', () => {
        beforeEach(function() {
          // Spread is 3 = log_10(1000) - log_10(1) and since we want 33% of the
          // spread to be the padding, pad = 3 * .33333 ~ 1, the domain should be
          // from ~0.1 to ~1e4
          this.scale.padProportion(0.33333);
        });

        it('pads domain', function() {
          expect(this.scale.invert(0)).to.be.closeTo(0.1, 0.01);
          expect(this.scale.invert(1)).to.be.closeTo(1e4, 10);
        });

        it('puts some padding even if there is no spread', function() {
          this.scale.setValueProviderForDomain(() => [1, 1]);
          this.scale.autoDomain();
          expect(this.scale.invert(0)).to.equal(0.1);
          expect(this.scale.invert(1)).to.equal(10);

          this.scale.setValueProviderForDomain(() => [1000, 1000]);
          this.scale.autoDomain();
          expect(this.scale.invert(0)).to.equal(100);
          expect(this.scale.invert(1)).to.equal(10000);

          this.scale.setValueProviderForDomain(() => [0.01, 0.01]);
          this.scale.autoDomain();
          expect(this.scale.invert(0)).to.equal(0.001);
          expect(this.scale.invert(1)).to.equal(0.1);

          this.scale.setValueProviderForDomain(() => [
            MIN_POSITIVE_VALUE,
            MIN_POSITIVE_VALUE,
          ]);
          this.scale.autoDomain();
          expect(this.scale.invert(0)).to.be.equal(5e-324);
          expect(this.scale.invert(1)).to.be.equal(5e-323);
        });

        it('puts padding even if values are very even number', function() {
          // domain of [1, 1000] result in very clean mapping between domain and
          // the range -- i.e., 1 -> 0 and 1000 to 1. If naively use ceil or floor
          // to compute a "nice domain" for [1, 1000], it can lead to no padding
          // causing some visual issue. Make sure there are padding present even
          // with these very even number.
          expect(this.scale.invert(0))
            .to.be.closeTo(0.1, 0.01)
            .and.not.equal(1);
          expect(this.scale.invert(1))
            .to.be.closeTo(1e4, 10)
            .and.not.equal(1000);
        });
      });
    });
  });
} // namespace vz_line_chart2
