export interface IBranchResponse {
    id: string;
    name: string;
    address: string;
    phone: string;
}

export interface IBranchWithRelationsResponse extends IBranchResponse {
    users: { id: string; name: string; email: string; role: string }[];
    inventories: { id: string; itemName: string; quantity: number; price: number }[];
}

interface IProductStat {
    productId: string;
    variantId: string;
    productName: string;
    variantSku: string;
    quantity: number;
    minThreshold: number;
    thresholdPassed: boolean;
    sellingPrice: number;
    costPrice: number;
    potentialProfit: number;
    profitMargin: string;
}




export interface IBranchStatsResponse {
    branch: {
        id: string;
        name: string;
        address: string;
        phone: string;
    };
    summary: {
        totalVariants: number;
        totalInventoryValue: number;
        totalInventoryCost: number;
        potentialProfit: number;
        potentialLoss: number;
        actualProfit: number;
        lowStockCount: number;
    };
    products: IProductStat[];
}