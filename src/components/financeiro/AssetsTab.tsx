import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Package } from "lucide-react";
import { Asset } from "@/types/asset";

interface AssetsTabProps {
    assets: Asset[];
    handleNewAsset: () => void;
    formatCurrency: (value: number) => string;
}

const AssetsTab = ({
    assets,
    handleNewAsset,
    formatCurrency,
}: AssetsTabProps) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-6 rounded-2xl border border-border/50 shadow-sm transition-all hover:bg-muted/30">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-lg shadow-primary/5">
                        <Package className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black tracking-tight text-primary uppercase tracking-widest">Controle Patrimonial</h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase opacity-70">Gestão de Ativos e Depreciação</p>
                    </div>
                </div>
                <Button onClick={handleNewAsset} size="lg" className="gap-2 shadow-xl shadow-primary/20 px-8 rounded-xl font-black uppercase tracking-widest text-xs transition-transform hover:scale-105">
                    <Plus className="h-4 w-4" />
                    Novo Patrimônio
                </Button>
            </div>

            <Card className="rounded-2xl border-none shadow-2xl overflow-hidden bg-card/40 backdrop-blur-md">
                <CardContent className="p-0">
                    <div className="overflow-x-auto min-h-[400px]">
                        <Table>
                            <TableHeader>
                                <tr className="bg-muted/50 border-b-2 border-primary/10 h-16">
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary px-6">Data de Aquisição</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary px-6">Nome do Bem</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-primary px-6">Valor de Aquisição</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] tracking-widest text-primary px-4">Vida Útil (Anos)</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-rose-500 px-6">Depreciação Anual</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-rose-500 px-6">Depreciação Mensal</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-primary px-6">Valor Contábil</TableHead>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                {assets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground h-48 italic text-sm">
                                            Nenhum patrimônio cadastrado no sistema.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    assets.map((asset) => {
                                        const annualDepreciation = asset.value / asset.usefulLife;
                                        const monthlyDepreciation = annualDepreciation / 12;
                                        // Simplistic accounting value based on age could be added here if age was known
                                        return (
                                            <TableRow key={asset.id} className="hover:bg-primary/[0.02] transition-colors border-b border-border/30 group">
                                                <TableCell className="px-6 py-5 font-bold text-xs uppercase tracking-tighter text-muted-foreground group-hover:text-foreground">
                                                    {new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell className="px-6 py-5 font-black text-sm uppercase text-foreground group-hover:text-primary transition-colors">
                                                    {asset.name}
                                                </TableCell>
                                                <TableCell className="px-6 py-5 text-right font-black text-sm text-foreground">
                                                    {formatCurrency(asset.value)}
                                                </TableCell>
                                                <TableCell className="px-4 py-5 text-center">
                                                    <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-black group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                        {asset.usefulLife} ANOS
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-5 text-right text-rose-500 font-bold text-xs tracking-tight">
                                                    -{formatCurrency(annualDepreciation)}
                                                </TableCell>
                                                <TableCell className="px-6 py-5 text-right text-rose-500/80 font-bold text-[10px]">
                                                    -{formatCurrency(monthlyDepreciation)}
                                                </TableCell>
                                                <TableCell className="px-6 py-5 text-right font-black text-sm text-primary bg-primary/5">
                                                    {formatCurrency(asset.value)}
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

            {/* Summary Footer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-500 p-6 flex flex-col gap-2 shadow-xl shadow-emerald-500/5 transition-transform hover:scale-[1.02]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Total em Ativos</span>
                    <span className="text-2xl font-black text-emerald-600">
                        {formatCurrency(assets.reduce((acc, a) => acc + a.value, 0))}
                    </span>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight mt-1 truncate">Investimento imobilizado total</p>
                </Card>

                <Card className="bg-rose-500/5 border-rose-500/20 border-l-4 border-l-rose-500 p-6 flex flex-col gap-2 shadow-xl shadow-rose-500/5 transition-transform hover:scale-[1.02]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600/70">Depreciação Acumulada (Anual)</span>
                    <span className="text-2xl font-black text-rose-600">
                        {formatCurrency(assets.reduce((acc, a) => acc + (a.value / a.usefulLife), 0))}
                    </span>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight mt-1 truncate">Custos de desgaste anual dos bens</p>
                </Card>

                <Card className="bg-primary/5 border-primary/20 border-l-4 border-l-primary p-6 flex flex-col gap-2 shadow-xl shadow-primary/5 transition-transform hover:scale-[1.02]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Patrimônio Líquido Estimado</span>
                    <span className="text-2xl font-black text-primary">
                        {formatCurrency(assets.reduce((acc, a) => acc + a.value, 0))}
                    </span>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight mt-1 truncate">Valor contábil atual de mercado</p>
                </Card>
            </div>
        </div>
    );
};

export default AssetsTab;
