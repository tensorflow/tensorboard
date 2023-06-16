/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {CardInteractionsDataSource} from './card_interactions_data_source';
import {PluginType} from '../internal_types';

describe('CardInteractionsDataSource Test', () => {
  let mockStorage: Record<string, string>;
  let dataSource: CardInteractionsDataSource;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [CardInteractionsDataSource],
    });

    dataSource = TestBed.inject(CardInteractionsDataSource);

    mockStorage = {};
    spyOn(window.localStorage, 'setItem').and.callFake(
      (key: string, value: string) => {
        if (key !== 'tb-card-interactions') {
          throw new Error('incorrect key used');
        }

        mockStorage[key] = value;
      }
    );

    spyOn(window.localStorage, 'getItem').and.callFake((key: string) => {
      if (key !== 'tb-card-interactions') {
        throw new Error('incorrect key used');
      }

      return mockStorage[key];
    });
  });

  describe('saveCardInteractions', () => {
    it('only saves 10 pins', () => {
      dataSource.saveCardInteractions({
        clicks: [],
        tagFilters: [],
        pins: Array.from({length: 12}).map((_, index) => ({
          cardId: `card-${index}`,
          runId: null,
          tag: 'foo',
          plugin: PluginType.SCALARS,
        })),
      });

      expect(dataSource.getCardInteractions().pins.length).toEqual(10);
    });

    it('only saves 10 clicks', () => {
      dataSource.saveCardInteractions({
        pins: [],
        tagFilters: [],
        clicks: Array.from({length: 12}).map((_, index) => ({
          cardId: `card-${index}`,
          runId: null,
          tag: 'foo',
          plugin: PluginType.SCALARS,
        })),
      });

      expect(dataSource.getCardInteractions().clicks.length).toEqual(10);
    });

    it('only saves 10 tagFilgers', () => {
      dataSource.saveCardInteractions({
        clicks: [],
        tagFilters: Array.from({length: 12}).map((_, index) =>
          index.toString()
        ),
        pins: [],
      });

      expect(dataSource.getCardInteractions().tagFilters.length).toEqual(10);
    });
  });

  describe('getCardInteractions', () => {
    it('returns all default state when key is not set', () => {
      expect(dataSource.getCardInteractions()).toEqual({
        tagFilters: [],
        pins: [],
        clicks: [],
      });
    });

    it('returns previously written value', () => {
      dataSource.saveCardInteractions({
        tagFilters: ['foo'],
        clicks: [
          {cardId: '1', runId: null, tag: 'foo', plugin: PluginType.SCALARS},
        ],
        pins: [
          {cardId: '2', runId: null, tag: 'bar', plugin: PluginType.SCALARS},
        ],
      });

      expect(dataSource.getCardInteractions()).toEqual({
        tagFilters: ['foo'],
        clicks: [
          {cardId: '1', runId: null, tag: 'foo', plugin: PluginType.SCALARS},
        ],
        pins: [
          {cardId: '2', runId: null, tag: 'bar', plugin: PluginType.SCALARS},
        ],
      });
    });
  });
});
