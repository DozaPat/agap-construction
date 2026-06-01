import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import api from '../lib/api';
import jsPDF from 'jspdf';

const Reports = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const generatePDF = async () => {
    if (!selectedProjectId) {
      alert('Please select a project first!');
      return;
    }

    const project = projects.find((p: any) => p._id === selectedProjectId);
    if (!project) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 25;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('AGAP Construction Report', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(18);
    doc.text(project.name, 105, y, { align: 'center' });
    y += 10;

    const period = reportType === 'yearly' 
      ? `Yearly Report - ${selectedYear}` 
      : `${new Date(2025, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear} Report`;
    doc.setFontSize(14);
    doc.text(period, 105, y, { align: 'center' });
    y += 20;

    // Project Details
    doc.setFontSize(12);
    doc.text(`Budget: PHP ${Number(project.budget || 0).toLocaleString()}`, 20, y);
    y += 8;
    doc.text(`Progress: ${project.progress || 0}%`, 20, y);
    y += 8;
    doc.text(`Status: ${project.status?.toUpperCase() || 'PENDING'}`, 20, y);
    y += 8;
    doc.text(`Location: ${project.location || '—'}`, 20, y);
    y += 15;

    // Financial Summary
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, y);
    y += 10;
    doc.setFontSize(12);
    const totalExpenses = Number(project.totalExpenses || 0);
    doc.text(`Total Expenses: PHP ${totalExpenses.toLocaleString()}`, 30, y);
    y += 8;
    doc.text(`Remaining Budget: PHP ${(Number(project.budget || 0) - totalExpenses).toLocaleString()}`, 30, y);
    y += 20;

    // Expense Summary (placeholder for now)
    doc.setFontSize(14);
    doc.text('Recent Expenses', 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.text('Detailed expense list coming in full version.', 30, y);
    y += 15;

    // Workers Summary
    doc.setFontSize(14);
    doc.text('Assigned Workers', 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.text('Detailed worker list coming in full version.', 30, y);
    y += 15;

    // Materials & Tools
    doc.setFontSize(14);
    doc.text('Materials & Tools Summary', 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.text('Detailed inventory summary coming in full version.', 30, y);

    // Footer
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-PH')}`, 20, 280);

    // Save PDF
    const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${reportType}_report.pdf`;
    doc.save(fileName);

    alert('✅ Detailed PDF report downloaded successfully!');
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading reports...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#1E293B]">Generate Reports</h1>
        <p className="text-gray-600 mt-1">Create and download professional PDF reports for your projects</p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm max-w-2xl mx-auto">
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-500 mb-3">Select Project</label>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-3xl py-5 px-6 focus:outline-none focus:border-[#F59E0B] text-lg"
          >
            <option value="">Choose a project...</option>
            {projects.map((project: any) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-500 mb-3">Report Type</label>
          <div className="flex gap-4">
            <button onClick={() => setReportType('monthly')} className={`flex-1 py-4 rounded-3xl font-medium transition-colors ${reportType === 'monthly' ? 'bg-[#F59E0B] text-white' : 'bg-[#F8FAFC] text-gray-700 hover:bg-gray-200'}`}>Monthly Report</button>
            <button onClick={() => setReportType('yearly')} className={`flex-1 py-4 rounded-3xl font-medium transition-colors ${reportType === 'yearly' ? 'bg-[#F59E0B] text-white' : 'bg-[#F8FAFC] text-gray-700 hover:bg-gray-200'}`}>Yearly Report</button>
          </div>
        </div>

        <div className="mb-10">
          <label className="block text-sm font-medium text-gray-500 mb-3">
            {reportType === 'yearly' ? 'Select Year' : 'Select Month & Year'}
          </label>
          <div className="flex gap-4">
            {reportType === 'monthly' && (
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="flex-1 bg-[#F8FAFC] border border-gray-200 rounded-3xl py-5 px-6 focus:outline-none focus:border-[#F59E0B]">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2025, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            )}
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="flex-1 bg-[#F8FAFC] border border-gray-200 rounded-3xl py-5 px-6 focus:outline-none focus:border-[#F59E0B]">
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generatePDF}
          disabled={!selectedProjectId}
          className="w-full bg-[#F59E0B] hover:bg-orange-600 py-5 text-white font-semibold text-xl rounded-3xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
        >
          <Download className="w-6 h-6" />
          Generate & Download PDF Report
        </button>
      </div>
    </div>
  );
};

export default Reports;