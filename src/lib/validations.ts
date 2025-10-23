import { z } from "zod";

// Product validation schema
export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  price: z.number().positive("Price must be positive").max(999999.99, "Price must be less than 1,000,000"),
  quantity: z.number().int("Quantity must be a whole number").nonnegative("Quantity cannot be negative").max(999999, "Quantity must be less than 1,000,000"),
  category: z.string().trim().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  color: z.string().trim().max(50, "Color must be less than 50 characters").optional(),
});

// Order validation schema
export const orderItemSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required").max(200, "Product name must be less than 200 characters"),
  quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be positive").max(999999, "Quantity must be less than 1,000,000"),
  price: z.number().positive("Price must be positive").max(999999.99, "Price must be less than 1,000,000"),
});

export const supplierInfoSchema = z.object({
  supplier_name: z.string().trim().min(1, "Supplier name is required").max(200, "Supplier name must be less than 200 characters"),
  supplier_contact: z.string().trim().max(200, "Contact must be less than 200 characters").optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

// Food condition validation schema
export const foodConditionSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required").max(200, "Product name must be less than 200 characters"),
  condition: z.string().trim().min(1, "Condition is required").max(100, "Condition must be less than 100 characters"),
  fit_for_processing: z.boolean(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

// Return validation schema
export const returnSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required").max(200, "Product name must be less than 200 characters"),
  quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be positive").max(999999, "Quantity must be less than 1,000,000"),
  reason: z.string().trim().min(1, "Reason is required").max(1000, "Reason must be less than 1000 characters"),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type OrderItemFormData = z.infer<typeof orderItemSchema>;
export type SupplierInfoFormData = z.infer<typeof supplierInfoSchema>;
export type FoodConditionFormData = z.infer<typeof foodConditionSchema>;
export type ReturnFormData = z.infer<typeof returnSchema>;
