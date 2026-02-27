import { ConfigService } from '@nestjs/config';

/**
 * Email configuration factory
 * Uses Mailpit (localhost:1025) in development, production SMTP in production
 */
export const emailConfig = (configService?: ConfigService) => ({
  host:
    configService?.get<string>('EMAIL_HOST') ||
    process.env.EMAIL_HOST ||
    'localhost',
  port:
    Number(
      configService?.get<number>('EMAIL_PORT') || process.env.EMAIL_PORT,
    ) || 1025,
  secure:
    (configService?.get<string>('EMAIL_SECURE') || process.env.EMAIL_SECURE) ===
    'true',
  auth: {
    user:
      configService?.get<string>('EMAIL_USER') || process.env.EMAIL_USER || '',
    pass:
      configService?.get<string>('EMAIL_PASS') || process.env.EMAIL_PASS || '',
  },
  fromAddress:
    configService?.get<string>('EMAIL_FROM_ADDRESS') ||
    process.env.EMAIL_FROM_ADDRESS ||
    'noreply@inventory-app.local',
});

export default emailConfig();
