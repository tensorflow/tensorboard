import {NgModule} from '@angular/core';

import {InactiveComponent} from './inactive_component';
import {InactiveContainer} from './inactive_container';

@NgModule({
  declarations: [InactiveComponent, InactiveContainer],
  exports: [InactiveContainer],
})
export class InactiveModule {}
