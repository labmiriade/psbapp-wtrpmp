// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Environment } from 'src/app/core/interfaces/environment.interface';

export const environment: Environment = {
  production: false,
  baseUrl: 'http://localhost:8080',
  awsRegion: 'eu-west-1',
  awsIdentityPoolId: '<IDENTITY_POOL_ID>',
  awsMapName: 'explore.map',
  siteKeyCaptcha: '<KEY_CAPTCHA>',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
