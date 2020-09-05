import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {ResultsDownloadComponent} from './results_download_component';
import {ResultsDownloadContainer} from './results_download_container';

@NgModule({
  declarations: [ResultsDownloadComponent, ResultsDownloadContainer],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    BrowserAnimationsModule,
  ],
  exports: [ResultsDownloadContainer],
})
export class ResultsDownloadModule {}
