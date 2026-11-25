import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Plus,
    Trash2,
    Ruler,
    CheckCircle2,
    Maximize2,
    Minimize2,
    Download,
    FolderOpen,
    Folder,
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
    RotateCw,
    RefreshCw,
    Smartphone,
    Tablet,
    ArrowLeft,
    QrCode,
    Search,
    Loader2,
    X,
    Eye,
    EyeOff,
    MoveHorizontal,
    MoveVertical,
} from "lucide-react";
import { SmartDimensionLine } from "@/services/geminiService";
import { serializeOSAttachment, OSAttachmentItem } from "@/types/serviceOrder";

export type MeasurementMode = "orcamento" | "final";

export interface WallMeasurementData {
    id: string;
    name: string; // "Parede 1", "Parede 2", "Parede 3", "Parede 4"
    subtitle?: string;
    photoDataUrl?: string;
    architectFileUrl?: string;
    architectFileName?: string;
    widthCm?: string;
    heightCm?: string;
    depthCm?: string;
    lines: SmartDimensionLine[];
    notes: string;
    updatedAt?: string;
}

export interface RoomMeasurementData {
    id: string;
    name: string;
    roomType: string;
    mdfInternal?: string;
    mdfExternal?: string;
    hardwareNotes?: string;
    walls: WallMeasurementData[];
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

const LOCAL_STORAGE_KEY = "bjl_tablet_measurements_v2";
const CLOUD_SETTINGS_KEY = "tablet_measurements_projects_v2";

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
        badgeBorder: "border-amber-400/85",
        text: "text-amber-300",
        label: "Ouro / Principal",
    },
    cyan: {
        stroke: "#06b6d4",
        hex: "#06b6d4",
        badgeBg: "bg-cyan-950/90",
        badgeBorder: "border-cyan-400/85",
        text: "text-cyan-300",
        label: "Ciano / Aberturas",
    },
    emerald: {
        stroke: "#10b981",
        hex: "#10b981",
        badgeBg: "bg-emerald-950/90",
        badgeBorder: "border-emerald-400/85",
        text: "text-emerald-300",
        label: "Verde / Elétrica",
    },
    rose: {
        stroke: "#f43f5e",
        hex: "#f43f5e",
        badgeBg: "bg-rose-950/90",
        badgeBorder: "border-rose-400/85",
        text: "text-rose-300",
        label: "Alerta / Viga",
    },
    violet: {
        stroke: "#8b5cf6",
        hex: "#8b5cf6",
        badgeBg: "bg-violet-950/90",
        badgeBorder: "border-violet-400/85",
        text: "text-violet-300",
        label: "Roxo / Detalhe",
    },
};

/**
 * Cria Parede 1, Parede 2, Parede 3 e Parede 4 100% LIMPAS (sem linhas automáticas).
 * O próprio usuário puxa ou adiciona apenas as linhas que precisar.
 */
function createCleanWalls(): WallMeasurementData[] {
    return [1, 2, 3, 4].map((num) => ({
        id: `wall-${num}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `Parede ${num}`,
        subtitle: "",
        photoDataUrl: undefined,
        widthCm: "",
        heightCm: "",
        depthCm: "",
        lines: [], // ZERO linhas automáticas!
        notes: "",
        updatedAt: new Date().toISOString(),
    }));
}

function createCleanRoom(name: string, roomType: string): RoomMeasurementData {
    return {
        id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        roomType,
        mdfInternal: "Branco TX 15mm",
        mdfExternal: "",
        hardwareNotes: "",
        walls: createCleanWalls(),
    };
}

/**
 * Comprime foto e envia para o Supabase Storage (bucket 'attachments') para que
 * a foto tirada no CELULAR apareça automaticamente no TABLET em 1-2 segundos!
 */
async function compressImageToBlobAndDataUrl(
    file: File,
    maxDim = 1600
): Promise<{ blob: Blob | null; dataUrl: string }> {
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
                    resolve({ blob: null, dataUrl: resultStr });
                    return;
                }
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                canvas.toBlob(
                    (blob) => resolve({ blob, dataUrl }),
                    "image/jpeg",
                    0.85
                );
            };
            img.onerror = () => resolve({ blob: null, dataUrl: resultStr });
            img.src = resultStr;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Gira uma imagem (URL ou Base64) em 90 graus no sentido horário via Canvas.
 */
async function rotateImage90Degrees(imageSrc: string): Promise<{
    blob: Blob | null;
    dataUrl: string;
}> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.height;
            canvas.height = img.width;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve({ blob: null, dataUrl: imageSrc });
                return;
            }
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((90 * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            canvas.toBlob(
                (blob) => resolve({ blob, dataUrl }),
                "image/jpeg",
                0.88
            );
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

const MedicaoTablet: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Lista de clientes com medição (começa ZERADA se não houver clientes reais salvos!)
    const [savedProjects, setSavedProjects] = useState<TabletMeasurementProject[]>(() => {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.filter(
                        (p) => p && typeof p.clientName === "string" && p.clientName.trim().length > 0
                    );
                }
            }
        } catch {
            // ignore
        }
        return [];
    });

    // POR PADRÃO FICA OCULTO (null = mostra apenas a lista de nomes dos clientes ou tela zerada!)
    const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
        return searchParams.get("proj") || null;
    });

    const activeProject = useMemo(() => {
        if (!activeProjectId) return null;
        return savedProjects.find((p) => p.id === activeProjectId) || null;
    }, [savedProjects, activeProjectId]);

    const [activeRoomId, setActiveRoomId] = useState<string>("");
    const [activeWallId, setActiveWallId] = useState<string>("");

    const activeRoom = useMemo(() => {
        if (!activeProject) return null;
        return (
            activeProject.rooms.find((r) => r.id === activeRoomId) ||
            activeProject.rooms[0] ||
            null
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
        if (activeProject && (!activeRoomId || !activeProject.rooms.some((r) => r.id === activeRoomId))) {
            const firstRoom = activeProject.rooms[0];
            if (firstRoom) {
                setActiveRoomId(firstRoom.id);
                setActiveWallId(firstRoom.walls[0]?.id || "");
            }
        }
    }, [activeProject, activeRoomId]);

    useEffect(() => {
        if (activeRoom && (!activeWallId || !activeRoom.walls.some((w) => w.id === activeWallId))) {
            setActiveWallId(activeRoom.walls[0]?.id || "");
        }
    }, [activeRoom, activeWallId]);

    // Clientes e Ordens de Serviço do banco
    const [clients, setClients] = useState<any[]>([]);
    const [serviceOrders, setServiceOrders] = useState<any[]>([]);
    const [clientSearch, setClientSearch] = useState("");

    // Orientação do Tablet: "horizontal" (Paisagem 16:9 amplo) vs "vertical" (Retrato 3:4)
    const [canvasOrientation, setCanvasOrientation] = useState<"horizontal" | "vertical">("horizontal");
    const [isScreenRotatedHorizontal, setIsScreenRotatedHorizontal] = useState<boolean>(() =>
        document.documentElement.classList.contains("bjl-force-horizontal")
    );
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onOrientationEvt = (e: Event) => {
            const detail = (e as CustomEvent)?.detail;
            if (detail && typeof detail.horizontal === "boolean") {
                setIsScreenRotatedHorizontal(detail.horizontal);
                setCanvasOrientation(detail.horizontal ? "horizontal" : "vertical");
            }
        };
        window.addEventListener("bjl-orientation-change", onOrientationEvt);
        return () =>
            window.removeEventListener("bjl-orientation-change", onOrientationEvt);
    }, []);

    // Modo Câmera do Celular (para tirar fotos rápidas no celular e jogar automático para o tablet)
    const [isPhoneCameraMode, setIsPhoneCameraMode] = useState<boolean>(() => {
        return searchParams.get("camera") === "1";
    });
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isSyncingCloud, setIsSyncingCloud] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [uploadingWallId, setUploadingWallId] = useState<string | null>(null);

    // Modal de Criar Nova Medição de Cliente
    const [isNewMeasurementOpen, setIsNewMeasurementOpen] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientId, setNewClientId] = useState("");
    const [newClientPhone, setNewClientPhone] = useState("");
    const [newClientAddress, setNewClientAddress] = useState("");
    const [newMode, setNewMode] = useState<MeasurementMode>("orcamento");
    const [newFirstRoomName, setNewFirstRoomName] = useState("Quarto Casal");
    const [newFirstRoomType, setNewFirstRoomType] = useState("Quarto");

    // Modal de Adicionar Novo Ambiente
    const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomType, setNewRoomType] = useState("Quarto");

    // Estados de Desenho de Linhas (100% manual pelo usuário!)
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [isDrawingNewLine, setIsDrawingNewLine] = useState(false);
    const [isAddingPinMode, setIsAddingPinMode] = useState<{
        active: boolean;
        label: string;
        color: SmartDimensionLine["color"];
    } | null>(null);
    const [showLinesOverlay, setShowLinesOverlay] = useState(true);
    const [isSavingAction, setIsSavingAction] = useState(false);

    // Refs
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);
    const architectInputRef = useRef<HTMLInputElement | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement | null>(null);
    const targetWallForCaptureRef = useRef<string | null>(null);
    const lastLocalEditRef = useRef<number>(0);

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

    const [drawingTempLine, setDrawingTempLine] = useState<{
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    } | null>(null);

    // Salva no Supabase (api_settings) para sincronizar Celular <-> Tablet instantaneamente
    const pushProjectsToCloud = useCallback(
        async (listToSave: TabletMeasurementProject[]) => {
            try {
                const validList = listToSave.filter(
                    (p) => p && p.clientName && p.clientName.trim().length > 0
                );
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validList));
                lastLocalEditRef.current = Date.now();

                // Mantém URLs públicas do Supabase Storage ou fotos compactas
                const cloudPayload = validList.slice(0, 30).map((p) => ({
                    ...p,
                    rooms: p.rooms.map((r) => ({
                        ...r,
                        walls: r.walls.map((w) => ({
                            ...w,
                            photoDataUrl:
                                w.photoDataUrl &&
                                (w.photoDataUrl.startsWith("http") ||
                                    w.photoDataUrl.length < 450000)
                                    ? w.photoDataUrl
                                    : undefined,
                        })),
                    })),
                }));

                await supabase.from("api_settings").upsert(
                    [
                        {
                            key_name: CLOUD_SETTINGS_KEY,
                            key_value: JSON.stringify(cloudPayload),
                            description:
                                "Medições por Cliente sincronizadas entre Celular e Tablet",
                            updated_at: new Date().toISOString(),
                        },
                    ],
                    { onConflict: "key_name" }
                );
            } catch (err) {
                console.warn("Aviso ao sincronizar medição na nuvem:", err);
            }
        },
        []
    );

    // Puxa atualizações da nuvem (para quando o usuário tira a foto no CELULAR e ela cai sozinha no TABLET!)
    const pullProjectsFromCloud = useCallback(
        async (showToastOnUpdate = false) => {
            // Não sobrescreve enquanto o usuário estiver arrastando uma linha no tablet
            if (dragState || drawingTempLine || isUploadingPhoto) return;
            if (Date.now() - lastLocalEditRef.current < 2500 && !showToastOnUpdate) {
                return;
            }

            try {
                if (showToastOnUpdate) setIsSyncingCloud(true);
                const { data, error } = await supabase
                    .from("api_settings")
                    .select("key_value")
                    .eq("key_name", CLOUD_SETTINGS_KEY)
                    .maybeSingle();

                if (error || !data?.key_value) return;

                const cloudList = (
                    JSON.parse(data.key_value) as TabletMeasurementProject[]
                ).filter(
                    (p) => p && typeof p.clientName === "string" && p.clientName.trim().length > 0
                );

                setSavedProjects((localPrev) => {
                    let hasNewPhotoFromPhone = false;
                    const localMap = new Map(localPrev.map((p) => [p.id, p]));
                    const merged: TabletMeasurementProject[] = [];

                    for (const cloudProj of cloudList) {
                        const localProj = localMap.get(cloudProj.id);
                        if (!localProj) {
                            merged.push(cloudProj);
                            continue;
                        }

                        const cloudTime = new Date(cloudProj.updatedAt || 0).getTime();
                        const localTime = new Date(localProj.updatedAt || 0).getTime();

                        if (cloudTime > localTime) {
                            // Verifica se entrou foto nova vinda do celular
                            cloudProj.rooms.forEach((cr) => {
                                const lr = localProj.rooms.find((r) => r.id === cr.id);
                                cr.walls.forEach((cw) => {
                                    const lw = lr?.walls.find((w) => w.id === cw.id);
                                    if (
                                        cw.photoDataUrl &&
                                        cw.photoDataUrl !== lw?.photoDataUrl
                                    ) {
                                        hasNewPhotoFromPhone = true;
                                    }
                                });
                            });
                            merged.push(cloudProj);
                        } else {
                            merged.push(localProj);
                        }
                        localMap.delete(cloudProj.id);
                    }

                    // Mantém projetos locais recém-criados que ainda não subiram
                    localMap.forEach((remainingLocal) => {
                        merged.push(remainingLocal);
                    });

                    if (hasNewPhotoFromPhone) {
                        toast.success(
                            "📸 Nova foto recebida do celular e atualizada automaticamente!"
                        );
                    } else if (showToastOnUpdate) {
                        toast.success("Sincronizado com o celular!");
                    }

                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
                    return merged;
                });
            } catch (err) {
                console.warn("Aviso ao buscar fotos do celular:", err);
            } finally {
                if (showToastOnUpdate) setIsSyncingCloud(false);
            }
        },
        [dragState, drawingTempLine, isUploadingPhoto]
    );

    // Carrega clientes, OS e inicia sincronização automática Celular <-> Tablet
    useEffect(() => {
        const init = async () => {
            try {
                const [clientsRes, osRes] = await Promise.all([
                    supabase
                        .from("clients")
                        .select("id, name, phone, address, city")
                        .order("name"),
                    supabase
                        .from("service_orders")
                        .select("id, ticket_number, client, action, status, attachments, notes")
                        .order("created_at", { ascending: false }),
                ]);
                if (clientsRes.data) setClients(clientsRes.data);
                if (osRes.data) setServiceOrders(osRes.data);
            } catch {
                // ignore
            }
            await pullProjectsFromCloud(false);
        };
        init();

        // Sincronização em tempo real a cada 3 segundos para receber fotos do celular automaticamente!
        const interval = setInterval(() => {
            pullProjectsFromCloud(false);
        }, 3000);

        // Também escuta canal Realtime do Supabase se habilitado
        const channel = supabase
            .channel("tablet-measurements-live")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "api_settings",
                    filter: `key_name=eq.${CLOUD_SETTINGS_KEY}`,
                },
                () => {
                    pullProjectsFromCloud(false);
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [pullProjectsFromCloud]);

    // Se abriu via QR Code do celular (?proj=ID&room=ID&wall=ID&camera=1), posiciona direto
    useEffect(() => {
        const qProj = searchParams.get("proj");
        const qRoom = searchParams.get("room");
        const qWall = searchParams.get("wall");
        const qCam = searchParams.get("camera");

        if (qProj && savedProjects.some((p) => p.id === qProj)) {
            setActiveProjectId(qProj);
            if (qRoom) setActiveRoomId(qRoom);
            if (qWall) setActiveWallId(qWall);
            if (qCam === "1") setIsPhoneCameraMode(true);
        }
    }, [searchParams, savedProjects]);

    // Helpers de atualização do cliente ativo + envio automático para nuvem
    const updateActiveProject = useCallback(
        (updater: (proj: TabletMeasurementProject) => TabletMeasurementProject) => {
            if (!activeProjectId) return;
            setSavedProjects((prev) => {
                const next = prev.map((p) => {
                    if (p.id !== activeProjectId) return p;
                    const updated = updater(p);
                    return { ...updated, updatedAt: new Date().toISOString() };
                });
                pushProjectsToCloud(next);
                return next;
            });
        },
        [activeProjectId, pushProjectsToCloud]
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
                    w.id === activeWall.id
                        ? { ...updater(w), updatedAt: new Date().toISOString() }
                        : w
                ),
            }));
        },
        [activeWall, updateActiveRoom]
    );

    // Alternar Modo Horizontal (Deitado) <-> Vertical (Em Pé) no Tablet (Gira a tela inteira se o tablet estiver travado em pé!)
    const handleToggleOrientation = async (target: "horizontal" | "vertical") => {
        setCanvasOrientation(target);
        const isHoriz = target === "horizontal";
        setIsScreenRotatedHorizontal(isHoriz);

        if (isHoriz) {
            document.documentElement.classList.add("bjl-force-horizontal");
            document.documentElement.classList.remove("bjl-force-vertical");
        } else {
            document.documentElement.classList.remove("bjl-force-horizontal");
            document.documentElement.classList.remove("bjl-force-vertical");
        }

        window.dispatchEvent(
            new CustomEvent("bjl-orientation-change", {
                detail: { horizontal: isHoriz },
            })
        );

        try {
            const scr = window.screen as any;
            if (isHoriz && scr?.orientation?.lock) {
                await scr.orientation.lock("landscape");
            } else if (!isHoriz && scr?.orientation?.unlock) {
                scr.orientation.unlock();
            }
        } catch {
            // Rotação CSS 90° já cuida dos tablets sem suporte a orientation.lock
        }

        toast.success(
            isHoriz
                ? "Tela virada para Horizontal (Deitado)!"
                : "Tela voltada para Vertical (Em pé)!"
        );
    };

    // Girar a foto da parede em 90 graus (caso a foto do celular venha virada)
    const handleRotateWallPhoto = async () => {
        if (!activeWall?.photoDataUrl || isUploadingPhoto) return;
        setIsUploadingPhoto(true);
        try {
            const { blob, dataUrl } = await rotateImage90Degrees(
                activeWall.photoDataUrl
            );
            let finalUrl = dataUrl;

            if (blob) {
                const filePath = `medicoes/rot_${activeWall.id}_${Date.now()}.jpg`;
                const { error: upErr } = await supabase.storage
                    .from("attachments")
                    .upload(filePath, blob, { contentType: "image/jpeg" });
                if (!upErr) {
                    const { data: pubData } = supabase.storage
                        .from("attachments")
                        .getPublicUrl(filePath);
                    if (pubData?.publicUrl) finalUrl = pubData.publicUrl;
                }
            }

            updateActiveWall((w) => ({
                ...w,
                photoDataUrl: finalUrl,
            }));
            toast.success("Foto girada em 90°!");
        } catch {
            toast.error("Não foi possível girar esta foto.");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    // Criar Nova Medição de Cliente (abre o cliente com Parede 1, 2, 3, 4 zeradas!)
    const handleConfirmNewMeasurement = () => {
        if (!newClientName.trim()) {
            toast.error("Digite ou escolha o nome do cliente.");
            return;
        }

        const firstRoom = createCleanRoom(
            newFirstRoomName.trim() || "Quarto Casal",
            newFirstRoomType || "Quarto"
        );

        const newProj: TabletMeasurementProject = {
            id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            clientName: newClientName.trim(),
            clientId: newClientId || undefined,
            clientPhone: newClientPhone.trim(),
            clientAddress: newClientAddress.trim(),
            measurementMode: newMode,
            updatedAt: new Date().toISOString(),
            rooms: [firstRoom],
        };

        const nextList = [newProj, ...savedProjects];
        setSavedProjects(nextList);
        pushProjectsToCloud(nextList);

        setActiveProjectId(newProj.id);
        setActiveRoomId(firstRoom.id);
        setActiveWallId(firstRoom.walls[0].id);

        setNewClientName("");
        setNewClientId("");
        setNewClientPhone("");
        setNewClientAddress("");
        setIsNewMeasurementOpen(false);
        toast.success(
            `Medição de ${newProj.clientName} criada! Paredes 1 a 4 prontas.`
        );
    };

    const handleDeleteProject = (projId: string, clientName: string) => {
        if (
            !window.confirm(
                `Tem certeza que deseja excluir a medição do cliente "${clientName}"?`
            )
        )
            return;

        const next = savedProjects.filter((p) => p.id !== projId);
        setSavedProjects(next);
        pushProjectsToCloud(next);
        if (activeProjectId === projId) {
            setActiveProjectId(null);
        }
        toast.info(`Medição de ${clientName} removida.`);
    };

    // Upload de foto (do Celular ou do Tablet) -> Sobe para Supabase Storage e sincroniza na hora!
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeRoom) return;

        const targetWallId =
            targetWallForCaptureRef.current || activeWall?.id || "";
        if (!targetWallId) return;

        setIsUploadingPhoto(true);
        setUploadingWallId(targetWallId);
        try {
            toast.info("Enviando foto e sincronizando com o Tablet...");
            const { blob, dataUrl } = await compressImageToBlobAndDataUrl(
                file,
                1600
            );
            let finalPhotoUrl = dataUrl;

            // Sobe para o bucket 'attachments' para sincronizar em tempo real entre Celular e Tablet
            if (blob) {
                const safeClient = (activeProject?.clientName || "cliente")
                    .replace(/[^a-zA-Z0-9_-]/g, "_")
                    .slice(0, 25);
                const filePath = `medicoes/${safeClient}_${targetWallId}_${Date.now()}.jpg`;
                const { error: uploadErr } = await supabase.storage
                    .from("attachments")
                    .upload(filePath, blob, { contentType: "image/jpeg" });

                if (!uploadErr) {
                    const { data: urlData } = supabase.storage
                        .from("attachments")
                        .getPublicUrl(filePath);
                    if (urlData?.publicUrl) {
                        finalPhotoUrl = urlData.publicUrl;
                    }
                }
            }

            // Atualiza a parede específica (SEM adicionar nenhuma linha automática!)
            updateActiveRoom((room) => ({
                ...room,
                walls: room.walls.map((w) =>
                    w.id === targetWallId
                        ? {
                              ...w,
                              photoDataUrl: finalPhotoUrl,
                              updatedAt: new Date().toISOString(),
                          }
                        : w
                ),
            }));

            setActiveWallId(targetWallId);
            toast.success(
                isPhoneCameraMode
                    ? "✅ Foto enviada! Ela já apareceu automaticamente no seu Tablet!"
                    : "Foto carregada limpa! Agora puxa apenas as linhas que você precisar."
            );
        } catch (err) {
            console.error("Erro ao enviar foto:", err);
            toast.error("Erro ao processar a foto.");
        } finally {
            setIsUploadingPhoto(false);
            setUploadingWallId(null);
            targetWallForCaptureRef.current = null;
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
            const { dataUrl } = await compressImageToBlobAndDataUrl(file, 1600);
            updateActiveWall((wall) => ({
                ...wall,
                architectFileUrl: dataUrl,
                architectFileName: file.name,
            }));
            updateActiveProject((p) => ({ ...p, hasArchitectProject: true }));
            toast.success("Projeto do Arquiteto anexado!");
        } catch {
            toast.error("Erro ao anexar arquivo do arquiteto.");
        } finally {
            e.target.value = "";
        }
    };

    // Funções de manipulação manual de linhas pelo usuário
    const updateLineValue = (lineId: string, newValue: string) => {
        updateActiveWall((wall) => ({
            ...wall,
            lines: wall.lines.map((l) =>
                l.id === lineId ? { ...l, value: newValue } : l
            ),
        }));
    };

    const updateLineLabel = (lineId: string, newLabel: string) => {
        updateActiveWall((wall) => ({
            ...wall,
            lines: wall.lines.map((l) =>
                l.id === lineId ? { ...l, label: newLabel } : l
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
    };

    const addManualLineOrPin = (preset: {
        kind: "line" | "pin";
        label: string;
        color: SmartDimensionLine["color"];
        horizontal?: boolean;
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
                `Toque na foto onde fica "${preset.label}" para colocar o ponto!`
            );
            return;
        }

        const offset = (activeWall.lines.length % 6) * 7;
        const newLine: SmartDimensionLine = {
            id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kind: "line",
            label: preset.label,
            value: "",
            unit: "cm",
            x1: preset.horizontal !== false ? 20 : 35 + offset,
            y1: preset.horizontal !== false ? 30 + offset : 18,
            x2: preset.horizontal !== false ? 80 : 35 + offset,
            y2: preset.horizontal !== false ? 30 + offset : 82,
            color: preset.color,
            required: true,
        };

        updateActiveWall((wall) => ({
            ...wall,
            lines: [...wall.lines, newLine],
        }));
        setSelectedLineId(newLine.id);
    };

    // Coordenadas percentuais (0 a 100%) no toque/arraste (compatível com tela normal e com tela girada 90° em CSS!)
    const getRelativeCoords = (clientX: number, clientY: number) => {
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            return { x: 50, y: 50 };
        }

        const isCssRotated90 =
            document.documentElement.classList.contains("bjl-force-horizontal") &&
            window.innerHeight > window.innerWidth;

        let rawX: number;
        let rawY: number;

        if (isCssRotated90) {
            // Em rotação de 90° horário, o eixo X local do quadro corre de cima para baixo na tela (clientY),
            // e o eixo Y local corre da direita para a esquerda na tela (rect.right - clientX)
            rawX = ((clientY - rect.top) / rect.height) * 100;
            rawY = ((rect.right - clientX) / rect.width) * 100;
        } else {
            rawX = ((clientX - rect.left) / rect.width) * 100;
            rawY = ((clientY - rect.top) / rect.height) * 100;
        }

        const x = Math.max(3, Math.min(97, Math.round(rawX * 10) / 10));
        const y = Math.max(3, Math.min(97, Math.round(rawY * 10) / 10));
        return { x, y };
    };

    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!activeWall) return;

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
            return;
        }

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
                label: "",
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
            // Mantém o modo de puxar linha ou desativa após 1 linha
            setIsDrawingNewLine(false);
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

    // Adicionar novo Ambiente (nasce com Parede 1, Parede 2, Parede 3, Parede 4 LIMPAS!)
    const handleAddRoom = (presetName?: string, presetType?: string) => {
        const nameToUse = (presetName || newRoomName).trim();
        const typeToUse = presetType || newRoomType || "Quarto";
        if (!nameToUse) {
            toast.error("Informe o nome do ambiente.");
            return;
        }

        const newRoom = createCleanRoom(nameToUse, typeToUse);
        updateActiveProject((proj) => ({
            ...proj,
            rooms: [...proj.rooms, newRoom],
        }));
        setActiveRoomId(newRoom.id);
        setActiveWallId(newRoom.walls[0].id);
        setNewRoomName("");
        setIsNewRoomModalOpen(false);
        toast.success(
            `Ambiente "${nameToUse}" criado com Parede 1, 2, 3 e 4!`
        );
    };

    const handleDeleteRoom = (roomId: string) => {
        if (!activeProject || activeProject.rooms.length <= 1) {
            toast.error("O cliente precisa ter pelo menos 1 ambiente.");
            return;
        }
        const target = activeProject.rooms.find((r) => r.id === roomId);
        if (!window.confirm(`Remover o ambiente "${target?.name}"?`)) return;

        const remaining = activeProject.rooms.filter((r) => r.id !== roomId);
        updateActiveProject((proj) => ({
            ...proj,
            rooms: remaining,
        }));
        setActiveRoomId(remaining[0].id);
        setActiveWallId(remaining[0].walls[0]?.id || "");
    };

    const handleAddExtraWall = () => {
        if (!activeRoom) return;
        const nextNum = activeRoom.walls.length + 1;
        const newWall: WallMeasurementData = {
            id: `wall-${nextNum}-${Date.now()}`,
            name: `Parede ${nextNum}`,
            subtitle: "",
            widthCm: "",
            heightCm: "",
            depthCm: "",
            lines: [],
            notes: "",
            updatedAt: new Date().toISOString(),
        };
        updateActiveRoom((room) => ({
            ...room,
            walls: [...room.walls, newWall],
        }));
        setActiveWallId(newWall.id);
    };

    // Renderiza a Foto Carimbada com as Linhas que o usuário desenhou
    const renderStampedWallImage = async (
        wall: WallMeasurementData,
        roomName: string
    ): Promise<Blob | null> => {
        if (!activeProject) return null;
        const canvas = document.createElement("canvas");
        const isVert = canvasOrientation === "vertical";
        const width = isVert ? 1050 : 1400;
        const height = isVert ? 1400 : 950;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

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
        }

        ctx.fillStyle = "rgba(9, 13, 22, 0.85)";
        ctx.fillRect(0, 0, width, 64);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 20px sans-serif";
        const modeTxt =
            activeProject.measurementMode === "final"
                ? "MEDIDA FINAL"
                : "MEDIDA ORÇAMENTO";
        ctx.fillText(
            `BJL PLANEJADOS • ${activeProject.clientName} • ${roomName.toUpperCase()} - ${wall.name.toUpperCase()}${wall.subtitle ? ` (${wall.subtitle.toUpperCase()})` : ""} [${modeTxt}]`,
            24,
            40
        );

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

                ctx.fillStyle = spec.hex;
                ctx.beginPath();
                ctx.arc(x1, y1, 8, 0, Math.PI * 2);
                ctx.arc(x2, y2, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
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

            const mx = ln.kind === "pin" ? x1 : (x1 + x2) / 2;
            const my = ln.kind === "pin" ? y1 - 28 : (y1 + y2) / 2;
            const valText = ln.value?.trim()
                ? `${ln.value} ${ln.unit}`
                : "___ cm";
            const badgeText = ln.label?.trim()
                ? `${ln.label}: [ ${valText} ]`
                : `[ ${valText} ]`;

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

    const handleDownloadStampedPhoto = async () => {
        if (!activeWall || !activeRoom || !activeProject) return;
        const blob = await renderStampedWallImage(activeWall, activeRoom.name);
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Medicao_${activeProject.clientName.replace(/\s+/g, "_")}_${activeRoom.name}_${activeWall.name}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Foto com as medidas baixada!");
    };

    const buildRoomMeasurementsSummary = (room: RoomMeasurementData): string => {
        const wallSummaries = room.walls
            .map((w) => {
                const filledLines = w.lines.filter((l) => l.value.trim().length > 0);
                const mainDims = [
                    w.widthCm ? `Larg: ${w.widthCm}cm` : "",
                    w.heightCm ? `Alt: ${w.heightCm}cm` : "",
                    w.depthCm ? `Prof: ${w.depthCm}cm` : "",
                ]
                    .filter(Boolean)
                    .join(" x ");

                const linesTxt = filledLines
                    .map((l) =>
                        l.label?.trim()
                            ? `${l.label}: ${l.value}${l.unit}`
                            : `${l.value}${l.unit}`
                    )
                    .join(" | ");

                if (!mainDims && !linesTxt && !w.notes && !w.photoDataUrl) {
                    return null;
                }
                return `[${w.name}${w.subtitle ? ` - ${w.subtitle}` : ""}] ${mainDims ? `${mainDims} • ` : ""}${linesTxt}${w.notes ? ` (Obs: ${w.notes})` : ""}`;
            })
            .filter(Boolean);

        return wallSummaries.join(" // ");
    };

    const handleSaveToServiceOrder = async () => {
        if (!activeProject || !activeProject.clientName.trim()) {
            toast.error("Informe o nome do cliente primeiro.");
            return;
        }

        setIsSavingAction(true);
        try {
            await pushProjectsToCloud(savedProjects);

            let targetOS = serviceOrders.find(
                (o) =>
                    o.id === activeProject.serviceOrderId ||
                    (o.client || "").trim().toLowerCase() ===
                        activeProject.clientName.trim().toLowerCase()
            );

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
                            action: `${roomNames} (${activeProject.measurementMode === "final" ? "Medida Final" : "Medição"})`,
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
                        .map((l) =>
                            l.label?.trim()
                                ? `${l.label}: ${l.value}${l.unit}`
                                : `${l.value}${l.unit}`
                        )
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

            const technicalReport = activeProject.rooms
                .map((r) => {
                    const summary = buildRoomMeasurementsSummary(r);
                    return `📐 ${r.name.toUpperCase()} (${activeProject.measurementMode === "final" ? "MEDIDA FINAL" : "MEDIDA ORÇAMENTO"}):\n${summary || ""}`;
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
                `Fotos e medidas salvas na ${targetOS.ticket_number} (${targetOS.client})!`
            );
        } catch (err: any) {
            console.error("Erro ao salvar na OS:", err);
            toast.error(`Erro ao salvar na OS: ${err?.message || ""}`);
        } finally {
            setIsSavingAction(false);
        }
    };

    const handleSendToBudget = async () => {
        if (!activeProject || !activeProject.clientName.trim()) {
            toast.error("Informe o nome do cliente primeiro.");
            return;
        }

        setIsSavingAction(true);
        try {
            await pushProjectsToCloud(savedProjects);

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
                `[MEDIÇÃO TABLET - ${activeProject.measurementMode === "final" ? "MEDIDA FINAL" : "MEDIDA PARA ORÇAMENTO"}]`,
                ...activeProject.rooms.map(
                    (r) =>
                        `• ${r.name}: ${buildRoomMeasurementsSummary(r) || "Medidas registradas"}`
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
            toast.error(`Erro ao criar orçamento: ${err?.message || ""}`);
        } finally {
            setIsSavingAction(false);
        }
    };

    const filteredProjects = useMemo(() => {
        const q = clientSearch.trim().toLowerCase();
        if (!q) return savedProjects;
        return savedProjects.filter(
            (p) =>
                p.clientName.toLowerCase().includes(q) ||
                p.rooms.some((r) => r.name.toLowerCase().includes(q))
        );
    }, [savedProjects, clientSearch]);

    const phoneCameraUrl = useMemo(() => {
        if (!activeProject) return window.location.href;
        const origin = window.location.origin;
        return `${origin}/admin/medicao?proj=${encodeURIComponent(activeProject.id)}&room=${encodeURIComponent(activeRoom?.id || "")}&wall=${encodeURIComponent(activeWall?.id || "")}&camera=1`;
    }, [activeProject, activeRoom, activeWall]);

    // ============================================================================
    // TELA 1: LISTA DE CLIENTES FECHADA / TELA ZERADA (Quando nenhum cliente está aberto!)
    // ============================================================================
    if (!activeProject) {
        return (
            <div className="space-y-6 pb-12">
                {/* Cabeçalho da Tela Inicial Limpa */}
                <div className="executive-card border-metallic rounded-3xl p-6 bg-[#090d16]/95 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                            <Ruler className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight text-white">
                                Medição de Ambientes (Tablet & Celular)
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                As fotos e medidas ficam ocultas dentro da pasta de cada cliente. Clique em um cliente para abrir ou crie uma nova medição.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* BOTÃO EM DESTAQUE NA TELA INICIAL: VIRAR TELA PARA HORIZONTAL OU VERTICAL */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                handleToggleOrientation(
                                    isScreenRotatedHorizontal
                                        ? "vertical"
                                        : "horizontal"
                                )
                            }
                            className={cn(
                                "h-11 px-4 rounded-2xl text-xs font-black uppercase tracking-wider gap-2 transition-all",
                                isScreenRotatedHorizontal
                                    ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/25"
                                    : "border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300"
                            )}
                        >
                            <RotateCw className="h-4 w-4" />
                            {isScreenRotatedHorizontal
                                ? "Voltar p/ Vertical ↕"
                                : "Virar p/ Horizontal ↔"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSyncingCloud}
                            onClick={() => pullProjectsFromCloud(true)}
                            className="h-11 px-3.5 rounded-2xl border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold gap-1.5"
                            title="Sincronizar fotos e medições feitas no celular"
                        >
                            <RefreshCw
                                className={cn(
                                    "h-4 w-4 text-primary",
                                    isSyncingCloud && "animate-spin"
                                )}
                            />
                            Sincronizar
                        </Button>

                        <Button
                            type="button"
                            onClick={() => setIsNewMeasurementOpen(true)}
                            className="h-11 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs gap-2 shadow-xl shadow-amber-500/20"
                        >
                            <Plus className="h-4 w-4" />
                            Nova Medição
                        </Button>
                    </div>
                </div>

                {/* SE NÃO TIVER NENHUM CLIENTE: TELA 100% ZERADA */}
                {savedProjects.length === 0 ? (
                    <div className="executive-card border-metallic rounded-3xl p-12 bg-[#090d16]/80 border-dashed border-white/15 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-8 space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shadow-2xl">
                            <FolderOpen className="h-8 w-8" />
                        </div>
                        <div className="space-y-1.5">
                            <h2 className="text-lg font-black uppercase text-white">
                                Nenhuma Medição Aberta
                            </h2>
                            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                                Comece criando uma nova medição para o cliente. Você poderá tirar as fotos pelo celular (elas caem direto aqui no tablet) e puxar apenas as linhas de medida que precisar em cada parede (1 a 4).
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={() => setIsNewMeasurementOpen(true)}
                            className="h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs gap-2 shadow-xl shadow-amber-500/25"
                        >
                            <Plus className="h-5 w-5" />
                            Criar Nova Medição de Cliente
                        </Button>
                    </div>
                ) : (
                    /* LISTA DE PASTAS FECHADAS POR CLIENTE */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="relative flex-1 max-w-md">
                                <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <Input
                                    value={clientSearch}
                                    onChange={(e) =>
                                        setClientSearch(e.target.value)
                                    }
                                    placeholder="Buscar cliente ou ambiente..."
                                    className="pl-10 h-10 rounded-2xl bg-[#090d16] border-white/15 text-xs"
                                />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">
                                {filteredProjects.length} cliente(s) com medição salva
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredProjects.map((proj) => {
                                const totalPhotos = proj.rooms.reduce(
                                    (sum, r) =>
                                        sum +
                                        r.walls.filter((w) =>
                                            Boolean(w.photoDataUrl)
                                        ).length,
                                    0
                                );
                                const totalMeasures = proj.rooms.reduce(
                                    (sum, r) =>
                                        sum +
                                        r.walls.reduce(
                                            (ws, w) => ws + w.lines.length,
                                            0
                                        ),
                                    0
                                );

                                return (
                                    <div
                                        key={proj.id}
                                        onClick={() => {
                                            setActiveProjectId(proj.id);
                                            setActiveRoomId(
                                                proj.rooms[0]?.id || ""
                                            );
                                            setActiveWallId(
                                                proj.rooms[0]?.walls[0]?.id ||
                                                    ""
                                            );
                                            setIsPhoneCameraMode(false);
                                        }}
                                        className="executive-card border-metallic rounded-3xl p-5 bg-[#090d16]/90 hover:bg-[#0d1322] border border-white/10 hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between gap-4 shadow-xl"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                        <Folder className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-base font-black uppercase text-white truncate group-hover:text-primary transition-colors">
                                                            {proj.clientName}
                                                        </h3>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Atualizado em{" "}
                                                            {new Date(
                                                                proj.updatedAt
                                                            ).toLocaleDateString(
                                                                "pt-BR"
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[9px] font-black uppercase shrink-0",
                                                        proj.measurementMode ===
                                                            "final"
                                                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                                            : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                                                    )}
                                                >
                                                    {proj.measurementMode ===
                                                    "final"
                                                        ? "Medida Final"
                                                        : "Medida p/ Orçamento"}
                                                </Badge>
                                            </div>

                                            {/* Lista de ambientes ocultos dentro da pasta */}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {proj.rooms.map((r) => (
                                                    <span
                                                        key={r.id}
                                                        className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-white/80"
                                                    >
                                                        {r.name} (4 paredes)
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
                                                <span>📸 {totalPhotos} foto(s)</span>
                                                <span>📏 {totalMeasures} linha(s)</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveProjectId(
                                                            proj.id
                                                        );
                                                        setActiveRoomId(
                                                            proj.rooms[0]?.id ||
                                                                ""
                                                        );
                                                        setActiveWallId(
                                                            proj.rooms[0]
                                                                ?.walls[0]
                                                                ?.id || ""
                                                        );
                                                        setIsPhoneCameraMode(
                                                            true
                                                        );
                                                    }}
                                                    className="h-8 px-2.5 rounded-xl border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-[10px] font-black gap-1"
                                                    title="Abrir no modo câmera rápida do celular"
                                                >
                                                    <Smartphone className="h-3.5 w-3.5" />
                                                    Celular
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-8 px-3 rounded-xl bg-primary text-black font-black text-[10px] uppercase"
                                                >
                                                    Abrir
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteProject(
                                                            proj.id,
                                                            proj.clientName
                                                        );
                                                    }}
                                                    className="h-8 w-8 rounded-xl text-rose-400 hover:text-white hover:bg-rose-600"
                                                    title="Excluir medição deste cliente"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* MODAL: CRIAR NOVA MEDIÇÃO DE CLIENTE */}
                <Dialog
                    open={isNewMeasurementOpen}
                    onOpenChange={setIsNewMeasurementOpen}
                >
                    <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-base font-black uppercase">
                                Nova Medição de Cliente
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Escolha o cliente, o tipo de medida (Orçamento ou Final) e o primeiro ambiente. As paredes 1 a 4 virão limpas para você adicionar apenas as linhas que quiser.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                    Nome do Cliente
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newClientName}
                                        onChange={(e) =>
                                            setNewClientName(e.target.value)
                                        }
                                        placeholder="Digite o nome do cliente (ex: Mayara)..."
                                        className="bg-slate-900 border-white/15 text-xs font-bold"
                                        autoFocus
                                    />
                                    {clients.length > 0 && (
                                        <Select
                                            value={newClientId}
                                            onValueChange={(val) => {
                                                const found = clients.find(
                                                    (c) => c.id === val
                                                );
                                                if (found) {
                                                    setNewClientId(found.id);
                                                    setNewClientName(
                                                        found.name
                                                    );
                                                    setNewClientPhone(
                                                        found.phone || ""
                                                    );
                                                    setNewClientAddress(
                                                        found.address || ""
                                                    );
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-40 bg-slate-900 border-white/15 text-xs">
                                                <SelectValue placeholder="Já cadastrado..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-xs max-h-60">
                                                {clients.map((c) => (
                                                    <SelectItem
                                                        key={c.id}
                                                        value={c.id}
                                                    >
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                    Tipo de Medida
                                </Label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setNewMode("orcamento")}
                                        className={cn(
                                            "p-3 rounded-2xl border text-left transition-all",
                                            newMode === "orcamento"
                                                ? "bg-amber-500/20 border-amber-400 text-amber-200"
                                                : "bg-white/[0.03] border-white/10 text-white/70"
                                        )}
                                    >
                                        <p className="text-xs font-black uppercase">
                                            📐 Medida p/ Orçamento
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            Primeiro levantamento na casa do cliente
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewMode("final")}
                                        className={cn(
                                            "p-3 rounded-2xl border text-left transition-all",
                                            newMode === "final"
                                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                                                : "bg-white/[0.03] border-white/10 text-white/70"
                                        )}
                                    >
                                        <p className="text-xs font-black uppercase">
                                            🎯 Medida Final
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            Executiva / Produção / Projeto Arquiteto
                                        </p>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                    Primeiro Ambiente
                                </Label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {ROOM_PRESETS.map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => {
                                                setNewFirstRoomName(
                                                    preset.label
                                                );
                                                setNewFirstRoomType(
                                                    preset.type
                                                );
                                            }}
                                            className={cn(
                                                "p-2 rounded-xl border text-[11px] font-bold transition-all text-left truncate",
                                                newFirstRoomName ===
                                                    preset.label
                                                    ? "bg-primary/20 border-primary text-primary"
                                                    : "bg-white/[0.03] border-white/10 text-white/75"
                                            )}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsNewMeasurementOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirmNewMeasurement}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-black"
                            >
                                Criar e Abrir Medição
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ============================================================================
    // TELA 2: DENTRO DO CLIENTE SELECIONADO (Modo Câmera do Celular OU Modo Tablet)
    // ============================================================================
    return (
        <div
            className={cn(
                "flex flex-col gap-3.5 transition-all",
                isFullscreen
                    ? "fixed inset-0 z-[100] bg-[#06080f] p-3 sm:p-5 overflow-y-auto"
                    : "w-full pb-12"
            )}
        >
            {/* Inputs ocultos de câmera e galeria */}
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

            {/* BARRA SUPERIOR DO CLIENTE ABERTO */}
            <div className="executive-card border-metallic rounded-3xl p-3.5 bg-[#090d16]/95 shadow-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* Botão Voltar para Lista de Clientes (Ocultar) + Nome do Cliente */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setActiveProjectId(null);
                                setSearchParams({});
                            }}
                            className="h-10 px-3.5 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-xs font-black uppercase gap-1.5"
                        >
                            <ArrowLeft className="h-4 w-4 text-primary" />
                            Clientes
                        </Button>

                        <div className="flex items-center gap-2">
                            <Input
                                value={activeProject.clientName}
                                onChange={(e) =>
                                    updateActiveProject((p) => ({
                                        ...p,
                                        clientName: e.target.value,
                                    }))
                                }
                                className="h-10 text-sm font-black uppercase bg-slate-900 border-white/15 w-48 sm:w-60"
                                placeholder="Nome do Cliente"
                            />

                            {/* Alternador Medida p/ Orçamento vs Medida Final */}
                            <div className="inline-flex p-1 rounded-xl bg-black/60 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() =>
                                        updateActiveProject((p) => ({
                                            ...p,
                                            measurementMode: "orcamento",
                                        }))
                                    }
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                        activeProject.measurementMode ===
                                            "orcamento"
                                            ? "bg-amber-500 text-black"
                                            : "text-white/60 hover:text-white"
                                    )}
                                >
                                    📐 Orçamento
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
                                        "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                        activeProject.measurementMode ===
                                            "final"
                                            ? "bg-emerald-500 text-black"
                                            : "text-white/60 hover:text-white"
                                    )}
                                >
                                    🎯 Medida Final
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Botões de Ponte Celular -> Tablet + Orientação Horizontal/Vertical */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Alternar Modo Tablet (Desenho) vs Modo Câmera Celular */}
                        <div className="inline-flex p-1 rounded-xl bg-black/60 border border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsPhoneCameraMode(false)}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all",
                                    !isPhoneCameraMode
                                        ? "bg-primary text-black"
                                        : "text-white/60 hover:text-white"
                                )}
                            >
                                <Tablet className="h-3.5 w-3.5" />
                                Modo Tablet
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPhoneCameraMode(true)}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all",
                                    isPhoneCameraMode
                                        ? "bg-cyan-400 text-black"
                                        : "text-white/60 hover:text-white"
                                )}
                            >
                                <Smartphone className="h-3.5 w-3.5" />
                                Câmera Celular
                            </button>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsQrModalOpen(true)}
                            className="h-9 px-3 rounded-xl border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-black gap-1.5"
                            title="Conectar celular para tirar as fotos e enviar automático para este tablet"
                        >
                            <QrCode className="h-3.5 w-3.5" />
                            Foto pelo Celular
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSyncingCloud}
                            onClick={() => pullProjectsFromCloud(true)}
                            className="h-9 px-3 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-bold gap-1"
                            title="Puxar fotos recém-tiradas no celular"
                        >
                            <RefreshCw
                                className={cn(
                                    "h-3.5 w-3.5 text-primary",
                                    isSyncingCloud && "animate-spin"
                                )}
                            />
                            Atualizar
                        </Button>

                        {/* BOTÃO HORIZONTAL ↔ VERTICAL (GIRA A TELA DO TABLET) */}
                        <div className="inline-flex p-1 rounded-xl bg-black/60 border border-amber-500/30">
                            <button
                                type="button"
                                onClick={() =>
                                    handleToggleOrientation("horizontal")
                                }
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all",
                                    isScreenRotatedHorizontal
                                        ? "bg-amber-500 text-black"
                                        : "text-amber-300/80 hover:text-white"
                                )}
                                title="Virar a tela para o formato Horizontal (Deitado)"
                            >
                                <MoveHorizontal className="h-3.5 w-3.5" />
                                Horizontal
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    handleToggleOrientation("vertical")
                                }
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all",
                                    !isScreenRotatedHorizontal
                                        ? "bg-amber-500 text-black"
                                        : "text-amber-300/80 hover:text-white"
                                )}
                                title="Voltar a tela para o formato Vertical (Em pé)"
                            >
                                <MoveVertical className="h-3.5 w-3.5" />
                                Vertical
                            </button>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            className="h-9 w-9 rounded-xl border border-white/10 bg-white/5"
                            title={
                                isFullscreen
                                    ? "Sair da Tela Cheia"
                                    : "Tela Cheia no Tablet"
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

                {/* ABAS DE AMBIENTES DO CLIENTE */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">
                        Ambientes:
                    </span>
                    {activeProject.rooms.map((room) => {
                        const isActive = room.id === activeRoom?.id;
                        const photosCount = room.walls.filter((w) =>
                            Boolean(w.photoDataUrl)
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
                                            ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 text-amber-200 border-amber-400/70 shadow-md"
                                            : "bg-white/[0.03] text-white/70 border-white/10 hover:text-white"
                                    )}
                                >
                                    <span>{room.name}</span>
                                    {photosCount > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                                            📸 {photosCount}/4
                                        </span>
                                    )}
                                </button>
                                {isActive && activeProject.rooms.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeleteRoom(room.id)
                                        }
                                        className="ml-0.5 p-1.5 rounded-lg text-white/40 hover:text-rose-400"
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
                        <Plus className="h-3.5 w-3.5" />+ Ambiente
                    </Button>
                </div>

                {/* SUB-ABAS: PAREDE 1, PAREDE 2, PAREDE 3, PAREDE 4 */}
                {activeRoom && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 mr-1">
                                Paredes ({activeRoom.name}):
                            </span>
                            {activeRoom.walls.map((wall) => {
                                const isWallActive = wall.id === activeWall?.id;
                                return (
                                    <button
                                        key={wall.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveWallId(wall.id);
                                            setSelectedLineId(null);
                                        }}
                                        className={cn(
                                            "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border",
                                            isWallActive
                                                ? "bg-primary text-black border-primary shadow-md"
                                                : "bg-slate-900 text-white/75 border-white/10 hover:border-primary/40"
                                        )}
                                    >
                                        <span>
                                            {wall.name}
                                            {wall.subtitle
                                                ? ` (${wall.subtitle})`
                                                : ""}
                                        </span>
                                        {wall.photoDataUrl && (
                                            <span title="Foto recebida">
                                                📸
                                            </span>
                                        )}
                                        {wall.lines.length > 0 && (
                                            <span
                                                className={cn(
                                                    "text-[9px] px-1.5 py-0.5 rounded-full font-mono",
                                                    isWallActive
                                                        ? "bg-black/25 text-black font-black"
                                                        : "bg-white/10 text-white/70"
                                                )}
                                            >
                                                {wall.lines.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAddExtraWall}
                                className="h-8 px-2.5 rounded-xl border border-dashed border-white/15 text-[10px] font-bold text-white/70 hover:text-primary"
                            >
                                <Plus className="h-3 w-3 mr-1" />+ Parede
                            </Button>
                        </div>

                        {activeWall && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">
                                    Referência da {activeWall.name}:
                                </span>
                                <Input
                                    value={activeWall.subtitle || ""}
                                    onChange={(e) =>
                                        updateActiveWall((w) => ({
                                            ...w,
                                            subtitle: e.target.value,
                                        }))
                                    }
                                    placeholder="Ex: Guarda-Roupa, Janela, Porta..."
                                    className="h-8 text-xs w-48 bg-slate-900 border-white/15"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ============================================================================
                MODO CÂMERA RÁPIDA DO CELULAR (Para bater as fotos das Paredes 1 a 4 no celular
                e jogar direto para a tela grande do Tablet!)
               ============================================================================ */}
            {isPhoneCameraMode && activeRoom ? (
                <div className="executive-card border-metallic rounded-3xl p-5 bg-[#090d16]/95 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                                <Smartphone className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase text-white">
                                    Modo Câmera do Celular • {activeRoom.name}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Tire a foto de cada parede aqui pelo celular. Ela cai automaticamente na tela grande do seu Tablet em 2 segundos!
                                </p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPhoneCameraMode(false)}
                            className="rounded-xl border-primary/40 bg-primary/10 text-primary text-xs font-black gap-1.5"
                        >
                            <Tablet className="h-4 w-4" />
                            Ir para Modo Desenho (Tablet)
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeRoom.walls.map((wall) => {
                            const isThisUploading =
                                isUploadingPhoto && uploadingWallId === wall.id;
                            return (
                                <div
                                    key={wall.id}
                                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 flex flex-col justify-between"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black uppercase text-white">
                                            {wall.name}
                                            {wall.subtitle
                                                ? ` (${wall.subtitle})`
                                                : ""}
                                        </span>
                                        {wall.photoDataUrl ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                                                ✅ Foto no Tablet
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] text-white/50"
                                            >
                                                Sem foto
                                            </Badge>
                                        )}
                                    </div>

                                    {wall.photoDataUrl && (
                                        <div className="relative h-36 rounded-xl overflow-hidden border border-white/10 bg-black">
                                            <img
                                                src={wall.photoDataUrl}
                                                alt={wall.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            disabled={isUploadingPhoto}
                                            onClick={() => {
                                                targetWallForCaptureRef.current =
                                                    wall.id;
                                                cameraInputRef.current?.click();
                                            }}
                                            className="h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs gap-1.5"
                                        >
                                            {isThisUploading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Camera className="h-4 w-4" />
                                            )}
                                            {wall.photoDataUrl
                                                ? "Trocar Foto"
                                                : "Tirar Foto"}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isUploadingPhoto}
                                            onClick={() => {
                                                targetWallForCaptureRef.current =
                                                    wall.id;
                                                galleryInputRef.current?.click();
                                            }}
                                            className="h-12 rounded-xl border-white/15 bg-white/5 text-xs font-bold gap-1.5"
                                        >
                                            <FileImage className="h-4 w-4 text-amber-400" />
                                            Da Galeria
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* ============================================================================
                   MODO TABLET (QUADRO DE MEDIÇÃO LIMPO — VOCÊ ADICIONA SÓ AS LINHAS QUE QUISER!)
                   ============================================================================ */
                activeRoom &&
                activeWall && (
                    <div
                        className={cn(
                            "grid gap-4 items-start",
                            canvasOrientation === "horizontal"
                                ? "grid-cols-1"
                                : "grid-cols-1 lg:grid-cols-12"
                        )}
                    >
                        {/* QUADRO PRINCIPAL DA FOTO */}
                        <div
                            className={cn(
                                "executive-card border-metallic rounded-3xl p-4 bg-[#090d16]/95 space-y-3 shadow-2xl",
                                canvasOrientation === "horizontal"
                                    ? "w-full"
                                    : "lg:col-span-8"
                            )}
                        >
                            {/* Barra de Ferramentas da Foto: Puxar Linha, Girar Foto 90°, Câmera/Galeria */}
                            <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-white/10">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Botão Principal: PUXAR LINHA COM O DEDO */}
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            setIsDrawingNewLine(
                                                (prev) => !prev
                                            );
                                            setIsAddingPinMode(null);
                                            if (!isDrawingNewLine) {
                                                toast.info(
                                                    "Toque em um ponto da foto e arraste até o outro para criar sua linha!"
                                                );
                                            }
                                        }}
                                        className={cn(
                                            "h-10 px-4 rounded-xl text-xs font-black uppercase gap-1.5 shadow-lg",
                                            isDrawingNewLine
                                                ? "bg-emerald-500 text-black ring-2 ring-white animate-pulse"
                                                : "bg-amber-500 hover:bg-amber-400 text-black"
                                        )}
                                    >
                                        <Crosshair className="h-4 w-4" />
                                        {isDrawingNewLine
                                            ? "Arraste o dedo na foto..."
                                            : "+ Puxar Nova Linha na Foto"}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            addManualLineOrPin({
                                                kind: "line",
                                                label: "",
                                                color: "amber",
                                                horizontal: true,
                                            })
                                        }
                                        className="h-10 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold gap-1"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Linha Horizontal ↔
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            addManualLineOrPin({
                                                kind: "line",
                                                label: "",
                                                color: "amber",
                                                horizontal: false,
                                            })
                                        }
                                        className="h-10 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold gap-1"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Linha Vertical ↕
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            addManualLineOrPin({
                                                kind: "pin",
                                                label: "Tomada",
                                                color: "emerald",
                                            })
                                        }
                                        className="h-10 rounded-xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold gap-1"
                                    >
                                        <Zap className="h-3.5 w-3.5" />+ Ponto /
                                        Tomada
                                    </Button>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {activeWall.photoDataUrl && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isUploadingPhoto}
                                            onClick={handleRotateWallPhoto}
                                            className="h-9 px-3 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold gap-1.5"
                                            title="Girar a foto em 90 graus"
                                        >
                                            <RotateCw className="h-3.5 w-3.5 text-amber-400" />
                                            Girar Foto 90°
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            targetWallForCaptureRef.current =
                                                activeWall.id;
                                            galleryInputRef.current?.click();
                                        }}
                                        className="h-9 px-3 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold gap-1.5"
                                    >
                                        <FileImage className="h-3.5 w-3.5 text-amber-400" />
                                        Escolher Foto
                                    </Button>

                                    {activeWall.lines.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setShowLinesOverlay(
                                                    (prev) => !prev
                                                )
                                            }
                                            className="h-9 px-2.5 rounded-xl text-xs font-bold text-white/70"
                                        >
                                            {showLinesOverlay ? (
                                                <EyeOff className="h-3.5 w-3.5 mr-1" />
                                            ) : (
                                                <Eye className="h-3.5 w-3.5 mr-1" />
                                            )}
                                            {showLinesOverlay
                                                ? "Ocultar"
                                                : "Mostrar"}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* CANVAS DA FOTO (Horizontal 16:9 Amplo vs Vertical 3:4 Alto) */}
                            <div
                                ref={canvasContainerRef}
                                onPointerDown={handleCanvasPointerDown}
                                onPointerMove={handleCanvasPointerMove}
                                onPointerUp={handleCanvasPointerUp}
                                className={cn(
                                    "relative rounded-2xl overflow-hidden border-2 select-none touch-none transition-all mx-auto",
                                    canvasOrientation === "horizontal"
                                        ? "w-full aspect-[16/9] min-h-[420px] sm:min-h-[540px]"
                                        : "w-full max-w-[680px] aspect-[3/4] min-h-[540px] sm:min-h-[680px]",
                                    isDrawingNewLine || isAddingPinMode?.active
                                        ? "border-emerald-400 cursor-crosshair shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                                        : "border-white/15 bg-[#0d1322]"
                                )}
                            >
                                {activeWall.photoDataUrl ? (
                                    <img
                                        src={activeWall.photoDataUrl}
                                        alt={`${activeRoom.name} - ${activeWall.name}`}
                                        draggable={false}
                                        className="absolute inset-0 w-full h-full object-contain bg-black/90 pointer-events-none"
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
                                        <div className="relative z-10 max-w-md bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
                                            <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
                                                <Smartphone className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-black uppercase text-white">
                                                    {activeRoom.name} •{" "}
                                                    {activeWall.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Tire a foto desta parede pelo seu <strong>Celular</strong> (ela aparece aqui automaticamente em 2 segundos), escolha uma foto da galeria ou já puxe suas linhas de medida direto neste quadro!
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsQrModalOpen(true);
                                                    }}
                                                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-xl gap-1.5"
                                                >
                                                    <QrCode className="h-4 w-4" />
                                                    Tirar pelo Celular
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        targetWallForCaptureRef.current =
                                                            activeWall.id;
                                                        galleryInputRef.current?.click();
                                                    }}
                                                    className="border-white/15 text-xs rounded-xl gap-1.5"
                                                >
                                                    <FileImage className="h-4 w-4" />
                                                    Galeria / Arquivo
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
                                                        <line
                                                            x1={line.x1}
                                                            y1={line.y1}
                                                            x2={line.x2}
                                                            y2={line.y2}
                                                            stroke="rgba(0,0,0,0.8)"
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

                                        {drawingTempLine && (
                                            <line
                                                x1={drawingTempLine.x1}
                                                y1={drawingTempLine.y1}
                                                x2={drawingTempLine.x2}
                                                y2={drawingTempLine.y2}
                                                stroke="#10b981"
                                                strokeWidth="0.9"
                                                strokeDasharray="1.5 1.5"
                                            />
                                        )}
                                    </svg>
                                )}

                                {/* ALÇAS DE ARRASTE NAS PONTAS + CAIXINHAS [ ___ cm ] EM CIMA DA FOTO */}
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
                                                {line.kind === "line" && (
                                                    <>
                                                        <div
                                                            onPointerDown={(
                                                                e
                                                            ) =>
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
                                                                "absolute -translate-x-1/2 -translate-y-1/2 z-20 rounded-full border-2 bg-black/85 cursor-grab active:cursor-grabbing transition-transform",
                                                                isSelected
                                                                    ? "w-7 h-7 scale-110 ring-4 ring-amber-400/40"
                                                                    : "w-5 h-5 hover:scale-125"
                                                            )}
                                                            title="Arraste esta ponta da linha"
                                                        />
                                                        <div
                                                            onPointerDown={(
                                                                e
                                                            ) =>
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
                                                                "absolute -translate-x-1/2 -translate-y-1/2 z-20 rounded-full border-2 bg-black/85 cursor-grab active:cursor-grabbing transition-transform",
                                                                isSelected
                                                                    ? "w-7 h-7 scale-110 ring-4 ring-amber-400/40"
                                                                    : "w-5 h-5 hover:scale-125"
                                                            )}
                                                            title="Arraste esta ponta da linha"
                                                        />
                                                    </>
                                                )}

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
                                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    spec.hex,
                                                            }}
                                                        />
                                                    )}

                                                    {/* Nome opcional da linha */}
                                                    {isSelected ? (
                                                        <input
                                                            type="text"
                                                            value={line.label}
                                                            placeholder="Nome (opcional)"
                                                            onPointerDown={(
                                                                e
                                                            ) =>
                                                                e.stopPropagation()
                                                            }
                                                            onChange={(e) =>
                                                                updateLineLabel(
                                                                    line.id,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="bg-black/50 text-white text-[11px] font-black px-1.5 py-0.5 rounded border border-white/20 w-24 focus:outline-none focus:border-primary"
                                                        />
                                                    ) : line.label?.trim() ? (
                                                        <span className="text-[11px] font-black text-white whitespace-nowrap">
                                                            {line.label}:
                                                        </span>
                                                    ) : null}

                                                    {/* Valor da medida em cm */}
                                                    <div
                                                        onPointerDown={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        className="inline-flex items-center bg-black/80 border border-white/25 rounded-lg px-1.5 py-0.5"
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
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="___"
                                                            className={cn(
                                                                "w-14 bg-transparent text-center text-xs font-mono font-black focus:outline-none",
                                                                spec.text
                                                            )}
                                                        />
                                                        <span className="text-[10px] font-mono text-white/60 ml-0.5">
                                                            {line.unit}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onPointerDown={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteLine(line.id);
                                                        }}
                                                        className="p-1 rounded-md text-white/60 hover:text-white hover:bg-rose-600 transition-colors"
                                                        title="Apagar esta linha"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* PAINEL COMPACTO DE SALVAMENTO & OBSERVAÇÕES */}
                        <div
                            className={cn(
                                "executive-card border-metallic rounded-3xl p-4 bg-[#090d16]/95 space-y-4 shadow-2xl",
                                canvasOrientation === "horizontal"
                                    ? "w-full"
                                    : "lg:col-span-4"
                            )}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                        MDF Interno ({activeRoom.name})
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
                                        className="h-9 text-xs mt-1 bg-slate-900 border-white/15"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                        MDF Externo / Cor
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
                                        className="h-9 text-xs mt-1 bg-slate-900 border-white/15"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                        Observação da {activeWall.name}
                                    </Label>
                                    <Input
                                        value={activeWall.notes || ""}
                                        onChange={(e) =>
                                            updateActiveWall((w) => ({
                                                ...w,
                                                notes: e.target.value,
                                            }))
                                        }
                                        placeholder="Anotações livres desta parede..."
                                        className="h-9 text-xs mt-1 bg-slate-900 border-white/15"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                                {activeWall.photoDataUrl && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDownloadStampedPhoto}
                                        className="h-11 rounded-2xl border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold gap-1.5"
                                    >
                                        <Download className="h-4 w-4 text-primary" />
                                        Baixar Foto c/ Medidas
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSavingAction}
                                    onClick={handleSendToBudget}
                                    className="h-11 rounded-2xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-black uppercase tracking-wider text-xs gap-2"
                                >
                                    <Calculator className="h-4 w-4" />
                                    Enviar p/ Orçamentos
                                </Button>

                                <Button
                                    type="button"
                                    disabled={isSavingAction}
                                    onClick={handleSaveToServiceOrder}
                                    className="h-11 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs gap-2 shadow-xl shadow-amber-500/20"
                                >
                                    {isSavingAction ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ClipboardList className="h-4 w-4" />
                                    )}
                                    Salvar Fotos & Medidas na OS
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* MODAL: ADICIONAR NOVO AMBIENTE (Com Parede 1, 2, 3 e 4 limpas) */}
            <Dialog
                open={isNewRoomModalOpen}
                onOpenChange={setIsNewRoomModalOpen}
            >
                <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black uppercase">
                            Adicionar Ambiente
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Cria automaticamente Parede 1, Parede 2, Parede 3 e Parede 4 limpas.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ROOM_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() =>
                                        handleAddRoom(preset.label, preset.type)
                                    }
                                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-xs font-bold text-left transition-all"
                                >
                                    + {preset.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                Ou digite o nome do ambiente
                            </Label>
                            <Input
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                placeholder="Ex: Quarto Filha, Despensa..."
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
                            Criar Ambiente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: PONTE CELULAR -> TABLET (QR CODE + INSTRUÇÃO PASSO A PASSO) */}
            <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
                <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black uppercase flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-cyan-400" />
                            Tirar Foto pelo Celular ➔ Tablet
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Aponte a câmera do seu celular para o QR Code abaixo (ou abra a aba{" "}
                            <strong className="text-white">Medição</strong> no seu celular e clique em{" "}
                            <strong className="text-white">
                                {activeProject.clientName}
                            </strong>
                            ).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl mx-auto">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(phoneCameraUrl)}`}
                            alt="QR Code Câmera Celular"
                            className="w-48 h-48 object-contain"
                        />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
                        <p className="font-black uppercase text-[11px]">
                            Como funciona:
                        </p>
                        <p className="text-[11px] text-white/80 leading-relaxed">
                            1. No celular, ele já abre direto no{" "}
                            <strong>Modo Câmera Rápida</strong> deste cliente (
                            {activeProject.clientName}).
                            <br />
                            2. Você bate a foto da <strong>Parede 1, 2, 3 ou 4</strong> com a câmera boa do celular.
                            <br />
                            3. Em <strong>2 segundos</strong> a foto aparece sozinha aqui na tela grande do seu Tablet!
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={() => {
                                setIsQrModalOpen(false);
                                pullProjectsFromCloud(true);
                            }}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black"
                        >
                            Pronto! Já tirei a foto no celular
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MedicaoTablet;
