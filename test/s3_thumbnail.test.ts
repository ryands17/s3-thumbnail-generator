import * as cdk from '@aws-cdk/core'
import {
  SynthUtils,
  expect as expectCDK,
  haveResourceLike,
} from '@aws-cdk/assert'
import { S3ThumbnailStack } from '../lib/s3_thumbnail-stack'

const stackName = 'S3ThumbnailStack'

// Commented due to an issue with snapshots changing in every run

// test('snapshot works correctly', () => {
//   const app = new cdk.App()
//   const stack = new S3ThumbnailStack(app, stackName)
//   expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot()
// })

test('S3, SQS and Lambda resources are created', () => {
  const app = new cdk.App()
  const stack = new S3ThumbnailStack(app, stackName)

  expectCDK(stack).to(
    haveResourceLike('AWS::S3::Bucket', {
      BucketName: 'all-images-bucket',
    })
  )

  expectCDK(stack).to(
    haveResourceLike('AWS::SQS::Queue', {
      MessageRetentionPeriod: 172800,
      QueueName: 'thumbnailPayload',
      ReceiveMessageWaitTimeSeconds: 20,
      VisibilityTimeout: 60,
    })
  )

  expectCDK(stack).to(
    haveResourceLike('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs12.x',
      MemorySize: 256,
      ReservedConcurrentExecutions: 20,
      Timeout: 20,
    })
  )
})

test('events have been added', () => {
  const app = new cdk.App()
  const stack = new S3ThumbnailStack(app, stackName)

  expectCDK(stack).to(haveResourceLike('AWS::Lambda::EventSourceMapping'))

  expectCDK(stack).to(
    haveResourceLike('Custom::S3BucketNotifications', {
      BucketName: {},
      NotificationConfiguration: {
        QueueConfigurations: [
          {
            Events: ['s3:ObjectCreated:*'],
            Filter: {
              Key: {
                FilterRules: [
                  {
                    Name: 'prefix',
                    Value: 'photos/',
                  },
                ],
              },
            },
          },
        ],
      },
    })
  )
})
