'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Download, 
  CheckCircle, 
  Clock, 
  FileText, 
  RotateCw, 
  Eye, 
  X, 
  AlertTriangle, 
  Check, 
  Users, 
  Calendar, 
  Loader2,
  DollarSign,
  AlertCircle,
  Trash2,
  Printer,
  Copy,
  Search,
  ArrowDownRight,
  TrendingUp,
  Sparkles,
  Building2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/axios';
import { PayrollBatch, PayrollRecordItem } from '@/types';
import Pagination from '@/components/common/Pagination';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalaryPage() {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<PayrollBatch | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Batch Breakdown Modal Helpers
  const [modalSearch, setModalSearch] = useState('');
  const [copiedBatchId, setCopiedBatchId] = useState(false);
  const [viewingSlipRecord, setViewingSlipRecord] = useState<PayrollRecordItem | null>(null);
  const [copiedSlipNumber, setCopiedSlipNumber] = useState(false);

  // New Batch Form
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  // Helper for Initials
  const getInitials = (firstName?: string, lastName?: string) => {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return `${f}${l}`.toUpperCase() || 'EM';
  };

  // Fetch batches from backend API
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/salary/batches');
      const data: PayrollBatch[] = Array.isArray(res.data) ? res.data : [];
      setBatches(data);
    } catch (err: any) {
      console.error('Failed to load payroll batches:', err);
      setError(err?.response?.data?.message || 'Could not connect to backend server to load payroll batches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Handle Create Payroll Batch
  const handleProcessNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await api.post('/salary/batches', {
        year: Number(selectedYear),
        month: Number(selectedMonth),
      });

      const newBatch: PayrollBatch = res.data;
      setBatches((prev) => [newBatch, ...prev]);
      setIsCreateModalOpen(false);
      alert(`Payroll batch for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} calculated & generated successfully!`);
    } catch (err: any) {
      console.error('Failed to create payroll batch:', err);
      const msg = err?.response?.data?.message || 'Failed to generate payroll batch. Please verify active employees and inputs.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Handle Approve Batch
  const handleApproveBatch = async (batchId: string) => {
    setActionLoadingId(batchId);
    try {
      const res = await api.post(`/salary/batches/${batchId}/approve`);
      setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, ...res.data, status: 'APPROVED' } : b)));
      if (selectedBatchDetails?.id === batchId) {
        setSelectedBatchDetails((prev) => prev ? { ...prev, ...res.data, status: 'APPROVED' } : null);
      }
      alert('Payroll Batch approved successfully!');
    } catch (err: any) {
      console.error('Failed to approve batch:', err);
      alert(err?.response?.data?.message || 'Failed to approve payroll batch.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Mark as Paid
  const handleMarkPaid = async (batchId: string) => {
    setActionLoadingId(batchId);
    try {
      const res = await api.post(`/salary/batches/${batchId}/pay`);
      setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, ...res.data, status: 'PAID' } : b)));
      if (selectedBatchDetails?.id === batchId) {
        setSelectedBatchDetails((prev) => prev ? { ...prev, ...res.data, status: 'PAID' } : null);
      }
      alert('Payroll Batch marked as PAID! Direct disbursement recorded.');
    } catch (err: any) {
      console.error('Failed to disburse batch:', err);
      alert(err?.response?.data?.message || 'Failed to mark payroll batch as paid.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Batch
  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this payroll batch? You can recalculate it afterwards.')) {
      return;
    }
    setActionLoadingId(batchId);
    try {
      await api.delete(`/salary/batches/${batchId}`);
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      if (selectedBatchDetails?.id === batchId) {
        setSelectedBatchDetails(null);
      }
      alert('Payroll batch deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete batch:', err);
      alert(err?.response?.data?.message || 'Failed to delete payroll batch.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Recalculate Batch
  const handleRecalculateBatch = async (batch: PayrollBatch) => {
    setActionLoadingId(batch.id);
    try {
      const res = await api.post('/salary/batches', {
        year: Number(batch.year),
        month: Number(batch.month),
      });
      await fetchBatches();
      if (selectedBatchDetails?.id === batch.id) {
        setSelectedBatchDetails(res.data);
      }
      alert(`Payroll batch for ${MONTH_NAMES[batch.month - 1]} ${batch.year} recalculated successfully with only leave deductions.`);
    } catch (err: any) {
      console.error('Failed to recalculate batch:', err);
      alert(err?.response?.data?.message || 'Failed to recalculate payroll batch.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // View batch details
  const handleViewDetails = async (batch: PayrollBatch) => {
    setModalSearch('');
    try {
      if (!batch.records || batch.records.length === 0) {
        const res = await api.get(`/salary/batches/${batch.id}`);
        setSelectedBatchDetails(res.data);
      } else {
        setSelectedBatchDetails(batch);
      }
    } catch (e) {
      setSelectedBatchDetails(batch);
    }
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const totalGross = batches.reduce((acc, b) => acc + Number(b.totalGrossPay || 0), 0);
    const totalDeductions = batches.reduce((acc, b) => acc + Number(b.totalDeductions || 0), 0);
    const totalNet = batches.reduce((acc, b) => acc + Number(b.totalNetPay || 0), 0);
    const approvedCount = batches.filter((b) => b.status === 'APPROVED' || b.status === 'PAID').length;
    return { totalGross, totalDeductions, totalNet, approvedCount, totalBatches: batches.length };
  }, [batches]);

  // Filtered Records inside Details Modal
  const filteredModalRecords = useMemo(() => {
    if (!selectedBatchDetails?.records) return [];
    if (!modalSearch.trim()) return selectedBatchDetails.records;
    const q = modalSearch.toLowerCase();
    return selectedBatchDetails.records.filter((rec) => {
      const fullName = `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.toLowerCase();
      const code = (rec.employee?.employeeCode || '').toLowerCase();
      const slipNum = (rec.payslip?.payslipNumber || '').toLowerCase();
      const dept = (rec.employee?.department || '').toLowerCase();
      return fullName.includes(q) || code.includes(q) || slipNum.includes(q) || dept.includes(q);
    });
  }, [selectedBatchDetails, modalSearch]);

  // Main Batches Table Pagination
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchPageSize, setBatchPageSize] = useState<number>(10);
  const totalBatchPages = Math.ceil(batches.length / batchPageSize) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (batchPage - 1) * batchPageSize;
    return batches.slice(start, start + batchPageSize);
  }, [batches, batchPage, batchPageSize]);

  // Modal Records Table Pagination
  const [modalPage, setModalPage] = useState<number>(1);
  const [modalPageSize, setModalPageSize] = useState<number>(10);
  useEffect(() => {
    setModalPage(1);
  }, [modalSearch, selectedBatchDetails?.id]);
  const totalModalPages = Math.ceil(filteredModalRecords.length / modalPageSize) || 1;
  const paginatedModalRecords = useMemo(() => {
    const start = (modalPage - 1) * modalPageSize;
    return filteredModalRecords.slice(start, start + modalPageSize);
  }, [filteredModalRecords, modalPage, modalPageSize]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Salary & Payroll Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dynamic payroll calculated from employee monthly salary with automated leave deductions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-2xs"
            title="Refresh database records"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refresh DB</span>
          </button>

          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Run Monthly Payroll</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {error}
          </div>
          <button onClick={fetchBatches} className="text-xs font-bold underline hover:text-amber-700">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Net Payouts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums tracking-tight">{formatCurrency(summary.totalNet)}</p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <CheckCircle className="h-3 w-3" /> Across {summary.totalBatches} payroll batches
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Salary Volume</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums tracking-tight">{formatCurrency(summary.totalGross)}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Based on registered employee CTC</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Deductions (PF / PT / Leaves)</p>
          <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums tracking-tight">-{formatCurrency(summary.totalDeductions)}</p>
          <span className="text-[11px] text-rose-600/80 mt-1 block">Includes LWP & statutory PF/PT</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Batches</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{summary.approvedCount} / {summary.totalBatches}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Processed through workflow</span>
        </div>
      </div>

      {/* Monthly Payroll Batches Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          {loading && batches.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-sm">Loading live payroll records from database...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Abhi tak koi Payroll Batch generate nahi hua hai</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Aap &quot;Run Monthly Payroll&quot; button par click karke kisi bhi month ki salary employee CTC aur leave deductions ke hisaab se auto-generate kar sakte hain.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Run First Monthly Payroll</span>
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Pay Period</th>
                    <th className="px-6 py-4">Employees</th>
                    <th className="px-6 py-4">Gross Earnings</th>
                    <th className="px-6 py-4">Deductions (Leaves/PF/PT)</th>
                    <th className="px-6 py-4">Net Payout</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBatches.map((b) => {
                    const monthName = MONTH_NAMES[b.month - 1] || `Month ${b.month}`;
                    const count = b.records?.length || 0;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-indigo-600" />
                            <span>{monthName} {b.year}</span>
                          </div>
                          {b.processedAt && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Processed on {formatDate(b.processedAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <span className="inline-flex items-center gap-1 font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs">
                            <Users className="h-3 w-3 text-slate-500" />
                            {count} Employee{count !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800 tabular-nums">
                          {formatCurrency(b.totalGrossPay)}
                        </td>
                        <td className="px-6 py-4 font-semibold text-rose-600 tabular-nums">
                          -{formatCurrency(b.totalDeductions)}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-700 text-base tabular-nums">
                          {formatCurrency(b.totalNetPay)}
                        </td>
                        <td className="px-6 py-4">
                          {b.status === 'PAID' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <CheckCircle className="h-3.5 w-3.5" /> Paid & Disbursed
                            </span>
                          )}
                          {b.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                              <Check className="h-3.5 w-3.5" /> Approved
                            </span>
                          )}
                          {b.status === 'PREVIEW' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                              <Clock className="h-3.5 w-3.5" /> In Preview
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleViewDetails(b)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs transition"
                            title="View individual employee salary slips and leave deductions"
                          >
                            <Eye className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Details</span>
                          </button>

                          {b.status === 'PREVIEW' && (
                            <>
                              <button
                                onClick={() => handleRecalculateBatch(b)}
                                disabled={actionLoadingId === b.id}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                                title="Recalculate batch with only leave deductions"
                              >
                                <RotateCw className={`h-3 w-3 text-slate-600 ${actionLoadingId === b.id ? 'animate-spin' : ''}`} />
                                <span>Recalculate</span>
                              </button>
                              <button
                                onClick={() => handleDeleteBatch(b.id)}
                                disabled={actionLoadingId === b.id}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                                title="Delete preview batch"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                              <button
                                onClick={() => handleApproveBatch(b.id)}
                                disabled={actionLoadingId === b.id}
                                className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50"
                              >
                                {actionLoadingId === b.id ? 'Approving...' : 'Approve'}
                              </button>
                            </>
                          )}

                          {b.status === 'APPROVED' && (
                            <button
                              onClick={() => handleMarkPaid(b.id)}
                              disabled={actionLoadingId === b.id}
                              className="rounded-xl bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-emerald-700 shadow-2xs transition disabled:opacity-50"
                            >
                              {actionLoadingId === b.id ? 'Processing...' : 'Mark as Paid'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

              {/* Batches Pagination */}
              <Pagination
                currentPage={batchPage}
                totalPages={totalBatchPages}
                totalItems={batches.length}
                pageSize={batchPageSize}
                onPageChange={setBatchPage}
                onPageSizeChange={setBatchPageSize}
              />
            </>
          )}
        </div>

      {/* Modal: Run Monthly Payroll */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Run Monthly Payroll</h2>
                <p className="text-xs text-slate-500">Auto-calculate salary & leave deductions from DB</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessNewBatch} className="space-y-4 mt-4">
              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Month Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Select Payroll Month <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Select Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                  required
                />
              </div>

              {/* Info Note */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Calculation Summary:</span>
                <p className="mt-1">
                  System database ke sabhi <strong>Active Employees</strong> ki registered Monthly Salary fetch karega aur unki <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> ki Leave Requests check karke keval <strong>Leave Without Pay (LWP)</strong> ka deduction calculate karega. Agar koi unpaid leave nahi hai to zero deduction hoga.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{creating ? 'Calculating Payroll...' : 'Generate Payroll Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Batch Breakdown & Payslips (Redesigned Enterprise UI) */}
      {selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-5xl my-auto rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Payroll Breakdown: {MONTH_NAMES[selectedBatchDetails.month - 1]} {selectedBatchDetails.year}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                    {selectedBatchDetails.status === 'PAID' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 border border-emerald-200/80">
                        <CheckCircle className="h-3.5 w-3.5" /> PAID & DISBURSED
                      </span>
                    )}
                    {selectedBatchDetails.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 border border-blue-200/80">
                        <Check className="h-3.5 w-3.5" /> APPROVED
                      </span>
                    )}
                    {selectedBatchDetails.status === 'PREVIEW' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-700 border border-amber-200/80">
                        <Clock className="h-3.5 w-3.5" /> IN PREVIEW
                      </span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {selectedBatchDetails.records?.length || 0} Employees in Batch
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                  title="Print batch summary report"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Print Report</span>
                </button>
                <button
                  onClick={() => setSelectedBatchDetails(null)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
                  title="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Batch Totals 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Gross Amount Card */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50/50 to-white border border-indigo-100/90 p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Amount</span>
                    <div className="h-9 w-9 rounded-xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mt-3 tracking-tight tabular-nums">
                    {formatCurrency(selectedBatchDetails.totalGrossPay)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Total earnings before deductions
                  </p>
                </div>

                {/* Deductions Card */}
                <div className="rounded-2xl bg-gradient-to-br from-rose-50/60 via-slate-50/50 to-white border border-rose-100/90 p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600/80 uppercase tracking-wider">Total Deductions</span>
                    <div className="h-9 w-9 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-rose-600 mt-3 tracking-tight tabular-nums">
                    -{formatCurrency(selectedBatchDetails.totalDeductions)}
                  </p>
                  <p className="text-xs text-rose-600/70 mt-1">
                    PF, Professional Tax & Leaves
                  </p>
                </div>

                {/* Net Disbursable Card */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50/90 via-emerald-50/30 to-white border border-emerald-200/90 p-5 shadow-2xs ring-1 ring-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Net Disbursable</span>
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-3 tracking-tight tabular-nums">
                    {formatCurrency(selectedBatchDetails.totalNetPay)}
                  </p>
                  <p className="text-xs text-emerald-700/80 mt-1 font-medium">
                    Final take-home payout volume
                  </p>
                </div>
              </div>

              {/* Search & Filter Header Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee name, code, payslip..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400"
                  />
                  {modalSearch && (
                    <button
                      onClick={() => setModalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>
                    Showing <strong className="text-slate-800 font-semibold">{filteredModalRecords.length}</strong> of{' '}
                    {selectedBatchDetails.records?.length || 0} employees
                  </span>
                </div>
              </div>

              {/* Individual Employee Records Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200/80 text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5">Employee</th>
                        <th className="px-5 py-3.5">Monthly Gross</th>
                        <th className="px-5 py-3.5">Attendance & Leaves</th>
                        <th className="px-5 py-3.5">Deductions Breakdown</th>
                        <th className="px-5 py-3.5">Net Pay</th>
                        <th className="px-5 py-3.5 text-right">Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredModalRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                            <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-600">No matching employees found</p>
                            <p className="text-xs text-slate-400 mt-0.5">Try searching with a different name or employee code</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedModalRecords.map((rec) => {
                          const empName = `${rec.employee?.firstName || ''} ${rec.employee?.lastName || ''}`.trim() || 'Employee';
                          const empCode = rec.employee?.employeeCode || 'EMP';
                          const hasUnpaid = Number(rec.unpaidDays) > 0;
                          const payslipCode = rec.payslip?.payslipNumber || `PAY-${selectedBatchDetails.year}${String(selectedBatchDetails.month).padStart(2, '0')}-${empCode}`;
                          const deductionsList = rec.lineItems?.filter((li) => li.type === 'DEDUCTION') || [];

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                              {/* Employee Profile */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                    {getInitials(rec.employee?.firstName, rec.employee?.lastName)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 text-sm block leading-tight">
                                      {empName}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="font-medium text-[11px] text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded">
                                        {empCode}
                                      </span>
                                      {rec.employee?.department && (
                                        <span className="text-[11px] text-slate-400">
                                          • {rec.employee.department}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Monthly Gross */}
                              <td className="px-5 py-4">
                                <span className="font-semibold text-slate-900 text-sm block tabular-nums">
                                  {formatCurrency(rec.grossEarnings)}
                                </span>
                                <span className="text-[11px] text-slate-400 block mt-0.5">Base Monthly Gross</span>
                              </td>

                              {/* Attendance & Leaves */}
                              <td className="px-5 py-4">
                                <div className="space-y-1.5">
                                  <div className="text-slate-800 text-xs">
                                    <strong className="font-bold text-slate-900">{rec.paidDays}</strong>
                                    <span className="text-slate-500"> / {rec.totalDaysInMonth} Days Paid</span>
                                  </div>
                                  {hasUnpaid ? (
                                    <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md text-[11px]">
                                      <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                                      {rec.unpaidDays} Leave Day(s) Deducted
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                      <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                                      Full Attendance (No Deductions)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Deductions Breakdown */}
                              <td className="px-5 py-4">
                                <div>
                                  <span className={`font-bold text-sm block tabular-nums ${Number(rec.totalDeductions) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                    {Number(rec.totalDeductions) > 0 ? `-${formatCurrency(rec.totalDeductions)}` : '₹0.00'}
                                  </span>

                                  {/* Itemized deduction chips */}
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {deductionsList.length > 0 ? (
                                      deductionsList.map((li, idx) => (
                                        <span 
                                          key={idx} 
                                          className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200/70 px-2 py-0.5 rounded-md text-[10.5px]"
                                        >
                                          <span className="text-slate-500">{li.name}:</span>
                                          <span className="font-semibold text-rose-600 tabular-nums">-{formatCurrency(li.amount)}</span>
                                        </span>
                                      ))
                                    ) : Number(rec.totalDeductions) > 0 ? (
                                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200/70 px-2 py-0.5 rounded-md text-[10.5px]">
                                        LWP Deduction
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400">Zero deductions</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Net Pay */}
                              <td className="px-5 py-4">
                                <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
                                  <span className="font-extrabold text-emerald-700 text-sm tabular-nums">
                                    {formatCurrency(rec.netPay)}
                                  </span>
                                </div>
                              </td>

                              {/* Payslip Action Button */}
                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setViewingSlipRecord(rec)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition shadow-2xs group-hover:border-indigo-300"
                                  title="Click to view & print full official payslip"
                                >
                                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                  <span>{payslipCode}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Individual Employee Modal Records Pagination */}
                <Pagination
                  currentPage={modalPage}
                  totalPages={totalModalPages}
                  totalItems={filteredModalRecords.length}
                  pageSize={modalPageSize}
                  onPageChange={setModalPage}
                  onPageSizeChange={setModalPageSize}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
              
              {/* Batch ID with Copy */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <span className="font-medium text-slate-400">Batch ID:</span>
                <span className="font-mono text-slate-700 select-all font-semibold">{selectedBatchDetails.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedBatchDetails.id);
                    setCopiedBatchId(true);
                    setTimeout(() => setCopiedBatchId(false), 2000);
                  }}
                  className="text-slate-400 hover:text-indigo-600 transition ml-1"
                  title="Copy Batch ID to clipboard"
                >
                  {copiedBatchId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                {selectedBatchDetails.status === 'PREVIEW' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRecalculateBatch(selectedBatchDetails)}
                      disabled={actionLoadingId === selectedBatchDetails.id}
                      className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCw className={`h-3.5 w-3.5 ${actionLoadingId === selectedBatchDetails.id ? 'animate-spin' : ''}`} />
                      <span>Recalculate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBatch(selectedBatchDetails.id)}
                      disabled={actionLoadingId === selectedBatchDetails.id}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveBatch(selectedBatchDetails.id)}
                      disabled={actionLoadingId === selectedBatchDetails.id}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{actionLoadingId === selectedBatchDetails.id ? 'Approving...' : 'Approve Batch'}</span>
                    </button>
                  </>
                )}

                {selectedBatchDetails.status === 'APPROVED' && (
                  <button
                    onClick={() => handleMarkPaid(selectedBatchDetails.id)}
                    disabled={actionLoadingId === selectedBatchDetails.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{actionLoadingId === selectedBatchDetails.id ? 'Processing...' : 'Mark as Paid & Disburse'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedBatchDetails(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal: Detailed Printable Salary Slip (Payslip Viewer) */}
      {viewingSlipRecord && selectedBatchDetails && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl my-auto rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Payslip Modal Topbar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold tracking-tight">Official Salary Slip</h3>
                  <p className="text-xs text-slate-400">
                    {MONTH_NAMES[selectedBatchDetails.month - 1]} {selectedBatchDetails.year}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-medium transition"
                  title="Print or Save as PDF"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingSlipRecord(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              
              {/* Slip Header Box */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">ENTERPRISE HRMS</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Corporate Human Resource & Payroll Systems</p>
                  <span className="inline-block mt-2 font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    Slip No: {viewingSlipRecord.payslip?.payslipNumber || `PAY-${selectedBatchDetails.year}${String(selectedBatchDetails.month).padStart(2, '0')}-${viewingSlipRecord.employee?.employeeCode || 'EMP'}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Pay Period</span>
                  <span className="text-sm font-bold text-slate-800 block">
                    {MONTH_NAMES[selectedBatchDetails.month - 1]} {selectedBatchDetails.year}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1.5">
                    <CheckCircle className="h-3 w-3" /> {selectedBatchDetails.status}
                  </span>
                </div>
              </div>

              {/* Employee Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Employee Name</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {viewingSlipRecord.employee?.firstName} {viewingSlipRecord.employee?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Employee ID</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                    {viewingSlipRecord.employee?.employeeCode || 'EMP001'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Department</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {viewingSlipRecord.employee?.department || 'Operations'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Days Paid</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {viewingSlipRecord.paidDays} / {viewingSlipRecord.totalDaysInMonth} Days
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Earnings */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100/80 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200">
                    Earnings (A)
                  </div>
                  <div className="p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Basic Salary (50%)</span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(Number(viewingSlipRecord.grossEarnings) * 0.5)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>HRA Allowance (30%)</span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(Number(viewingSlipRecord.grossEarnings) * 0.3)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Special Allowance (20%)</span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(Number(viewingSlipRecord.grossEarnings) * 0.2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-slate-900 text-sm">
                      <span>Gross Earnings</span>
                      <span className="tabular-nums">{formatCurrency(viewingSlipRecord.grossEarnings)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100/80 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200">
                    Deductions (B)
                  </div>
                  <div className="p-4 space-y-2.5 text-xs">
                    {viewingSlipRecord.lineItems && viewingSlipRecord.lineItems.filter(li => li.type === 'DEDUCTION').length > 0 ? (
                      viewingSlipRecord.lineItems
                        .filter(li => li.type === 'DEDUCTION')
                        .map((li, i) => (
                          <div key={i} className="flex justify-between items-center text-slate-600">
                            <span>{li.name}</span>
                            <span className="font-semibold text-rose-600 tabular-nums">
                              -{formatCurrency(li.amount)}
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Statutory Deductions</span>
                        <span className="tabular-nums">₹0.00</span>
                      </div>
                    )}
                    {Number(viewingSlipRecord.unpaidDays) > 0 && (
                      <div className="flex justify-between items-center text-rose-600 font-medium">
                        <span>LWP Leave ({viewingSlipRecord.unpaidDays} Days)</span>
                        <span className="tabular-nums">Applied</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-rose-600 text-sm">
                      <span>Total Deductions</span>
                      <span className="tabular-nums">
                        {Number(viewingSlipRecord.totalDeductions) > 0 ? `-${formatCurrency(viewingSlipRecord.totalDeductions)}` : '₹0.00'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Net Payable Highlight Box */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                    Net Take-Home Pay (A - B)
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Direct Corporate Bank Account Transfer
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-2xl font-extrabold text-emerald-700 tracking-tight tabular-nums block">
                    {formatCurrency(viewingSlipRecord.netPay)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center pt-2">
                This is a digitally verified computer-generated payslip from Enterprise HRMS and does not require a physical signature.
              </div>

            </div>

            {/* Payslip Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingSlipRecord(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
