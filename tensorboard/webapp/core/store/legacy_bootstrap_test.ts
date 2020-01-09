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
import {of} from 'rxjs';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TBServerDataSource} from '../../webapp_data_source/tb_server_data_source';
import {createCoreState} from '../testing';
import {buildInitialState} from './legacy_bootstrap';

describe('legacy state bootstrapper', () => {
  let getActivePlugin: jasmine.Spy;
  let dataSource: TBServerDataSource;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TBServerDataSource],
    }).compileComponents();

    dataSource = TestBed.get(TBServerDataSource);
    getActivePlugin = spyOn(dataSource, 'getActivePlugin')
      .withArgs()
      .and.returnValue('foobar');
  });

  it('sets the initial NgRx state from any existing tf_storage state', () => {
    const actual = buildInitialState(dataSource);
    const expected = createCoreState({activePlugin: 'foobar', plugins: {}});

    expect(getActivePlugin).toHaveBeenCalledTimes(1);
    expect(actual).toEqual(expected);
  });
});
