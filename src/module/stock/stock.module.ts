import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './entities/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement])],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule { }
