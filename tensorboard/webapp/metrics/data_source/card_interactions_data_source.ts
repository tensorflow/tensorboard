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
import {Injectable} from '@angular/core';
import {CardInteractions} from '../store/metrics_types';

const CARD_INTERACTIONS_KEY = 'tb-card-interactions';

const MAX_RECORDS: Record<keyof CardInteractions, number> = {
  pins: 10,
  clicks: 10,
  tagFilters: 10,
};

@Injectable()
export class CardInteractionsDataSource {
  saveCardInteractions(cardInteractions: CardInteractions) {
    const trimmedInteractions: CardInteractions = {
      pins: cardInteractions.pins.slice(
        cardInteractions.pins.length - MAX_RECORDS.pins
      ),
      clicks: cardInteractions.clicks.slice(
        cardInteractions.clicks.length - MAX_RECORDS.clicks
      ),
      tagFilters: cardInteractions.tagFilters.slice(
        cardInteractions.tagFilters.length - MAX_RECORDS.tagFilters
      ),
    };
    localStorage.setItem(
      CARD_INTERACTIONS_KEY,
      JSON.stringify(trimmedInteractions)
    );
  }

  getCardInteractions(): CardInteractions {
    const existingInteractions = localStorage.getItem(CARD_INTERACTIONS_KEY);
    if (existingInteractions) {
      return JSON.parse(existingInteractions) as CardInteractions;
    }
    return {
      tagFilters: [],
      pins: [],
      clicks: [],
    };
  }
}
