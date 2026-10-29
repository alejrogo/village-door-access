import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import {
  ArchiveRestore,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { toast } from "sonner";

import { CodeDigits } from "@/components/code-digits";
import { LocationPicker } from "@/components/location-picker";
import { LocationQrCard } from "@/components/location-qr-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  adminLogout,
  archiveLocation,
  createLocation,
  getAdminSession,
  getAdminState,
  listAccessCodes,
  listVisits,
  renameLocation,
  restoreLocation,
  rotateCode,
} from "@/lib/access.functions";
import type {
  AccessCodeRow,
  AdminAccessState,
  VisitRow,
} from "@/lib/access.functions";
import {
  parseLocationSearch,
  pickAdminLocationId,
} from "@/lib/location-search";
import { rethrowPublic } from "@/lib/public-error";
import { formatDateTime, formatShortDateTime } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  validateSearch: parseLocationSearch,
  // Location focus comes from search. A locationId loaderDep would block the click.
  staleTime: 30_000,
  loader: async ({ location }) => {
    try {
      const session = await getAdminSession();
      if (!session.ok) {
        throw redirect({ to: "/login" });
      }
      const state = await getAdminState({
        data: {
          locationId: parseLocationSearch(
            location.search as Record<string, unknown>
          ).location,
        },
      });
      const locationId = state.selectedLocationId;
      const [visitData, codeData] = locationId
        ? await Promise.all([
            listVisits({ data: { locationId } }),
            listAccessCodes({ data: { locationId } }),
          ])
        : [
            { visits: [] as VisitRow[], todayCount: 0, totalCount: 0 },
            { codes: [] as AccessCodeRow[] },
          ];
      return { session, state, visitData, codeData };
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      rethrowPublic(error);
    }
  },
  component: AdminPage,
});

function mirrorAdminLoader(
  initial: {
    codeData: { codes: AccessCodeRow[] };
    state: AdminAccessState;
    visitData: { todayCount: number; totalCount: number; visits: VisitRow[] };
  },
  seenLoader: {
    codeData: { codes: AccessCodeRow[] };
    state: AdminAccessState;
    visitData: { todayCount: number; totalCount: number; visits: VisitRow[] };
  },
  apply: {
    setCodes: (codes: AccessCodeRow[]) => void;
    setRenameValue: (name: string) => void;
    setSeenLoader: (seen: typeof seenLoader) => void;
    setState: (state: AdminAccessState) => void;
    setTodayCount: (count: number) => void;
    setTotalCount: (count: number) => void;
    setVisits: (visits: VisitRow[]) => void;
  }
) {
  if (
    seenLoader.state === initial.state &&
    seenLoader.visitData === initial.visitData &&
    seenLoader.codeData === initial.codeData
  ) {
    return;
  }
  apply.setSeenLoader({
    codeData: initial.codeData,
    state: initial.state,
    visitData: initial.visitData,
  });
  apply.setState(initial.state);
  apply.setVisits(initial.visitData.visits);
  apply.setTodayCount(initial.visitData.todayCount);
  apply.setTotalCount(initial.visitData.totalCount);
  apply.setCodes(initial.codeData.codes);
  apply.setRenameValue(
    initial.state.locations.find(
      (row) => row.id === initial.state.selectedLocationId
    )?.name ?? ""
  );
}

function AdminPage() {
  const initial = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const navigate = Route.useNavigate();
  const [state, setState] = useState(initial.state);
  const [busy, setBusy] = useState(false);
  const [visits, setVisits] = useState<VisitRow[]>(initial.visitData.visits);
  const [todayCount, setTodayCount] = useState(initial.visitData.todayCount);
  const [totalCount, setTotalCount] = useState(initial.visitData.totalCount);
  const [codes, setCodes] = useState<AccessCodeRow[]>(initial.codeData.codes);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameValue, setRenameValue] = useState(
    initial.state.locations.find(
      (row) => row.id === initial.state.selectedLocationId
    )?.name ?? ""
  );
  const [seenLoader, setSeenLoader] = useState({
    codeData: initial.codeData,
    state: initial.state,
    visitData: initial.visitData,
  });
  mirrorAdminLoader(initial, seenLoader, {
    setCodes,
    setRenameValue,
    setSeenLoader,
    setState,
    setTodayCount,
    setTotalCount,
    setVisits,
  });

  const selectedId =
    pickAdminLocationId(state.locations, search.location) ?? "";
  const selected = state.locations.find((row) => row.id === selectedId);
  const locationDataReady = state.selectedLocationId === selectedId;

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingLists(true);
      try {
        const [next, visitData, codeData] = await Promise.all([
          getAdminState({ data: { locationId: selectedId } }),
          listVisits({ data: { locationId: selectedId } }),
          listAccessCodes({ data: { locationId: selectedId } }),
        ]);
        if (cancelled) {
          return;
        }
        setState(next);
        setRenameValue(
          next.locations.find((row) => row.id === next.selectedLocationId)
            ?.name ?? ""
        );
        setVisits(visitData.visits);
        setTodayCount(visitData.todayCount);
        setTotalCount(visitData.totalCount);
        setCodes(codeData.codes);
      } catch {
        if (!cancelled) {
          toast.error("No se ha podido cargar el registro.");
        }
      }
      if (!cancelled) {
        setLoadingLists(false);
      }
    };
    load().catch(() => {
      if (!cancelled) {
        toast.error("No se ha podido cargar el registro.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const refreshState = useCallback(
    async (locationId = selectedId) => {
      const next = await getAdminState({ data: { locationId } });
      setState(next);
      setRenameValue(
        next.locations.find((row) => row.id === next.selectedLocationId)
          ?.name ?? ""
      );
      return next;
    },
    [selectedId]
  );

  const onSelectLocation = useCallback(
    async (locationId: string) => {
      setConfirmRotate(false);
      setVisits([]);
      setCodes([]);
      setRenameValue(
        state.locations.find((row) => row.id === locationId)?.name ?? ""
      );
      await navigate({ search: { location: locationId } });
    },
    [navigate, state.locations]
  );

  const onRenameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setRenameValue(event.target.value);
  }, []);

  const onNewNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setNewName(event.target.value);
    },
    []
  );

  const onRotate = useCallback(async () => {
    if (!selectedId || selected?.archived) {
      return;
    }
    if (!confirmRotate) {
      setConfirmRotate(true);
      window.setTimeout(() => setConfirmRotate(false), 4000);
      return;
    }
    setBusy(true);
    try {
      const next = await rotateCode({ data: { locationId: selectedId } });
      setState((prev) => ({
        ...prev,
        code: next.code,
        rotatedAt: next.rotatedAt,
      }));
      setConfirmRotate(false);
      const codeData = await listAccessCodes({
        data: { locationId: selectedId },
      });
      setCodes(codeData.codes);
      toast.success("Código nuevo generado.");
      await router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se ha podido rotar el código."
      );
    }
    setBusy(false);
  }, [confirmRotate, router, selected?.archived, selectedId]);

  const onLogout = useCallback(async () => {
    await adminLogout();
    await router.invalidate();
    await router.navigate({ to: "/login" });
  }, [router]);

  const onCreate = useCallback(async () => {
    setBusy(true);
    try {
      const result = await createLocation({ data: { name: newName } });
      if (result.ok) {
        setNewName("");
        toast.success("Ubicación creada.");
        await refreshState(result.location.id);
        await navigate({ search: { location: result.location.id } });
        await router.invalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("No se ha podido crear la ubicación.");
    }
    setBusy(false);
  }, [navigate, newName, refreshState, router]);

  const onCreateSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      await onCreate();
    },
    [onCreate]
  );

  const onRename = useCallback(async () => {
    if (!selectedId) {
      return;
    }
    setBusy(true);
    try {
      const result = await renameLocation({
        data: { locationId: selectedId, name: renameValue },
      });
      if (result.ok) {
        toast.success("Nombre actualizado.");
        await refreshState(selectedId);
        await router.invalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("No se ha podido cambiar el nombre.");
    }
    setBusy(false);
  }, [refreshState, renameValue, router, selectedId]);

  const onArchiveToggle = useCallback(async () => {
    if (!(selectedId && selected)) {
      return;
    }
    setBusy(true);
    try {
      const result = selected.archived
        ? await restoreLocation({ data: { locationId: selectedId } })
        : await archiveLocation({ data: { locationId: selectedId } });
      if (result.ok) {
        toast.success(
          selected.archived ? "Ubicación restaurada." : "Ubicación archivada."
        );
        const next = await refreshState(selectedId);
        await navigate({
          search: { location: next.selectedLocationId ?? undefined },
        });
        await router.invalidate();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("No se ha podido actualizar la ubicación.");
    }
    setBusy(false);
  }, [navigate, refreshState, router, selected, selectedId]);

  const activeCount = state.locations.filter((row) => !row.archived).length;

  return (
    <main className="stagger-in flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Gestión
          </h1>
          <VisitCountLine
            ready={locationDataReady}
            todayCount={todayCount}
            totalCount={totalCount}
          />
        </div>
        <Button onClick={onLogout} size="sm" type="button" variant="ghost">
          <LogOut data-icon="inline-start" />
          Salir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle size="lg">Ubicaciones</CardTitle>
          <CardDescription>
            Cada ubicación es una puerta, con su propio código.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <LocationPicker
              locations={state.locations}
              onChange={onSelectLocation}
              value={selectedId}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-location">Nombre</Label>
              <div className="flex gap-2">
                <Input
                  id="rename-location"
                  maxLength={40}
                  onChange={onRenameChange}
                  value={renameValue}
                />
                <Button
                  className="h-11"
                  disabled={busy || renameValue.trim() === selected?.name}
                  onClick={onRename}
                  type="button"
                  variant="outline"
                >
                  Guardar
                </Button>
              </div>
            </div>
            <div>
              <Button
                disabled={busy || (!selected?.archived && activeCount <= 1)}
                onClick={onArchiveToggle}
                size="sm"
                type="button"
                variant="ghost"
              >
                <ArchiveRestore data-icon="inline-start" />
                {selected?.archived ? "Restaurar" : "Archivar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selected && !selected.archived ? (
        <LocationQrCard locationId={selected.id} locationName={selected.name} />
      ) : null}

      <CurrentCodeCard
        archived={Boolean(selected?.archived)}
        busy={busy}
        code={state.code}
        confirmRotate={confirmRotate}
        onRotate={onRotate}
        ready={locationDataReady}
        rotatedAt={state.rotatedAt}
      />

      {initial.session.emailConfigured ? (
        <p className="rounded-xl bg-chip px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Cada visita envía un correo con el nombre, la ubicación, el código y
          la fecha.
        </p>
      ) : null}

      <HistorySection
        emptyDescription="Cada vez que se rote el código, quedará aquí."
        emptyTitle="Todavía no hay historial"
        loading={loadingLists && codes.length === 0}
        title="Códigos"
      >
        {codes.map((item) => (
          <li
            className="rounded-xl bg-surface px-4 py-3 shadow-paper"
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-xl font-medium tracking-wide tabular-nums">
                  {item.code}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.endedAt
                    ? `${formatShortDateTime(item.startedAt)} — ${formatShortDateTime(item.endedAt)}`
                    : `Desde ${formatShortDateTime(item.startedAt)}`}
                </p>
              </div>
              {item.endedAt ? null : (
                <span className="shrink-0 rounded-full bg-chip px-2 py-0.5 text-xs font-medium tracking-wide text-ok uppercase">
                  Vigente
                </span>
              )}
            </div>
          </li>
        ))}
      </HistorySection>

      <HistorySection
        emptyDescription="Cuando alguien deje su nombre en la entrada, aparecerá aquí."
        emptyTitle="Todavía no hay visitas"
        loading={loadingLists && visits.length === 0}
        title="Registro de visitas"
      >
        {visits.map((visit) => (
          <li
            className="rounded-xl bg-surface px-4 py-3 shadow-paper"
            key={visit.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{visit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDateTime(visit.visitedAt)} · código {visit.code}
                </p>
              </div>
              <span
                className={
                  visit.emailSent
                    ? "shrink-0 rounded-full bg-chip px-2 py-0.5 text-xs font-medium tracking-wide text-ok uppercase"
                    : "shrink-0 rounded-full bg-chip px-2 py-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                }
              >
                {visit.emailSent ? "Enviado" : "Guardado"}
              </span>
            </div>
          </li>
        ))}
      </HistorySection>

      <Card>
        <CardHeader>
          <CardTitle size="lg">Nueva ubicación</CardTitle>
          <CardDescription>
            Añade otra puerta, con su propio código.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={onCreateSubmit}>
            <Input
              id="new-location"
              maxLength={40}
              onChange={onNewNameChange}
              placeholder="Pabellón"
              value={newName}
            />
            <Button
              aria-label="Añadir ubicación"
              className="h-11"
              disabled={busy || newName.trim().length < 2}
              type="submit"
              variant="outline"
            >
              <Plus data-icon="inline-start" />
              Añadir
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link className="underline-offset-2 hover:underline" to="/">
          Volver al código
        </Link>
      </p>
    </main>
  );
}

function VisitCountLine({
  ready,
  todayCount,
  totalCount,
}: {
  ready: boolean;
  todayCount: number;
  totalCount: number;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {ready
        ? `Hoy: ${todayCount} ${todayCount === 1 ? "visita" : "visitas"} · Total: ${totalCount}`
        : "Cargando registro…"}
    </p>
  );
}

function CurrentCodeCard({
  archived,
  busy,
  code,
  confirmRotate,
  onRotate,
  ready,
  rotatedAt,
}: {
  archived: boolean;
  busy: boolean;
  code: string;
  confirmRotate: boolean;
  onRotate: () => void;
  ready: boolean;
  rotatedAt: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Código actual</CardTitle>
        <CardDescription>
          {ready
            ? `Rotado el ${formatDateTime(rotatedAt)}`
            : "Cargando código…"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CodeDigits code={ready ? code : undefined} size="md" />
        {archived ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Esta ubicación está archivada. No aparece en la entrada.
          </p>
        ) : (
          <>
            <Button
              className="mt-4 w-full"
              disabled={busy || !ready}
              onClick={onRotate}
              size="lg"
              type="button"
              variant={confirmRotate ? "destructive" : "default"}
            >
              <RotateIcon busy={busy} confirm={confirmRotate} />
              Rotar código
            </Button>
            {confirmRotate ? (
              <p className="mt-2 text-xs text-muted-foreground">
                El código anterior dejará de abrir la puerta.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HistorySection({
  title,
  loading,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const count = items.filter(Boolean).length;
  let body: ReactNode;
  if (loading) {
    body = <p className="text-sm text-muted-foreground">Cargando registro…</p>;
  } else if (count === 0) {
    body = (
      <Card>
        <CardHeader>
          <CardTitle size="lg">{emptyTitle}</CardTitle>
          <CardDescription>{emptyDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  } else {
    body = (
      <ScrollArea history>
        <ul className="flex flex-col gap-2 pe-4">{children}</ul>
      </ScrollArea>
    );
  }
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-medium">{title}</h2>
      {body}
    </section>
  );
}

function RotateIcon({ busy, confirm }: { busy: boolean; confirm: boolean }) {
  if (busy) {
    return <LoaderCircle className="animate-spin" data-icon="inline-start" />;
  }
  if (confirm) {
    return <TriangleAlert data-icon="inline-start" />;
  }
  return <RefreshCw data-icon="inline-start" />;
}
