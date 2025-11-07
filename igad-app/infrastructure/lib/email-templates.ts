export const EmailTemplates = {
  // Welcome/Verification Email
  welcomeSubject: 'Welcome to IGAD Innovation Hub - Verify Your Account',
  welcomeBody: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; padding: 20px 0; border-bottom: 3px solid #2D5016;">
        <img src="https://igad.org/logo.png" alt="IGAD Innovation Hub" style="height: 60px; margin-bottom: 10px;">
        <h1 style="color: #2D5016; margin: 0; font-size: 24px;">IGAD Innovation Hub</h1>
      </div>
      
      <!-- Main Content -->
      <div style="padding: 0 20px;">
        <h2 style="color: #2D5016; text-align: center; margin-bottom: 30px; font-size: 28px;">
          Welcome to Our Platform! 🚀
        </h2>
        
        <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 20px;">
          Dear Innovator,
        </p>
        
        <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 25px;">
          Welcome to the <strong>IGAD Innovation Hub</strong>! We're thrilled to have you join our community of changemakers working towards sustainable development and innovation in the Horn of Africa region.
        </p>
        
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #2D5016;">
          <h3 style="color: #2D5016; margin-top: 0; margin-bottom: 15px;">🎯 What you can do:</h3>
          <ul style="color: #333; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>Generate AI-powered proposals for development projects</li>
            <li>Create compelling newsletters and communications</li>
            <li>Access innovative tools for sustainable development</li>
            <li>Connect with fellow innovators and experts</li>
          </ul>
        </div>
        
        <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 30px;">
          To get started, please verify your email address by clicking the button below:
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="{##Verify Email##}" style="
            background: linear-gradient(135deg, #2D5016 0%, #4a7c59 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
            box-shadow: 0 4px 15px rgba(45, 80, 22, 0.3);
            transition: all 0.3s ease;
          ">
            ✅ Verify Email Address
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
            <strong>🔗 Alternative:</strong> If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all; font-family: monospace; background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px;">{##Verify Email##}</span>
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="border-top: 2px solid #e9ecef; margin-top: 40px; padding-top: 30px; text-align: center;">
        <p style="font-size: 16px; color: #2D5016; font-weight: bold; margin-bottom: 10px;">
          Best regards,<br>
          The IGAD Innovation Hub Team
        </p>
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Empowering Innovation for Sustainable Development
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
          <p style="font-size: 12px; color: #999; margin: 0; line-height: 1.4;">
            This email was sent from a notification-only address. Please do not reply to this email.<br>
            For support, contact us at <a href="mailto:support@igad.org" style="color: #2D5016;">support@igad.org</a>
          </p>
        </div>
      </div>
    </div>
  `,

  // Temporary Password Email
  tempPasswordSubject: 'Your IGAD Innovation Hub Account - Login Credentials',
  tempPasswordBody: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; padding: 20px 0; border-bottom: 3px solid #2D5016;">
        <img src="https://igad.org/logo.png" alt="IGAD Innovation Hub" style="height: 60px; margin-bottom: 10px;">
        <h1 style="color: #2D5016; margin: 0; font-size: 24px;">IGAD Innovation Hub</h1>
      </div>
      
      <!-- Main Content -->
      <div style="padding: 0 20px;">
        <h2 style="color: #2D5016; text-align: center; margin-bottom: 30px; font-size: 28px;">
          Your Account is Ready! 🎉
        </h2>
        
        <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 20px;">
          Hello <strong>{username}</strong>,
        </p>
        
        <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 30px;">
          Great news! Your IGAD Innovation Hub account has been successfully created. You now have access to our powerful platform for generating proposals, creating newsletters, and driving innovation in sustainable development.
        </p>
        
        <!-- Credentials Box -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #2D5016;">
          <h3 style="color: #2D5016; margin-top: 0; margin-bottom: 20px; text-align: center; font-size: 20px;">
            🔐 Your Login Credentials
          </h3>
          <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="margin: 15px 0; font-size: 16px;">
              <strong style="color: #2D5016;">Email:</strong> 
              <span style="font-family: monospace; background-color: #f8f9fa; padding: 6px 12px; border-radius: 4px; border: 1px solid #dee2e6;">{username}</span>
            </p>
            <p style="margin: 15px 0; font-size: 16px;">
              <strong style="color: #2D5016;">Temporary Password:</strong> 
              <span style="font-family: monospace; background-color: #fff3cd; padding: 6px 12px; border-radius: 4px; border: 1px solid #ffeaa7; font-weight: bold;">{####}</span>
            </p>
          </div>
        </div>
        
        <!-- Important Notice -->
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="margin: 0; color: #0c5460; font-size: 15px; line-height: 1.6;">
            <strong>🔄 Important Security Notice:</strong><br>
            This is a temporary password for your first login. You will be required to create a new, secure password when you first access your account. This ensures your account remains secure and personalized.
          </p>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://hub.igad.org/login" style="
            background: linear-gradient(135deg, #2D5016 0%, #4a7c59 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
            box-shadow: 0 4px 15px rgba(45, 80, 22, 0.3);
          ">
            🚀 Access Your Account
          </a>
        </div>
        
        <!-- Getting Started -->
        <div style="background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); padding: 25px; border-radius: 12px; margin: 30px 0;">
          <h3 style="color: #2D5016; margin-top: 0; margin-bottom: 15px;">🌟 Getting Started:</h3>
          <ol style="color: #333; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>Click the "Access Your Account" button above</li>
            <li>Log in with your email and temporary password</li>
            <li>Create your new secure password</li>
            <li>Explore the platform and start innovating!</li>
          </ol>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="border-top: 2px solid #e9ecef; margin-top: 40px; padding-top: 30px; text-align: center;">
        <p style="font-size: 16px; color: #2D5016; font-weight: bold; margin-bottom: 10px;">
          Welcome to the future of innovation!<br>
          The IGAD Innovation Hub Team
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
          <p style="font-size: 12px; color: #999; margin: 0; line-height: 1.4;">
            Need help? Contact our support team at <a href="mailto:support@igad.org" style="color: #2D5016;">support@igad.org</a><br>
            Visit our website: <a href="https://igad.org" style="color: #2D5016;">igad.org</a>
          </p>
        </div>
      </div>
    </div>
  `,

  // Password Reset Code Email
  resetCodeSubject: 'IGAD Innovation Hub - Password Reset Code',
  resetCodeBody: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; padding: 20px 0; border-bottom: 3px solid #2D5016;">
        <img src="https://igad.org/logo.png" alt="IGAD Innovation Hub" style="height: 60px; margin-bottom: 10px;">
        <h1 style="color: #2D5016; margin: 0; font-size: 24px;">IGAD Innovation Hub</h1>
      </div>
      
      <!-- Main Content -->
      <div style="padding: 0 20px;">
        <h2 style="color: #2D5016; text-align: center; margin-bottom: 30px; font-size: 28px;">
          🔐 Password Reset Request
        </h2>
        
        <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 25px;">
          Hello,
        </p>
        
        <p style="font-size: 16px; line-height: 1.8; color: #333; margin-bottom: 30px;">
          We received a request to reset the password for your IGAD Innovation Hub account. If you made this request, use the verification code below to reset your password.
        </p>
        
        <!-- Reset Code Box -->
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px; border: 2px solid #2D5016; display: inline-block;">
            <p style="margin: 0 0 15px 0; color: #2D5016; font-weight: bold; font-size: 16px;">Your Reset Code:</p>
            <div style="
              font-family: monospace;
              font-size: 32px;
              font-weight: bold;
              color: #2D5016;
              background-color: white;
              padding: 20px 30px;
              border-radius: 8px;
              border: 2px dashed #2D5016;
              letter-spacing: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            ">
              {####}
            </div>
          </div>
        </div>
        
        <!-- Instructions -->
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 15px;">📋 How to use this code:</h3>
          <ol style="color: #0c5460; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>Return to the password reset page</li>
            <li>Enter this 6-digit code exactly as shown</li>
            <li>Create your new secure password</li>
            <li>Log in with your new password</li>
          </ol>
        </div>
        
        <!-- Security Notice -->
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
            <strong>⚠️ Security Notice:</strong><br>
            • This code expires in 15 minutes for your security<br>
            • If you didn't request this reset, please ignore this email<br>
            • Never share this code with anyone<br>
            • Contact support if you have concerns about your account security
          </p>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://hub.igad.org/forgot-password" style="
            background: linear-gradient(135deg, #2D5016 0%, #4a7c59 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
            box-shadow: 0 4px 15px rgba(45, 80, 22, 0.3);
          ">
            🔄 Reset My Password
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="border-top: 2px solid #e9ecef; margin-top: 40px; padding-top: 30px; text-align: center;">
        <p style="font-size: 16px; color: #2D5016; font-weight: bold; margin-bottom: 10px;">
          IGAD Innovation Hub Security Team
        </p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
          <p style="font-size: 12px; color: #999; margin: 0; line-height: 1.4;">
            This is an automated security email. Please do not reply.<br>
            For support: <a href="mailto:support@igad.org" style="color: #2D5016;">support@igad.org</a> | 
            Website: <a href="https://igad.org" style="color: #2D5016;">igad.org</a>
          </p>
        </div>
      </div>
    </div>
  `
};
