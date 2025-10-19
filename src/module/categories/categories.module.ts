import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CacheModule } from '@nestjs/cache-manager';
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  imports: [
    TypeOrmModule.forFeature([Category]),
    CacheModule.register(
      { ttl: 5 * 60 , isGlobal: true }
    ),
    
  ],
})
export class CategoriesModule {}
