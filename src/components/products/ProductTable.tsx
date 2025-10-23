import { Minus, Plus, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Product } from "@/types/product";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ProductTableProps {
  products: Product[];
  onQuantityChange: (id: number, amount: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export const ProductTable = ({ products, onQuantityChange, onEdit, onDelete }: ProductTableProps) => {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Product Name
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Color
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Price
              </th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-muted/30 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">{product.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-border shadow-sm"
                      style={{
                        backgroundColor: product.color.toLowerCase() === 'black' ? '#000' :
                          product.color.toLowerCase() === 'white' ? '#fff' :
                          product.color.toLowerCase() === 'silver' ? '#c0c0c0' :
                          product.color.toLowerCase() === 'gold' ? '#ffd700' : '#888'
                      }}
                    />
                    <span className="text-sm text-muted-foreground">{product.color}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-foreground font-semibold">Rp.{product.price.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onQuantityChange(product.id, -1)}
                      disabled={product.quantity === 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-12 text-center font-medium text-foreground">
                      {product.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onQuantityChange(product.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(product)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(product.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
