import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Camera,
    Sparkles,
    Plus,
    Trash2,
    Ruler,
    CheckCircle2,
    AlertTriangle,
    Maximize2,
    Minimize2,
    Download,
    Send,
    FolderOpen,
    Save,
    Layers,
    Zap,
    Droplets,
    Snowflake,
    DoorOpen,
    Square,
    Crosshair,
    FileImage,
    ClipboardList,
    Calculator,
    User,
    MapPin,
    Phone,
    Pencil,
    RotateCcw,
    Loader2,
    Check,
    X,
    Eye,
    EyeOff,
} from "lucide-react";
import {
    analyzeWallPhotoForMeasurement,
    getSmartDefaultLinesForRoom,
    SmartDimensionLine,
    SmartRoomChecklistItem,
} from "@/services/geminiService";
import { parseOSAttachment, serializeOSAttachment, OSAttachmentItem } from "@/types/serviceOrder";

export type MeasurementMode = "orcamento" | "final";

export interface WallMeasurementData {
    id: string;
    name: string; // "Parede 1", "Parede 2", "Parede 3", "Parede 4"
    subtitle?: string; // Ex: "Guarda-Roupa", "Janela", "Porta", "Cabeceira"
    photoDataUrl?: string;
    architectFileUrl?: string;
    architectFileName?: string;
    widthCm?: string;
    heightCm?: string;
    depthCm?: string;
    lines: SmartDimensionLine[];
    notes: string;
    aiAnalyzed?: boolean;
}

export interface RoomMeasurementData {
    id: string;
    name: string; // Ex: "Quarto Casal", "Cozinha"
    roomType: string;
    mdfInternal?: string;
    mdfExternal?: string;
    hardwareNotes?: string;
    walls: WallMeasurementData[];
    checklist: SmartRoomChecklistItem[];
    carpentryAlerts: string[];
}

export interface TabletMeasurementProject {
    id: string;
    clientName: string;
    clientId?: string;
    clientPhone?: string;
    clientAddress?: string;
    serviceOrderId?: string;
    serviceOrderTicket?: string;
    measurementMode: MeasurementMode;
    architectName?: string;
    hasArchitectProject?: boolean;
    generalNotes?: string;
    updatedAt: string;
    rooms: RoomMeasurementData[];
}

const LOCAL_STORAGE_KEY = "bjl_tablet_measurements_v1";
const CLOUD_SETTINGS_KEY = "tablet_measurements_projects_v1";

const ROOM_PRESETS = [
    { label: "Quarto Casal", type: "Quarto" },
    { label: "Quarto Solteiro", type: "Quarto" },
    { label: "Closet", type: "Closet" },
    { label: "Cozinha", type: "Cozinha" },
    { label: "Banheiro", type: "Banheiro" },
    { label: "Sala / Painel TV", type: "Sala / Painel TV" },
    { label: "Área Gourmet", type: "Área Gourmet" },
    { label: "Escritório", type: "Escritório" },
    { label: "Lavanderia", type: "Lavanderia" },
];

const LINE_COLORS: Record<
    SmartDimensionLine["color"],
    {
        stroke: string;
        hex: string;
        badgeBg: string;
        badgeBorder: string;
        text: string;
        label: string;
    }
> = {
    amber: {
        stroke: "#f59e0b",
        hex: "#f59e0b",
        badgeBg: "bg-amber-950/90",
        badgeBorder: "border-amber-400/80",
        text: "text-amber-300",
        label: "Ouro / Principal",
    },
    cyan: {
        stroke: "#06b6d4",
        hex: "#06b6d4",
        badgeBg: "bg-cyan-950/90",
        badgeBorder: "border-cyan-400/80",
        text: "text-cyan-300",
        label: "Ciano / Aberturas",
    },
    emerald: {
        stroke: "#10b981",
        hex: "#10b981",
        badgeBg: "bg-emerald-950/90",
        badgeBorder: "border-emerald-400/80",
        text: "text-emerald-300",
        label: "Verde / Elétrica",
    },
    rose: {
        stroke: "#f43f5e",
        hex: "#f43f5e",
        badgeBg: "bg-rose-950/90",
        badgeBorder: "border-rose-400/80",
        text: "text-rose-300",
        label: "Alerta / Viga",
    },
    violet: {
        stroke: "#8b5cf6",
        hex: "#8b5cf6",
        badgeBg: "bg-violet-950/90",
        badgeBorder: "border-violet-400/80",
        text: "text-violet-300",
        label: "Roxo / Detalhe",
    },
};

function createDefaultWalls(
    roomType: string,
    mode: MeasurementMode
): WallMeasurementData[] {
    return [1, 2, 3, 4].map((num) => {
        const wallName = `Parede ${num}`;
        const defaults = getSmartDefaultLinesForRoom(roomType, wallName, mode);
        return {
            id: `wall-${num}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: wallName,
            subtitle: "",
            photoDataUrl: undefined,
            widthCm: "",
            heightCm: "",
            depthCm: "60",
            lines: defaults.lines,
            notes: "",
            aiAnalyzed: false,
        };
    });
}

function createDefaultRoom(
    name: string,
    roomType: string,
    mode: MeasurementMode
): RoomMeasurementData {
    const defaults = getSmartDefaultLinesForRoom(roomType, "Parede 1", mode);
    return {
        id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        roomType,
        mdfInternal: "Branco TX 15mm",
        mdfExternal: "",
        hardwareNotes: "Dobradiças c/ amortecedor + Corrediças telescópicas",
        walls: createDefaultWalls(roomType, mode),
        checklist: defaults.checklist,
        carpentryAlerts: defaults.carpentryAlerts,
    };
}

function createInitialProject(): TabletMeasurementProject {
    const mode: MeasurementMode = "orcamento";
    return {
        id: `proj-${Date.now()}`,
        clientName: "",
        clientPhone: "",
        clientAddress: "",
        measurementMode: mode,
        hasArchitectProject: false,
        architectName: "",
        generalNotes: "",
        updatedAt: new Date().toISOString(),
        rooms: [createDefaultRoom("Quarto Casal", "Quarto", mode)],
    };
}

/**
 * Redimensiona/comprime a foto tirada no tablet para manter alta nitidez
 * sem estourar a memória local ou o tempo de envio para a IA.
 */
async function compressImageFile(file: File, maxDim = 1600): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const resultStr = reader.result as string;
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(resultStr);
                    return;
                }
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.84));
            };
            img.onerror = () => resolve(resultStr);
            img.src = resultStr;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

const MedicaoTablet: React.FC = () => {
    const navigate = useNavigate();

    // Lista de medições salvas
    const [savedProjects, setSavedProjects] = useState<TabletMeasurementProject[]>(() => {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {
            // ignore
        }
        return [createInitialProject()];
    });

    const [activeProjectId, setActiveProjectId] = useState<string>(
        () => savedProjects[0]?.id || ""
    );

    const activeProject = useMemo(() => {
        return (
            savedProjects.find((p) => p.id === activeProjectId) ||
            savedProjects[0] ||
            createInitialProject()
        );
    }, [savedProjects, activeProjectId]);

    const [activeRoomId, setActiveRoomId] = useState<string>(
        () => activeProject.rooms[0]?.id || ""
    );
    const [activeWallId, setActiveWallId] = useState<string>(
        () => activeProject.rooms[0]?.walls[0]?.id || ""
    );

    // Garante que activeRoom e activeWall sempre existam ao trocar de projeto/ambiente
    const activeRoom = useMemo(() => {
        return (
            activeProject.rooms.find((r) => r.id === activeRoomId) ||
            activeProject.rooms[0]
        );
    }, [activeProject, activeRoomId]);

    const activeWall = useMemo(() => {
        if (!activeRoom) return null;
        return (
            activeRoom.walls.find((w) => w.id === activeWallId) ||
            activeRoom.walls[0] ||
            null
        );
    }, [activeRoom, activeWallId]);

    useEffect(() => {
        if (activeRoom && !activeRoom.walls.some((w) => w.id === activeWallId)) {
            setActiveWallId(activeRoom.walls[0]?.id || "");
        }
    }, [activeRoom, activeWallId]);

    // Clientes e Ordens de Serviço do banco
    const [clients, setClients] = useState<any[]>([]);
    const [serviceOrders, setServiceOrders] = useState<any[]>([]);

    // Estados de UI do Tablet
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [isSavingAction, setIsSavingAction] = useState(false);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [isDrawingNewLine, setIsDrawingNewLine] = useState(false);
    const [isAddingPinMode, setIsAddingPinMode] = useState<{
        active: boolean;
        label: string;
        color: SmartDimensionLine["color"];
    } | null>(null);
    const [showLinesOverlay, setShowLinesOverlay] = useState(true);

    // Modais auxiliares
    const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomType, setNewRoomType] = useState("Quarto");
    const [isProjectsDrawerOpen, setIsProjectsDrawerOpen] = useState(false);

    // Refs para câmera, upload e canvas interativo
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);
    const architectInputRef = useRef<HTMLInputElement | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement | null>(null);

    // Estado de arraste (drag) de linha ou ponta no tablet
    const [dragState, setDragState] = useState<{
        lineId: string;
        target: "p1" | "p2" | "whole";
        startX: number;
        startY: number;
        origX1: number;
        origY1: number;
        origX2: number;
        origY2: number;
    } | null>(null);

    // Estado de desenho livre com o dedo na foto
    const [drawingTempLine, setDrawingTempLine] = useState<{
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | null>(null);

    // Carrega clientes, OSs e backup da nuvem ao abrir
    useEffect(() => {
        const loadDatabaseContext = async () => {
            try {
                const [clientsRes, osRes, cloudRes] = await Promise.all([
                    supabase
                        .from("clients")
                        .select("id, name, phone, address, city")
                        .order("name"),
                    supabase
                        .from("service_orders")
                        .select("id, ticket_number, client, action, status, attachments, notes")
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("api_settings")
                        .select("key_value")
                        .eq("key_name", CLOUD_SETTINGS_KEY)
                        .maybeSingle(),
                ]);

                if (clientsRes.data) setClients(clientsRes.data);
                if (osRes.data) setServiceOrders(osRes.data);

                if (cloudRes.data?.key_value) {
                    try {
                        const cloudProjects = JSON.parse(
                            cloudRes.data.key_value
                        ) as TabletMeasurementProject[];
                        if (Array.isArray(cloudProjects) && cloudProjects.length > 0) {
                            setSavedProjects((localPrev) => {
                                const hasLocalEdits = localPrev.some(
                                    (p) => p.clientName.trim().length > 0
                                );
                                if (hasLocalEdits && localPrev.length >= cloudProjects.length) {
                                    return localPrev;
                                }
                                localStorage.setItem(
                                    LOCAL_STORAGE_KEY,
                                    JSON.stringify(cloudProjects)
                                );
                                return cloudProjects;
                            });
                        }
                    } catch {
                        // ignore
                    }
                }
            } catch (err) {
                console.warn("Aviso ao carregar dados iniciais na Medição Tablet:", err);
            }
        };
        loadDatabaseContext();
    }, []);

    // Salva automaticamente no localStorage sempre que o projeto mudar
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedProjects));
        } catch (err) {
            console.warn("Aviso ao salvar medição no armazenamento local:", err);
        }
    }, [savedProjects]);

    const syncToCloud = useCallback(async (projectsToSync?: TabletMeasurementProject[]) => {
        const list = projectsToSync || savedProjects;
        try {
            // Para não exceder limite de payload em api_settings, mantém metadados e linhas na nuvem
            const compactForCloud = list.slice(0, 25).map((p) => ({
                ...p,
                rooms: p.rooms.map((r) => ({
                    ...r,
                    walls: r.walls.map((w) => ({
                        ...w,
                        // Mantém foto se for compacta ou URL pública
                        photoDataUrl:
                            w.photoDataUrl && w.photoDataUrl.length < 350000
                                ? w.photoDataUrl
                                : undefined,
                    })),
                })),
            }));

            await supabase.from("api_settings").upsert(
                [
                    {
                        key_name: CLOUD_SETTINGS_KEY,
                        key_value: JSON.stringify(compactForCloud),
                        description: "Projetos de Medição Inteligente no Tablet",
                        updated_at: new Date().toISOString(),
                    },
                ],
                { onConflict: "key_name" }
            );
        } catch (err) {
            console.warn("Sincronização em nuvem silenciosa:", err);
        }
    }, [savedProjects]);

    // Helpers de atualização imutável do projeto ativo
    const updateActiveProject = useCallback(
        (updater: (proj: TabletMeasurementProject) => TabletMeasurementProject) => {
            setSavedProjects((prev) =>
                prev.map((p) => {
                    if (p.id !== activeProject.id) return p;
                    const updated = updater(p);
                    return { ...updated, updatedAt: new Date().toISOString() };
                })
            );
        },
        [activeProject.id]
    );

    const updateActiveRoom = useCallback(
        (updater: (room: RoomMeasurementData) => RoomMeasurementData) => {
            if (!activeRoom) return;
            updateActiveProject((proj) => ({
                ...proj,
                rooms: proj.rooms.map((r) =>
                    r.id === activeRoom.id ? updater(r) : r
                ),
            }));
        },
        [activeRoom, updateActiveProject]
    );

    const updateActiveWall = useCallback(
        (updater: (wall: WallMeasurementData) => WallMeasurementData) => {
            if (!activeWall) return;
            updateActiveRoom((room) => ({
                ...room,
                walls: room.walls.map((w) =>
                    w.id === activeWall.id ? updater(w) : w
                ),
            }));
        },
        [activeWall, updateActiveRoom]
    );

    // Sincroniza "Largura Total" e "Pé-Direito" entre os campos rápidos e as linhas da foto
    const updateLineValue = (lineId: string, newValue: string) => {
        if (!activeWall) return;
        updateActiveWall((wall) => {
            const nextLines = wall.lines.map((l) =>
                l.id === lineId ? { ...l, value: newValue } : l
            );
            const targetLine = nextLines.find((l) => l.id === lineId);
            let nextWidth = wall.widthCm;
            let nextHeight = wall.heightCm;

            if (targetLine) {
                const lbl = targetLine.label.toLowerCase();
                if (lbl.includes("largura total")) nextWidth = newValue;
                if (lbl.includes("pé-direito") || lbl.includes("pe-direito"))
                    nextHeight = newValue;
            }

            return {
                ...wall,
                lines: nextLines,
                widthCm: nextWidth,
                heightCm: nextHeight,
            };
        });
    };

    const updateLineLabel = (lineId: string, newLabel: string) => {
        updateActiveWall((wall) => ({
            ...wall,
            lines: wall.lines.map((l) =>
                l.id === lineId ? { ...l, label: newLabel } : l
            ),
        }));
    };

    const updateLineColor = (
        lineId: string,
        newColor: SmartDimensionLine["color"]
    ) => {
        updateActiveWall((wall) => ({
            ...wall,
            lines: wall.lines.map((l) =>
                l.id === lineId ? { ...l, color: newColor } : l
            ),
        }));
    };

    const deleteLine = (lineId: string) => {
        updateActiveWall((wall) => ({
            ...wall,
            lines: wall.lines.filter((l) => l.id !== lineId),
        }));
        if (selectedLineId === lineId) {
            setSelectedLineId(null);
        }
        toast.info("Linha de medida removida.");
    };

    const addPresetLineOrPin = (preset: {
        kind: "line" | "pin";
        label: string;
        color: SmartDimensionLine["color"];
        horizontal?: boolean;
        notes?: string;
    }) => {
        if (!activeWall) return;
        if (preset.kind === "pin") {
            setIsAddingPinMode({
                active: true,
                label: preset.label,
                color: preset.color,
            });
            setIsDrawingNewLine(false);
            toast.info(
                `Toque na foto exatamente onde fica "${preset.label}" para fixar o ponto!`
            );
            return;
        }

        const offset = (activeWall.lines.length % 5) * 6;
        const newLine: SmartDimensionLine = {
            id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kind: "line",
            label: preset.label,
            value: "",
            unit: "cm",
            x1: preset.horizontal !== false ? 20 : 35 + offset,
            y1: preset.horizontal !== false ? 35 + offset : 20,
            x2: preset.horizontal !== false ? 80 : 35 + offset,
            y2: preset.horizontal !== false ? 35 + offset : 82,
            color: preset.color,
            notes: preset.notes,
            required: true,
        };

        updateActiveWall((wall) => ({
            ...wall,
            lines: [...wall.lines, newLine],
        }));
        setSelectedLineId(newLine.id);
        toast.success(`Linha "${preset.label}" inserida! Arraste as pontas na foto.`);
    };

    // Analisar Foto da Parede com IA (Gemini 2.5 Flash Vision)
    const handleRunAIAnalysis = async (customPhotoDataUrl?: string) => {
        if (!activeRoom || !activeWall) return;
        const photoToAnalyze = customPhotoDataUrl || activeWall.photoDataUrl;
        if (!photoToAnalyze) {
            toast.error("Tire ou selecione uma foto desta parede primeiro.");
            return;
        }

        setIsAnalyzingAI(true);
        try {
            const analysis = await analyzeWallPhotoForMeasurement({
                base64DataUrl: photoToAnalyze,
                roomType: activeRoom.roomType,
                wallName: `${activeWall.name}${activeWall.subtitle ? ` (${activeWall.subtitle})` : ""}`,
                measurementMode: activeProject.measurementMode,
                architectNotes: activeProject.generalNotes || activeWall.notes,
            });

            // Preserva medidas já digitadas pelo marceneiro caso o nome coincida
            updateActiveWall((wall) => {
                const existingValuesByLabel = new Map<string, string>();
                wall.lines.forEach((l) => {
                    if (l.value.trim()) {
                        existingValuesByLabel.set(l.label.toLowerCase(), l.value);
                    }
                });

                const mergedLines = analysis.lines.map((aiLine) => ({
                    ...aiLine,
                    value:
                        existingValuesByLabel.get(aiLine.label.toLowerCase()) ||
                        aiLine.value ||
                        "",
                }));

                return {
                    ...wall,
                    lines: mergedLines,
                    aiAnalyzed: true,
                };
            });

            updateActiveRoom((room) => ({
                ...room,
                checklist:
                    analysis.checklist.length > 0
                        ? analysis.checklist
                        : room.checklist,
                carpentryAlerts:
                    analysis.carpentryAlerts.length > 0
                        ? analysis.carpentryAlerts
                        : room.carpentryAlerts,
            }));

            toast.success(
                `IA identificou ${analysis.lines.length} medidas necessárias nesta foto!`
            );
        } catch (err) {
            console.error("Erro na análise IA da parede:", err);
            toast.error("Não foi possível analisar com a IA agora. Linhas padrão aplicadas.");
        } finally {
            setIsAnalyzingAI(false);
        }
    };

    // Captura de Foto da Parede (Câmera do Tablet ou Galeria)
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeWall || !activeRoom) return;

        try {
            toast.info("Processando foto da parede e preparando linhas de medida...");
            const compressedDataUrl = await compressImageFile(file, 1600);

            updateActiveWall((wall) => ({
                ...wall,
                photoDataUrl: compressedDataUrl,
            }));

            // Já roda a análise inteligente da foto automaticamente!
            await handleRunAIAnalysis(compressedDataUrl);
        } catch (err) {
            console.error("Erro ao carregar foto:", err);
            toast.error("Erro ao processar a foto selecionada.");
        } finally {
            e.target.value = "";
        }
    };

    // Upload de imagem do Projeto do Arquiteto
    const handleArchitectFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file || !activeWall) return;
        try {
            const dataUrl = await compressImageFile(file, 1600);
            updateActiveWall((wall) => ({
                ...wall,
                architectFileUrl: dataUrl,
                architectFileName: file.name,
            }));
            updateActiveProject((p) => ({ ...p, hasArchitectProject: true }));
            toast.success("Planta / Projeto do Arquiteto anexado a esta parede!");
        } catch {
            toast.error("Erro ao anexar arquivo do arquiteto.");
        } finally {
            e.target.value = "";
        }
    };

    // Conversão de evento de toque/mouse em coordenadas percentuais (0 a 100%)
    const getRelativeCoords = (clientX: number, clientY: number) => {
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            return { x: 50, y: 50 };
        }
        const x = Math.max(
            3,
            Math.min(97, Math.round(((clientX - rect.left) / rect.width) * 1000) / 10)
        );
        const y = Math.max(
            3,
            Math.min(97, Math.round(((clientY - rect.top) / rect.height) * 1000) / 10)
        );
        return { x, y };
    };

    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!activeWall) return;

        // Se estiver no modo de fixar um pino (Tomada / Água / Ar)
        if (isAddingPinMode?.active) {
            const { x, y } = getRelativeCoords(e.clientX, e.clientY);
            const newPin: SmartDimensionLine = {
                id: `pin-${Date.now()}`,
                kind: "pin",
                label: isAddingPinMode.label,
                value: "",
                unit: "cm",
                x1: x,
                y1: y,
                x2: x,
                y2: y,
                color: isAddingPinMode.color,
                required: true,
            };
            updateActiveWall((wall) => ({
                ...wall,
                lines: [...wall.lines, newPin],
            }));
            setSelectedLineId(newPin.id);
            setIsAddingPinMode(null);
            toast.success(`Ponto "${newPin.label}" fixado! Digite a medida.`);
            return;
        }

        // Se estiver no modo de desenhar uma nova linha com o dedo na foto
        if (isDrawingNewLine) {
            const { x, y } = getRelativeCoords(e.clientX, e.clientY);
            setDrawingTempLine({ x1: x, y1: y, x2: x, y2: y });
            e.currentTarget.setPointerCapture(e.pointerId);
        }
    };

    const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (drawingTempLine) {
            const { x, y } = getRelativeCoords(e.clientX, e.clientY);
            setDrawingTempLine((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
            return;
        }

        if (dragState) {
            const { x, y } = getRelativeCoords(e.clientX, e.clientY);
            const dx = x - dragState.startX;
            const dy = y - dragState.startY;
            const clampCoord = (v: number) =>
                Math.max(3, Math.min(97, Math.round(v * 10) / 10));

            updateActiveWall((wall) => ({
                ...wall,
                lines: wall.lines.map((l) => {
                    if (l.id !== dragState.lineId) return l;
                    if (l.kind === "pin") {
                        const nx = clampCoord(dragState.origX1 + dx);
                        const ny = clampCoord(dragState.origY1 + dy);
                        return { ...l, x1: nx, y1: ny, x2: nx, y2: ny };
                    }
                    if (dragState.target === "p1") {
                        return {
                            ...l,
                            x1: clampCoord(dragState.origX1 + dx),
                            y1: clampCoord(dragState.origY1 + dy),
                        };
                    }
                    if (dragState.target === "p2") {
                        return {
                            ...l,
                            x2: clampCoord(dragState.origX2 + dx),
                            y2: clampCoord(dragState.origY2 + dy),
                        };
                    }
                    // whole line
                    return {
                        ...l,
                        x1: clampCoord(dragState.origX1 + dx),
                        y1: clampCoord(dragState.origY1 + dy),
                        x2: clampCoord(dragState.origX2 + dx),
                        y2: clampCoord(dragState.origY2 + dy),
                    };
                }),
            }));
        }
    };

    const handleCanvasPointerUp = () => {
        if (drawingTempLine) {
            const dist = Math.hypot(
                drawingTempLine.x2 - drawingTempLine.x1,
                drawingTempLine.y2 - drawingTempLine.y1
            );
            const finalX2 =
                dist < 5
                    ? Math.min(92, drawingTempLine.x1 + 30)
                    : drawingTempLine.x2;
            const finalY2 = dist < 5 ? drawingTempLine.y1 : drawingTempLine.y2;

            const newLine: SmartDimensionLine = {
                id: `ln-${Date.now()}`,
                kind: "line",
                label: `Medida ${(activeWall?.lines.length || 0) + 1}`,
                value: "",
                unit: "cm",
                x1: drawingTempLine.x1,
                y1: drawingTempLine.y1,
                x2: finalX2,
                y2: finalY2,
                color: "amber",
                required: true,
            };

            updateActiveWall((wall) => ({
                ...wall,
                lines: [...wall.lines, newLine],
            }));
            setSelectedLineId(newLine.id);
            setDrawingTempLine(null);
            setIsDrawingNewLine(false);
            toast.success("Nova linha criada! Digite o nome e a medida.");
        }

        if (dragState) {
            setDragState(null);
        }
    };

    const startLineDrag = (
        e: React.PointerEvent,
        line: SmartDimensionLine,
        target: "p1" | "p2" | "whole"
    ) => {
        e.stopPropagation();
        const { x, y } = getRelativeCoords(e.clientX, e.clientY);
        setSelectedLineId(line.id);
        setDragState({
            lineId: line.id,
            target,
            startX: x,
            startY: y,
            origX1: line.x1,
            origY1: line.y1,
            origX2: line.x2,
            origY2: line.y2,
        });
    };

    // Adicionar novo Ambiente (já nasce com Parede 1, Parede 2, Parede 3, Parede 4)
    const handleAddRoom = (presetName?: string, presetType?: string) => {
        const nameToUse = (presetName || newRoomName).trim();
        const typeToUse = presetType || newRoomType || "Quarto";
        if (!nameToUse) {
            toast.error("Informe o nome do ambiente.");
            return;
        }

        const newRoom = createDefaultRoom(
            nameToUse,
            typeToUse,
            activeProject.measurementMode
        );
        updateActiveProject((proj) => ({
            ...proj,
            rooms: [...proj.rooms, newRoom],
        }));
        setActiveRoomId(newRoom.id);
        setActiveWallId(newRoom.walls[0].id);
        setNewRoomName("");
        setIsNewRoomModalOpen(false);
        toast.success(
            `Ambiente "${nameToUse}" criado com Parede 1, Parede 2, Parede 3 e Parede 4!`
        );
    };

    const handleDeleteRoom = (roomId: string) => {
        if (activeProject.rooms.length <= 1) {
            toast.error("O projeto precisa ter pelo menos 1 ambiente.");
            return;
        }
        const target = activeProject.rooms.find((r) => r.id === roomId);
        if (
            !window.confirm(
                `Remover o ambiente "${target?.name}" e suas 4 paredes?`
            )
        )
            return;

        const remaining = activeProject.rooms.filter((r) => r.id !== roomId);
        updateActiveProject((proj) => ({
            ...proj,
            rooms: remaining,
        }));
        setActiveRoomId(remaining[0].id);
        setActiveWallId(remaining[0].walls[0]?.id || "");
    };

    // Adicionar mais uma parede dentro do ambiente atual (ex: Parede 5 / Ilha)
    const handleAddExtraWall = () => {
        if (!activeRoom) return;
        const nextNum = activeRoom.walls.length + 1;
        const wallName = `Parede ${nextNum}`;
        const defaults = getSmartDefaultLinesForRoom(
            activeRoom.roomType,
            wallName,
            activeProject.measurementMode
        );
        const newWall: WallMeasurementData = {
            id: `wall-${nextNum}-${Date.now()}`,
            name: wallName,
            subtitle: "",
            widthCm: "",
            heightCm: "",
            depthCm: "60",
            lines: defaults.lines,
            notes: "",
        };
        updateActiveRoom((room) => ({
            ...room,
            walls: [...room.walls, newWall],
        }));
        setActiveWallId(newWall.id);
        toast.success(`${wallName} adicionada em ${activeRoom.name}!`);
    };

    // Criar nova ficha de medição para outro cliente
    const handleCreateNewProject = () => {
        const fresh = createInitialProject();
        setSavedProjects((prev) => [fresh, ...prev]);
        setActiveProjectId(fresh.id);
        setActiveRoomId(fresh.rooms[0].id);
        setActiveWallId(fresh.rooms[0].walls[0].id);
        toast.success("Nova ficha de medição iniciada!");
    };

    /**
     * Renderiza em um <canvas> HTML5 a Foto da Parede + todas as Linhas de Cota + Setas + Caixinhas [ cm ]
     * para salvar na Ordem de Serviço ou baixar no Tablet!
     */
    const renderStampedWallImage = async (
        wall: WallMeasurementData,
        roomName: string
    ): Promise<Blob | null> => {
        const canvas = document.createElement("canvas");
        const width = 1400;
        const height = 950;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // Fundo escuro elegante caso não tenha foto ou enquanto desenha
        ctx.fillStyle = "#0b0f19";
        ctx.fillRect(0, 0, width, height);

        if (wall.photoDataUrl) {
            await new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = wall.photoDataUrl!;
            });
        } else {
            // Grade técnica se não tirou foto
            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            ctx.lineWidth = 1;
            for (let gx = 0; gx < width; gx += 50) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, height);
                ctx.stroke();
            }
            for (let gy = 0; gy < height; gy += 50) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(width, gy);
                ctx.stroke();
            }
        }

        // Cabeçalho carimbado no topo da imagem
        ctx.fillStyle = "rgba(9, 13, 22, 0.85)";
        ctx.fillRect(0, 0, width, 64);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 22px sans-serif";
        const modeTxt =
            activeProject.measurementMode === "final"
                ? "MEDIDA FINAL EXECUTIVA"
                : "MEDIDA PARA ORÇAMENTO";
        ctx.fillText(
            `BJL PLANEJADOS • ${activeProject.clientName || "CLIENTE"} • ${roomName.toUpperCase()} - ${wall.name.toUpperCase()}${wall.subtitle ? ` (${wall.subtitle.toUpperCase()})` : ""} [${modeTxt}]`,
            24,
            40
        );

        // Desenha cada linha de cota e pino
        for (const ln of wall.lines) {
            const spec = LINE_COLORS[ln.color] || LINE_COLORS.amber;
            const x1 = (ln.x1 / 100) * width;
            const y1 = (ln.y1 / 100) * height;
            const x2 = (ln.x2 / 100) * width;
            const y2 = (ln.y2 / 100) * height;

            if (ln.kind === "line") {
                ctx.save();
                ctx.strokeStyle = spec.hex;
                ctx.lineWidth = 4;
                ctx.shadowColor = "rgba(0,0,0,0.8)";
                ctx.shadowBlur = 8;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // Pontas das cotas
                ctx.fillStyle = spec.hex;
                ctx.beginPath();
                ctx.arc(x1, y1, 8, 0, Math.PI * 2);
                ctx.arc(x2, y2, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Pino de ponto
                ctx.save();
                ctx.fillStyle = spec.hex;
                ctx.beginPath();
                ctx.arc(x1, y1, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.restore();
            }

            // Caixa de texto da medida
            const mx = ln.kind === "pin" ? x1 : (x1 + x2) / 2;
            const my = ln.kind === "pin" ? y1 - 28 : (y1 + y2) / 2;
            const valText = ln.value?.trim()
                ? `${ln.value} ${ln.unit}`
                : "___ cm";
            const badgeText = `${ln.label}: [ ${valText} ]`;

            ctx.save();
            ctx.font = "bold 18px sans-serif";
            const textWidth = ctx.measureText(badgeText).width;
            const boxW = textWidth + 28;
            const boxH = 38;
            const boxX = Math.max(10, Math.min(width - boxW - 10, mx - boxW / 2));
            const boxY = Math.max(70, Math.min(height - boxH - 10, my - boxH / 2));

            ctx.fillStyle = "rgba(10, 14, 23, 0.92)";
            ctx.strokeStyle = spec.hex;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.fillText(badgeText, boxX + 14, boxY + 25);
            ctx.restore();
        }

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
        });
    };

    // Baixar foto carimbada da parede atual no Tablet
    const handleDownloadStampedPhoto = async () => {
        if (!activeWall || !activeRoom) return;
        const blob = await renderStampedWallImage(activeWall, activeRoom.name);
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Medicao_${(activeProject.clientName || "Cliente").replace(/\s+/g, "_")}_${activeRoom.name}_${activeWall.name}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Foto carimbada com as medidas baixada!");
    };

    // Monta resumo textual estruturado de todas as paredes de um ambiente
    const buildRoomMeasurementsSummary = (room: RoomMeasurementData): string => {
        const wallSummaries = room.walls
            .map((w) => {
                const filledLines = w.lines.filter((l) => l.value.trim().length > 0);
                const mainDims = [
                    w.widthCm ? `Larg: ${w.widthCm}cm` : "",
                    w.heightCm ? `Alt/PD: ${w.heightCm}cm` : "",
                    w.depthCm ? `Prof: ${w.depthCm}cm` : "",
                ]
                    .filter(Boolean)
                    .join(" x ");

                const linesTxt = filledLines
                    .map((l) => `${l.label}: ${l.value}${l.unit}`)
                    .join(" | ");

                if (!mainDims && !linesTxt && !w.notes && !w.photoDataUrl) {
                    return null;
                }
                return `[${w.name}${w.subtitle ? ` - ${w.subtitle}` : ""}] ${mainDims ? `${mainDims} • ` : ""}${linesTxt}${w.notes ? ` (Obs: ${w.notes})` : ""}`;
            })
            .filter(Boolean);

        return wallSummaries.join(" // ");
    };

    // 1. SALVAR NA ORDEM DE SERVIÇO (Cria ou Atualiza OS com Fotos Carimbadas + Medidas das Paredes 1..4)
    const handleSaveToServiceOrder = async () => {
        if (!activeProject.clientName.trim()) {
            toast.error("Informe ou selecione o nome do cliente no topo primeiro.");
            return;
        }

        setIsSavingAction(true);
        try {
            await syncToCloud();

            let targetOS = serviceOrders.find(
                (o) =>
                    o.id === activeProject.serviceOrderId ||
                    (o.client || "").trim().toLowerCase() ===
                        activeProject.clientName.trim().toLowerCase()
            );

            // Se não existir OS para este cliente, cria automaticamente!
            if (!targetOS) {
                const nextNum = Math.max(16, serviceOrders.length + 16);
                const ticketNumber = `OS-${String(nextNum).padStart(3, "0")}`;
                const roomNames = activeProject.rooms.map((r) => r.name).join(" + ");

                const { data: createdOS, error: createErr } = await supabase
                    .from("service_orders")
                    .insert([
                        {
                            ticket_number: ticketNumber,
                            open_date: new Date().toISOString().split("T")[0],
                            client: activeProject.clientName.trim(),
                            client_id: activeProject.clientId || null,
                            type: "Fabricação",
                            action: `${roomNames} (${activeProject.measurementMode === "final" ? "Medida Final" : "Medição Tablet"})`,
                            status: "Plano de corte",
                            forecast_date: new Date(
                                Date.now() + 30 * 24 * 60 * 60 * 1000
                            )
                                .toISOString()
                                .split("T")[0],
                            notes: "",
                            attachments: [],
                        },
                    ])
                    .select()
                    .single();

                if (createErr) throw createErr;
                targetOS = createdOS;
                setServiceOrders((prev) => [createdOS, ...prev]);
                updateActiveProject((p) => ({
                    ...p,
                    serviceOrderId: createdOS.id,
                    serviceOrderTicket: createdOS.ticket_number,
                }));
            }

            const existingAttachments: string[] = Array.isArray(
                targetOS.attachments
            )
                ? [...targetOS.attachments]
                : [];

            // Para cada ambiente e parede que tenha foto ou medidas preenchidas, gera a foto carimbada e anexa na OS
            for (const room of activeProject.rooms) {
                for (const wall of room.walls) {
                    const hasFilledLines = wall.lines.some(
                        (l) => l.value.trim().length > 0
                    );
                    if (!wall.photoDataUrl && !hasFilledLines) continue;

                    const blob = await renderStampedWallImage(wall, room.name);
                    if (!blob) continue;

                    let publicUrl = wall.photoDataUrl || "";
                    const fileName = `${targetOS.ticket_number || "os"}_${room.name.replace(/\s+/g, "_")}_${wall.name.replace(/\s+/g, "_")}_${Date.now()}.jpg`;
                    const filePath = `service_orders/${fileName}`;

                    const { error: upErr } = await supabase.storage
                        .from("attachments")
                        .upload(filePath, blob, { contentType: "image/jpeg" });

                    if (!upErr) {
                        const { data: urlData } = supabase.storage
                            .from("attachments")
                            .getPublicUrl(filePath);
                        if (urlData?.publicUrl) {
                            publicUrl = urlData.publicUrl;
                        }
                    }

                    const wallMeasuresText = wall.lines
                        .filter((l) => l.value.trim())
                        .map((l) => `${l.label}: ${l.value}${l.unit}`)
                        .join(" • ");

                    const newItem: OSAttachmentItem = {
                        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        url: publicUrl,
                        title: `${room.name} — ${wall.name}${wall.subtitle ? ` (${wall.subtitle})` : ""} [${activeProject.measurementMode === "final" ? "Medida Final" : "Orçamento"}]`,
                        measurements:
                            wallMeasuresText ||
                            `${wall.widthCm || "?"}x${wall.heightCm || "?"}cm`,
                        tag: "Medições / Croqui",
                        createdAt: new Date().toISOString(),
                    };

                    existingAttachments.push(serializeOSAttachment(newItem));
                }
            }

            // Monta o memorial descritivo completo para as observações da OS
            const technicalReport = activeProject.rooms
                .map((r) => {
                    const summary = buildRoomMeasurementsSummary(r);
                    const mdfInfo = [
                        r.mdfInternal ? `Int: ${r.mdfInternal}` : "",
                        r.mdfExternal ? `Ext: ${r.mdfExternal}` : "",
                        r.hardwareNotes ? `Ferragens: ${r.hardwareNotes}` : "",
                    ]
                        .filter(Boolean)
                        .join(" | ");
                    return `📐 ${r.name.toUpperCase()} (${activeProject.measurementMode === "final" ? "MEDIDA FINAL" : "MEDIDA ORÇAMENTO"}):\n${mdfInfo ? `• Acabamento: ${mdfInfo}\n` : ""}${summary ? `• Paredes: ${summary}` : ""}`;
                })
                .join("\n\n");

            const updatedNotes = [targetOS.notes || "", technicalReport]
                .filter(Boolean)
                .join("\n\n---\n");

            const { error: updErr } = await supabase
                .from("service_orders")
                .update({
                    attachments: existingAttachments,
                    notes: updatedNotes,
                })
                .eq("id", targetOS.id);

            if (updErr) throw updErr;

            toast.success(
                `Medição e fotos carimbadas salvas na ${targetOS.ticket_number} (${targetOS.client})!`
            );
        } catch (err: any) {
            console.error("Erro ao salvar na OS:", err);
            toast.error(
                `Erro ao salvar na OS: ${err?.message || "Verifique a conexão"}`
            );
        } finally {
            setIsSavingAction(false);
        }
    };

    // 2. ENVIAR PARA ORÇAMENTOS (Cria orçamento em budgets com todos os ambientes e medidas das Paredes 1..4)
    const handleSendToBudget = async () => {
        if (!activeProject.clientName.trim()) {
            toast.error("Informe ou selecione o nome do cliente no topo primeiro.");
            return;
        }

        setIsSavingAction(true);
        try {
            await syncToCloud();

            const ambientesPayload = activeProject.rooms.map((r, idx) => {
                const summary = buildRoomMeasurementsSummary(r);
                return {
                    id: `amb-${Date.now()}-${idx}`,
                    description: `${r.name}${summary ? ` — ${summary}` : ""}`,
                    cashValue: 0,
                    installment10x: 0,
                    installment21x: 0,
                };
            });

            const fullNotes = [
                `[MEDIÇÃO INTELIGENTE TABLET - ${activeProject.measurementMode === "final" ? "MEDIDA FINAL EXECUTIVA" : "MEDIDA PARA ORÇAMENTO"}]`,
                activeProject.hasArchitectProject
                    ? `Arquiteto / Projeto: ${activeProject.architectName || "Confirmado c/ Projeto"}`
                    : "",
                ...activeProject.rooms.map(
                    (r) =>
                        `• ${r.name}: ${buildRoomMeasurementsSummary(r) || "Medidas em andamento"} (MDF Int: ${r.mdfInternal || "Branco TX"} | Ext: ${r.mdfExternal || "A definir"})`
                ),
                `<!--BJL_AMBIENTES:${JSON.stringify(ambientesPayload)}-->`,
            ]
                .filter(Boolean)
                .join("\n");

            const projectName = activeProject.rooms
                .map((r) => r.name)
                .join(" + ");

            const { error } = await supabase.from("budgets").insert([
                {
                    client_name: activeProject.clientName.trim(),
                    project_name: `${projectName} (${activeProject.measurementMode === "final" ? "Medida Final" : "Medição"})`,
                    status: "rascunho",
                    total_value: 0,
                    cash_value: 0,
                    installment_10x: 0,
                    installment_21x: 0,
                    days_estimated: Math.max(3, activeProject.rooms.length * 4),
                    notes: fullNotes,
                },
            ]);

            if (error) throw error;

            toast.success(
                `Medição de ${activeProject.clientName} enviada para Orçamentos!`
            );
            navigate("/admin/orcamento");
        } catch (err: any) {
            console.error("Erro ao enviar para Orçamentos:", err);
            toast.error(
                `Erro ao criar orçamento: ${err?.message || "Erro desconhecido"}`
            );
        } finally {
            setIsSavingAction(false);
        }
    };

    const selectedLine = useMemo(() => {
        if (!activeWall || !selectedLineId) return null;
        return activeWall.lines.find((l) => l.id === selectedLineId) || null;
    }, [activeWall, selectedLineId]);

    const filledLinesCount = useMemo(() => {
        if (!activeWall) return 0;
        return activeWall.lines.filter((l) => l.value.trim().length > 0).length;
    }, [activeWall]);

    return (
        <div
            className={cn(
                "flex flex-col gap-4 transition-all",
                isFullscreen
                    ? "fixed inset-0 z-[100] bg-[#06080f] p-3 sm:p-5 overflow-y-auto"
                    : "w-full pb-12"
            )}
        >
            {/* Inputs de arquivo ocultos (Câmera do Tablet, Galeria e Planta do Arquiteto) */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
            />
            <input
                ref={architectInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArchitectFileUpload}
            />

            {/* BARRA SUPERIOR DO TABLET: Logo + Cliente + Tipo de Medida (Orçamento vs Final) + Ações */}
            <div className="executive-card border-metallic rounded-3xl p-4 bg-[#090d16]/95 shadow-2xl space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    {/* Identificação do Módulo */}
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                            <Ruler className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                                    BJL Planejados — Medição Inteligente IA
                                </h1>
                                <Badge className="bg-primary/20 text-primary border border-primary/40 text-[9px] font-black uppercase">
                                    Modo Tablet
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Fotografe cada parede (1 a 4), preencha as linhas de cota na foto e envie direto para Orçamento ou OS.
                            </p>
                        </div>
                    </div>

                    {/* Seletor: MEDIDA PARA ORÇAMENTO vs MEDIDA FINAL */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex p-1 rounded-2xl bg-black/60 border border-white/10">
                            <button
                                type="button"
                                onClick={() =>
                                    updateActiveProject((p) => ({
                                        ...p,
                                        measurementMode: "orcamento",
                                    }))
                                }
                                className={cn(
                                    "px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                                    activeProject.measurementMode === "orcamento"
                                        ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25"
                                        : "text-white/60 hover:text-white"
                                )}
                            >
                                <Calculator className="h-3.5 w-3.5" />
                                Medida p/ Orçamento
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    updateActiveProject((p) => ({
                                        ...p,
                                        measurementMode: "final",
                                    }))
                                }
                                className={cn(
                                    "px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                                    activeProject.measurementMode === "final"
                                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                                        : "text-white/60 hover:text-white"
                                )}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Medida Final (Executiva)
                            </button>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsProjectsDrawerOpen(true)}
                            className="h-10 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold gap-1.5"
                        >
                            <FolderOpen className="h-4 w-4 text-primary" />
                            Fichas ({savedProjects.length})
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCreateNewProject}
                            className="h-10 rounded-xl border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            Nova Medição
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                            title={
                                isFullscreen
                                    ? "Sair da Tela Cheia"
                                    : "Expandir Modo Tablet Tela Cheia"
                            }
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-4 w-4 text-primary" />
                            ) : (
                                <Maximize2 className="h-4 w-4 text-white/80" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Linha de Dados do Cliente, Projeto do Arquiteto e Vínculo com OS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-white/10">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3 text-primary" />
                            Cliente (Digite ou Escolha)
                        </Label>
                        <div className="flex gap-1.5">
                            <Input
                                value={activeProject.clientName}
                                onChange={(e) =>
                                    updateActiveProject((p) => ({
                                        ...p,
                                        clientName: e.target.value,
                                    }))
                                }
                                placeholder="Ex: Mayara, João..."
                                className="h-9 text-xs bg-slate-900/90 border-white/15 font-bold"
                            />
                            {clients.length > 0 && (
                                <Select
                                    value={activeProject.clientId || ""}
                                    onValueChange={(val) => {
                                        const found = clients.find(
                                            (c) => c.id === val
                                        );
                                        if (found) {
                                            updateActiveProject((p) => ({
                                                ...p,
                                                clientId: found.id,
                                                clientName: found.name,
                                                clientPhone:
                                                    found.phone || p.clientPhone,
                                                clientAddress:
                                                    found.address ||
                                                    p.clientAddress,
                                            }));
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        className="w-10 h-9 px-2 bg-slate-900 border-white/15 shrink-0"
                                        title="Escolher cliente já cadastrado"
                                    >
                                        <User className="h-3.5 w-3.5 text-primary" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-xs max-h-64">
                                        {clients.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 text-primary" />
                            WhatsApp / Telefone
                        </Label>
                        <Input
                            value={activeProject.clientPhone || ""}
                            onChange={(e) =>
                                updateActiveProject((p) => ({
                                    ...p,
                                    clientPhone: e.target.value,
                                }))
                            }
                            placeholder="(22) 99999-9999"
                            className="h-9 text-xs bg-slate-900/90 border-white/15"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            Endereço / Obra
                        </Label>
                        <Input
                            value={activeProject.clientAddress || ""}
                            onChange={(e) =>
                                updateActiveProject((p) => ({
                                    ...p,
                                    clientAddress: e.target.value,
                                }))
                            }
                            placeholder="Rua, Bairro / Condomínio..."
                            className="h-9 text-xs bg-slate-900/90 border-white/15"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <ClipboardList className="h-3 w-3 text-emerald-400" />
                            Vincular Ordem de Serviço
                        </Label>
                        <Select
                            value={activeProject.serviceOrderId || "auto"}
                            onValueChange={(val) => {
                                if (val === "auto") {
                                    updateActiveProject((p) => ({
                                        ...p,
                                        serviceOrderId: undefined,
                                        serviceOrderTicket: undefined,
                                    }));
                                    return;
                                }
                                const foundOS = serviceOrders.find(
                                    (o) => o.id === val
                                );
                                if (foundOS) {
                                    updateActiveProject((p) => ({
                                        ...p,
                                        serviceOrderId: foundOS.id,
                                        serviceOrderTicket:
                                            foundOS.ticket_number,
                                        clientName:
                                            p.clientName || foundOS.client,
                                    }));
                                }
                            }}
                        >
                            <SelectTrigger className="h-9 text-xs bg-slate-900/90 border-white/15">
                                <SelectValue placeholder="Criar/Vincular automático" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-xs max-h-64">
                                <SelectItem value="auto">
                                    ✨ Automático pelo nome do cliente
                                </SelectItem>
                                {serviceOrders.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                        {o.ticket_number} — {o.client}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Layers className="h-3 w-3 text-cyan-400" />
                            Projeto de Arquiteto?
                        </Label>
                        <div className="flex items-center gap-1.5">
                            <Input
                                value={activeProject.architectName || ""}
                                onChange={(e) =>
                                    updateActiveProject((p) => ({
                                        ...p,
                                        architectName: e.target.value,
                                        hasArchitectProject:
                                            e.target.value.trim().length > 0 ||
                                            p.hasArchitectProject,
                                    }))
                                }
                                placeholder="Nome do Arquiteto (se houver)"
                                className="h-9 text-xs bg-slate-900/90 border-white/15"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                    architectInputRef.current?.click()
                                }
                                className={cn(
                                    "h-9 w-9 shrink-0 rounded-xl border",
                                    activeWall?.architectFileUrl
                                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                                        : "bg-slate-900 border-white/15 text-white/70"
                                )}
                                title="Anexar foto/planta do projeto do arquiteto para esta parede"
                            >
                                <FileImage className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* NÍVEL 1: ABAS DE AMBIENTES (Quarto, Cozinha, Closet, Banheiro...) + NÍVEL 2: PAREDE 1, PAREDE 2, PAREDE 3, PAREDE 4 */}
            <div className="executive-card border-metallic rounded-3xl p-3.5 bg-[#090d16]/90 space-y-3">
                {/* Nível 1: Ambientes */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">
                            Ambientes:
                        </span>
                        {activeProject.rooms.map((room) => {
                            const isActive = room.id === activeRoom?.id;
                            const photosCount = room.walls.filter(
                                (w) => Boolean(w.photoDataUrl)
                            ).length;
                            return (
                                <div
                                    key={room.id}
                                    className="inline-flex items-center"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveRoomId(room.id);
                                            setActiveWallId(
                                                room.walls[0]?.id || ""
                                            );
                                            setSelectedLineId(null);
                                        }}
                                        className={cn(
                                            "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border",
                                            isActive
                                                ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 text-amber-200 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                                : "bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.07] hover:text-white"
                                        )}
                                    >
                                        <span>{room.name}</span>
                                        {photosCount > 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                                                📸 {photosCount}/4
                                            </span>
                                        )}
                                    </button>
                                    {isActive &&
                                        activeProject.rooms.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteRoom(room.id)
                                                }
                                                className="ml-1 p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                title={`Remover ambiente ${room.name}`}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                </div>
                            );
                        })}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNewRoomModalOpen(true)}
                            className="h-9 rounded-xl border-dashed border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black gap-1"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            + Ambiente
                        </Button>
                    </div>

                    {/* Botão Analisar Foto com IA em destaque (igual ao Mockup!) */}
                    <Button
                        type="button"
                        disabled={isAnalyzingAI || !activeWall?.photoDataUrl}
                        onClick={() => handleRunAIAnalysis()}
                        className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs gap-2 shadow-lg shadow-amber-500/20"
                    >
                        {isAnalyzingAI ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4" />
                        )}
                        {isAnalyzingAI
                            ? "Analisando Parede..."
                            : "Analisar Foto com IA"}
                    </Button>
                </div>

                {/* Nível 2: Sub-Abas PAREDE 1, PAREDE 2, PAREDE 3, PAREDE 4 */}
                {activeRoom && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-white/10">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 mr-1">
                                Paredes de {activeRoom.name}:
                            </span>
                            {activeRoom.walls.map((wall) => {
                                const isWallActive = wall.id === activeWall?.id;
                                const filled = wall.lines.filter(
                                    (l) => l.value.trim().length > 0
                                ).length;
                                return (
                                    <button
                                        key={wall.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveWallId(wall.id);
                                            setSelectedLineId(null);
                                        }}
                                        className={cn(
                                            "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border",
                                            isWallActive
                                                ? "bg-primary text-black border-primary shadow-md shadow-primary/25"
                                                : "bg-slate-900/90 text-white/75 border-white/10 hover:border-primary/40 hover:text-white"
                                        )}
                                    >
                                        <span>
                                            {wall.name}
                                            {wall.subtitle
                                                ? ` (${wall.subtitle})`
                                                : ""}
                                        </span>
                                        {wall.photoDataUrl && (
                                            <span title="Foto registrada">
                                                📸
                                            </span>
                                        )}
                                        <span
                                            className={cn(
                                                "text-[9px] px-1.5 py-0.5 rounded-full font-mono",
                                                isWallActive
                                                    ? "bg-black/25 text-black font-black"
                                                    : filled > 0
                                                    ? "bg-emerald-500/20 text-emerald-300"
                                                    : "bg-white/10 text-white/50"
                                            )}
                                        >
                                            {filled}/{wall.lines.length}
                                        </span>
                                    </button>
                                );
                            })}

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAddExtraWall}
                                className="h-8 px-2.5 rounded-xl border border-dashed border-white/15 text-[10px] font-bold text-white/70 hover:text-primary"
                                title="Adicionar Parede 5 / Ilha / Despensa"
                            >
                                <Plus className="h-3 w-3 mr-1" />+ Parede
                            </Button>
                        </div>

                        {/* Apelido da parede atual (ex: Parede 1 -> Guarda-Roupa / Pia / Janela) */}
                        {activeWall && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">
                                    Detalhe da {activeWall.name}:
                                </span>
                                <Input
                                    value={activeWall.subtitle || ""}
                                    onChange={(e) =>
                                        updateActiveWall((w) => ({
                                            ...w,
                                            subtitle: e.target.value,
                                        }))
                                    }
                                    placeholder="Ex: Guarda-Roupa, Janela, Porta, Pia..."
                                    className="h-8 text-xs w-48 bg-slate-900/90 border-white/15"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ÁREA PRINCIPAL DO TABLET: CANVAS DA FOTO COM LINHAS DE COTA (ESQUERDA) + CHECKLIST IA & MEDIDAS (DIREITA) */}
            {activeRoom && activeWall && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* COLUNA ESQUERDA/CENTRAL (8 colunas): FOTO INTERATIVA + BARRA DE FERRAMENTAS DE LINHAS */}
                    <div className="lg:col-span-8 executive-card border-metallic rounded-3xl p-4 bg-[#090d16]/95 space-y-3 shadow-2xl">
                        {/* Barra de Ferramentas de Toque: Câmera + Desenhar Linha + Atalhos de Linhas + Apagar */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                        cameraInputRef.current?.click()
                                    }
                                    className="h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-[11px] gap-1.5 shadow-md"
                                >
                                    <Camera className="h-4 w-4" />
                                    Tirar Foto ({activeWall.name})
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        galleryInputRef.current?.click()
                                    }
                                    className="h-9 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-bold gap-1.5"
                                >
                                    <FileImage className="h-3.5 w-3.5 text-amber-400" />
                                    Galeria / Arquivo
                                </Button>

                                <Button
                                    type="button"
                                    variant={
                                        isDrawingNewLine ? "default" : "outline"
                                    }
                                    size="sm"
                                    onClick={() => {
                                        setIsDrawingNewLine((prev) => !prev);
                                        setIsAddingPinMode(null);
                                        if (!isDrawingNewLine) {
                                            toast.info(
                                                "Toque e arraste o dedo sobre a foto para puxar uma nova linha de medida!"
                                            );
                                        }
                                    }}
                                    className={cn(
                                        "h-9 rounded-xl text-[11px] font-black uppercase gap-1.5",
                                        isDrawingNewLine
                                            ? "bg-primary text-black animate-pulse"
                                            : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                                    )}
                                >
                                    <Crosshair className="h-3.5 w-3.5" />
                                    {isDrawingNewLine
                                        ? "Arraste na Foto..."
                                        : "+ Puxar Linha na Foto"}
                                </Button>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setShowLinesOverlay((prev) => !prev)
                                    }
                                    className="h-8 px-2.5 rounded-xl text-[10px] font-bold text-white/70 hover:text-white gap-1"
                                    title="Mostrar ou ocultar linhas sobre a foto"
                                >
                                    {showLinesOverlay ? (
                                        <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                        <Eye className="h-3.5 w-3.5" />
                                    )}
                                    {showLinesOverlay
                                        ? "Ocultar Linhas"
                                        : "Ver Linhas"}
                                </Button>

                                {activeWall.photoDataUrl && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadStampedPhoto}
                                        className="h-8 px-2.5 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-[10px] font-bold gap-1"
                                        title="Baixar imagem da foto já com as linhas e medidas desenhadas"
                                    >
                                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                                        Baixar Foto c/ Medidas
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Botões de Inserção Rápida de Linhas e Pinos (1 Toque no Tablet) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mr-1">
                                + Inserir rápido:
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "line",
                                        label: "Largura",
                                        color: "amber",
                                        horizontal: true,
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
                            >
                                ↔ Largura
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "line",
                                        label: "Altura / Pé-Direito",
                                        color: "amber",
                                        horizontal: false,
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
                            >
                                ↕ Altura
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "line",
                                        label: "Boneca Porta",
                                        color: "amber",
                                        horizontal: true,
                                        notes: "Do canto até o alisar da porta",
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1"
                            >
                                <DoorOpen className="h-3 w-3" />
                                Boneca
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "line",
                                        label: "Janela / Peitoril",
                                        color: "cyan",
                                        horizontal: true,
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1"
                            >
                                <Square className="h-3 w-3" />
                                Janela
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "line",
                                        label: "Viga / Cortineiro",
                                        color: "rose",
                                        horizontal: true,
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all"
                            >
                                🧱 Viga / Gesso
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "pin",
                                        label: "Tomada / Interruptor",
                                        color: "emerald",
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1"
                            >
                                <Zap className="h-3 w-3" />
                                Tomada
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "pin",
                                        label: "Água / Esgoto / Gás",
                                        color: "cyan",
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1"
                            >
                                <Droplets className="h-3 w-3" />
                                Água/Gás
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    addPresetLineOrPin({
                                        kind: "pin",
                                        label: "Ponto Ar",
                                        color: "violet",
                                    })
                                }
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 transition-all flex items-center gap-1"
                            >
                                <Snowflake className="h-3 w-3" />
                                Ponto Ar
                            </button>
                        </div>

                        {/* CANVAS INTERATIVO DA PAREDE */}
                        <div
                            ref={canvasContainerRef}
                            onPointerDown={handleCanvasPointerDown}
                            onPointerMove={handleCanvasPointerMove}
                            onPointerUp={handleCanvasPointerUp}
                            className={cn(
                                "relative w-full aspect-[16/10] min-h-[380px] sm:min-h-[480px] rounded-2xl overflow-hidden border-2 select-none touch-none transition-all",
                                isDrawingNewLine || isAddingPinMode?.active
                                    ? "border-primary cursor-crosshair shadow-[0_0_30px_rgba(245,158,11,0.25)]"
                                    : "border-white/15 bg-[#0d1322]"
                            )}
                        >
                            {/* Imagem de Fundo (Foto Real da Parede ou Quadro Arquitetônico Interativo) */}
                            {activeWall.photoDataUrl ? (
                                <img
                                    src={activeWall.photoDataUrl}
                                    alt={`${activeRoom.name} - ${activeWall.name}`}
                                    draggable={false}
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                />
                            ) : (
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                                    style={{
                                        backgroundImage:
                                            "radial-gradient(rgba(245, 158, 11, 0.14) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
                                        backgroundSize:
                                            "24px 24px, 48px 48px, 48px 48px",
                                    }}
                                >
                                    {/* Desenho sutil de uma parede em perspectiva no fundo para já permitir usar as linhas antes mesmo da foto */}
                                    <div className="absolute inset-8 border-2 border-dashed border-white/10 rounded-xl pointer-events-none" />
                                    <div className="relative z-10 max-w-md bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-3 shadow-2xl">
                                        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                                            <Camera className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase text-white">
                                                {activeRoom.name} •{" "}
                                                {activeWall.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Tire uma foto desta parede com o tablet para a IA posicionar as linhas na foto, ou já preencha/arraste as linhas de medida que estão prontas na tela!
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 pt-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    cameraInputRef.current?.click();
                                                }}
                                                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl gap-1.5"
                                            >
                                                <Camera className="h-4 w-4" />
                                                Abrir Câmera
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    galleryInputRef.current?.click();
                                                }}
                                                className="border-white/15 text-xs rounded-xl gap-1.5"
                                            >
                                                <FileImage className="h-4 w-4" />
                                                Escolher Foto
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CAMADA SVG: LINHAS DE COTA COM SETAS */}
                            {showLinesOverlay && (
                                <svg
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                                >
                                    <defs>
                                        {Object.entries(LINE_COLORS).map(
                                            ([key, spec]) => (
                                                <marker
                                                    key={key}
                                                    id={`arrow-${key}`}
                                                    viewBox="0 0 10 10"
                                                    refX="5"
                                                    refY="5"
                                                    markerWidth="3.5"
                                                    markerHeight="3.5"
                                                    orient="auto-start-reverse"
                                                >
                                                    <path
                                                        d="M 0 1.5 L 10 5 L 0 8.5 z"
                                                        fill={spec.stroke}
                                                    />
                                                </marker>
                                            )
                                        )}
                                    </defs>

                                    {activeWall.lines
                                        .filter((l) => l.kind === "line")
                                        .map((line) => {
                                            const spec =
                                                LINE_COLORS[line.color] ||
                                                LINE_COLORS.amber;
                                            const isSelected =
                                                line.id === selectedLineId;
                                            return (
                                                <g key={line.id}>
                                                    {/* Sombra para contraste perfeito sobre qualquer foto clara ou escura */}
                                                    <line
                                                        x1={line.x1}
                                                        y1={line.y1}
                                                        x2={line.x2}
                                                        y2={line.y2}
                                                        stroke="rgba(0,0,0,0.75)"
                                                        strokeWidth={
                                                            isSelected
                                                                ? "1.4"
                                                                : "1.0"
                                                        }
                                                    />
                                                    <line
                                                        x1={line.x1}
                                                        y1={line.y1}
                                                        x2={line.x2}
                                                        y2={line.y2}
                                                        stroke={spec.stroke}
                                                        strokeWidth={
                                                            isSelected
                                                                ? "0.85"
                                                                : "0.55"
                                                        }
                                                        markerStart={`url(#arrow-${line.color})`}
                                                        markerEnd={`url(#arrow-${line.color})`}
                                                    />
                                                </g>
                                            );
                                        })}

                                    {/* Linha temporária enquanto o usuário arrasta o dedo para criar linha nova */}
                                    {drawingTempLine && (
                                        <line
                                            x1={drawingTempLine.x1}
                                            y1={drawingTempLine.y1}
                                            x2={drawingTempLine.x2}
                                            y2={drawingTempLine.y2}
                                            stroke="#f59e0b"
                                            strokeWidth="0.8"
                                            strokeDasharray="1.5 1.5"
                                        />
                                    )}
                                </svg>
                            )}

                            {/* CAMADA HTML INTERATIVA: ALÇAS DE ARRASTE NAS PONTAS + CAIXINHAS [ ___ cm ] EM CIMA DA FOTO */}
                            {showLinesOverlay &&
                                activeWall.lines.map((line) => {
                                    const spec =
                                        LINE_COLORS[line.color] ||
                                        LINE_COLORS.amber;
                                    const isSelected =
                                        line.id === selectedLineId;
                                    const midX =
                                        line.kind === "pin"
                                            ? line.x1
                                            : (line.x1 + line.x2) / 2;
                                    const midY =
                                        line.kind === "pin"
                                            ? line.y1
                                            : (line.y1 + line.y2) / 2;

                                    return (
                                        <React.Fragment key={line.id}>
                                            {/* Alças das duas pontas da linha (P1 e P2) para arrastar com o dedo no tablet */}
                                            {line.kind === "line" && (
                                                <>
                                                    <div
                                                        onPointerDown={(e) =>
                                                            startLineDrag(
                                                                e,
                                                                line,
                                                                "p1"
                                                            )
                                                        }
                                                        style={{
                                                            left: `${line.x1}%`,
                                                            top: `${line.y1}%`,
                                                            borderColor:
                                                                spec.hex,
                                                        }}
                                                        className={cn(
                                                            "absolute -translate-x-1/2 -translate-y-1/2 z-20 rounded-full border-2 bg-black/80 cursor-grab active:cursor-grabbing transition-transform",
                                                            isSelected
                                                                ? "w-6 h-6 scale-110 ring-4 ring-amber-400/40"
                                                                : "w-4 h-4 hover:scale-125"
                                                        )}
                                                        title="Arraste esta ponta da linha"
                                                    />
                                                    <div
                                                        onPointerDown={(e) =>
                                                            startLineDrag(
                                                                e,
                                                                line,
                                                                "p2"
                                                            )
                                                        }
                                                        style={{
                                                            left: `${line.x2}%`,
                                                            top: `${line.y2}%`,
                                                            borderColor:
                                                                spec.hex,
                                                        }}
                                                        className={cn(
                                                            "absolute -translate-x-1/2 -translate-y-1/2 z-20 rounded-full border-2 bg-black/80 cursor-grab active:cursor-grabbing transition-transform",
                                                            isSelected
                                                                ? "w-6 h-6 scale-110 ring-4 ring-amber-400/40"
                                                                : "w-4 h-4 hover:scale-125"
                                                        )}
                                                        title="Arraste esta ponta da linha"
                                                    />
                                                </>
                                            )}

                                            {/* Caixinha flutuante da medida [ ___ cm ] exatamente em cima da linha/ponto */}
                                            <div
                                                onPointerDown={(e) =>
                                                    startLineDrag(
                                                        e,
                                                        line,
                                                        "whole"
                                                    )
                                                }
                                                style={{
                                                    left: `${midX}%`,
                                                    top: `${midY}%`,
                                                }}
                                                className={cn(
                                                    "absolute -translate-x-1/2 -translate-y-1/2 z-30 rounded-xl border-2 px-2.5 py-1.5 shadow-2xl backdrop-blur-md transition-all cursor-move flex items-center gap-1.5",
                                                    spec.badgeBg,
                                                    spec.badgeBorder,
                                                    isSelected &&
                                                        "ring-2 ring-white scale-105 z-40"
                                                )}
                                            >
                                                {line.kind === "pin" && (
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                                                        style={{
                                                            backgroundColor:
                                                                spec.hex,
                                                        }}
                                                    />
                                                )}

                                                {/* Nome da Medida (Editável quando selecionado) */}
                                                {isSelected ? (
                                                    <input
                                                        type="text"
                                                        value={line.label}
                                                        onPointerDown={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        onChange={(e) =>
                                                            updateLineLabel(
                                                                line.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="bg-black/50 text-white text-[11px] font-black px-1.5 py-0.5 rounded border border-white/20 w-28 focus:outline-none focus:border-primary"
                                                    />
                                                ) : (
                                                    <span className="text-[11px] font-black text-white whitespace-nowrap">
                                                        {line.label}:
                                                    </span>
                                                )}

                                                {/* Campo para digitar o valor da medida em cm direto na foto */}
                                                <div
                                                    onPointerDown={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="inline-flex items-center bg-black/75 border border-white/25 rounded-lg px-1.5 py-0.5"
                                                >
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={line.value}
                                                        onFocus={() =>
                                                            setSelectedLineId(
                                                                line.id
                                                            )
                                                        }
                                                        onChange={(e) =>
                                                            updateLineValue(
                                                                line.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="___"
                                                        className={cn(
                                                            "w-12 bg-transparent text-center text-xs font-mono font-black focus:outline-none",
                                                            spec.text
                                                        )}
                                                    />
                                                    <span className="text-[10px] font-mono text-white/60 ml-0.5">
                                                        {line.unit}
                                                    </span>
                                                </div>

                                                {/* Botão de apagar linha direto na foto */}
                                                <button
                                                    type="button"
                                                    onPointerDown={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteLine(line.id);
                                                    }}
                                                    className="p-1 rounded-md text-white/50 hover:text-white hover:bg-rose-600/80 transition-colors"
                                                    title="Apagar esta linha de medida"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}

                            {/* Aviso de Modo de Desenho Ativo */}
                            {(isDrawingNewLine || isAddingPinMode?.active) && (
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-primary text-black text-xs font-black uppercase tracking-wider shadow-2xl flex items-center gap-2">
                                    <Crosshair className="h-4 w-4 animate-spin" />
                                    {isAddingPinMode?.active
                                        ? `Toque na foto onde fica: ${isAddingPinMode.label}`
                                        : "Toque e arraste na foto para desenhar a linha"}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsDrawingNewLine(false);
                                            setIsAddingPinMode(null);
                                        }}
                                        className="ml-2 bg-black/20 hover:bg-black/30 rounded-full p-0.5"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Resumo Rápido das 3 Medidas Principais da Parede + Planta do Arquiteto (se anexada) */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <Label className="text-[10px] font-black uppercase text-amber-400">
                                    Largura ({activeWall.name})
                                </Label>
                                <div className="flex items-center gap-1 mt-1">
                                    <Input
                                        inputMode="decimal"
                                        value={activeWall.widthCm || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateActiveWall((w) => ({
                                                ...w,
                                                widthCm: val,
                                                lines: w.lines.map((l) =>
                                                    l.label
                                                        .toLowerCase()
                                                        .includes(
                                                            "largura total"
                                                        )
                                                        ? { ...l, value: val }
                                                        : l
                                                ),
                                            }));
                                        }}
                                        placeholder="Ex: 345"
                                        className="h-8 text-xs font-mono font-bold bg-slate-900 border-white/15"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground">
                                        cm
                                    </span>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <Label className="text-[10px] font-black uppercase text-amber-400">
                                    Pé-Direito / Altura
                                </Label>
                                <div className="flex items-center gap-1 mt-1">
                                    <Input
                                        inputMode="decimal"
                                        value={activeWall.heightCm || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateActiveWall((w) => ({
                                                ...w,
                                                heightCm: val,
                                                lines: w.lines.map((l) =>
                                                    l.label
                                                        .toLowerCase()
                                                        .includes("pé-direito")
                                                        ? { ...l, value: val }
                                                        : l
                                                ),
                                            }));
                                        }}
                                        placeholder="Ex: 262"
                                        className="h-8 text-xs font-mono font-bold bg-slate-900 border-white/15"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground">
                                        cm
                                    </span>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <Label className="text-[10px] font-black uppercase text-cyan-400">
                                    Profundidade Livre
                                </Label>
                                <div className="flex items-center gap-1 mt-1">
                                    <Input
                                        inputMode="decimal"
                                        value={activeWall.depthCm || ""}
                                        onChange={(e) =>
                                            updateActiveWall((w) => ({
                                                ...w,
                                                depthCm: e.target.value,
                                            }))
                                        }
                                        placeholder="Ex: 60"
                                        className="h-8 text-xs font-mono font-bold bg-slate-900 border-white/15"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground">
                                        cm
                                    </span>
                                </div>
                            </div>

                            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                    Obs. da {activeWall.name}
                                </Label>
                                <Input
                                    value={activeWall.notes || ""}
                                    onChange={(e) =>
                                        updateActiveWall((w) => ({
                                            ...w,
                                            notes: e.target.value,
                                        }))
                                    }
                                    placeholder="Esquadro, rodapé, recorte..."
                                    className="h-8 text-xs mt-1 bg-slate-900 border-white/15"
                                />
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA (4 colunas): CHECKLIST IA DO AMBIENTE + LISTA DE LINHAS + BOTÕES DE SALVAR NA OS / ORÇAMENTO */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* CARD 1: LISTA DE MEDIDAS DESTA PAREDE (sincronizada com as linhas da foto) */}
                        <div className="executive-card border-metallic rounded-3xl p-4 bg-[#090d16]/95 space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                        Medidas da {activeWall.name}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground">
                                        {filledLinesCount} de{" "}
                                        {activeWall.lines.length} preenchidas
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        addPresetLineOrPin({
                                            kind: "line",
                                            label: `Medida ${activeWall.lines.length + 1}`,
                                            color: "amber",
                                            horizontal: true,
                                        })
                                    }
                                    className="h-7 px-2.5 rounded-xl border-primary/40 bg-primary/10 text-primary text-[10px] font-black gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    Nova Linha
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                {activeWall.lines.map((line) => {
                                    const spec =
                                        LINE_COLORS[line.color] ||
                                        LINE_COLORS.amber;
                                    const isFilled =
                                        line.value.trim().length > 0;
                                    const isSelected =
                                        line.id === selectedLineId;

                                    return (
                                        <div
                                            key={line.id}
                                            onClick={() =>
                                                setSelectedLineId(line.id)
                                            }
                                            className={cn(
                                                "p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer",
                                                isSelected
                                                    ? "bg-primary/10 border-primary/50"
                                                    : isFilled
                                                    ? "bg-emerald-500/5 border-emerald-500/25"
                                                    : "bg-white/[0.02] border-white/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            spec.hex,
                                                    }}
                                                />
                                                <Input
                                                    value={line.label}
                                                    onChange={(e) =>
                                                        updateLineLabel(
                                                            line.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-7 text-xs font-bold bg-transparent border-none px-1 focus-visible:ring-1"
                                                />
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Input
                                                    inputMode="decimal"
                                                    value={line.value}
                                                    onChange={(e) =>
                                                        updateLineValue(
                                                            line.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="___"
                                                    className="h-7 w-16 text-center text-xs font-mono font-black bg-slate-900 border-white/15"
                                                />
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    {line.unit}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteLine(line.id);
                                                    }}
                                                    className="p-1 rounded-lg text-rose-400/70 hover:text-white hover:bg-rose-600 transition-colors"
                                                    title="Apagar linha"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CARD 2: CHECKLIST IA DO AMBIENTE (Radar Anti-Esquecimento) */}
                        <div className="executive-card border-metallic rounded-3xl p-4 bg-[#090d16]/95 space-y-3 shadow-2xl">
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                        Checklist IA do Ambiente
                                    </h3>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[9px] font-black uppercase",
                                            activeProject.measurementMode ===
                                                "final"
                                                ? "border-emerald-500/40 text-emerald-300"
                                                : "border-amber-500/40 text-amber-300"
                                        )}
                                    >
                                        {activeProject.measurementMode ===
                                        "final"
                                            ? "Medida Final"
                                            : "Orçamento"}
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {activeRoom.name} • Conferência obrigatória antes de sair do cliente
                                </p>
                            </div>

                            <div className="space-y-2">
                                {activeRoom.checklist.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() =>
                                            updateActiveRoom((r) => ({
                                                ...r,
                                                checklist: r.checklist.map(
                                                    (c) =>
                                                        c.id === item.id
                                                            ? {
                                                                  ...c,
                                                                  checked:
                                                                      !c.checked,
                                                              }
                                                            : c
                                                ),
                                            }))
                                        }
                                        className={cn(
                                            "p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5",
                                            item.checked
                                                ? "bg-emerald-500/10 border-emerald-500/30"
                                                : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                                        )}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {item.checked ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={cn(
                                                    "text-xs font-bold leading-snug",
                                                    item.checked
                                                        ? "text-emerald-200 line-through opacity-80"
                                                        : "text-white"
                                                )}
                                            >
                                                {item.label}
                                            </p>
                                            {item.hint && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {item.hint}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Especificação Rápida de MDF e Ferragens do Ambiente */}
                            <div className="pt-2 border-t border-white/10 space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                    Padrão de MDF & Ferragens ({activeRoom.name})
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[9px] uppercase text-muted-foreground">
                                            MDF Interno
                                        </Label>
                                        <Input
                                            value={activeRoom.mdfInternal || ""}
                                            onChange={(e) =>
                                                updateActiveRoom((r) => ({
                                                    ...r,
                                                    mdfInternal: e.target.value,
                                                }))
                                            }
                                            placeholder="Branco TX 15mm"
                                            className="h-8 text-xs mt-0.5 bg-slate-900 border-white/15"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[9px] uppercase text-muted-foreground">
                                            MDF Externo / Frentes
                                        </Label>
                                        <Input
                                            value={activeRoom.mdfExternal || ""}
                                            onChange={(e) =>
                                                updateActiveRoom((r) => ({
                                                    ...r,
                                                    mdfExternal: e.target.value,
                                                }))
                                            }
                                            placeholder="Ex: Freijó + Gianduia"
                                            className="h-8 text-xs mt-0.5 bg-slate-900 border-white/15"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* BOTÕES DE CONCLUSÃO E INTEGRAÇÃO 1-CLIQUE */}
                            <div className="pt-3 border-t border-white/10 space-y-2">
                                <Button
                                    type="button"
                                    disabled={isSavingAction}
                                    onClick={handleSaveToServiceOrder}
                                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs gap-2 shadow-xl shadow-amber-500/20"
                                >
                                    {isSavingAction ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ClipboardList className="h-4 w-4" />
                                    )}
                                    Salvar Fotos & Medidas na OS
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSavingAction}
                                    onClick={handleSendToBudget}
                                    className="w-full h-10 rounded-2xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-black uppercase tracking-wider text-xs gap-2"
                                >
                                    <Calculator className="h-4 w-4" />
                                    Gerar Pré-Orçamento dos Ambientes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: ADICIONAR NOVO AMBIENTE (Já cria Parede 1, Parede 2, Parede 3 e Parede 4) */}
            <Dialog
                open={isNewRoomModalOpen}
                onOpenChange={setIsNewRoomModalOpen}
            >
                <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black uppercase">
                            Adicionar Ambiente na Medição
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            O ambiente já será criado automaticamente com{" "}
                            <strong className="text-white">
                                Parede 1, Parede 2, Parede 3 e Parede 4
                            </strong>{" "}
                            e as linhas inteligentes daquele cômodo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                Escolha Rápida (1 Toque)
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {ROOM_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() =>
                                            handleAddRoom(
                                                preset.label,
                                                preset.type
                                            )
                                        }
                                        className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-xs font-bold text-left transition-all"
                                    >
                                        + {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                Ou digite um nome personalizado
                            </Label>
                            <Input
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                placeholder="Ex: Quarto Filha, Despensa, Home Office..."
                                className="bg-slate-900 border-white/15 text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsNewRoomModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleAddRoom()}
                            disabled={!newRoomName.trim()}
                        >
                            Criar com 4 Paredes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: HISTÓRICO DE FICHAS DE MEDIÇÃO SALVAS NO TABLET */}
            <Dialog
                open={isProjectsDrawerOpen}
                onOpenChange={setIsProjectsDrawerOpen}
            >
                <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black uppercase">
                            Fichas de Medição Salvas
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Alterne entre medições de clientes diferentes (Medida p/ Orçamento ou Medida Final).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {savedProjects.map((proj) => {
                            const isCurrent = proj.id === activeProject.id;
                            return (
                                <div
                                    key={proj.id}
                                    onClick={() => {
                                        setActiveProjectId(proj.id);
                                        setActiveRoomId(
                                            proj.rooms[0]?.id || ""
                                        );
                                        setActiveWallId(
                                            proj.rooms[0]?.walls[0]?.id || ""
                                        );
                                        setIsProjectsDrawerOpen(false);
                                    }}
                                    className={cn(
                                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                                        isCurrent
                                            ? "bg-primary/15 border-primary/50"
                                            : "bg-white/[0.02] border-white/10 hover:bg-white/[0.06]"
                                    )}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-black uppercase text-white truncate">
                                                {proj.clientName ||
                                                    "Cliente sem nome"}
                                            </p>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[9px] uppercase font-bold",
                                                    proj.measurementMode ===
                                                        "final"
                                                        ? "border-emerald-500/40 text-emerald-300"
                                                        : "border-amber-500/40 text-amber-300"
                                                )}
                                            >
                                                {proj.measurementMode ===
                                                "final"
                                                    ? "Medida Final"
                                                    : "Orçamento"}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                            {proj.rooms
                                                .map((r) => r.name)
                                                .join(", ")}{" "}
                                            • Atualizado em{" "}
                                            {new Date(
                                                proj.updatedAt
                                            ).toLocaleDateString("pt-BR")}
                                        </p>
                                    </div>

                                    {savedProjects.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (
                                                    !window.confirm(
                                                        "Excluir esta ficha de medição?"
                                                    )
                                                )
                                                    return;
                                                const next =
                                                    savedProjects.filter(
                                                        (p) => p.id !== proj.id
                                                    );
                                                setSavedProjects(next);
                                                if (isCurrent && next[0]) {
                                                    setActiveProjectId(
                                                        next[0].id
                                                    );
                                                }
                                            }}
                                            className="h-8 w-8 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={() => {
                                setIsProjectsDrawerOpen(false);
                                handleCreateNewProject();
                            }}
                            className="gap-1.5 font-bold text-xs"
                        >
                            <Plus className="h-4 w-4" />
                            Nova Ficha de Medição
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MedicaoTablet;
