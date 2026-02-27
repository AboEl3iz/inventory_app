export interface PurchaseItemResponse {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  createdAt: Date;
}

export interface CreatePurchaseResponse {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  userId: string;
  userName: string;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  items: PurchaseItemResponse[];
  createdAt: Date;
}

export interface CompletePurchaseResponse {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  status: 'completed';
  totalAmount: number;
  receivedAt: Date;
  itemsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseListItemResponse {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  branchName: string;
  userName: string;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  itemsCount: number;
  receivedAt: Date | null;
  createdAt: Date;
}

export interface PurchaseDetailResponse {
  id: string;
  purchaseNumber: string;
  supplier: {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
  branch: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  items: Array<{
    id: string;
    variant: {
      id: string;
      sku: string;
      barcode: string;
      price: number;
      product: {
        id: string;
        name: string;
        brand: string;
      };
    };
    quantity: number;
    unitCost: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  receivedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CancelPurchaseResponse {
  id: string;
  purchaseNumber: string;
  status: 'cancelled';
  totalAmount: number;
  updatedAt: Date;
}

export interface DeletePurchaseResponse {
  message: string;
}
