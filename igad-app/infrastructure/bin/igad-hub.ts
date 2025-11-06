#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IgadHubStack } from '../lib/igad-hub-stack';

const app = new cdk.App();

// Get environment from context
const environment = app.node.tryGetContext('environment') || 'testing';

// Environment-specific configuration
const config = {
  testing: {
    stackName: 'igad-testing-stack',
    resourcePrefix: 'igad-testing',
    domainName: undefined
  },
  production: {
    stackName: 'igad-prod-stack',
    resourcePrefix: 'igad-prod',
    domainName: undefined
  }
};

new IgadHubStack(app, config[environment].stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  environment,
  resourcePrefix: config[environment].resourcePrefix,
  domainName: config[environment].domainName
});
