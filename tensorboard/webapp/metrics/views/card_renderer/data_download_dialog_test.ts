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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {Run} from '../../../runs/store/runs_types';
import {buildRun} from '../../../runs/store/testing';
import {
  getCardMetadata,
  getCardTimeSeries,
  getRunMap,
} from '../../../selectors';
import {MetricsDataSource, PluginType} from '../../data_source';
import {createScalarStepData, TestingMetricsDataSource} from '../../testing';
import {DataDownloadDialogComponent} from './data_download_dialog_component';
import {
  DataDownloadDialogContainer,
  DataDownloadDialogData,
} from './data_download_dialog_container';

describe('metrics/views/data_download_dialog', () => {
  let store: MockStore<State>;
  let dataSource: TestingMetricsDataSource;

  const ByCss = {
    SELECT: By.css('select'),
    SELECT_OPTION: By.css('select option:not([value=""])'),
    DOWNLOAD: By.css('a'),
  };

  async function createComponent(
    cardId: string
  ): Promise<ComponentFixture<DataDownloadDialogContainer>> {
    const dialogData: DataDownloadDialogData = {cardId};
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, FormsModule],
      declarations: [DataDownloadDialogContainer, DataDownloadDialogComponent],
      providers: [
        provideMockStore({}),
        {provide: MAT_DIALOG_DATA, useValue: dialogData},
        {provide: MetricsDataSource, useClass: TestingMetricsDataSource},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    dataSource = TestBed.inject(MetricsDataSource) as TestingMetricsDataSource;
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRunMap, new Map<string, Run>());
    store.overrideSelector(getCardMetadata, null);
    store.overrideSelector(getCardTimeSeries, {});

    const fixture = TestBed.createComponent(DataDownloadDialogContainer);
    return fixture;
  }

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders', async () => {
    const fixture = await createComponent('card1');
    store.overrideSelector(getCardMetadata, {
      plugin: PluginType.SCALARS,
      tag: 'tag1',
      runId: null,
    });
    store.overrideSelector(getCardTimeSeries, {
      'exp1/run1': createScalarStepData(),
      'exp1/run2': createScalarStepData(),
    });
    store.overrideSelector(
      getRunMap,
      new Map([
        [
          'exp1/run1',
          buildRun({
            id: 'exp1/run1',
            name: 'Run 1',
          }),
        ],
        [
          'exp1/run2',
          buildRun({
            id: 'exp1/run2',
            name: 'Run dos',
          }),
        ],
      ])
    );
    fixture.detectChanges();

    const options = fixture.debugElement.queryAll(ByCss.SELECT_OPTION);
    expect(options.length).toBe(2);
    expect(options.map((option) => option.nativeElement.textContent)).toEqual([
      'Run 1',
      'Run dos',
    ]);

    const downloadLinks = fixture.debugElement.queryAll(ByCss.DOWNLOAD);
    for (const link of downloadLinks) {
      expect(link.properties['disabled']).toBe(true);
    }
  });

  it('omits runIds without run metadata', async () => {
    const fixture = await createComponent('card1');
    store.overrideSelector(getCardMetadata, {
      plugin: PluginType.SCALARS,
      tag: 'tag1',
      runId: null,
    });
    store.overrideSelector(getCardTimeSeries, {
      'exp1/run1': createScalarStepData(),
      'exp1/run2': createScalarStepData(),
    });
    store.overrideSelector(
      getRunMap,
      new Map([
        [
          'exp1/run1',
          buildRun({
            id: 'exp1/run1',
            name: 'Run 1',
          }),
        ],
      ])
    );
    fixture.detectChanges();

    const options = fixture.debugElement.queryAll(ByCss.SELECT_OPTION);
    expect(options.length).toBe(1);
    expect(options.map((option) => option.nativeElement.textContent)).toEqual([
      'Run 1',
    ]);
  });

  it('enables the download links when run is selected', async () => {
    const fixture = await createComponent('card1');
    const downloadUrlSpy = spyOn(dataSource, 'downloadUrl');
    downloadUrlSpy
      .withArgs(PluginType.SCALARS, 'tag1', 'exp1/run2', 'json')
      .and.returnValue('/url1');
    downloadUrlSpy
      .withArgs(PluginType.SCALARS, 'tag1', 'exp1/run2', 'csv')
      .and.returnValue('/url2');
    store.overrideSelector(getCardMetadata, {
      plugin: PluginType.SCALARS,
      tag: 'tag1',
      runId: null,
    });
    store.overrideSelector(getCardTimeSeries, {
      'exp1/run1': createScalarStepData(),
      'exp1/run2': createScalarStepData(),
    });
    store.overrideSelector(
      getRunMap,
      new Map([
        [
          'exp1/run1',
          buildRun({
            id: 'exp1/run1',
            name: 'Run 1',
          }),
        ],
        [
          'exp1/run2',
          buildRun({
            id: 'exp1/run2',
            name: 'Run dos',
          }),
        ],
      ])
    );
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(ByCss.SELECT).nativeElement;
    selectEl.value = 'exp1/run2';
    // Let Angular and FormsControl know.
    selectEl.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const downloadLinks = fixture.debugElement.queryAll(ByCss.DOWNLOAD);
    for (const link of downloadLinks) {
      expect(link.properties['disabled']).toBe(false);
    }
    const pathAndQueries = downloadLinks.map((link) => {
      return link.nativeElement.href.slice(link.nativeElement.origin.length);
    });
    expect(pathAndQueries).toEqual(['/url1', '/url2']);
  });

  it('does not throw even if user deselects a run', async () => {
    const fixture = await createComponent('card1');
    const downloadUrlSpy = spyOn(dataSource, 'downloadUrl');
    downloadUrlSpy
      .withArgs(PluginType.SCALARS, 'tag1', 'exp1/run2', 'json')
      .and.returnValue('/url1');
    downloadUrlSpy
      .withArgs(PluginType.SCALARS, 'tag1', 'exp1/run2', 'csv')
      .and.returnValue('/url2');
    store.overrideSelector(getCardMetadata, {
      plugin: PluginType.SCALARS,
      tag: 'tag1',
      runId: null,
    });
    store.overrideSelector(getCardTimeSeries, {
      'exp1/run1': createScalarStepData(),
      'exp1/run2': createScalarStepData(),
    });
    store.overrideSelector(
      getRunMap,
      new Map([
        [
          'exp1/run1',
          buildRun({
            id: 'exp1/run1',
            name: 'Run 1',
          }),
        ],
        [
          'exp1/run2',
          buildRun({
            id: 'exp1/run2',
            name: 'Run dos',
          }),
        ],
      ])
    );
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(ByCss.SELECT).nativeElement;
    const noRun = selectEl.querySelector('option[value=""]');
    noRun.click();
    fixture.detectChanges();

    const downloadLinks = fixture.debugElement.queryAll(ByCss.DOWNLOAD);
    for (const link of downloadLinks) {
      expect(link.properties['disabled']).toBe(true);
    }
    const pathAndQueries = downloadLinks.map((link) => {
      return link.nativeElement.href.slice(link.nativeElement.origin.length);
    });
    // Karma seems to inject this value when using [href] instead of
    // [attr.href] in the template.
    expect(pathAndQueries).toEqual(['/context.html', '/context.html']);
  });

  it('forms correct url even if run names are all the same', async () => {
    const fixture = await createComponent('card1');
    const downloadUrlSpy = spyOn(dataSource, 'downloadUrl');
    downloadUrlSpy
      .withArgs(PluginType.SCALARS, 'tag1', 'exp2/run1', 'json')
      .and.returnValue('/url1');
    downloadUrlSpy
      .withArgs(PluginType.SCALARS, 'tag1', 'exp2/run1', 'csv')
      .and.returnValue('/url2');
    store.overrideSelector(getCardMetadata, {
      plugin: PluginType.SCALARS,
      tag: 'tag1',
      runId: null,
    });
    store.overrideSelector(getCardTimeSeries, {
      'exp1/run1': createScalarStepData(),
      'exp2/run1': createScalarStepData(),
    });
    store.overrideSelector(
      getRunMap,
      new Map([
        [
          'exp1/run1',
          buildRun({
            id: 'exp1/run1',
            name: 'RunName',
          }),
        ],
        [
          'exp2/run1',
          buildRun({
            id: 'exp2/run1',
            name: 'RunName',
          }),
        ],
      ])
    );
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(ByCss.SELECT).nativeElement;
    selectEl.value = 'exp2/run1';
    // Let Angular and FormsControl know.
    selectEl.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const downloadLinks = fixture.debugElement.queryAll(ByCss.DOWNLOAD);
    const pathAndQueries = downloadLinks.map((link) => {
      return link.nativeElement.href.slice(link.nativeElement.origin.length);
    });
    expect(pathAndQueries).toEqual(['/url1', '/url2']);
  });
});
