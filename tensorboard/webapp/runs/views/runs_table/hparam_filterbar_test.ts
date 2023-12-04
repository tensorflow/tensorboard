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
import {HparamFilterbarComponent} from './hparam_filterbar_component';
import {HparamFilterbarContainer} from './hparam_filterbar_container';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideMockTbStore} from '../../../testing/utils';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {Action, Store} from '@ngrx/store';
import {By} from '@angular/platform-browser';
import {CustomModalModule} from '../../../widgets/custom_modal/custom_modal_module';
import {
  actions as hparamsActions,
  selectors as hparamsSelectors,
} from '../../../hparams';
import {
  DomainType,
  IntervalFilter,
  DiscreteFilter,
} from '../../../widgets/data_table/types';
import {MatChipHarness} from '@angular/material/chips/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {MatChipRemove, MatChipsModule} from '@angular/material/chips';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {CustomModalComponent} from '../../../widgets/custom_modal/custom_modal_component';
import {FilterDialogModule} from '../../../widgets/data_table/filter_dialog_module';
import {FilterDialog} from '../../../widgets/data_table/filter_dialog_component';

const discreteFilter: DiscreteFilter = {
  type: DomainType.DISCRETE,
  includeUndefined: true,
  possibleValues: [1, 2, 3],
  filterValues: [1, 2, 3],
};

const intervalFilter: IntervalFilter = {
  type: DomainType.INTERVAL,
  includeUndefined: true,
  minValue: 2,
  maxValue: 10,
  filterLowerValue: 3,
  filterUpperValue: 8,
};

const fakeFilterMap = new Map<string, DiscreteFilter | IntervalFilter>([
  ['filter1', discreteFilter],
  ['filter2', intervalFilter],
]);

describe('hparam_filterbar', () => {
  let actualActions: Action[];
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomModalModule,
        NoopAnimationsModule,
        MatChipsModule,
        MatIconTestingModule,
        FilterDialogModule,
      ],
      declarations: [HparamFilterbarComponent, HparamFilterbarContainer],
      providers: [provideMockTbStore()],
    }).compileComponents();
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function createComponent() {
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    actualActions = [];
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });

    return TestBed.createComponent(HparamFilterbarContainer);
  }

  it('renders hparam filterbar', () => {
    const fixture = createComponent();
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(
      By.directive(HparamFilterbarComponent)
    );

    expect(dialog).toBeTruthy();
  });

  it("doesn't render if no filters are set", async () => {
    const fixture = createComponent();
    store.overrideSelector(
      hparamsSelectors.getDashboardHparamFilterMap,
      new Map<string, IntervalFilter | DiscreteFilter>()
    );
    const loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();

    const hasChip = await loader.hasHarness(MatChipHarness);

    expect(hasChip).toBeFalse();
  });

  it('renders filters populated from store', async () => {
    const fixture = createComponent();
    store.overrideSelector(
      hparamsSelectors.getDashboardHparamFilterMap,
      fakeFilterMap
    );
    const loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();

    const chipHarnesses = await loader.getAllHarnesses(MatChipHarness);

    const chip0Text = await chipHarnesses[0].getText();
    const chip1Text = await chipHarnesses[1].getText();
    expect(chipHarnesses.length).toEqual(2);
    expect(chip0Text).toEqual('filter1');
    expect(chip1Text).toEqual('filter2');
  });

  it('removes chip on remove button click', async () => {
    const fixture = createComponent();
    store.overrideSelector(
      hparamsSelectors.getDashboardHparamFilterMap,
      fakeFilterMap
    );
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.directive(MatChipRemove));
    button.nativeElement.click();
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(
      hparamsActions.dashboardHparamFilterRemoved({
        name: 'filter1',
      })
    );
  });

  it('opens filter menu on chip click', async () => {
    const fixture = createComponent();
    store.overrideSelector(
      hparamsSelectors.getDashboardHparamFilterMap,
      fakeFilterMap
    );
    const component = fixture.debugElement.query(
      By.directive(HparamFilterbarComponent)
    ).componentInstance;
    const openAtPositionSpy = spyOn(
      CustomModalComponent.prototype,
      'openAtPosition'
    );
    const loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();

    const chipHarness = await loader.getHarness(MatChipHarness);
    const chip = await chipHarness.host();
    const chipDimensions = await chip.getDimensions();
    await chip.click();
    fixture.detectChanges();

    expect(openAtPositionSpy).toHaveBeenCalledWith({
      x: chipDimensions.left + chipDimensions.width,
      y: chipDimensions.top,
    });
    expect(component.selectedFilterName).toBe('filter1');
  });

  it('updates filter range on interval filter change', async () => {
    const fixture = createComponent();
    store.overrideSelector(
      hparamsSelectors.getDashboardHparamFilterMap,
      fakeFilterMap
    );
    const loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();

    const chipHarness = await loader.getHarness(
      MatChipHarness.with({text: 'filter2'})
    );
    const chip = await chipHarness.host();
    await chip.click();
    fixture.detectChanges();
    fixture.debugElement
      .query(By.directive(FilterDialog))
      .componentInstance.intervalFilterChanged.emit({
        lowerValue: 1,
        upperValue: 9,
      });

    expect(dispatchSpy).toHaveBeenCalledWith(
      hparamsActions.dashboardHparamFilterAdded({
        name: 'filter2',
        filter: {
          ...intervalFilter,
          filterLowerValue: 1,
          filterUpperValue: 9,
        },
      })
    );
  });

  describe('discrete filter change', () => {
    it('adds filter value if discrete filter modal adds value', async () => {
      const fixture = createComponent();
      store.overrideSelector(
        hparamsSelectors.getDashboardHparamFilterMap,
        fakeFilterMap
      );
      const loader = TestbedHarnessEnvironment.loader(fixture);
      fixture.detectChanges();

      const chipHarness = await loader.getHarness(
        MatChipHarness.with({text: 'filter1'})
      );
      const chip = await chipHarness.host();
      await chip.click();
      fixture.detectChanges();
      fixture.debugElement
        .query(By.directive(FilterDialog))
        .componentInstance.discreteFilterChanged.emit(4);

      expect(dispatchSpy).toHaveBeenCalledWith(
        hparamsActions.dashboardHparamFilterAdded({
          name: 'filter1',
          filter: {
            ...discreteFilter,
            filterValues: [1, 2, 3, 4],
          },
        })
      );
    });

    it('removes filter value if discrete filter modal removes value', async () => {
      const fixture = createComponent();
      store.overrideSelector(
        hparamsSelectors.getDashboardHparamFilterMap,
        fakeFilterMap
      );
      const loader = TestbedHarnessEnvironment.loader(fixture);
      fixture.detectChanges();

      const chipHarness = await loader.getHarness(
        MatChipHarness.with({text: 'filter1'})
      );
      const chip = await chipHarness.host();
      await chip.click();
      fixture.detectChanges();
      fixture.debugElement
        .query(By.directive(FilterDialog))
        .componentInstance.discreteFilterChanged.emit(1);

      expect(dispatchSpy).toHaveBeenCalledWith(
        hparamsActions.dashboardHparamFilterAdded({
          name: 'filter1',
          filter: {
            ...discreteFilter,
            filterValues: [2, 3],
          },
        })
      );
    });
  });

  it('adds includeUndefined to filter if toggled in modal', async () => {
    const fixture = createComponent();
    store.overrideSelector(
      hparamsSelectors.getDashboardHparamFilterMap,
      fakeFilterMap
    );
    const loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();

    const chipHarness = await loader.getHarness(
      MatChipHarness.with({text: 'filter1'})
    );
    const chip = await chipHarness.host();
    await chip.click();
    fixture.detectChanges();
    fixture.debugElement
      .query(By.directive(FilterDialog))
      .componentInstance.includeUndefinedToggled.emit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      hparamsActions.dashboardHparamFilterAdded({
        name: 'filter1',
        filter: {
          ...discreteFilter,
          includeUndefined: false,
        },
      })
    );
  });
});
