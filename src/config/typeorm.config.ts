import { ConfigService } from '@nestjs/config';

export const typeOrmconfig = (configService: ConfigService) => ({
  // type is always postgres — never read from env to avoid 'undefined' driver errors
  type: 'postgres' as const,
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  // DB_DATABASE matches the key in k8s/01-config.yaml Secret
  database: configService.get<string>('DB_DATABASE'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
  logging: configService.get<string>('NODE_ENV') === 'development',
});

