import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import { OpenAPI } from './open-api';
import { JsonSchema } from 'aws-cdk-lib/aws-apigateway';

export interface ApiGatewayConstructProps {
  /**
   * Function per la ricerca di places
   */
  searchLambda: lambda.IFunction;
  /**
   * Function per il get di un place
   */
  getPlaceLambda: lambda.IFunction;
  /**
   * Function per il geocoding
   */
  searchLocationLambda: lambda.IFunction;
  /**
   * Function per il post di un place
   */
  postPlaceLambda: lambda.IFunction;
  /*
   * Function per il like di un place
   */
  likePlaceLambda: lambda.IFunction;
  /**
   * DynamoDB Table con i dati
   */
  dataTable: dynamo.Table;
  /**
   * The captcha secret given from google
   */
  captchaSecret?: string;
}

/**
 * Construct per la creazione delle risorse legate all'API Gateway.
 *
 * Le funzioni lambda vengono passate al costrutture tramite `props`, mentre le integrazioni
 * di tipo AWS (chiamate dirette a DynamoDB) vengono costruite qui.
 */
export class ApiGatewayConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    // L'API Gateway che servirà l'API.
    const api = new apigw.RestApi(this, 'Gateway', {
      deployOptions: {
        description: 'Stage di default',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        stageName: 'api',
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      deploy: true,
      description: 'Pasubio App WtrPmp API',
      endpointTypes: [apigw.EndpointType.EDGE],
      minimumCompressionSize: 0,
    });

    // ruolo utilizzato dalle integrazioni che fanno query (sola lettura) a dataTable
    const dataTableReadWriteRole = new iam.Role(this, 'TableQueryRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    props.dataTable.grantReadWriteData(dataTableReadWriteRole);

    // lambda che verifica un codice captcha in ingresso
    const captchaAuthFn = new lambda.Function(this, 'CaptchaAuthFn', {
      code: new lambda.AssetCode('../api/authorizer', {
        bundling: {
          image: cdk.DockerImage.fromRegistry('node:14-alpine'),
          command: ['sh', 'cdk-build.sh'],
          user: '1000',
        },
      }),
      handler: 'captcha-authorizer.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 128,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      environment: {
        captchaValidateIP: 'true',
        captchaSecret: props.captchaSecret ?? '',
      },
    });
    // authorizer che autorizza l'utente controllando il captcha in ingresso
    const captchaAuthorizer = new apigw.RequestAuthorizer(this, 'CaptchaAuthorizer', {
      handler: captchaAuthFn,
      identitySources: [apigw.IdentitySource.header('x-captcha')],
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    // integration per ottenere le categories
    const getCatsInteg = new apigw.AwsIntegration({
      service: 'dynamodb',
      action: 'GetItem',
      options: {
        credentialsRole: dataTableReadWriteRole,
        requestTemplates: {
          'application/json': JSON.stringify({
            TableName: props.dataTable.tableName,
            Key: {
              pk: { S: 'category' },
              sk: { S: 'category' },
            },
            ExpressionAttributeNames: {
              '#d': 'data',
            },
            ProjectionExpression: '#d',
            ConsistentRead: false,
          }),
        },
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': categoriesResponseTemplate,
            },
          },
          {
            selectionPattern: '404',
            statusCode: '404',
            responseTemplates: {
              'application/json': `categories not found`,
            },
          },
        ],
      },
    });

    // creo la risorsa `/categories`
    const categories = api.root.addResource('categories');
    // creo il metodo `GET /categories`
    categories.addMethod('GET', getCatsInteg, {
      // configuro la risposta della API
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigw.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': apigw.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // integration per ottenere le Place Info
    const getPlaceInteg = new apigw.LambdaIntegration(props.getPlaceLambda, { proxy: true });

    // creo la risorsa `/p`
    const p = api.root.addResource('p');
    // creo la risorsa `/p/{placeId}`
    const placeId = p.addResource('{placeId}');
    // creo il metodo `GET /p/{placeId}`
    placeId.addMethod('GET', getPlaceInteg, {
      // configuro la risposta della API
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            // 'application/json': new apigw.Model(this, 'PlaceInfoModel', {
            //   restApi: api,
            //   // importo lo schema dal file OpenAPI
            //   schema: <JsonSchema>OpenAPI.components.schemas.PlaceInfo,
            //   modelName: 'PlaceInfo',
            // }),
            'application/json': apigw.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': apigw.Model.ERROR_MODEL,
          },
        },
      ],
      requestModels: {
        'application/json': apigw.Model.EMPTY_MODEL,
      },
      requestParameters: {
        'method.request.path.placeId': true,
      },
    });

    const postPointInteg = new apigw.LambdaIntegration(props.postPlaceLambda, { proxy: true });

    p.addMethod('POST', postPointInteg, {
      authorizer: captchaAuthorizer,
      // configuro la risposta della API
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            // 'application/json': new apigw.Model(this, 'PlaceInfoModel', {
            //   restApi: api,
            //   // importo lo schema dal file OpenAPI
            //   schema: <JsonSchema>OpenAPI.components.schemas.PlaceInfo,
            //   modelName: 'PlaceInfo',
            // }),
            'application/json': apigw.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': apigw.Model.ERROR_MODEL,
          },
        },
      ],
      requestModels: {
        'application/json': new apigw.Model(this, 'PostPlaceModel', {
          restApi: api,
          // importo lo schema dal file OpenAPI
          schema: {
            schema: apigw.JsonSchemaVersion.DRAFT4,
            title: 'PostPlaceModelRequest',
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              address: { type: apigw.JsonSchemaType.STRING },
              description: { type: apigw.JsonSchemaType.STRING },
              lat: { type: apigw.JsonSchemaType.STRING },
              lon: { type: apigw.JsonSchemaType.STRING },
            },
          },
          modelName: 'PostPlaceModelRequest',
        }),
      },
    });

    const likePlaceInteg = new apigw.LambdaIntegration(props.likePlaceLambda, { proxy: true });

    // creo la risorsa '/p/{placeId}/like'
    const placeLike = placeId.addResource('like');
    placeLike.addMethod('PUT', likePlaceInteg, {
      authorizer: captchaAuthorizer,
      // configuro la risposta della API
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            // 'application/json': new apigw.Model(this, 'PlaceInfoModel', {
            //   restApi: api,
            //   // importo lo schema dal file OpenAPI
            //   schema: <JsonSchema>OpenAPI.components.schemas.PlaceInfo,
            //   modelName: 'PlaceInfo',
            // }),
            'application/json': apigw.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': apigw.Model.ERROR_MODEL,
          },
        },
      ],
      requestModels: {
        'application/json': apigw.Model.EMPTY_MODEL,
      },
      requestParameters: {
        'method.request.path.placeId': true,
      },
    });

    ///// SEARCH API

    // integration per cercare un posto
    const searchInteg = new apigw.LambdaIntegration(props.searchLambda, {
      proxy: true,
    });

    // creo la risorsa `/search`
    const search = api.root.addResource('search');
    // creo la risorsa `/search/p`
    const searchP = search.addResource('p');
    // creo il metodo `GET /search/p`
    searchP.addMethod('GET', searchInteg, {
      requestParameters: {
        'method.request.querystring.near': false,
        'method.request.querystring.q': false,
      },
    });

    const searchLocationInteg = new apigw.LambdaIntegration(props.searchLocationLambda, { proxy: true });
    // creo la risorsa '/search/location/text'
    // creo la risorsa '/search/location/position'
    const location = search.addResource('location');
    const text = location.addResource('text');
    text.addMethod('GET', searchLocationInteg, {
      // configuro la risposta della API
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': new apigw.Model(this, 'TextSearchModel', {
              restApi: api,
              // importo lo schema dal file OpenAPI
              schema: <JsonSchema>OpenAPI.components.schemas.TextSearchResponse,
              modelName: 'TextSearchResponse',
            }),
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': apigw.Model.ERROR_MODEL,
          },
        },
      ],
      requestModels: {
        'application/json': apigw.Model.EMPTY_MODEL,
      },
      requestParameters: {
        'method.request.path.text': true,
      },
    });

    const position = location.addResource('position');
    position.addMethod('GET', searchLocationInteg, {
      // configuro la risposta della API
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': new apigw.Model(this, 'PositionSearchModel', {
              restApi: api,
              // importo lo schema dal file OpenAPI
              schema: {
                schema: apigw.JsonSchemaVersion.DRAFT4,
                title: 'PositionSearchResponse',
                type: apigw.JsonSchemaType.OBJECT,
                properties: {
                  address: { type: apigw.JsonSchemaType.STRING },
                },
              },
              modelName: 'PositionSearchResponse',
            }),
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': apigw.Model.ERROR_MODEL,
          },
        },
      ],
      requestParameters: {
        'method.request.path.lat': true,
        'method.request.path.lon': true,
      },
    });

    this.restApi = api;
    this.stage = api.deploymentStage;
  }

  stage: apigw.Stage;
  restApi: apigw.RestApi;
}

const categoriesResponseTemplate = `
    #set( $item = $input.path('$.Item') )
    #if ( $item == "" )
    #set( $context.responseOverride.status = 444 )
    {
      "userMessage": "Non ho trovato le categorie",
      "debugMessage": "le categorie non esistono"
    }
    #set( $item = $input.path('$.Item') )
    #else
    {"categories": $item.data.SS}
    #end
    `;
