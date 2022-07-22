import { Input, Component, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { PlaceInfo } from 'src/app/core/interfaces/api.interface';
import { AppState } from 'src/app/store/reducers';
import { searchLoadingLike } from 'src/app/store/selectors/main.selector';

@Component({
  selector: 'app-search-card',
  templateUrl: './search-card.component.html',
  styleUrls: ['./search-card.component.scss'],
})
export class SearchCardComponent implements OnDestroy, OnInit {
  private sub: Subscription;
  @Input() place?: PlaceInfo;
  @Output() placeClick = new EventEmitter<PlaceInfo>();
  @Output() placeLike = new EventEmitter<PlaceInfo>();
  loading: boolean = false;
  isLiked: boolean = false;

  constructor(private store: Store<AppState>) {
    this.sub = new Subscription();
  }

  ngOnInit(): void {
    this.sub.add(
      this.store.select(searchLoadingLike()).subscribe((load) => {
        if (load === false) this.loading = false;
      }),
    );
    if (this.place?.placeId && localStorage.getItem(this.place?.placeId) === '1') this.isLiked = true;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get name(): string {
    return 'Fontanella' + (this.place?.streetName ? ' di ' + this.place.streetName : '');
  }

  get street(): string {
    if (this.place?.streetName) {
      let streetNumber: string = this.place.streetNumber ? ', ' + this.place.streetNumber : '';
      return this.place.streetName + streetNumber;
    } else {
      return '';
    }
  }

  get city(): string {
    if (this.place?.city) {
      let province: string = this.place.province ? ', ' + this.place.province : '';
      return this.place.city + province;
    } else {
      return '';
    }
  }

  onSelectClick(): void {
    this.placeClick.emit(this.place);
  }

  onLikeClick(): void {
    this.loading = true;
    this.placeLike.emit(this.place);
  }
}
