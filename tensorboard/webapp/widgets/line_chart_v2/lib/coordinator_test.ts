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

import {Coordinator} from './coordinator';
import {createScale} from './scale';
import {ScaleType} from './scale_types';
import {ThreeCoordinator} from './threejs_coordinator';

describe('line_chart_v2/lib/coordinator test', () => {
  describe('base coordinator', () => {
    let coordinator: Coordinator;

    beforeEach(() => {
      coordinator = new Coordinator();
    });

    describe('state identifier', () => {
      [
        {
          updatingProp: 'xScale',
          updater: () =>
            void coordinator.setXScale(createScale(ScaleType.LOG10)),
        },
        {
          updatingProp: 'yScale',
          updater: () =>
            void coordinator.setYScale(createScale(ScaleType.LOG10)),
        },
        {
          updatingProp: 'viewBoxRect',
          updater: () => {
            coordinator.setViewBoxRect({
              x: 0,
              y: 0,
              width: 1000,
              height: 1000,
            });
          },
        },
        {
          updatingProp: 'domContainerRect',
          updater: () => {
            coordinator.setDomContainerRect({
              x: 0,
              y: 0,
              width: 500,
              height: 500,
            });
          },
        },
      ].forEach(({updatingProp, updater}) => {
        it(`updates updateIdentifier when setting ${updatingProp}`, () => {
          const before = coordinator.getUpdateIdentifier();
          updater();
          expect(coordinator.getUpdateIdentifier()).not.toBe(before);
        });
      });
    });

    describe('#getCurrentViewBoxRect', () => {
      it('returns currently set viewBox', () => {
        coordinator.setViewBoxRect({
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
        });
        expect(coordinator.getCurrentViewBoxRect()).toEqual({
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
        });
      });

      it('returns a default viewBox when viewBox is never set', () => {
        expect(coordinator.getCurrentViewBoxRect()).toEqual({
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        });
      });
    });

    describe('#transformDataToUiCoord', () => {
      beforeEach(() => {
        coordinator.setViewBoxRect({
          x: 50,
          y: 50,
          width: 100,
          height: 100,
        });
        coordinator.setDomContainerRect({
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
        });
      });

      // y-axis is flipped since data's origin assumes bottom-left as opposed to DOM's
      // coordinate system that has origin at top-left.
      it('converts the coordinate system with y-axis pointing down', () => {
        const layout = {
          x: 500,
          y: 250,
          width: 500,
          height: 500,
        };

        expect(coordinator.transformDataToUiCoord(layout, [50, 50])).toEqual([
          500, 750,
        ]);
        expect(coordinator.transformDataToUiCoord(layout, [150, 150])).toEqual([
          1000, 250,
        ]);

        // Outside of the viewBox.
        expect(coordinator.transformDataToUiCoord(layout, [0, 0])).toEqual([
          250, 1000,
        ]);
      });
    });
  });

  describe('ThreeCoordinator', () => {
    let coordinator: ThreeCoordinator;

    beforeEach(() => {
      coordinator = new ThreeCoordinator();
      coordinator.setViewBoxRect({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
      });
      coordinator.setDomContainerRect({
        x: 50,
        y: 50,
        width: 50,
        height: 50,
      });
    });

    describe('#transformDataToUiCoord', () => {
      it('converts with y-axis pointing up', () => {
        coordinator.setViewBoxRect({
          x: 50,
          y: 0,
          width: 100,
          height: 100,
        });
        coordinator.setDomContainerRect({
          x: 0,
          y: 0,
          width: 5,
          height: 5,
        });
        const layout = {
          x: 2,
          y: 0,
          width: 3,
          height: 5,
        };

        expect(coordinator.transformDataToUiCoord(layout, [50, 50])).toEqual([
          2, 2.5,
        ]);
        expect(coordinator.transformDataToUiCoord(layout, [150, 100])).toEqual([
          5, 5,
        ]);

        // Outside of the viewBox.
        expect(coordinator.transformDataToUiCoord(layout, [0, -100])).toEqual([
          0.5, -5,
        ]);
      });
    });
  });
});
