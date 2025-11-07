#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IgadHubStackSimple } from '../lib/igad-hub-stack-simple';

const app = new cdk.App();

// Get environment from context
const environment = app.node.tryGetContext('environment') || 'testing';

// Environment-specific configuration
const config = {
  testing: {
    stackName: 'igad-testing-stack',
    resourcePrefix: 'igad-testing'
  },
  production: {
    stackName: 'igad-prod-stack',
    resourcePrefix: 'igad-prod'
  }
} as const;

type Environment = keyof typeof config;
const env = environment as Environment;

new IgadHubStackSimple(app, config[env].stackName, {
  env: {
    account: '569113802249',
    region: 'us-east-1'
  },
  environment: env,
  resourcePrefix: config[env].resourcePrefix
});
