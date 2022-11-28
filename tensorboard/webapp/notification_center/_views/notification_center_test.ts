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
import {CommonModule} from '@angular/common';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {MatIconTestingModule} from '../../testing/mat_icon_module';
import * as actions from '../_redux/notification_center_actions';
import * as selectors from '../_redux/notification_center_selectors';
import {CategoryEnum} from '../_redux/notification_center_types';
import {NotificationCenterComponent} from './notification_center_component';
import {NotificationCenterContainer} from './notification_center_container';

describe('notification center', () => {
  let store: MockStore<State>;
  let recordedActions: Action[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        MatButtonModule,
        MatMenuModule,
        MatIconTestingModule,
        NoopAnimationsModule,
      ],
      declarations: [NotificationCenterContainer, NotificationCenterComponent],
      providers: [
        provideMockStore({
          initialState: [],
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    recordedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      recordedActions.push(action);
    });
    store.overrideSelector(selectors.getNotifications, []);
    store.overrideSelector(selectors.getLastReadTime, 0);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('loads notification module', () => {
    store.overrideSelector(selectors.getNotifications, [
      {
        category: CategoryEnum.WHATS_NEW,
        dateInMs: 1579766400000,
        title: 'test title',
        content: 'test content',
      },
    ]);
    const fixture = TestBed.createComponent(NotificationCenterContainer);
    fixture.detectChanges();

    const menuButton = fixture.debugElement.query(
      By.css('[aria-label="Display notification messages"]')
    );
    menuButton.nativeElement.click();
    fixture.detectChanges();

    const notificationMenu = fixture.debugElement.query(
      By.css('.notification-menu')
    );

    expect(notificationMenu).toBeTruthy();
    expect(
      notificationMenu.nativeNode.querySelector('.title').textContent
    ).toBe('test title');
    expect(
      notificationMenu.nativeNode.querySelector('.category-icon').textContent
    ).toBe('info_outline_24px');
    const markdownContentComponent =
      notificationMenu.nativeNode.querySelector('.content');
    expect(markdownContentComponent.markdown).toBe('test content');
  });

  it('appears when unread notifications exist', () => {
    const fixture = TestBed.createComponent(NotificationCenterContainer);
    fixture.detectChanges();

    const menuButton = fixture.debugElement.query(
      By.css('[aria-label="Display notification messages"]')
    );
    menuButton.nativeElement.click();
    fixture.detectChanges();

    expect(recordedActions[0]).toEqual(actions.notificationBellClicked());
  });

  describe('unread dot (red dot)', () => {
    it('appears when unread notifications exist', () => {
      store.overrideSelector(selectors.getNotifications, [
        {
          category: CategoryEnum.WHATS_NEW,
          dateInMs: 1,
          title: 'test title',
          content: 'test content',
        },
      ]);
      store.overrideSelector(selectors.getLastReadTime, 0);
      const fixture = TestBed.createComponent(NotificationCenterContainer);
      fixture.detectChanges();

      const reddot = fixture.debugElement.query(By.css('.red-dot'));
      expect(reddot).toBeTruthy();
    });

    it('does not appear when no unread notifications', () => {
      store.overrideSelector(selectors.getNotifications, [
        {
          category: CategoryEnum.WHATS_NEW,
          dateInMs: 0,
          title: 'test title',
          content: 'test content',
        },
      ]);
      store.overrideSelector(selectors.getLastReadTime, 1);
      const fixture = TestBed.createComponent(NotificationCenterContainer);
      fixture.detectChanges();

      const reddot = fixture.debugElement.query(By.css('.red-dot'));
      expect(reddot).toBeNull();
    });
  });
  describe('full note link', () => {
    it('appears when the link is provided', () => {
      store.overrideSelector(selectors.getNotifications, [
        {
          category: CategoryEnum.WHATS_NEW,
          dateInMs: 1,
          title: 'test title',
          content: 'test content',
          fullNoteLink: 'https://google.com',
        },
      ]);
      const fixture = TestBed.createComponent(NotificationCenterContainer);
      fixture.detectChanges();
      const menuButton = fixture.debugElement.query(
        By.css('[aria-label="Display notification messages"]')
      );
      menuButton.nativeElement.click();
      fixture.detectChanges();

      const linkElement = fixture.debugElement.query(
        By.css('.extended-buttons a')
      );

      expect(linkElement).toBeTruthy();
      expect(linkElement.nativeElement.href).toEqual('https://google.com/');
    });

    it('does not appear when the link is provided', () => {
      store.overrideSelector(selectors.getNotifications, [
        {
          category: CategoryEnum.WHATS_NEW,
          dateInMs: 1,
          title: 'test title',
          content: 'test content',
        },
      ]);
      const fixture = TestBed.createComponent(NotificationCenterContainer);
      fixture.detectChanges();

      const menuButton = fixture.debugElement.query(
        By.css('[aria-label="Display notification messages"]')
      );
      menuButton.nativeElement.click();
      fixture.detectChanges();

      const linkElement = fixture.debugElement.query(
        By.css('.extended-buttons a')
      );

      expect(linkElement).toBeNull();
    });

    it('does not appear when the link is suspicious', () => {
      store.overrideSelector(selectors.getNotifications, [
        {
          category: CategoryEnum.WHATS_NEW,
          dateInMs: 1,
          title: 'test title',
          content: 'test content',
          fullNoteLink: "javascript:alert('hi')",
        },
      ]);
      const fixture = TestBed.createComponent(NotificationCenterContainer);
      fixture.detectChanges();

      const menuButton = fixture.debugElement.query(
        By.css('[aria-label="Display notification messages"]')
      );
      menuButton.nativeElement.click();
      fixture.detectChanges();

      const linkElement = fixture.debugElement.query(
        By.css('.extended-buttons a')
      );

      expect(linkElement).toBeTruthy();
      expect(linkElement.nativeElement.href).toContain('unsafe:');
    });
  });
});
