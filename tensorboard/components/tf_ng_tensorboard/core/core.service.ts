import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {PluginsListing} from '../types/api';

import * as _typeHackRxjs from 'rxjs';

@Injectable()
export class CoreService {
  constructor(private http: HttpClient) {}

  fetchPluginsListing() {
    return this.http.get<PluginsListing>('data/plugins_listing');
  }
}
