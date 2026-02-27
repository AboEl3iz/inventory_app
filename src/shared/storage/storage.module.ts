import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './storage.interface';
import { CloudinaryStorageProvider } from './cloudinary.provider';
import { S3StorageProvider } from './s3.provider';

/**
 * StorageModule
 *
 * Global module that provides the storage provider based on STORAGE_PROVIDER env var.
 *
 * Usage in any service:
 *   constructor(@Inject(STORAGE_PROVIDER) private storage: IStorageProvider) {}
 *
 * Switching providers:
 *   Set STORAGE_PROVIDER=cloudinary or STORAGE_PROVIDER=s3 in .env
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const provider =
          configService.get<string>('STORAGE_PROVIDER') || 'cloudinary';
        switch (provider) {
          case 's3':
            return new S3StorageProvider();
          case 'cloudinary':
          default:
            return new CloudinaryStorageProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
