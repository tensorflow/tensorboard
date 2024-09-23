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
import {Component, ViewContainerRef} from '@angular/core';

@Component({
  standalone: false,
  selector: 'tb-webapp',
  templateUrl: './app_container.ng.html',
  styleUrls: ['./app_container.css'],
})
export class AppContainer {
  // vcRef is required by ngx-color-picker in order for it to place the popup
  // in the root node in a modal mode.
  // https://github.com/zefoy/ngx-color-picker/blob/94a7c862bb61d7207f21281526fcd94453219b54/projects/lib/src/lib/color-picker.directive.ts#L168-L175
  constructor(readonly vcRef: ViewContainerRef) {}
}
