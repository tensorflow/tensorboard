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
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {from} from 'rxjs';

import {PluginsListing} from '../types/api';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Injectable()
export class CoreService {
  private tfStorage = document.createElement('tf-storage') as any;
  private tfBackend = (document.createElement('tf-backend') as any).tf_backend;

  constructor(private http: HttpClient) {}

  fetchPluginsListing() {
    return this.http.get<PluginsListing>('data/plugins_listing');
  }

  fetchRuns() {
    return from(this.tfBackend.runsStore.refresh());
  }

  fetchEnvironments() {
    return from(this.tfBackend.environmentStore.refresh());
  }
}
