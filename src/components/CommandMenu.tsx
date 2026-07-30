import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  ClipboardList,
  Package,
  FileText,
  CheckSquare
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useSales } from "@/hooks/useSales";
import { useClients } from "@/hooks/useClients";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { sales } = useSales();
  const { clients } = useClients();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou pesquise (ex: Vendas, Orçamentos, Clientes)..." className="text-luxury font-display" />
      <CommandList className="luxury-shadow max-h-[400px]">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          Nenhum resultado encontrado.
        </CommandEmpty>
        
        <CommandGroup heading="Central de Comando">
          <CommandItem onSelect={() => runCommand(() => navigate("/admin"))}>
            <TrendingUp className="mr-2.5 h-4 w-4 text-amber-500" />
            <span className="text-luxury font-bold">CRM Dashboard</span>
            <CommandShortcut className="text-[10px] font-mono opacity-70">⌘1</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/orcamento"))}>
            <Calculator className="mr-2.5 h-4 w-4 text-amber-400" />
            <span className="text-luxury font-bold">Orçamentos & Materiais</span>
            <CommandShortcut className="text-[10px] font-mono opacity-70">⌘2</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/clientes"))}>
            <Users className="mr-2.5 h-4 w-4 text-cyan-400" />
            <span className="text-luxury font-bold">Clientes e Fornecedores</span>
            <CommandShortcut className="text-[10px] font-mono opacity-70">⌘3</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/financeiro"))}>
            <DollarSign className="mr-2.5 h-4 w-4 text-emerald-400" />
            <span className="text-luxury font-bold">Financeiro & Conciliação</span>
            <CommandShortcut className="text-[10px] font-mono opacity-70">⌘4</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/ordem-servico"))}>
            <ClipboardList className="mr-2.5 h-4 w-4 text-purple-400" />
            <span className="text-luxury font-bold">Ordens de Serviço</span>
            <CommandShortcut className="text-[10px] font-mono opacity-70">⌘5</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/estoque"))}>
            <Package className="mr-2.5 h-4 w-4 text-blue-400" />
            <span className="text-luxury font-bold">Estoque de Chapas & Insumos</span>
            <CommandShortcut className="text-[10px] font-mono opacity-70">⌘6</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/tarefas"))}>
            <CheckSquare className="mr-2.5 h-4 w-4 text-emerald-500" />
            <span className="text-luxury font-bold">Kanban de Tarefas & Fábrica</span>
            <CommandShortcut className="text-[10px] font-mono opacity-70">⌘7</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator className="my-2 bg-white/10" />
        
        {sales.length > 0 && (
          <CommandGroup heading="Vendas Recentes">
            {sales.slice(0, 4).map((sale) => (
              <CommandItem
                key={sale.id}
                onSelect={() => runCommand(() => navigate(`/admin`))}
              >
                <FileText className="mr-2.5 h-4 w-4 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-luxury font-bold">{sale.clientName}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{sale.product}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {clients.length > 0 && (
          <>
            <CommandSeparator className="my-2 bg-white/10" />
            <CommandGroup heading="Clientes Cadastrados">
              {clients.filter(c => c.type === 'cliente').slice(0, 4).map((client) => (
                <CommandItem
                  key={client.id}
                  onSelect={() => runCommand(() => navigate(`/admin/clientes`))}
                >
                  <User className="mr-2.5 h-4 w-4 text-cyan-500" />
                  <span className="text-luxury font-medium">{client.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
