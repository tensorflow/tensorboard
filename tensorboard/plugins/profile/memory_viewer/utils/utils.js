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
var memory_viewer;
(function (memory_viewer) {
    /**
     * Converts from number of bytes to MiB.
     */
    function bytesToMiB(numBytes) {
        return numBytes / 1048576;
    }
    memory_viewer.bytesToMiB = bytesToMiB;
    /**
     * Returns the number of bytes of the primitive type.
     */
    function byteSizeOfPrimitiveType(type) {
        switch (type) {
            case 'PRED':
                return 1;
            case 'S8':
                return 1;
            case 'S16':
                return 2;
            case 'S32':
                return 4;
            case 'S64':
                return 8;
            case 'U8':
                return 1;
            case 'U16':
                return 2;
            case 'U32':
                return 4;
            case 'U64':
                return 8;
            case 'BF16':
                return 2;
            case 'F16':
                return 2;
            case 'F32':
                return 4;
            case 'F64':
                return 8;
            case 'C64':
                return 8;
            case 'TOKEN':
                return 0;
            default:
                console.error('Unhandled primitive type ' + type);
                return 0;
        }
    }
    memory_viewer.byteSizeOfPrimitiveType = byteSizeOfPrimitiveType;
    /**
     * Returns a rgba string.
     * @return An RGBA color.
     */
    function rgba(red, green, blue, alpha) {
        return 'rgba(' + Math.round(red * 255) + ',' + Math.round(green * 255) + ',' +
            Math.round(blue * 255) + ',' + alpha + ')';
    }
    /**
     * Computes a flame color.
     * @param curve mapping [0-1] to [0-1]
     * @return An RGBA color.
     */
    function flameColor(fraction, brightness, opacity, curve) {
        if (brightness === void 0) {
            brightness = 1;
        }
        if (opacity === void 0) {
            opacity = 1;
        }
        if (curve === void 0) {
            curve = function (x) { return 1 - Math.sqrt(1 - x); };
        }
        if (isNaN(fraction)) {
            return rgba(brightness, brightness, brightness, opacity);
        }
        fraction = curve(fraction);
        // Or everything is depressing and red.
        return fraction < .5 ?
            rgba(brightness, 2 * fraction * brightness, 0, opacity) :
            rgba(2 * (1 - fraction) * brightness, brightness, 0, opacity);
    }
    memory_viewer.flameColor = flameColor;
    /**
     * Returns a percentage string.
     */
    function percent(fraction) {
        if (isNaN(fraction)) {
            return '-';
        }
        return fraction >= .995 ?
            '100%' :
            fraction < 1E-5 ? '0.00%' : (fraction * 100).toPrecision(2) + '%';
    }
    memory_viewer.percent = percent;
})(memory_viewer || (memory_viewer = {})); // namespace memory_viewer
