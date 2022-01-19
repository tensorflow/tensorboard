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
import {Injectable} from '@angular/core';
import {QueryParams} from './query_params';
import {FORCE_SVG_RENDERER} from './tb_feature_flag_data_source_types';

@Injectable()
export class ForceSVGDataSource {
  constructor(readonly queryParams: QueryParams) {}

  getAndUpdateForceSVGFlag(): boolean {
    this.updateLocalStorage();
    if (localStorage.getItem(FORCE_SVG_RENDERER)) {
      return true;
    }
    return false;
  }

  private updateLocalStorage() {
    const params = this.queryParams.getParams();
    console.log('checking force param');
    if (params.has(FORCE_SVG_RENDERER)) {
      console.log('has query param');
      if (params.get(FORCE_SVG_RENDERER) !== 'false') {
        localStorage.setItem(FORCE_SVG_RENDERER, 'true');
      } else {
        localStorage.removeItem(FORCE_SVG_RENDERER);
      }
    }
  }
}
