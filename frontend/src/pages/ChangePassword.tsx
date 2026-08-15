import { useState } from 'react';
import axios from 'axios';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth, type User } from '../context/AuthContext';

const ChangePassword = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    if (newPassword.length < 8) return setError('Use at least 8 characters for the new password.');
    setSaving(true); setError('');
    try {
      const { data } = await api.put<User>('/auth/change-password', { currentPassword, newPassword });
      login(data);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || 'Unable to change the password.'
        : 'Unable to change the password.');
    } finally { setSaving(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
    <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-9">
      <div className="mb-7 flex items-start gap-4">
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><KeyRound className="h-7 w-7" /></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Create a new password</h1><p className="mt-1 text-sm text-slate-500">Temporary passwords must be replaced before accessing AGAP records.</p></div>
      </div>
      <form onSubmit={submit} className="space-y-5">
        {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
        {[
          ['Current password', currentPassword, setCurrentPassword, 'current-password'],
          ['New password', newPassword, setNewPassword, 'new-password'],
          ['Confirm new password', confirmPassword, setConfirmPassword, 'new-password'],
        ].map(([label, value, setter, autoComplete]) => <label key={label as string} className="block text-sm font-semibold text-slate-700">
          {label as string}<div className="relative mt-2"><LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input required type="password" minLength={8} value={value as string} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} autoComplete={autoComplete as string} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100" /></div>
        </label>)}
        <button disabled={saving} className="w-full rounded-2xl bg-amber-500 py-4 font-bold text-white hover:bg-amber-600 disabled:opacity-60">{saving ? 'Saving...' : 'Save Password and Continue'}</button>
        <button type="button" onClick={logout} className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-800">Sign out instead</button>
      </form>
    </section>
  </main>;
};

export default ChangePassword;
