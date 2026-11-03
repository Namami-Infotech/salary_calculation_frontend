'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Search, 
  Filter, 
  RotateCw,
  Loader2,
  CalendarCheck,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { LeaveRequest, Employee } from '@/types';
import { formatDate } from '@/lib/utils';
import api from '@/lib/axios';
import Pagination from '@/components/common/Pagination';

const LEAVE_TYPES = [
  'Casual Leave (CL)',
  'Sick Leave (SL)',
  'Earned Leave (EL)',
  'Maternity / Paternity Leave',
  'Leave Without Pay (LWP)',
];

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, employeeFilter, statusFilter]);

  // Form State
  const [newLeave, setNewLeave] = useState({
    employeeId: '',
    leaveType: LEAVE_TYPES[0],
    startDate: '',
    endDate: '',
    isHalfDay: false,
    reason: '',
  });

  // Calculate days between dates
  const calculateDays = (start: string, end: string, isHalf: boolean) => {
    if (isHalf) return 0.5;
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // Fetch employees and leave requests from DB
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch only ACTIVE employees from DB
      const empRes = await api.get('/employees', { params: { limit: 100, status: 'ACTIVE' } });
      const empList: Employee[] = Array.isArray(empRes.data) 
        ? empRes.data 
        : (empRes.data?.data || []);
      // Filter out any INACTIVE employees so only Active employees are selectable

      console.log(empList,"empListempListempList")



      const activeEmployees = empList
        .filter((emp) => emp.employmentStatus !== 'INACTIVE')
        .map((emp) => ({
          ...emp,
          employmentStatus: 'ACTIVE' as const,
        }));
      setEmployees(activeEmployees);

      // 2. Fetch live leave requests from DB
      const leaveRes = await api.get('/leave/requests');
      const leaveList: LeaveRequest[] = Array.isArray(leaveRes.data) ? leaveRes.data : [];
      setRequests(leaveList);
    } catch (err: any) {
      console.error('Failed to load data from database:', err);
      setError(
        err?.response?.data?.message || 
        'Could not fetch data from database. Please check your connection or backend server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedEmployeeForModal = useMemo(() => {
    return employees.find((e) => e.id === newLeave.employeeId);
  }, [employees, newLeave.employeeId]);

  const calculatedDays = useMemo(() => {
    return calculateDays(newLeave.startDate, newLeave.endDate, newLeave.isHalfDay);
  }, [newLeave.startDate, newLeave.endDate, newLeave.isHalfDay]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalError(null);
    if (!newLeave.employeeId && employees.length > 0) {
      setNewLeave((prev) => ({
        ...prev,
        employeeId: employees[0].id,
      }));
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(id);
    try {
      const endpoint = status === 'APPROVED' ? `/leave/requests/${id}/approve` : `/leave/requests/${id}/reject`;
      const res = await api.post(endpoint, { comments: `${status} by Admin` });
      
      // Update local state with the updated record from DB
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...res.data, status } : r)),
      );
    } catch (err: any) {
      console.error(`Failed to ${status.toLowerCase()} request:`, err);
      alert(err?.response?.data?.message || `Failed to ${status.toLowerCase()} request. Please try again.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newLeave.employeeId) {
      setModalError('Please select an employee from the database.');
      return;
    }

    if (!newLeave.startDate) {
      setModalError('Please choose a start date.');
      return;
    }

    const effectiveEndDate = newLeave.endDate || newLeave.startDate;
    const totalDays = newLeave.isHalfDay ? 0.5 : calculateDays(newLeave.startDate, effectiveEndDate, false);
    setSubmitting(true);

    try {
      const res = await api.post('/leave/requests', {
        employeeId: newLeave.employeeId,
        leaveType: newLeave.leaveType,
        startDate: newLeave.startDate,
        endDate: effectiveEndDate,
        totalDays,
        isHalfDay: Boolean(newLeave.isHalfDay),
        reason: newLeave.reason,
      });

      const created: LeaveRequest = res.data;
      setRequests((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setNewLeave({
        employeeId: employees[0]?.id || '',
        leaveType: LEAVE_TYPES[0],
        startDate: '',
        endDate: '',
        isHalfDay: false,
        reason: '',
      });
      alert('Leave request submitted and saved to database successfully!');
    } catch (err: any) {
      console.error('Failed to apply leave:', err);
      const msg = err?.response?.data?.message || 'Failed to submit leave request to database. Please check your inputs.';
      setModalError(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // KPI counts computed dynamically from live requests
  const kpis = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const approved = requests.filter((r) => r.status === 'APPROVED').length;
    const rejected = requests.filter((r) => r.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const empName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
      const empCode = (r.employee?.employeeCode || '').toLowerCase();
      const reason = (r.reason || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || empName.includes(search) || empCode.includes(search) || reason.includes(search);
      const matchesEmployee = employeeFilter === 'ALL' || r.employeeId === employeeFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchesSearch && matchesEmployee && matchesStatus;
    });
  }, [requests, searchTerm, employeeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track and manage employee leave requests and approvals directly from database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-2xs"
            title="Reload from DB"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Refresh DB</span>
          </button>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {error}
          </div>
          <button onClick={fetchData} className="text-xs font-bold underline hover:text-amber-700">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards (Computed from Real DB Records) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm transition-all">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{kpis.total}</span>
            <span className="text-xs text-slate-400 font-medium">All applications</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm transition-all">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Approvals</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-600">{kpis.pending}</span>
            <span className="text-xs text-slate-400 font-medium">Awaiting action</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm transition-all">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved Leaves</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-600">{kpis.approved}</span>
            <span className="text-xs text-slate-400 font-medium">Granted</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm transition-all">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Rejected Requests</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-600">{kpis.rejected}</span>
            <span className="text-xs text-slate-400 font-medium">Declined</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name, code, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
          />
        </div>

        {/* Filter by DB Employee */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <User className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full sm:w-48 py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium text-slate-700"
          >
            <option value="ALL">All Active Employees ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode || 'EMP'})
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-36 py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium text-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leave Applications Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Leave Applications & Approvals</h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
              {filteredRequests.length}
            </span>
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Syncing with DB...</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Days</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-sm">Loading leave applications from database...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-600">No leave requests found in database.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Apply for Leave" above to create a new leave application.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700">
                          {r.employee?.firstName?.[0] || 'E'}{r.employee?.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {r.employee?.firstName} {r.employee?.lastName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{r.employee?.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {typeof r.leaveType === 'string' 
                          ? r.leaveType 
                          : (r.leaveType?.name ? `${r.leaveType.name} (${r.leaveType.code || ''})` : 'Leave')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700">
                      {formatDate(r.startDate)} to {formatDate(r.endDate)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {r.totalDays} {r.isHalfDay && <span className="text-xs font-normal text-amber-600">(Half Day)</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{r.reason}</td>
                    <td className="px-6 py-4">
                      {r.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </span>
                      )}
                      {r.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                      {r.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <AlertCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(r.id, 'APPROVED')}
                            disabled={actionLoadingId === r.id}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            {actionLoadingId === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'REJECTED')}
                            disabled={actionLoadingId === r.id}
                            className="inline-flex items-center gap-1 rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Actioned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Leave Requests Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modal for Leave Application */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Apply for Leave</h2>
                <p className="text-xs text-slate-500">Submit a leave request for an employee from the database</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 mt-4">
              {modalError && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Employee Selection from DB */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Employee <span className="text-rose-500">*</span>
                  </label>
                  
                </div>

                {employees.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    Database me abhi koi Active employee nahi hai.{' '}
                    <Link href="/employees/new" className="font-semibold underline text-indigo-600 hover:text-indigo-800">
                      Pehle employee create karein
                    </Link>.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      required
                      value={newLeave.employeeId}
                      onChange={(e) => setNewLeave({ ...newLeave, employeeId: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                    >
                      <option value="">-- Choose Active Employee --</option>
                      {employees.map((emp) => {
                        const deptName = typeof emp.department === 'string' ? emp.department : emp.department?.name;
                        return (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeCode || 'EMP'}) {deptName ? `• ${deptName}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Selected Employee Info Pill */}
                {selectedEmployeeForModal && (
                  <div className="mt-2 flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {selectedEmployeeForModal.firstName?.[0]?.toUpperCase()}{selectedEmployeeForModal.lastName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {selectedEmployeeForModal.firstName} {selectedEmployeeForModal.lastName}
                        </p>
                        <p className="text-[11px] text-indigo-700 font-mono">
                          {selectedEmployeeForModal.employeeCode} {selectedEmployeeForModal.email && `• ${selectedEmployeeForModal.email}`}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </div>
                )}
              </div>

              {/* Leave Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Leave Type / Category
                </label>
                <select
                  value={newLeave.leaveType}
                  onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setNewLeave({
                        ...newLeave,
                        startDate: newStart,
                        endDate: newLeave.endDate && newLeave.endDate < newStart ? newStart : newLeave.endDate,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    min={newLeave.startDate || undefined}
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Half Day & Calculated Days */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="halfDayCheckbox"
                    checked={newLeave.isHalfDay}
                    onChange={(e) => setNewLeave({ ...newLeave, isHalfDay: e.target.checked })}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="halfDayCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Half-day leave
                  </label>
                </div>
                <div className="text-xs text-slate-600">
                  Total duration: <span className="font-bold text-indigo-600">{calculatedDays} day(s)</span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Absence</label>
                <textarea
                  required
                  rows={3}
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  placeholder="Provide details for manager / HR review..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || employees.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
