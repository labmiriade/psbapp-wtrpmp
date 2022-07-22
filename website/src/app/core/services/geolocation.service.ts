import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PositionSearchResponse, TextSearchResponse } from '../interfaces/api.interface';

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private TIMEOUT_MS = 30 * 1000;

  constructor(private http: HttpClient) {}

  getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('geolocation is null');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (result) => resolve(result),
        (error) => reject(error),
        options ?? { timeout: this.TIMEOUT_MS },
      );
    });
  }

  getCoordinatesFromDate(text: string): Observable<TextSearchResponse> {
    const params = new URLSearchParams();
    params.append('text', text);
    return this.http.get<TextSearchResponse>(`/search/location/text?${params.toString()}`);
  }

  getDateFromCoordinates(lat: string, lon: string): Observable<PositionSearchResponse> {
    const params = new URLSearchParams();
    params.append('lat', lat);
    params.append('lon', lon);
    return this.http.get<PositionSearchResponse>(`/search/location/position?${params.toString()}`);
  }
}
