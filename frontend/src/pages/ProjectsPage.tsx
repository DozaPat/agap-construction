import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Edit3,
  FolderKanban,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type ProjectStatus = 'pending' | 'in-progress' | 'delayed' | 'completed' | 'cancelled';

interface Worker {
  _id: string;
  name: string;
  position: string;
  phone?: string;
  status?: string;
}

interface Material {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  stockLevel?: string;
}

interface Tool {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
  status: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  location: string;
  startDate: string;
  endDate?: string | null;
  budget: number;
  totalExpenses: number;
  status: ProjectStatus;
  progress: number;
  createdAt: string;
  resources?: {
    workers: Worker[];
    materials: Material[];
    tools: Tool[];
  };
}

interface ProjectForm {
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: string;
  status: ProjectStatus;
  progress: number;
}

const emptyForm: ProjectForm = {
  name: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  budget: '',
  status: 'pending',
  progress: 0,
};

const statusStyle: Record<ProjectStatus, {
  label: string;
  border: string;
  top: string;
  badge: string;
  bar: string;
  soft: string;
  button: string;
  accent: string;
}> = {
  pending: {
    label: 'Pending',
    border: 'border-l-amber-500',
    top: 'border-t-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    bar: 'bg-amber-500',
    soft: 'bg-amber-50 text-amber-800',
    button: 'bg-amber-500 hover:bg-amber-600',
    accent: 'accent-amber-500',
  },
  'in-progress': {
    label: 'In Progress',
    border: 'border-l-blue-600',
    top: 'border-t-blue-600',
    badge: 'bg-blue-100 text-blue-800',
    bar: 'bg-blue-600',
    soft: 'bg-blue-50 text-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700',
    accent: 'accent-blue-600',
  },
  delayed: {
    label: 'Delayed',
    border: 'border-l-orange-600',
    top: 'border-t-orange-600',
    badge: 'bg-orange-100 text-orange-800',
    bar: 'bg-orange-600',
    soft: 'bg-orange-50 text-orange-800',
    button: 'bg-orange-600 hover:bg-orange-700',
    accent: 'accent-orange-600',
  },
  completed: {
    label: 'Completed',
    border: 'border-l-emerald-600',
    top: 'border-t-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800',
    bar: 'bg-emerald-600',
    soft: 'bg-emerald-50 text-emerald-800',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    accent: 'accent-emerald-600',
  },
  cancelled: {
    label: 'Cancelled',
    border: 'border-l-rose-600',
    top: 'border-t-rose-600',
    badge: 'bg-rose-100 text-rose-800',
    bar: 'bg-rose-600',
    soft: 'bg-rose-50 text-rose-800',
    button: 'bg-rose-600 hover:bg-rose-700',
    accent: 'accent-rose-600',
  },
};

const formatMoney = (value = 0) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-PH') : 'Not set';

const createRequestKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  String(Date.now()) + '-' + Math.random().toString(36).slice(2);

const ProjectsPage = () => {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const requestKey = useRef(createRequestKey());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const fetchProjects = async () => {
    try {
      const { data } = await api.get<Project[]>('/projects');
      setProjects([...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get<Project[]>('/projects')
      .then(({ data }) => {
        if (active) {
          setProjects([...data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ));
        }
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query ||
      project.name.toLowerCase().includes(query) ||
      project.location.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [projects, searchTerm, statusFilter]);

  const openCreate = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setFormError('');
    requestKey.current = createRequestKey();
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description ?? '',
      location: project.location,
      startDate: project.startDate.slice(0, 10),
      endDate: project.endDate?.slice(0, 10) ?? '',
      budget: String(project.budget),
      status: project.status,
      progress: project.progress ?? 0,
    });
    setFormError('');
    setFormOpen(true);
  };

  const openDetails = async (project: Project) => {
    setSelectedProject(project);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const { data } = await api.get<Project>('/projects/' + project._id);
      setSelectedProject(data);
    } catch (error) {
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const changeProgress = (progress: number) => {
    const safeProgress = Math.min(100, Math.max(0, progress));
    setForm((current) => ({
      ...current,
      progress: safeProgress,
      status: safeProgress === 100 ? 'completed' : current.status,
    }));
  };

  const changeStatus = (status: ProjectStatus) => {
    setForm((current) => ({
      ...current,
      status,
      progress: status === 'completed'
        ? 100
        : current.status === 'completed' && current.progress === 100
          ? 99
          : current.progress,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || submitLock.current) return;

    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      setFormError('End date cannot be earlier than the start date.');
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setFormError('');
    const payload = {
      ...form,
      budget: Number(form.budget),
      progress: Number(form.progress),
      endDate: form.endDate || null,
    };

    try {
      if (editingProject) {
        await api.put('/projects/' + editingProject._id, payload);
        setNotice('Project updated successfully.');
      } else {
        await api.post('/projects', payload, {
          headers: { 'X-Idempotency-Key': requestKey.current },
        });
        setNotice('Project created successfully.');
      }
      setFormOpen(false);
      setEditingProject(null);
      await fetchProjects();
    } catch (error: unknown) {
      const responseMessage = (error as {
        response?: { data?: { message?: string } };
      }).response?.data?.message;
      const isNetworkError = (error as { message?: string }).message === 'Network Error';
      setFormError(
        responseMessage ||
        (isNetworkError
          ? 'Cannot reach the backend. Restart the backend server and try again.'
          : 'Unable to save the project.'),
      );
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteProject || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete('/projects/' + deleteProject._id);
      setNotice('Project deleted successfully.');
      setDeleteProject(null);
      await fetchProjects();
    } catch {
      setNotice('Unable to delete the project.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-slate-500">
        <LoaderCircle className="mr-3 h-6 w-6 animate-spin" /> Loading projects...
      </div>
    );
  }

  const currentStyle = statusStyle[form.status];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 sm:text-4xl">Projects</h1>
          <p className="mt-1 text-slate-600">Budgets, resources, schedules, and progress in one place</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 font-semibold text-white transition hover:bg-amber-600 sm:w-auto"
          >
            <Plus className="h-5 w-5" /> New Project
          </button>
        )}
      </div>

      {notice && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X className="h-5 w-5" /></button>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {[
          ['Total Projects', projects.length, FolderKanban, 'text-slate-700', 'bg-slate-100'],
          ['In Progress', projects.filter((p) => p.status === 'in-progress').length, LoaderCircle, 'text-blue-700', 'bg-blue-100'],
          ['Pending', projects.filter((p) => p.status === 'pending').length, CalendarDays, 'text-amber-700', 'bg-amber-100'],
          ['Completed', projects.filter((p) => p.status === 'completed').length, CheckCircle2, 'text-emerald-700', 'bg-emerald-100'],
        ].map(([label, value, Icon, color, background]) => {
          const StatIcon = Icon as typeof FolderKanban;
          return (
            <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
              <div className={'mb-4 flex h-10 w-10 items-center justify-center rounded-xl ' + background}>
                <StatIcon className={'h-5 w-5 ' + color} />
              </div>
              <p className="text-xs text-slate-500 sm:text-sm">{label as string}</p>
              <p className="mt-1 text-3xl font-bold text-slate-800 sm:text-4xl">{value as number}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-7 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by project or location..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
          className="min-h-12 rounded-xl bg-slate-800 px-5 text-white outline-none sm:w-48"
        >
          <option value="all">All Statuses</option>
          {Object.entries(statusStyle).map(([value, style]) => (
            <option key={value} value={value}>{style.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-5">
        {filteredProjects.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center text-slate-500">No projects found.</div>
        ) : filteredProjects.map((project) => {
          const style = statusStyle[project.status];
          const remaining = project.budget - (project.totalExpenses || 0);
          return (
            <article
              key={project._id}
              onClick={() => void openDetails(project)}
              className={'cursor-pointer rounded-3xl border border-l-4 border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-7 ' + style.border}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-bold text-slate-800 sm:text-2xl">{project.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4 shrink-0" /> {project.location}
                  </p>
                </div>
                <span className={'w-fit rounded-full px-4 py-2 text-xs font-semibold ' + style.badge}>{style.label}</span>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-slate-600">Progress</span>
                  <span className="font-bold text-slate-800">{project.progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={'h-full rounded-full transition-all ' + style.bar} style={{ width: project.progress + '%' }} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Budget</p>
                  <p className="mt-1 break-words font-bold text-slate-800">{formatMoney(project.budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Spent</p>
                  <p className="mt-1 break-words font-bold text-blue-700">{formatMoney(project.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{remaining >= 0 ? 'Budget Remaining' : 'Over Budget'}</p>
                  <p className={'mt-1 break-words font-bold ' + (remaining >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                    {formatMoney(Math.abs(remaining))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Schedule</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(project.startDate)} to {formatDate(project.endDate)}</p>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => openEdit(project)} className="rounded-xl p-2.5 text-blue-600 hover:bg-blue-50" aria-label={'Edit ' + project.name}>
                    <Edit3 className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => setDeleteProject(project)} className="rounded-xl p-2.5 text-rose-600 hover:bg-rose-50" aria-label={'Delete ' + project.name}>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {formOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 sm:p-5">
          <div className={'max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border-l-8 bg-white shadow-2xl ' + currentStyle.border}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-5 sm:p-7">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{editingProject ? 'Edit Project' : 'Create Project'}</h2>
                <span className={'mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ' + currentStyle.badge}>{currentStyle.label}</span>
              </div>
              <button type="button" onClick={() => !isSubmitting && setFormOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close form">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
              {formError && (
                <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <CircleAlert className="h-5 w-5 shrink-0" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-600">Project Name</span>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-600">Description</span>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-600">Location</span>
                  <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-600">Budget (PHP)</span>
                  <input required min="0" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-600">Start Date</span>
                  <input required type="date" value={form.startDate} max={form.endDate || undefined} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-600">End Date</span>
                  <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-600">Status</span>
                  <select value={form.status} onChange={(e) => changeStatus(e.target.value as ProjectStatus)} className={'w-full rounded-xl border border-slate-200 px-4 py-3.5 font-medium outline-none ' + currentStyle.soft}>
                    {Object.entries(statusStyle).map(([value, style]) => <option key={value} value={value}>{style.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-2 flex justify-between text-sm font-medium text-slate-600"><span>Progress</span><strong>{form.progress}%</strong></span>
                  <input type="range" min="0" max="100" value={form.progress} onChange={(e) => changeProgress(Number(e.target.value))} className={'mt-3 w-full ' + currentStyle.accent} />
                  <input type="number" min="0" max="100" value={form.progress} onChange={(e) => changeProgress(Number(e.target.value))} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none" />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSubmitting} onClick={() => setFormOpen(false)} className="rounded-xl px-6 py-3.5 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={'flex min-w-44 items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ' + currentStyle.button}>
                  {isSubmitting && <LoaderCircle className="h-5 w-5 animate-spin" />}
                  {isSubmitting ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailsOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 sm:p-5">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:p-7">
              <div className="min-w-0">
                <span className={'mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ' + statusStyle[selectedProject.status].badge}>{statusStyle[selectedProject.status].label}</span>
                <h2 className="break-words text-2xl font-bold text-slate-800 sm:text-3xl">{selectedProject.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-slate-500"><MapPin className="h-4 w-4" />{selectedProject.location}</p>
              </div>
              <button type="button" onClick={() => setDetailsOpen(false)} className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close details"><X className="h-6 w-6" /></button>
            </div>

            {detailsLoading ? (
              <div className="flex min-h-80 items-center justify-center text-slate-500"><LoaderCircle className="mr-3 h-6 w-6 animate-spin" /> Loading project resources...</div>
            ) : (
              <div className="space-y-6 p-4 sm:p-7">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ['Budget', formatMoney(selectedProject.budget), WalletCards],
                    ['Total Spent', formatMoney(selectedProject.totalExpenses), Banknote],
                    ['Start Date', formatDate(selectedProject.startDate), CalendarDays],
                    ['End Date', formatDate(selectedProject.endDate), CalendarDays],
                  ].map(([label, value, Icon]) => {
                    const DetailIcon = Icon as typeof WalletCards;
                    return (
                      <div key={String(label)} className="rounded-2xl bg-white p-4 shadow-sm">
                        <DetailIcon className="mb-3 h-5 w-5 text-blue-600" />
                        <p className="text-xs text-slate-500">{label as string}</p>
                        <p className="mt-1 break-words font-bold text-slate-800">{value as string}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-slate-700">Project Progress</span><strong>{selectedProject.progress}%</strong></div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + statusStyle[selectedProject.status].bar} style={{ width: selectedProject.progress + '%' }} /></div>
                  {selectedProject.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedProject.description}</p>}
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800"><Users className="h-5 w-5 text-blue-600" />Assigned Workers <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">{selectedProject.resources?.workers?.length || 0}</span></h3>
                    <div className="space-y-3">
                      {selectedProject.resources?.workers?.length ? selectedProject.resources.workers.map((worker) => (
                        <div key={worker._id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="font-semibold text-slate-800">{worker.name}</p>
                          <p className="flex flex-wrap items-center text-sm text-slate-500">
                            <span>{worker.position}</span>
                            {worker.status && (
                              <>
                                <span className="mx-1.5 text-slate-300" aria-hidden="true">|</span>
                                <span>{worker.status}</span>
                              </>
                            )}
                          </p>
                        </div>
                      )) : <p className="py-6 text-center text-sm text-slate-400">No workers assigned.</p>}
                    </div>
                  </section>

                  <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800"><Boxes className="h-5 w-5 text-amber-600" />Materials Used <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">{selectedProject.resources?.materials?.length || 0}</span></h3>
                    <div className="space-y-3">
                      {selectedProject.resources?.materials?.length ? selectedProject.resources.materials.map((material) => (
                        <div key={material._id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="font-semibold text-slate-800">{material.name}</p>
                          <p className="flex flex-wrap items-center text-sm text-slate-500">
                            <span>{material.quantity} {material.unit}</span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">|</span>
                            <span>{material.category}</span>
                          </p>
                        </div>
                      )) : <p className="py-6 text-center text-sm text-slate-400">No materials linked.</p>}
                    </div>
                  </section>

                  <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800"><Wrench className="h-5 w-5 text-emerald-600" />Tools Used <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700">{selectedProject.resources?.tools?.length || 0}</span></h3>
                    <div className="space-y-3">
                      {selectedProject.resources?.tools?.length ? selectedProject.resources.tools.map((tool) => (
                        <div key={tool._id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="font-semibold text-slate-800">{tool.name}</p>
                          <p className="flex flex-wrap items-center text-sm text-slate-500">
                            <span>{tool.quantity} unit(s)</span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">|</span>
                            <span>{tool.condition}</span>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">|</span>
                            <span>{tool.status}</span>
                          </p>
                        </div>
                      )) : <p className="py-6 text-center text-sm text-slate-400">No tools linked.</p>}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100"><Trash2 className="h-7 w-7 text-rose-600" /></div>
            <h3 className="text-xl font-bold text-slate-800">Delete {deleteProject.name}?</h3>
            <p className="mt-2 text-sm text-slate-500">This action cannot be undone.</p>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" disabled={isDeleting} onClick={() => setDeleteProject(null)} className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isDeleting} onClick={() => void confirmDelete()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {isDeleting && <LoaderCircle className="h-5 w-5 animate-spin" />}{isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
