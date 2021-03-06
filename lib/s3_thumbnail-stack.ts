import * as cdk from '@aws-cdk/core'
import * as logs from '@aws-cdk/aws-logs'
import * as eventSource from '@aws-cdk/aws-lambda-event-sources'
import * as sqs from '@aws-cdk/aws-sqs'
import * as lambda from '@aws-cdk/aws-lambda'
import * as s3 from '@aws-cdk/aws-s3'
import * as s3Notif from '@aws-cdk/aws-s3-notifications'

const prefix = 'photos/'

export class S3ThumbnailStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Queue to handle the S3 event source
    const queue = new sqs.Queue(this, 'thumbnailQueue', {
      queueName: 'thumbnailPayload',
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(600),
      retentionPeriod: cdk.Duration.days(2),
    })

    // Lambda that will react to S3 events
    const handler = new lambda.Function(this, 'resizeImage', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('resources'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(20),
      memorySize: 512,
      reservedConcurrentExecutions: 20,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        QUEUE_URL: queue.queueUrl,
        PREFIX: prefix,
      },
    })

    // S3 bucket for storing images
    const imagesBucket = new s3.Bucket(this, 'allImagesBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })
    imagesBucket.grantReadWrite(handler)

    // Attach the queue as an event source to the Lambda
    handler.addEventSource(new eventSource.SqsEventSource(queue))

    // Attach the queue to react to S3 object creates
    imagesBucket.addObjectCreatedNotification(
      new s3Notif.SqsDestination(queue),
      { prefix }
    )
  }
}
