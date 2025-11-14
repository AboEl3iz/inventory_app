export interface getOverview {
    current: {
        revenue: number;
        orders: number;
        avgOrderValue: number;
        customers: number;
    };
    previous: {
        revenue: number;
        orders: number;
        avgOrderValue: number;
    };
    growth: {
        revenue: number;
        orders: number;
        avgOrderValue: number;
    };
    topProducts: {
        productId: any;
        productName: any;
        quantitySold: number;
        revenue: number;
    }[];
    lowStockAlerts: number;
    period: {
        start: Date;
        end: Date;
    };
}


