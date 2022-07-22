import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Pin } from 'src/app/shared/components/aws-map-viewer/aws-map-viewer.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GeolocationService } from 'src/app/core/services/geolocation.service';
import { MainService } from 'src/app/core/services/main.service';
import { ToastService, ToastType } from 'src/app/core/services/toast.service';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-add-place-dialog',
  templateUrl: './add-place-dialog.component.html',
  styleUrls: ['./add-place-dialog.component.scss'],
})
export class AddPlaceDialogComponent implements OnInit, OnDestroy {
  private sub: Subscription;

  loading: boolean = false;
  pins: Pin[];
  lon: number = -1000;
  lat: number = -1000;
  form: FormGroup;
  formDate: FormGroup;
  isAutomaticComplete = false;

  constructor(
    private activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private geolocation: GeolocationService,
    private mainService: MainService,
    private toastService: ToastService,
  ) {
    this.sub = new Subscription();
    this.pins = [
      {
        pos: [11.477778, 45.708333],
      },
    ];
    this.form = this.fb.group({
      description: ['', Validators.required],
    });
    this.formDate = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      istatCode: ['', Validators.required],
    });
    this.sub.add(
      this.formDate.valueChanges.pipe(debounceTime(750)).subscribe((value) => {
        if (!this.isAutomaticComplete && this.formDate.valid) this.getCoordinatesFromDate();
        else this.isAutomaticComplete = false;
      }),
    );
  }

  ngOnInit(): void {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        this.geolocation.getCurrentPosition().then((result) => {
          this.lat = result.coords.latitude;
          this.lon = result.coords.longitude;
          this.pins[0].pos = [this.lon, this.lat];
          this.getDateFromCoordinates();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  close(): void {
    if (this.loading) return;
    if (!this.form.valid || !this.formDate.valid) {
      this.toastService.show(
        'Dati mancanti o errati',
        'Inserire correttamente i dati per aggiungere la fontanella',
        ToastType.Danger,
      );
      return;
    }

    let placeDate = this.formDate.value.street + ', ' + this.formDate.value.istatCode + ', ' + this.formDate.value.city;
    let latDate = undefined;
    let lonDate = undefined;
    if (this.lat !== -1000 && this.lon !== -1000) {
      latDate = this.lat.toString();
      lonDate = this.lon.toString();
    }
    let description: string = this.form.value.description;

    this.loading = true;
    this.sub.add(
      this.mainService.postAddPlace(description, placeDate, latDate, lonDate).subscribe(
        () => {
          this.toastService.show('Fontanella aggiunta!', 'La nuova fontanella è stata aggiunta.', ToastType.Success);
          this.activeModal.close(true);
        },
        () => {
          this.toastService.show(
            'Errore inserimento',
            'La fontanella non è stata aggiunta. Riprovare più tardi.',
            ToastType.Danger,
          );
          this.loading = false;
        },
      ),
    );
  }

  dismiss(): void {
    this.activeModal.close(false);
  }

  getPinDropCoordinates(event: { lng: number; lat: number }): void {
    this.lat = event.lat;
    this.lon = event.lng;
    this.getDateFromCoordinates();
  }

  getDateFromCoordinates(): void {
    this.isAutomaticComplete = true;
    this.sub.add(
      this.geolocation.getDateFromCoordinates(this.lat.toString(), this.lon.toString()).subscribe((result) => {
        let exp = /([a-zA-Z0-9 ]+),\s+([0-9]+),\s+([a-zA-Z ]+)/;
        if (result.address) {
          let date = result.address.match(exp);
          if (date)
            this.formDate.patchValue({
              street: date[1],
              istatCode: date[2],
              city: date[3],
            });
          else
            this.formDate.patchValue({
              street: '',
              istatCode: '',
              city: '',
            });
        }
      }),
    );
  }

  getCoordinatesFromDate(): void {
    let placeDate = this.formDate.value.street + ', ' + this.formDate.value.istatCode + ', ' + this.formDate.value.city;
    this.sub.add(
      this.geolocation.getCoordinatesFromDate(placeDate).subscribe((result) => {
        let lat = Number(result.coordinates?.latitude);
        let lon = Number(result.coordinates?.longitude);
        this.pins = [
          {
            pos: [lon, lat],
          },
        ];
      }),
    );
  }
}
