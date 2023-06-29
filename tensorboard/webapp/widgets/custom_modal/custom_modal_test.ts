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
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {CustomModalComponent} from './custom_modal_component';
import {CommonModule} from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';

function waitFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

@Component({
  selector: 'testable-modal',
  template: `<custom-modal #modal (onOpen)="setOpen()" (onClose)="setClosed()">
    <div>My great content</div>
  </custom-modal> `,
})
class TestableComponent {
  @ViewChild('modal', {static: false})
  modalComponent!: CustomModalComponent;

  @ViewChild('content', {static: false})
  content!: ElementRef;

  isOpen = false;

  @Output() onOpen = new EventEmitter();
  @Output() onClose = new EventEmitter();

  setOpen() {
    this.isOpen = true;
    this.onOpen.emit();
  }

  setClosed() {
    this.isOpen = false;
    this.onClose.emit();
  }

  close() {
    this.modalComponent.close();
  }

  getContentStyle() {
    return (this.modalComponent as any).content.nativeElement.style;
  }

  public openAtPosition(position: {x: number; y: number}) {
    this.modalComponent.openAtPosition(position);
  }
}

describe('custom modal', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, CustomModalComponent],
      imports: [CommonModule],
    }).compileComponents();
  });

  it('waits a frame before emitting onOpen or onClose', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.detectChanges();
    fixture.componentInstance.openAtPosition({x: 0, y: 0});
    expect(fixture.componentInstance.isOpen).toBeFalse();
    await waitFrame();
    expect(fixture.componentInstance.isOpen).toBeTrue();
    fixture.componentInstance.close();
    fixture.detectChanges();
    await waitFrame();
    expect(fixture.componentInstance.isOpen).toBeFalse();
  });

  describe('openAtPosition', () => {
    it('applies top and left offsets', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();
      fixture.componentInstance.openAtPosition({x: 20, y: 10});
      expect(fixture.componentInstance.getContentStyle().top).toEqual('10px');
      expect(fixture.componentInstance.getContentStyle().left).toEqual('20px');
    });

    it('emits onOpen', async () => {
      const fixture = TestBed.createComponent(TestableComponent);
      const spy = spyOn(fixture.componentInstance.onOpen, 'emit');
      fixture.detectChanges();
      fixture.componentInstance.openAtPosition({x: 20, y: 10});
      expect(spy).not.toHaveBeenCalled();
      await waitFrame();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('closing behavior', () => {
    let fixture: ComponentFixture<TestableComponent>;
    beforeEach(async () => {
      fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();
      fixture.componentInstance.openAtPosition({x: 0, y: 0});
      await waitFrame();
    });

    it('closes when escape key is pressed', async () => {
      expect(fixture.componentInstance.isOpen).toBeTrue();
      const event = new KeyboardEvent('keydown', {key: 'escape'});
      document.dispatchEvent(event);
      await waitFrame();

      expect(fixture.componentInstance.isOpen).toBeFalse();
    });

    it('closes when user clicks outside modal', async () => {
      expect(fixture.componentInstance.isOpen).toBeTrue();
      document.body.click();
      await waitFrame();

      expect(fixture.componentInstance.isOpen).toBeFalse();
    });
  });

  describe('ensures content is always within the window', () => {
    beforeEach(() => {
      window.innerHeight = 1000;
      window.innerWidth = 1000;
    });

    it('sets left to 0 if less than 0', async () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();
      fixture.componentInstance.openAtPosition({x: -10, y: 0});
      expect(fixture.componentInstance.isOpen).toBeFalse();
      await waitFrame();
      fixture.detectChanges();

      const content = fixture.debugElement.query(By.css('.content'));
      expect(content.nativeElement.style.left).toEqual('0px');
    });

    it('sets top to 0 if less than 0', async () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();
      fixture.componentInstance.openAtPosition({x: 0, y: -10});
      expect(fixture.componentInstance.isOpen).toBeFalse();
      await waitFrame();
      fixture.detectChanges();

      const content = fixture.debugElement.query(By.css('.content'));
      expect(content.nativeElement.style.top).toEqual('0px');
    });

    it('sets left to maximum if content overflows the window', async () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();
      fixture.componentInstance.openAtPosition({x: 1010, y: 0});
      expect(fixture.componentInstance.isOpen).toBeFalse();
      await waitFrame();
      fixture.detectChanges();
      const content = fixture.debugElement.query(By.css('.content'));
      // While rendering in a test the elements width and height will appear to be 0.
      expect(content.nativeElement.style.left).toEqual('1000px');
    });

    it('sets top to maximum if content overflows the window', async () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.detectChanges();
      fixture.componentInstance.openAtPosition({x: 0, y: 1010});
      expect(fixture.componentInstance.isOpen).toBeFalse();
      await waitFrame();
      fixture.detectChanges();
      const content = fixture.debugElement.query(By.css('.content'));
      // While rendering in a test the elements width and height will appear to be 0.
      expect(content.nativeElement.style.top).toEqual('1000px');
    });
  });
});
