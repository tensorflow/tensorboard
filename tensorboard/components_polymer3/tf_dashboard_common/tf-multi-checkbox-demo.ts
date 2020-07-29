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

import { PolymerElement, html } from "@polymer/polymer";
import { customElement, property } from "@polymer/decorators";
import { DO_NOT_SUBMIT } from "tf-multi-checkbox.html";
import { DO_NOT_SUBMIT } from "tf-multi-checkbox.html";
var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function randomTooltip() {
    var s = '';
    while (random() < 0.8) {
        s += String(10 * random())[0];
    }
    return s;
}
@customElement("mc-demo")
class McDemo extends PolymerElement {
    static readonly template = html `<tf-multi-checkbox id="multiCheckbox" names="[[names]]" tooltips="[[_tooltips]]" highlights="[[highlights]]"></tf-multi-checkbox>
        <style></style>`;
    @property({ type: Array })
    names: unknown[];
    @property({ type: Object })
    tooltips: object;
    @property({})
    autoGenerateTooltips: unknown;
    @property({ type: Object })
    _tooltips: object;
    @property({ type: Array })
    highlights: unknown[];
    @observe("names", "autoGenerateTooltips")
    autogenerate() {
        var names = this.names;
        var autoGenerateTooltips = this.autoGenerateTooltips;
        if (autoGenerateTooltips) {
            var tooltips = {};
            names.forEach(function (n) {
                if (random() > 0.5) {
                    tooltips[n] = randomTooltip();
                }
            });
            this._tooltips = tooltips;
        }
    }
    @observe("names")
    randomHighlights() {
        var names = this.names;
        var h = [];
        names.forEach(function (n) {
            if (random() > 0.6) {
                h.push(n);
            }
        });
        this.highlights = h;
    }
}
function long_names() {
    return [
        'foo_bar very long name with spaces',
        'the quick brown fox jumped over the lazy dog',
        'supercalifragilisticexpialodcious/bar/foo/zod/longer/longer',
    ];
}
function many_names() {
    var out = [];
    for (var i = 0; i < 20; i++) {
        out.push('foo_bar-' + i);
        out.push('bar_zod_bing-' + i);
        out.push('lol-' + i);
    }
    return out;
}
function many_long_names() {
    var out = [];
    for (var i = 0; i < 20; i++) {
        out.push('foo_bar very very very long some spaces though-' + i);
        out.push('bar_zod_bing_bas_womp_wub_wub_dub_wub_wub-' + i);
        out.push('rightly_to_be_great_is_not_to_stir_without_great_argument_but_greatly_to_find_quarrel_in_a_straw_when_honors_at_the_stake-' +
            i);
    }
    return out;
}
@customElement("x-demo")
class XDemo extends PolymerElement {
    static readonly template = html `<style>
          .small {
            width: 200px;
            height: 500px;
          }
          .large {
            width: 500px;
            height: 900px;
          }
          html,
          body {
            height: 100%;
          }
          mc-demo {
            padding: 5px;
            border: 1px solid var(--paper-red-500);
            display: inline-block;
          }
        </style>
        <div class="demo-block">
          <mc-demo id="demo1" class="small" names="[[long_names]]"></mc-demo>
          <mc-demo class="small" names="[[many_names]]"></mc-demo>
          <mc-demo class="small" names="[[many_long_names]]"></mc-demo>
        </div>

        <div class="demo-block">
          <mc-demo class="large" names="[[long_names]]"></mc-demo>
          <mc-demo class="large" names="[[many_names]]"></mc-demo>
          <mc-demo class="large" names="[[many_long_names]]"></mc-demo>
        </div>`;
    @property({ type: Array })
    long_names: unknown[] = long_names;
    @property({ type: Array })
    many_names: unknown[] = many_names;
    @property({ type: Array })
    many_long_names: unknown[] = many_long_names;
}
