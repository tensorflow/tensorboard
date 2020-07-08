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
import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {coreLoaded} from './core/actions';
import {State} from './core/store';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'tb-webapp',
  templateUrl: './app_container.ng.html',
  styleUrls: ['./app_container.css'],
})
export class AppContainer implements OnInit {
  constructor(private readonly store: Store<State>) {}

  ngOnInit() {
    this.store.dispatch(coreLoaded());
  }
}
