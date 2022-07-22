import { components } from './schema';
import * as faker from 'faker';

export function PlaceList(): components['schemas']['PlaceList'] {
  const places = [];

  for (let i = 0; i < 50; i++) {
    places.push(PlaceInfo());
  }

  return {
    places,
  };
}

export function PlaceInfo(placeId?: string): components['schemas']['PlaceInfo'] {
  return {
    placeId: placeId ?? faker.random.word(),
    city: faker.address.city(),
    streetName: faker.address.streetAddress(),
    streetNumber: faker.datatype.number().toString(),
    province: faker.address.county(),
    lat: faker.address.latitude(),
    lon: faker.address.longitude(),
    notes: faker.random.words(8),
    likes: faker.datatype.number(1000),
    community: faker.datatype.boolean(),
    istatCode: `${faker.datatype.string(1)}${faker.datatype.number(999)}`,
  };
}

export function PlaceAddress(): components['schemas']['PositionSearchResponse'] {
  return {
    address:
      faker.address.streetName() +
      ' ' +
      faker.datatype.number(200).toString() +
      ', ' +
      faker.datatype.number(9999) +
      ', ' +
      faker.address.cityName(),
  };
}

export function PlaceCoordinates(): components['schemas']['TextSearchResponse'] {
  return {
    coordinates: {
      latitude: faker.address.latitude(),
      longitude: faker.address.longitude(),
    },
  };
}
