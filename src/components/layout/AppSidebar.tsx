import { Home, User, FolderOpen, Zap, TrendingUp, Package, LogOut, FileText, PackageX, Apple, Ban, Moon, Sun, Wallet, ShoppingCart, Truck, RotateCcw, AlertCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/", icon: Home, label: "Beranda" },
  { to: "/order", icon: ShoppingCart, label: "Pesanan" },
  { to: "/invoices", icon: FileText, label: "Invoice" },
  { to: "/recap", icon: FolderOpen, label: "Rekap" },
  { to: "/process", icon: Truck, label: "Proses" },
  { to: "/returns", icon: RotateCcw, label: "Retur" },
  { to: "/rejected", icon: Ban, label: "Retur & Pengembalian" },
  { to: "/payment", icon: Wallet, label: "Pembayaran" },
  { to: "/products", icon: Package, label: "Inventori Bahan Baku" },
  { to: "/analytics", icon: TrendingUp, label: "Analisis Bahan Baku" },
  { to: "/food-condition", icon: AlertCircle, label: "Kualitas Bahan Baku" },
  { to: "/projects", icon: FolderOpen, label: "Pasokan Bahan Baku" },
];

export const AppSidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout berhasil",
      description: "Anda telah keluar dari aplikasi.",
    });
    navigate("/auth");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">MBG</h1>
            <p className="text-xs text-sidebar-foreground/60">Makan Bergizi Gratis</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 mx-2",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )
                      }
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2 border-t border-sidebar-border">
        <Button
          onClick={toggleTheme}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="text-sm">Toggle Theme</span>
        </Button>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
