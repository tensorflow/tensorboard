/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
// Angular 9+ using Ivy apps that potentially do i18n, even transitively, must
// import this module, which adds a global symbol at runtime.
// https://angular.io/guide/migration-localize
import '@angular/localize/init';
import {platformBrowser} from '@angular/platform-browser';
import 'zone.js/dist/zone.js'; // Angular runtime dep
import {AppModule} from './app_module';

// Bootstrap needs to happen after body is ready but we cannot reliably
// controls the order in which script gets loaded (Vulcanization inlines
// the script in <head>). Also, requirejs used by the dev asset bundling
// internally seem to bootstrap the entry point after the document is ready.
if (document.readyState !== 'loading') {
  platformBrowser().bootstrapModule(AppModule);
} else {
  window.addEventListener('DOMContentLoaded', () => {
    platformBrowser().bootstrapModule(AppModule);
  });
}
