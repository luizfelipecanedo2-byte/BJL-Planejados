import { useState, useMemo } from "react";
import { useSales } from "@/hooks/useSales";
import { Sale, STATUS_LABELS, CHANNEL_LABELS, TEMPERATURE_LABELS } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import { cn } from "@/lib/utils";
import Dashboard from "@/components/crm/Dashboard";
import SalesTable from "@/components/crm/SalesTable";
import KanbanBoard from "@/components/crm/KanbanBoard";
import SaleFormDialog from "@/components/crm/SaleFormDialog";
import { Button } from "@/components/ui/button";
import { MagicButton } from "@/components/ui/magic-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Table2,
  Columns3,
  Plus,
  TrendingUp,
  Printer,
  Sparkles,
  Flame,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  SlidersHorizontal,
  FileText
} from "lucide-react";

const Index = () => {
  const { sales, addSale, updateSale, deleteSale, updateStatus } = useSales();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "hot" | "negotiation" | "closed">("all");

  const hotCount = useMemo(() => sales.filter(s => s.temperature === "alta" || s.status === "visita" || s.status === "projeto").length, [sales]);
  const negotiationCount = useMemo(() => sales.filter(s => s.status === "negociacao").length, [sales]);
  const closedCount = useMemo(() => sales.filter(s => s.status === "fechado" || s.status === "pos_venda").length, [sales]);

  const filteredSales = useMemo(() => {
    if (activeFilter === "hot") {
      return sales.filter(s => s.temperature === "alta" || s.status === "visita" || s.status === "projeto");
    }
    if (activeFilter === "negotiation") {
      return sales.filter(s => s.status === "negociacao");
    }
    if (activeFilter === "closed") {
      return sales.filter(s => s.status === "fechado" || s.status === "pos_venda");
    }
    return sales;
  }, [sales, activeFilter]);

  type PrintMode = "all" | "negotiation" | "closed" | "hot" | "current";

  const handlePrintSalesReport = (mode: PrintMode = "all") => {
    let targetSales: Sale[] = [];
    let reportTitle = "";
    let reportSubtitle = "";
    let reportFilterBadge = "";

    if (mode === "negotiation") {
      targetSales = sales.filter(s => s.status === "negociacao");
      reportTitle = "Relatório Comercial - Clientes em Negociação";
      reportSubtitle = "Propostas comerciais abertas para acompanhamento e fechamento";
      reportFilterBadge = "Etapa: Em Negociação";
    } else if (mode === "closed") {
      targetSales = sales.filter(s => s.status === "fechado" || s.status === "pos_venda");
      reportTitle = "Relatório de Vendas - Negócios Fechados";
      reportSubtitle = "Contratos fechados e pós-venda confirmados • BJL Planejados";
      reportFilterBadge = "Etapa: Fechados & Pós-Venda";
    } else if (mode === "hot") {
      targetSales = sales.filter(s => s.temperature === "quente" || s.status === "visita" || s.status === "projeto");
      reportTitle = "Relatório Comercial - Leads Quentes";
      reportSubtitle = "Oportunidades de alta prioridade, visitas e projetos ativos";
      reportFilterBadge = "Prioridade: Leads Quentes";
    } else if (mode === "current") {
      targetSales = filteredSales;
      const currentName = activeFilter === "negotiation" 
        ? "Em Negociação" 
        : activeFilter === "closed" 
        ? "Negócios Fechados" 
        : activeFilter === "hot" 
        ? "Leads Quentes" 
        : "Todos os Negócios";
      reportTitle = `Relatório Comercial - ${currentName}`;
      reportSubtitle = `Listagem conforme filtro selecionado na tela operacional`;
      reportFilterBadge = `Filtro Aplicado: ${currentName}`;
    } else {
      targetSales = sales;
      reportTitle = "Relatório Geral de Vendas - Funil Completo";
      reportSubtitle = "Visão executiva e operacional de todas as etapas do CRM";
      reportFilterBadge = "Todos os Negócios (Funil Completo)";
    }

    if (targetSales.length === 0) {
      toast.info(`Nenhum negócio encontrado para a seleção: ${reportTitle}.`);
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups do navegador está ativo.");
      return;
    }

    const reportDate = new Date().toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const totalListValue = targetSales.reduce((sum, s) => sum + (s.totalValue || 0), 0);
    const avgListValue = targetSales.length > 0 ? totalListValue / targetSales.length : 0;

    const formatDateBr = (d?: string) => {
      if (!d) return "-";
      const clean = d.split("T")[0];
      const parts = clean.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return clean;
    };

    // Mode-specific KPI cards
    let cardsHtml = "";
    if (mode === "negotiation") {
      const hotInNeg = targetSales.filter(s => s.temperature === "quente").length;
      cardsHtml = `
        <div class="summary-cards">
          <div class="card">
            <div class="card-title">Total em Negociação</div>
            <div class="card-value pipeline">${formatCurrency(totalListValue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Propostas em Aberto</div>
            <div class="card-value">${targetSales.length} clientes</div>
          </div>
          <div class="card">
            <div class="card-title">Ticket Médio em Negociação</div>
            <div class="card-value">${formatCurrency(avgListValue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Propostas Quentes</div>
            <div class="card-value" style="color: #ea580c;">${hotInNeg} prioritárias</div>
          </div>
        </div>
      `;
    } else if (mode === "closed") {
      const fechadoCount = targetSales.filter(s => s.status === "fechado").length;
      const posVendaCount = targetSales.filter(s => s.status === "pos_venda").length;
      cardsHtml = `
        <div class="summary-cards">
          <div class="card">
            <div class="card-title">Faturamento Total Fechado</div>
            <div class="card-value income">${formatCurrency(totalListValue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Contratos Fechados</div>
            <div class="card-value income">${fechadoCount} contratos</div>
          </div>
          <div class="card">
            <div class="card-title">Ticket Médio Fechado</div>
            <div class="card-value">${formatCurrency(avgListValue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Em Pós-Venda</div>
            <div class="card-value" style="color: #4f46e5;">${posVendaCount} em execução</div>
          </div>
        </div>
      `;
    } else if (mode === "hot") {
      const visitasProjetos = targetSales.filter(s => s.status === "visita" || s.status === "projeto").length;
      cardsHtml = `
        <div class="summary-cards">
          <div class="card">
            <div class="card-title">Pipeline Quente Total</div>
            <div class="card-value" style="color: #ea580c;">${formatCurrency(totalListValue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Leads de Alta Prioridade</div>
            <div class="card-value">${targetSales.length} clientes</div>
          </div>
          <div class="card">
            <div class="card-title">Ticket Médio Estimado</div>
            <div class="card-value">${formatCurrency(avgListValue)}</div>
          </div>
          <div class="card">
            <div class="card-title">Em Visita / Projeto</div>
            <div class="card-value" style="color: #0284c7;">${visitasProjetos} oportunidades</div>
          </div>
        </div>
      `;
    } else {
      const totalRevenue = sales
        .filter(s => s.status === 'fechado' || s.status === 'pos_venda')
        .reduce((sum, s) => sum + (s.totalValue || 0), 0);

      const pipelineValue = sales
        .filter(s => !['fechado', 'nao_fechou', 'congelado', 'pos_venda'].includes(s.status))
        .reduce((sum, s) => sum + (s.totalValue || 0), 0);

      const closedCountVal = sales.filter(s => s.status === 'fechado' || s.status === 'pos_venda').length;
      const conversionRate = sales.length > 0 ? Math.round((closedCountVal / sales.length) * 100) : 0;
      const avgTicket = closedCountVal > 0 ? totalRevenue / closedCountVal : 0;

      cardsHtml = `
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
            <div class="card-title">Ticket Médio (Fechados)</div>
            <div class="card-value">${formatCurrency(avgTicket)}</div>
          </div>
          <div class="card">
            <div class="card-title">Conversão Geral</div>
            <div class="card-value">${conversionRate}%</div>
          </div>
        </div>
      `;
    }

    // Pipeline status summary for "all" mode
    let statusSummaryHtml = "";
    if (mode === "all") {
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

      statusSummaryHtml = `
        <div class="status-summary">
          <h3>Distribuição por Etapa do Funil</h3>
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
      `;
    }

    // Sort targetSales chronologically
    const sortedSales = [...targetSales].sort((a, b) => {
      const dateA = new Date(a.contactDate || a.createdAt).getTime();
      const dateB = new Date(b.contactDate || b.createdAt).getTime();
      return dateB - dateA;
    });

    let rowsHtml = "";
    if (sortedSales.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="8" style="text-align: center; color: #94a3b8; font-style: italic; padding: 30px;">
            Nenhum negócio encontrado para esta seleção.
          </td>
        </tr>
      `;
    } else {
      sortedSales.forEach(sale => {
        const statusLabel = STATUS_LABELS[sale.status] || sale.status;
        const channelLabel = sale.channel ? (CHANNEL_LABELS[sale.channel] || sale.channel) : "-";
        const tempLabel = sale.temperature ? (TEMPERATURE_LABELS[sale.temperature] || sale.temperature) : "-";
        
        const isClosed = sale.status === 'fechado' || sale.status === 'pos_venda';
        const isLost = sale.status === 'nao_fechou' || sale.status === 'congelado';
        const valueClass = isClosed ? 'closed' : (isLost ? 'lost' : 'pipeline');

        const phoneDisplay = sale.clientPhone 
          ? `<span class="client-phone">📞 ${sale.clientPhone}</span>` 
          : `<span style="color: #cbd5e1;">-</span>`;

        const dateDisplay = formatDateBr(sale.contactDate || sale.createdAt);
        const expectedDateDisplay = sale.expectedCloseDate 
          ? `<div class="expected-date">Prev: ${formatDateBr(sale.expectedCloseDate)}</div>` 
          : "";

        const clientProf = sale.clientProfession 
          ? `<div class="client-prof">${sale.clientProfession}</div>` 
          : "";

        rowsHtml += `
          <tr>
            <td>
              <div class="date-main">${dateDisplay}</div>
              ${expectedDateDisplay}
            </td>
            <td>
              <div class="client-name">${sale.clientName}</div>
              ${clientProf}
            </td>
            <td>
              ${phoneDisplay}
              ${sale.clientEmail ? `<div class="client-email">${sale.clientEmail}</div>` : ''}
            </td>
            <td>
              <div class="product-name">${sale.product}</div>
              ${sale.quantity > 1 ? `<div class="product-qty">Qtd: ${sale.quantity}</div>` : ''}
            </td>
            <td><span class="channel-tag">${channelLabel}</span></td>
            <td class="temp-badge">${tempLabel}</td>
            <td><span class="status-badge ${sale.status}">${statusLabel}</span></td>
            <td class="value-cell ${valueClass}">${formatCurrency(sale.totalValue)}</td>
          </tr>
        `;
      });
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle} - BJL Planejados</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 20px;
            background: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header {
            border-bottom: 2px solid #b8860b;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-info h1 {
            font-size: 20px;
            color: #0f172a;
            margin: 0 0 4px 0;
            font-weight: 800;
            letter-spacing: -0.3px;
          }
          .header-info p {
            font-size: 12px;
            color: #64748b;
            margin: 0;
          }
          .badge-filter {
            display: inline-block;
            background: #f1f5f9;
            color: #334155;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            margin-top: 4px;
            border: 1px solid #cbd5e1;
          }
          .header-logo {
            text-align: right;
          }
          .logo-title {
            font-size: 18px;
            font-weight: 900;
            color: #b8860b;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .logo-sub {
            font-size: 10px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 14px;
            background: #fafaf9;
          }
          .card-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
          }
          .card-value {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
          }
          .card-value.income { color: #16a34a; }
          .card-value.pipeline { color: #d97706; }
          .card-value.lost { color: #dc2626; }
          
          .status-summary {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 20px;
          }
          .status-summary h3 {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            margin: 0 0 10px 0;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          .status-grid {
            display: grid;
            grid-template-columns: repeat(9, 1fr);
            gap: 8px;
            text-align: center;
          }
          .status-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .status-count {
            font-size: 15px;
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
            margin-bottom: 25px;
          }
          .report-table th {
            text-align: left;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            padding: 8px 8px;
            background: #f1f5f9;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #cbd5e1;
          }
          .report-table td {
            font-size: 11px;
            padding: 8px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
            vertical-align: middle;
          }
          .report-table tr:nth-child(even) td {
            background-color: #fafbfc;
          }
          .date-main {
            font-weight: 600;
            color: #1e293b;
          }
          .expected-date {
            font-size: 9px;
            color: #b45309;
            font-weight: 600;
          }
          .client-name {
            font-weight: 700;
            color: #0f172a;
          }
          .client-prof {
            font-size: 9px;
            color: #64748b;
          }
          .client-phone {
            font-weight: 600;
            color: #0f172a;
            white-space: nowrap;
          }
          .client-email {
            font-size: 9px;
            color: #64748b;
            max-width: 140px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .product-name {
            font-weight: 600;
          }
          .product-qty {
            font-size: 9px;
            color: #64748b;
          }
          .channel-tag {
            font-size: 10px;
            color: #475569;
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
          .status-badge.negociacao { background: #fae8ff; color: #86198f; font-weight: 900; }
          .status-badge.fechado { background: #dcfce7; color: #15803d; border: 1px solid #86efac; font-weight: 900; }
          .status-badge.nao_fechou { background: #fee2e2; color: #991b1b; }
          .status-badge.congelado { background: #f1f5f9; color: #475569; }
          .status-badge.pos_venda { background: #e0e7ff; color: #3730a3; font-weight: 900; }

          .temp-badge {
            font-size: 10px;
            font-weight: 600;
          }
          
          .value-cell {
            font-weight: 800;
            text-align: right;
            white-space: nowrap;
          }
          .value-cell.closed { color: #15803d; }
          .value-cell.pipeline { color: #b45309; }
          .value-cell.lost { color: #991b1b; }

          .table-footer {
            background: #f1f5f9;
            font-weight: 800;
            border-top: 2px solid #94a3b8;
            border-bottom: 2px solid #94a3b8;
          }
          .table-footer td {
            padding: 10px 8px;
            font-size: 12px;
          }

          @media print {
            .no-print {
              display: none !important;
            }
            body {
              margin: 0;
            }
            tr {
              page-break-inside: avoid;
            }
          }
          .action-bar {
            background: #0f172a;
            color: #fff;
            padding: 12px 18px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .action-bar p {
            margin: 0;
            font-size: 12px;
            font-weight: 500;
            color: #cbd5e1;
          }
          .action-bar .btn-group {
            display: flex;
            gap: 10px;
          }
          .print-btn {
            background: #b8860b;
            color: white;
            border: none;
            padding: 8px 16px;
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
          .close-btn {
            background: transparent;
            color: #94a3b8;
            border: 1px solid #475569;
            padding: 8px 14px;
            font-size: 12px;
            border-radius: 6px;
            cursor: pointer;
          }
          .close-btn:hover {
            background: rgba(255,255,255,0.08);
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="action-bar no-print">
          <div>
            <strong style="color: #fff; font-size: 13px;">${reportTitle}</strong>
            <p>${targetSales.length} negócios listados • ${reportSubtitle}</p>
          </div>
          <div class="btn-group">
            <button class="close-btn" onclick="window.close()">Fechar Janela</button>
            <button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
          </div>
        </div>

        <div class="header">
          <div class="header-info">
            <h1>${reportTitle}</h1>
            <p>Gerado em: ${reportDate} &bull; ${reportSubtitle}</p>
            <div class="badge-filter">${reportFilterBadge}</div>
          </div>
          <div class="header-logo">
            <div class="logo-title">BJL Planejados</div>
            <div class="logo-sub">Gestão Comercial &bull; CRM</div>
          </div>
        </div>

        ${cardsHtml}
        ${statusSummaryHtml}

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 11%">Data / Prev.</th>
              <th style="width: 20%">Cliente</th>
              <th style="width: 15%">Telefone / Contato</th>
              <th style="width: 18%">Produto / Ambientes</th>
              <th style="width: 10%">Canal</th>
              <th style="width: 8%">Temp.</th>
              <th style="width: 9%">Status</th>
              <th style="width: 9%; text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          ${sortedSales.length > 0 ? `
            <tfoot>
              <tr class="table-footer">
                <td colspan="7" style="text-transform: uppercase; letter-spacing: 0.5px;">
                  TOTAL GERAL (${targetSales.length} ${targetSales.length === 1 ? 'negócio' : 'negócios'})
                </td>
                <td class="value-cell ${mode === 'closed' ? 'closed' : 'pipeline'}" style="font-size: 13px;">
                  ${formatCurrency(totalListValue)}
                </td>
              </tr>
            </tfoot>
          ` : ''}
        </table>

        <div style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          BJL Planejados &bull; Documento gerado automaticamente pelo CRM em ${reportDate}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70">CRM Comercial</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              Ativo
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-['Cinzel'] font-bold text-luxury tracking-wider shimmer-gold text-glow uppercase">Vendas</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 h-11 px-5 border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:scale-105 duration-300 w-full sm:w-auto font-semibold text-xs"
              >
                <Printer className="h-4 w-4 text-amber-500" />
                <span>Imprimir CRM</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-2 bg-[#18181b]/95 backdrop-blur-xl border border-white/10 text-white rounded-2xl shadow-2xl z-50">
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-2">
                O que você deseja imprimir?
              </DropdownMenuLabel>
              
              <DropdownMenuItem 
                onClick={() => handlePrintSalesReport("negotiation")} 
                className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-purple-500/20 hover:text-purple-200 transition-colors"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Apenas em Negociação</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">{negotiationCount}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">Propostas abertas e follow-up</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => handlePrintSalesReport("closed")} 
                className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Apenas Negócios Fechados</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">{closedCount}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">Vendas e pós-venda confirmados</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => handlePrintSalesReport("hot")} 
                className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Flame className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Leads Quentes</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">{hotCount}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">Alta prioridade, visitas e projetos</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10 my-1.5" />

              <DropdownMenuItem 
                onClick={() => handlePrintSalesReport("all")} 
                className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="p-2 rounded-lg bg-white/5 text-primary">
                  <Printer className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Todos os Negócios</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground font-bold">{sales.length}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">Pipeline geral e todas as etapas</div>
                </div>
              </DropdownMenuItem>

              {activeFilter !== "all" && (
                <>
                  <DropdownMenuSeparator className="bg-white/10 my-1.5" />
                  <DropdownMenuItem 
                    onClick={() => handlePrintSalesReport("current")} 
                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Filtro Atual da Tela</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">{filteredSales.length}</span>
                      </div>
                      <div className="text-[11px] opacity-80 truncate">Imprimir lista exibida agora</div>
                    </div>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <MagicButton onClick={handleNewSale} className="gap-2 h-11 px-6 shadow-xl shadow-primary/20 hover:scale-105 transition-transform duration-300 rounded-2xl w-full sm:w-auto font-bold text-xs">
            <Plus className="h-4 w-4" />
            <span>Nova Venda</span>
          </MagicButton>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex justify-start overflow-x-auto no-scrollbar max-w-full pb-1">
            <TabsList className="glass-panel-pro p-1.5 rounded-2xl h-auto shadow-xl inline-flex min-w-max">
              <TabsTrigger value="dashboard" className="gap-2 rounded-xl px-5 sm:px-7 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs transition-all duration-300">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2 rounded-xl px-5 sm:px-7 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs transition-all duration-300">
                <Table2 className="h-4 w-4" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2 rounded-xl px-5 sm:px-7 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs transition-all duration-300">
                <Columns3 className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </div>

          {/* High-Tech Pill Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold pill-filter-item border flex items-center gap-1.5 shrink-0 transition-all",
                activeFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-white/5 text-muted-foreground border-white/5 hover:border-white/20 hover:text-foreground"
              )}
            >
              <span>Todos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">{sales.length}</span>
            </button>
            <button
              onClick={() => setActiveFilter("hot")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold pill-filter-item border flex items-center gap-1.5 shrink-0 transition-all",
                activeFilter === "hot"
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-white/5 text-muted-foreground border-white/5 hover:border-amber-500/30 hover:text-amber-400"
              )}
            >
              <Flame className="h-3 w-3" />
              <span>Quentes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">{hotCount}</span>
            </button>
            <button
              onClick={() => setActiveFilter("negotiation")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold pill-filter-item border flex items-center gap-1.5 shrink-0 transition-all",
                activeFilter === "negotiation"
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-white/5 text-muted-foreground border-white/5 hover:border-purple-500/30 hover:text-purple-400"
              )}
            >
              <MessageSquare className="h-3 w-3" />
              <span>Negociação</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">{negotiationCount}</span>
            </button>
            <button
              onClick={() => setActiveFilter("closed")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold pill-filter-item border flex items-center gap-1.5 shrink-0 transition-all",
                activeFilter === "closed"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white/5 text-muted-foreground border-white/5 hover:border-emerald-500/30 hover:text-emerald-400"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Fechados</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">{closedCount}</span>
            </button>

            {/* Quick print shortcut for the active filter when not on 'all' */}
            {activeFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePrintSalesReport("current")}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-white hover:bg-white/10 rounded-full gap-1.5 border border-white/10 shrink-0 transition-all"
                title={`Imprimir diretamente a lista de ${activeFilter === "negotiation" ? "Negociação" : activeFilter === "closed" ? "Fechados" : "Quentes"}`}
              >
                <Printer className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline font-semibold">
                  Imprimir {activeFilter === "negotiation" ? "Negociação" : activeFilter === "closed" ? "Fechados" : "Quentes"}
                </span>
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="dashboard">
          <Dashboard sales={sales} />
        </TabsContent>

        <TabsContent value="table">
          <SalesTable
            sales={filteredSales}
            onStatusChange={updateStatus}
            onDelete={deleteSale}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanBoard
            sales={filteredSales}
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
