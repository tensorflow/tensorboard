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
import {TestBed} from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action} from '@ngrx/store';
import {ReplaySubject} from 'rxjs';

import {CoreEffects} from './core.effects';
import * as coreActions from './core.actions';
import {CoreService} from './core.service';

import {createPluginMetadata} from './test_util';

import {PluginsListing} from '../types/api';

describe('core.effects', () => {
  let httpMock: HttpTestingController;
  let coreEffects: CoreEffects;
  let action: ReplaySubject<Action>;

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideMockActions(action), CoreEffects, CoreService],
    }).compileComponents();
    coreEffects = TestBed.get(CoreEffects);
    httpMock = TestBed.get(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches plugins listing and fires success action', () => {
    const pluginsListing: PluginsListing = {
      core: createPluginMetadata('Core'),
    };
    // Assertion/exception in the subscribe does not fail the test.
    // Store the result
    let res = null;
    coreEffects.loadPluginsListing$.subscribe((action) => {
      res = action as Action;
    });
    action.next(coreActions.coreLoaded());
    // Flushing the request response invokes above subscription sychronously.
    httpMock.expectOne('data/plugins_listing').flush(pluginsListing);

    const expected = coreActions.pluginsListingLoaded({
      plugins: pluginsListing,
    });
    expect(res).toEqual(expected as any);
  });
});
