import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JWTConfig } from 'src/config/jwt.config';
import { AuthModule } from '../auth/auth.module';
import { Auth } from '../auth/entities/auth.entity';
import { Logger } from 'winston';
import { WinstonModule } from 'nest-winston';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [
    WinstonModule,
    AuthModule,
    TypeOrmModule.forFeature([User, Auth]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        await JWTConfig(configService),
      inject: [ConfigService],
    }),
  ],
})
export class UsersModule {}
