import { Product } from "src/module/products/entities/product.entity";

interface IFilterProducts {
    data: Product[];
    total: number;
    page: number;
    limit: number;
}

interface IStats {
    categoryId: any;
    categoryName: any;
    productCount: number;
}

interface IVariant {
    id: string;
    sku: string;
    price: number | null;
    BasePrice: number;
    costPrice: number;
    stockQuantity: number;
    isActive: boolean;
    attributes: unknown[];
}

interface ILinkedVariant {
    variantId: string;
    linkedValues: {
        id: string;
        value: string;
        attribute: {
            id: string;
            name: string;
        };
    }[];
}

interface IGetVariantResponse {
    variantId: string;
    sku: string;
    productName: string;
    attributes: {
        id: string;
        name: string;
        values: any[];
    }[];
}

export type { IFilterProducts , IStats , IVariant , ILinkedVariant , IGetVariantResponse };