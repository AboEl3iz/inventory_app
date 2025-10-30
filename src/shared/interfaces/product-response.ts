export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  brand: string;
  basePrice: number;
  isActive: boolean;

  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Product List Response
export interface ProductListResponse {
  data: Array<{
    id: string;
    name: string;
    brand: string;
    basePrice: number;
    isActive: boolean;
    category: {
      id: string;
      name: string;
    };
    supplier: {
      id: string;
      name: string;
    };
    variantsCount: number;
  }>;
  total: number;
  page: number;
  limit: number;
}

// Flat List Response
export interface ProductFlatListResponse {
  id: string;
  name: string;
  basePrice: number;
}

// Stats Response
export interface ProductStatsResponse {
  total: number;
  active: number;
  inactive: number;
}

// Search Response
export interface ProductSearchResponse {
  id: string;
  name: string;
  brand: string;
  basePrice: number;
  
}

// Product Detail Response
export interface ProductDetailResponse {
  id: string;
  name: string;
  description: string;
  brand: string;
  basePrice: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    description: string;
  };
  supplier: {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
  variants: Array<{
    id: string;
    sku: string;
    barcode: string;
    price: number;
    costPrice: number;
    isActive: boolean;
    valuesCount: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Delete/Restore Response
export interface ProductActionResponse {
  status: 'deleted' | 'restored';
  id: string;
}

// Variant Response
export interface VariantResponse {
  id: string;
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  isActive: boolean;
  productId: string;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Add Variants Response
export interface AddVariantsResponse {
  product: string;
  variants: Array<{
    id: string;
    sku: string;
    barcode: string;
    price: number;
    costPrice: number;
    isActive: boolean;
  }>;
}

// Get Variants Response
export interface GetVariantsResponse {
  id: string;
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  isActive: boolean;
  values: Array<{
    id: string;
    attributeName: string;
    value: string;
  }>;
}

// Attribute Response
export interface AttributeResponse {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
}

// Attribute Value Response
export interface AttributeValueResponse {
  id: string;
  value: string;
  attributeId: string;
  attributeName: string;
  productId: string;
  createdAt: Date;
}

// Get Attributes Response
export interface GetAttributesResponse {
  id: string;
  value: string;
  attribute: {
    id: string;
    name: string;
  };
}

// Get Attributes By Category Response
export interface GetAttributesByCategoryResponse {
  id: string;
  name: string;
  values: Array<{
    id: string;
    value: string;
  }>;
}

// Link Variant Values Response
export interface LinkVariantValuesResponse {
  variant: {
    id: string;
    sku: string;
    price: number;
  };
  linkedValues: Array<{
    id: string;
    value: string;
    attributeId: string;
  }>;
}

// Get Variant Values Response
export interface GetVariantValuesResponse {
  id: string;
  attributeValue: {
    id: string;
    value: string;
    attribute: {
      id: string;
      name: string;
    };
  };
}

// Upload Images Response
export interface UploadImagesResponse {
  product: string;
  images: Array<{
    url: string;
  }>;
}