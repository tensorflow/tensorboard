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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { benchmark, Size } from './spec.js';
import { polymerFlush } from './polymer_util.js';
function createScalarPoint(index, scalarValue) {
    return {
        step: index,
        wall_time: index * 1000,
        scalar: scalarValue,
    };
}
const DATA_POINTS = {
    sine1k: [...new Array(1000)].map((_, index) => createScalarPoint(index, Math.sin(index / (2 * Math.PI)))),
    cosine1k: [...new Array(1000)].map((_, index) => createScalarPoint(index, Math.cos(index / (2 * Math.PI)))),
    cosine100k: [...new Array(100000)].map((_, index) => createScalarPoint(index, Math.cos(index / (2 * Math.PI)))),
};
const FIVE_HUNDRED_1K_DATA_POINTS = [...new Array(500)].map((_, index) => {
    const paddedIndex = String(index).padStart(5, '0');
    const name = `p${paddedIndex};`;
    return {
        name,
        data: [...new Array(1000)].map((_, index) => createScalarPoint(index, Math.sin(index / (2 * Math.PI)) + Math.random() - 0.5)),
    };
});
benchmark({
    name: 'charts init',
    size: Size.LARGE,
    run(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            context.chart.setVisibleSeries([]);
            context.chart.commitChanges();
            yield polymerFlush();
        });
    },
    afterEach(context) {
        context.container.removeChild(context.chart);
    },
});
benchmark({
    name: 'charts init + 1k point draw',
    size: Size.LARGE,
    run(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            context.chart.setSeriesData('sine', DATA_POINTS.sine1k);
            context.chart.setVisibleSeries(['sine']);
            context.chart.commitChanges();
            yield polymerFlush();
        });
    },
    afterEach(context) {
        context.container.removeChild(context.chart);
    },
});
benchmark({
    name: 'redraw: one line of 1k draws',
    size: Size.SMALL,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            context.chart.setSeriesData('sine', DATA_POINTS.sine1k);
            context.chart.setVisibleSeries(['sine']);
            context.chart.commitChanges();
            yield polymerFlush();
        });
    },
    run(context) {
        context.chart.redraw();
    },
});
benchmark({
    name: 'redraw: one line of 100k draws',
    size: Size.LARGE,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            context.chart.setSeriesData('cosine', DATA_POINTS.cosine100k);
            context.chart.setVisibleSeries(['cosine']);
            context.chart.commitChanges();
            yield polymerFlush();
        });
    },
    run(context) {
        context.chart.redraw();
    },
});
benchmark({
    name: 'redraw: alternative two 1k lines',
    size: Size.MEDIUM,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            context.chart.setSeriesData('sine', DATA_POINTS.sine1k);
            context.chart.setSeriesData('cosine', DATA_POINTS.cosine1k);
            context.chart.setVisibleSeries(['cosine']);
            context.chart.commitChanges();
            context.even = true;
            yield polymerFlush();
        });
    },
    run(context) {
        if (context.even) {
            context.chart.setVisibleSeries(['sine']);
        }
        else {
            context.chart.setVisibleSeries(['cosine']);
        }
        context.even = !context.even;
    },
});
benchmark({
    name: 'redraw: 500 lines of 1k points',
    size: Size.LARGE,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            FIVE_HUNDRED_1K_DATA_POINTS.forEach(({ data, name }) => {
                context.chart.setSeriesData(name, data);
            });
            context.chart.setVisibleSeries(FIVE_HUNDRED_1K_DATA_POINTS.map(({ name }) => name));
            context.chart.commitChanges();
            yield polymerFlush();
        });
    },
    run(context) {
        context.chart.redraw();
    },
});
benchmark({
    name: 'make new chart: 10 lines of 1k points',
    size: Size.MEDIUM,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            const datapoints = FIVE_HUNDRED_1K_DATA_POINTS.slice(0, 10);
            datapoints.forEach(({ data, name }) => {
                context.chart.setSeriesData(name, data);
            });
            context.chart.setVisibleSeries(datapoints.map(({ name }) => name));
            context.chart.commitChanges();
            yield polymerFlush();
            context.index = 0;
        });
    },
    run(context) {
        if (context.index % 4 === 0) {
            context.chart.xType = 'step';
        }
        else if (context.index % 4 === 1) {
            context.chart.xType = 'relative';
        }
        else if (context.index % 4 === 2) {
            context.chart.xType = 'wall_time';
        }
        else {
            context.chart.xType = '';
        }
        context.index++;
    },
});
benchmark({
    name: 'redraw 100 charts (1k points)',
    size: Size.LARGE,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.charts = FIVE_HUNDRED_1K_DATA_POINTS.slice(0, 100).map(({ data, name }) => {
                const chart = document.createElement('vz-line-chart2');
                chart.style.height = '50px';
                context.container.appendChild(chart);
                chart.setSeriesData(name, data);
                chart.setVisibleSeries([name]);
                chart.commitChanges();
                return chart;
            });
            yield polymerFlush();
        });
    },
    run(context) {
        context.charts.forEach((chart) => {
            chart.redraw();
        });
    },
});
benchmark({
    name: 'toggle run on 100 charts (1k points)',
    size: Size.MEDIUM,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.names = context.charts = FIVE_HUNDRED_1K_DATA_POINTS.slice(0, 100).map(({ name }) => name);
            context.charts = FIVE_HUNDRED_1K_DATA_POINTS.slice(0, 100).map(({ data, name }) => {
                const chart = document.createElement('vz-line-chart2');
                chart.style.height = '50px';
                context.container.appendChild(chart);
                chart.setSeriesData(name, data);
                chart.commitChanges();
                return chart;
            });
            yield polymerFlush();
        });
    },
    run(context) {
        return __awaiter(this, void 0, void 0, function* () {
            yield context.flushAsync();
            context.charts.forEach((chart) => {
                chart.setVisibleSeries([]);
            });
            context.chart.commitChanges();
            yield context.flushAsync();
            context.charts.forEach((chart, index) => {
                chart.setVisibleSeries([context.names[index]]);
            });
            context.chart.commitChanges();
            yield context.flushAsync();
        });
    },
});
benchmark({
    name: 'smoothing change: 1k points',
    size: Size.MEDIUM,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            context.chart.setSeriesData('cosine', DATA_POINTS.cosine1k);
            context.chart.setVisibleSeries(['cosine']);
            context.chart.commitChanges();
            context.chart.smoothingEnabled = true;
            context.even = true;
            yield polymerFlush();
        });
    },
    run(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (context.even) {
                context.chart.smoothingWeight = 0.8;
            }
            else {
                context.chart.smoothingWeight = 0.2;
            }
            context.even = !context.even;
        });
    },
});
benchmark({
    name: 'smoothing change: 100k points',
    size: Size.MEDIUM,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.appendChild(context.chart);
            context.chart.setSeriesData('cosine', DATA_POINTS.cosine100k);
            context.chart.setVisibleSeries(['cosine']);
            context.chart.commitChanges();
            context.chart.smoothingEnabled = true;
            context.even = true;
            yield polymerFlush();
        });
    },
    run(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (context.even) {
                context.chart.smoothingWeight = 0.8;
            }
            else {
                context.chart.smoothingWeight = 0.2;
            }
            context.even = !context.even;
        });
    },
});
benchmark({
    name: 'smoothing change: 100k points: large screen (1200x1000)',
    size: Size.LARGE,
    before(context) {
        return __awaiter(this, void 0, void 0, function* () {
            context.chart = document.createElement('vz-line-chart2');
            context.chart.style.height = '100%';
            context.container.style.width = '1200px';
            context.container.style.height = '1000px';
            context.container.appendChild(context.chart);
            context.chart.setSeriesData('cosine', DATA_POINTS.cosine100k);
            context.chart.setVisibleSeries(['cosine']);
            context.chart.commitChanges();
            context.chart.smoothingEnabled = true;
            context.even = true;
            yield polymerFlush();
        });
    },
    run(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (context.even) {
                context.chart.smoothingWeight = 0.8;
            }
            else {
                context.chart.smoothingWeight = 0.2;
            }
            context.even = !context.even;
        });
    },
});
