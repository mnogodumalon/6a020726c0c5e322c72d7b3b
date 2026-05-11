import { useDashboardData } from '@/hooks/useDashboardData';
import type { Testeingabe } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TesteingabeDialog } from '@/components/dialogs/TesteingabeDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconCalendar, IconHash,
  IconCircle, IconCircleDot, IconCircleCheck, IconClipboardList,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a020726c0c5e322c72d7b3b';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLUMNS = [
  {
    key: 'offen',
    label: 'Offen',
    icon: <IconCircle size={16} className="shrink-0" />,
    color: 'bg-amber-50 border-amber-200',
    headerColor: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'in_bearbeitung',
    label: 'In Bearbeitung',
    icon: <IconCircleDot size={16} className="shrink-0" />,
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'abgeschlossen',
    label: 'Abgeschlossen',
    icon: <IconCircleCheck size={16} className="shrink-0" />,
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100 text-green-800 border-green-200',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    key: null,
    label: 'Kein Status',
    icon: <IconCircle size={16} className="shrink-0 opacity-40" />,
    color: 'bg-muted/40 border-border',
    headerColor: 'bg-muted text-muted-foreground border-border',
    badgeColor: 'bg-muted text-muted-foreground',
  },
] as const;

type StatusKey = 'offen' | 'in_bearbeitung' | 'abgeschlossen' | null;

export default function DashboardOverview() {
  const { testeingabe, loading, error, fetchAll } = useDashboardData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Testeingabe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testeingabe | null>(null);
  const [createForStatus, setCreateForStatus] = useState<StatusKey>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Testeingabe[]> = {
      offen: [],
      in_bearbeitung: [],
      abgeschlossen: [],
      __none: [],
    };
    for (const item of testeingabe) {
      const key = item.fields.status?.key ?? '__none';
      if (key in map) map[key].push(item);
      else map.__none.push(item);
    }
    return map;
  }, [testeingabe]);

  const total = testeingabe.length;
  const offen = grouped.offen.length;
  const inBearbeitung = grouped.in_bearbeitung.length;
  const abgeschlossen = grouped.abgeschlossen.length;

  function openCreate(status: StatusKey) {
    setEditRecord(null);
    setCreateForStatus(status);
    setDialogOpen(true);
  }

  function openEdit(record: Testeingabe) {
    setEditRecord(record);
    setCreateForStatus(null);
    setDialogOpen(true);
  }

  async function handleSubmit(fields: Testeingabe['fields']) {
    if (editRecord) {
      await LivingAppsService.updateTesteingabeEntry(editRecord.record_id, fields);
    } else {
      await LivingAppsService.createTesteingabeEntry(fields);
    }
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteTesteingabeEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  }

  function getDefaultValues() {
    if (editRecord) return editRecord.fields;
    if (createForStatus !== null) {
      const opt = LOOKUP_OPTIONS.testeingabe?.status?.find((o: { key: string }) => o.key === createForStatus);
      return opt ? { status: opt } : undefined;
    }
    return undefined;
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Übersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Alle Einträge nach Status verwalten</p>
        </div>
        <Button onClick={() => openCreate(null)} className="shrink-0">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Neuer Eintrag
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(total)}
          description="Alle Einträge"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(offen)}
          description="Noch nicht begonnen"
          icon={<IconCircle size={18} className="text-amber-500" />}
        />
        <StatCard
          title="In Bearbeitung"
          value={String(inBearbeitung)}
          description="Aktiv"
          icon={<IconCircleDot size={18} className="text-blue-500" />}
        />
        <StatCard
          title="Abgeschlossen"
          value={String(abgeschlossen)}
          description="Fertig"
          icon={<IconCircleCheck size={18} className="text-green-500" />}
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((col) => {
          const items = col.key === null ? grouped.__none : grouped[col.key];
          return (
            <div key={col.key ?? '__none'} className={`flex flex-col rounded-2xl border ${col.color} overflow-hidden min-h-[200px]`}>
              {/* Column Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${col.headerColor}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {col.icon}
                  <span className="font-semibold text-sm truncate">{col.label}</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeColor}`}>
                    {items.length}
                  </span>
                </div>
                <button
                  onClick={() => openCreate(col.key as StatusKey)}
                  className="p-1 rounded-lg hover:bg-black/10 transition-colors shrink-0"
                  title="Neuer Eintrag"
                >
                  <IconPlus size={15} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-3 flex-1">
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
                    <IconClipboardList size={28} stroke={1.5} />
                    <p className="text-xs">Keine Einträge</p>
                  </div>
                )}
                {items.map((item) => (
                  <KanbanCard
                    key={item.record_id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}

                {/* Add button at bottom of column */}
                <button
                  onClick={() => openCreate(col.key as StatusKey)}
                  className="mt-1 w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors border border-dashed border-current/30"
                >
                  <IconPlus size={13} className="shrink-0" />
                  Hinzufügen
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <TesteingabeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); setCreateForStatus(null); }}
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues()}
        enablePhotoScan={AI_PHOTO_SCAN['Testeingabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Testeingabe']}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`"${deleteTarget?.fields.titel ?? 'Dieser Eintrag'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function KanbanCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Testeingabe;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-sm p-3 space-y-2 hover:shadow-md transition-shadow">
      {/* Title */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2 min-w-0 flex-1">
          {item.fields.titel ?? <span className="text-muted-foreground italic font-normal">Kein Titel</span>}
        </p>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Bearbeiten"
          >
            <IconPencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Löschen"
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>

      {/* Description */}
      {item.fields.beschreibung && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {item.fields.beschreibung}
        </p>
      )}

      {/* Meta: date + nummer */}
      <div className="flex items-center gap-3 flex-wrap">
        {item.fields.datum && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconCalendar size={11} className="shrink-0" />
            {formatDate(item.fields.datum)}
          </span>
        )}
        {item.fields.nummer != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconHash size={11} className="shrink-0" />
            {item.fields.nummer}
          </span>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
