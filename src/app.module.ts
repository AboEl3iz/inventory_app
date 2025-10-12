import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmconfig } from './config/typeorm.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config } from 'process';
import { InventoryModule } from './module/inventory/inventory.module';
import { CategoriesModule } from './module/categories/categories.module';
import { UsersModule } from './module/users/users.module';
import { AuthModule } from './module/auth/auth.module';
import { AnalyticsModule } from './module/analytics/analytics.module';
import { PurchasesModule } from './module/purchases/purchases.module';
import { InvoicesModule } from './module/invoices/invoices.module';
import { ReportsModule } from './module/reports/reports.module';
import { SchedulerModule } from './module/scheduler/scheduler.module';
import { SuppliersModule } from './module/suppliers/suppliers.module';
import { StockModule } from './module/stock/stock.module';
import { EventsModule } from './module/events/events.module';
import { BranchesModule } from './module/branches/branches.module';
import { ProductsModule } from './module/products/products.module';
import { JWTConfig } from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [
    ProductsModule,
    BranchesModule,
    EventsModule,
    StockModule,
    SuppliersModule,
    SchedulerModule,
    ReportsModule,
    InvoicesModule,
    PurchasesModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    InventoryModule,
    ConfigModule.forRoot({
      isGlobal: true,

    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        await typeOrmconfig(configService),
      inject: [ConfigService],
    }),
    

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
