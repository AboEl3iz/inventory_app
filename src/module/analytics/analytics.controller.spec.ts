import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { guardMockProviders } from '../../test/test-utils';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        ...guardMockProviders,
        {
          provide: AnalyticsService,
          useValue: {
            getOverview: jest.fn(), getAllWidgets: jest.fn(),
            getSalesTrends: jest.fn(), getSalesByCategory: jest.fn(),
            getSalesByBranch: jest.fn(), getSalesByUser: jest.fn(),
            getPaymentMethodsBreakdown: jest.fn(), getPeakHoursAnalysis: jest.fn(),
            getInventoryStatus: jest.fn(), getLowStockItems: jest.fn(),
            getInventoryMovements: jest.fn(), getInventoryValuation: jest.fn(),
            getInventoryTurnover: jest.fn(), getShrinkageReport: jest.fn(),
            getFinancialSummary: jest.fn(), getCashFlowAnalysis: jest.fn(),
            getTaxSummary: jest.fn(), getTopSellingProducts: jest.fn(),
            getProductPerformance: jest.fn(), getProfitMarginByProduct: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
