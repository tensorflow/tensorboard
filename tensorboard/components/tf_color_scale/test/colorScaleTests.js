/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
var tf_color_scale;
(function (tf_color_scale) {
    var assert = chai.assert;
    describe('ColorScale', function () {
        var ccs;
        beforeEach(function () {
            ccs = new tf_color_scale.ColorScale();
        });
        it('Returns consistent colors', function () {
            ccs.setDomain(['train', 'eval', 'test']);
            var trainColor = ccs.getColor('train');
            var trainColor2 = ccs.getColor('train');
            assert.equal(trainColor, trainColor2);
        });
        it('Returns consistent colors after new domain', function () {
            ccs.setDomain(['train', 'eval']);
            var trainColor = ccs.getColor('train');
            ccs.setDomain(['train', 'eval', 'test']);
            var trainColor2 = ccs.getColor('train');
            assert.equal(trainColor, trainColor2);
        });
        it('Throws an error if string is not in the domain', function () {
            ccs.setDomain(['red', 'yellow', 'green']);
            assert.throws(function () {
                ccs.getColor('not in domain');
            }, 'String was not in the domain.');
        });
    });
})(tf_color_scale || (tf_color_scale = {})); // namespace tf_color_scale
