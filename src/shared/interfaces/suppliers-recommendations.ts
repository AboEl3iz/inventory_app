export interface ISuppliersRecommendations {
    branch: string;
    product: string;
    currentQuantity: number;
    threshold: number;
    recommendedSupplier: string;
    avgPurchaseCost: number;
}