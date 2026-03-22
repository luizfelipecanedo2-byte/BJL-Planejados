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

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormOpen(true);
  };

  const handleNewSale = () => {
    setEditingSale(null);
    setFormOpen(true);
  };

  return (

    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-500 to-amber-700 text-glow">Vendas</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Gestão de Negociações High-End</p>
        </div>
        <MagicButton onClick={handleNewSale} className="gap-1.5 h-11 px-6 shadow-xl shadow-primary/20">
          <Plus className="h-4 w-4" />
          Nova Venda
        </MagicButton>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-white/50 backdrop-blur-xl border border-white/40 p-1.5 rounded-full h-auto shadow-sm inline-flex">
          <TabsTrigger value="dashboard" className="gap-2 rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-bold">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2 rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-bold">
            <Table2 className="h-4 w-4" />
            Tabela
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2 rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-bold">
            <Columns3 className="h-4 w-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

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
