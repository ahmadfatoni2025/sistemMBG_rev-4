import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Product } from "@/types/product";
import { productSchema, ProductFormData } from "@/lib/validations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormData) => void;
  product?: Product | null;
}

const categories = ["Vegetables", "Meat", "Spices", "Grains", "Dairy", "Fruits"];
const colors = ["Red", "Green", "White", "Orange", "Yellow", "Brown", "Mixed"];

export const ProductDialog = ({ open, onOpenChange, onSubmit, product }: ProductDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      color: "",
      category: "",
      price: 0,
      quantity: 1,
    },
  });

  const selectedCategory = watch("category");
  const selectedColor = watch("color");

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        color: product.color,
        category: product.category,
        price: product.price,
        quantity: product.quantity,
      });
    } else {
      reset({
        name: "",
        color: "",
        category: "",
        price: 0,
        quantity: 1,
      });
    }
  }, [product, reset]);

  const handleFormSubmit = (data: ProductFormData) => {
    onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Raw Material" : "Add New Raw Material"}</DialogTitle>
          <DialogDescription>
            {product ? "Update the raw material details below." : "Fill in the raw material details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Raw Material Name</Label>
              <Input
                id="name"
                placeholder="e.g., Chicken, Carrots, Rice"
                {...register("name")}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <Select value={selectedColor} onValueChange={(value) => setValue("color", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={(value) => setValue("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (IDR)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="2999"
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="1"
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{product ? "Update Raw Material" : "Add Raw Material"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
