import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, TrendingDown, DollarSign, Search, ChevronLeft, ChevronRight, Users, Calendar, AlertTriangle, Receipt, FileSearch, Package, Target } from "lucide-react";
import { useState, useMemo, useEffect, Fragment } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Transaction, CATEGORIES, SUBCATEGORIES, PAYMENT_METHODS } from "@/types/finance";
import TransactionTable from "@/components/crm/TransactionTable";
import TransactionFormDialog from "@/components/crm/TransactionFormDialog";
import AssetFormDialog from "@/components/crm/AssetFormDialog";
import { Asset } from "@/types/asset";
import { ServiceOrder } from "@/types/serviceOrder";
import { ServiceExpense } from "@/types/serviceExpense";
import ServiceExpenseFormDialog from "@/components/crm/ServiceExpenseFormDialog";
import { supabase } from "@/lib/supabase";
import { Pencil, Trash2 } from "lucide-react";

// New specialized components
import DashboardTab from "@/components/financeiro/DashboardTab";
import DRETab from "@/components/financeiro/DRETab";
import ConciliationTab from "@/components/financeiro/ConciliationTab";
import AssetsTab from "@/components/financeiro/AssetsTab";
import ServiceExpensesTab from "@/components/financeiro/ServiceExpensesTab";
import NotaFiscalTab from "@/components/financeiro/NotaFiscalTab";
import PartialPaymentDialog from "@/components/financeiro/PartialPaymentDialog";
import ProfitabilityTab from "@/components/financeiro/ProfitabilityTab";

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [serviceExpenses, setServiceExpenses] = useState<ServiceExpense[]>([]);
  const [transactionAllocations, setTransactionAllocations] = useState<any[]>([]);

  useEffect(() => {
    fetchTransactions();
    fetchAssets();
    fetchServiceOrders();
    fetchServiceExpenses();
    fetchTransactionAllocations();
  }, []);

  const fetchTransactionAllocations = async () => {
    try {
      const { data, error } = await supabase.from('transaction_allocations').select('*');
      if (error) throw error;
      setTransactionAllocations(data || []);
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTransactions: Transaction[] = (data || []).map(t => {
        const parseDate = (dateStr: string | null) => {
          if (!dateStr) return undefined;
          const d = new Date(dateStr + 'T12:00:00');
          return isNaN(d.getTime()) ? undefined : d;
        };

        return {
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          type: t.type as any,
          category: t.category || "Sem Categoria",
          subcategory: t.subcategory || "",
          service: t.service,
          contact: t.contact,
          financialInstitution: t.financial_institution,
          paymentMethod: t.payment_method,
          competenceDate: parseDate(t.competence_date) || new Date(),
          dueDate: parseDate(t.due_date) || new Date(),
          paymentDate: parseDate(t.payment_date),
          status: t.status as any,
          invoiceNumber: t.invoice_number,
          orderService: t.order_service,
          boletoUrl: t.boleto_url
        };
      });

      setTransactions(mappedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error("Erro ao carregar lançamentos.");
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedAssets: Asset[] = (data || []).map(a => ({
        id: a.id,
        name: a.name,
        acquisitionDate: new Date(a.acquisition_date + 'T12:00:00'),
        value: Number(a.value),
        usefulLife: Number(a.useful_life),
        depreciationRate: a.depreciation_rate ? Number(a.depreciation_rate) : undefined
      }));

      setAssets(mappedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error("Erro ao carregar patrimônio.");
    }
  };

  const fetchServiceOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedOrders: ServiceOrder[] = (data || []).map(o => ({
        id: o.id,
        ticketNumber: o.ticket_number,
        openDate: new Date(o.open_date + 'T12:00:00'),
        client: o.client,
        type: o.type as any,
        action: o.action,
        status: o.status as any,
        forecastDate: new Date(o.forecast_date + 'T12:00:00'),
        completionDate: o.completion_date ? new Date(o.completion_date + 'T12:00:00') : undefined
      }));

      setServiceOrders(mappedOrders);
    } catch (error) {
      console.error('Error fetching service orders:', error);
    }
  };

  const fetchServiceExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('service_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedExpenses: ServiceExpense[] = (data || []).map(e => ({
        id: e.id,
        clientName: e.client_name,
        environment: e.environment,
        serviceValue: Number(e.service_value),
        spentValue: Number(e.spent_value),
        items: e.items || [],
        createdAt: e.created_at ? new Date(e.created_at) : new Date()
      }));

      setServiceExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error fetching service expenses:', error);
      toast.error("Erro ao carregar gastos por serviços.");
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogInitialType, setDialogInitialType] = useState<any>("expense");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isServiceExpenseDialogOpen, setIsServiceExpenseDialogOpen] = useState(false);
  const [editingServiceExpense, setEditingServiceExpense] = useState<ServiceExpense | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const combinedServiceExpenses = useMemo(() => {
    const mappedProjects: ServiceExpense[] = serviceOrders.map(os => {
      const osString = `${os.ticketNumber} - ${os.client} (${os.action})`;
      const osAllocations = transactionAllocations.filter(a => a.client_name === osString || a.client_name === os.client);
      const allocCost = osAllocations.reduce((acc, a) => acc + Number(a.amount), 0);

      const manualExpenses = serviceExpenses.filter(e => 
        (e.clientName === os.client && e.environment === os.action) || 
        (e.clientName.includes(os.ticketNumber))
      );
      const manualCost = manualExpenses.reduce((acc, e) => acc + e.spentValue, 0);

      const revenue = os.amount || manualExpenses.reduce((acc, e) => acc + e.serviceValue, 0);

      let items: any[] = [];
      manualExpenses.forEach(e => {
        if (e.items) items = [...items, ...e.items];
      });

      const autoItems = osAllocations.map(a => {
        const parentTx = transactions.find(t => t.id === a.transaction_id);
        return {
          description: `[Rateio] ${parentTx?.description || ''} ${a.description ? `(${a.description})` : ''}`.trim(),
          unit: 'un',
          quantity: 1,
          unitValue: Number(a.amount),
          totalValue: Number(a.amount)
        };
      });

      const expenseId = manualExpenses.length > 0 ? manualExpenses[0].id : `os-${os.id}`;

      return {
        id: expenseId,
        clientName: `${os.ticketNumber} - ${os.client}`,
        environment: os.action,
        serviceValue: revenue,
        spentValue: allocCost + manualCost,
        items: items,
        autoItems: autoItems,
        createdAt: os.openDate
      };
    });

    serviceExpenses.forEach(se => {
      const matchesOS = serviceOrders.some(os => 
        (se.clientName === os.client && se.environment === os.action) || 
        (se.clientName.includes(os.ticketNumber))
      );
      if (!matchesOS) {
        mappedProjects.push(se);
      }
    });

    return mappedProjects;
  }, [serviceOrders, serviceExpenses, transactionAllocations]);

  const [isPartialPaymentOpen, setIsPartialPaymentOpen] = useState(false);
  const [selectedPartialTransaction, setSelectedPartialTransaction] = useState<Transaction | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [selectedFilterMonth, setSelectedFilterMonth] = useState<string>(new Date().getMonth().toString());
  const [dateFilterType, setDateFilterType] = useState<"competence" | "due">("due");
  const [osFilter, setOsFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showRecentlyAdded, setShowRecentlyAdded] = useState(false);
  const [showRecentlyPaid, setShowRecentlyPaid] = useState(false);

  // Dashboard State
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedDREYear, setSelectedDREYear] = useState<string>("2026");
  const [selectedDashMonth, setSelectedDashMonth] = useState<number | 'anual'>(new Date().getMonth());

  // Conciliation State
  const [selectedAccount, setSelectedAccount] = useState<string>("nubank");
  const [currentDateReconciliation, setCurrentDateReconciliation] = useState<Date>(new Date());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) {
        // Se todos os IDs passados já estão no prev, remove apenas eles
        return prev.filter(id => !ids.includes(id));
      } else {
        // Caso contrário, adiciona os que faltam (sem duplicar)
        return Array.from(new Set([...prev, ...ids]));
      }
    });
  };

  const handleBulkPay = async () => {
    if (selectedIds.length === 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          payment_date: today
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} lançamentos marcados como pagos!`);
      setSelectedIds([]);
      fetchTransactions();
    } catch (error) {
      console.error('Error in bulk payment:', error);
      toast.error("Erro ao realizar pagamento em massa.");
    }
  };

  const handlePartialPaymentSubmit = async (paidAmount: number, paymentDate: string) => {
    if (!selectedPartialTransaction) return;

    try {
      const originalTrans = selectedPartialTransaction;
      const remainingAmount = originalTrans.amount - paidAmount;

      if (remainingAmount > 0) {
        // Criar o novo lançamento pendente com o valor restante
        const newTransData = {
          description: `${originalTrans.description} (Restante)`,
          amount: remainingAmount,
          type: originalTrans.type,
          category: originalTrans.category,
          subcategory: originalTrans.subcategory,
          service: originalTrans.service,
          contact: originalTrans.contact,
          financial_institution: originalTrans.financialInstitution,
          payment_method: originalTrans.paymentMethod,
          competence_date: originalTrans.competenceDate.toISOString().split('T')[0],
          due_date: originalTrans.dueDate.toISOString().split('T')[0], // Mantém a data de vencimento original
          status: 'pending',
          invoice_number: originalTrans.invoiceNumber,
          order_service: originalTrans.orderService,
          boleto_url: originalTrans.boletoUrl
        };

        const { error: insertError } = await supabase.from('transactions').insert([newTransData]);
        if (insertError) throw insertError;
      }

      // Atualizar o original para pago
      const updateData = {
        amount: paidAmount,
        status: 'paid',
        payment_date: paymentDate
      };

      const { error: updateError } = await supabase.from('transactions').update(updateData).eq('id', originalTrans.id);
      if (updateError) throw updateError;

      toast.success("Baixa parcial realizada com sucesso!");
      fetchTransactions();
    } catch (error) {
      console.error('Error in partial payment:', error);
      toast.error("Erro ao realizar baixa parcial.");
    }
  };

  const reconciliationData = useMemo(() => {
    return transactions.filter(t => {
      if (selectedAccount === 'dinheiro') {
        return t.financialInstitution === 'Dinheiro';
      } else if (selectedAccount === 'nubank') {
        return t.financialInstitution === 'Nubank';
      }
      return false;
    });
  }, [transactions, selectedAccount]);

  const reconciliationDailyData = useMemo(() => {
    const year = currentDateReconciliation.getFullYear();
    const month = currentDateReconciliation.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const previousTransactions = reconciliationData.filter(t => {
      const tDate = new Date(t.paymentDate || t.dueDate);
      return tDate < firstDayOfMonth && t.status === 'paid';
    });

    const initialBalance = previousTransactions.reduce((acc, t) => {
      return acc + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    let runningBalance = initialBalance;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, month, day);
      const dayTransactions = reconciliationData.filter(t => {
        const tDate = new Date(t.paymentDate || t.dueDate);
        return tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year && t.status === 'paid';
      });

      const incomeTransactions = dayTransactions.filter(t => t.type === 'income');
      const expenseTransactions = dayTransactions.filter(t => t.type === 'expense');

      const income = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
      const expense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
      const dailyBalance = income - expense;
      runningBalance += dailyBalance;

      days.push({
        date: currentDayDate,
        income,
        expense,
        dailyBalance,
        accumulatedBalance: runningBalance,
        incomeTransactions,
        expenseTransactions
      });
    }

    const previousMonthDate = new Date(year, month, 0);

    return {
      initialBalance,
      previousMonthDate,
      days
    };
  }, [reconciliationData, currentDateReconciliation]);

  const totalAccountBalance = useMemo(() => {
    return reconciliationData
      .filter(t => t.status === 'paid')
      .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
  }, [reconciliationData]);

  const handlePrevMonth = () => {
    setCurrentDateReconciliation(new Date(currentDateReconciliation.getFullYear(), currentDateReconciliation.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDateReconciliation(new Date(currentDateReconciliation.getFullYear(), currentDateReconciliation.getMonth() + 1, 1));
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.service && t.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.orderService && t.orderService.toLowerCase().includes(searchTerm.toLowerCase()));

      if (showRecentlyAdded) return matchesSearch;
      if (showRecentlyPaid) return matchesSearch && t.status === 'paid';

      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const dateToCheck = dateFilterType === 'competence' ? t.competenceDate : t.dueDate;
      const tDate = new Date(dateToCheck);
      const matchesYear = tDate.getFullYear().toString() === selectedYear;
      const matchesMonth = selectedFilterMonth === "all" || tDate.getMonth().toString() === selectedFilterMonth;
      const matchesOS = osFilter === "all" || (t.orderService === osFilter);
      const matchesPaymentMethod = paymentMethodFilter === "all" || t.paymentMethod === paymentMethodFilter;

      if (showOverdueOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(t.dueDate);
        const isOverdue = t.status === 'pending' && dueDate < today;
        return matchesSearch && isOverdue;
      }

      return matchesSearch && matchesType && matchesStatus && matchesYear && matchesMonth && matchesOS && matchesPaymentMethod;
    });

    if (showRecentlyAdded) return result.slice(0, 50);
    if (showRecentlyPaid) return result.sort((a,b) => new Date(b.paymentDate || b.dueDate).getTime() - new Date(a.paymentDate || a.dueDate).getTime()).slice(0, 50);
    return result;
  }, [transactions, searchTerm, typeFilter, statusFilter, selectedYear, selectedFilterMonth, dateFilterType, osFilter, paymentMethodFilter, showOverdueOnly, showRecentlyAdded, showRecentlyPaid]);

  const metrics = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;
    return { income, expense, balance };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return months.map((month, index) => {
      const monthlyTrans = transactions.filter(t => {
        const date = new Date(t.dueDate);
        return date.getMonth() === index && date.getFullYear() === parseInt(selectedYear);
      });

      const income = monthlyTrans
        .filter(t => t.type === 'income' && t.category !== 'Transferência')
        .reduce((acc, t) => acc + t.amount, 0);

      const expense = monthlyTrans
        .filter(t => t.type === 'expense' && t.category !== 'Transferência')
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        name: month,
        Receitas: income,
        Despesas: expense,
        Saldo: income - expense
      };
    });
  }, [transactions, selectedYear]);

  const accumulatedData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let currentBalance = 0;
    return months.map((month, index) => {
      const monthlyTrans = transactions.filter(t => {
        const date = new Date(t.dueDate);
        return date.getMonth() === index && date.getFullYear() === parseInt(selectedYear);
      });
      const income = monthlyTrans.filter(t => t.type === 'income' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthlyTrans.filter(t => t.type === 'expense' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
      const monthlyBalance = income - expense;
      currentBalance += monthlyBalance;

      return {
        name: month,
        Acumulado: currentBalance
      };
    });
  }, [transactions, selectedYear]);

  const dashboardChartData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return months.map((month, index) => {
      const monthlyTrans = transactions.filter(t => {
        const date = new Date(t.dueDate);
        return date.getMonth() === index && date.getFullYear() === parseInt(selectedYear);
      });

      const accountsReceivable = monthlyTrans
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((acc, t) => acc + t.amount, 0);

      const accountsPayable = monthlyTrans
        .filter(t => t.type === 'expense' && t.status === 'pending')
        .reduce((acc, t) => acc + t.amount, 0);

      const income = monthlyTrans
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

      const expense = monthlyTrans
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        name: month,
        "A Receber": accountsReceivable,
        "A Pagar": accountsPayable,
        Saldo: income - expense
      };
    });
  }, [transactions, selectedYear]);

  const dreData = useMemo(() => {
    const yearTransactions = transactions.filter(t => {
      const date = new Date(t.dueDate);
      return !isNaN(date.getTime()) && (date.getUTCFullYear() === parseInt(selectedDREYear) || date.getFullYear() === parseInt(selectedDREYear));
    });

    const grossRevenue = yearTransactions
      .filter(t => t.type === 'income' && t.category !== 'Transferência')
      .reduce((acc, t) => acc + t.amount, 0);

    const taxes = yearTransactions.filter(t =>
      t.type === 'expense' && (
        t.category.toLowerCase().includes('imposto') ||
        t.category.toLowerCase().includes('dedução') ||
        t.subcategory?.toLowerCase().includes('simples nacional') ||
        t.subcategory?.toLowerCase().includes('iss') ||
        t.subcategory?.toLowerCase().includes('pis') ||
        t.subcategory?.toLowerCase().includes('cofins')
      )
    ).reduce((acc, t) => acc + t.amount, 0);

    const netRevenue = grossRevenue - taxes;

    // Custos Variáveis: Tudo que é custo de serviço/venda/material
    const variableCosts = yearTransactions.filter(t =>
      t.type === 'expense' &&
      [
        "Despesa com Serviço",
        "Custo dos serviços",
        "Serviços de terceiros",
        "Despesas com vendas",
        "Material",
        "Compra de Material",
        "Insumos",
        "Mão de Obra"
      ].some(cat => t.category.toLowerCase().includes(cat.toLowerCase()))
    ).reduce((acc, t) => acc + t.amount, 0);

    const contributionMargin = netRevenue - variableCosts;

    // Despesas Fixas: Tudo que é operacional/administrativo/manutenção
    const fixedExpenses = yearTransactions.filter(t =>
      t.type === 'expense' &&
      [
        "Despesa Operacional",
        "Despesa com Maquinário",
        "Despesa com Pessoal",
        "Despesas com pessoal",
        "Despesas administrativas",
        "Maquinario",
        "Aluguel",
        "Luz",
        "Água",
        "Internet",
        "Salários",
        "Retirada"
      ].some(cat => t.category.toLowerCase().includes(cat.toLowerCase()))
    ).reduce((acc, t) => acc + t.amount, 0);

    // Capturar gastos que não caíram em nenhuma categoria acima para garantir que o resultado bata com o total real
    const accountedExpenses = taxes + variableCosts + fixedExpenses;
    const totalExpenses = yearTransactions.filter(t => t.type === 'expense' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const otherExpenses = totalExpenses - accountedExpenses;

    // Se houver despesas não categorizadas, jogamos em despesas fixas para fins de cálculo do DRE gerencial simplificado, 
    // ou subtraímos do resultado final.
    const netResult = netRevenue - variableCosts - fixedExpenses - otherExpenses;

    return {
      grossRevenue,
      taxes,
      netRevenue,
      variableCosts,
      contributionMargin,
      fixedExpenses: fixedExpenses + otherExpenses,
      netResult
    };
  }, [transactions, selectedDREYear]);

  const detailedExpenses = useMemo(() => {
    const year = parseInt(selectedDREYear);
    const months = Array.from({ length: 12 }, (_, i) => i);

    // Pegar todas as categorias únicas do ano, mais as padrão
    const yearTransactions = transactions.filter(t => {
      const d = new Date(t.dueDate);
      return d.getUTCFullYear() === year || d.getFullYear() === year;
    });

    const dataCategories = Array.from(new Set(yearTransactions.map(t => t.category || "Sem Categoria")));
    const baseCategories = [...CATEGORIES.income, ...CATEGORIES.expense];
    const allCategories = Array.from(new Set([...baseCategories, ...dataCategories]));

    return allCategories.map(category => {
      if (category === 'Transferência') return null;
      const subcategories = SUBCATEGORIES[category] || [];
      const isIncome = CATEGORIES.income.includes(category) ||
        yearTransactions.some(t => t.category === category && t.type === 'income') ||
        (category === "Sem Categoria" && yearTransactions.some(t => !t.category && t.type === 'income'));

      const categoryMonthlyTotals = months.map(month => {
        return yearTransactions
          .filter(t => {
            const cat = t.category || "Sem Categoria";
            const date = new Date(t.dueDate);
            return cat === category && (date.getUTCMonth() === month || date.getMonth() === month);
          })
          .reduce((acc, t) => acc + t.amount, 0);
      });

      const categoryTotal = categoryMonthlyTotals.reduce((a, b) => a + b, 0);

      // Se a categoria não tem transações no ano e não é das padrão vazias, podemos pular
      if (categoryTotal === 0 && !baseCategories.includes(category)) return null;

      const subcategoryBreakdown = subcategories.map(sub => {
        const subMonthlyTotals = months.map(month => {
          return yearTransactions
            .filter(t => {
              const cat = t.category || "Sem Categoria";
              const date = new Date(t.dueDate);
              return cat === category && t.subcategory === sub && (date.getUTCMonth() === month || date.getMonth() === month);
            })
            .reduce((acc, t) => acc + t.amount, 0);
        });
        const subTotal = subMonthlyTotals.reduce((a, b) => a + b, 0);
        return { name: sub, monthly: subMonthlyTotals, total: subTotal };
      });

      return {
        category,
        monthly: categoryMonthlyTotals,
        total: categoryTotal,
        subcategories: subcategoryBreakdown,
        type: isIncome ? 'income' : 'expense'
      };
    }).filter(Boolean);
  }, [transactions, selectedDREYear]);

  const currentSummary = useMemo(() => {
    const isAnual = selectedDashMonth === 'anual';
    const currentMonth = !isAnual ? Number(selectedDashMonth) : -1;
    const currentYear = parseInt(selectedYear);

    // Filtro por Mês/Ano (Data de Movimentação de Caixa)
    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.paymentDate || t.dueDate);
      return date.getFullYear() === currentYear && (isAnual || date.getMonth() === currentMonth);
    });

    const entradaMes = currentMonthTransactions.filter(t => t.type === 'income' && t.status === 'paid' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const saidaMes = currentMonthTransactions.filter(t => t.type === 'expense' && t.status === 'paid' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const saldoMes = entradaMes - saidaMes;

    const saldoAtual = transactions.filter(t => t.status === 'paid').reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

    // Faturamento (Competência)
    const receitaBrutaMes = transactions.filter(t => {
      const date = new Date(t.dueDate);
      return t.type === 'income' && t.category !== 'Transferência' && date.getFullYear() === currentYear && (isAnual || date.getMonth() === currentMonth);
    }).reduce((acc, t) => acc + t.amount, 0);

    // Gastos Totais (Competência)
    const gastosMes = transactions.filter(t => {
      const date = new Date(t.dueDate);
      return t.type === 'expense' && t.category !== 'Transferência' && date.getFullYear() === currentYear && (isAnual || date.getMonth() === currentMonth);
    }).reduce((acc, t) => acc + t.amount, 0);

    const resultadoMes = receitaBrutaMes - gastosMes;

    const accountsPayable = currentMonthTransactions.filter(t => t.type === 'expense' && t.status === 'pending' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const accountsReceivable = currentMonthTransactions.filter(t => t.type === 'income' && t.status === 'pending' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const projectedBalance = (entradaMes + accountsReceivable) - (saidaMes + accountsPayable);

    // Fluxo do Dia de Hoje
    const todayStr = new Date().toISOString().split('T')[0];
    const entradaHoje = transactions
      .filter(t => t.type === 'income' && t.status === 'paid' && t.category !== 'Transferência' && t.paymentDate && new Date(t.paymentDate).toISOString().split('T')[0] === todayStr)
      .reduce((acc, t) => acc + t.amount, 0);
    const saidaHoje = transactions
      .filter(t => (t.type === 'expense' && t.category !== 'Transferência') && ((t.status === 'paid' && t.paymentDate && new Date(t.paymentDate).toISOString().split('T')[0] === todayStr) || (t.status === 'pending' && t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] === todayStr)))
      .reduce((acc, t) => acc + t.amount, 0);

    const expenseCategories = CATEGORIES.expense;

    return {
      entradaMes, saidaMes, saldoMes, saldoAtual, receitaBrutaMes, gastosMes, resultadoMes,
      accountsPayable, accountsReceivable, projectedBalance, entradaHoje, saidaHoje,
      inadimplenciaTotal: transactions.filter(t => t.type === 'income' && t.category !== 'Transferência' && t.status === 'pending' && new Date(t.dueDate) < new Date()).reduce((acc, t) => acc + t.amount, 0),
      ticketMedio: currentMonthTransactions.filter(t => t.type === 'income').length > 0 ? receitaBrutaMes / currentMonthTransactions.filter(t => t.type === 'income').length : 0,
      expensesByCategory: expenseCategories.map(cat => ({
        name: cat,
        value: currentMonthTransactions.filter(t => t.type === 'expense' && t.category === cat).reduce((acc, t) => acc + t.amount, 0)
      })).filter(item => item.value > 0).sort((a, b) => b.value - a.value)
    };
  }, [transactions, selectedDashMonth, selectedYear]);

  const previousSummary = useMemo(() => {
    const isAnual = selectedDashMonth === 'anual';
    const currentMonth = !isAnual ? Number(selectedDashMonth) : -1;
    const currentYear = parseInt(selectedYear);

    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;

    if (!isAnual && prevMonth < 0) {
      prevMonth = 11;
      prevYear = currentYear - 1;
    } else if (isAnual) {
      prevYear = currentYear - 1;
    }

    // Filtragem por Competência (DRE/Vendas)
    const prevTransactionsCompetence = transactions.filter(t => {
      const date = new Date(t.dueDate);
      return date.getFullYear() === prevYear && (isAnual || date.getMonth() === prevMonth);
    });

    // Filtragem por Caixa (Pagamentos Realizados)
    const prevTransactionsCash = transactions.filter(t => {
      const date = new Date(t.paymentDate || t.dueDate);
      return date.getFullYear() === prevYear && (isAnual || date.getMonth() === prevMonth);
    });

    const receitaBrutaMes = prevTransactionsCompetence.filter(t => t.type === 'income' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const gastosMes = prevTransactionsCompetence.filter(t => t.type === 'expense' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const entradaMes = prevTransactionsCash.filter(t => t.type === 'income' && t.status === 'paid' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);
    const saidaMes = prevTransactionsCash.filter(t => t.type === 'expense' && t.status === 'paid' && t.category !== 'Transferência').reduce((acc, t) => acc + t.amount, 0);

    return {
      receitaBrutaMes,
      gastosMes,
      resultadoMes: receitaBrutaMes - gastosMes,
      entradaMes,
      saidaMes,
      saldoMes: entradaMes - saidaMes,
      ticketMedio: prevTransactionsCompetence.filter(t => t.type === 'income').length > 0
        ? receitaBrutaMes / prevTransactionsCompetence.filter(t => t.type === 'income').length
        : 0,
    };
  }, [transactions, selectedDashMonth, selectedYear]);

  const topClients = useMemo(() => {
    const isAnual = selectedDashMonth === 'anual';
    const currentMonth = !isAnual ? Number(selectedDashMonth) : -1;
    const currentYear = parseInt(selectedYear);

    const periodIncome = transactions.filter(t => {
      const date = new Date(t.dueDate);
      return t.type === 'income' && date.getFullYear() === currentYear && (isAnual || date.getMonth() === currentMonth);
    });

    const clientTotals: Record<string, number> = {};
    periodIncome.forEach(t => {
      const clientName = t.contact || 'Desconhecido';
      clientTotals[clientName] = (clientTotals[clientName] || 0) + t.amount;
    });

    return Object.entries(clientTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [transactions, selectedDashMonth, selectedYear]);

  const overdueTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return transactions.filter(t => {
      if (t.status !== 'pending') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < today;
    });
  }, [transactions]);

  const upcomingTransactions = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); nextWeek.setHours(23, 59, 59, 999);
    return transactions.filter(t => {
      const dueDate = new Date(t.dueDate);
      return t.status === 'pending' && dueDate >= today && dueDate <= nextWeek;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Handlers (Simplified and redirected to the same state/Supabase logic)
  const handleNewTransaction = () => { setEditingTransaction(null); setDialogInitialType("expense"); setIsDialogOpen(true); };
  const handleNewTransfer = () => { setEditingTransaction(null); setDialogInitialType("transfer"); setIsDialogOpen(true); };
  const handleEditTransaction = (transaction: Transaction) => { setEditingTransaction(transaction); setIsDialogOpen(true); setActiveTab("lancamentos"); };
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      await supabase.from('transaction_allocations').delete().eq('transaction_id', id);
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
      setTransactionAllocations(prev => prev.filter(a => a.transaction_id !== id));
      toast.success("Lançamento removido!");
    } catch (error) { toast.error("Erro ao remover lançamento."); }
  };

  const handleSubmit = async (data: Omit<Transaction, "id"> | Omit<Transaction, "id">[]) => {
    try {
      const dataArray = Array.isArray(data) ? data : [data];
      const transactionsToInsert = dataArray.map(item => ({
        description: item.description, amount: item.amount, type: item.type,
        category: item.category, subcategory: item.subcategory, service: item.service,
        contact: item.contact, financial_institution: item.financialInstitution,
        payment_method: item.paymentMethod, competence_date: item.competenceDate.toISOString().split('T')[0],
        due_date: item.dueDate.toISOString().split('T')[0],
        payment_date: item.paymentDate ? item.paymentDate.toISOString().split('T')[0] : null,
        status: item.status, invoice_number: item.invoiceNumber, order_service: item.orderService, boleto_url: item.boletoUrl
      }));
      const { data: insertedData, error } = await supabase.from('transactions').insert(transactionsToInsert).select();
      if (error) throw error;
      if (insertedData) {
        // Handle cost splits
        for (let i = 0; i < dataArray.length; i++) {
          const item = dataArray[i];
          const insertedRow = insertedData[i];
          if (item.costSplits && item.costSplits.length > 0) {
            const splitsToInsert = item.costSplits.map(split => ({
              transaction_id: insertedRow.id,
              client_name: split.client,
              amount: split.amount,
              description: split.description
            }));
            const { error: splitError } = await supabase.from('transaction_allocations').insert(splitsToInsert);
            if (splitError) console.error("Error inserting cost splits:", splitError);
          }
        }

        const newTrans: Transaction[] = insertedData.map((t, i) => ({
          id: t.id, description: t.description, amount: Number(t.amount), type: t.type as any,
          category: t.category, subcategory: t.subcategory, service: t.service, contact: t.contact,
          financialInstitution: t.financial_institution, paymentMethod: t.payment_method,
          competenceDate: new Date(t.competence_date + 'T12:00:00'), dueDate: new Date(t.due_date + 'T12:00:00'),
          paymentDate: t.payment_date ? new Date(t.payment_date + 'T12:00:00') : undefined,
          status: t.status as any, invoiceNumber: t.invoice_number, orderService: t.order_service, boletoUrl: t.boleto_url,
          costSplits: dataArray[i].costSplits
        }));
        setTransactions(prev => [...newTrans, ...prev]);
      }
      toast.success("Lançamento registrado!");
    } catch (error) { toast.error("Erro ao registrar lançamento."); }
  };

  const handleUpdate = async (id: string, updates: Partial<Transaction>) => {
    try {
      const updateData: any = {};
      if (updates.description) updateData.description = updates.description;
      if (updates.amount) updateData.amount = updates.amount;
      if (updates.type) updateData.type = updates.type;
      if (updates.category) updateData.category = updates.category;
      if (updates.subcategory) updateData.subcategory = updates.subcategory;
      if (updates.contact) updateData.contact = updates.contact;
      if (updates.status) updateData.status = updates.status;
      if (updates.dueDate) updateData.due_date = updates.dueDate.toISOString().split('T')[0];
      if (updates.paymentDate) updateData.payment_date = updates.paymentDate.toISOString().split('T')[0];
      if (updates.financialInstitution) updateData.financial_institution = updates.financialInstitution;
      if (updates.paymentMethod) updateData.payment_method = updates.paymentMethod;

      const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
      if (error) throw error;
      setTransactions(transactions.map(t => t.id === id ? { ...t, ...updates } : t));
      toast.success("Lançamento atualizado!");
    } catch (error) { toast.error("Erro ao atualizar lançamento."); }
  };

  const handleNewAsset = () => { setEditingAsset(null); setIsAssetDialogOpen(true); };
  const handleAssetSubmit = async (data: Omit<Asset, "id">) => {
    try {
      const newAsset = { name: data.name, acquisition_date: data.acquisitionDate.toISOString().split('T')[0], value: data.value, useful_life: data.usefulLife };
      const { data: insertedData, error } = await supabase.from('assets').insert([newAsset]).select().single();
      if (error) throw error;
      setAssets([...assets, { ...data, id: insertedData.id }]);
      toast.success("Patrimônio adicionado!");
    } catch (error) { toast.error("Erro ao adicionar patrimônio."); }
  };

  const handleNewServiceExpense = () => { setEditingServiceExpense(null); setIsServiceExpenseDialogOpen(true); };
  const handleEditServiceExpense = (expense: ServiceExpense) => { setEditingServiceExpense(expense); setIsServiceExpenseDialogOpen(true); };
  const handleUpdateServiceExpense = async (id: string, updates: Partial<ServiceExpense>) => {
    try {
      if (id.startsWith('os-')) {
        const { data: insertedData, error } = await supabase.from('service_expenses').insert([{
          client_name: updates.clientName, environment: updates.environment, service_value: updates.serviceValue, spent_value: updates.spentValue, items: updates.items
        }]).select().single();
        if (error) throw error;
        setServiceExpenses([{ ...updates, id: insertedData.id, createdAt: new Date() } as ServiceExpense, ...serviceExpenses]);
        toast.success("Gasto adicionado!");
        return;
      }

      console.log('Iniciando atualização de gasto:', id, updates);

      const updateData: any = {
        client_name: updates.clientName,
        environment: updates.environment,
        service_value: updates.serviceValue,
        spent_value: updates.spentValue,
        items: updates.items
      };

      const { error } = await supabase.from('service_expenses').update(updateData).eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      setServiceExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      toast.success("Gasto atualizado com sucesso!");
    } catch (error) {
      console.error('Erro na função handleUpdateServiceExpense:', error);
      toast.error("Erro ao atualizar gasto. Verifique sua conexão.");
    }
  };

  const handleServiceExpenseSubmit = async (data: Omit<ServiceExpense, "id" | "createdAt">) => {
    try {
      const { data: insertedData, error } = await supabase.from('service_expenses').insert([{
        client_name: data.clientName, environment: data.environment, service_value: data.serviceValue, spent_value: data.spentValue, items: data.items
      }]).select().single();
      if (error) throw error;
      setServiceExpenses([{ ...data, id: insertedData.id, createdAt: new Date() }, ...serviceExpenses]);
      toast.success("Gasto adicionado!");
    } catch (error) { toast.error("Erro ao adicionar gasto."); }
  };

  const handleDeleteServiceExpense = async (id: string) => {
    if (id.startsWith('os-')) {
        toast.error("Este projeto vem das Ordens de Serviço. Para remover os custos manuais atrelados a ele, clique em Editar e exclua os itens da lista.");
        return;
    }
    if (!window.confirm("Excluir?")) return;
    try {
      await supabase.from('service_expenses').delete().eq('id', id);
      setServiceExpenses(serviceExpenses.filter(e => e.id !== id));
      toast.success("Gasto removido!");
    } catch (error) { toast.error("Erro ao remover."); }
  };


  return (
    <div className={cn(
      "space-y-10 transition-all duration-1000 min-h-screen p-2 animate-in fade-in",
      activeTab === 'conciliacao' && selectedAccount === 'nubank' ? "bg-purple-950/10" : 
      activeTab === 'conciliacao' && selectedAccount === 'dinheiro' ? "bg-emerald-950/10" : ""
    )}>
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
             <h1 className="text-4xl font-black text-luxury tracking-tighter shimmer-gold">Financeiro</h1>
          </div>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Gestão de Fluxo de Caixa & Patrimônio Premium</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="ghost" 
            className="h-14 px-8 rounded-2xl glass-card border-white/5 luxury-shadow hover:bg-primary/5 hover:text-primary transition-all group overflow-hidden relative"
            onClick={handleNewTransaction}
          >
            <Plus className="mr-3 h-5 w-5 group-hover:scale-125 transition-transform" />
             <span className="font-black text-[11px] uppercase tracking-widest text-luxury">Novo Lançamento</span>
          </Button>
          <Button 
            variant="ghost"
            className="h-14 px-8 rounded-2xl glass-card border-white/5 luxury-shadow hover:bg-emerald-500/5 hover:text-emerald-500 transition-all group overflow-hidden relative"
            onClick={handleNewTransfer}
          >
            <TrendingUp className="mr-3 h-5 w-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
            <span className="font-black text-[11px] uppercase tracking-widest text-luxury">Transferência</span>
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-10">
        <div className="px-2 overflow-x-auto hide-scrollbar">
          <TabsList className={cn(
            "h-20 w-max min-w-full lg:min-w-0 p-2 glass-card rounded-[2rem] luxury-shadow border-white/5 backdrop-blur-3xl transition-all duration-700",
            activeTab === 'conciliacao' && selectedAccount === 'nubank' ? "bg-purple-900/30 border-purple-500/20" :
            activeTab === 'conciliacao' && selectedAccount === 'dinheiro' ? "bg-emerald-900/30 border-emerald-500/20" :
            "bg-white/[0.03]"
          )}>
            <TabsTrigger value="dashboard" className="rounded-[1.5rem] px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-2xl transition-all duration-500">
              <TrendingUp className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="lancamentos" className="rounded-[1.5rem] px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-2xl transition-all duration-500">
              <DollarSign className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">Lançamentos</span>
            </TabsTrigger>
            <TabsTrigger value="dre" className="rounded-[1.5rem] px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-2xl transition-all duration-500">
              <Receipt className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">DRE</span>
            </TabsTrigger>
            <TabsTrigger value="gastos_servicos" className="rounded-[1.5rem] px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-2xl transition-all duration-500">
              <Users className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">Serviços</span>
            </TabsTrigger>
            <TabsTrigger value="conciliacao" className={cn(
              "rounded-[1.5rem] px-8 h-full transition-all duration-500",
              activeTab === 'conciliacao' && selectedAccount === 'nubank' ? "data-[state=active]:bg-purple-600 data-[state=active]:text-white" :
              activeTab === 'conciliacao' && selectedAccount === 'dinheiro' ? "data-[state=active]:bg-emerald-600 data-[state=active]:text-white" :
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            )}>
              <AlertTriangle className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">Conciliação</span>
            </TabsTrigger>
            <TabsTrigger value="notas_fiscais" className="rounded-[1.5rem] px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-2xl transition-all duration-500">
              <Receipt className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">Notas</span>
            </TabsTrigger>
            <TabsTrigger value="profitability" className="rounded-[1.5rem] px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-2xl transition-all duration-500">
              <DollarSign className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">Rentabilidade</span>
            </TabsTrigger>
            <TabsTrigger value="patrimonio" className="rounded-[1.5rem] px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-2xl transition-all duration-500">
              <Package className="mr-3 h-4 w-4" />
              <span className="font-black text-[10px] uppercase tracking-widest">Ativos</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard">
          <DashboardTab
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedDashMonth={selectedDashMonth}
            setSelectedDashMonth={setSelectedDashMonth}
            currentSummary={currentSummary}
            previousSummary={previousSummary}
            topClients={topClients}
            overdueTransactions={overdueTransactions}
            upcomingTransactions={upcomingTransactions}
            chartData={chartData}
            dashboardChartData={dashboardChartData}
            accumulatedData={accumulatedData}
            formatCurrency={formatCurrency}
            handleEditTransaction={handleEditTransaction}
          />
        </TabsContent>

        <TabsContent value="lancamentos" className="space-y-6">
          <Card className="bg-card/40 backdrop-blur-md border-border/40 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Filtrar por Termo</label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input placeholder="Descrição, OS, Cliente..." className="pl-10 h-10 rounded-xl bg-muted/30 border-border/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Referência</label>
                  <div className="flex gap-1">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/20 text-[10px] font-bold w-[75px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedFilterMonth} onValueChange={setSelectedFilterMonth}>
                      <SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/20 flex-1 text-[10px] font-bold uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">TODOS</SelectItem>
                        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((month, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{month.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Tipo Data</label>
                  <Select value={dateFilterType} onValueChange={(v: any) => setDateFilterType(v)}>
                    <SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competence">Data da Compra</SelectItem>
                      <SelectItem value="due">Data do Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Fluxo</label>
                  <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                    <SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="income">Receitas</SelectItem><SelectItem value="expense">Despesas</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Status</label>
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="paid">Pagos</SelectItem><SelectItem value="pending">Pendentes</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Forma</label>
                  <Select value={paymentMethodFilter} onValueChange={(v: any) => setPaymentMethodFilter(v)}>
                    <SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-end gap-4 bg-muted/10 p-4 rounded-2xl border border-border/20">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Total Receitas</span>
                <span className="text-lg font-black">{formatCurrency(metrics.income)}</span>
              </div>
              <div className="w-px h-8 bg-border/20 mx-2" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Total Despesas</span>
                <span className="text-lg font-black">{formatCurrency(metrics.expense)}</span>
              </div>
              <div className="w-px h-8 bg-border/20 mx-2" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-500">Saldo</span>
                <span className={`text-lg font-black ${metrics.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(metrics.balance)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => { setShowRecentlyAdded(!showRecentlyAdded); setShowRecentlyPaid(false); setShowOverdueOnly(false); }}
                variant={showRecentlyAdded ? "default" : "outline"}
                className={cn(
                  "rounded-xl px-4 font-black uppercase tracking-widest text-[10px] h-11 transition-all border-border/20",
                  showRecentlyAdded && "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 border-none"
                )}
              >
                {showRecentlyAdded ? "Filtro Normal" : "Últimas Lançadas"}
              </Button>
              <Button
                onClick={() => { setShowRecentlyPaid(!showRecentlyPaid); setShowRecentlyAdded(false); setShowOverdueOnly(false); }}
                variant={showRecentlyPaid ? "default" : "outline"}
                className={cn(
                  "rounded-xl px-4 font-black uppercase tracking-widest text-[10px] h-11 transition-all border-border/20",
                  showRecentlyPaid && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-none"
                )}
              >
                {showRecentlyPaid ? "Filtro Normal" : "Últimas Pagas"}
              </Button>
              <Button
                onClick={() => { setShowOverdueOnly(!showOverdueOnly); setShowRecentlyAdded(false); setShowRecentlyPaid(false); }}
                variant={showOverdueOnly ? "destructive" : "outline"}
                className={cn(
                  "rounded-xl px-4 font-black uppercase tracking-widest text-[10px] h-11 transition-all border-border/20",
                  showOverdueOnly && "animate-pulse shadow-lg shadow-destructive/20 border-none"
                )}
              >
                <AlertTriangle size={16} className={cn("mr-2", showOverdueOnly ? "text-white" : "text-rose-500")} />
                {showOverdueOnly ? "Ver Todos" : `Atrasados (${overdueTransactions.length})`}
              </Button>
              <Button onClick={handleNewTransaction} className="rounded-xl px-6 font-black uppercase tracking-widest text-xs h-11 shadow-lg shadow-primary/20 transition-transform active:scale-95"><Plus size={16} className="mr-2" /> Novo Fluxo</Button>
              <Button onClick={handleNewTransfer} className="rounded-xl px-4 font-black uppercase tracking-widest text-xs h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-transform active:scale-95"><Plus size={16} className="mr-2" /> Transferência</Button>
            </div>
          </div>

          <Card className="rounded-2xl border-none shadow-2xl overflow-hidden bg-card/40 backdrop-blur-md">
            <TransactionTable
              transactions={filteredTransactions}
              selectedIds={selectedIds}
              onSelect={toggleSelect}
              onSelectAll={toggleSelectAll}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onPartialPayment={(transaction) => {
                setSelectedPartialTransaction(transaction);
                setIsPartialPaymentOpen(true);
              }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="dre"><DRETab selectedDREYear={selectedDREYear} setSelectedDREYear={setSelectedDREYear} dreData={dreData} detailedExpenses={detailedExpenses} formatCurrency={formatCurrency} /></TabsContent>
        <TabsContent value="gastos_servicos"><ServiceExpensesTab serviceExpenses={combinedServiceExpenses} handleNewServiceExpense={handleNewServiceExpense} handleEditServiceExpense={handleEditServiceExpense} handleDeleteServiceExpense={handleDeleteServiceExpense} formatCurrency={formatCurrency} /></TabsContent>
        <TabsContent value="conciliacao"><ConciliationTab selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} currentDateReconciliation={currentDateReconciliation} handlePrevMonth={handlePrevMonth} handleNextMonth={handleNextMonth} totalAccountBalance={totalAccountBalance} reconciliationDailyData={reconciliationDailyData} formatCurrency={formatCurrency} /></TabsContent>
        <TabsContent value="notas_fiscais"><NotaFiscalTab /></TabsContent>
        <TabsContent value="profitability"><div>Teste Rentabilidade</div></TabsContent>
        <TabsContent value="patrimonio"><AssetsTab assets={assets} handleNewAsset={handleNewAsset} formatCurrency={formatCurrency} /></TabsContent>
      </Tabs>

      <TransactionFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleSubmit} onUpdate={handleUpdate} editingTransaction={editingTransaction} initialType={dialogInitialType} />
      <AssetFormDialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen} onSubmit={handleAssetSubmit} onUpdate={() => { }} editingAsset={editingAsset} />
      <ServiceExpenseFormDialog open={isServiceExpenseDialogOpen} onOpenChange={setIsServiceExpenseDialogOpen} onSubmit={handleServiceExpenseSubmit} onUpdate={handleUpdateServiceExpense} editingExpense={editingServiceExpense} />
      
      <PartialPaymentDialog
        open={isPartialPaymentOpen}
        onOpenChange={setIsPartialPaymentOpen}
        transaction={selectedPartialTransaction}
        onSubmit={handlePartialPaymentSubmit}
      />

      {/* Sidebar de Ações em Massa */}
      {selectedIds.length > 0 && (
        <div className="fixed right-0 top-0 h-full w-80 bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300">
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <div className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-[10px]">
                  {selectedIds.length}
                </div>
                Selecionados
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedIds([])} className="rounded-full">
                <Plus className="rotate-45 h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto">
              {selectedIds.map(id => {
                const trans = transactions.find(t => t.id === id);
                return trans ? (
                  <div key={id} className="p-3 bg-muted/30 rounded-xl border border-border/20 text-xs">
                    <p className="font-bold truncate">{trans.description}</p>
                    <p className="text-muted-foreground">{formatCurrency(trans.amount)}</p>
                  </div>
                ) : null;
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="mb-4 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Total</span>
                <span className="text-xl font-black">
                  {formatCurrency(
                    selectedIds.reduce((acc, id) => {
                      const trans = transactions.find(t => t.id === id);
                      return acc + (trans?.amount || 0);
                    }, 0)
                  )}
                </span>
              </div>

              <Button
                onClick={handleBulkPay}
                className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
              >
                Pagar Selecionados
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedIds([])}
                className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs mt-2 border-border/20"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Action Button for Mobile */}
      {activeTab === 'lancamentos' && (
        <Button
          onClick={handleNewTransaction}
          className="lg:hidden fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl z-40 gap-0 p-0 flex items-center justify-center animate-in fade-in zoom-in duration-300"
          size="icon"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}
    </div>
  );
};

export default Financeiro;
