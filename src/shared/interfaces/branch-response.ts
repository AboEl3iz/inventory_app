export interface IBranchResponse {
    id: string ;
    name: string ;
    address: string ;
    phone: string ;
} 

export interface IBranchWithRelationsResponse extends IBranchResponse {
    users: { id: string; name: string; email: string; role: string }[];
    inventories: { id: string; itemName: string; quantity: number; price: number }[];
}


export interface IBranchStatsResponse {
    branch: {
        id: string;
        name: string;
        address: string;
        phone: string;
    };
    summary: {
        totalProducts: number;
        totalProfit: number;
        totalLoss: number;
        lowStockCount: number;
    };
    products: {
        productId: string;
        name: string;
        quantity: number;
        minThreshold: number;
        thresholdPassed: boolean;
        sellingPrice: number;
        costPrice: number;
        profit: number;
        profitMargin: string;
    }[];
}