import {NgModule} from '@angular/core';
import {NpmiHttpServerDataSource} from './npmi_data_source';
import {TBHttpClientModule} from '../../../webapp_data_source/tb_http_client_module';

@NgModule({
  imports: [TBHttpClientModule],
  providers: [NpmiHttpServerDataSource],
})
export class NpmiServerDataSourceModule {}
