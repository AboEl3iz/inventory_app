export interface ISuppliersRecommendations {
  branch: string;
  variant: string;
  currentQuantity: number;
  threshold: number;
  recommendedSupplier: string;
  avgPurchaseCost: number;
}
