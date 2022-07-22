import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as pinpoint from 'aws-cdk-lib/aws-pinpoint';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CoreConstructProps {
  /**
   * Whether to delete everything on removal of the stack,
   * should be false ONLY for production or other sensitive environments
   */
  destroyOnRemoval: boolean;
  /**
   * The territory fountains csv data urls
   */
  csvDataUrls: string;
  /**
   * The email to send notification alarms to
   */
  alarmEmail: string;
  /**
   * Place Index Name
   */
  placeIndexName: string;
}

/**
 * Constract with all core resources
 */
export class CoreConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CoreConstructProps) {
    super(scope, id);

    const removalPolicy = props.destroyOnRemoval ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

    // Data Table con tutti i dati
    const dataTable = new dynamo.Table(this, 'DataTable', {
      partitionKey: {
        name: 'pk',
        type: dynamo.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamo.AttributeType.STRING,
      },
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      stream: dynamo.StreamViewType.NEW_IMAGE,
      removalPolicy: removalPolicy,
    });

    // Global Secondary Index per bookingId
    const indexBookingIdName = 'GSI1';
    dataTable.addGlobalSecondaryIndex({
      indexName: indexBookingIdName,
      partitionKey: {
        name: 'gsi1pk',
        type: dynamo.AttributeType.STRING,
      },
    });
    this.indexBookingIdName = indexBookingIdName;

    // default properties for lambda creation
    const defaultLambdaProps: lambda.FunctionProps = {
      code: new lambda.AssetCode('../api/search', {
        bundling: {
          image: cdk.DockerImage.fromRegistry('node:14-alpine'),
          command: ['sh', 'cdk-build.sh'],
          user: '1000',
        },
      }),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        dataTable: dataTable.tableName,
      },
    };

    const alarmTopic = new sns.Topic(scope, 'Alarm topic');

    alarmTopic.addSubscription(new subscriptions.EmailSubscription(props.alarmEmail));
    // lambda to import territory fountains to dynamodb
    const wtrPmpImportLambda = new lambda.Function(this, 'WtrPmpImportFn', {
      code: new lambda.AssetCode('../etl/import-wtrpmp', {
        bundling: {
          image: cdk.DockerImage.fromRegistry('public.ecr.aws/sam/build-python3.8:latest'),
          command: ['sh', 'cdk-build.sh'],
          user: '1000',
        },
      }),
      handler: 'main.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
      description: 'Lambda per importare fontanelle territoriali',
      environment: {
        DATA_TABLE: dataTable.tableName,
        CSV_DATA_URLS: props.csvDataUrls,
      },
    });
    dataTable.grantReadWriteData(wtrPmpImportLambda);

    const wtrPmpImportErrors = wtrPmpImportLambda.metricErrors({
      period: cdk.Duration.minutes(1),
    });

    const importAlarm = new cloudwatch.Alarm(this, 'wtrPmpImportErrorsAlarm', {
      metric: wtrPmpImportErrors,
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 1,
      alarmDescription: 'An error occurred during the WtrPmpImport function execution',
    });

    importAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));

    const eventRule = new events.Rule(this, 'scheduleRule', {
      schedule: events.Schedule.cron({ minute: '0' }),
    });

    eventRule.addTarget(new targets.LambdaFunction(wtrPmpImportLambda));

    const postPlaceFn = new lambda.Function(this, 'postPlaceFn', {
      code: new lambda.AssetCode('../api/post_place'),
      handler: 'main.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.seconds(15),
      description: 'Function to post a place',
      environment: {
        PLACE_INDEX_NAME: props.placeIndexName,
        DATA_TABLE: dataTable.tableName,
      },
    });
    dataTable.grantReadWriteData(postPlaceFn);

    postPlaceFn.role?.attachInlinePolicy(
      new iam.Policy(this, 'search-place-index-policy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['geo:SearchPlaceIndexForText', 'geo:SearchPlaceIndexForPosition'],
            resources: ['arn:aws:geo:*'],
          }),
        ],
      }),
    );

    this.postPlaceFn = postPlaceFn;

    const likePlaceLambda = new lambda.Function(this, 'likePlaceFn', {
      code: new lambda.AssetCode('../api/like_place'),
      handler: 'main.handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      description: 'Function to perform like of a place',
      environment: {
        DATA_TABLE: dataTable.tableName,
      },
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });
    dataTable.grantReadWriteData(likePlaceLambda);

    this.likePlaceLambda = likePlaceLambda;

    this.dataTable = dataTable;
    this.alarmTopicArn = alarmTopic.topicArn;

    // create aws pinpoint
    const cfnApp = new pinpoint.CfnApp(this, 'PinpointApp', {
      name: `${cdk.Stack.of(this).stackName}PinPointApp`,
      // the properties below are optional
    });
    this.pinpointArn = cfnApp.attrArn;
  }

  /**
   * The pinpoint app arn
   */
  pinpointArn: string;
  /**
   * The alarm topic arn
   */
  alarmTopicArn: string;
  /**
   * The main Table
   */
  dataTable: dynamo.Table;
  /**
   * The name of the index on the `bookingId` attribute on `dataTable`
   */
  indexBookingIdName: string;
  /***
   * The function to post a place
   */
  postPlaceFn: lambda.Function;
  /**
   *  The lambda to like places
   */
  likePlaceLambda: lambda.IFunction;
}
