import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Order } from "@/types/order";
import OrderFormDialog from "@/components/crm/OrderFormDialog";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Trash2,
    Pencil,
    TrendingUp,
    Printer,
    CheckCircle2,
    RotateCcw,
    History,
    Sparkles,
    FileText,
    Loader2,
    AlertTriangle,
    PackageCheck,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MagicButton } from "@/components/ui/magic-button";
import { cn } from "@/lib/utils";
import WeeklyOrderPrintView from "@/components/crm/WeeklyOrderPrintView";
import { useUserRole } from "@/hooks/useUserRole";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { AnimatedDeliveryTruck } from "@/components/ui/SectorArt";

interface WeeklyOrderBackupItem {
    product: string;
    quantity: number;
    unit_price: number;
    total_value: number;
    client: string;
    supplier: string;
    order_date: string;
    status: string;
    budget_id?: string | null;
}

interface WeeklyOrderSnapshot {
    id: string;
    label: string;
    createdAt: string;
    items: WeeklyOrderBackupItem[];
}

const UNDO_STORAGE_KEY = "bjl_weekly_orders_undo_stack_v1";
const CLOUD_BACKUP_KEY = "weekly_orders_backup_stack";

const PedidosSemana = () => {
    const { isAdmin } = useUserRole();
    const [orders, setOrders] = useState<Order[]>([]);
    const [purchasedHistory, setPurchasedHistory] = useState<Order[]>([]);
    const [approvedBudgets, setApprovedBudgets] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [isPrintOpen, setIsPrintOpen] = useState(false);

    // Pilha de Retorno / Desfazer (Undo) e Modal de Recuperação
    const [undoStack, setUndoStack] = useState<WeeklyOrderSnapshot[]>(() => {
        try {
            const raw = localStorage.getItem(UNDO_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [isRestoring, setIsRestoring] = useState(false);
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
    const [recoveryTab, setRecoveryTab] = useState("backups");

    useEffect(() => {
        const loadData = async () => {
            await fetchOrders();
            await loadCloudBackupsAndBudgets();

            // Sincronização automática apenas na SEGUNDA-FEIRA (1) e apenas UMA VEZ ao dia
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0];
            const lastSync = localStorage.getItem("last_stock_sync");

            if (today.getDay() === 1 && lastSync !== todayStr) {
                await syncStockWithOrders(false);
                localStorage.setItem("last_stock_sync", todayStr);
            }
        };
        loadData();
    }, []);

    const loadCloudBackupsAndBudgets = async () => {
        try {
            const [cloudBackupRes, budgetsRes] = await Promise.all([
                supabase
                    .from("api_settings")
                    .select("key_value")
                    .eq("key_name", CLOUD_BACKUP_KEY)
                    .maybeSingle(),
                supabase
                    .from("budgets")
                    .select("id, client_name, project_name, status, created_at, budget_items(*, budget_materials(name, supplier))")
                    .order("created_at", { ascending: false })
                    .limit(20),
            ]);

            if (cloudBackupRes.data?.key_value) {
                try {
                    const cloudStack = JSON.parse(cloudBackupRes.data.key_value) as WeeklyOrderSnapshot[];
                    if (Array.isArray(cloudStack) && cloudStack.length > 0) {
                        setUndoStack((localPrev) => {
                            if (localPrev.length >= cloudStack.length) return localPrev;
                            localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(cloudStack));
                            return cloudStack;
                        });
                    }
                } catch {
                    // ignore
                }
            }

            if (budgetsRes.data) {
                setApprovedBudgets(budgetsRes.data.filter((b: any) => (b.budget_items || []).length > 0));
            }
        } catch (err) {
            console.warn("Aviso ao carregar backups/orçamentos:", err);
        }
    };

    // Salva um snapshot completo da lista atual antes de qualquer alteração/reinício para permitir o botão "Voltar / Desfazer"
    const saveSnapshotBeforeChange = async (actionLabel: string, customOrders?: Order[]) => {
        try {
            let sourceRows: WeeklyOrderBackupItem[] = [];

            if (customOrders) {
                sourceRows = customOrders.map((o) => ({
                    product: o.product,
                    quantity: Number(o.quantity) || 1,
                    unit_price: Number(o.unitPrice) || 0,
                    total_value: Number(o.totalValue) || 0,
                    client: o.client || "REPOSIÇÃO ESTOQUE",
                    supplier: o.supplier || "A DEFINIR",
                    order_date:
                        o.date instanceof Date && !isNaN(o.date.getTime())
                            ? o.date.toISOString().split("T")[0]
                            : new Date().toISOString().split("T")[0],
                    status: o.status || "pendente",
                }));
            } else {
                const { data } = await supabase
                    .from("weekly_orders")
                    .select("*")
                    .eq("status", "pendente")
                    .order("order_date", { ascending: false });

                sourceRows = (data || []).map((r: any) => ({
                    product: r.product,
                    quantity: Number(r.quantity) || 1,
                    unit_price: Number(r.unit_price) || 0,
                    total_value: Number(r.total_value) || 0,
                    client: r.client || "REPOSIÇÃO ESTOQUE",
                    supplier: r.supplier || "A DEFINIR",
                    order_date: r.order_date || new Date().toISOString().split("T")[0],
                    status: "pendente",
                    budget_id: r.budget_id || null,
                }));
            }

            const newSnap: WeeklyOrderSnapshot = {
                id: `snap-${Date.now()}`,
                label: actionLabel,
                createdAt: new Date().toLocaleTimeString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                }),
                items: sourceRows,
            };

            const nextStack = [newSnap, ...undoStack].slice(0, 20);
            setUndoStack(nextStack);
            localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(nextStack));

            // Salva também na nuvem (Supabase api_settings) para não perder nunca
            supabase
                .from("api_settings")
                .upsert(
                    [{ key_name: CLOUD_BACKUP_KEY, key_value: JSON.stringify(nextStack) }],
                    { onConflict: "key_name" }
                )
                .then(() => {});
        } catch (err) {
            console.warn("Erro ao salvar snapshot de retorno:", err);
        }
    };

    // Botão de Retorno / Desfazer (Restaura a lista exatamente como estava antes!)
    const handleUndoLastAction = async (snapshotOverride?: WeeklyOrderSnapshot) => {
        const targetSnap = snapshotOverride || undoStack[0];
        if (!targetSnap) {
            setIsRecoveryModalOpen(true);
            return;
        }

        setIsRestoring(true);
        try {
            // Remove os pendentes atuais e restaura os itens do snapshot
            const { error: delErr } = await supabase
                .from("weekly_orders")
                .delete()
                .eq("status", "pendente");

            if (delErr) throw delErr;

            if (targetSnap.items.length > 0) {
                const payload = targetSnap.items.map((it) => ({
                    product: it.product,
                    quantity: Number(it.quantity) || 1,
                    unit_price: Number(it.unit_price) || 0,
                    total_value: Number(it.total_value) || 0,
                    client: it.client || "REPOSIÇÃO ESTOQUE",
                    supplier: it.supplier || "A DEFINIR",
                    order_date: it.order_date || new Date().toISOString().split("T")[0],
                    status: "pendente",
                    budget_id: it.budget_id || null,
                }));

                const { error: insErr } = await supabase.from("weekly_orders").insert(payload);
                if (insErr) throw insErr;
            }

            if (!snapshotOverride) {
                const remaining = undoStack.slice(1);
                setUndoStack(remaining);
                localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(remaining));
                supabase
                    .from("api_settings")
                    .upsert(
                        [{ key_name: CLOUD_BACKUP_KEY, key_value: JSON.stringify(remaining) }],
                        { onConflict: "key_name" }
                    )
                    .then(() => {});
            }

            await fetchOrders();
            toast.success(
                `Lista restaurada com sucesso! (${targetSnap.items.length} pedidos recuperados de "${targetSnap.label}")`
            );
            setIsRecoveryModalOpen(false);
        } catch (err: any) {
            console.error("Erro ao restaurar lista:", err);
            toast.error("Erro ao restaurar a lista anterior.");
        } finally {
            setIsRestoring(false);
        }
    };

    const syncStockWithOrders = async (clearFirst = false) => {
        try {
            if (clearFirst) {
                // SALVA BACKUP AUTOMÁTICO ANTES DE REINICIAR P/ SEXTA!
                await saveSnapshotBeforeChange(`Antes de Reiniciar p/ Sexta (${orders.length} itens)`);

                const { error: deleteError } = await supabase
                    .from("weekly_orders")
                    .delete()
                    .eq("status", "pendente");

                if (deleteError) throw deleteError;
            } else {
                await saveSnapshotBeforeChange(`Antes de Sincronizar Estoque (${orders.length} itens)`);
            }

            // 1. Buscar estoque
            const { data: inventoryData, error: inventoryError } = await supabase
                .from("inventory")
                .select("*");

            if (inventoryError) throw inventoryError;

            // 2. Buscar pedidos pendentes atuais para evitar duplicados (se não foi limpo)
            const { data: pendingOrders, error: ordersError } = await supabase
                .from("weekly_orders")
                .select("product")
                .eq("status", "pendente");

            if (ordersError) throw ordersError;

            const pendingProductsSet = clearFirst
                ? new Set()
                : new Set((pendingOrders || []).map((o) => o.product));

            // 3. Filtrar itens com estoque baixo que não estão nos pedidos
            const lowStockItems = (inventoryData || []).filter(
                (item) =>
                    Number(item.quantity) < Number(item.min_stock_level) &&
                    !pendingProductsSet.has(item.name)
            );

            if (lowStockItems.length === 0) {
                await fetchOrders();
                return;
            }

            // 4. Inserir novos pedidos
            const newOrders = lowStockItems.map((item) => {
                const quantityToOrder = Math.max(
                    1,
                    Number(item.min_stock_level) - Number(item.quantity)
                );
                return {
                    product: item.name,
                    quantity: quantityToOrder,
                    unit_price: Number(item.unit_price),
                    total_value: Number(item.unit_price) * quantityToOrder,
                    client: "REPOSIÇÃO ESTOQUE",
                    supplier: "A DEFINIR",
                    order_date: new Date().toISOString().split("T")[0],
                    status: "pendente",
                };
            });

            const { error: insertError } = await supabase
                .from("weekly_orders")
                .insert(newOrders);

            if (insertError) throw insertError;

            toast.info(
                `${lowStockItems.length} itens de reposição adicionados. (Use o botão "Voltar / Desfazer" no topo se quiser reverter!)`
            );

            await fetchOrders();
        } catch (error) {
            console.error("Erro ao sincronizar estoque:", error);
        }
    };

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from("weekly_orders")
                .select("*")
                .order("order_date", { ascending: false });

            if (error) throw error;

            const mappedOrders: Order[] = (data || []).map((o) => ({
                id: o.id,
                product: o.product,
                quantity: Number(o.quantity),
                unitPrice: Number(o.unit_price),
                totalValue: Number(o.total_value),
                client: o.client,
                supplier: o.supplier,
                date: new Date(o.order_date + "T12:00:00"),
                status: o.status || "pendente",
            }));

            setOrders(mappedOrders.filter((o) => o.status === "pendente"));
            setPurchasedHistory(mappedOrders.filter((o) => o.status !== "pendente").slice(0, 40));
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Erro ao carregar pedidos.");
        }
    };

    // Classifica automaticamente os itens "A DEFINIR" em CHM Morais ou BRUTA com base no histórico de compras e notas fiscais da BJL
    const handleAutoClassifySuppliers = async () => {
        const definirOrders = orders.filter((o) => isDefinir(o.supplier));
        if (definirOrders.length === 0) {
            toast.info("Não há itens pendentes em 'A Definir' para separar.");
            return;
        }

        await saveSnapshotBeforeChange(`Antes de Auto-Separar CHM / BRUTA (${orders.length} itens)`, orders);
        setIsRestoring(true);
        try {
            // Mapa histórico de produtos comprados + notas fiscais conhecidas
            const supplierByProduct = new Map<string, "CHM Morais" | "BRUTA">();

            for (const h of purchasedHistory) {
                const pName = (h.product || "").toUpperCase().trim();
                if (!pName) continue;
                if (isCHM(h.supplier)) supplierByProduct.set(pName, "CHM Morais");
                else if (isBRUTA(h.supplier)) supplierByProduct.set(pName, "BRUTA");
            }

            let movedCount = 0;
            for (const ord of definirOrders) {
                const up = (ord.product || "").toUpperCase().trim();
                let targetSupplier: "CHM Morais" | "BRUTA" | null = supplierByProduct.get(up) || null;

                if (!targetSupplier) {
                    if (
                        up.includes("RENNA") ||
                        up.includes("CORREDIÇA") ||
                        up.includes("CORREDICA") ||
                        up.includes("PARAFUSO") ||
                        up.includes("RENDIBOND") ||
                        up.includes("TEK BOND") ||
                        up.includes("TEKBOND") ||
                        up.includes("PL80") ||
                        up.includes("PL40") ||
                        up.includes("FREIJO NATURA") ||
                        up.includes("VERONA") ||
                        up.includes("MARFIM") ||
                        up.includes("PROADEC")
                    ) {
                        targetSupplier = "BRUTA";
                    } else if (
                        up.includes("SAYERLACK") ||
                        up.includes("MANTEIGA DE CACAU") ||
                        up.includes("DIVISOR DE TALHERES") ||
                        up.includes("KISA FIX") ||
                        up.includes("RENDICOLA") ||
                        up.includes("SUDATI") ||
                        up.includes("EUCATEX") ||
                        up.includes("CARVALHO") ||
                        up.includes("PEROBA") ||
                        up.includes("FLORIPA") ||
                        up.includes("JEQUITIBA") ||
                        up.includes("OPERA") ||
                        up.includes("CHAPA 15 MM BRANCO TX") ||
                        up.includes("CHAPA 6MM BRANCO TX") ||
                        up.includes("FITA 22 MM BRANCO TX")
                    ) {
                        targetSupplier = "CHM Morais";
                    }
                }

                if (targetSupplier) {
                    await supabase
                        .from("weekly_orders")
                        .update({ supplier: targetSupplier })
                        .eq("id", ord.id);
                    movedCount++;
                }
            }

            await fetchOrders();
            toast.success(
                `${movedCount} itens classificados automaticamente entre CHM Morais e BRUTA! (Você pode clicar em "Voltar / Desfazer" se quiser reverter)`
            );
            setIsRecoveryModalOpen(false);
        } catch (err) {
            console.error("Erro ao auto-classificar fornecedores:", err);
            toast.error("Erro ao separar fornecedores.");
        } finally {
            setIsRestoring(false);
        }
    };

    // Limpa em 1 clique os itens de "REPOSIÇÃO ESTOQUE" que o botão "Reiniciar p/ Sexta" criou automaticamente
    const handleClearAutoReplenishmentItems = async () => {
        const autoItems = orders.filter(
            (o) => (o.client || "").toUpperCase() === "REPOSIÇÃO ESTOQUE"
        );
        if (autoItems.length === 0) {
            toast.info("Não há itens de 'Reposição Estoque' na lista atual.");
            return;
        }

        await saveSnapshotBeforeChange(
            `Antes de limpar ${autoItems.length} itens de Reposição Estoque`,
            orders
        );
        setIsRestoring(true);
        try {
            const { error } = await supabase
                .from("weekly_orders")
                .delete()
                .eq("status", "pendente")
                .eq("client", "REPOSIÇÃO ESTOQUE");

            if (error) throw error;
            await fetchOrders();
            toast.success(
                `${autoItems.length} itens automáticos de Reposição Estoque removidos! (Salvo no botão Voltar / Desfazer)`
            );
            setIsRecoveryModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao limpar itens de reposição.");
        } finally {
            setIsRestoring(false);
        }
    };

    // Recupera/Reinsere todos os materiais de um Orçamento (ex: Míria, Luciana, Mayara, Jonas, Alessandra) na lista da semana
    const handleRestoreBudgetToWeeklyOrders = async (
        budget: any,
        defaultSupplier: "A DEFINIR" | "CHM Morais" | "BRUTA" = "A DEFINIR"
    ) => {
        const bItems = budget.budget_items || [];
        if (bItems.length === 0) {
            toast.info("Este orçamento não possui materiais cadastrados.");
            return;
        }

        await saveSnapshotBeforeChange(
            `Antes de restaurar orçamento de ${budget.client_name}`,
            orders
        );
        setIsRestoring(true);
        try {
            const todayIso = new Date().toISOString().split("T")[0];
            const payload = bItems.map((item: any) => {
                const matName =
                    item.custom_description ||
                    item.budget_materials?.name ||
                    "Material do Orçamento";
                const qty = Number(item.quantity) || 1;
                const unitP = Number(item.unit_price_at_time) || 0;
                const totP = Number(item.total_price) || Number((qty * unitP).toFixed(2));
                return {
                    product: matName,
                    quantity: qty,
                    unit_price: unitP,
                    total_value: totP,
                    client: `${budget.client_name}${
                        budget.project_name ? ` (${budget.project_name})` : ""
                    }`,
                    supplier: defaultSupplier,
                    order_date: todayIso,
                    status: "pendente",
                    budget_id: budget.id,
                };
            });

            const { error } = await supabase.from("weekly_orders").insert(payload);
            if (error) throw error;

            await fetchOrders();
            toast.success(
                `${payload.length} materiais do orçamento de "${budget.client_name}" restaurados para Pedidos da Semana!`
            );
            setIsRecoveryModalOpen(false);
        } catch (err) {
            console.error("Erro ao restaurar orçamento:", err);
            toast.error("Erro ao restaurar materiais do orçamento.");
        } finally {
            setIsRestoring(false);
        }
    };

    // Reativa um item do histórico de comprados de volta para pendente
    const handleReactivatePurchasedOrder = async (ord: Order) => {
        await saveSnapshotBeforeChange(`Antes de reativar "${ord.product}"`, orders);
        try {
            const { error } = await supabase
                .from("weekly_orders")
                .update({
                    status: "pendente",
                    order_date: new Date().toISOString().split("T")[0],
                })
                .eq("id", ord.id);
            if (error) throw error;
            await fetchOrders();
            toast.success(`"${ord.product}" (${ord.supplier}) voltou para a lista da semana!`);
        } catch {
            toast.error("Erro ao reativar pedido.");
        }
    };

    const handleMarkAsOrdered = async (id: string) => {
        const target = orders.find((o) => o.id === id);
        await saveSnapshotBeforeChange(
            `Antes de marcar "${target?.product || "item"}" como comprado`,
            orders
        );
        try {
            const { error } = await supabase
                .from("weekly_orders")
                .update({ status: "comprado" })
                .eq("id", id);

            if (error) throw error;

            toast.success("Pedido marcado como comprado! (Clique em 'Voltar / Desfazer' se foi por engano)");
            setOrders((prev) => prev.filter((o) => o.id !== id));
        } catch (error) {
            console.error("Error marking order:", error);
            toast.error("Erro ao atualizar pedido.");
        }
    };

    const handleNewOrder = () => {
        setEditingOrder(null);
        setIsDialogOpen(true);
    };

    const handleEditOrder = (order: Order) => {
        setEditingOrder(order);
        setIsDialogOpen(true);
    };

    const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
        const target = orders.find((o) => o.id === id);
        await saveSnapshotBeforeChange(
            `Antes de alterar "${target?.product || "pedido"}"`,
            orders
        );
        try {
            const updateData: any = {};
            if (updates.product) updateData.product = updates.product;
            if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
            if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
            if (updates.totalValue !== undefined) updateData.total_value = updates.totalValue;
            if (updates.client) updateData.client = updates.client;
            if (updates.supplier) updateData.supplier = updates.supplier;
            if (updates.date) updateData.order_date = updates.date.toISOString().split("T")[0];

            const { error } = await supabase
                .from("weekly_orders")
                .update(updateData)
                .eq("id", id);

            if (error) throw error;

            setOrders(orders.map((o) => (o.id === id ? { ...o, ...updates } : o)));
            toast.success("Pedido atualizado!");
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Erro ao atualizar pedido.");
        }
    };

    const handleDeleteOrder = async (id: string) => {
        const target = orders.find((o) => o.id === id);
        await saveSnapshotBeforeChange(
            `Antes de remover "${target?.product || "pedido"}"`,
            orders
        );
        try {
            const { error } = await supabase
                .from("weekly_orders")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setOrders(orders.filter((o) => o.id !== id));
            toast.success("Pedido removido! (Use 'Voltar / Desfazer' no topo para recuperar se precisar)");
        } catch (error) {
            console.error("Error deleting order:", error);
            toast.error("Erro ao remover pedido.");
        }
    };

    const handleOrderSubmit = async (orderData: Omit<Order, "id">) => {
        await saveSnapshotBeforeChange(`Antes de adicionar "${orderData.product}"`, orders);
        try {
            const newOrder = {
                product: orderData.product,
                quantity: orderData.quantity,
                unit_price: orderData.unitPrice,
                total_value: orderData.totalValue,
                client: orderData.client,
                supplier: orderData.supplier,
                order_date: orderData.date.toISOString().split("T")[0],
            };

            const { data, error } = await supabase
                .from("weekly_orders")
                .insert([newOrder])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const createdOrder: Order = {
                    id: data.id,
                    product: data.product,
                    quantity: Number(data.quantity),
                    unitPrice: Number(data.unit_price),
                    totalValue: Number(data.total_value),
                    client: data.client,
                    supplier: data.supplier,
                    date: new Date(data.order_date + "T12:00:00"),
                    status: data.status || "pendente",
                };
                setOrders([createdOrder, ...orders]);
            }
            setIsDialogOpen(false);
            toast.success("Pedido registrado!");
        } catch (error) {
            console.error("Error adding order:", error);
            toast.error("Erro ao registrar pedido.");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const totalOrders = orders.length;
    const totalValue = orders.reduce((acc, o) => acc + o.totalValue, 0);
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

    // Filters for this week (Monday to Sunday)
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const currentWeekOrders = orders.filter((o) => {
        const orderDate = new Date(o.date);
        return isWithinInterval(orderDate, { start: weekStart, end: weekEnd });
    });

    const isCHM = (sup: string | undefined) => {
        if (!sup) return false;
        const up = sup.toUpperCase();
        return up.includes("CHM") || up.includes("C HM") || up.includes("MORAIS") || up.includes("CED");
    };

    const isBRUTA = (sup: string | undefined) => {
        if (!sup) return false;
        const up = sup.toUpperCase();
        return up.includes("BRUTA");
    };

    const isDefinir = (sup: string | undefined) => {
        if (!sup) return true;
        const up = sup.toUpperCase();
        return up === "A DEFINIR" || up === "DEFINIR" || up === "NULL" || up === "";
    };

    const OrderSection = ({
        title,
        type,
        colorClass,
        bgColorClass,
        borderClass,
    }: {
        title: string;
        type: "CHM" | "BRUTA" | "OTHER" | "DEFINIR";
        colorClass: string;
        bgColorClass: string;
        borderClass: string;
    }) => {
        const filtered = orders.filter((o) => {
            if (type === "DEFINIR") return isDefinir(o.supplier);
            if (type === "CHM") return isCHM(o.supplier) && !isDefinir(o.supplier);
            if (type === "BRUTA") return isBRUTA(o.supplier) && !isDefinir(o.supplier);
            return !isCHM(o.supplier) && !isBRUTA(o.supplier) && !isDefinir(o.supplier);
        });

        if (filtered.length === 0) return null;

        const getSupplierStyles = (sup: string) => {
            const upSup = sup.toUpperCase();
            if (
                upSup.includes("CHM") ||
                upSup.includes("MORAIS") ||
                upSup.includes("C HM") ||
                upSup.includes("CED")
            )
                return "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
            if (upSup.includes("BRUTA"))
                return "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.1)]";
            return "border-white/10 bg-black/20";
        };

        const getSupplierTextColor = (sup: string) => {
            const upSup = sup.toUpperCase();
            if (
                upSup.includes("CHM") ||
                upSup.includes("MORAIS") ||
                upSup.includes("C HM") ||
                upSup.includes("CED")
            )
                return "text-emerald-500";
            if (upSup.includes("BRUTA")) return "text-orange-500";
            return "text-white";
        };

        return (
            <Card
                className={cn(
                    "border backdrop-blur-2xl transition-all duration-300 overflow-hidden",
                    borderClass,
                    bgColorClass
                )}
            >
                <CardHeader className="pb-4 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
                    <CardTitle className={cn("text-[10px] font-black uppercase tracking-[0.3em]", colorClass)}>
                        {title} ({filtered.length})
                    </CardTitle>
                    {type === "DEFINIR" && filtered.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isRestoring}
                                onClick={handleAutoClassifySuppliers}
                                className="h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 gap-1.5"
                            >
                                <Sparkles className="h-3 w-3" />
                                Auto-Separar CHM / BRUTA
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="space-y-3 min-w-[720px]">
                            {/* Header mimic */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                                <div className="col-span-1">Ação</div>
                                <div className="col-span-1">Data</div>
                                <div className={isAdmin ? "col-span-3" : "col-span-4"}>Produto</div>
                                <div className={isAdmin ? "col-span-2" : "col-span-3"}>Fornecedor</div>
                                <div className={isAdmin ? "col-span-2" : "col-span-2"}>Cliente</div>
                                <div className="col-span-1 text-center">Qtd</div>
                                {isAdmin && <div className="col-span-2 text-right">Total</div>}
                            </div>

                            {filtered.map((order) => {
                                const supStyle = getSupplierStyles(order.supplier);
                                const supText = getSupplierTextColor(order.supplier);

                                return (
                                    <div
                                        key={order.id}
                                        className={cn(
                                            "grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-xl border-2 transition-all group relative",
                                            supStyle,
                                            "hover:bg-black/40"
                                        )}
                                    >
                                        <div className="col-span-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all shadow-sm"
                                                onClick={() => handleMarkAsOrdered(order.id)}
                                                title="Marcar como Pedido"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="col-span-1 text-[10px] font-bold text-muted-foreground/80">
                                            {format(new Date(order.date), "dd/MM")}
                                        </div>
                                        <div
                                            className={cn(
                                                isAdmin ? "col-span-3" : "col-span-4",
                                                "text-[11px] font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors"
                                            )}
                                        >
                                            {order.product}
                                        </div>
                                        <div
                                            className={cn(
                                                isAdmin ? "col-span-2" : "col-span-3",
                                                "text-[10px] font-black uppercase tracking-widest",
                                                supText
                                            )}
                                        >
                                            {order.supplier}
                                        </div>
                                        <div
                                            className={cn(
                                                isAdmin ? "col-span-2" : "col-span-2",
                                                "text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter truncate"
                                            )}
                                        >
                                            {order.client}
                                        </div>
                                        <div className="col-span-1 text-center font-black text-[11px]">
                                            {order.quantity}
                                        </div>
                                        {isAdmin ? (
                                            <div
                                                className={cn(
                                                    "col-span-2 text-right font-black text-xs tabular-nums items-center flex justify-end gap-2",
                                                    supText
                                                )}
                                            >
                                                {type === "DEFINIR" && (
                                                    <div className="flex gap-1 mr-2 opacity-100 animate-in fade-in zoom-in duration-300">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            title="Mover para CHM"
                                                            className="h-8 px-2 text-[8px] border-emerald-500/50 hover:bg-emerald-500 hover:text-white"
                                                            onClick={() =>
                                                                handleUpdateOrder(order.id, {
                                                                    supplier: "CHM Morais",
                                                                })
                                                            }
                                                        >
                                                            CHM
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            title="Mover para BRUTA"
                                                            className="h-8 px-2 text-[8px] border-orange-500/50 hover:bg-orange-500 hover:text-white"
                                                            onClick={() =>
                                                                handleUpdateOrder(order.id, {
                                                                    supplier: "BRUTA",
                                                                })
                                                            }
                                                        >
                                                            BRUTA
                                                        </Button>
                                                    </div>
                                                )}
                                                {formatCurrency(order.totalValue)}
                                            </div>
                                        ) : (
                                            type === "DEFINIR" && (
                                                <div className="col-span-1 flex gap-1 justify-end opacity-100 animate-in fade-in zoom-in duration-300">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        title="Mover para CHM"
                                                        className="h-7 px-1.5 text-[8px] border-emerald-500/50 hover:bg-emerald-500 hover:text-white"
                                                        onClick={() =>
                                                            handleUpdateOrder(order.id, {
                                                                supplier: "CHM Morais",
                                                            })
                                                        }
                                                    >
                                                        CHM
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        title="Mover para BRUTA"
                                                        className="h-7 px-1.5 text-[8px] border-orange-500/50 hover:bg-orange-500 hover:text-white"
                                                        onClick={() =>
                                                            handleUpdateOrder(order.id, {
                                                                supplier: "BRUTA",
                                                            })
                                                        }
                                                    >
                                                        BRUTA
                                                    </Button>
                                                </div>
                                            )
                                        )}

                                        {/* Action buttons overlay */}
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10"
                                                onClick={() => handleEditOrder(order)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                                                onClick={() => handleDeleteOrder(order.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <ModuleHeader
                badge="SUPPLY.ENGINE // COMPRAS & LOGÍSTICA"
                statusLabel={`${totalOrders} Pedidos na Semana`}
                title="Pedidos da"
                highlight="Semana"
                subtitle="Compras programadas para CHM Morais / CED, BRUTA e fornecedores sob medida com sincronização do estoque."
                art={<AnimatedDeliveryTruck size="md" className="w-24 h-16" />}
                actions={
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* BOTÃO DE RETORNO / DESFAZER IMEDIATO */}
                        <Button
                            onClick={() => {
                                if (undoStack.length > 0) {
                                    handleUndoLastAction();
                                } else {
                                    setIsRecoveryModalOpen(true);
                                }
                            }}
                            disabled={isRestoring}
                            variant="outline"
                            className="gap-2 h-11 px-4 border-amber-500/40 bg-amber-500/15 text-amber-300 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-amber-500 hover:text-black transition-all shadow-lg shadow-amber-500/10"
                            title="Desfazer última alteração ou recuperar lista anterior"
                        >
                            {isRestoring ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RotateCcw className="h-4 w-4" />
                            )}
                            Voltar / Desfazer {undoStack.length > 0 ? `(${undoStack.length})` : ""}
                        </Button>

                        {/* BOTÃO DE RECUPERAR LISTA / ORÇAMENTOS / HISTÓRICO */}
                        <Button
                            onClick={() => setIsRecoveryModalOpen(true)}
                            variant="outline"
                            className="gap-2 h-11 px-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                            title="Recuperar materiais de orçamentos aprovados, histórico ou separar fornecedores"
                        >
                            <History className="h-4 w-4" />
                            Recuperar Lista / Clientes
                        </Button>

                        <Button
                            onClick={() => syncStockWithOrders(false)}
                            variant="outline"
                            className="gap-2 h-11 px-4 border-blue-500/20 bg-blue-500/5 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-500 hover:text-white group transition-all"
                        >
                            <TrendingUp className="h-4 w-4 group-hover:scale-110 transition-transform text-blue-400" />
                            Sincronizar
                        </Button>
                        <Button
                            onClick={() => {
                                if (
                                    window.confirm(
                                        "Um backup automático da sua lista atual será salvo no botão 'Voltar / Desfazer' antes de reiniciar. Deseja reiniciar a lista com base no estoque?"
                                    )
                                ) {
                                    syncStockWithOrders(true);
                                }
                            }}
                            variant="outline"
                            className="gap-2 h-11 px-4 border-orange-500/20 bg-orange-500/5 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-orange-600 hover:text-white group transition-all"
                        >
                            <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform text-orange-400" />
                            Reiniciar p/ Sexta
                        </Button>
                        <Button
                            onClick={() => setIsPrintOpen(true)}
                            variant="outline"
                            className="gap-2 h-11 px-4 border-white/10 bg-white/5 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary hover:text-primary-foreground group transition-all"
                        >
                            <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            Relatório PDF
                        </Button>
                        <MagicButton
                            onClick={handleNewOrder}
                            className="gap-1.5 h-11 px-5 shadow-xl shadow-primary/20"
                        >
                            <Plus className="h-4 w-4" />
                            Novo Pedido
                        </MagicButton>
                    </div>
                }
            />

            {/* BARRA DE RECUPERAÇÃO RÁPIDA (PARA QUANDO APERTAR REINICIAR P/ SEXTA SEM QUERER) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-blue-500/10 border border-amber-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                            Central de Retorno & Recuperação Rápida de Pedidos
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Apertou <strong>Reiniciar p/ Sexta</strong> ou apagou algo sem querer? Use os botões ao lado para{" "}
                        <strong>voltar a lista anterior</strong>, <strong>puxar materiais dos projetos/clientes</strong> (Míria, Luciana, Mayara, Jonas, Alessandra) ou{" "}
                        <strong>auto-separar CHM Morais & BRUTA</strong> em 1 clique:
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {undoStack.length > 0 && (
                        <Button
                            size="sm"
                            disabled={isRestoring}
                            onClick={() => handleUndoLastAction()}
                            className="h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-[11px] gap-1.5"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Desfazer Última Ação ({undoStack[0].items.length} itens)
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={isRestoring}
                        onClick={handleAutoClassifySuppliers}
                        className="h-9 rounded-xl border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-black uppercase tracking-wider text-[11px] gap-1.5"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Auto-Separar CHM / BRUTA
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setRecoveryTab("orcamentos");
                            setIsRecoveryModalOpen(true);
                        }}
                        className="h-9 rounded-xl border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 font-black uppercase tracking-wider text-[11px] gap-1.5"
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Restaurar de Projetos / Clientes
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={isRestoring}
                        onClick={handleClearAutoReplenishmentItems}
                        className="h-9 rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold text-[11px] gap-1.5"
                        title="Remove os 26 itens de Reposição Estoque que o botão Reiniciar p/ Sexta adicionou"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Limpar Reposição Automática
                    </Button>
                </div>
            </div>

            {/* WEEKLY ORDERS HUD */}
            <div className={cn("grid gap-4", isAdmin ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1")}>
                <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card tilt-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-primary">
                            <Plus className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                Volume de Pedidos
                            </p>
                            <h3 className="text-3xl font-black text-primary tracking-tighter">
                                <AnimatedCounter value={totalOrders} />
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">
                                    Registros
                                </span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                {isAdmin && (
                    <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card tilt-card">
                        <CardContent className="p-6 flex items-center justify-between relative">
                            <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-amber-500">
                                <TrendingUp className="h-32 w-32" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                    Investimento Total
                                </p>
                                <h3 className="text-3xl font-black text-amber-500 tracking-tighter">
                                    <AnimatedCounter value={totalValue} formatter={formatCurrency} />
                                </h3>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isAdmin && (
                    <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card tilt-card">
                        <CardContent className="p-6 flex items-center justify-between relative">
                            <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-blue-500">
                                <TrendingUp className="h-32 w-32" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                    Ticket Médio p/ Pedido
                                </p>
                                <h3 className="text-3xl font-black text-white tracking-tighter">
                                    <AnimatedCounter value={avgOrderValue} formatter={formatCurrency} />
                                </h3>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                    <OrderSection
                        title="Pedidos para Definir Fornecedor"
                        type="DEFINIR"
                        colorClass="text-blue-400"
                        bgColorClass="bg-blue-500/5"
                        borderClass="border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] border-dashed"
                    />
                </div>

                <OrderSection
                    title="CHM Morais / CED"
                    type="CHM"
                    colorClass="text-emerald-400"
                    bgColorClass="bg-emerald-500/5"
                    borderClass="border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                />

                <OrderSection
                    title="BRUTA"
                    type="BRUTA"
                    colorClass="text-orange-400"
                    bgColorClass="bg-orange-500/5"
                    borderClass="border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                />

                <div className="lg:col-span-2">
                    <OrderSection
                        title="Demais Fornecedores"
                        type="OTHER"
                        colorClass="text-primary"
                        bgColorClass="bg-card/40"
                        borderClass="border-white/10"
                    />
                </div>
            </div>

            <OrderFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleOrderSubmit}
                onUpdate={handleUpdateOrder}
                editingOrder={editingOrder}
            />

            {/* MODAL DE RETORNO, HISTÓRICO DE BACKUPS E RECUPERAÇÃO DE ORÇAMENTOS */}
            <Dialog open={isRecoveryModalOpen} onOpenChange={setIsRecoveryModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="tech-hud-pill text-amber-400 border-amber-500/30 bg-amber-500/10">
                                <RotateCcw className="h-3.5 w-3.5" />
                                SISTEMA ANTI-PERDA // RETORNO & RECUPERAÇÃO
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-display font-black">
                            Voltar Lista Anterior ou Recuperar Pedidos de Projetos
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Restaure um backup salvo automaticamente, puxe os materiais completos de qualquer orçamento de cliente ou reative pedidos anteriores em 1 clique.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={recoveryTab} onValueChange={setRecoveryTab} className="w-full">
                        <TabsList className="grid grid-cols-3 bg-white/[0.03] p-1 rounded-2xl border border-white/10 h-auto">
                            <TabsTrigger
                                value="backups"
                                className="rounded-xl py-2 text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black"
                            >
                                1. Backups de Retorno ({undoStack.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="orcamentos"
                                className="rounded-xl py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                2. Puxar de Projetos / Clientes ({approvedBudgets.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="comprados"
                                className="rounded-xl py-2 text-xs font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-black"
                            >
                                3. Histórico Já Comprados ({purchasedHistory.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* ABA 1: PILHA DE BACKUPS AUTOMÁTICOS */}
                        <TabsContent value="backups" className="space-y-3 mt-4">
                            {undoStack.length === 0 ? (
                                <div className="p-6 rounded-2xl border border-dashed border-white/15 bg-black/30 text-center space-y-3">
                                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground">
                                            O protetor automático de backups já está ativo a partir de agora!
                                        </p>
                                        <p className="text-[11px] text-muted-foreground max-w-lg mx-auto">
                                            Sempre que você clicar em <strong>Reiniciar p/ Sexta</strong>, mover itens ou excluir, a lista inteira ficará gravada aqui para você voltar com 1 clique. Para recuperar os materiais que foram apagados agora pouco, use a aba{" "}
                                            <strong className="text-primary">"2. Puxar de Projetos / Clientes"</strong> ou o botão{" "}
                                            <strong className="text-emerald-400">"Auto-Separar CHM / BRUTA"</strong> abaixo!
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            onClick={() => setRecoveryTab("orcamentos")}
                                            className="rounded-xl bg-primary text-primary-foreground font-black uppercase text-xs gap-1.5"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            Ver Materiais dos Clientes (Míria, Mayara, Jonas...)
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleAutoClassifySuppliers}
                                            className="rounded-xl border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold text-xs gap-1.5"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Auto-Separar Lista Atual em CHM / BRUTA
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {undoStack.map((snap, idx) => (
                                        <div
                                            key={snap.id}
                                            className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-tech text-[10px] font-black">
                                                        Backup #{idx + 1} • {snap.createdAt}
                                                    </span>
                                                    <span className="text-xs font-bold text-foreground">
                                                        {snap.label}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-1">
                                                    Contém <strong>{snap.items.length} pedidos</strong>:{" "}
                                                    {snap.items
                                                        .slice(0, 4)
                                                        .map((i) => `${i.quantity}x ${i.product}`)
                                                        .join(", ")}
                                                    {snap.items.length > 4
                                                        ? ` (+${snap.items.length - 4} itens)`
                                                        : ""}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                disabled={isRestoring}
                                                onClick={() => handleUndoLastAction(snap)}
                                                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs shrink-0 gap-1.5"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                Voltar para esta Lista
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* ABA 2: RECUPERAR MATERIAIS DE ORÇAMENTOS DE CLIENTES */}
                        <TabsContent value="orcamentos" className="space-y-3 mt-4">
                            <p className="text-xs text-muted-foreground">
                                Clique em qualquer projeto/cliente abaixo para devolver todos os materiais dele para a lista de <strong>Pedidos da Semana</strong>:
                            </p>
                            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                                {approvedBudgets.map((b) => {
                                    const bItems = b.budget_items || [];
                                    return (
                                        <div
                                            key={b.id}
                                            className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black uppercase text-foreground">
                                                        👤 {b.client_name} — {b.project_name}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                                                            b.status === "aprovado"
                                                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                                        )}
                                                    >
                                                        {b.status === "aprovado" ? "Aprovado" : "Em Elaboração"}
                                                    </span>
                                                    <span className="text-[10px] font-tech text-primary font-bold">
                                                        ({bItems.length} materiais)
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate mt-1">
                                                    {bItems
                                                        .slice(0, 4)
                                                        .map(
                                                            (it: any) =>
                                                                `${it.quantity}x ${
                                                                    it.custom_description ||
                                                                    it.budget_materials?.name ||
                                                                    "Item"
                                                                }`
                                                        )
                                                        .join(", ")}
                                                    {bItems.length > 4 ? ` (+${bItems.length - 4} itens)` : ""}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isRestoring}
                                                    onClick={() =>
                                                        handleRestoreBudgetToWeeklyOrders(b, "A DEFINIR")
                                                    }
                                                    className="h-8 rounded-xl text-[10px] font-bold border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                                                >
                                                    + P/ Definir
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isRestoring}
                                                    onClick={() =>
                                                        handleRestoreBudgetToWeeklyOrders(b, "CHM Morais")
                                                    }
                                                    className="h-8 rounded-xl text-[10px] font-bold border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                                >
                                                    + P/ CHM
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isRestoring}
                                                    onClick={() =>
                                                        handleRestoreBudgetToWeeklyOrders(b, "BRUTA")
                                                    }
                                                    className="h-8 rounded-xl text-[10px] font-bold border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                                                >
                                                    + P/ BRUTA
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        {/* ABA 3: REATIVAR PEDIDOS DO HISTÓRICO DE COMPRADOS */}
                        <TabsContent value="comprados" className="space-y-3 mt-4">
                            <p className="text-xs text-muted-foreground">
                                Pedidos anteriores marcados como comprados (clique em <strong>Reativar na Lista</strong> para trazer qualquer item de volta para a semana atual):
                            </p>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                {purchasedHistory.map((ord) => (
                                    <div
                                        key={ord.id}
                                        className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div>
                                            <span className="font-black text-foreground">{ord.product}</span>
                                            <span className="text-muted-foreground ml-2">
                                                • Qtd: <strong>{ord.quantity}</strong> • Fornecedor:{" "}
                                                <strong className="text-primary">{ord.supplier}</strong>
                                                {ord.client ? ` • Cliente: ${ord.client}` : ""}
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReactivatePurchasedOrder(ord)}
                                            className="h-8 rounded-lg text-[10px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shrink-0 gap-1"
                                        >
                                            <PackageCheck className="h-3.5 w-3.5" />
                                            Reativar na Lista
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsRecoveryModalOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isPrintOpen && (
                <WeeklyOrderPrintView orders={orders} onClose={() => setIsPrintOpen(false)} />
            )}
        </div>
    );
};

export default PedidosSemana;
