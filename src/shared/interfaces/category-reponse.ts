export interface CategoryResponse {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeItemResponse {
  id: string;
  name: string;
  children: CategoryTreeItemResponse[];
}

export interface CategoryFlatResponse {
  id: string;
  name: string;
}

export interface CategoryDetailResponse {
  id: string;
  name: string;
  parent: {
    id: string;
    name: string;
  } | null;
  productsCount: number;
  children: Array<{
    id: string;
    name: string;
  }>;
}

export interface CategoryStatsResponse {
  id: string;
  name: string;
  productcount: number;
}

export interface CategoryActionResponse {
  message: string;
}
