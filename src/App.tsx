import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/layout/AppSidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Analytics from "./pages/Analytics";
import Projects from "./pages/Projects";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Invoices from "./pages/Invoices";
import Returns from "./pages/Returns";
import FoodCondition from "./pages/FoodCondition";
import Rejected from "./pages/Rejected";
import Profile from "./pages/Profile";
import Order from "./pages/Order";
import Recap from "./pages/Recap";
import Process from "./pages/Process";
import Payment from "./pages/Payment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <SidebarInset className="flex-1">
                      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
                        <SidebarTrigger className="-ml-1" />
                        <div className="flex-1" />
                      </header>
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/order" element={<Order />} />
                          <Route path="/invoices" element={<Invoices />} />
                          <Route path="/recap" element={<Recap />} />
                          <Route path="/process" element={<Process />} />
                          <Route path="/returns" element={<Returns />} />
                          <Route path="/rejected" element={<Rejected />} />
                          <Route path="/payment" element={<Payment />} />
                          <Route path="/products" element={<Products />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/food-condition" element={<FoodCondition />} />
                          <Route path="/projects" element={<Projects />} />
                          <Route path="/profile" element={<Profile />} />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </SidebarInset>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
