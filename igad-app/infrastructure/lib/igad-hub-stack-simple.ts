import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

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
      // Custom email configuration
      email: cognito.UserPoolEmail.withSES({
        fromEmail: 'noreply@igad.org',
        fromName: 'IGAD Innovation Hub',
        replyTo: 'support@igad.org'
      }),
      // Custom email templates
      userVerification: {
        emailSubject: 'Welcome to IGAD Innovation Hub - Verify Your Account',
        emailBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://igad.org/logo.png" alt="IGAD Innovation Hub" style="height: 60px;">
            </div>
            
            <h1 style="color: #2D5016; text-align: center; margin-bottom: 30px;">
              Welcome to IGAD Innovation Hub!
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Dear User,
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Welcome to the IGAD Innovation Hub platform! We're excited to have you join our community of innovators working towards sustainable development in the Horn of Africa.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              To complete your account setup, please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{##Verify Email##}" style="background-color: #2D5016; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              {##Verify Email##}
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="font-size: 14px; color: #666; text-align: center;">
                Best regards,<br>
                The IGAD Innovation Hub Team
              </p>
              <p style="font-size: 12px; color: #999; text-align: center;">
                This email was sent from a notification-only address. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
        emailStyle: cognito.VerificationEmailStyle.LINK
      },
      userInvitation: {
        emailSubject: 'Your IGAD Innovation Hub Account - Temporary Password',
        emailBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://igad.org/logo.png" alt="IGAD Innovation Hub" style="height: 60px;">
            </div>
            
            <h1 style="color: #2D5016; text-align: center; margin-bottom: 30px;">
              Your Account is Ready!
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Hello {username},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Your IGAD Innovation Hub account has been created successfully. You can now access our platform to start working on innovative solutions for sustainable development.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2D5016; margin-top: 0;">Login Credentials:</h3>
              <p style="margin: 10px 0;"><strong>Email:</strong> {username}</p>
              <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px;">{####}</code></p>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Important:</strong> You will be prompted to change this temporary password when you first log in.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://hub.igad.org/login" style="background-color: #2D5016; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Login to Your Account
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="font-size: 14px; color: #666; text-align: center;">
                Best regards,<br>
                The IGAD Innovation Hub Team
              </p>
              <p style="font-size: 12px; color: #999; text-align: center;">
                If you have any questions, contact us at support@igad.org
              </p>
            </div>
          </div>
        `
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
