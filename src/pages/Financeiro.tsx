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
import { Plus, TrendingUp, TrendingDown, DollarSign, Search, ChevronLeft, ChevronRight, Users, Calendar } from "lucide-react";
import { useState, useMemo, useEffect, Fragment } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Transaction, CATEGORIES, SUBCATEGORIES } from "@/types/finance";
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

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [serviceExpenses, setServiceExpenses] = useState<ServiceExpense[]>([]);

  useEffect(() => {
    fetchTransactions();
    fetchAssets();
    fetchServiceOrders();
    fetchServiceExpenses();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTransactions: Transaction[] = (data || []).map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as any,
        category: t.category,
        subcategory: t.subcategory,
        service: t.service,
        contact: t.contact,
        financialInstitution: t.financial_institution,
        paymentMethod: t.payment_method,
        competenceDate: new Date(t.competence_date + 'T12:00:00'),
        dueDate: new Date(t.due_date + 'T12:00:00'),
        paymentDate: t.payment_date ? new Date(t.payment_date + 'T12:00:00') : undefined,
        status: t.status as any,
        invoiceNumber: t.invoice_number,
        orderService: t.order_service,
        boletoUrl: t.boleto_url
      }));

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
        createdAt: new Date(e.created_at)
      }));

      setServiceExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error fetching service expenses:', error);
      toast.error("Erro ao carregar gastos por serviços.");
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isServiceExpenseDialogOpen, setIsServiceExpenseDialogOpen] = useState(false);
  const [editingServiceExpense, setEditingServiceExpense] = useState<ServiceExpense | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [dateFilterType, setDateFilterType] = useState<"competence" | "due">("competence");
  const [osFilter, setOsFilter] = useState("all");

  // Dashboard State
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedDREYear, setSelectedDREYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedDashMonth, setSelectedDashMonth] = useState<number>(new Date().getMonth());

  // Conciliation State
  const [selectedAccount, setSelectedAccount] = useState<string>("banco_itau");
  const [currentDateReconciliation, setCurrentDateReconciliation] = useState<Date>(new Date());

  const reconciliationData = useMemo(() => {
    return transactions.filter(t => {
      if (selectedAccount === 'dinheiro') {
        return t.financialInstitution === 'Dinheiro';
      } else if (selectedAccount === 'banco_itau') {
        return t.financialInstitution === 'Banco Itaú';
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

      const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const dailyBalance = income - expense;
      runningBalance += dailyBalance;

      days.push({
        date: currentDayDate,
        income,
        expense,
        dailyBalance,
        accumulatedBalance: runningBalance
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
    return transactions.filter(t => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.service && t.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.orderService && t.orderService.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const dateToCheck = dateFilterType === 'competence' ? t.competenceDate : t.dueDate;
      const matchesMonth = !monthFilter || new Date(dateToCheck).toISOString().slice(0, 7) === monthFilter;
      const matchesOS = osFilter === "all" || (t.orderService === osFilter);

      return matchesSearch && matchesType && matchesStatus && matchesMonth && matchesOS;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, monthFilter, dateFilterType, osFilter]);

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
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

      const expense = monthlyTrans
        .filter(t => t.type === 'expense')
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
      const income = monthlyTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthlyTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
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
    const yearTransactions = transactions.filter(t => new Date(t.competenceDate).getFullYear() === parseInt(selectedDREYear));
    const grossRevenue = yearTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const taxes = yearTransactions.filter(t => t.category === 'Impostos').reduce((acc, t) => acc + t.amount, 0);
    const netRevenue = grossRevenue - taxes;
    const variableCosts = yearTransactions.filter(t => t.type === 'expense' && ["Despesa com Serviço"].includes(t.category)).reduce((acc, t) => acc + t.amount, 0);
    const contributionMargin = netRevenue - variableCosts;
    const fixedExpenses = yearTransactions.filter(t => t.type === 'expense' && ["Despesa Operacional", "Despesa com Maquinário", "Despesa com Pessoal"].includes(t.category)).reduce((acc, t) => acc + t.amount, 0);
    const netResult = contributionMargin - fixedExpenses;

    return { grossRevenue, taxes, netRevenue, variableCosts, contributionMargin, fixedExpenses, netResult };
  }, [transactions, selectedDREYear]);

  const detailedExpenses = useMemo(() => {
    const year = parseInt(selectedDREYear);
    const months = Array.from({ length: 12 }, (_, i) => i);
    const expenseCategories = CATEGORIES.expense;

    return expenseCategories.map(category => {
      const subcategories = SUBCATEGORIES[category] || [];
      const categoryMonthlyTotals = months.map(month => {
        return transactions
          .filter(t =>
            t.type === 'expense' &&
            t.category === category &&
            new Date(t.competenceDate).getFullYear() === year &&
            new Date(t.competenceDate).getMonth() === month
          )
          .reduce((acc, t) => acc + t.amount, 0);
      });

      const categoryTotal = categoryMonthlyTotals.reduce((a, b) => a + b, 0);
      const subcategoryBreakdown = subcategories.map(sub => {
        const subMonthlyTotals = months.map(month => {
          return transactions
            .filter(t =>
              t.type === 'expense' &&
              t.category === category &&
              t.subcategory === sub &&
              new Date(t.competenceDate).getFullYear() === year &&
              new Date(t.competenceDate).getMonth() === month
            )
            .reduce((acc, t) => acc + t.amount, 0);
        });
        const subTotal = subMonthlyTotals.reduce((a, b) => a + b, 0);
        return { name: sub, monthly: subMonthlyTotals, total: subTotal };
      });

      return { category, monthly: categoryMonthlyTotals, total: categoryTotal, subcategories: subcategoryBreakdown };
    });
  }, [transactions, selectedDREYear]);

  const currentSummary = useMemo(() => {
    const currentMonth = selectedDashMonth;
    const currentYear = parseInt(selectedYear);
    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.paymentDate || t.dueDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const entradaMes = currentMonthTransactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
    const saidaMes = currentMonthTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
    const saldoMes = entradaMes - saidaMes;
    const saldoAtual = transactions.filter(t => t.status === 'paid').reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const receitaBrutaMes = transactions.filter(t => {
      const date = new Date(t.competenceDate);
      return t.type === 'income' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((acc, t) => acc + t.amount, 0);
    const gastosMes = transactions.filter(t => {
      const date = new Date(t.competenceDate);
      return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((acc, t) => acc + t.amount, 0);
    const resultadoMes = receitaBrutaMes - gastosMes;
    const accountsPayable = currentMonthTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
    const accountsReceivable = currentMonthTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
    const projectedBalance = (entradaMes + accountsReceivable) - (saidaMes + accountsPayable);

    return {
      entradaMes, saidaMes, saldoMes, saldoAtual, receitaBrutaMes, gastosMes, resultadoMes,
      accountsPayable, accountsReceivable, projectedBalance,
      inadimplenciaTotal: transactions.filter(t => t.type === 'income' && t.status === 'pending' && new Date(t.dueDate) < new Date()).reduce((acc, t) => acc + t.amount, 0),
      pontoEquilibrio: currentMonthTransactions.filter(t => t.type === 'expense' && ["Despesa Operacional", "Despesa com Maquinário", "Despesa com Pessoal"].includes(t.category)).reduce((acc, t) => acc + t.amount, 0),
      ticketMedio: currentMonthTransactions.filter(t => t.type === 'income').length > 0 ? receitaBrutaMes / currentMonthTransactions.filter(t => t.type === 'income').length : 0,
      expensesByCategory: CATEGORIES.expense.map(cat => ({
        name: cat,
        value: currentMonthTransactions.filter(t => t.type === 'expense' && t.category === cat).reduce((acc, t) => acc + t.amount, 0)
      })).filter(item => item.value > 0)
    };
  }, [transactions, selectedDashMonth, selectedYear]);

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
  const handleNewTransaction = () => { setEditingTransaction(null); setIsDialogOpen(true); };
  const handleEditTransaction = (transaction: Transaction) => { setEditingTransaction(transaction); setIsDialogOpen(true); setActiveTab("lancamentos"); };
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
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
        const newTrans: Transaction[] = insertedData.map(t => ({
          id: t.id, description: t.description, amount: Number(t.amount), type: t.type as any,
          category: t.category, subcategory: t.subcategory, service: t.service, contact: t.contact,
          financialInstitution: t.financial_institution, paymentMethod: t.payment_method,
          competenceDate: new Date(t.competence_date + 'T12:00:00'), dueDate: new Date(t.due_date + 'T12:00:00'),
          paymentDate: t.payment_date ? new Date(t.payment_date + 'T12:00:00') : undefined,
          status: t.status as any, invoice_number: t.invoice_number, order_service: t.order_service, boletoUrl: t.boleto_url
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
    if (!window.confirm("Excluir?")) return;
    try {
      await supabase.from('service_expenses').delete().eq('id', id);
      setServiceExpenses(serviceExpenses.filter(e => e.id !== id));
      toast.success("Gasto removido!");
    } catch (error) { toast.error("Erro ao remover."); }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-primary to-primary/40 bg-clip-text text-transparent uppercase">Financeiro</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="w-full sm:w-auto justify-start h-14 bg-muted/20 p-1.5 rounded-2xl border border-border/40 backdrop-blur-md">
            <TabsTrigger value="dashboard" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg active:scale-95 transition-all">Dashboard</TabsTrigger>
            <TabsTrigger value="lancamentos" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg active:scale-95 transition-all">Lançamentos</TabsTrigger>
            <TabsTrigger value="dre" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg active:scale-95 transition-all">DRE</TabsTrigger>
            <TabsTrigger value="gastos_servicos" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg active:scale-95 transition-all">Gastos Projeto</TabsTrigger>
            <TabsTrigger value="conciliacao" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg active:scale-95 transition-all">Conciliação</TabsTrigger>
            <TabsTrigger value="patrimonio" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:shadow-lg active:scale-95 transition-all">Em Ativos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard">
          <DashboardTab
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedDashMonth={selectedDashMonth}
            setSelectedDashMonth={setSelectedDashMonth}
            currentSummary={currentSummary}
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Filtrar por Termo</label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input placeholder="Descrição, OS, Cliente..." className="pl-10 h-10 rounded-xl bg-muted/30 border-border/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Referência</label>
                  <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-xl h-10 bg-muted/30" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-muted-foreground/80">Tipo Data</label>
                  <Select value={dateFilterType} onValueChange={(v: any) => setDateFilterType(v)}>
                    <SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/20"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="competence">Competência</SelectItem><SelectItem value="due">Vencimento</SelectItem></SelectContent>
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
            </div>
            <Button onClick={handleNewTransaction} className="rounded-xl px-6 font-black uppercase tracking-widest text-xs h-11 shadow-lg shadow-primary/20 transition-transform active:scale-95"><Plus size={16} className="mr-2" /> Novo Fluxo</Button>
          </div>

          <Card className="rounded-2xl border-none shadow-2xl overflow-hidden bg-card/40 backdrop-blur-md">
            <TransactionTable transactions={filteredTransactions} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} />
          </Card>
        </TabsContent>

        <TabsContent value="dre"><DRETab selectedDREYear={selectedDREYear} setSelectedDREYear={setSelectedDREYear} dreData={dreData} detailedExpenses={detailedExpenses} formatCurrency={formatCurrency} /></TabsContent>
        <TabsContent value="gastos_servicos"><ServiceExpensesTab serviceExpenses={serviceExpenses} handleNewServiceExpense={handleNewServiceExpense} handleEditServiceExpense={handleEditServiceExpense} handleDeleteServiceExpense={handleDeleteServiceExpense} formatCurrency={formatCurrency} /></TabsContent>
        <TabsContent value="conciliacao"><ConciliationTab selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} currentDateReconciliation={currentDateReconciliation} handlePrevMonth={handlePrevMonth} handleNextMonth={handleNextMonth} totalAccountBalance={totalAccountBalance} reconciliationDailyData={reconciliationDailyData} formatCurrency={formatCurrency} /></TabsContent>
        <TabsContent value="patrimonio"><AssetsTab assets={assets} handleNewAsset={handleNewAsset} formatCurrency={formatCurrency} /></TabsContent>
      </Tabs>

      <TransactionFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleSubmit} onUpdate={handleUpdate} editingTransaction={editingTransaction} />
      <AssetFormDialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen} onSubmit={handleAssetSubmit} onUpdate={() => { }} editingAsset={editingAsset} />
      <ServiceExpenseFormDialog open={isServiceExpenseDialogOpen} onOpenChange={setIsServiceExpenseDialogOpen} onSubmit={handleServiceExpenseSubmit} onUpdate={() => { }} editingExpense={editingServiceExpense} />
    </div>
  );
};

export default Financeiro;
