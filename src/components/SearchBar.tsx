import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Store search query in sessionStorage so other pages can access it
      sessionStorage.setItem("searchQuery", query);
      toast.success(`Searching for: ${query}`);
      // Redirect to analytics or products page based on context
      navigate("/products");
    } else {
      toast.error("Please enter a search term");
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-2xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search products, suppliers, or transactions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
};
