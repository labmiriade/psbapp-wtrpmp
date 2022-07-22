import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { /*CategoriesList,*/ PlaceInfo, PlaceList } from '../interfaces/api.interface';

@Injectable({
  providedIn: 'root',
})
export class MainService {
  constructor(private http: HttpClient) {}

  search(q: string, near?: string, cat?: string): Observable<PlaceList> {
    const params = new URLSearchParams();
    params.append('q', q);
    if (near) {
      params.append('near', near);
    }
    if (cat) {
      params.append('cat', cat);
    }
    return this.http.get<PlaceList>(`/search/p?${params.toString()}`);
  }

  getPlace(placeId: string): Observable<PlaceInfo> {
    return this.http.get<PlaceInfo>(`/p/${placeId}`);
  }

  putLike(placeId: string): Observable<PlaceInfo> {
    return this.http.put<PlaceInfo>(`/p/${placeId}/like`, null);
  }

  postAddPlace(description: string, address: string, lat?: string, lon?: string): Observable<void> {
    return this.http.post<void>(`/p`, { description: description, address: address, lat: lat, lon: lon });
  }
  /*getCategories(): Observable<CategoriesList> {
    return this.http.get<CategoriesList>('/categories');
  }*/
}
