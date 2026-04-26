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
  Hammer,
  FileText
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
      <CommandInput placeholder="Digite um comando ou pesquise..." className="text-luxury" />
      <CommandList className="luxury-shadow">
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            <span className="text-luxury">CRM</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/orcamento"))}>
            <Calculator className="mr-2 h-4 w-4 text-primary" />
            <span className="text-luxury">Orçamentos</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/clientes"))}>
            <Users className="mr-2 h-4 w-4 text-primary" />
            <span className="text-luxury">Clientes e Fornecedores</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/financeiro"))}>
            <DollarSign className="mr-2 h-4 w-4 text-primary" />
            <span className="text-luxury">Financeiro</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/ordem-servico"))}>
            <ClipboardList className="mr-2 h-4 w-4 text-primary" />
            <span className="text-luxury">Ordens de Serviço</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/estoque"))}>
            <Package className="mr-2 h-4 w-4 text-primary" />
            <span className="text-luxury">Estoque</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/producao-fabrica"))}>
            <Hammer className="mr-2 h-4 w-4 text-primary" />
            <span className="text-luxury">Fábrica</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Vendas Recentes">
          {sales.slice(0, 5).map((sale) => (
            <CommandItem
              key={sale.id}
              onSelect={() => runCommand(() => navigate(`/`))}
            >
              <FileText className="mr-2 h-4 w-4 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-luxury font-bold">{sale.clientName}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{sale.product}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Clientes">
          {clients.filter(c => c.type === 'cliente').slice(0, 5).map((client) => (
            <CommandItem
              key={client.id}
              onSelect={() => runCommand(() => navigate(`/clientes`))}
            >
              <User className="mr-2 h-4 w-4 text-emerald-500" />
              <span className="text-luxury">{client.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
