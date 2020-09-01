import {AnnotationDataListing} from '../store/npmi_types';
import {violinData} from './violin_data';

class TestableBin extends Array<number | any> {
  x0: number;
  x1: number;
  constructor(array: number[] | any[], x0: number, x1: number) {
    if (array.length === 1) {
      super();
      this.push(array[0]);
    } else {
      super(...array);
    }
    this.x0 = x0;
    this.x1 = x1;
  }
}

describe('violin data utils', () => {
  it('creates violin data containing only selected metric and active runs', () => {
    const annotationData: AnnotationDataListing = {
      annotation_1: [
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'run_1',
          nPMIValue: 0.5178,
          countValue: 100,
        },
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'run_2',
          nPMIValue: 0.02157,
          countValue: 101,
        },
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'run_3',
          nPMIValue: -0.1,
          countValue: 53,
        },
        {
          annotation: 'annotation_1',
          metric: 'other',
          run: 'run_3',
          nPMIValue: -0.1,
          countValue: 53,
        },
      ],
      annotation_2: [
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'run_1',
          nPMIValue: null,
          countValue: 572,
        },
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'run_2',
          nPMIValue: 0.351,
          countValue: 101,
        },
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'run_3',
          nPMIValue: 0.1,
          countValue: 53,
        },
        {
          annotation: 'annotation_2',
          metric: 'other',
          run: 'run_3',
          nPMIValue: 0.1,
          countValue: 53,
        },
      ],
    };
    const activeRuns = ['run_1', 'run_3'];
    const metric = 'nPMI@test';
    const data = violinData(annotationData, activeRuns, metric);
    expect(data.extremes).toEqual({min: -0.1, max: 0.5178});
    expect(data.violinData).toEqual({
      run_1: [
        new TestableBin([null], -Infinity, Infinity),
        new TestableBin([], -0.1, 0),
        new TestableBin([], 0, 0.5),
        new TestableBin([0.5178], 0.5, 0.5178),
      ],
      run_3: [
        new TestableBin([-0.1], -0.1, 0),
        new TestableBin([0.1], 0, 0.2),
        new TestableBin([], 0.2, 0.4),
        new TestableBin([], 0.4, 0.5178),
      ],
    });
  });
});
