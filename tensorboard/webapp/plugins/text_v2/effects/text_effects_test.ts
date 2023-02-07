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
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {of, ReplaySubject} from 'rxjs';
import {CategoryType} from '../../../../components/tf_categorization_utils/categorizationUtils';
import {State} from '../../../app_state';
import {manualReload, reload} from '../../../core/actions';
import {provideMockTbStore} from '../../../testing/utils';
import {
  textDataLoaded,
  textPluginLoaded,
  textRunToTagsLoaded,
  textTagGroupVisibilityChanged,
} from '../actions';
import {
  RunToTags,
  StepDatum,
  TextV2DataSource,
} from '../data_source/text_v2_data_source';
import {TextV2DataSourceModule} from '../data_source/text_v2_data_source_module';
import {
  getTextAllVisibleRunTags,
  getTextData,
} from '../store/text_v2_selectors';
import {TextEffects} from './text_effects';

describe('text_effects', () => {
  let textEffects: TextEffects;
  let action: ReplaySubject<Action>;
  let store: MockStore<Partial<State>>;
  let recordedActions: Action[] = [];
  let fetchRunToTagsSubjects: ReplaySubject<RunToTags>[];
  let fetchDataSujects: ReplaySubject<StepDatum[]>[];
  let fetchTextDataSpy: jasmine.Spy;
  let selectSpy: jasmine.Spy;

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      imports: [TextV2DataSourceModule],
      providers: [
        provideMockActions(action),
        provideMockTbStore(),
        TextEffects,
      ],
    }).compileComponents();

    textEffects = TestBed.inject(TextEffects);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    store.overrideSelector(getTextAllVisibleRunTags, []);
    selectSpy = spyOn(store, 'select').and.callThrough();

    recordedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      recordedActions.push(action);
    });

    const dataSource = TestBed.inject(TextV2DataSource);

    fetchRunToTagsSubjects = [];
    spyOn(dataSource, 'fetchRunToTag').and.callFake(() => {
      const subject = new ReplaySubject<RunToTags>(1);
      fetchRunToTagsSubjects.push(subject);
      return subject;
    });

    fetchDataSujects = [];
    fetchTextDataSpy = spyOn(dataSource, 'fetchTextData').and.callFake(() => {
      const fetchDataSuject = new ReplaySubject<StepDatum[]>();
      fetchDataSujects.push(fetchDataSuject);
      return fetchDataSuject;
    });
  });

  beforeEach(() => {
    textEffects.loadRunToTags$.subscribe(() => {});
    textEffects.loadData$.subscribe(() => {});
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('fetches run to tags on plugins loaded', () => {
    action.next(textPluginLoaded());

    fetchRunToTagsSubjects[0].next(new Map([['run1', ['tag1', 'tag2']]]));
    fetchRunToTagsSubjects[0].complete();

    expect(recordedActions).toEqual([
      textRunToTagsLoaded({runToTags: new Map([['run1', ['tag1', 'tag2']]])}),
    ]);
  });

  describe('on visibility changed', () => {
    it('fetches data for run tag tuple that has not been loaded yet', () => {
      selectSpy
        .withArgs(getTextData, {run: 'run1', tag: 'tag1'})
        .and.returnValue(of([]));
      selectSpy
        .withArgs(getTextData, {run: 'run1', tag: 'tag2'})
        .and.returnValue(of(null));
      store.refreshState();

      action.next(
        textTagGroupVisibilityChanged({
          tagGroup: {type: CategoryType.PREFIX_GROUP, name: 'foo'},
          visibleTextCards: [
            {run: 'run1', tag: 'tag1'},
            {run: 'run1', tag: 'tag2'},
          ],
        })
      );

      expect(fetchDataSujects.length).toBe(1);
      fetchDataSujects[0].next([]);
      fetchDataSujects[0].complete();

      expect(recordedActions).toEqual([
        textDataLoaded({run: 'run1', tag: 'tag2', stepData: []}),
      ]);
    });

    [
      {name: 'auto reload', actionPayload: reload()},
      {name: 'manual reload', actionPayload: manualReload()},
    ].forEach(({name, actionPayload}) => {
      it(`fetches data for visible cards when ${name} fires`, () => {
        selectSpy
          .withArgs(getTextData, {run: 'run1', tag: 'tag1'})
          .and.returnValue(of([]));
        store.overrideSelector(getTextAllVisibleRunTags, [
          {run: 'run1', tag: 'tag1'},
        ]);
        store.refreshState();

        action.next(actionPayload);

        expect(fetchDataSujects.length).toBe(1);
        fetchDataSujects[0].next([]);
        fetchDataSujects[0].complete();

        expect(recordedActions).toEqual([
          textDataLoaded({run: 'run1', tag: 'tag1', stepData: []}),
        ]);
      });
    });
  });
});
