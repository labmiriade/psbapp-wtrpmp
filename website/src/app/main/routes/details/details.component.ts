import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { PlaceInfo } from 'src/app/core/interfaces/api.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from 'src/app/store/reducers';
import { searchKeywords, searchLoadingLike, searchPlace, searchPlaceById } from 'src/app/store/selectors/main.selector';
import { Pin } from 'src/app/shared/components/aws-map-viewer/aws-map-viewer.component';
import { map, take } from 'rxjs/operators';
import * as maplibregl from 'maplibre-gl';
import { like, searchById, searchFailedById } from 'src/app/store/actions/main.actions';
import { Actions, ofType } from '@ngrx/effects';
import { ToastService, ToastType } from 'src/app/core/services/toast.service';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent implements OnInit, OnDestroy {
  private sub: Subscription;
  placeId: string;
  place$?: Observable<PlaceInfo | undefined>;
  mapPin: Observable<Pin[]> | undefined;
  loading$: Observable<boolean>;
  isLiked: boolean = false;

  constructor(
    private action$: Actions,
    private router: Router,
    private toast: ToastService,
    private activatedRoute: ActivatedRoute,
    private store: Store<AppState>,
  ) {
    this.sub = new Subscription();
    this.placeId = '';
    this.loading$ = this.store.select(searchLoadingLike());
  }

  ngOnInit(): void {
    this.sub.add(
      this.activatedRoute.params.subscribe((params) => {
        this.placeId = params.placeId;
        this.place$ = this.store.select(searchPlace(this.placeId));
        this.sub.add(
          this.place$.subscribe((place) => {
            if (place === undefined) {
              this.getPlaceById();
            }
          }),
        );
        this.mapPin = this.getPin();
      }),
    );
    if (this.placeId && localStorage.getItem(this.placeId) === '1') this.isLiked = true;
  }

  getPlaceById(): void {
    this.store.dispatch(searchById({ placeId: this.placeId }));

    this.place$ = this.store.select(searchPlaceById());

    this.sub.add(
      this.action$.pipe(ofType(searchFailedById)).subscribe((props) => {
        if (props.placeId === this.placeId) {
          this.toast.show('Errore', 'La fontanella cercata non esiste', ToastType.Danger);

          this.router.navigate(['/search'], {
            queryParams: {
              q: '',

              geo: '0',
            },
          });
        }
      }),
    );
  }

  get street(): Observable<string> | undefined {
    return this.place$?.pipe(
      map((place) => {
        let ret: string = '';
        if (place?.streetName) {
          let streetNumber: string = place.streetNumber ? ', ' + place.streetNumber : '';
          ret = place.streetName + streetNumber;
        }
        return ret;
      }),
    );
  }

  get city(): Observable<string> | undefined {
    return this.place$?.pipe(
      map((place) => {
        let ret: string = '';
        if (place?.city) {
          let province: string = place.province ? ', ' + place.province : '';
          ret = place.city + province;
        }
        return ret;
      }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  getPin(): Observable<Pin[]> | undefined {
    return this.place$?.pipe(
      map((place) => {
        let pins: Pin[] = [];
        if (place?.lat !== undefined && place?.lon !== undefined && place.lat !== '' && place.lon !== '') {
          const pin: maplibregl.LngLatLike = [parseFloat(place.lon), parseFloat(place.lat)];
          let mapPin: Pin = {
            pos: pin,
          };
          pins.push(mapPin);
        }
        return pins;
      }),
    );
  }

  onSearchClick() {
    this.sub.add(
      this.store
        .select(searchKeywords())
        .pipe(take(1))
        .subscribe((keys) => {
          this.router.navigate(['/search'], {
            queryParams: {
              q: keys.key,
              geo: keys.geo ? keys.geo : '0',
            },
          });
        }),
    );
  }

  onLikeClick(): void {
    this.placeId ? this.store.dispatch(like({ id: this.placeId })) : null;
  }
}
