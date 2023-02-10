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
import {NotificationCenterDataSource} from './backend_types';
import {TBNotificationCenterDataSource} from './notification_center_data_source';
import {buildNotification, buildNotificationResponse} from './testing';

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

  it('filters empty notifications', () => {
    const resultSpy = jasmine.createSpy();
    dataSource.fetchNotifications().subscribe(resultSpy);
    const req = httpMock.expectOne('/data/notifications');
    req.flush({notifications: [{}]});

    expect(resultSpy).toHaveBeenCalledWith({notifications: []});
  });

  it('fetches non-empty notifications', () => {
    const resultSpy = jasmine.createSpy();
    dataSource.fetchNotifications().subscribe(resultSpy);
    const req = httpMock.expectOne('/data/notifications');
    req.flush(buildNotificationResponse());

    expect(resultSpy).toHaveBeenCalledWith(buildNotificationResponse());
  });

  it('throws error when notification fetch failed', () => {
    const error = new ErrorEvent('Request failed');
    const errorResponse = {
      url: '/data/notifications',
      status: 123,
      statusText: 'something went wrong',
    };
    const resultSpy = jasmine.createSpy();
    const errorSpy = jasmine.createSpy();

    dataSource.fetchNotifications().subscribe(resultSpy, errorSpy);
    httpMock.expectOne('/data/notifications').error(error, errorResponse);

    const httpErrorResponse = new HttpErrorResponse({
      error,
      ...errorResponse,
    });
    expect(resultSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(httpErrorResponse);
  });

  it('filters notifications from the future', () => {
    jasmine.clock().mockDate(new Date('2000-01-31 07:00'));
    const resultSpy = jasmine.createSpy();
    dataSource.fetchNotifications().subscribe(resultSpy);
    const req = httpMock.expectOne('/data/notifications');
    req.flush(
      buildNotificationResponse([
        buildNotification({
          dateInMs: new Date('2000-01-31 07:00').getTime(),
        }),
        buildNotification({
          dateInMs: new Date('2000-01-31 06:59').getTime(),
        }),
        buildNotification({
          dateInMs: new Date('2000-01-31 07:01').getTime(),
        }),
        buildNotification({
          dateInMs: new Date('2000-01-31 06:58').getTime(),
        }),
      ])
    );

    expect(resultSpy).toHaveBeenCalledOnceWith(
      buildNotificationResponse([
        buildNotification({
          dateInMs: new Date('2000-01-31 07:00').getTime(),
        }),
        buildNotification({
          dateInMs: new Date('2000-01-31 06:59').getTime(),
        }),
        buildNotification({
          dateInMs: new Date('2000-01-31 06:58').getTime(),
        }),
      ])
    );
  });
});
