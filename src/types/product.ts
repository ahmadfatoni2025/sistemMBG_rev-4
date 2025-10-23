export interface Product {
  id: number;
  name: string;
  color: string;
  category: string;
  price: number;
  quantity: number;
}

export interface ProductFormData {
  name: string;
  color: string;
  category: string;
  price: number;
  quantity: number;
}
