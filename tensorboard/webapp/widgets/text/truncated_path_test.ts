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

import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {TruncatedPathComponent} from './truncated_path_component';

describe('truncated path', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TruncatedPathComponent],
    }).compileComponents();
  });

  describe('render', () => {
    it('renders properly', () => {
      const fixture = TestBed.createComponent(TruncatedPathComponent);
      fixture.componentInstance.value = 'foo';
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('foo');
    });

    it('splits text based on last slash piece', () => {
      const fixture = TestBed.createComponent(TruncatedPathComponent);
      fixture.componentInstance.value = 'abc/def/ghi/jkl/mno';
      fixture.detectChanges();

      const firstPart = fixture.debugElement.query(By.css('.first-text-part'));
      const secondPart = fixture.debugElement.query(
        By.css('.second-text-part')
      );

      expect(fixture.nativeElement.textContent).toBe('abc/def/ghi/jkl/mno');
      expect(firstPart.nativeElement.textContent).toBe('abc/def/ghi/jkl');
      expect(secondPart.nativeElement.textContent).toBe('/mno');
    });

    it('does not split a text without slashes', () => {
      const fixture = TestBed.createComponent(TruncatedPathComponent);
      fixture.componentInstance.value = 'abcdefghijabcdefghijabcdefghij';
      fixture.detectChanges();

      const firstPart = fixture.debugElement.query(By.css('.first-text-part'));
      const secondPart = fixture.debugElement.query(
        By.css('.second-text-part')
      );

      expect(firstPart).not.toBeTruthy();
      expect(fixture.nativeElement.textContent).toBe(
        'abcdefghijabcdefghijabcdefghij'
      );
      expect(secondPart.nativeElement.textContent).toBe(
        'abcdefghijabcdefghijabcdefghij'
      );
    });

    it('splits short text that contains no slashes', () => {
      const fixture = TestBed.createComponent(TruncatedPathComponent);
      fixture.componentInstance.value = 'abcdefghijklmno';
      fixture.detectChanges();

      const firstPart = fixture.debugElement.query(By.css('.first-text-part'));
      const secondPart = fixture.debugElement.query(
        By.css('.second-text-part')
      );

      expect(firstPart).not.toBeTruthy();
      expect(fixture.nativeElement.textContent).toBe('abcdefghijklmno');
      expect(secondPart.nativeElement.textContent).toBe('abcdefghijklmno');
    });
  });
});
