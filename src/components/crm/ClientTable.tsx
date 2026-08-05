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
import { Pencil, Trash2, History, FolderOpen } from "lucide-react";

interface ClientTableProps {
    clients: Client[];
    onEdit: (client: Client) => void;
    onDelete: (id: string) => void;
    onViewTimeline?: (client: Client) => void;
    onViewFiles?: (client: Client) => void;
}

const ClientTable = ({ clients, onEdit, onDelete, onViewTimeline, onViewFiles }: ClientTableProps) => {
    return (
        <div className="rounded-md border">
            <Table className="min-w-[650px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cidade/UF</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((client) => (
                        <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>{client.document}</TableCell>
                            <TableCell>{client.phone}</TableCell>
                            <TableCell>{client.email}</TableCell>
                            <TableCell>{client.city}/{client.state}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {onViewFiles && (
                                        <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" onClick={() => onViewFiles(client)} title="Arquivos e Fotos">
                                            <FolderOpen className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {onViewTimeline && (
                                        <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => onViewTimeline(client)} title="Ver Histórico 360º">
                                            <History className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => onDelete(client.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {clients.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                Nenhum cliente/fornecedor cadastrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default ClientTable;
