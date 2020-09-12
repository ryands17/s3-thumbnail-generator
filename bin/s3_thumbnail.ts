#!/usr/bin/env node
import { config } from 'dotenv'
config()
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { S3ThumbnailStack } from '../lib/s3_thumbnail-stack'

const REGION = process.env.REGION || 'us-east-1'

const app = new cdk.App()
new S3ThumbnailStack(app, 'S3ThumbnailStack', { env: { region: REGION } })
