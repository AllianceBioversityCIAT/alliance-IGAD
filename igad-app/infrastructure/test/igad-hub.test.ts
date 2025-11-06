import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IgadHubStack } from '../lib/igad-hub-stack';

describe('IGAD Hub Stack', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new IgadHubStack(app, 'TestStack', {
      environment: 'testing',
      resourcePrefix: 'igad-test',
      env: { region: 'us-east-1' }
    });
    template = Template.fromStack(stack);
  });

  test('Creates Cognito User Pool', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'igad-test-user-pool'
    });
  });

  test('Creates DynamoDB Table', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'igad-test-main-table',
      BillingMode: 'ON_DEMAND'
    });
  });

  test('Creates S3 Buckets', () => {
    template.resourceCountIs('AWS::S3::Bucket', 2);
  });

  test('Creates CloudFront Distribution', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html'
      }
    });
  });

  test('Creates HTTP API Gateway', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'igad-test-api',
      ProtocolType: 'HTTP'
    });
  });

  test('Creates Lambda Function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'igad-test-placeholder',
      Runtime: 'python3.11'
    });
  });
});
