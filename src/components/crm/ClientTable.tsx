import { useState } from "react";
import { Client } from "@/types/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, History, FolderOpen, MessageSquare, Phone, MapPin, Navigation, User, ExternalLink } from "lucide-react";
import { WhatsAppQuickDialog } from "./WhatsAppQuickDialog";
import { Badge } from "@/components/ui/badge";

interface ClientTableProps {
    clients: Client[];
    onEdit: (client: Client) => void;
    onDelete: (id: string) => void;
    onViewTimeline?: (client: Client) => void;
    onViewFiles?: (client: Client) => void;
}

const ClientTable = ({ clients, onEdit, onDelete, onViewTimeline, onViewFiles }: ClientTableProps) => {
    const [whatsAppClient, setWhatsAppClient] = useState<Client | null>(null);

    const getFullAddress = (client: Client) => {
        const parts = [client.address, client.city, client.state].filter(Boolean);
        return parts.join(", ");
    };

    return (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-md">
            {/* Visão Mobile: Cards Otimizados para Obra / Medição (md:hidden) */}
            <div className="md:hidden flex flex-col divide-y divide-white/5">
                {clients.map((client) => {
                    const addressQuery = getFullAddress(client);
                    return (
                        <div key={client.id} className="p-4 space-y-3 hover:bg-white/[0.03] transition-colors">
                            {/* Cabeçalho do Card */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-black text-sm uppercase tracking-tight text-white truncate">
                                            {client.name}
                                        </h4>
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider py-0 px-1.5 border-white/10 bg-white/5">
                                            {client.type === 'fornecedor' ? 'Fornecedor' : 'Cliente'}
                                        </Badge>
                                    </div>
                                    {client.document && (
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                            {client.document}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Endereço & Ações Rápidas de GPS na Obra */}
                            {addressQuery ? (
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                    <div className="flex items-start gap-1.5 text-xs text-white/80">
                                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                                        <span className="leading-snug text-[11px] font-medium">{addressQuery}</span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                                        <a
                                            href={`https://waze.com/ul?q=${encodeURIComponent(addressQuery)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                                        >
                                            <Navigation className="h-3 w-3" />
                                            Rota Waze
                                        </a>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                                        >
                                            <MapPin className="h-3 w-3" />
                                            Google Maps
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                    <MapPin className="h-3 w-3 opacity-40" /> Sem endereço cadastrado
                                </p>
                            )}

                            {/* Barra de Ações Rápidas de Contato & Gestão */}
                            <div className="flex items-center justify-between gap-1.5 pt-1">
                                <div className="flex items-center gap-1.5">
                                    {client.phone && (
                                        <>
                                            <a
                                                href={`tel:${client.phone.replace(/\D/g, '')}`}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 active:scale-95 transition-all flex items-center gap-1 text-[10px] font-bold"
                                                title="Ligar para o cliente"
                                            >
                                                <Phone className="h-3.5 w-3.5 text-primary" />
                                                <span className="hidden sm:inline">Ligar</span>
                                            </a>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider gap-1"
                                                onClick={() => setWhatsAppClient(client)}
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                <span>Whats</span>
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {onViewFiles && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                            onClick={() => onViewFiles(client)}
                                            title="Fotos da Obra & Arquivos"
                                        >
                                            <FolderOpen className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    {onViewTimeline && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={() => onViewTimeline(client)}
                                            title="Central 360º"
                                        >
                                            <History className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                                        onClick={() => onEdit(client)}
                                        title="Editar"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => onDelete(client.id)}
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {clients.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-xs uppercase tracking-widest font-bold">
                        Nenhum cliente/fornecedor cadastrado.
                    </div>
                )}
            </div>

            {/* Visão Desktop: Tabela Completa (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[700px]">
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Nome / Tipo</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">CPF/CNPJ</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Telefone</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Email</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Endereço & Rotas GPS</TableHead>
                            <TableHead className="w-[140px] text-right font-black uppercase text-[10px] tracking-widest text-muted-foreground">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.map((client) => {
                            const addressQuery = getFullAddress(client);
                            return (
                                <TableRow key={client.id} className="border-white/5 hover:bg-white/[0.03] transition-colors">
                                    <TableCell className="font-bold text-white">
                                        <div className="flex flex-col">
                                            <span>{client.name}</span>
                                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-normal">
                                                {client.type === 'fornecedor' ? 'Fornecedor' : 'Cliente'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-white/70">{client.document || '---'}</TableCell>
                                    <TableCell className="text-xs text-white/70">{client.phone || '---'}</TableCell>
                                    <TableCell className="text-xs text-white/70">{client.email || '---'}</TableCell>
                                    <TableCell className="text-xs">
                                        {addressQuery ? (
                                            <div className="flex items-center gap-2">
                                                <span className="truncate max-w-[180px] text-white/70" title={addressQuery}>
                                                    {addressQuery}
                                                </span>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <a
                                                        href={`https://waze.com/ul?q=${encodeURIComponent(addressQuery)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[9px] font-black uppercase transition-all"
                                                        title="Abrir no Waze"
                                                    >
                                                        <Navigation className="h-3 w-3" />
                                                    </a>
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase transition-all"
                                                        title="Abrir no Google Maps"
                                                    >
                                                        <MapPin className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">---</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {client.phone && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                    onClick={() => setWhatsAppClient(client)}
                                                    title="Enviar WhatsApp"
                                                >
                                                    <MessageSquare className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {onViewFiles && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                                    onClick={() => onViewFiles(client)}
                                                    title="Arquivos e Fotos da Obra"
                                                >
                                                    <FolderOpen className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {onViewTimeline && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={() => onViewTimeline(client)}
                                                    title="Ver Central 360º"
                                                >
                                                    <History className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg hover:bg-white/10"
                                                onClick={() => onEdit(client)}
                                                title="Editar Cliente"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => onDelete(client.id)}
                                                title="Excluir"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {clients.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs uppercase tracking-widest font-bold">
                                    Nenhum cliente/fornecedor cadastrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {whatsAppClient && (
                <WhatsAppQuickDialog
                    open={!!whatsAppClient}
                    onOpenChange={(open) => !open && setWhatsAppClient(null)}
                    clientName={whatsAppClient.name}
                    clientPhone={whatsAppClient.phone}
                    context="general"
                />
            )}
        </div>
    );
};

export default ClientTable;
