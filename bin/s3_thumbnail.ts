#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { S3ThumbnailStack } from '../lib/s3_thumbnail-stack';

const app = new cdk.App();
new S3ThumbnailStack(app, 'S3ThumbnailStack');
