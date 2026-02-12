import { useState } from "react";
import { useSales } from "@/hooks/useSales";
import { Sale } from "@/types/sale";
import Dashboard from "@/components/crm/Dashboard";
import SalesTable from "@/components/crm/SalesTable";
import KanbanBoard from "@/components/crm/KanbanBoard";
import SaleFormDialog from "@/components/crm/SaleFormDialog";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Vendas</h2>
        <Button onClick={handleNewSale} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1.5">
            <Table2 className="h-3.5 w-3.5" />
            Tabela
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <Columns3 className="h-3.5 w-3.5" />
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
