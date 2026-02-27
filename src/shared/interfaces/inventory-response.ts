// Create Inventory Response
export interface CreateInventoryResponse {
  id: string;
  branchId: string;
  branchName: string;
  variantId: string;
  variantSku: string;
  productName: string;
  quantity: number;
  minThreshold: number;
  lowStockAlertSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Adjust Stock Response
export interface AdjustStockResponse {
  id: string;
  branchId: string;
  branchName: string;
  variantId: string;
  variantSku: string;
  productName: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  minThreshold: number;
  updatedAt: Date;
}

// Transfer Stock Response
export interface TransferStockResponse {
  from: {
    id: string;
    branchId: string;
    branchName: string;
    variantId: string;
    variantSku: string;
    quantityBefore: number;
    quantityAfter: number;
  };
  to: {
    id: string;
    branchId: string;
    branchName: string;
    variantId: string;
    variantSku: string;
    quantityBefore: number;
    quantityAfter: number;
  };
  transferredQuantity: number;
}

// Inventory List Item Response
export interface InventoryListItemResponse {
  id: string;
  branch: {
    id: string;
    name: string;
    address: string;
  };
  variant: {
    id: string;
    sku: string;
    barcode: string;
    price: number;
    costPrice: number;
    product: {
      id: string;
      name: string;
      brand: string;
    };
  };
  quantity: number;
  minThreshold: number;
  lowStockAlertSent: boolean;
  lastAlertSentAt: Date | null;
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory Detail Response
export interface InventoryDetailResponse {
  id: string;
  branch: {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
  };
  variant: {
    id: string;
    sku: string;
    barcode: string;
    price: number;
    costPrice: number;
    isActive: boolean;
    product: {
      id: string;
      name: string;
      description: string;
      brand: string;
      basePrice: number;
    };
  };
  quantity: number;
  minThreshold: number;
  lowStockAlertSent: boolean;
  lastAlertSentAt: Date | null;
  isLowStock: boolean;
  stockStatus: 'out_of_stock' | 'low_stock' | 'in_stock' | 'overstocked';
  createdAt: Date;
  updatedAt: Date;
}

// Update Inventory Response
export interface UpdateInventoryResponse {
  id: string;
  branchId: string;
  branchName: string;
  variantId: string;
  variantSku: string;
  quantity: number;
  minThreshold: number;
  lowStockAlertSent: boolean;
  updatedAt: Date;
}

// Low Stock Item Response
export interface LowStockItemResponse {
  id: string;
  branch: {
    id: string;
    name: string;
  };
  variant: {
    id: string;
    sku: string;
    barcode: string;
    product: {
      id: string;
      name: string;
      brand: string;
    };
  };
  quantity: number;
  minThreshold: number;
  stockDeficit: number;
  lastAlertSentAt: Date | null;
}
