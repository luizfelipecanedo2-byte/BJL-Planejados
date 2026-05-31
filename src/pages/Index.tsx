import { useState } from "react";
import { useSales } from "@/hooks/useSales";
import { Sale } from "@/types/sale";
import Dashboard from "@/components/crm/Dashboard";
import SalesTable from "@/components/crm/SalesTable";
import KanbanBoard from "@/components/crm/KanbanBoard";
import SaleFormDialog from "@/components/crm/SaleFormDialog";
import { Button } from "@/components/ui/button";
import { MagicButton } from "@/components/ui/magic-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Table2,
  Columns3,
  Plus,
  TrendingUp,
} from "lucide-react";

const Index = () => {
  const { sales, addSale, updateSale, deleteSale, updateStatus } = useSales();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const handleQuickAddSale = async (status: Sale["status"], clientName: string, product: string, totalValue: number) => {
    try {
      await addSale({
        clientName,
        product: product || "Geral",
        totalValue,
        quantity: 1,
        unitPrice: totalValue,
        status,
        channel: "",
        clientPhone: "",
        clientEmail: "",
        contactDate: new Date().toISOString().split("T")[0],
        expectedCloseDate: "",
        notes: "",
        temperature: "morno"
      });
    } catch (e) {
      console.error("Error adding quick sale:", e);
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormOpen(true);
  };

  const handleNewSale = () => {
    setEditingSale(null);
    setFormOpen(true);
  };

  return (

    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-5xl font-black tracking-tighter text-luxury shimmer-gold text-glow">Vendas</h2>
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-primary/60 rounded-full" />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/60">Gestão de Negociações Premium</p>
          </div>
        </div>
        <MagicButton onClick={handleNewSale} className="gap-2.5 h-12 px-8 shadow-2xl shadow-primary/20 hover:scale-105 transition-transform duration-500 rounded-2xl">
          <Plus className="h-5 w-5" />
          <span className="text-luxury font-bold">Nova Venda</span>
        </MagicButton>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <div className="flex justify-center sm:justify-start">
          <TabsList className="bg-white/5 backdrop-blur-2xl border border-white/5 p-1.5 rounded-[2rem] h-auto shadow-2xl inline-flex luxury-shadow">
            <TabsTrigger value="dashboard" className="gap-2.5 rounded-[1.5rem] px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-500 font-bold text-luxury text-sm">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2.5 rounded-[1.5rem] px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-500 font-bold text-luxury text-sm">
              <Table2 className="h-4 w-4" />
              Tabela
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2.5 rounded-[1.5rem] px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-500 font-bold text-luxury text-sm">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard">
          <Dashboard sales={sales} />
        </TabsContent>

        <TabsContent value="table">
          <SalesTable
            sales={sales}
            onStatusChange={updateStatus}
            onDelete={deleteSale}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanBoard
            sales={sales}
            onStatusChange={updateStatus}
            onEdit={handleEdit}
            onAddQuickSale={handleQuickAddSale}
          />
        </TabsContent>
      </Tabs>

      <SaleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={addSale}
        onUpdate={updateSale}
        editingSale={editingSale}
      />
    </div>
  );

};

export default Index;
