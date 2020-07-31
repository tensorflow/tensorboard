import {
  TagListing,
  AnnotationListing,
  MetricListing,
  ValueListing,
} from './../store/npmi_types';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {TBHttpClient} from '../../../webapp_data_source/tb_http_client';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

export abstract class NpmiDataSource {
  abstract fetchRuns(): Observable<string[]>;
  abstract fetchAnnotations(): Observable<AnnotationListing>;
  abstract fetchMetrics(): Observable<MetricListing>;
  abstract fetchValues(): Observable<ValueListing>;
}

@Injectable()
export class NpmiHttpServerDataSource implements NpmiDataSource {
  private readonly httpPathPrefix = 'data/plugin/npmi';

  constructor(private http: TBHttpClient) {}

  fetchRuns() {
    return this.http.get<string[]>(this.httpPathPrefix + '/runs');
  }

  fetchAnnotations() {
    return this.http.get<AnnotationListing>(
      this.httpPathPrefix + '/annotations'
    );
  }

  fetchMetrics() {
    return this.http.get<MetricListing>(this.httpPathPrefix + '/metrics');
  }

  fetchValues() {
    return this.http.get<ValueListing>(this.httpPathPrefix + '/values');
  }
}
