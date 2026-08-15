import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, KeyRound, LockOpen, Pencil, Plus, Search, ShieldCheck, Trash2, UserCog, Users, X } from 'lucide-react';
import api from '../lib/api';
import NumberedPagination from '../components/NumberedPagination';
import { useAuth } from '../context/AuthContext';

interface ProjectOption { _id: string; name: string; status: string; }
interface ManagedUser {
  _id: string; username: string; name: string; email?: string; phone?: string;
  role: 'admin' | 'manager'; status: 'active' | 'inactive' | 'locked';
  assignedProjects: ProjectOption[]; mustChangePassword: boolean; lastLoginAt?: string; createdAt: string;
  canDelete?: boolean; deleteBlockedReason?: string | null;
}
interface UserForm {
  name: string; username: string; email: string; phone: string; role: 'admin' | 'manager';
  status: 'active' | 'inactive'; assignedProjects: string[]; temporaryPassword: string;
}

const emptyForm: UserForm = { name: '', username: '', email: '', phone: '', role: 'manager', status: 'active', assignedProjects: [], temporaryPassword: '' };
const messageOf = (error: unknown, fallback: string) => axios.isAxiosError(error) ? error.response?.data?.message || fallback : fallback;
const dateText = (value?: string) => value ? new Date(value).toLocaleString('en-PH') : 'Never';

const UsersManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [usersResponse, projectsResponse] = await Promise.all([
      api.get<ManagedUser[]>('/users'), api.get<ProjectOption[]>('/projects')
    ]);
    setUsers(usersResponse.data); setProjects(projectsResponse.data);
  };
  useEffect(() => {
    let active = true;
    Promise.all([api.get<ManagedUser[]>('/users'), api.get<ProjectOption[]>('/projects')])
      .then(([usersResponse, projectsResponse]) => {
        if (!active) return;
        setUsers(usersResponse.data);
        setProjects(projectsResponse.data);
      })
      .catch((requestError) => {
        if (active) setError(messageOf(requestError, 'Unable to load users.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => users.filter((managedUser) => {
    const query = search.trim().toLowerCase();
    return (!query || [managedUser.name, managedUser.username, managedUser.email || ''].some((value) => value.toLowerCase().includes(query))) &&
      (roleFilter === 'all' || managedUser.role === roleFilter) &&
      (statusFilter === 'all' || managedUser.status === statusFilter);
  }), [users, search, roleFilter, statusFilter]);
  const pageSize = 8;
  const activePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const visibleUsers = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setFormOpen(true); };
  const openEdit = (managedUser: ManagedUser) => {
    setEditing(managedUser);
    setForm({ name: managedUser.name, username: managedUser.username, email: managedUser.email || '', phone: managedUser.phone || '', role: managedUser.role, status: managedUser.status === 'inactive' ? 'inactive' : 'active', assignedProjects: managedUser.assignedProjects.map((project) => project._id), temporaryPassword: '' });
    setError(''); setFormOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/users/${editing._id}`, { name: form.name, email: form.email || undefined, phone: form.phone, role: form.role, status: form.status, assignedProjects: form.role === 'manager' ? form.assignedProjects : [] });
        setNotice('User access updated successfully. Existing sessions were refreshed where required.');
      } else {
        await api.post('/users', form);
        setNotice('User created. They must change the temporary password at first sign-in.');
      }
      setFormOpen(false); await load();
    } catch (requestError) { setError(messageOf(requestError, 'Unable to save the user.')); }
    finally { setSaving(false); }
  };
  const unlock = async (managedUser: ManagedUser) => {
    try { await api.post(`/users/${managedUser._id}/unlock`); setNotice(`${managedUser.name}'s account was unlocked.`); await load(); }
    catch (requestError) { setError(messageOf(requestError, 'Unable to unlock the account.')); }
  };
  const issueTemporaryPassword = async (managedUser: ManagedUser) => {
    setError('');
    try {
      const { data } = await api.post<{ temporaryPassword: string }>(`/users/${managedUser._id}/reset-password`, {});
      setTemporaryPassword(data.temporaryPassword); setNotice(`Temporary password issued for ${managedUser.name}.`); await load();
    } catch (requestError) { setError(messageOf(requestError, 'Unable to issue a temporary password.')); }
  };
  const toggleStatus = async (managedUser: ManagedUser) => {
    const status = managedUser.status === 'inactive' ? 'active' : 'inactive';
    try { await api.put(`/users/${managedUser._id}`, { status }); setNotice(`${managedUser.name} is now ${status}.`); await load(); }
    catch (requestError) { setError(messageOf(requestError, 'Unable to change account status.')); }
  };
  const requestDelete = (managedUser: ManagedUser) => {
    setNotice('');
    if (!managedUser.canDelete) {
      setError(managedUser.deleteBlockedReason || 'This account has system history and cannot be permanently deleted. Deactivate it instead.');
      return;
    }
    setError('');
    setDeleteTarget(managedUser);
  };
  const confirmDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true); setError('');
    try {
      await api.delete(`/users/${deleteTarget._id}`);
      setNotice(`${deleteTarget.name}'s unused account was permanently deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (requestError) { setError(messageOf(requestError, 'Unable to delete the user account.')); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-20 text-center text-slate-500">Loading user access...</div>;
  return <div className="mx-auto w-full max-w-7xl">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Users & Access</h1><p className="mt-1 text-slate-500">Manage accounts, roles, project assignments, and account security</p></div><button onClick={openCreate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 font-bold text-white hover:bg-amber-600"><Plus className="h-5 w-5" /> Add User</button></div>
    {notice && <div className="mb-5 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />{notice}</span><button onClick={() => setNotice('')}><X className="h-5 w-5" /></button></div>}
    {error && !formOpen && <div className="mb-5 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
    {temporaryPassword && <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Copy this one-time temporary password now:</p><div className="mt-2 flex flex-wrap items-center gap-3"><code className="rounded-xl bg-white px-4 py-3 text-lg font-bold text-slate-900">{temporaryPassword}</code><button onClick={() => void navigator.clipboard.writeText(temporaryPassword)} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Copy</button><button onClick={() => setTemporaryPassword('')} className="text-sm font-semibold text-slate-500">Hide</button></div></div>}
    <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ['Total Users', users.length, Users, 'bg-slate-100 text-slate-700'],
      ['Active Accounts', users.filter((item) => item.status === 'active').length, ShieldCheck, 'bg-emerald-100 text-emerald-700'],
      ['Managers', users.filter((item) => item.role === 'manager').length, UserCog, 'bg-blue-100 text-blue-700'],
      ['Locked / Inactive', users.filter((item) => item.status !== 'active').length, KeyRound, 'bg-red-100 text-red-700'],
    ].map(([label, value, Icon, tone]) => { const CardIcon = Icon as typeof Users; return <article key={label as string} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><CardIcon className="h-5 w-5" /></div><p className="text-sm text-slate-500">{label as string}</p><p className="mt-1 text-3xl font-bold text-slate-900">{value as number}</p></article>; })}</div>
    <section className="mb-5 grid gap-3 rounded-2xl bg-white p-3 shadow-sm md:grid-cols-[1fr_190px_190px]"><label className="relative"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, username, or email..." className="min-h-13 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-amber-500" /></label><select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="rounded-xl bg-slate-800 px-4 text-white"><option value="all">All Roles</option><option value="admin">Administrators</option><option value="manager">Managers</option></select><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-xl bg-slate-800 px-4 py-3 text-white"><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="locked">Locked</option></select></section>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1100px]"><thead className="bg-slate-900 text-white"><tr>{['User', 'Role', 'Status', 'Assigned Projects', 'Last Login', 'Security', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4 text-left text-sm">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleUsers.length === 0 ? <tr><td colSpan={7} className="px-6 py-14 text-center text-slate-500">No users match these filters.</td></tr> : visibleUsers.map((managedUser) => <tr key={managedUser._id} className="hover:bg-slate-50"><td className="px-5 py-4"><strong className="block text-slate-900">{managedUser.name}</strong><span className="text-sm text-slate-500">@{managedUser.username}{managedUser.email ? ` · ${managedUser.email}` : ''}</span></td><td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">{managedUser.role}</span></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${managedUser.status === 'active' ? 'bg-emerald-100 text-emerald-700' : managedUser.status === 'locked' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{managedUser.status}</span></td><td className="max-w-64 px-5 py-4 text-sm text-slate-600">{managedUser.role === 'admin' ? 'All projects' : managedUser.assignedProjects.length ? managedUser.assignedProjects.map((project) => project.name).join(', ') : 'No projects assigned'}</td><td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{dateText(managedUser.lastLoginAt)}</td><td className="px-5 py-4 text-sm text-slate-600">{managedUser.mustChangePassword ? 'Password change required' : 'Password current'}</td><td className="px-5 py-4"><div className="flex items-center gap-1"><button onClick={() => openEdit(managedUser)} title="Edit access" className="rounded-xl p-2 text-blue-600 hover:bg-blue-50"><Pencil className="h-5 w-5" /></button><button onClick={() => void issueTemporaryPassword(managedUser)} title="Issue temporary password" className="rounded-xl p-2 text-amber-600 hover:bg-amber-50"><KeyRound className="h-5 w-5" /></button>{managedUser.status === 'locked' && <button onClick={() => void unlock(managedUser)} title="Unlock account" className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50"><LockOpen className="h-5 w-5" /></button>}<button disabled={managedUser._id === currentUser?._id} onClick={() => void toggleStatus(managedUser)} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">{managedUser.status === 'inactive' ? 'Activate' : 'Deactivate'}</button><button onClick={() => requestDelete(managedUser)} title={managedUser.canDelete ? 'Delete unused user permanently' : managedUser.deleteBlockedReason || 'This account cannot be deleted'} className={`rounded-xl p-2 ${managedUser.canDelete ? 'text-red-600 hover:bg-red-50' : 'text-slate-300 hover:bg-slate-100'}`}><Trash2 className="h-5 w-5" /></button></div></td></tr>)}</tbody></table></div><NumberedPagination currentPage={activePage} totalItems={filtered.length} pageSize={pageSize} itemLabel="users" onPageChange={setPage} /></section>
    {deleteTarget && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600"><AlertTriangle className="h-7 w-7" /></div><h2 className="text-2xl font-bold text-slate-900">Permanently delete unused account?</h2><p className="mt-3 text-slate-600">Delete <strong>{deleteTarget.name}</strong> (@{deleteTarget.username})? This action cannot be undone.</p><p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Deletion is available because this account has never signed in and has no system history. Accounts with records must be deactivated instead.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button disabled={saving} onClick={() => setDeleteTarget(null)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 disabled:opacity-60">Cancel</button><button disabled={saving} onClick={() => void confirmDelete()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"><Trash2 className="h-5 w-5" />{saving ? 'Deleting...' : 'Delete User'}</button></div></div></div>}
    {formOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white p-5"><div><h2 className="text-2xl font-bold text-slate-900">{editing ? 'Edit User Access' : 'Create User'}</h2><p className="text-sm text-slate-500">{editing ? editing.username : 'The user changes their temporary password at first sign-in.'}</p></div><button onClick={() => setFormOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X /></button></div><form onSubmit={save} className="space-y-5 p-5 sm:p-7">{error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}<div className="grid gap-5 sm:grid-cols-2">{[
      ['Full Name', 'name', 'text'], ['Username', 'username', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'text']
    ].map(([label, key, type]) => <label key={key} className="text-sm font-semibold text-slate-700">{label}<input required={key === 'name' || key === 'username'} disabled={Boolean(editing && key === 'username')} type={type} value={form[key as keyof UserForm] as string} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-amber-500 disabled:opacity-60" /></label>)}<label className="text-sm font-semibold text-slate-700">Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserForm['role'] })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4"><option value="manager">Manager</option><option value="admin">Administrator</option></select></label>{editing && <label className="text-sm font-semibold text-slate-700">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserForm['status'] })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}{!editing && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Temporary Password<input required minLength={8} type="password" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-amber-500" /></label>}</div>{form.role === 'manager' && <fieldset><legend className="mb-3 text-sm font-semibold text-slate-700">Assigned Projects</legend><div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 sm:grid-cols-2">{projects.length === 0 ? <p className="p-3 text-sm text-slate-500">No projects available.</p> : projects.map((project) => <label key={project._id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50"><input type="checkbox" checked={form.assignedProjects.includes(project._id)} onChange={(event) => setForm({ ...form, assignedProjects: event.target.checked ? [...form.assignedProjects, project._id] : form.assignedProjects.filter((id) => id !== project._id) })} className="h-4 w-4 accent-amber-500" /><span><strong className="block text-sm text-slate-800">{project.name}</strong><small className="capitalize text-slate-500">{project.status.replace('-', ' ')}</small></span></label>)}</div></fieldset>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600">Cancel</button><button disabled={saving} className="rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save Access' : 'Create User'}</button></div></form></div></div>}
  </div>;
};

export default UsersManagement;
