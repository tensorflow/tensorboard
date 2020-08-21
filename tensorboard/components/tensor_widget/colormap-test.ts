/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

/** Unit tests for colormaps. */

import {expect} from 'chai';

import {GrayscaleColorMap, JetColorMap} from './colormap';

describe('GrayscaleColorMap', () => {
  it('max < min causes constructor error', () => {
    const min = 3;
    const max = 2;
    expect(() => new GrayscaleColorMap({min, max})).to.throw(/max.*<.*min/);
  });

  it('NaN or Infinity min or max causes constructor error', () => {
    expect(() => new GrayscaleColorMap({min: 0, max: Infinity})).to.throw(
      /max.*not finite/
    );
    expect(() => new GrayscaleColorMap({min: 0, max: -Infinity})).to.throw(
      /max.*not finite/
    );
    expect(() => new GrayscaleColorMap({min: 0, max: NaN})).to.throw(
      /max.*not finite/
    );
    expect(() => new GrayscaleColorMap({min: Infinity, max: 0})).to.throw(
      /min.*not finite/
    );
    expect(() => new GrayscaleColorMap({min: -Infinity, max: 0})).to.throw(
      /min.*not finite/
    );
    expect(() => new GrayscaleColorMap({min: NaN, max: 0})).to.throw(
      /min.*not finite/
    );
  });

  it('max > min, finite values', () => {
    const min = 0;
    const max = 10;
    const colormap = new GrayscaleColorMap({min, max});
    expect(colormap.getRGB(0)).to.eql([0, 0, 0]);
    expect(colormap.getRGB(5)).to.eql([127.5, 127.5, 127.5]);
    expect(colormap.getRGB(10)).to.eql([255, 255, 255]);
    // Over-limits.
    expect(colormap.getRGB(-100)).to.eql([0, 0, 0]);
    expect(colormap.getRGB(500)).to.eql([255, 255, 255]);
  });

  it('max > min, non-finite values', () => {
    const min = 0;
    const max = 10;
    const colormap = new GrayscaleColorMap({min, max});
    expect(colormap.getRGB(NaN)).to.eql([255, 0, 0]);
    expect(colormap.getRGB(-Infinity)).to.eql([255, 255 / 2, 0]);
    expect(colormap.getRGB(Infinity)).to.eql([0, 0, 255]);
  });

  it('max === min, non-finite values', () => {
    const min = -3.2;
    const max = -3.2;
    const colormap = new GrayscaleColorMap({min, max});
    expect(colormap.getRGB(-32)).to.eql([127.5, 127.5, 127.5]);
    expect(colormap.getRGB(-3.2)).to.eql([127.5, 127.5, 127.5]);
    expect(colormap.getRGB(0)).to.eql([127.5, 127.5, 127.5]);
    expect(colormap.getRGB(32)).to.eql([127.5, 127.5, 127.5]);
    expect(colormap.getRGB(NaN)).to.eql([255, 0, 0]);
    expect(colormap.getRGB(-Infinity)).to.eql([255, 255 / 2, 0]);
    expect(colormap.getRGB(Infinity)).to.eql([0, 0, 255]);
  });
});

describe('JetColormap', () => {
  it('max < min causes constructor error', () => {
    const min = 3;
    const max = 2;
    expect(() => new JetColorMap({min, max})).to.throw(/max.*<.*min/);
  });

  it('NaN or Infinity min or max causes constructor error', () => {
    expect(() => new JetColorMap({min: 0, max: Infinity})).to.throw(
      /max.*not finite/
    );
    expect(() => new JetColorMap({min: 0, max: -Infinity})).to.throw(
      /max.*not finite/
    );
    expect(() => new JetColorMap({min: 0, max: NaN})).to.throw(
      /max.*not finite/
    );
    expect(() => new JetColorMap({min: Infinity, max: 0})).to.throw(
      /min.*not finite/
    );
    expect(() => new JetColorMap({min: -Infinity, max: 0})).to.throw(
      /min.*not finite/
    );
    expect(() => new JetColorMap({min: NaN, max: 0})).to.throw(
      /min.*not finite/
    );
  });

  it('max > min, finite values', () => {
    const min = 0;
    const max = 10;
    const colormap = new JetColorMap({min, max});
    expect(colormap.getRGB(0)).to.eql([0, 0, 255]);
    expect(colormap.getRGB(5)).to.eql([127.5, 255, 127.5]);
    expect(colormap.getRGB(10)).to.eql([255, 0, 0]);
    // Over-limits.
    expect(colormap.getRGB(-100)).to.eql([0, 0, 255]);
    expect(colormap.getRGB(500)).to.eql([255, 0, 0]);
  });

  it('max > min, non-finite values', () => {
    const min = 0;
    const max = 10;
    const colormap = new JetColorMap({min, max});
    expect(colormap.getRGB(NaN)).to.eql([255 * 0.25, 255 * 0.25, 255 * 0.25]);
    expect(colormap.getRGB(-Infinity)).to.eql([
      255 * 0.5,
      255 * 0.5,
      255 * 0.5,
    ]);
    expect(colormap.getRGB(Infinity)).to.eql([
      255 * 0.75,
      255 * 0.75,
      255 * 0.75,
    ]);
  });
});
