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

# TensorBoard typing dependencies

load("@io_bazel_rules_closure//closure:defs.bzl", "filegroup_external")

def tensorboard_typings_workspace():
  filegroup_external(
      name = "org_definitelytyped",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "b7da645f6e5555feb7aeede73775da0023ce2257df9c8e76c9159266035a9c0d": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/ebc69904eb78f94030d5d517b42db20867f679c0/chai/chai.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/ebc69904eb78f94030d5d517b42db20867f679c0/chai/chai.d.ts",
          ],
          "a285ca43837c03640134d31fb64a52625f65f4a2890194414d695fbc050b289e": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/5d0f2126c8dac8fce0ff020218aea06607213b0d/google.analytics/ga.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/5d0f2126c8dac8fce0ff020218aea06607213b0d/google.analytics/ga.d.ts",
          ],
          # TODO(jart): Upgrade to Lodash v4 typing: Lodash package is broken
          # down into small subpackages with many smaller type files. Loading
          # one type file is no longer enough.
          "e4cd3d5de0eb3bc7b1063b50d336764a0ac82a658b39b5cf90511f489ffdee60": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/efd40e67ff323f7147651bdbef03c03ead7b1675/lodash/lodash.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/efd40e67ff323f7147651bdbef03c03ead7b1675/lodash/lodash.d.ts",
          ],
          "695a03dd2ccb238161d97160b239ab841562710e5c4e42886aefd4ace2ce152e": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/ebc69904eb78f94030d5d517b42db20867f679c0/mocha/mocha.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/ebc69904eb78f94030d5d517b42db20867f679c0/mocha/mocha.d.ts",
          ],
          "513ccd9ee1c708881120eeacd56788fc3b3da8e5c6172b20324cebbe858803fe": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/708609e0764daeb5eb64104af7aca50c520c4e6e/sinon/sinon.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/708609e0764daeb5eb64104af7aca50c520c4e6e/sinon/sinon.d.ts",
          ],
          "44eba36339bd1c0792072b7b204ee926fe5ffe1e9e2da916e67ac55548e3668a": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/a872802c0c84ba98ff207d5e673a1fa867c67fd6/polymer/polymer.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/a872802c0c84ba98ff207d5e673a1fa867c67fd6/polymer/polymer.d.ts",  # 2016-09-22
          ],
          "7ce67447146eb2b9e9cdaaf8bf45b3209865378022cc8acf86616d3be84f6481": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/8cb9ee3fdfe352cfef672bdfdb5f9c428f915e9f/threejs/three.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/8cb9ee3fdfe352cfef672bdfdb5f9c428f915e9f/threejs/three.d.ts",  # r74 @ 2016-04-06
          ],
          "691756a6eb455f340c9e834de0d49fff269e7b8c1799c2454465dcd6a4435b80": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/46719185c564694c5583c4b7ad94dbb786ecad46/webcomponents.js/webcomponents.js.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/46719185c564694c5583c4b7ad94dbb786ecad46/webcomponents.js/webcomponents.js.d.ts",
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_array",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          # TODO(stephanwlee): d3-array is pinned at b6746d. number[] does not
          # cast to d3.ArrayLike<number> for some reason.
          "61e7abb7b1f01fbcb0cab8cf39003392f422566209edd681fbd070eaa84ca000": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/b6746d73a2ddf103c6825449ee2b0953f716d994/types/d3-array/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/b6746d73a2ddf103c6825449ee2b0953f716d994/types/d3-array/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_axis",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "6a43110a41bbf3190ef6c515fc8b932086122b7d2fd32e841f4756ba507406c3": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-axis/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-axis/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_brush",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "fb5d5bef5af05e086085892946769b9ec8c0f9217876933671038b665a6ec603": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-brush/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-brush/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_chord",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "9a06f750a483ae5ce10ceda48c5004cd918c4d803762661dca52eedfd2ed7afd": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-chord/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-chord/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_collection",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "8f6ec0925d0ba17efa0dcfea9ab8b3f73114222a569704849e8a169533ea0f95": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-collection/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-collection/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_color",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "83a206846be71cca27273fa5c39544b7d51c9aab8336ae6b5135c6b71a178bbf": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-color/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-color/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_dispatch",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "4ddaa6005cfd5fd07df24e8af735d2c1a90d896bd5cacc2f657fe8748ae25af9": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-dispatch/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-dispatch/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_drag",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "99c4e6872495378bcb768d8cc99551aaee43ba2324fd56282f8f03d81c499975": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-drag/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-drag/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_dsv",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "5fccc13fc4d3b1c6a434cb277c491ac8d47baed9baba86bdb441ee18ec5bc76e": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-dsv/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-dsv/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_ease",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "d5a9be5316b2d1823a3faa7f75de1e2c2efda5c75f0631b44a0f7b69e11f3a90": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-ease/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-ease/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_force",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "a6941d869584c8f426d5dfbe89ad0f082c104477f81c7d2fe432ccae3cc2ece8": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-force/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-force/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_format",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "b5b8cf2707e4c60ea98341e3c5c913f1af2e2bd7c61b90a8329260692fe1f694": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-format/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-format/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_hierarchy",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "eb527ec61d4a7d81db35f823104fa57cb3def41d72eaa9ce827295d440283206": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-hierarchy/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-hierarchy/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_interpolate",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "e2f3ebafe2b7c6011fe76d19f9e32d8c8b67076b39f7cfa945d543e39f3ef18f": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-interpolate/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-interpolate/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_path",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "daad2baf9dd5af11d3c3095c6fb93f7749e581943873b29b6dfc4a6f22d3d6e2": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-path/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-path/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_polygon",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "a76d53d353351cabaaca7f149a57c5ffc7d90c0f181d7f3f40e4a51424289a75": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-polygon/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-polygon/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_quadtree",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "4ebfae1202903a6d8d2ab52dede7631f2d8d277cbec8107607df7372d19ebbb6": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-quadtree/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-quadtree/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_queue",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "3d48a2e31ee7b4bc687a6b85b49bcb37e043e0dec4c83fcda8baad27fda7c114": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-queue/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-queue/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_random",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "e30e9105a9c2e11410a452a02e320aebe66a1856e6b9410035ee7b3ad7d80839": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-random/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-random/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_request",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "fc2b7c2c05498011eb039825aab76a7916698fb3e7133e278fc92ae529ae99f0": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-request/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-request/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_scale",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          # TODO(stephanwlee): Pinned at ff2359 because versions after this
          # upgrades to d3-scale v2 which is part of d3 v5. In d3 v5, it splits
          # d3-scale into d3-scale and d3-scale-chromatic and deprecates
          # d3.schemeCategory20.
          "58646b85fbbeaa88ff29342e9f1a89cea2d6fa8cb1b5549dc7ec8e9f7e021894": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/ff2359e74ce1c539097e47dc586d49d348a94587/types/d3-scale/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/ff2359e74ce1c539097e47dc586d49d348a94587/types/d3-scale/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_selection",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "0e1bf1308ca27649010d5ae91783decd1337bda581b66aaa8be12060110662fa": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-selection/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-selection/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_shape",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "47c61d4d8ba88c113fe9f3b37585656c66eddd95262554108a6507674a6c3b3a": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-shape/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-shape/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_time",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "39fb4b2ad57ef393eabd017356f05854a44268a6b98cd2b235c8732fb9989d83": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-time/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-time/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_timer",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "79021d12162bdd6a850ce4c1a9014b342067db30816f907d4118578c2a59db76": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-timer/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-timer/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_transition",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "88e6d462d5a592a2ebbdad7865142160341c93698c50701c4186bcb65a7685a7": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-transition/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-transition/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_voronoi",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "8936e0e6b0f0416c4c08f79e1555869a8553dc04723c4d8fa12990e755f460f5": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-voronoi/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-voronoi/index.d.ts",  # 2018-08-06
          ],
      },
  )

  filegroup_external(
      name = "org_definitelytyped_types_d3_zoom",
      licenses = ["notice"],  # MIT
      sha256_urls = {
          "65ea463a1297778ebf88e37444722bacd4d33db9a59ac69e78127e1c23670dd3": [
              "https://mirror.bazel.build/raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-zoom/index.d.ts",
              "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/526dd2e57684fa586452445a181d37369533d02e/types/d3-zoom/index.d.ts",  # 2018-08-06
          ],
      },
  )
