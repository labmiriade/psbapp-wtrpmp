#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { InfrastructureStack, InfrastructureStackProps } from '../lib/infrastructure-stack';

const DATA_URLS = [
  'https://dati.veneto.it/SpodCkanApi/api/1/rest/dataset/comune_di_thiene_fontanelle.csv',
  'https://dati.veneto.it/SpodCkanApi/api/1/rest/dataset/comune_di_valdagno_fontanelle_8931.csv',
  'https://dati.veneto.it/SpodCkanApi/api/1/rest/dataset/comune_di_santorso_fontanelle.csv',
  'https://dati.veneto.it/SpodCkanApi/api/1/rest/dataset/comune_di_san_vito_di_leguzzano_fontanelle.csv',
  'https://dati.veneto.it/SpodCkanApi/api/1/rest/dataset/comune_di_villaverla_fontanelle.csv',
];

const env: cdk.Environment = {
  account: '<ACCOUNT_ID>',
  region: 'eu-west-1',
};

const app = new cdk.App();
cdk.Tags.of(app).add('project', 'PSBAPP');

/////// STACK DI SVILUPPO

// default props for all dev env: customizable afterwards
function makeDefaultDevProps(ownerName: string, ownerEmail: string): InfrastructureStackProps {
  return {
    env,
    endUserWebApp: {
      domain: `wtrpmp-${ownerName.toLowerCase()}.example.org`,
      buildCommand: 'testBuild',
      shouldCacheS3: false,
      zoneName: undefined, // route53 is not in the same account
      certificateArn: '<ARN_CERTIFICATO>',
      apiBaseUrl: `/api`,
    },
    description: `Development Stack for Pasubio App - WtrPmp owned by ${ownerName}`,
    destroyOnRemoval: true,
    captcha: {
      key: '<CAPTCHA_KEY>',
      secret: '<CAPTCHA_SECRET>',
    },
    csvDataUrls: JSON.stringify(DATA_URLS),
    locationMapArn: '<ARN_MAPPA>',
    searchProps: {
      indexPrefix: ownerName,
      placeIndexName: 'explore.place',
      reuseDomainAttributes: {
        domainArn: '<ARN_DOMINIO>',
        domainEndpoint: '<ENDPOINT_DOMINIO>',
      },
    },
    alarmEmail: ownerEmail,
  };
}

// an object with all dev props
const devProps: { [ownerEmail: string]: InfrastructureStackProps } = {};

// creates a stack for each dev
for (const ownerEmail of Object.keys(devProps)) {
  const ownerName = ownerEmail.split('@')[0].replace('.', ''); // from n.cognome@mail.com to ncognome
  const stackName = `PSBAPPWtrPmpDev${ownerName}`;
  const props = devProps[ownerEmail];
  const stack = new InfrastructureStack(app, stackName, props);
  cdk.Tags.of(stack).add('referente', ownerEmail);
  cdk.Tags.of(stack).add('owner', ownerEmail);
  cdk.Tags.of(stack).add('project', 'PSBAPP');
  cdk.Tags.of(stack).add('environment', 'dev');
}
