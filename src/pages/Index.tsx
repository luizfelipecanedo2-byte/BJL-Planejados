import { useState } from "react";
import { useSales } from "@/hooks/useSales";
import { Sale, STATUS_LABELS, CHANNEL_LABELS, TEMPERATURE_LABELS } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import Dashboard from "@/components/crm/Dashboard";
import SalesTable from "@/components/crm/SalesTable";
import KanbanBoard from "@/components/crm/KanbanBoard";
import SaleFormDialog from "@/components/crm/SaleFormDialog";
import { Button } from "@/components/ui/button";
import { MagicButton } from "@/components/ui/magic-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Table2,
  Columns3,
  Plus,
  TrendingUp,
  Printer,
} from "lucide-react";

const Index = () => {
  const { sales, addSale, updateSale, deleteSale, updateStatus } = useSales();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const handlePrintSalesReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.");
      return;
    }

    const reportDate = new Date().toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const totalRevenue = sales
      .filter(s => s.status === 'fechado' || s.status === 'pos_venda')
      .reduce((sum, s) => sum + (s.totalValue || 0), 0);

    const pipelineValue = sales
      .filter(s => !['fechado', 'nao_fechou', 'congelado', 'pos_venda'].includes(s.status))
      .reduce((sum, s) => sum + (s.totalValue || 0), 0);

    const lostValue = sales
      .filter(s => ['nao_fechou', 'congelado'].includes(s.status))
      .reduce((sum, s) => sum + (s.totalValue || 0), 0);

    const closedCount = sales.filter(s => s.status === 'fechado' || s.status === 'pos_venda').length;
    const conversionRate = sales.length > 0 ? Math.round((closedCount / sales.length) * 100) : 0;
    const avgTicket = closedCount > 0 ? totalRevenue / closedCount : 0;

    const statusCounts: Record<string, number> = {
      prospecto: 0,
      contato: 0,
      visita: 0,
      projeto: 0,
      negociacao: 0,
      fechado: 0,
      nao_fechou: 0,
      congelado: 0,
      pos_venda: 0
    };

    sales.forEach(s => {
      if (statusCounts[s.status] !== undefined) {
        statusCounts[s.status]++;
      }
    });

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório de Vendas - BJL Planejados</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #334155;
            margin: 20px;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #b8860b;
            padding-bottom: 15px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-info h1 {
            font-size: 24px;
            color: #0f172a;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-info p {
            font-size: 13px;
            color: #64748b;
            margin: 0;
          }
          .header-logo {
            font-size: 20px;
            font-weight: 900;
            color: #b8860b;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            background: #fafaf9;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .card-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 5px;
          }
          .card-value {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }
          .card-value.income { color: #16a34a; }
          .card-value.pipeline { color: #d97706; }
          .card-value.lost { color: #dc2626; }
          
          .status-summary {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 30px;
          }
          .status-summary h3 {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            margin: 0 0 12px 0;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
          }
          .status-grid {
            display: grid;
            grid-template-columns: repeat(9, 1fr);
            gap: 10px;
            text-align: center;
          }
          .status-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .status-count {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
          }
          .status-name {
            font-size: 8px;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .report-table th {
            text-align: left;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            padding: 10px 8px;
            background: #f1f5f9;
            border-bottom: 2px solid #cbd5e1;
          }
          .report-table td {
            font-size: 12px;
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .status-badge.prospecto { background: #fee2e2; color: #991b1b; }
          .status-badge.contato { background: #ffedd5; color: #c2410c; }
          .status-badge.visita { background: #fef9c3; color: #854d0e; }
          .status-badge.projeto { background: #e0f2fe; color: #0369a1; }
          .status-badge.negociacao { background: #fae8ff; color: #86198f; }
          .status-badge.fechado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          .status-badge.nao_fechou { background: #fee2e2; color: #991b1b; }
          .status-badge.congelado { background: #f1f5f9; color: #475569; }
          .status-badge.pos_venda { background: #e0e7ff; color: #3730a3; }

          .temp-badge {
            font-size: 10px;
          }
          
          .value-cell {
            font-weight: 700;
            text-align: right;
          }
          .value-cell.closed { color: #15803d; }
          .value-cell.pipeline { color: #b45309; }
          .value-cell.lost { color: #991b1b; }

          @media print {
            .no-print {
              display: none;
            }
            body {
              margin: 10px;
            }
          }
          .print-btn-container {
            text-align: right;
            margin-bottom: 20px;
          }
          .print-btn {
            background: #b8860b;
            color: white;
            border: none;
            padding: 10px 18px;
            font-size: 12px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: background-color 0.2s;
          }
          .print-btn:hover {
            background: #856404;
          }
        </style>
      </head>
      <body>
        <div class="print-btn-container no-print">
          <button class="print-btn" onclick="window.print()">Imprimir PDF / Relatório</button>
        </div>
        <div class="header">
          <div class="header-info">
            <h1>Relatório Geral de Vendas</h1>
            <p>Gerado em: ${reportDate}</p>
          </div>
          <div class="header-logo">
            BJL Planejados
          </div>
        </div>

        <div class="summary-cards">
          <div class="card">
            <div class="card-title">Receita Fechada</div>
            <div class="card-value income">${formatCurrency(totalRevenue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Pipeline Ativo</div>
            <div class="card-value pipeline">${formatCurrency(pipelineValue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Ticket Médio</div>
            <div class="card-value">${formatCurrency(avgTicket)}</div>
          </div>
          <div class="card">
            <div class="card-title">Conversão Geral</div>
            <div class="card-value">${conversionRate}%</div>
          </div>
        </div>

        <div class="status-summary">
          <h3>Negócios por Etapa</h3>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-count">${statusCounts.prospecto}</span>
              <span class="status-name" title="Prospecto">Prospecto</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.contato}</span>
              <span class="status-name" title="Contato">Contato</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.visita}</span>
              <span class="status-name" title="Visita">Visita</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.projeto}</span>
              <span class="status-name" title="Projeto">Projeto</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.negociacao}</span>
              <span class="status-name" title="Negociação">Negociação</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.fechado}</span>
              <span class="status-name" title="Fechado">Fechado</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.pos_venda}</span>
              <span class="status-name" title="Pós Venda">Pós Venda</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.congelado}</span>
              <span class="status-name" title="Congelado">Congelado</span>
            </div>
            <div class="status-item">
              <span class="status-count">${statusCounts.nao_fechou}</span>
              <span class="status-name" title="Não Fechou">Não Fechou</span>
            </div>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 10%">Data</th>
              <th style="width: 22%">Cliente</th>
              <th style="width: 15%">Profissão</th>
              <th style="width: 18%">Produto/Projeto</th>
              <th style="width: 11%">Canal</th>
              <th style="width: 8%">Temp.</th>
              <th style="width: 8%">Status</th>
              <th style="width: 8%; text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (sales.length === 0) {
      html += `
        <tr>
          <td colspan="8" style="text-align: center; color: #94a3b8; font-style: italic; padding: 20px;">
            Nenhum negócio de venda cadastrado no sistema.
          </td>
        </tr>
      `;
    } else {
      const sortedSales = [...sales].sort((a, b) => {
        return new Date(b.contactDate || b.createdAt).getTime() - new Date(a.contactDate || a.createdAt).getTime();
      });

      sortedSales.forEach(sale => {
        const dateObj = new Date(sale.contactDate || sale.createdAt);
        const formattedDate = isNaN(dateObj.getTime())
          ? "-"
          : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

        const statusLabel = STATUS_LABELS[sale.status] || sale.status;
        const channelLabel = sale.channel ? (CHANNEL_LABELS[sale.channel] || sale.channel) : "-";
        const tempLabel = sale.temperature ? (TEMPERATURE_LABELS[sale.temperature] || sale.temperature) : "-";
        
        const isClosed = sale.status === 'fechado' || sale.status === 'pos_venda';
        const isLost = sale.status === 'nao_fechou' || sale.status === 'congelado';
        const valueClass = isClosed ? 'closed' : (isLost ? 'lost' : 'pipeline');

        html += `
          <tr>
            <td>${formattedDate}</td>
            <td style="font-weight: 600;">${sale.clientName}</td>
            <td>${sale.clientProfession || "-"}</td>
            <td>${sale.product} ${sale.quantity > 1 ? `(x${sale.quantity})` : ''}</td>
            <td>${channelLabel}</td>
            <td class="temp-badge">${tempLabel}</td>
            <td>
              <span class="status-badge ${sale.status}">${statusLabel}</span>
            </td>
            <td class="value-cell ${valueClass}">
              ${formatCurrency(sale.totalValue)}
            </td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

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
          <h2 className="text-5xl font-['Cinzel'] font-bold text-luxury tracking-wider shimmer-gold text-glow uppercase">Vendas</h2>
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-primary/60 rounded-full" />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/60">Gestão de Negociações Premium</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handlePrintSalesReport} 
            variant="outline" 
            className="gap-2.5 h-12 px-6 border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:scale-105 duration-500"
          >
            <Printer className="h-5 w-5 text-amber-500" />
            <span className="text-luxury font-bold text-white">Imprimir Relatório</span>
          </Button>
          <MagicButton onClick={handleNewSale} className="gap-2.5 h-12 px-8 shadow-2xl shadow-primary/20 hover:scale-105 transition-transform duration-500 rounded-2xl">
            <Plus className="h-5 w-5" />
            <span className="text-luxury font-bold">Nova Venda</span>
          </MagicButton>
        </div>
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
