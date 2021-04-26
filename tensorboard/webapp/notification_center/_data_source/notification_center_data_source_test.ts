/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

import {HttpErrorResponse} from '../../webapp_data_source/tb_http_client';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from '../../webapp_data_source/tb_http_client_testing';
import {
  NotificationCenterDataSource,
  NOTIFICATION_LAST_READ_TIME_KEY,
} from './backend_types';
import {TBNotificationCenterDataSource} from './notification_center_data_source';
import {buildNotificationResponse} from './testing';
import {throwError} from 'rxjs';

describe('TBNotificationCenterDataSource test', () => {
  let httpMock: HttpTestingController;
  let dataSource: NotificationCenterDataSource;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        {
          provide: NotificationCenterDataSource,
          useClass: TBNotificationCenterDataSource,
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    dataSource = TestBed.inject(NotificationCenterDataSource);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches empty notifications', () => {
    const resultSpy = jasmine.createSpy();
    dataSource.fetchNotifications().subscribe(resultSpy);
    const req = httpMock.expectOne('data/notifications');
    req.flush({notifications: [{}]});

    expect(resultSpy).toHaveBeenCalledWith({notifications: [{}]});
  });

  it('fetches non-empty notifications', () => {
    const resultSpy = jasmine.createSpy();
    dataSource.fetchNotifications().subscribe(resultSpy);
    const req = httpMock.expectOne('data/notifications');
    req.flush(buildNotificationResponse());

    expect(resultSpy).toHaveBeenCalledWith(buildNotificationResponse());
  });

  it('throws error when notification fetch failed', () => {
    const error = new ErrorEvent('Request failed');
    const errorResponse = {
      url: 'data/notifications',
      status: 123,
      statusText: 'something went wrong',
    };
    const resultSpy = jasmine.createSpy();
    const errorSpy = jasmine.createSpy();

    dataSource.fetchNotifications().subscribe(resultSpy, errorSpy);
    httpMock.expectOne('data/notifications').error(error, errorResponse);

    const httpErrorResponse = new HttpErrorResponse({
      error,
      ...errorResponse,
    });
    expect(resultSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(httpErrorResponse);
  });

  describe('LastReadTimestamp in local storage test', () => {
    const INIT_LAST_READ_TIME_STAMP_STRING = '31412';
    const UPADED_TIME_STAMP_STRING = '1235813';
    let testTimeStampString = '-1';
    let mocklocalStorage: {[key: string]: string};

    beforeEach(async () => {
      spyOn(window.localStorage, 'setItem').and.callFake(
        (key: string, value: string): string => {
          testTimeStampString = UPADED_TIME_STAMP_STRING;
          return (mocklocalStorage[key] = UPADED_TIME_STAMP_STRING);
        }
      );
      spyOn(localStorage, 'getItem').and.callFake((key: string):
        | string
        | null => {
        return mocklocalStorage[key] ?? null;
      });

      mocklocalStorage = {
        [NOTIFICATION_LAST_READ_TIME_KEY]: INIT_LAST_READ_TIME_STAMP_STRING,
      };
    });

    it('updates last read timestamp in local storge', () => {
      const resultSpy = jasmine.createSpy();
      dataSource.updateLastReadTimeStampToNow().subscribe(resultSpy);

      expect(testTimeStampString).toBe(UPADED_TIME_STAMP_STRING);
    });

    it('gets initial last read timestamp in local storge', () => {
      const resultSpy = jasmine.createSpy();
      dataSource.getLastReadTimeStampInMs().subscribe(resultSpy);

      expect(resultSpy).toHaveBeenCalledWith(
        Number(INIT_LAST_READ_TIME_STAMP_STRING)
      );
    });

    it('gets updated last read timestamp in local storge', () => {
      const resultSpy = jasmine.createSpy();
      dataSource.updateLastReadTimeStampToNow();
      dataSource.getLastReadTimeStampInMs().subscribe(resultSpy);

      expect(resultSpy).toHaveBeenCalledWith(1235813);
    });
  });
});
