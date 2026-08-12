import { useState, useEffect } from 'react';
import { AlertTriangle, Banknote, Download, Edit, Package, Plus, Search, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Materials = () => {
  const { isAdmin } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    supplier: '',
    project: '',
  });

  // Success Modal
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [materialsRes, projectsRes] = await Promise.all([
        api.get('/materials'),
        api.get('/projects')
      ]);
      setMaterials(materialsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProject = projects.find((project) => project._id === projectFilter);
  const projectMaterials = materials.filter((material) => material.project?._id === projectFilter);
  const filteredMaterials = projectMaterials.filter((material) => {
    const query = searchTerm.trim().toLowerCase();
    return [material.materialId || '', material.name, material.category || '', material.supplier || '']
      .some((value) => value.toLowerCase().includes(query));
  });
  const totalMaterialValue = projectMaterials.reduce(
    (total, material) =>
      total + Number(material.totalValue ?? material.quantity * material.unitPrice),
    0,
  );
  const lowStockItems = projectMaterials.filter(
    (material) =>
      material.isLowStock ??
      Number(material.quantity) <= Number(material.reorderPoint ?? 20),
  ).length;

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));

  const openCreate = () => {
    if (!projectFilter) return;
    setFormData({
      name: '',
      category: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      supplier: '',
      project: projectFilter,
    });
    setIsCreateOpen(true);
  };
  const openEdit = (material: any) => {
    setSelectedMaterial(material);
    setFormData({
      name: material.name,
      category: material.category || '',
      quantity: material.quantity || '',
      unit: material.unit || '',
      unitPrice: material.unitPrice || '',
      supplier: material.supplier || '',
      project: material.project?._id || '',
    });
    setIsEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        project: formData.project || undefined,
      };

      if (isEdit && selectedMaterial) {
        await api.put(`/materials/${selectedMaterial._id}`, payload);
        setSuccessModal({ title: 'Material Updated', message: 'Material updated successfully!' });
        setIsEditOpen(false);
      } else {
        await api.post('/materials', payload);
        setSuccessModal({ title: 'Material Created', message: 'Material created successfully!' });
        setIsCreateOpen(false);
      }

      setFormData({ name: '', category: '', quantity: '', unit: '', unitPrice: '', supplier: '', project: '' });
      fetchData();
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal(id);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await api.delete(`/materials/${deleteModal}`);
      setSuccessModal({ title: 'Material Deleted', message: 'Material deleted successfully!' });
      fetchData();
    } catch (error) {
      alert('❌ Delete failed');
    } finally {
      setDeleteModal(null);
    }
  };

  const downloadPdf = () => {
    if (!selectedProject || projectMaterials.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AGAP Construction - Materials Inventory', pageWidth / 2, 14, {
      align: 'center',
    });
    doc.setFontSize(13);
    doc.text(selectedProject.name, pageWidth / 2, 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Materials: ' + projectMaterials.length, 12, 29);
    doc.text('Low stock: ' + lowStockItems, 104, 29);
    doc.text(
      'Total value: PHP ' + totalMaterialValue.toLocaleString('en-PH'),
      178,
      29,
    );

    autoTable(doc, {
      startY: 34,
      head: [[
        'Material ID',
        'Material',
        'Category',
        'Quantity',
        'Unit',
        'Unit Cost',
        'Total Value',
        'Stock',
        'Supplier',
      ]],
      body: projectMaterials.map((material) => {
        const total = Number(
          material.totalValue ?? material.quantity * material.unitPrice,
        );
        const low =
          material.isLowStock ??
          Number(material.quantity) <= Number(material.reorderPoint ?? 20);
        return [
          material.materialId,
          material.name,
          material.category,
          Number(material.quantity).toLocaleString('en-PH'),
          material.unit,
          'PHP ' + Number(material.unitPrice).toLocaleString('en-PH'),
          'PHP ' + total.toLocaleString('en-PH'),
          low ? 'Low' : 'Sufficient',
          material.supplier || '-',
        ];
      }),
      theme: 'grid',
      margin: { left: 10, right: 10 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 33 },
        1: { cellWidth: 37 },
        2: { cellWidth: 25 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 18 },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 28, halign: 'right' },
        7: { cellWidth: 20 },
        8: { cellWidth: 48 },
      },
    });

    const tableEnd = (doc as jsPDF & {
      lastAutoTable?: { finalY: number };
    }).lastAutoTable?.finalY || 55;
    let summaryY = tableEnd + 9;
    if (summaryY > 185) {
      doc.addPage('a4', 'landscape');
      summaryY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      'Total material value: PHP ' +
        totalMaterialValue.toLocaleString('en-PH'),
      12,
      summaryY,
    );
    doc.text('Low stock items: ' + lowStockItems, 150, summaryY);

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Generated ' + new Date().toLocaleString('en-PH'), 10, 203);
      doc.text('Page ' + page + ' of ' + pageCount, pageWidth - 10, 203, {
        align: 'right',
      });
    }

    const safeProjectName = selectedProject.name
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    doc.save('Materials_' + safeProjectName + '.pdf');
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading materials...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-[#1E293B] sm:text-4xl">Materials Management</h1>
          <p className="text-gray-600 mt-1">Track inventory and material usage per project</p>
        </div>

        {isAdmin && (
          <button 
            onClick={openCreate}
            disabled={!projectFilter}
            title={projectFilter ? 'Add material' : 'Select a project first'}
            className="flex w-full items-center justify-center gap-3 rounded-3xl bg-[#F59E0B] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Add Material
          </button>
        )}
      </div>

      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <label>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Package className="h-5 w-5 text-amber-500" />
            Select a project to view its materials
          </span>
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setSearchTerm('');
            }}
            className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-slate-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          >
            <option value="">Choose a project...</option>
            {projects.map((p: any) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      {projectFilter ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-3xl border border-l-4 border-slate-100 border-l-blue-600 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Banknote className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-500">Total Material Value</p>
              <p className="mt-2 break-words text-[clamp(1.6rem,4vw,2.5rem)] font-bold leading-tight text-slate-800">
                {formatMoney(totalMaterialValue)}
              </p>
              <p className="mt-3 text-sm text-blue-700">
                {projectMaterials.length} material item{projectMaterials.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-3xl border border-l-4 border-slate-100 border-l-amber-500 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-500">Low Stock Items</p>
              <p className="mt-2 text-[clamp(1.6rem,4vw,2.5rem)] font-bold leading-tight text-slate-800">
                {lowStockItems}
              </p>
              <p className="mt-3 text-sm text-amber-700">Quantity at or below reorder point</p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 rounded-3xl bg-white p-2 shadow-sm sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by ID, material, category, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-14 pr-5 outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={projectMaterials.length === 0}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              Download PDF
            </button>
          </div>
      {/* Materials Table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="border-b bg-[#1E293B]">
              <th className="px-5 py-5 text-left text-sm font-medium text-white">Material ID</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Material</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Quantity</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Unit</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Unit Cost</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Total Value</th>
              <th className="px-5 py-5 text-left text-sm font-medium text-white">Stock</th>
              <th className="px-8 py-5 text-left text-sm font-medium text-white">Supplier</th>
              <th className="px-8 py-5 text-right text-sm font-medium text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-8 py-12 text-center text-gray-400">
                  No materials found.
                </td>
              </tr>
            ) : (
              filteredMaterials.map((item: any) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-6">
                    <span className="rounded-xl bg-slate-100 px-3 py-2 font-mono text-xs font-semibold text-slate-700">
                      {item.materialId}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-medium text-[#1E293B]">{item.name}</td>
                  <td className="px-8 py-6 font-semibold">{item.quantity}</td>
                  <td className="px-8 py-6 text-gray-600">{item.unit}</td>
                  <td className="px-8 py-6 text-right font-medium">{formatMoney(item.unitPrice)}</td>
                  <td className="px-8 py-6 text-right font-bold text-blue-700">
                    {formatMoney(Number(item.totalValue ?? item.quantity * item.unitPrice))}
                  </td>
                  <td className="px-5 py-6">
                    <span className={'rounded-full px-3 py-1 text-xs font-semibold ' +
                      ((item.isLowStock ?? Number(item.quantity) <= Number(item.reorderPoint ?? 20))
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700')}>
                      {(item.isLowStock ?? Number(item.quantity) <= Number(item.reorderPoint ?? 20))
                        ? 'Low Stock' : 'Sufficient'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-gray-600">{item.supplier || '-'}</td>
                  <td className="px-8 py-6 text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-700">
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteClick(item._id)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-700">
            Select a project to view materials
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Summary cards, project inventory, calculated values, and the PDF
            report will appear after you choose a project.
          </p>
        </div>
      )}

      {/* ADD / EDIT MODAL - YOUR ORIGINAL STYLE */}
      {(isCreateOpen || isEditOpen) && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white">
            <div className="border-b px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
              <h2 className="text-2xl font-bold text-[#1E293B] sm:text-3xl">
                {isEditOpen ? 'Edit Material' : 'Add New Material'}
              </h2>
            </div>

            <form onSubmit={(e) => handleSubmit(e, isEditOpen)} className="space-y-6 p-5 sm:p-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Material Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="">Select Category</option>
                    <option value="Cement">Cement</option>
                    <option value="Steel">Steel</option>
                    <option value="Sand">Sand</option>
                    <option value="Gravel">Gravel</option>
                    <option value="Lumber">Lumber</option>
                    <option value="Paint">Paint</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Quantity</label>
                  <input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Unit</label>
                  <select 
                    value={formData.unit} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="">Select Unit</option>
                    <option value="bags">bags</option>
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                    <option value="pieces">pieces</option>
                    <option value="liters">liters</option>
                    <option value="meters">meters</option>
                    <option value="boxes">boxes</option>
                    <option value="rolls">rolls</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Unit Cost (₱)</label>
                  <input 
                    type="number" 
                    value={formData.unitPrice} 
                    onChange={(e) => setFormData({...formData, unitPrice: e.target.value})} 
                    required 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-sm font-medium text-blue-700">Calculated Total Value</p>
                  <p className="mt-2 break-words text-2xl font-bold text-blue-900">
                    {formatMoney(
                      Number(formData.quantity || 0) * Number(formData.unitPrice || 0),
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Supplier</label>
                  <input 
                    type="text" 
                    value={formData.supplier} 
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})} 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Project</label>
                  <select 
                    value={formData.project} 
                    required
                    onChange={(e) => setFormData({...formData, project: e.target.value})} 
                    className="w-full px-5 py-4 bg-[#F8FAFC] border border-gray-200 rounded-3xl focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} 
                  className="flex-1 py-4 text-gray-600 hover:bg-gray-100 rounded-3xl font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[#F59E0B] hover:bg-orange-600 py-4 text-white font-semibold rounded-3xl"
                >
                  {isEditOpen ? 'Update Material' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <h3 className="text-2xl font-semibold text-[#1E293B] mb-2">{successModal.title}</h3>
            <p className="text-gray-600 mb-8">{successModal.message}</p>
            <button 
              onClick={() => setSuccessModal(null)}
              className="w-full bg-[#F59E0B] hover:bg-orange-600 py-4 text-white font-semibold rounded-3xl text-lg"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
            <h3 className="text-xl font-semibold text-[#1E293B] mb-4">Delete this material?</h3>
            <p className="text-gray-600 mb-8">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-4 text-gray-600 font-medium border border-gray-200 rounded-3xl"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 py-4 text-white font-semibold rounded-3xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
