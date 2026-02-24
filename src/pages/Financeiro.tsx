import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo, useEffect, Fragment } from "react";
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
import { Plus, TrendingUp, TrendingDown, DollarSign, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Transaction, CATEGORIES, SUBCATEGORIES } from "@/types/finance";
import TransactionTable from "@/components/crm/TransactionTable";
import TransactionFormDialog from "@/components/crm/TransactionFormDialog";
import AssetFormDialog from "@/components/crm/AssetFormDialog";
import { Asset } from "@/types/asset";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

import { ServiceOrder } from "@/types/serviceOrder";
import { ServiceExpense } from "@/types/serviceExpense";
import ServiceExpenseFormDialog from "@/components/crm/ServiceExpenseFormDialog";
import { supabase } from "@/lib/supabase";
import { Pencil, Trash2 } from "lucide-react";

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

    // Calculate Initial Balance (All time before current month)
    const firstDayOfMonth = new Date(year, month, 1);

    // Filter transactions before this month for initial balance
    const previousTransactions = reconciliationData.filter(t => {
      const tDate = new Date(t.paymentDate || t.dueDate); // prioritize paymentDate for cash reconciliation
      return tDate < firstDayOfMonth && t.status === 'paid';
    });

    const initialBalance = previousTransactions.reduce((acc, t) => {
      return acc + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    // Generate days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    let runningBalance = initialBalance;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, month, day);

      // Transactions for this specific day
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

    // Previous month balance display date
    const previousMonthDate = new Date(year, month, 0);

    return {
      initialBalance,
      previousMonthDate,
      days
    };
  }, [reconciliationData, currentDateReconciliation]);

  const handlePrevMonth = () => {
    setCurrentDateReconciliation(new Date(currentDateReconciliation.getFullYear(), currentDateReconciliation.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDateReconciliation(new Date(currentDateReconciliation.getFullYear(), currentDateReconciliation.getMonth() + 1, 1));
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filtro de Texto (Descrição, Cliente, Serviço, Categoria)
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.service && t.service.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.orderService && t.orderService.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de Tipo
      const matchesType = typeFilter === "all" || t.type === typeFilter;

      // Filtro de Status
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;

      // Filtro de Mês (Baseado na data selecionada: competência ou vencimento)
      const dateToCheck = dateFilterType === 'competence' ? t.competenceDate : t.dueDate;
      const matchesMonth = !monthFilter || new Date(dateToCheck).toISOString().slice(0, 7) === monthFilter;

      // Filtro de OS
      const matchesOS = osFilter === "all" || (t.orderService === osFilter);

      return matchesSearch && matchesType && matchesStatus && matchesMonth && matchesOS;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, monthFilter, dateFilterType]);

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

  // Chart Data Calculation
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

  // Accumulated Data Calculation
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

  // Dashboard Accounts Receivable/Payable Chart Data
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

  // DRE Data Calculation
  const dreData = useMemo(() => {
    const yearTransactions = transactions.filter(t => new Date(t.competenceDate).getFullYear() === parseInt(selectedDREYear));

    const grossRevenue = yearTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const taxes = yearTransactions
      .filter(t => t.category === 'Impostos')
      .reduce((acc, t) => acc + t.amount, 0);

    const netRevenue = grossRevenue - taxes;

    const variableCostsCategories = [
      "Despesa com Serviço"
    ];
    const variableCosts = yearTransactions
      .filter(t => t.type === 'expense' && variableCostsCategories.includes(t.category))
      .reduce((acc, t) => acc + t.amount, 0);

    const contributionMargin = netRevenue - variableCosts;

    const fixedExpensesCategories = [
      "Despesa Operacional",
      "Despesa com Maquinário",
      "Despesa com Pessoal"
    ];
    const fixedExpenses = yearTransactions
      .filter(t => t.type === 'expense' && fixedExpensesCategories.includes(t.category))
      .reduce((acc, t) => acc + t.amount, 0);

    const netResult = contributionMargin - fixedExpenses;

    return {
      grossRevenue,
      taxes,
      netRevenue,
      variableCosts,
      contributionMargin,
      fixedExpenses,
      netResult
    };
  }, [transactions, selectedDREYear]);

  // Detailed Expenses Breakdown
  const detailedExpenses = useMemo(() => {
    const year = parseInt(selectedDREYear);
    const months = Array.from({ length: 12 }, (_, i) => i); // 0 to 11

    const expenseCategories = CATEGORIES.expense;

    return expenseCategories.map(category => {
      const subcategories = SUBCATEGORIES[category] || [];

      // Calculate monthly totals for the category
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

      // Calculate breakdown for each subcategory
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
        return {
          name: sub,
          monthly: subMonthlyTotals,
          total: subTotal
        };
      });

      return {
        category,
        monthly: categoryMonthlyTotals,
        total: categoryTotal,
        subcategories: subcategoryBreakdown
      };
    });
  }, [transactions, selectedDREYear]);

  // DRE Chart Data (Accounts Receivable vs Payable vs Balance Gap)
  const dreChartData = useMemo(() => {
    const year = parseInt(selectedDREYear);
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    return months.map((month, index) => {
      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.dueDate);
        return date.getMonth() === index && date.getFullYear() === year;
      });

      const accountsReceivable = monthTransactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((acc, t) => acc + t.amount, 0);

      const accountsPayable = monthTransactions
        .filter(t => t.type === 'expense' && t.status === 'pending')
        .reduce((acc, t) => acc + t.amount, 0);

      const balanceGap = accountsReceivable - accountsPayable;

      return {
        name: month,
        "A Receber": accountsReceivable,
        "A Pagar": accountsPayable,
        "Saldo Projetado": balanceGap
      };
    });
  }, [transactions, selectedDREYear]);

  // Current Month Summary Calculation
  const currentSummary = useMemo(() => {
    const currentMonth = selectedDashMonth;
    const currentYear = parseInt(selectedYear);

    // Transactions in the current selected month
    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.paymentDate || t.dueDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Entrada no Mês (Paid Income)
    const entradaMes = currentMonthTransactions
      .filter(t => t.type === 'income' && t.status === 'paid')
      .reduce((acc, t) => acc + t.amount, 0);

    // Saída no Mês (Paid Expense)
    const saidaMes = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => acc + t.amount, 0);

    // Saldo no Mês (Cash Flow)
    const saldoMes = entradaMes - saidaMes;

    // Saldo Atual (Total Accumulated Balance - All Time)
    const saldoAtual = transactions
      .filter(t => t.status === 'paid')
      .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

    // Receita Bruta no Mês (Accrual Income - Competence)
    const receitaBrutaMes = transactions
      .filter(t => {
        const date = new Date(t.competenceDate);
        return t.type === 'income' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    // Gastos no Mês (Accrual Expense - Competence)
    const gastosMes = transactions
      .filter(t => {
        const date = new Date(t.competenceDate);
        return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    // Resultado no Mês (Accrual Result)
    const resultadoMes = receitaBrutaMes - gastosMes;

    // Accounts Payable (Despesas Pendentes)
    const accountsPayable = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((acc, t) => acc + t.amount, 0);

    // Accounts Receivable (Receitas Pendentes)
    const accountsReceivable = currentMonthTransactions
      .filter(t => t.type === 'income' && t.status === 'pending')
      .reduce((acc, t) => acc + t.amount, 0);

    // Paid Expenses (Already Saída no Mês)
    // Received Income (Already Entrada no Mês)

    const projectedBalance = (entradaMes + accountsReceivable) - (saidaMes + accountsPayable);

    return {
      entradaMes,
      saidaMes,
      saldoMes,
      saldoAtual,
      receitaBrutaMes,
      gastosMes,
      resultadoMes,
      accountsPayable,
      accountsReceivable,
      projectedBalance
    };
  }, [transactions, selectedDashMonth, selectedYear]);


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleNewTransaction = () => {
    setEditingTransaction(null);
    setIsDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
      toast.success("Lançamento removido!");
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error("Erro ao remover lançamento.");
    }
  };

  const handleSubmit = async (data: Omit<Transaction, "id"> | Omit<Transaction, "id">[]) => {
    try {
      const dataArray = Array.isArray(data) ? data : [data];

      const transactionsToInsert = dataArray.map(item => ({
        description: item.description,
        amount: item.amount,
        type: item.type,
        category: item.category,
        subcategory: item.subcategory,
        service: item.service,
        contact: item.contact,
        financial_institution: item.financialInstitution,
        payment_method: item.paymentMethod,
        competence_date: item.competenceDate.toISOString().split('T')[0],
        due_date: item.dueDate.toISOString().split('T')[0],
        payment_date: item.paymentDate ? item.paymentDate.toISOString().split('T')[0] : null,
        status: item.status,
        invoice_number: item.invoiceNumber,
        order_service: item.orderService,
        boleto_url: item.boletoUrl
      }));

      const { data: insertedData, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();

      if (error) throw error;

      if (insertedData) {
        const newTransactions: Transaction[] = insertedData.map(t => ({
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
        setTransactions(prev => [...newTransactions, ...prev]);
      }

      toast.success(dataArray.length > 1 ? `${dataArray.length} parcelas geradas!` : "Lançamento registrado!");
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error("Erro ao registrar lançamento.");
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Transaction>) => {
    try {
      const updateData: any = {};
      if (updates.description) updateData.description = updates.description;
      if (updates.amount) updateData.amount = updates.amount;
      if (updates.type) updateData.type = updates.type;
      if (updates.category) updateData.category = updates.category;
      if (updates.subcategory) updateData.subcategory = updates.subcategory;
      if (updates.service) updateData.service = updates.service;
      if (updates.contact) updateData.contact = updates.contact;
      if (updates.financialInstitution) updateData.financial_institution = updates.financialInstitution;
      if (updates.paymentMethod) updateData.payment_method = updates.paymentMethod;
      if (updates.competenceDate) updateData.competence_date = updates.competenceDate.toISOString().split('T')[0];
      if (updates.dueDate) updateData.due_date = updates.dueDate.toISOString().split('T')[0];
      if (updates.paymentDate) updateData.payment_date = updates.paymentDate.toISOString().split('T')[0];
      if (updates.status) updateData.status = updates.status;
      if (updates.invoiceNumber) updateData.invoice_number = updates.invoiceNumber;
      if (updates.orderService) updateData.order_service = updates.orderService;
      if (updates.boletoUrl !== undefined) updateData.boleto_url = updates.boletoUrl;

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setTransactions(transactions.map(t =>
        t.id === id ? { ...t, ...updates } : t
      ));
      toast.success("Lançamento atualizado!");
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error("Erro ao atualizar lançamento.");
    }
  };

  // Asset Handlers
  const handleNewAsset = () => {
    setEditingAsset(null);
    setIsAssetDialogOpen(true);
  };

  const handleAssetSubmit = async (data: Omit<Asset, "id">) => {
    try {
      const newAsset = {
        name: data.name,
        acquisition_date: data.acquisitionDate.toISOString().split('T')[0],
        value: data.value,
        useful_life: data.usefulLife,
        depreciation_rate: data.depreciationRate
      };

      const { data: insertedData, error } = await supabase
        .from('assets')
        .insert([newAsset])
        .select()
        .single();

      if (error) throw error;

      const createdAsset: Asset = {
        id: insertedData.id,
        name: insertedData.name,
        acquisitionDate: new Date(insertedData.acquisition_date + 'T12:00:00'),
        value: Number(insertedData.value),
        usefulLife: Number(insertedData.useful_life),
        depreciationRate: insertedData.depreciation_rate ? Number(insertedData.depreciation_rate) : undefined
      };

      setAssets([...assets, createdAsset]);
      toast.success("Patrimônio adicionado!");
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error("Erro ao adicionar patrimônio.");
    }
  };

  const handleAssetUpdate = async (id: string, updates: Partial<Asset>) => {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.acquisitionDate) updateData.acquisition_date = updates.acquisitionDate.toISOString().split('T')[0];
      if (updates.value) updateData.value = updates.value;
      if (updates.usefulLife) updateData.useful_life = updates.usefulLife;
      if (updates.depreciationRate) updateData.depreciation_rate = updates.depreciationRate;

      const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setAssets(assets.map(a => a.id === id ? { ...a, ...updates } : a));
      toast.success("Patrimônio atualizado!");
    } catch (error) {
      console.error('Error updating asset:', error);
      toast.error("Erro ao atualizar patrimônio.");
    }
  };

  // Service Expense Handlers
  const handleNewServiceExpense = () => {
    setEditingServiceExpense(null);
    setIsServiceExpenseDialogOpen(true);
  };

  const handleEditServiceExpense = (expense: ServiceExpense) => {
    setEditingServiceExpense(expense);
    setIsServiceExpenseDialogOpen(true);
  };

  const handleServiceExpenseSubmit = async (data: Omit<ServiceExpense, "id" | "createdAt">) => {
    try {
      const newExpense = {
        client_name: data.clientName,
        environment: data.environment,
        service_value: data.serviceValue,
        spent_value: data.spentValue,
        items: data.items,
      };

      const { data: insertedData, error } = await supabase
        .from('service_expenses')
        .insert([newExpense])
        .select()
        .single();

      if (error) throw error;

      const createdExpense: ServiceExpense = {
        id: insertedData.id,
        clientName: insertedData.client_name,
        environment: insertedData.environment,
        serviceValue: Number(insertedData.service_value),
        spentValue: Number(insertedData.spent_value),
        items: insertedData.items || [],
        createdAt: new Date(insertedData.created_at)
      };

      setServiceExpenses([createdExpense, ...serviceExpenses]);
      toast.success("Gasto por serviço adicionado!");
    } catch (error) {
      console.error('Error adding service expense:', error);
      toast.error("Erro ao adicionar gasto.");
    }
  };

  const handleServiceExpenseUpdate = async (id: string, updates: Partial<ServiceExpense>) => {
    try {
      const updateData: any = {};
      if (updates.clientName) updateData.client_name = updates.clientName;
      if (updates.environment) updateData.environment = updates.environment;
      if (updates.serviceValue !== undefined) updateData.service_value = updates.serviceValue;
      if (updates.spentValue !== undefined) updateData.spent_value = updates.spentValue;
      if (updates.items !== undefined) updateData.items = updates.items;

      const { error } = await supabase
        .from('service_expenses')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setServiceExpenses(serviceExpenses.map(e => e.id === id ? { ...e, ...updates } : e));
      toast.success("Gasto por serviço atualizado!");
    } catch (error) {
      console.error('Error updating service expense:', error);
      toast.error("Erro ao atualizar gasto.");
    }
  };

  const handleDeleteServiceExpense = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      const { error } = await supabase.from('service_expenses').delete().eq('id', id);
      if (error) throw error;
      setServiceExpenses(serviceExpenses.filter(e => e.id !== id));
      toast.success("Gasto removido!");
    } catch (error) {
      console.error('Error deleting service expense:', error);
      toast.error("Erro ao remover gasto.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
      </div>

      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="gastos_servicos">Gastos por Serviços</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação Bancária</TabsTrigger>
          <TabsTrigger value="patrimonio">Patrimônio</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight">Visão Geral</h3>
                <p className="text-sm text-muted-foreground">Selecione o período para análise</p>
              </div>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={String(selectedDashMonth)} onValueChange={(v) => setSelectedDashMonth(parseInt(v))} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto h-12 bg-background/50 p-1">
                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((month, index) => (
                  <TabsTrigger
                    key={month}
                    value={String(index)}
                    className="flex-1 sm:flex-none min-w-[60px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {month}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/40 border-primary/20 hover:border-primary/50 transition-all border shadow-lg backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">Entrada (Mês)</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(currentSummary.entradaMes)}</div>
                <p className="text-xs text-muted-foreground">Recebido (Caixa)</p>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-rose-500/20 hover:border-rose-500/50 transition-all border shadow-lg backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-400">Saída (Mês)</CardTitle>
                <TrendingDown className="h-4 w-4 text-rose-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-500">{formatCurrency(currentSummary.saidaMes)}</div>
                <p className="text-xs text-muted-foreground">Pago (Caixa)</p>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-emerald-500/20 hover:border-emerald-500/50 transition-all border shadow-lg backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-400">Saldo (Mês)</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${currentSummary.saldoMes >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {formatCurrency(currentSummary.saldoMes)}
                </div>
                <p className="text-xs text-muted-foreground">Fluxo de Caixa</p>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-emerald-700/20 hover:border-emerald-700/50 transition-all border shadow-lg backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600">Saldo Acumulado</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${currentSummary.saldoAtual >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {formatCurrency(currentSummary.saldoAtual)}
                </div>
                <p className="text-xs text-muted-foreground">Total histórico pago</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="bg-card/40 border-l-4 border-l-primary shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tighter">Faturamento</CardTitle>
                  <p className="text-2xl font-black text-primary">{formatCurrency(currentSummary.receitaBrutaMes)}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="text-[10px] text-primary/70 mb-4 font-bold uppercase tracking-widest bg-emerald-500/10 w-fit px-2 py-0.5 rounded border border-emerald-500/20">Visão por Competência</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Já Recebido:</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(currentSummary.entradaMes)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ainda a Receber:</span>
                    <span className="text-primary font-bold">{formatCurrency(currentSummary.accountsReceivable)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-l-4 border-l-rose-500 shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tighter">Gastos</CardTitle>
                  <p className="text-2xl font-black text-rose-500">{formatCurrency(currentSummary.gastosMes)}</p>
                </div>
                <TrendingDown className="h-5 w-5 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-[10px] text-rose-500/70 mb-4 font-bold uppercase tracking-widest bg-rose-500/10 w-fit px-2 py-0.5 rounded border border-rose-500/20">Visão por Competência</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Já Pago:</span>
                    <span className="text-rose-400 font-bold">{formatCurrency(currentSummary.saidaMes)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ainda a Pagar:</span>
                    <span className="text-rose-600 font-bold">{formatCurrency(currentSummary.accountsPayable)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-l-4 border-l-emerald-600 shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tighter">Resultado Projetado</CardTitle>
                  <p className={`text-2xl font-black ${currentSummary.projectedBalance >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                    {formatCurrency(currentSummary.projectedBalance)}
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-[10px] text-emerald-400/70 mb-4 font-bold uppercase tracking-widest bg-emerald-400/10 w-fit px-2 py-0.5 rounded border border-emerald-400/20">Pago + Pendente</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Lucro Contábil:</span>
                    <span className={`font-bold ${currentSummary.resultadoMes >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                      {formatCurrency(currentSummary.resultadoMes)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Balanço Anual ({selectedYear})
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line type="monotone" dataKey="Saldo" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: "#34d399" }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  Previsão Financeira ({selectedYear})
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dashboardChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="A Receber" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="A Pagar" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line type="monotone" dataKey="Saldo" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md border-none bg-muted/20">
            <CardHeader>
              <CardTitle className="text-lg">Saldo Acumulado do Ano</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={accumulatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none' }}
                    />
                    <Area type="monotone" dataKey="Acumulado" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcumulado)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lancamentos" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="OS, Cliente, Descrição..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Período</label>
                  <div className="flex gap-2">
                    <style>
                      {`
                        .calendar-picker-yellow::-webkit-calendar-picker-indicator {
                          filter: invert(86%) sepia(21%) saturate(5436%) hue-rotate(358deg) brightness(101%) contrast(106%);
                          cursor: pointer;
                        }
                      `}
                    </style>
                    <Input
                      type="month"
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="calendar-picker-yellow"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Considerar Data</label>
                  <Select value={dateFilterType} onValueChange={(v: "competence" | "due") => setDateFilterType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competence">Competência</SelectItem>
                      <SelectItem value="due">Vencimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Tipo</label>
                  <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Receitas</SelectItem>
                      <SelectItem value="expense">Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Concluídos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Ordem de Serviço</label>
                  <Select value={osFilter} onValueChange={setOsFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {Array.from(new Set([
                        ...transactions.map(t => t.orderService),
                        ...serviceOrders.map(o => o.ticketNumber)
                      ].filter(Boolean))).sort().map(os => (
                        <SelectItem key={os} value={os as string}>{os}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleNewTransaction} size="sm" className="gap-1.5 shadow-lg">
              <Plus className="h-4 w-4" />
              Novo Lançamento
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receitas (Filtrado)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.income)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas (Filtrado)</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.expense)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resultado (Filtrado)</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(metrics.balance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lançamentos</CardTitle>
              <div className="text-sm text-muted-foreground">
                {filteredTransactions.length} registros encontrados
              </div>
            </CardHeader>
            <CardContent>
              <TransactionTable
                transactions={filteredTransactions}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold tracking-tight">DRE Gerencial</h3>
            <Select value={selectedDREYear} onValueChange={setSelectedDREYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Demonstração do Resultado - {selectedDREYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Receita Bruta */}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-semibold text-lg text-green-600">(+) Receita Operacional Bruta</span>
                  <span className="font-bold text-lg">{formatCurrency(dreData.grossRevenue)}</span>
                </div>

                {/* Impostos */}
                <div className="flex justify-between items-center py-1 pl-4 text-sm text-muted-foreground">
                  <span>(-) Impostos sobre Vendas</span>
                  <span>{formatCurrency(dreData.taxes)}</span>
                </div>

                {/* Receita Líquida */}
                <div className="flex justify-between items-center py-2 border-t border-b bg-muted/20">
                  <span className="font-semibold text-base">(=) Receita Operacional Líquida</span>
                  <span className="font-bold">{formatCurrency(dreData.netRevenue)}</span>
                </div>

                {/* Custos Variáveis */}
                <div className="flex justify-between items-center py-1 pl-4 text-sm text-muted-foreground">
                  <span>(-) Custos Variáveis (Matéria-Prima, Comissões...)</span>
                  <span>{formatCurrency(dreData.variableCosts)}</span>
                </div>

                {/* Margem de Contribuição */}
                <div className="flex justify-between items-center py-2 border-t border-b bg-muted/20">
                  <span className="font-semibold text-base">(=) Margem de Contribuição</span>
                  <span className={`font-bold ${dreData.contributionMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(dreData.contributionMargin)}
                  </span>
                </div>

                {/* Despesas Fixas */}
                <div className="flex justify-between items-center py-1 pl-4 text-sm text-muted-foreground">
                  <span>(-) Despesas Fixas Operacionais</span>
                  <span>{formatCurrency(dreData.fixedExpenses)}</span>
                </div>

                {/* Resultado Líquido */}
                <div className="flex justify-between items-center py-4 border-t-2 border-black mt-2 bg-muted/40 rounded-lg px-2">
                  <span className="font-bold text-xl">(=) Resultado Líquido do Exercício</span>
                  <span className={`font-bold text-xl ${dreData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dreData.netResult)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>




          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detalhamento de Despesas por Categoria e Subcategoria - {selectedDREYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px] min-w-[200px]">Categoria / Subcategoria</TableHead>
                      {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => (
                        <TableHead key={m} className="text-right min-w-[80px]">{m}</TableHead>
                      ))}
                      <TableHead className="text-right font-bold min-w-[100px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedExpenses.map((cat) => (
                      <Fragment key={cat.category}>
                        {/* Category Row */}
                        <TableRow key={cat.category} className="bg-muted/50 font-bold hover:bg-muted/60">
                          <TableCell>{cat.category}</TableCell>
                          {cat.monthly.map((amount, idx) => (
                            <TableCell key={idx} className="text-right text-xs">
                              {amount > 0 ? formatCurrency(amount) : '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                        </TableRow>
                        {/* Subcategory Rows */}
                        {cat.subcategories.map((sub) => (
                          <TableRow key={`${cat.category}-${sub.name}`} className="hover:bg-muted/20">
                            <TableCell className="pl-8 text-muted-foreground text-sm flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                              {sub.name}
                            </TableCell>
                            {sub.monthly.map((amount, idx) => (
                              <TableCell key={idx} className="text-right text-muted-foreground text-xs">
                                {amount > 0 ? formatCurrency(amount) : '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-medium text-sm">{formatCurrency(sub.total)}</TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                    {/* Grand Total Row could be added here if needed */}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="gastos_servicos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleNewServiceExpense} size="sm" className="gap-1.5 shadow-lg">
              <Plus className="h-4 w-4" />
              Novo Gasto por Serviço
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Serviços (Adição Manual)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Cliente</TableHead>
                      <TableHead>Ambiente</TableHead>
                      <TableHead className="text-right">Valor do Serviço</TableHead>
                      <TableHead className="text-right">Valor Gasto</TableHead>
                      <TableHead className="text-right">Lucro Bruto</TableHead>
                      <TableHead className="text-right">Margem (%)</TableHead>
                      <TableHead className="w-[100px] text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                          Nenhum gasto por serviço cadastrado manualmente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      serviceExpenses.map((expense) => {
                        const grossProfit = expense.serviceValue - expense.spentValue;
                        const margin = expense.serviceValue > 0 ? (grossProfit / expense.serviceValue) * 100 : 0;
                        return (
                          <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.clientName}</TableCell>
                            <TableCell>{expense.environment}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(expense.serviceValue)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(expense.spentValue)}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${grossProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                              {formatCurrency(grossProfit)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {margin.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditServiceExpense(expense)} className="h-8 w-8 text-blue-600">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteServiceExpense(expense.id)} className="h-8 w-8 text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conciliacao" className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-[#0f5156]">Conciliação Bancária</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Instituição Financeira</span>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-[220px] bg-[#dbeceb] border-[#0f5156] text-[#0f5156] font-medium">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banco_itau">Banco Itaú</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro (Caixa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex items-center bg-orange-400 rounded-lg px-2 text-white">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="text-white hover:text-white hover:bg-orange-500">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <span className="font-bold text-lg px-4 capitalize">
                  {currentDateReconciliation.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="text-white hover:text-white hover:bg-orange-500">
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
              <div className="flex-1 flex justify-end items-center gap-4">
                <span className="font-bold">
                  Saldo final no dia {reconciliationDailyData.previousMonthDate.toLocaleDateString()}
                </span>
                <span className="font-bold text-xl">
                  {formatCurrency(reconciliationDailyData.initialBalance)}
                </span>
                <Button className="bg-orange-400 hover:bg-orange-500 text-white font-bold">
                  Editar Saldos
                </Button>
              </div>
            </div>

            <Card className="rounded-none border-0 shadow-none">
              <CardContent className="p-0">
                <div className="relative w-full overflow-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-black text-yellow-500 border-b border-yellow-500/50">
                        <th className="h-10 px-4 text-center font-bold border-r border-yellow-500/20 w-[120px]">Data</th>
                        <th className="h-10 px-4 text-center font-bold border-r border-yellow-500/20">Entradas</th>
                        <th className="h-10 px-4 text-center font-bold border-r border-yellow-500/20">Saídas</th>
                        <th className="h-10 px-4 text-center font-bold border-r border-yellow-500/20">Saldo</th>
                        <th className="h-10 px-4 text-center font-bold w-[200px]">Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationDailyData.days.map((day, index) => (
                        <tr key={index} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-black' : 'bg-[#121212]'} hover:bg-gray-900 transition-colors`}>
                          <td className="p-2 text-center font-bold text-yellow-400 border-r border-gray-800">{day.date.toLocaleDateString()}</td>

                          <td className="p-2 text-right border-r border-gray-800">
                            <div className="flex justify-between w-full px-2">
                              <span className="text-gray-600">R$</span>
                              <span className={day.income > 0 ? "text-green-400 font-medium" : "text-gray-600"}>
                                {day.income > 0 ? day.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                              </span>
                            </div>
                          </td>

                          <td className="p-2 text-right border-r border-gray-800">
                            <div className="flex justify-between w-full px-2">
                              <span className="text-gray-600">R$</span>
                              <span className={day.expense > 0 ? "text-red-400 font-medium" : "text-gray-600"}>
                                {day.expense > 0 ? day.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                              </span>
                            </div>
                          </td>

                          <td className="p-2 text-right border-r border-gray-800 font-medium">
                            <div className="flex justify-between w-full px-2">
                              <span className="text-gray-600">R$</span>
                              <span className={day.dailyBalance !== 0 ? (day.dailyBalance > 0 ? "text-green-400" : "text-red-400") : "text-gray-600"}>
                                {day.dailyBalance !== 0 ? day.dailyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                              </span>
                            </div>
                          </td>

                          <td className="p-2 text-right font-bold text-yellow-500">
                            <div className="flex justify-between w-full px-2 items-center">
                              <span className="text-gray-600 font-normal">R$</span>
                              <span>{day.accumulatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              {/* Simple indicator */}
                              <div className="w-4 ml-2">
                                {day.dailyBalance > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                                {day.dailyBalance < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
                                {day.dailyBalance === 0 && <div className="h-1 w-3 bg-yellow-600/50 mx-auto rounded-full" />}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#1a1a1a] font-bold border-t-2 border-yellow-500/50">
                        <td className="p-3 text-center text-yellow-400 border-r border-gray-800">Saldo no período</td>
                        <td className="p-3 text-right text-green-400 border-r border-gray-800">
                          R$ {reconciliationDailyData.days.reduce((acc, d) => acc + d.income, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-red-400 border-r border-gray-800">
                          R$ {reconciliationDailyData.days.reduce((acc, d) => acc + d.expense, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-yellow-400 border-r border-gray-800">
                          R$ {reconciliationDailyData.days.reduce((acc, d) => acc + d.dailyBalance, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-yellow-400">
                          R$ {reconciliationDailyData.days[reconciliationDailyData.days.length - 1]?.accumulatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patrimonio">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Controle Patrimonial</CardTitle>
              <Button onClick={handleNewAsset} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo Patrimônio
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data de Aquisição</TableHead>
                      <TableHead>Nome do Bem</TableHead>
                      <TableHead>Valor de Aquisição</TableHead>
                      <TableHead>Vida Útil (Anos)</TableHead>
                      <TableHead>Depreciação Anual</TableHead>
                      <TableHead>Depreciação Mensal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                          Nenhum patrimônio cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assets.map((asset) => {
                        const annualDepreciation = asset.value / asset.usefulLife;
                        const monthlyDepreciation = annualDepreciation / 12;
                        return (
                          <TableRow key={asset.id}>
                            <TableCell>{new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell>{formatCurrency(asset.value)}</TableCell>
                            <TableCell>{asset.usefulLife}</TableCell>
                            <TableCell className="text-red-500">{formatCurrency(annualDepreciation)}</TableCell>
                            <TableCell className="text-red-500">{formatCurrency(monthlyDepreciation)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <TransactionFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        onUpdate={handleUpdate}
        editingTransaction={editingTransaction}
      />

      <AssetFormDialog
        open={isAssetDialogOpen}
        onOpenChange={setIsAssetDialogOpen}
        onSubmit={handleAssetSubmit}
        onUpdate={handleAssetUpdate}
        editingAsset={editingAsset}
      />

      <ServiceExpenseFormDialog
        open={isServiceExpenseDialogOpen}
        onOpenChange={setIsServiceExpenseDialogOpen}
        onSubmit={handleServiceExpenseSubmit}
        onUpdate={handleServiceExpenseUpdate}
        editingExpense={editingServiceExpense}
      />
    </div>
  );
};

export default Financeiro;
