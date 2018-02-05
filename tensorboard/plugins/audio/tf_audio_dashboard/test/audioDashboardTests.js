/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var tf_audio_dashboard;
(function (tf_audio_dashboard) {
    describe('audio dashboard tests', function () {
        var audioDash;
        var reloadCount = 0;
        beforeEach(function () {
            audioDash = fixture('testElementFixture');
            var router = tf_backend.createRouter('/data', true);
            tf_backend.setRouter(router);
            stub('tf-audio-loader', {
                reload: function () { reloadCount++; },
            });
        });
        it('calling reload on dashboard reloads the audio-loaders', function (done) {
            audioDash.backendReload().then(function () {
                reloadCount = 0;
                var loaders = [].slice.call(audioDash.getElementsByTagName('tf-audio-loader'));
                audioDash.frontendReload();
                setTimeout(function () {
                    chai.assert.isTrue(reloadCount >= 2);
                    done();
                });
            });
        });
    });
})(tf_audio_dashboard || (tf_audio_dashboard = {})); // namespace tf_audio_dashboard
