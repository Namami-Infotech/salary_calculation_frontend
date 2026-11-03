'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  RotateCw, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { Employee } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import Pagination from '@/components/common/Pagination';

export default function EmployeesListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset to first page when search or statusFilter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Fetch live employee data from NestJS API (GET /api/employees)
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/employees', {
        params: { limit: 100 },
      });

      // API returns { total, page, limit, totalPages, data: [...] } or direct array
      const list = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.data || []);

      setEmployees(list);

      // Keep local sync in case user switches views offline
      if (typeof window !== 'undefined' && list.length > 0) {
        localStorage.setItem('hrms_employees', JSON.stringify(list));
      }
    } catch (err: any) {
      console.error('Failed to fetch employees from API:', err);
      
      // Fallback to locally saved employees if server is not reachable
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hrms_employees');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setEmployees(parsed);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing stored employees', e);
          }
        }
      }

      setError(
        err?.response?.data?.message || 
        'Could not load employees from server. Check your connection or login session.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle employee delete
  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete employee ${code}?`)) return;

    try {
      await api.delete(`/employees/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      
      // Also update local storage cache
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hrms_employees');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const updated = parsed.filter((emp: any) => emp.id !== id);
            localStorage.setItem('hrms_employees', JSON.stringify(updated));
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.error('Failed to delete employee:', err);
      alert(err?.response?.data?.message || 'Failed to delete employee. Please try again.');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const term = search.toLowerCase();

    const matchesSearch = fullName.includes(term) || code.includes(term) || email.includes(term);
    const empStatus = emp.employmentStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const matchesStatus = statusFilter === 'ALL' || empStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  return (
    <div className="w-full space-y-6">
      {/* Header section with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employees Directory</h1>
          <p className="text-sm text-slate-500">Live employee roster loaded from database</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchEmployees}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Reload from API"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Employee</span>
          </Link>
        </div>
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchEmployees}
            className="underline font-semibold hover:text-red-900 ml-4 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee code or email..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-auto transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Monthly Salary</th>
                <th className="px-6 py-4">Age / Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joining Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span>Loading employees from server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    <div className="space-y-2">
                      <p className="text-slate-500 font-medium">No matching employees found.</p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Try adjusting your search criteria.' : 'Click "New Employee" to onboard your first employee.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const empIdentifier = emp.id || emp.employeeCode;
                  return (
                    <tr key={empIdentifier} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                            {emp.firstName ? emp.firstName[0].toUpperCase() : 'E'}
                            {emp.lastName ? emp.lastName[0].toUpperCase() : ''}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" /> {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-blue-700">
                        <span className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                          {emp.employeeCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatCurrency(emp.monthlySalary || 45000)}
                          <span className="text-xs font-normal text-slate-400"> / mo</span>
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                          CTC: {formatCurrency((emp.monthlySalary || 45000) * 12)} / yr
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-800 text-xs font-medium">
                          {emp.age ? `Age: ${emp.age} yrs` : (emp.department ? (typeof emp.department === 'string' ? emp.department : (emp.department as any)?.name) : '—')}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          {emp.phone ? (
                            <>
                              <Phone className="h-3 w-3" /> {emp.phone}
                            </>
                          ) : (
                            'No phone recorded'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {emp.employmentStatus === 'INACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {emp.joiningDate ? formatDate(emp.joiningDate) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/employees/${empIdentifier}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/employees/${empIdentifier}/edit`}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(empIdentifier, emp.employeeCode)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
