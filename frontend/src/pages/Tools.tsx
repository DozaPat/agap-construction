import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from 'react';
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowUpAZ,
  CheckCircle2,
  Edit3,
  PackageCheck,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import axios from 'axios';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import NumberedPagination from '../components/NumberedPagination';
import ProjectLifecycleNotice from '../components/ProjectLifecycleNotice';
import { isProjectOperational, projectLifecycleMessage, type ProjectStatus } from '../lib/projectLifecycle';

interface Project {
  _id: string;
  name: string;
  status: ProjectStatus;
  workers?: Array<string | { _id: string }>;
}

interface Worker {
  _id: string;
  name: string;
  position: string;
  status: 'active' | 'inactive';
  assignedProjects?: Array<string | { _id: string }>;
}

interface Tool {
  _id: string;
  toolId: string;
  name: string;
  category: string;
  quantity: number;
  condition: 'good' | 'needs repair' | 'damaged';
  status: 'available' | 'in-use' | 'under-maintenance';
  project?: Project;
  assignedTo?: Worker | null;
  expectedReturnDate?: string | null;
  notes?: string;
}

type SortKey = 'toolId' | 'name' | 'category' | 'quantity' | 'condition' | 'status' | 'assignedTo';
type Direction = 'asc' | 'desc';

interface ToolSummary {
  total: number;
  available: number;
  repair: number;
  inUse: number;
}

interface ToolsPanelValue {
  selectedProjectId: string;
  projects: Project[];
  tools: Tool[];
  summary: ToolSummary;
  selectedProject?: Project;
  projectOperational: boolean;
  loadingTools: boolean;
  search: string;
  categoryFilter: string;
  conditionFilter: string;
  statusFilter: string;
  sort: { key: SortKey; direction: Direction };
  visibleTools: Tool[];
  isAdmin: boolean;
  onProjectChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSort: (key: SortKey) => void;
  onCheckout: (tool: Tool) => void;
  onEdit: (tool: Tool) => void;
  onCheckin: (tool: Tool) => void;
  onDelete: (tool: Tool) => void;
}

const categories = [
  'Power Tool', 'Hand Tool', 'Safety Equipment', 'Measuring Tool', 'Cutting Tool',
  'Welding Tool', 'Plumbing Tool', 'Electrical Tool', 'Other'
];

const emptyForm = {
  name: '',
  category: '',
  quantity: '1',
  condition: 'good' as Tool['condition'],
  notes: ''
};

const today = () => new Date().toISOString().slice(0, 10);
const relationId = (value: string | { _id: string }) => typeof value === 'string' ? value : value._id;
const titleCase = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  : '-';
const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

const conditionClass = (condition: Tool['condition']) => {
  if (condition === 'good') return 'bg-emerald-100 text-emerald-700';
  if (condition === 'needs repair') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const statusClass = (status: Tool['status']) => {
  if (status === 'available') return 'bg-blue-100 text-blue-700';
  if (status === 'in-use') return 'bg-violet-100 text-violet-700';
  return 'bg-amber-100 text-amber-700';
};

const KpiCard = ({ label, value, note, icon, tone }: {
  label: string;
  value: number;
  note: string;
  icon: ReactNode;
  tone: 'slate' | 'green' | 'amber' | 'blue';
}) => {
  const toneClasses = {
    slate: ['border-slate-400', 'bg-slate-100 text-slate-700'],
    green: ['border-emerald-500', 'bg-emerald-100 text-emerald-700'],
    amber: ['border-amber-500', 'bg-amber-100 text-amber-700'],
    blue: ['border-blue-500', 'bg-blue-100 text-blue-700']
  }[tone];
  return (
    <article className={`min-w-0 rounded-3xl border-l-4 bg-white p-5 shadow-sm sm:p-6 ${toneClasses[0]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold text-slate-900 sm:text-4xl" title={String(value)}>
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl p-3 ${toneClasses[1]}`}>{icon}</div>
      </div>
      <p className="mt-4 truncate text-sm text-slate-500" title={note}>{note}</p>
    </article>
  );
};

const FilterSelect = ({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) => (
  <select
    aria-label={`Filter by ${label}`}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-900 px-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-amber-400"
  >
    <option value="all">All {label === 'Category' ? 'Categories' : `${label}s`}</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
);

const SortHeader = ({ label, sortKey, sort, onSort }: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: Direction };
  onSort: (key: SortKey) => void;
}) => {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowDownUp : sort.direction === 'asc' ? ArrowDownAZ : ArrowUpAZ;
  return (
    <th className="px-5 py-5 text-left text-sm font-semibold">
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-2 whitespace-nowrap hover:text-amber-300">
        {label}<Icon className="h-4 w-4" />
      </button>
    </th>
  );
};

const ModalShell = ({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 sm:p-5">
    <section className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border-t-8 border-amber-500 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-6 w-6" />
        </button>
      </header>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  </div>
);

const ModalActions = ({ submitting, submitLabel, onCancel }: {
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}) => (
  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
    <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
    <button type="submit" disabled={submitting} className="rounded-2xl bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
      {submitting ? 'Saving...' : submitLabel}
    </button>
  </div>
);

const ModalError = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</div>
);

const Tools = () => {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingTools, setLoadingTools] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({ key: 'name', direction: 'asc' });
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [checkoutTool, setCheckoutTool] = useState<Tool | null>(null);
  const [checkoutProjectId, setCheckoutProjectId] = useState('');
  const [checkoutWorkerId, setCheckoutWorkerId] = useState('');
  const [checkoutDate, setCheckoutDate] = useState(today());
  const [returnDate, setReturnDate] = useState('');
  const [checkinTool, setCheckinTool] = useState<Tool | null>(null);
  const [returnCondition, setReturnCondition] = useState<'good' | 'needs repair'>('good');
  const [deleteTool, setDeleteTool] = useState<Tool | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedProject = projects.find((project) => project._id === selectedProjectId);
  const projectOperational = isProjectOperational(selectedProject);
  const operationalProjects = projects.filter(isProjectOperational);
  const resetMessages = () => { setError(''); setNotice(''); };

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [projectResponse, workerResponse] = await Promise.all([
          api.get<Project[]>('/projects'), api.get<Worker[]>('/workers')
        ]);
        setProjects(projectResponse.data);
        setWorkers(workerResponse.data);
      } catch (requestError) {
        console.error(requestError);
        setError('Unable to load projects and workers. Please refresh the page.');
      } finally { setLoadingBase(false); }
    };
    void loadBaseData();
  }, []);

  const loadTools = useCallback(async () => {
    if (!selectedProjectId) { setTools([]); return; }
    setLoadingTools(true);
    try {
      const response = await api.get<Tool[]>('/tools', { params: { project: selectedProjectId } });
      setTools(response.data);
    } catch (requestError) {
      console.error(requestError);
      setError('Unable to load tools for this project.');
    } finally { setLoadingTools(false); }
  }, [selectedProjectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTools(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTools]);

  const assignedWorkers = useMemo(() => {
    const project = projects.find((item) => item._id === checkoutProjectId);
    const projectWorkerIds = new Set((project?.workers || []).map(relationId));
    return workers.filter((worker) => worker.status === 'active' && (
      (worker.assignedProjects || []).some((assigned) => relationId(assigned) === checkoutProjectId) ||
      projectWorkerIds.has(worker._id)
    ));
  }, [checkoutProjectId, projects, workers]);

  const summary = useMemo(() => ({
    total: tools.reduce((sum, tool) => sum + tool.quantity, 0),
    available: tools.filter((tool) => tool.status === 'available').reduce((sum, tool) => sum + tool.quantity, 0),
    repair: tools.filter((tool) => tool.condition !== 'good' || tool.status === 'under-maintenance').reduce((sum, tool) => sum + tool.quantity, 0),
    inUse: tools.filter((tool) => tool.status === 'in-use').reduce((sum, tool) => sum + tool.quantity, 0)
  }), [tools]);

  const visibleTools = useMemo(() => {
    const term = search.trim().toLowerCase();
    const valueFor = (tool: Tool): string | number => sort.key === 'assignedTo' ? tool.assignedTo?.name || '' : tool[sort.key];
    return tools.filter((tool) =>
      (!term || tool.name.toLowerCase().includes(term) || tool.toolId.toLowerCase().includes(term) || tool.assignedTo?.name.toLowerCase().includes(term)) &&
      (categoryFilter === 'all' || tool.category === categoryFilter) &&
      (conditionFilter === 'all' || tool.condition === conditionFilter) &&
      (statusFilter === 'all' || tool.status === statusFilter)
    ).sort((left, right) => {
      const leftValue = valueFor(left); const rightValue = valueFor(right);
      const result = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? result : -result;
    });
  }, [tools, search, categoryFilter, conditionFilter, statusFilter, sort]);

  const changeSort = (key: SortKey) => setSort((current) => ({
    key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
  }));

  const openCreate = () => {
    if (!projectOperational) return;
    resetMessages(); setEditingTool(null); setForm(emptyForm); setFormOpen(true);
  };
  const openEdit = (tool: Tool) => {
    if (!projectOperational) return;
    resetMessages(); setEditingTool(tool);
    setForm({ name: tool.name, category: tool.category, quantity: String(tool.quantity), condition: tool.condition, notes: tool.notes || '' });
    setFormOpen(true);
  };

  const saveTool = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedProjectId || submitting) return;
    setSubmitting(true); resetMessages();
    try {
      const payload = { ...form, quantity: Number(form.quantity), project: selectedProjectId };
      if (editingTool) { await api.put(`/tools/${editingTool._id}`, payload); setNotice('Tool updated successfully.'); }
      else { await api.post('/tools', payload); setNotice('Tool added successfully.'); }
      setFormOpen(false); await loadTools();
    } catch (requestError: unknown) { setError(errorMessage(requestError, 'Unable to save the tool.')); }
    finally { setSubmitting(false); }
  };

  const openCheckout = (tool: Tool) => {
    if (!projectOperational) return;
    resetMessages(); setCheckoutTool(tool); setCheckoutProjectId(selectedProjectId);
    setCheckoutWorkerId(''); setCheckoutDate(today()); setReturnDate('');
  };

  const submitCheckout = async (event: FormEvent) => {
    event.preventDefault(); if (!checkoutTool || submitting) return;
    setSubmitting(true); resetMessages();
    try {
      await api.post(`/tools/${checkoutTool._id}/check-out`, {
        project: checkoutProjectId, worker: checkoutWorkerId, checkoutDate, expectedReturnDate: returnDate
      });
      setCheckoutTool(null); setNotice('Tool checked out successfully.'); await loadTools();
    } catch (requestError: unknown) { setError(errorMessage(requestError, 'Unable to check out the tool.')); }
    finally { setSubmitting(false); }
  };

  const submitCheckin = async (event: FormEvent) => {
    event.preventDefault(); if (!checkinTool || submitting) return;
    setSubmitting(true); resetMessages();
    try {
      await api.post(`/tools/${checkinTool._id}/check-in`, { condition: returnCondition });
      setCheckinTool(null); setNotice('Tool checked in successfully.'); await loadTools();
    } catch (requestError: unknown) { setError(errorMessage(requestError, 'Unable to check in the tool.')); }
    finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTool || submitting) return; setSubmitting(true); resetMessages();
    try {
      await api.delete(`/tools/${deleteTool._id}`); setDeleteTool(null);
      setNotice('Tool deleted successfully.'); await loadTools();
    } catch (requestError: unknown) { setError(errorMessage(requestError, 'Unable to delete the tool.')); }
    finally { setSubmitting(false); }
  };

  if (loadingBase) return <div className="p-12 text-center text-slate-500">Loading tools workspace...</div>;

  return (
    <div className="mx-auto w-full max-w-[1500px] pb-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Tools Management</h1>
          <p className="mt-1 text-slate-600">Track project equipment, custody, and returns</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={openCreate} disabled={!selectedProjectId || !projectOperational}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto">
            <Plus className="h-5 w-5" /> Add Tool
          </button>
        )}
      </div>

      {(error || notice) && (
        <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm font-medium ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || notice}
        </div>
      )}

      <ToolsPanel value={{
        selectedProjectId, projects, tools, summary, selectedProject, projectOperational, loadingTools,
        search, categoryFilter, conditionFilter, statusFilter, sort, visibleTools, isAdmin,
        onProjectChange: (projectId: string) => {
          setSelectedProjectId(projectId); setSearch(''); setCategoryFilter('all');
          setConditionFilter('all'); setStatusFilter('all'); resetMessages();
        },
        onSearchChange: setSearch,
        onCategoryChange: setCategoryFilter,
        onConditionChange: setConditionFilter,
        onStatusChange: setStatusFilter,
        onSort: changeSort,
        onCheckout: openCheckout,
        onEdit: openEdit,
        onCheckin: (tool: Tool) => { resetMessages(); setCheckinTool(tool); setReturnCondition('good'); },
        onDelete: setDeleteTool
      }} />

      {formOpen && isAdmin && (
        <ModalShell title={editingTool ? 'Edit Tool' : 'Add Tool'} subtitle={selectedProject?.name} onClose={() => setFormOpen(false)}>
          <form onSubmit={saveTool} className="space-y-5">
            {error && <ModalError message={error} />}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Tool Name</label>
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-input" placeholder="e.g., Jack Hammer" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                <select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="form-input">
                  <option value="">Choose a category...</option>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Quantity</label>
                <input required type="number" min="1" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="form-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Condition</label>
                <select value={form.condition} disabled={editingTool?.status === 'in-use'} onChange={(event) => setForm({ ...form, condition: event.target.value as Tool['condition'] })} className="form-input disabled:cursor-not-allowed disabled:opacity-60">
                  <option value="good">Good</option><option value="needs repair">Needs Repair</option><option value="damaged">Damaged</option>
                </select>
                {editingTool?.status === 'in-use' && <p className="mt-2 text-xs text-slate-500">Use Check In to record the returning condition.</p>}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
              <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="form-input resize-none" placeholder="Optional maintenance or identification notes" />
            </div>
            <ModalActions submitting={submitting} submitLabel={editingTool ? 'Update Tool' : 'Add Tool'} onCancel={() => setFormOpen(false)} />
          </form>
        </ModalShell>
      )}

      {checkoutTool && isAdmin && (
        <ModalShell title="Check Out Tool" subtitle={`${checkoutTool.toolId} - ${checkoutTool.name}`} onClose={() => setCheckoutTool(null)}>
          <form onSubmit={submitCheckout} className="space-y-5">
            {error && <ModalError message={error} />}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Project</label>
              <select required value={checkoutProjectId} onChange={(event) => { setCheckoutProjectId(event.target.value); setCheckoutWorkerId(''); }} className="form-input">
                <option value="">Choose a project...</option>
                {operationalProjects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Assigned Worker</label>
              <select required value={checkoutWorkerId} onChange={(event) => setCheckoutWorkerId(event.target.value)} className="form-input">
                <option value="">Choose an active assigned worker...</option>
                {assignedWorkers.map((worker) => <option key={worker._id} value={worker._id}>{worker.name} - {worker.position}</option>)}
              </select>
              {checkoutProjectId && assignedWorkers.length === 0 && <p className="mt-2 text-xs font-medium text-amber-700">This project has no active assigned workers.</p>}
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Checkout Date</label>
                <input required type="date" value={checkoutDate} onChange={(event) => { setCheckoutDate(event.target.value); if (returnDate < event.target.value) setReturnDate(''); }} className="form-input" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Expected Return Date</label>
                <input required type="date" min={checkoutDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className="form-input" />
              </div>
            </div>
            <ModalActions submitting={submitting} submitLabel="Confirm Check Out" onCancel={() => setCheckoutTool(null)} />
          </form>
        </ModalShell>
      )}

      {checkinTool && isAdmin && (
        <ModalShell title="Check In Tool" subtitle={`${checkinTool.toolId} - ${checkinTool.name}`} onClose={() => setCheckinTool(null)}>
          <form onSubmit={submitCheckin} className="space-y-5">
            {error && <ModalError message={error} />}
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Returning from <strong className="text-slate-900">{checkinTool.assignedTo?.name}</strong>
              {checkinTool.expectedReturnDate && <> - Expected {displayDate(checkinTool.expectedReturnDate)}</>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Returning Condition</label>
              <select value={returnCondition} onChange={(event) => setReturnCondition(event.target.value as 'good' | 'needs repair')} className="form-input">
                <option value="good">Good - return to available inventory</option>
                <option value="needs repair">Needs Repair - send to maintenance</option>
              </select>
            </div>
            <ModalActions submitting={submitting} submitLabel="Confirm Check In" onCancel={() => setCheckinTool(null)} />
          </form>
        </ModalShell>
      )}

      {deleteTool && isAdmin && (
        <ModalShell title="Delete Tool?" subtitle={deleteTool.name} onClose={() => setDeleteTool(null)}>
          {error && <ModalError message={error} />}
          <p className="text-slate-600">This removes the tool from {selectedProject?.name}. This action cannot be undone.</p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDeleteTool(null)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600">Cancel</button>
            <button type="button" onClick={() => void confirmDelete()} disabled={submitting} className="rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white hover:bg-red-600 disabled:opacity-60">{submitting ? 'Deleting...' : 'Delete Tool'}</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default Tools;

const ToolsPanel = ({ value }: { value: ToolsPanelValue }) => {
  const {
    selectedProjectId, projects, tools, summary, selectedProject, projectOperational, loadingTools,
    search, categoryFilter, conditionFilter, statusFilter, sort, visibleTools, isAdmin,
    onProjectChange, onSearchChange, onCategoryChange, onConditionChange, onStatusChange,
    onSort, onCheckout, onEdit, onCheckin, onDelete
  } = value;
  const [toolPage, setToolPage] = useState(1);
  const toolPageSize = 10;
  const activeToolPage = Math.min(toolPage, Math.max(1, Math.ceil(visibleTools.length / toolPageSize)));
  const paginatedTools = visibleTools.slice(
    (activeToolPage - 1) * toolPageSize,
    activeToolPage * toolPageSize
  );

  return (
    <>
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="tools-project" className="mb-2 block text-sm font-semibold text-slate-700">Select a project to view its tools</label>
        <select id="tools-project" value={selectedProjectId} onChange={(event) => { onProjectChange(event.target.value); setToolPage(1); }} className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-900 px-5 font-medium text-white outline-none focus:ring-2 focus:ring-amber-400">
          <option value="">Choose a project...</option>
          {projects.map((project: Project) => <option key={project._id} value={project._id}>{project.name}</option>)}
        </select>
      </section>

      {!selectedProjectId ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <Wrench className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-900">Choose a project first</h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-500">Project selection keeps tool totals, assignments, and filters specific to one construction site.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <ProjectLifecycleNotice project={selectedProject} activity="add, assign, edit, or delete tools" />
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Tools" value={summary.total} note={`Across ${tools.length} tool records`} icon={<Wrench className="h-6 w-6" />} tone="slate" />
            <KpiCard label="Available Tools" value={summary.available} note="Ready to check out" icon={<CheckCircle2 className="h-6 w-6" />} tone="green" />
            <KpiCard label="Needs Repairs" value={summary.repair} note="Repair or maintenance required" icon={<ShieldAlert className="h-6 w-6" />} tone="amber" />
            <KpiCard label="In Use" value={summary.inUse} note="Currently assigned to workers" icon={<PackageCheck className="h-6 w-6" />} tone="blue" />
          </div>

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_190px_210px]">
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => { onSearchChange(event.target.value); setToolPage(1); }} placeholder="Search by tool name, ID, or worker..."
                  className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-amber-400" />
              </label>
              <FilterSelect label="Category" value={categoryFilter} onChange={(nextValue) => { onCategoryChange(nextValue); setToolPage(1); }} options={categories.map((category) => ({ value: category, label: category }))} />
              <FilterSelect label="Condition" value={conditionFilter} onChange={(nextValue) => { onConditionChange(nextValue); setToolPage(1); }} options={[
                { value: 'good', label: 'Good' }, { value: 'needs repair', label: 'Needs Repair' }, { value: 'damaged', label: 'Damaged' }
              ]} />
              <FilterSelect label="Status" value={statusFilter} onChange={(nextValue) => { onStatusChange(nextValue); setToolPage(1); }} options={[
                { value: 'available', label: 'Available' }, { value: 'in-use', label: 'In Use' }, { value: 'under-maintenance', label: 'Under Maintenance' }
              ]} />
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px]">
                <thead className="bg-slate-900 text-white"><tr>
                  <SortHeader label="Tool ID" sortKey="toolId" sort={sort} onSort={onSort} />
                  <SortHeader label="Tool Name" sortKey="name" sort={sort} onSort={onSort} />
                  <SortHeader label="Category" sortKey="category" sort={sort} onSort={onSort} />
                  <SortHeader label="Qty" sortKey="quantity" sort={sort} onSort={onSort} />
                  <SortHeader label="Condition" sortKey="condition" sort={sort} onSort={onSort} />
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                  <SortHeader label="Assigned To" sortKey="assignedTo" sort={sort} onSort={onSort} />
                  <th className="px-5 py-5 text-left text-sm font-semibold">Expected Return</th>
                  <th className="px-5 py-5 text-right text-sm font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {!projectOperational && selectedProject && (
                    <tr>
                      <td colSpan={9} className="bg-amber-50 px-6 py-4 text-center text-sm font-semibold text-amber-800">
                        {projectLifecycleMessage(selectedProject, 'add, assign, edit, or delete tools')}
                      </td>
                    </tr>
                  )}
                  {loadingTools ? (
                    <tr><td colSpan={9} className="px-6 py-14 text-center text-slate-500">Loading {selectedProject?.name} tools...</td></tr>
                  ) : visibleTools.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-14 text-center text-slate-500">No tools match this project and the selected filters.</td></tr>
                  ) : paginatedTools.map((tool: Tool) => (
                    <tr key={tool._id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-5 font-mono text-sm font-semibold text-blue-700">{tool.toolId}</td>
                      <td className="px-5 py-5 font-semibold text-slate-900">{tool.name}</td>
                      <td className="px-5 py-5 text-slate-600">{tool.category}</td>
                      <td className="px-5 py-5 font-semibold text-slate-900">{tool.quantity}</td>
                      <td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${conditionClass(tool.condition)}`}>{titleCase(tool.condition)}</span></td>
                      <td className="px-5 py-5"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(tool.status)}`}>{titleCase(tool.status)}</span></td>
                      <td className="px-5 py-5">{tool.assignedTo ? <div><p className="font-semibold text-slate-900">{tool.assignedTo.name}</p><p className="text-xs text-slate-500">{tool.assignedTo.position}</p></div> : <span className="text-slate-400">Not assigned</span>}</td>
                      <td className="whitespace-nowrap px-5 py-5 text-slate-600">{tool.status === 'in-use' ? displayDate(tool.expectedReturnDate) : '-'}</td>
                      <td className="px-5 py-5">{isAdmin && projectOperational && <div className="flex items-center justify-end gap-2">
                        {tool.status === 'in-use' ? (
                          <button type="button" onClick={() => onCheckin(tool)} className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-200">Check In</button>
                        ) : (
                          <button type="button" onClick={() => onCheckout(tool)} disabled={tool.condition !== 'good' || tool.status !== 'available'} className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-40">Check Out</button>
                        )}
                        <button type="button" onClick={() => onEdit(tool)} aria-label={`Edit ${tool.name}`} className="rounded-xl p-2 text-blue-600 hover:bg-blue-50"><Edit3 className="h-5 w-5" /></button>
                        <button type="button" onClick={() => onDelete(tool)} aria-label={`Delete ${tool.name}`} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-5 w-5" /></button>
                      </div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <NumberedPagination currentPage={activeToolPage} totalItems={visibleTools.length} pageSize={toolPageSize} maxVisiblePages={10} itemLabel="tools" onPageChange={setToolPage} />
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:hidden">Swipe horizontally to view all tool details.</div>
          </section>
        </>
      )}
    </>
  );
};
