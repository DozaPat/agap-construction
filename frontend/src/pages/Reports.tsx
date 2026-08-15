import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Download,
  FileChartColumnIncreasing,
  Layers3,
  LoaderCircle,
  X,
} from 'lucide-react';
import api from '../lib/api';
import { buildDetailedReportPdf, loadReportLogo, reportFileName } from '../lib/reportPdf';
import type { DetailedReport, ReportType } from '../reportTypes';

interface ProjectOption {
  _id: string;
  name: string;
  status: string;
}

interface Notice {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const months = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2026, index, 1).toLocaleDateString('en-PH', { month: 'long' }),
}));

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatPeriodDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const getDateBounds = (type: ReportType, year: number, month: number, weekDate: string) => {
  if (type === 'weekly') {
    const anchor = new Date(`${weekDate}T00:00:00`);
    const day = anchor.getDay();
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + (day === 0 ? -6 : 1 - day));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: formatInputDate(monday), to: formatInputDate(sunday) };
  }
  if (type === 'monthly') {
    return {
      from: formatInputDate(new Date(year, month - 1, 1)),
      to: formatInputDate(new Date(year, month, 0)),
    };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31` };
};

const reportTypes: { value: ReportType; title: string; detail: string; icon: typeof CalendarDays }[] = [
  { value: 'weekly', title: 'Weekly', detail: 'Monday to Sunday operations', icon: CalendarDays },
  { value: 'monthly', title: 'Monthly', detail: 'Full calendar month analysis', icon: CalendarRange },
  { value: 'annual', title: 'Annual', detail: 'Full-year management report', icon: CalendarClock },
];

const Reports = () => {
  const today = new Date();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [weekDate, setWeekDate] = useState(formatInputDate(today));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const years = Array.from({ length: 12 }, (_, index) => today.getFullYear() + 2 - index);
  const period = useMemo(
    () => getDateBounds(reportType, selectedYear, selectedMonth, weekDate),
    [reportType, selectedYear, selectedMonth, weekDate],
  );
  const scopeName = selectedProjectId === 'all'
    ? 'All projects (consolidated)'
    : projects.find((project) => project._id === selectedProjectId)?.name || 'Selected project';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get<ProjectOption[]>('/projects');
        setProjects(data);
      } catch {
        setNotice({
          type: 'error',
          title: 'Projects unavailable',
          message: 'The project list could not be loaded. Check the backend connection and try again.',
        });
      } finally {
        setLoading(false);
      }
    };
    void fetchProjects();
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    setNotice(null);
    try {
      const { data } = await api.get<DetailedReport>('/reports/detailed', {
        params: {
          project: selectedProjectId === 'all' ? undefined : selectedProjectId,
          type: reportType,
          from: period.from,
          to: period.to,
        },
      });
      const logoDataUrl = await loadReportLogo();
      const document = buildDetailedReportPdf(data, logoDataUrl);
      document.save(reportFileName(data));
      setNotice({
        type: 'success',
        title: 'Detailed report downloaded',
        message: `${data.scope} was exported with live KPIs, descriptive analytics, charts, payroll, inventory, tools, and individual expense records.`,
      });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setNotice({
        type: 'error',
        title: 'Unable to generate the report',
        message: message || 'The report data could not be prepared. Please confirm the backend is running and try again.',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="h-6 w-6 animate-spin text-[#F59E0B]" />
        Preparing the reports workspace...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
      <header>
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] sm:text-4xl">Generate Reports</h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Turn live AGAP records into a structured, branded PDF for management, accounting, and clients.
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-6 text-white sm:px-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#F59E0B] p-3">
              <Layers3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold sm:text-2xl">Report configuration</h2>
              <p className="mt-1 text-sm text-slate-300">Choose the scope and reporting cycle. Every table and chart follows these filters.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="space-y-7">
            <div>
              <label htmlFor="report-project" className="mb-2 block text-sm font-semibold text-slate-700">Project scope</label>
              <select
                id="report-project"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-800 outline-none transition focus:border-[#F59E0B] focus:ring-4 focus:ring-orange-100"
              >
                <option value="all">All Projects - Consolidated Report</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>{project.name} ({project.status.replace(/-/g, ' ')})</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">Select all projects for a company-wide portfolio report, or isolate one project.</p>
            </div>

            <div>
              <span className="mb-3 block text-sm font-semibold text-slate-700">Report type</span>
              <div className="grid gap-3 sm:grid-cols-3">
                {reportTypes.map((option) => {
                  const Icon = option.icon;
                  const selected = reportType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReportType(option.value)}
                      className={`rounded-2xl border p-4 text-left transition ${selected
                        ? 'border-[#F59E0B] bg-orange-50 shadow-sm ring-2 ring-orange-100'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`mb-4 h-6 w-6 ${selected ? 'text-[#F59E0B]' : 'text-slate-500'}`} />
                      <span className="block font-semibold text-slate-900">{option.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{option.detail}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Reporting period</label>
              {reportType === 'weekly' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="week-date" className="mb-1.5 block text-xs text-slate-500">Choose any date in the week</label>
                    <input
                      id="week-date"
                      type="date"
                      value={weekDate}
                      onChange={(event) => setWeekDate(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5">
                    <span className="block text-xs font-medium text-blue-600">Normalized payroll week</span>
                    <span className="mt-1 block font-semibold text-blue-950">{formatPeriodDate(period.from)} - {formatPeriodDate(period.to)}</span>
                  </div>
                </div>
              )}
              {reportType === 'monthly' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    aria-label="Report month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(Number(event.target.value))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-orange-100"
                  >
                    {months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                  </select>
                  <select
                    aria-label="Report year"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-orange-100"
                  >
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              )}
              {reportType === 'annual' && (
                <select
                  aria-label="Report year"
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-orange-100 sm:max-w-sm"
                >
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-white p-2.5 shadow-sm">
                <FileChartColumnIncreasing className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Report preview</p>
                <p className="font-semibold text-slate-900">{reportType.charAt(0).toUpperCase() + reportType.slice(1)} PDF</p>
              </div>
            </div>
            <dl className="space-y-4 border-y border-slate-200 py-5 text-sm">
              <div>
                <dt className="text-slate-500">Scope</dt>
                <dd className="mt-1 font-semibold text-slate-900">{scopeName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Period</dt>
                <dd className="mt-1 font-semibold text-slate-900">{formatPeriodDate(period.from)} - {formatPeriodDate(period.to)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Format</dt>
                <dd className="mt-1 font-semibold text-slate-900">Branded A4 multi-page PDF</dd>
              </div>
            </dl>
          </aside>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => void generateReport()}
            disabled={generating || (projects.length === 0 && selectedProjectId !== 'all')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#F59E0B] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
          >
            {generating ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
            {generating ? 'Preparing detailed report...' : 'Generate and Download PDF'}
          </button>
        </div>
      </section>

      {notice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${notice.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {notice.type === 'success' ? <CheckCircle2 className="h-7 w-7" /> : <X className="h-7 w-7" />}
              </div>
              <button type="button" onClick={() => setNotice(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close message">
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-5 text-2xl font-semibold text-slate-900">{notice.title}</h3>
            <p className="mt-2 leading-6 text-slate-600">{notice.message}</p>
            <button type="button" onClick={() => setNotice(null)} className="mt-7 w-full rounded-2xl bg-slate-900 py-3.5 font-semibold text-white hover:bg-slate-800">OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
