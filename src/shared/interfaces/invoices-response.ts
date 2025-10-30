export interface InvoiceItemResponse {
  id: string;
  variantId: string;
  variantSku: string;
  productName: string;
  productBrand: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface CreateInvoiceResponse {
  invoice: {
    id: string;
    invoiceNumber: string;
    branchId: string;
    branchName: string;
    userId: string;
    userName: string;
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit' | null;
    paidAt: Date | null;
    notes: string;
    createdAt: Date;
  };
  items: InvoiceItemResponse[];
}

export interface InvoiceListItemResponse {
  id: string;
  invoiceNumber: string;
  branchName: string;
  userName: string;
  itemsCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit' | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface GetAllInvoicesResponse {
  data: InvoiceListItemResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface InvoiceDetailResponse {
  id: string;
  invoiceNumber: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  branch: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  items: Array<{
    id: string;
    variant: {
      id: string;
      sku: string;
      barcode: string;
      price: number;
    };
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit' | null;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CancelInvoiceResponse {
  message: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: 'cancelled';
    totalAmount: number;
    itemsRestored: number;
    updatedAt: Date;
  };
}

export interface BranchStatsResponse {
  date: string;
  totalSales: number;
}