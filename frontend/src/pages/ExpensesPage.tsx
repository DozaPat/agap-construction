import { useEffect, useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import {
  Banknote, CalendarDays, Download, Edit3, PieChart, Plus, Search, Trash2,
  TrendingDown, TrendingUp, UsersRound, WalletCards, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Project {
  _id: string;
  name: string;
  budget: number;
  recordedExpenses?: number;
  totalPayroll?: number;
  totalExpenses?: number;
}

interface Expense {
  _id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  project: Project;
  notes?: string;
}

interface Material {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  project?: Project;
}

interface PayrollRecord {
  _id: string;
  sheetId: string;
  project: { _id: string; name: string };
  weekStart: string;
  worker: string;
  workerName: string;
  position: string;
  daysPresent: number;
  dailySalary: number;
  baseSalary: number;
  bonus: number;
  overtime: number;
  total: number;
}

type DatePreset = 'all' | 'this-month' | 'last-30' | 'custom';

const categories = [
  'Labor', 'Material', 'Tool', 'Equipment Rental', 'Transportation',
  'Permits & Fees', 'Miscellaneous'
];
const emptyForm = { date: '', description: '', category: '', amount: '', project: '', notes: '' };
const peso = (amount: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 2
}).format(amount);
const shortPeso = (amount: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1
}).format(amount);
const dateText = (date: string) => new Intl.DateTimeFormat('en-PH', {
  year: 'numeric', month: 'short', day: 'numeric'
}).format(new Date(date));
const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const requestError = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

const Modal = ({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 sm:p-5">
    <section className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border-t-8 border-amber-500 bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X /></button>
      </header>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  </div>
);

const ExpensesPage = () => {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('this-month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [payrollWeek, setPayrollWeek] = useState('all');
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollRole, setPayrollRole] = useState('all');
  const [payrollPage, setPayrollPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [materialPicker, setMaterialPicker] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [expenseResponse, projectResponse, materialResponse, payrollResponse] = await Promise.all([
        api.get<Expense[]>('/expenses'), api.get<Project[]>('/projects'),
        api.get<Material[]>('/materials'), api.get<PayrollRecord[]>('/attendance/payroll')
      ]);
      setExpenses(expenseResponse.data);
      setProjects(projectResponse.data);
      setMaterials(materialResponse.data);
      setPayroll(payrollResponse.data);
    } catch (loadError) {
      console.error(loadError);
      setError('Unable to load expense records. Please refresh the page.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dateBounds = useMemo(() => {
    const now = new Date();
    if (datePreset === 'all') return { from: '', to: '' };
    if (datePreset === 'custom') return { from: customFrom, to: customTo };
    if (datePreset === 'last-30') {
      const start = new Date(now); start.setDate(start.getDate() - 29);
      return { from: localDate(start), to: localDate(now) };
    }
    return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate(now) };
  }, [datePreset, customFrom, customTo]);

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const expenseDate = expense.date.slice(0, 10);
    return (!search.trim() || expense.description.toLowerCase().includes(search.trim().toLowerCase())) &&
      (projectFilter === 'all' || expense.project?._id === projectFilter) &&
      (categoryFilter === 'all' || expense.category === categoryFilter) &&
      (!dateBounds.from || expenseDate >= dateBounds.from) &&
      (!dateBounds.to || expenseDate <= dateBounds.to);
  }), [expenses, search, projectFilter, categoryFilter, dateBounds]);

  const payrollWeeks = useMemo(() => [...new Set(payroll
    .filter((record) => {
      const weekDate = record.weekStart.slice(0, 10);
      return (projectFilter === 'all' || record.project?._id === projectFilter) &&
        (categoryFilter === 'all' || categoryFilter === 'Labor') &&
        (!dateBounds.from || weekDate >= dateBounds.from) &&
        (!dateBounds.to || weekDate <= dateBounds.to);
    })
    .map((record) => record.weekStart.slice(0, 10)))]
    .sort((left, right) => right.localeCompare(left)),
  [payroll, projectFilter, categoryFilter, dateBounds]);

  const payrollRoles = useMemo(() => [...new Set(payroll
    .filter((record) => projectFilter === 'all' || record.project?._id === projectFilter)
    .map((record) => record.position))]
    .sort((left, right) => left.localeCompare(right)),
  [payroll, projectFilter]);

  const filteredPayroll = useMemo(() => payroll.filter((record) => {
    const weekDate = record.weekStart.slice(0, 10);
    return (!payrollSearch.trim() || record.workerName.toLowerCase().includes(payrollSearch.trim().toLowerCase())) &&
      (projectFilter === 'all' || record.project?._id === projectFilter) &&
      (categoryFilter === 'all' || categoryFilter === 'Labor') &&
      (payrollWeek === 'all' || weekDate === payrollWeek) &&
      (payrollRole === 'all' || record.position === payrollRole) &&
      (!dateBounds.from || weekDate >= dateBounds.from) &&
      (!dateBounds.to || weekDate <= dateBounds.to);
  }), [payroll, payrollSearch, projectFilter, categoryFilter, payrollWeek, payrollRole, dateBounds]);

  const payrollPageSize = 10;
  const payrollPageCount = Math.max(1, Math.ceil(filteredPayroll.length / payrollPageSize));
  const activePayrollPage = Math.min(payrollPage, payrollPageCount);
  const paginatedPayroll = filteredPayroll.slice(
    (activePayrollPage - 1) * payrollPageSize,
    activePayrollPage * payrollPageSize
  );
  const payrollPageNumbers = useMemo(() => {
    const visibleCount = Math.min(10, payrollPageCount);
    const start = Math.min(
      Math.max(1, activePayrollPage - Math.floor(visibleCount / 2)),
      Math.max(1, payrollPageCount - visibleCount + 1)
    );
    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }, [activePayrollPage, payrollPageCount]);

  const metrics = useMemo(() => {
    const recordedTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const payrollTotal = filteredPayroll.reduce((sum, record) => sum + record.total, 0);
    const total = recordedTotal + payrollTotal;
    const byCategory = filteredExpenses.reduce<Record<string, number>>((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + expense.amount;
      return result;
    }, {});
    if (payrollTotal > 0) byCategory.Labor = (byCategory.Labor || 0) + payrollTotal;
    const topCategory = Object.entries(byCategory).sort((left, right) => right[1] - left[1])[0];
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const recentExpenses = expenses.filter((expense) =>
      (projectFilter === 'all' || expense.project?._id === projectFilter) &&
      (categoryFilter === 'all' || expense.category === categoryFilter) &&
      new Date(expense.date) >= weekStart
    ).reduce((sum, expense) => sum + expense.amount, 0);
    const recentPayroll = payroll.filter((record) =>
      (projectFilter === 'all' || record.project?._id === projectFilter) &&
      (categoryFilter === 'all' || categoryFilter === 'Labor') &&
      new Date(record.weekStart) >= weekStart
    ).reduce((sum, record) => sum + record.total, 0);
    return { total, recordedTotal, payrollTotal, topCategory, recent: recentExpenses + recentPayroll };
  }, [filteredExpenses, filteredPayroll, expenses, payroll, projectFilter, categoryFilter]);

  const budgetMetrics = useMemo(() => {
    const included = projectFilter === 'all' ? projects : projects.filter((project) => project._id === projectFilter);
    const budget = included.reduce((sum, project) => sum + Number(project.budget || 0), 0);
    const actual = included.reduce((sum, project) => sum + Number(project.totalExpenses || 0), 0);
    return { budget, actual, percent: budget > 0 ? (actual / budget) * 100 : 0, variance: budget - actual };
  }, [projects, projectFilter]);

  const filteredMaterials = materials.filter((material) =>
    projectFilter === 'all' || material.project?._id === projectFilter
  );

  const resetMessages = () => { setError(''); setNotice(''); };
  const openCreate = () => {
    resetMessages(); setEditingExpense(null);
    setForm({ ...emptyForm, date: localDate(new Date()), project: projectFilter === 'all' ? '' : projectFilter });
    setFormOpen(true);
  };
  const openEdit = (expense: Expense) => {
    resetMessages(); setEditingExpense(expense);
    setForm({
      date: expense.date.slice(0, 10), description: expense.description,
      category: expense.category, amount: String(expense.amount), project: expense.project?._id || '', notes: expense.notes || ''
    });
    setFormOpen(true);
  };

  const saveExpense = async (event: FormEvent) => {
    event.preventDefault(); if (submitting) return;
    setSubmitting(true); resetMessages();
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense._id}`, payload);
        setNotice('Expense updated successfully.');
      } else {
        await api.post('/expenses', payload);
        setNotice('Expense added successfully.');
      }
      setFormOpen(false); await loadData();
    } catch (saveError) { setError(requestError(saveError, 'Unable to save the expense.')); }
    finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!deleteExpense || submitting) return;
    setSubmitting(true); resetMessages();
    try {
      await api.delete(`/expenses/${deleteExpense._id}`);
      setDeleteExpense(null); setNotice('Expense deleted successfully.'); await loadData();
    } catch (deleteError) { setError(requestError(deleteError, 'Unable to delete the expense.')); }
    finally { setSubmitting(false); }
  };

  const linkMaterial = (material: Material) => {
    setForm({
      ...form,
      description: `${material.name} purchase`, category: 'Material',
      amount: String(material.quantity * material.unitPrice), project: material.project?._id || form.project
    });
    setMaterialPicker(false);
  };

  const downloadPdf = () => {
    if (filteredExpenses.length === 0 && filteredPayroll.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const scope = projectFilter === 'all' ? 'All Projects' : projects.find((project) => project._id === projectFilter)?.name || 'Project';
    const pdfMoney = (amount: number) => `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('AGAP Construction - Expense Ledger', pageWidth / 2, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${scope} | ${dateBounds.from || 'Beginning'} to ${dateBounds.to || 'Present'} | ${categoryFilter === 'all' ? 'All Categories' : categoryFilter}`, pageWidth / 2, 21, { align: 'center' });

    const cards = [
      ['TOTAL SPENDING', pdfMoney(metrics.total)],
      ['TOP CATEGORY', metrics.topCategory?.[0] || 'No data'],
      ['RECENT 7-DAY SPEND', pdfMoney(metrics.recent)]
    ];
    cards.forEach(([label, value], index) => {
      const x = 12 + index * 93;
      doc.setFillColor(index === 0 ? 254 : 248, index === 1 ? 243 : 250, index === 2 ? 255 : 252);
      doc.setDrawColor(index === 0 ? 239 : index === 1 ? 245 : 59, index === 0 ? 68 : index === 1 ? 158 : 130, index === 0 ? 68 : index === 1 ? 11 : 246);
      doc.roundedRect(x, 28, 86, 22, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text(label, x + 5, 35);
      doc.setFontSize(12); doc.setTextColor(15, 23, 42);
      doc.text(doc.splitTextToSize(value, 75)[0], x + 5, 44);
    });

    let nextY = 58;
    if (filteredExpenses.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
      doc.text('Recorded Expense Ledger', 12, nextY);
      autoTable(doc, {
        startY: nextY + 4,
        head: [['Date', 'Description', 'Category', 'Project', 'Amount']],
        body: filteredExpenses.map((expense) => [
          dateText(expense.date), expense.description, expense.category,
          expense.project?.name || 'Unknown', pdfMoney(expense.amount)
        ]),
        margin: { left: 12, right: 12 },
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 25 }, 1: { cellWidth: 80 }, 2: { cellWidth: 38 },
          3: { cellWidth: 70 }, 4: { cellWidth: 55, halign: 'right' }
        }
      });
      nextY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || nextY) + 9;
    }

    if (filteredPayroll.length > 0) {
      if (nextY > 140) { doc.addPage('a4', 'landscape'); nextY = 18; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
      doc.text('Worker Payroll from Saved Attendance', 12, nextY);
      autoTable(doc, {
        startY: nextY + 4,
        head: [['Week', 'Worker', 'Role', 'Project', 'Days', 'Base Pay', 'Bonus', 'OT', 'Total']],
        body: filteredPayroll.map((record) => [
          dateText(record.weekStart), record.workerName, record.position, record.project.name,
          record.daysPresent, pdfMoney(record.baseSalary), pdfMoney(record.bonus),
          pdfMoney(record.overtime), pdfMoney(record.total)
        ]),
        margin: { left: 12, right: 12 },
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 23 }, 1: { cellWidth: 36 }, 2: { cellWidth: 28 },
          3: { cellWidth: 48 }, 4: { cellWidth: 12, halign: 'center' },
          5: { cellWidth: 32, halign: 'right' }, 6: { cellWidth: 27, halign: 'right' },
          7: { cellWidth: 27, halign: 'right' }, 8: { cellWidth: 35, halign: 'right' }
        }
      });
      nextY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || nextY) + 9;
    }

    if (nextY > 190) { doc.addPage('a4', 'landscape'); nextY = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Recorded expenses: ${pdfMoney(metrics.recordedTotal)}`, 12, nextY);
    doc.text(`Worker payroll: ${pdfMoney(metrics.payrollTotal)}`, 100, nextY);
    doc.text(`Combined spending: ${pdfMoney(metrics.total)}`, 188, nextY);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`All-time budget usage including payroll: ${pdfMoney(budgetMetrics.actual)} / ${pdfMoney(budgetMetrics.budget)} (${budgetMetrics.percent.toFixed(1)}%)`, 12, nextY + 6);
    const safeScope = scope.replace(/[^a-zA-Z0-9]+/g, '_');
    doc.save(`Expenses_${safeScope}_${localDate(new Date())}.pdf`);
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading expenses...</div>;

  return (
    <div className="mx-auto w-full max-w-[1500px] pb-10">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Expenses</h1>
          <p className="mt-1 text-slate-600">Monitor spending, budgets, and project ledger activity</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto">
          <button type="button" onClick={downloadPdf} disabled={filteredExpenses.length === 0 && filteredPayroll.length === 0} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download className="h-5 w-5" /> Export PDF</button>
          {isAdmin && <button type="button" onClick={openCreate} className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600"><Plus className="h-5 w-5" /> Add Expense</button>}
        </div>
      </div>

      {(error || notice) && <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm font-medium ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Total Spending" value={shortPeso(metrics.total)} detail={`${peso(metrics.recordedTotal)} expenses + ${peso(metrics.payrollTotal)} payroll`} icon={<Banknote />} tone="red" />
        <MetricCard title="Top Expense Category" value={metrics.topCategory?.[0] || 'No data'} detail={metrics.topCategory ? peso(metrics.topCategory[1]) : 'No filtered expenses'} icon={<PieChart />} tone="amber" />
        <MetricCard title="Recent 7-Day Spend" value={shortPeso(metrics.recent)} detail="For selected project scope" icon={<CalendarDays />} tone="blue" />
      </div>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-semibold text-slate-500">Budget vs Actual</p><h2 className="mt-1 text-xl font-bold text-slate-900">{peso(budgetMetrics.actual)} / {peso(budgetMetrics.budget)} Budget</h2><p className="mt-1 text-sm text-slate-500">All-time recorded expenses plus payroll</p></div>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${budgetMetrics.variance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {budgetMetrics.variance >= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {budgetMetrics.variance >= 0 ? `${peso(budgetMetrics.variance)} remaining` : `${peso(Math.abs(budgetMetrics.variance))} over budget`}
          </div>
        </div>
        <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${budgetMetrics.percent > 100 ? 'bg-red-500' : budgetMetrics.percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetMetrics.percent, 100)}%` }} /></div>
        <div className="mt-2 flex justify-between text-sm font-semibold text-slate-600"><span>{budgetMetrics.percent.toFixed(1)}% used</span><span>{projectFilter === 'all' ? 'All project budgets' : projects.find((project) => project._id === projectFilter)?.name}</span></div>
      </section>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_220px_190px_190px]">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ledger descriptions..." className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-amber-400" />
          </label>
          <select value={projectFilter} onChange={(event) => {
            setProjectFilter(event.target.value); setPayrollWeek('all');
            setPayrollRole('all'); setPayrollPage(1);
          }} className="filter-select">
            <option value="all">All Projects</option>
            {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select>
          <select value={datePreset} onChange={(event) => {
            setDatePreset(event.target.value as DatePreset); setPayrollWeek('all'); setPayrollPage(1);
          }} className="filter-select">
            <option value="all">All Dates</option><option value="this-month">This Month</option><option value="last-30">Last 30 Days</option><option value="custom">Custom Range</option>
          </select>
          <select value={categoryFilter} onChange={(event) => {
            setCategoryFilter(event.target.value); setPayrollPage(1);
          }} className="filter-select">
            <option value="all">All Categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        {datePreset === 'custom' && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:ml-auto xl:max-w-xl">
          <label className="text-sm font-semibold text-slate-600">From<input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => { setCustomFrom(event.target.value); setPayrollWeek('all'); setPayrollPage(1); }} className="form-input mt-2" /></label>
          <label className="text-sm font-semibold text-slate-600">To<input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => { setCustomTo(event.target.value); setPayrollWeek('all'); setPayrollPage(1); }} className="form-input mt-2" /></label>
        </div>}
      </section>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-slate-900">Recorded Expense Ledger</h2><p className="text-sm text-slate-500">Materials, tools, rentals, transportation, fees, and other entries</p></div>
        <strong className="whitespace-nowrap text-slate-900">{peso(metrics.recordedTotal)}</strong>
      </div>
      <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-900 text-white"><tr>
              <th className="px-6 py-5 text-left text-sm font-semibold">Date</th><th className="px-6 py-5 text-left text-sm font-semibold">Description</th>
              <th className="px-6 py-5 text-left text-sm font-semibold">Category</th><th className="px-6 py-5 text-left text-sm font-semibold">Project</th>
              <th className="px-6 py-5 text-right text-sm font-semibold">Amount</th><th className="px-6 py-5 text-right text-sm font-semibold">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-500">No expenses match the selected filters.</td></tr> : filteredExpenses.map((expense) => <tr key={expense._id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-5 text-slate-600">{dateText(expense.date)}</td>
                <td className="px-6 py-5 font-semibold text-slate-900">{expense.description}</td>
                <td className="px-6 py-5"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{expense.category}</span></td>
                <td className="px-6 py-5 text-slate-600">{expense.project?.name || 'Unknown project'}</td>
                <td className="whitespace-nowrap px-6 py-5 text-right font-bold text-red-600">-{peso(expense.amount)}</td>
                <td className="px-6 py-5">{isAdmin && <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => openEdit(expense)} className="rounded-xl p-2 text-blue-600 hover:bg-blue-50"><Edit3 className="h-5 w-5" /></button>
                  <button type="button" onClick={() => setDeleteExpense(expense)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-5 w-5" /></button>
                </div>}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1 border-t border-slate-100 px-6 py-4 text-sm sm:flex-row sm:justify-between"><span className="text-slate-500">{filteredExpenses.length} ledger entries</span><strong className="text-slate-900">Recorded expense total: {peso(metrics.recordedTotal)}</strong></div>
      </section>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><UsersRound className="h-5 w-5 text-blue-600" /> Worker Payroll</h2><p className="text-sm text-slate-500">Automatically synchronized from saved weekly attendance sheets</p></div>
        <strong className="whitespace-nowrap text-slate-900">{peso(metrics.payrollTotal)}</strong>
      </div>
      <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={payrollSearch}
              onChange={(event) => { setPayrollSearch(event.target.value); setPayrollPage(1); }}
              placeholder="Search worker name..."
              className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-blue-400"
            />
          </label>
          <select
            value={payrollWeek}
            onChange={(event) => { setPayrollWeek(event.target.value); setPayrollPage(1); }}
            className="filter-select"
            aria-label="Filter by attendance week"
          >
            <option value="all">All Attendance Weeks</option>
            {payrollWeeks.map((week) => (
              <option key={week} value={week}>Week of {dateText(`${week}T00:00:00.000Z`)}</option>
            ))}
          </select>
          <select
            value={payrollRole}
            onChange={(event) => { setPayrollRole(event.target.value); setPayrollPage(1); }}
            className="filter-select"
            aria-label="Filter payroll by worker role"
          >
            <option value="all">All Worker Roles</option>
            {payrollRoles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="bg-slate-900 text-white"><tr>
              <th className="px-5 py-5 text-left text-sm font-semibold">Attendance Week</th><th className="px-5 py-5 text-left text-sm font-semibold">Worker</th>
              <th className="px-5 py-5 text-left text-sm font-semibold">Role</th><th className="px-5 py-5 text-left text-sm font-semibold">Project</th>
              <th className="px-5 py-5 text-center text-sm font-semibold">Days</th><th className="px-5 py-5 text-right text-sm font-semibold">Base Pay</th>
              <th className="px-5 py-5 text-right text-sm font-semibold">Bonus</th><th className="px-5 py-5 text-right text-sm font-semibold">OT</th>
              <th className="px-5 py-5 text-right text-sm font-semibold">Total Payroll</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayroll.length === 0 ? <tr><td colSpan={9} className="px-6 py-14 text-center text-slate-500">No saved payroll matches the selected filters. Save attendance in the Workers module to create payroll entries.</td></tr> : paginatedPayroll.map((record) => <tr key={record._id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-5 py-5 text-slate-600">Week of {dateText(record.weekStart)}</td>
                <td className="px-5 py-5 font-semibold text-slate-900">{record.workerName}</td><td className="px-5 py-5 text-slate-600">{record.position}</td>
                <td className="px-5 py-5 text-slate-600">{record.project?.name}</td><td className="px-5 py-5 text-center font-semibold">{record.daysPresent}</td>
                <td className="whitespace-nowrap px-5 py-5 text-right">{peso(record.baseSalary)}</td><td className="whitespace-nowrap px-5 py-5 text-right">{peso(record.bonus)}</td>
                <td className="whitespace-nowrap px-5 py-5 text-right">{peso(record.overtime)}</td><td className="whitespace-nowrap px-5 py-5 text-right font-bold text-blue-700">{peso(record.total)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:justify-between">
            <span className="text-slate-500">
              {filteredPayroll.length === 0 ? '0 entries' : `Showing ${(activePayrollPage - 1) * payrollPageSize + 1}-${Math.min(activePayrollPage * payrollPageSize, filteredPayroll.length)} of ${filteredPayroll.length} payroll entries`}
            </span>
            <strong className="text-slate-900">Filtered payroll total: {peso(metrics.payrollTotal)}</strong>
          </div>
          {payrollPageCount > 1 && (
            <nav className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Payroll pagination">
              <button type="button" onClick={() => setPayrollPage(Math.max(1, activePayrollPage - 1))} disabled={activePayrollPage === 1} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              {payrollPageNumbers.map((page) => (
                <button
                  type="button"
                  key={page}
                  onClick={() => setPayrollPage(page)}
                  aria-current={page === activePayrollPage ? 'page' : undefined}
                  className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-bold ${page === activePayrollPage ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {page}
                </button>
              ))}
              <button type="button" onClick={() => setPayrollPage(Math.min(payrollPageCount, activePayrollPage + 1))} disabled={activePayrollPage === payrollPageCount} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </nav>
          )}
        </div>
      </section>

      {formOpen && isAdmin && <Modal title={editingExpense ? 'Edit Expense' : 'Add Expense'} onClose={() => setFormOpen(false)}>
        <form onSubmit={saveExpense} className="space-y-5">
          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Date<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="form-input mt-2" /></label>
            <label className="text-sm font-semibold text-slate-700">Category<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="form-input mt-2"><option value="">Choose a category...</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="form-input mt-2" /></label>
            <label className="text-sm font-semibold text-slate-700">Amount (PHP)<input required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="form-input mt-2" /></label>
            <label className="text-sm font-semibold text-slate-700">Project<select required value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} className="form-input mt-2"><option value="">Choose a project...</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Notes<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="form-input mt-2 resize-none" /></label>
          </div>
          {!editingExpense && <button type="button" onClick={() => setMaterialPicker(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-500 py-3 font-semibold text-amber-600 hover:bg-amber-50"><WalletCards className="h-5 w-5" /> Link Material from Inventory</button>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600">Cancel</button><button type="submit" disabled={submitting} className="rounded-2xl bg-amber-500 px-6 py-3 font-semibold text-white disabled:opacity-60">{submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}</button></div>
        </form>
      </Modal>}

      {materialPicker && <Modal title="Select Material" onClose={() => setMaterialPicker(false)}>
        <div className="max-h-96 space-y-2 overflow-y-auto">{filteredMaterials.length === 0 ? <p className="py-8 text-center text-slate-500">No materials found in this project scope.</p> : filteredMaterials.map((material) => <button type="button" key={material._id} onClick={() => linkMaterial(material)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-amber-300 hover:bg-amber-50"><span><strong className="block text-slate-900">{material.name}</strong><small className="text-slate-500">{material.quantity} {material.unit} x {peso(material.unitPrice)}</small></span><span className="font-semibold text-amber-600">Use</span></button>)}</div>
      </Modal>}

      {deleteExpense && isAdmin && <Modal title="Delete Expense?" onClose={() => setDeleteExpense(null)}>
        <p className="text-slate-600">Delete <strong>{deleteExpense.description}</strong> for {peso(deleteExpense.amount)}? This cannot be undone.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDeleteExpense(null)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600">Cancel</button><button type="button" onClick={() => void confirmDelete()} disabled={submitting} className="rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white disabled:opacity-60">{submitting ? 'Deleting...' : 'Delete'}</button></div>
      </Modal>}
    </div>
  );
};

const MetricCard = ({ title, value, detail, icon, tone }: {
  title: string; value: string; detail: string; icon: React.ReactNode; tone: 'red' | 'amber' | 'blue';
}) => {
  const color = { red: 'border-red-500 bg-red-100 text-red-600', amber: 'border-amber-500 bg-amber-100 text-amber-700', blue: 'border-blue-500 bg-blue-100 text-blue-700' }[tone];
  const [border, ...iconColor] = color.split(' ');
  return <article className={`min-w-0 rounded-3xl border-l-4 bg-white p-5 shadow-sm sm:p-6 ${border}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl" title={value}>{value}</p></div><div className={`shrink-0 rounded-2xl p-3 ${iconColor.join(' ')}`}>{icon}</div></div><p className="mt-4 truncate text-sm text-slate-500" title={detail}>{detail}</p></article>;
};

export default ExpensesPage;
