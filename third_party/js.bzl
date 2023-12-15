# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
TensorBoard external JS dependencies (both infrastructure and frontend libs)
"""

load("@io_bazel_rules_closure//closure:defs.bzl", "filegroup_external")

def tensorboard_js_workspace():
    """TensorBoard JavaScript dependencies."""

    filegroup_external(
        name = "com_google_javascript_closure_compiler_externs",
        licenses = ["notice"],
        sha256_urls_extract = {
            "4f0cc3cf9928905993072bdd1f81a4444bd8b7fff0a12f119e2dd2a9a68cdd82": [
                # tag v20190513 resolves to commit 938e347e4f79f4d7b124e160145b6ea3418b4c56 (2019-05-13 16:28:32 -0700)
                "http://mirror.tensorflow.org/github.com/google/closure-compiler/archive/v20190513.tar.gz",
                "https://github.com/google/closure-compiler/archive/v20190513.tar.gz",
            ],
        },
        strip_prefix = {"v20190513.tar.gz": "closure-compiler-20190513/externs"},
    )

    filegroup_external(
        name = "com_google_material_design_icon",
        licenses = ["notice"],
        sha256_urls = {
            "fa4ad2661739c9ecefa121c41f5c95de878d4990ee86413124585a3af7d7dffb": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/content/svg/production/ic_content_copy_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/content/svg/production/ic_content_copy_24px.svg",
            ],
            "962aee2433f026ed7843790f6757dc3c25c34f349feb9b4fe816629b1b22442d": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_help_outline_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_help_outline_24px.svg",
            ],
            "f3d6e717a2d6fa6caec61221fb4b838663abbd1a58933dd7d2824b408932d3fe": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_info_outline_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_info_outline_24px.svg",
            ],
            "b4d30acd39de79f490eff59d72fb1f06502c117c8815359d539e4f20515494de": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_refresh_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_refresh_24px.svg",
            ],
            "d0872fb94037822164c8cea43a2ebeafdd1b664ff0fdc9387f0e1e1a7ee74628": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_settings_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_settings_24px.svg",
            ],
            "6105c83ef3637bbb1f1f8ceceacb51df818e867238ee6c49e0a8d1ca7f858b72": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_search_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_search_24px.svg",
            ],
            "4ab47484995ab72bd8b7175bd36273d3e8787cf3e1e28a4f695fee07e8d0884d": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/alert/svg/production/ic_error_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/alert/svg/production/ic_error_24px.svg",
            ],
            "ad918f7ec0ff89298e84586b5b98cdf628c8457cd067dc592031fae783f71a1d": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_chevron_left_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/navigation/svg/production/ic_chevron_left_24px.svg",
            ],
            "83f0da9735a4e475b0eca23b708ba09b2b7411e7d711b2d6be24bc2371d67ec8": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_chevron_right_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/navigation/svg/production/ic_chevron_right_24px.svg",
            ],
            "b1e7ec6fcc3a0aeefe585abd0860e60dabd39b884be8b52cd886acb3e0635ec3": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_visibility_off_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/action/svg/production/ic_visibility_off_24px.svg",
            ],
            "cbb30ec622923b6e0442d67277e30eaa1ba429223b132fde3289d125f2c62c88": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/content/svg/production/ic_flag_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/content/svg/production/ic_flag_24px.svg",
            ],
            "6d4ccf520d400755057a1739a66c0feda3c98bbc34e8e7f79afa630b2e43f87e": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/content/svg/production/ic_clear_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/content/svg/production/ic_clear_24px.svg",
            ],
            "f83d9a4e6a9af95c9321a34f2564e9d45483834fa17f5da5a3a403500636360a": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_expand_more_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/navigation/svg/production/ic_expand_more_24px.svg",
            ],
            "e52d4acf9d020f85e9fc674479d3ed60ccdd1aa1e6ef3b75f8cd75f1c2284030": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_expand_less_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/navigation/svg/production/ic_expand_less_24px.svg",
            ],
            "0ea7671d0b99f8245208eda58e3bc3c633f715bc8ceb9fb2cf60ea5eeda9bda9": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_cancel_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/navigation/svg/production/ic_cancel_24px.svg",
            ],
            "dd8deb85c82313c5aeb4936857fd99cb38a617507fb65afddf289941b99ae9f2": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_arrow_downward_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_arrow_downward_24px.svg",
            ],
            "76d31a5591d1044d0461ee6dc482580e9797101dc96a47bbd53cef9930777f85": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_arrow_upward_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/navigation/svg/production/ic_arrow_upward_24px.svg",
            ],
            "b887b20de9d7850bac7629bbc72519f5f76c1ae988c692f1970e70cec7498456": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_get_app_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/224895a86501195e7a7ff3dde18e39f00b8e3d5a/action/svg/production/ic_get_app_24px.svg",
            ],
            "93e72d0395250e7a75c702dc0df010e6756dded05ffcebe72bb9715788518a8f": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialicons/24px.svg",
            ],
            "eca3a04cd5362207d925dfb9a1633e133bf4612abaa2060b840c9ebc868b958a": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialiconsoutlined/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialiconsoutlined/24px.svg",
            ],
            "e86bae3711b455b57ae55b588fab87e8975f04e8ac3c1451632236eb37da8f3b": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_group_work_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_group_work_24px.svg",
            ],
            "925221f8db5bc0358834bbd61bcd082624374e3da86bc64d04db21106fe72458": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/bug_report/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/bug_report/materialicons/24px.svg",
            ],
            "b54342456d5a7f2da53795147f8af36ec76fbf5b57d792fe75f07538e6c6783e": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/close/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/close/materialicons/24px.svg",
            ],
            "f934b1a5a54e89d82cbbb334e1c7dc28d69fc779c1bec59889facd5de899e8ac": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/filter_alt/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/filter_alt/materialicons/24px.svg",
            ],
            "3e6e96299b5cb5ea6faec369d1db09313dc957ec28f56a25cbe1bbd5ac55e820": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen/materialicons/24px.svg",
            ],
            "20f6c4f110effafe35778bba8ce3789b0c6a9c02b5a0f6bcf18c192a94e80a1d": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen_exit/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen_exit/materialicons/24px.svg",
            ],
            "d147e90c69c346cd82fb45f519d9cb45dd8d61ab4f5bba8156c36545d9abc62f": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/image/image_search/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/image/image_search/materialicons/24px.svg",
            ],
            "ccae3a4f752212fa288aa0035d49bc2c1d5daca78931f3065fb1e0be98d82493": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/line_weight/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/line_weight/materialicons/24px.svg",
            ],
            "4f59e208f5babcf58c07505356ca1f109a9e1972e839b991dff19f709a28eeba": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/more_vert/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/more_vert/materialicons/24px.svg",
            ],
            "a558348444b0f80697a8f343767408288ab10be989550b651404641c717c7c0f": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_backup_restore/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_backup_restore/materialicons/24px.svg",
            ],
            "608da1f1bba357551f222bb44512de328da8394b3c910724415b3156ebb08ca3": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_overscan/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_overscan/materialicons/24px.svg",
            ],
            "a9706960208156a1de89bbfca8abeffa8771ba9332fcb9605e277bfd8b4eb3b8": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/alert/warning/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/alert/warning/materialicons/24px.svg",
            ],
            "c1f1e1f555e04b9444d6af02d8db242c4dc3d0bb34467f11a6b7c538dfd2f584": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/social/notifications_none/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/social/notifications_none/materialicons/24px.svg",
            ],
            "2301568113724db8d9e6c1cdf649d16af34da24e223a1f6a295d867a2b2037c9": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/edit/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/edit/materialicons/24px.svg",
            ],
            "db745aaa866a71056c8010d1bd9619612167f21a5ca24e691e36180283bc264b": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.2/image/svg/production/ic_palette_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.2/image/svg/production/ic_palette_24px.svg",
            ],
            "f1f1a9f32a0488db0541fc9a8b9475ea9739335aa022d69799f9f42859042761": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.2/action/svg/production/ic_done_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.2/action/svg/production/ic_done_24px.svg",
            ],
            "e5b6e1325dbe463ef88be878359ae54d2d310e6c56ec18ad9eaa56b8b734dd2c": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/light_mode/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/light_mode/materialicons/24px.svg",
            ],
            "bab57d17c49495547dfbc2ad4f24dbc51d9f49bfb27cb48bdf430c0ee5a9e2d7": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/dark_mode/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/dark_mode/materialicons/24px.svg",
            ],
            "eaa6d8593ee163458a4adcfe9a95da4f48e553d9af89dc18136cfba706cbc3ec": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/brightness_6/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/brightness_6/materialicons/24px.svg",
            ],
            "5737806d54eae03d5cc02f2dbf7753ecb800fb8fba6ce93e5b1d1c3a9ed5b87b": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/drag_indicator/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/drag_indicator/materialicons/24px.svg",
            ],
            "93a10e36c7550ecd220d36c33ad822f2d31e520ee9fba0c9cb6c1eb44042e9f0": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_change_history_24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/3.0.1/action/svg/production/ic_change_history_24px.svg",
            ],
            "475c29758b4a689598f80099714362c0340ad3a4bc111e2d88807bbf4b0f817e": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/add/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/add/materialicons/24px.svg",
            ],
            "e1590e051f577d02ec994e7cc6005a2bc96407a3d1ba2d7ce6825fb80402684c": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_back/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_back/materialicons/24px.svg",
            ],
            "2f48309fb6ccc7b38a6412757801cd7d07e40b492f64e7146e8899d5a0e7c39a": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_forward/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_forward/materialicons/24px.svg",
            ],
            "da5f9ac466b2a296bdbbcee8eef2eaecf992207e83b8304451701e2e13a2bc0f": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/filter_list/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/filter_list/materialicons/24px.svg",
            ],
            "fe2c764701d194a633c6d1c904adc07ae445323c77ae16fa49ad96d1b17127e2": [
                "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/open_in_new/materialicons/24px.svg",
                "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/open_in_new/materialicons/24px.svg",
            ],
        },
        rename = {
            "ic_arrow_downward_24px.svg": "arrow_downward_24px.svg",
            "ic_arrow_upward_24px.svg": "arrow_upward_24px.svg",
            "ic_cancel_24px.svg": "cancel_24px.svg",
            "ic_change_history_24px.svg": "change_history_24px.svg",
            "ic_chevron_left_24px.svg": "chevron_left_24px.svg",
            "ic_chevron_right_24px.svg": "chevron_right_24px.svg",
            "ic_clear_24px.svg": "clear_24px.svg",
            "ic_content_copy_24px.svg": "content_copy_24px.svg",
            "ic_done_24px.svg": "done_24px.svg",
            "ic_error_24px.svg": "error_24px.svg",
            "ic_expand_less_24px.svg": "expand_less_24px.svg",
            "ic_expand_more_24px.svg": "expand_more_24px.svg",
            "ic_flag_24px.svg": "flag_24px.svg",
            "ic_get_app_24px.svg": "get_app_24px.svg",
            "ic_group_work_24px.svg": "group_work_24px.svg",
            "ic_help_outline_24px.svg": "help_outline_24px.svg",
            "ic_info_outline_24px.svg": "info_outline_24px.svg",
            "ic_palette_24px.svg": "palette_24px.svg",
            "ic_push_pin_24px.svg": "push_pin_24px.svg",
            "ic_push_pin_outline_24px.svg": "push_pin_outline_24px.svg",
            "ic_refresh_24px.svg": "refresh_24px.svg",
            "ic_search_24px.svg": "search_24px.svg",
            "ic_settings_24px.svg": "settings_24px.svg",
            "ic_visibility_off_24px.svg": "visibility_off_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/social/notifications_none/materialicons/24px.svg": "notifications_none_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/social/notifications_none/materialicons/24px.svg": "notifications_none_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/bug_report/materialicons/24px.svg": "bug_report_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/bug_report/materialicons/24px.svg": "bug_report_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/close/materialicons/24px.svg": "close_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/close/materialicons/24px.svg": "close_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/filter_alt/materialicons/24px.svg": "filter_alt_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/filter_alt/materialicons/24px.svg": "filter_alt_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen/materialicons/24px.svg": "fullscreen_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen/materialicons/24px.svg": "fullscreen_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen_exit/materialicons/24px.svg": "fullscreen_exit_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/fullscreen_exit/materialicons/24px.svg": "fullscreen_exit_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/image/image_search/materialicons/24px.svg": "image_search_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/image/image_search/materialicons/24px.svg": "image_search_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialicons/24px.svg": "keep_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialicons/24px.svg": "keep_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialiconsoutlined/24px.svg": "keep_outline_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/push_pin/materialiconsoutlined/24px.svg": "keep_outline_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/line_weight/materialicons/24px.svg": "line_weight_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/line_weight/materialicons/24px.svg": "line_weight_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/more_vert/materialicons/24px.svg": "more_vert_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/more_vert/materialicons/24px.svg": "more_vert_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_backup_restore/materialicons/24px.svg": "settings_backup_restore_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_backup_restore/materialicons/24px.svg": "settings_backup_restore_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_overscan/materialicons/24px.svg": "settings_overscan_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/action/settings_overscan/materialicons/24px.svg": "settings_overscan_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/alert/warning/materialicons/24px.svg": "warning_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/alert/warning/materialicons/24px.svg": "warning_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/edit/materialicons/24px.svg": "edit_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/edit/materialicons/24px.svg": "edit_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/light_mode/materialicons/24px.svg": "light_mode_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/light_mode/materialicons/24px.svg": "light_mode_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/dark_mode/materialicons/24px.svg": "dark_mode_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/ab12f16d050ecb1886b606f08825d24b30acafea/src/device/dark_mode/materialicons/24px.svg": "dark_mode_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/brightness_6/materialicons/24px.svg": "brightness_6_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/image/brightness_6/materialicons/24px.svg": "brightness_6_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/drag_indicator/materialicons/24px.svg": "drag_indicator_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/drag_indicator/materialicons/24px.svg": "drag_indicator_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/add/materialicons/24px.svg": "add_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/add/materialicons/24px.svg": "add_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_back/materialicons/24px.svg": "arrow_back_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_back/materialicons/24px.svg": "arrow_back_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_forward/materialicons/24px.svg": "arrow_forward_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/navigation/arrow_forward/materialicons/24px.svg": "arrow_forward_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/filter_list/materialicons/24px.svg": "filter_list_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/b3f05bfbf4329a5b63f50a720f867c2bac163f98/src/content/filter_list/materialicons/24px.svg": "filter_list_24px.svg",
            "https://raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/open_in_new/materialicons/24px.svg": "open_in_new_24px.svg",
            "http://mirror.tensorflow.org/raw.githubusercontent.com/google/material-design-icons/d3d4aca5a7cf50bc68bbd401cefa708e364194e8/src/action/open_in_new/materialicons/24px.svg": "open_in_new_24px.svg",
        },
    )
