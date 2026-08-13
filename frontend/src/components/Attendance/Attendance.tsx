import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Download,
  LoaderCircle,
  Save,
  Users,
  WalletCards,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import NumberedPagination from '../NumberedPagination';
import ProjectLifecycleNotice from '../ProjectLifecycleNotice';
import { isProjectOperational, projectLifecycleMessage, type ProjectStatus } from '../../lib/projectLifecycle';

interface ProjectSummary {
  _id: string;
  name: string;
  status: ProjectStatus;
}

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

interface AttendanceRecord {
  worker: string;
  workerName: string;
  position: string;
  dailySalary: number;
  days: Record<DayKey, boolean>;
  bonus: number;
  overtime: number;
}

interface AttendanceResponse {
  _id: string | null;
  project: ProjectSummary;
  weekStart: string;
  records: AttendanceRecord[];
  updatedAt: string | null;
  readOnly: boolean;
  statusMessage: string | null;
}

interface AttendanceProps {
  projects: ProjectSummary[];
}

const dayColumns: Array<{ key: DayKey; short: string; label: string }> = [
  { key: 'monday', short: 'M', label: 'Monday' },
  { key: 'tuesday', short: 'T', label: 'Tuesday' },
  { key: 'wednesday', short: 'W', label: 'Wednesday' },
  { key: 'thursday', short: 'Th', label: 'Thursday' },
  { key: 'friday', short: 'F', label: 'Friday' },
  { key: 'saturday', short: 'Sa', label: 'Saturday' },
  { key: 'sunday', short: 'Su', label: 'Sunday' },
];

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonday = (value = toDateInput(new Date())) => {
  const date = new Date(`${value}T12:00:00`);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return toDateInput(date);
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount);

const countPresentDays = (record: AttendanceRecord) =>
  dayColumns.reduce((count, day) => count + (record.days[day.key] ? 1 : 0), 0);

const calculateRecord = (record: AttendanceRecord) => {
  const daysPresent = countPresentDays(record);
  const baseSalary = daysPresent * Number(record.dailySalary || 0);
  const total = baseSalary + Number(record.bonus || 0) + Number(record.overtime || 0);
  return { daysPresent, baseSalary, total };
};

const Attendance = ({ projects }: AttendanceProps) => {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;
  const [projectId, setProjectId] = useState('');
  const [weekStart, setWeekStart] = useState(getMonday());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attendancePage, setAttendancePage] = useState(1);

  const selectedProject = projects.find((project) => project._id === projectId);
  const projectOperational = isProjectOperational(selectedProject);
  const canEditAttendance = canManage && projectOperational;
  const attendancePageSize = 10;
  const activeAttendancePage = Math.min(
    attendancePage,
    Math.max(1, Math.ceil(records.length / attendancePageSize))
  );
  const paginatedRecords = records.slice(
    (activeAttendancePage - 1) * attendancePageSize,
    activeAttendancePage * attendancePageSize
  );

  const summary = useMemo(() => records.reduce(
    (totals, record) => {
      const calculation = calculateRecord(record);
      return {
        presentDays: totals.presentDays + calculation.daysPresent,
        payroll: totals.payroll + calculation.total,
      };
    },
    { presentDays: 0, payroll: 0 },
  ), [records]);

  const weekRange = useMemo(() => {
    const start = new Date(`${weekStart}T12:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-PH')} to ${end.toLocaleDateString('en-PH')}`;
  }, [weekStart]);

  const loadAttendance = async (nextProjectId: string, nextWeekStart: string) => {
    if (!nextProjectId) {
      setRecords([]);
      setSheetId(null);
      setUpdatedAt(null);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.get<AttendanceResponse>('/attendance', {
        params: {
          project: nextProjectId,
          weekStart: nextWeekStart,
        },
      });
      setRecords(data.records);
      setSheetId(data._id);
      setUpdatedAt(data.updatedAt);
      setWeekStart(data.weekStart.slice(0, 10));
    } catch (requestError: unknown) {
      const message = (requestError as {
        response?: { data?: { message?: string } };
      }).response?.data?.message;
      setRecords([]);
      setError(message || 'Unable to load attendance for this project.');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (nextProjectId: string) => {
    setAttendancePage(1);
    setProjectId(nextProjectId);
    void loadAttendance(nextProjectId, weekStart);
  };

  const handleWeekChange = (value: string) => {
    setAttendancePage(1);
    const monday = getMonday(value);
    setWeekStart(monday);
    void loadAttendance(projectId, monday);
  };

  const toggleDay = (workerId: string, day: DayKey) => {
    if (!canEditAttendance) return;
    setNotice('');
    setRecords((current) => current.map((record) =>
      record.worker === workerId
        ? {
          ...record,
          days: {
            ...record.days,
            [day]: !record.days[day],
          },
        }
        : record
    ));
  };

  const updateAdditionalPay = (
    workerId: string,
    field: 'bonus' | 'overtime',
    value: string,
  ) => {
    if (!canEditAttendance) return;
    const amount = Math.max(0, Number(value) || 0);
    setNotice('');
    setRecords((current) => current.map((record) =>
      record.worker === workerId
        ? { ...record, [field]: amount }
        : record
    ));
  };

  const saveAttendance = async () => {
    if (!projectId || !canEditAttendance || saving) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put<AttendanceResponse>('/attendance', {
        project: projectId,
        weekStart,
        records,
      });
      setRecords(data.records);
      setSheetId(data._id);
      setUpdatedAt(data.updatedAt);
      setNotice('Attendance and payroll totals saved successfully.');
    } catch (requestError: unknown) {
      const message = (requestError as {
        response?: { data?: { message?: string } };
      }).response?.data?.message;
      setError(message || 'Unable to save the attendance sheet.');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => {
    if (!selectedProject || records.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AGAP Construction - Weekly Attendance Sheet', pageWidth / 2, 14, {
      align: 'center',
    });
    doc.setFontSize(13);
    doc.text(selectedProject.name, pageWidth / 2, 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Week: ${weekRange}`, 12, 29);
    doc.text(`Workers: ${records.length}`, 116, 29);
    doc.text(`Prepared: ${new Date().toLocaleDateString('en-PH')}`, 224, 29);

    const rows = records.map((record) => {
      const calculation = calculateRecord(record);
      return [
        record.workerName,
        record.position,
        `PHP ${record.dailySalary.toLocaleString('en-PH')}`,
        ...dayColumns.map((day) => record.days[day.key] ? 'P' : '-'),
        calculation.daysPresent,
        `PHP ${calculation.baseSalary.toLocaleString('en-PH')}`,
        `PHP ${Number(record.bonus || 0).toLocaleString('en-PH')}`,
        `PHP ${Number(record.overtime || 0).toLocaleString('en-PH')}`,
        `PHP ${calculation.total.toLocaleString('en-PH')}`,
      ];
    });

    autoTable(doc, {
      startY: 34,
      head: [[
        'Worker',
        'Role',
        'Daily Rate',
        ...dayColumns.map((day) => day.short),
        'Days',
        'Base Pay',
        'Bonus',
        'OT',
        'Total',
      ]],
      body: rows,
      theme: 'grid',
      margin: { left: 10, right: 10 },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
        halign: 'center',
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 34, halign: 'left' },
        1: { cellWidth: 22, halign: 'left' },
        2: { cellWidth: 22 },
        10: { cellWidth: 13 },
        11: { cellWidth: 24 },
        12: { cellWidth: 21 },
        13: { cellWidth: 21 },
        14: { cellWidth: 25 },
      },
    });

    const tableEnd = (doc as jsPDF & {
      lastAutoTable?: { finalY: number };
    }).lastAutoTable?.finalY || 55;
    let summaryY = tableEnd + 9;

    if (summaryY > 178) {
      doc.addPage('a4', 'landscape');
      summaryY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total present days: ${summary.presentDays}`, 12, summaryY);
    doc.text(
      `Total payroll: PHP ${summary.payroll.toLocaleString('en-PH')}`,
      112,
      summaryY,
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Prepared by: ______________________________', 12, summaryY + 16);
    doc.text('Approved by: ______________________________', 165, summaryY + 16);

    const safeProjectName = selectedProject.name
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    doc.save(`${safeProjectName}_Attendance_${weekStart}.pdf`);
    setNotice('Attendance PDF downloaded to your device.');
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-600">
              Select Project
            </span>
            <select
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-slate-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">Choose a project...</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-600">
              Attendance Week
            </span>
            <input
              type="date"
              value={weekStart}
              onChange={(event) => handleWeekChange(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-slate-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-4 w-4" />
            Week: {weekRange}
          </p>
          {updatedAt && (
            <p className="text-slate-400">
              Last saved {new Date(updatedAt).toLocaleString('en-PH')}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          {notice}
        </div>
      )}

      {projectId && (
        <>
          <ProjectLifecycleNotice
            project={selectedProject}
            activity="assign workers or update attendance and payroll"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border-l-4 border-l-blue-600 bg-white p-5 shadow-sm">
              <Users className="mb-3 h-6 w-6 text-blue-600" />
              <p className="text-sm text-slate-500">Assigned Workers</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{records.length}</p>
            </div>
            <div className="rounded-2xl border-l-4 border-l-amber-500 bg-white p-5 shadow-sm">
              <CalendarDays className="mb-3 h-6 w-6 text-amber-600" />
              <p className="text-sm text-slate-500">Total Present Days</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{summary.presentDays}</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border-l-4 border-l-emerald-600 bg-white p-5 shadow-sm">
              <WalletCards className="mb-3 h-6 w-6 text-emerald-600" />
              <p className="text-sm text-slate-500">Weekly Payroll</p>
              <p className="mt-1 truncate text-2xl font-bold text-slate-800 sm:text-3xl">
                {formatMoney(summary.payroll)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={records.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              Download PDF
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => void saveAttendance()}
                disabled={saving || loading || records.length === 0 || !projectOperational}
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3.5 font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? <LoaderCircle className="h-5 w-5 animate-spin" />
                  : <Save className="h-5 w-5" />}
                {saving ? 'Saving...' : sheetId ? 'Update Attendance' : 'Save Attendance'}
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px]">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="sticky left-0 z-10 min-w-52 bg-slate-800 px-5 py-4 text-left text-sm">
                      Worker
                    </th>
                    <th className="px-3 py-4 text-right text-sm">Daily Rate</th>
                    {dayColumns.map((day) => (
                      <th key={day.key} className="px-3 py-4 text-center text-sm" title={day.label}>
                        {day.short}
                      </th>
                    ))}
                    <th className="px-3 py-4 text-center text-sm">Days</th>
                    <th className="px-3 py-4 text-right text-sm">Base Pay</th>
                    <th className="min-w-32 px-3 py-4 text-right text-sm">Bonus</th>
                    <th className="min-w-32 px-3 py-4 text-right text-sm">OT</th>
                    <th className="px-5 py-4 text-right text-sm">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!projectOperational && selectedProject && (
                    <tr>
                      <td colSpan={15} className="bg-amber-50 px-6 py-4 text-center text-sm font-semibold text-amber-800">
                        {projectLifecycleMessage(selectedProject, 'assign workers or update attendance and payroll')}
                      </td>
                    </tr>
                  )}
                  {loading ? (
                    <tr>
                      <td colSpan={15} className="px-6 py-16 text-center text-slate-500">
                        <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />
                        Loading assigned workers...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-6 py-16 text-center text-slate-400">
                        No workers are assigned to this project.
                      </td>
                    </tr>
                  ) : paginatedRecords.map((record) => {
                    const calculation = calculateRecord(record);
                    return (
                      <tr key={record.worker} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-[1] bg-white px-5 py-4">
                          <p className="font-semibold text-slate-800">{record.workerName}</p>
                          <p className="text-xs text-slate-500">{record.position}</p>
                        </td>
                        <td className="px-3 py-4 text-right font-medium text-slate-700">
                          {formatMoney(record.dailySalary)}
                        </td>
                        {dayColumns.map((day) => (
                          <td key={day.key} className="px-3 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={record.days[day.key]}
                              disabled={!canEditAttendance}
                              onChange={() => toggleDay(record.worker, day.key)}
                              aria-label={`${record.workerName} present on ${day.label}`}
                              className="h-5 w-5 cursor-pointer accent-amber-500 disabled:cursor-not-allowed"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-4 text-center font-bold text-slate-800">
                          {calculation.daysPresent}
                        </td>
                        <td className="px-3 py-4 text-right font-semibold text-slate-700">
                          {formatMoney(calculation.baseSalary)}
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={record.bonus || ''}
                            disabled={!canEditAttendance}
                            onChange={(event) => updateAdditionalPay(
                              record.worker,
                              'bonus',
                              event.target.value,
                            )}
                            aria-label={`Bonus for ${record.workerName}`}
                            className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right outline-none focus:border-amber-500 disabled:cursor-not-allowed"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={record.overtime || ''}
                            disabled={!canEditAttendance}
                            onChange={(event) => updateAdditionalPay(
                              record.worker,
                              'overtime',
                              event.target.value,
                            )}
                            aria-label={`Overtime pay for ${record.workerName}`}
                            className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right outline-none focus:border-amber-500 disabled:cursor-not-allowed"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-700">
                          {formatMoney(calculation.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {records.length > 0 && (
                  <tfoot className="bg-slate-100">
                    <tr>
                      <td colSpan={10} className="px-5 py-4 text-right font-bold text-slate-700">
                        Weekly Total
                      </td>
                      <td className="px-3 py-4 text-center font-bold text-slate-800">
                        {summary.presentDays}
                      </td>
                      <td colSpan={3} />
                      <td className="px-5 py-4 text-right text-lg font-bold text-emerald-700">
                        {formatMoney(summary.payroll)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <NumberedPagination currentPage={activeAttendancePage} totalItems={records.length} pageSize={attendancePageSize} maxVisiblePages={10} itemLabel="workers" onPageChange={setAttendancePage} />
          </div>
        </>
      )}

      {!projectId && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <CalendarDays className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700">Select a project to begin</h3>
          <p className="mt-2 text-sm text-slate-500">
            Assigned workers and their weekly attendance will appear here.
          </p>
        </div>
      )}
    </section>
  );
};

export default Attendance;
