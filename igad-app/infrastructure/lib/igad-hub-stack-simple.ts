import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EmailTemplates } from './email-templates';

interface IgadHubStackProps extends cdk.StackProps {
  environment: string;
  resourcePrefix: string;
}

export class IgadHubStackSimple extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IgadHubStackProps) {
    super(scope, id, props);

    const { environment, resourcePrefix } = props;

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${resourcePrefix}-user-pool`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      // Custom email templates
      userVerification: {
        emailSubject: EmailTemplates.welcomeSubject,
        emailBody: EmailTemplates.welcomeBody,
        emailStyle: cognito.VerificationEmailStyle.LINK
      },
      userInvitation: {
        emailSubject: EmailTemplates.tempPasswordSubject,
        emailBody: EmailTemplates.tempPasswordBody
      },
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `${resourcePrefix}-client`,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true
      },
      generateSecret: false
    });

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'MainTable', {
      tableName: `${resourcePrefix}-main-table`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: environment === 'production',
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // REST API Gateway
    const api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${resourcePrefix}-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000', 'https://localhost:3000'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    // CloudWatch Log Groups
    new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/${resourcePrefix}-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID'
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'REST API Gateway URL'
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name'
    });
  }
}
