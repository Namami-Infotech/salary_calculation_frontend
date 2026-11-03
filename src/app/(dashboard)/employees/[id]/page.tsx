'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  Building2, 
  Briefcase, 
  User, 
  Loader2, 
  AlertCircle,
  IndianRupee,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Employee } from '@/types';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      let foundEmp: any = null;

      // 1. Try Backend API
      try {
        const res = await api.get(`/employees/${employeeId}`);
        if (res.data) {
          foundEmp = res.data;
        }
      } catch (err: any) {
        console.warn('API fetch failed, checking localStorage fallback...', err);
      }

      // 2. Fallback to localStorage
      if (!foundEmp && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('hrms_employees');
          if (stored) {
            const list: Employee[] = JSON.parse(stored);
            foundEmp = list.find((e) => e.id === employeeId || e.employeeCode === employeeId);
          }
        } catch (e) {
          console.error('Error reading localStorage', e);
        }
      }

      if (foundEmp) {
        setEmployee(foundEmp);
      } else {
        setError(`Employee with ID "${employeeId}" could not be found.`);
      }

      setLoading(false);
    };

    fetchDetail();
  }, [employeeId]);

  const handleDelete = async () => {
    if (!employee) return;
    if (!confirm(`Are you sure you want to delete employee ${employee.employeeCode}?`)) return;

    try {
      await api.delete(`/employees/${employeeId}`);
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hrms_employees');
        if (stored) {
          const list: any[] = JSON.parse(stored);
          const updated = list.filter((e) => e.id !== employeeId && e.employeeCode !== employeeId);
          localStorage.setItem('hrms_employees', JSON.stringify(updated));
        }
      } catch (e) {}
    }

    alert(`Employee ${employee.employeeCode} has been deleted.`);
    router.push('/employees');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading employee profile...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-6 bg-white border border-red-200 rounded-2xl shadow-sm text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Employee Not Found</h2>
        <p className="text-sm text-slate-600">{error || 'Could not locate employee record.'}</p>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Employees List</span>
        </Link>
      </div>
    );
  }

  const bank = typeof employee.bankDetails === 'string'
    ? (() => { try { return JSON.parse(employee.bankDetails); } catch (e) { return {}; } })()
    : (employee.bankDetails || {});

  const departmentName = typeof employee.department === 'string'
    ? employee.department
    : (employee.department?.name || 'General');

  const designationName = typeof employee.designation === 'string'
    ? employee.designation
    : (employee.designation?.title || 'Team Member');

  const monthlySalary = employee.monthlySalary || 45000;

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/employees"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm transition"
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {employee.firstName} {employee.lastName}
              </h1>
              <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md">
                {employee.employeeCode}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {designationName} • {departmentName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/employees/${employee.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Employee</span>
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-2xl flex items-center justify-center mx-auto mb-4">
              {employee.firstName?.[0]?.toUpperCase()}{employee.lastName?.[0]?.toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {employee.employeeCode}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
              {employee.employmentStatus === 'INACTIVE' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  Inactive
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              )}
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {employee.employmentType || 'FULL_TIME'}
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3 text-left text-xs">
              <div className="flex items-center gap-2.5 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{employee.phone || 'No phone recorded'}</span>
              </div>
              {employee.age && (
                <div className="flex items-center gap-2.5 text-slate-600">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>Age: {employee.age} years</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Joined: {employee.joiningDate ? formatDate(employee.joiningDate) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Salary Quick Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-1">
              Monthly Salary
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatCurrency(monthlySalary)}
              <span className="text-xs font-normal text-slate-500"> / month</span>
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-2">
              Annual CTC: {formatCurrency(monthlySalary * 12)}
            </div>
          </div>
        </div>

        {/* Right Columns: Detail sections */}
        <div className="md:col-span-2 space-y-6">
          {/* Employment & Role Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-3 mb-4 border-b border-slate-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Role & Department
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Department</span>
                <span className="font-semibold text-slate-800">{departmentName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Designation</span>
                <span className="font-semibold text-slate-800">{designationName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Joining Date</span>
                <span className="font-semibold text-slate-800">
                  {employee.joiningDate ? formatDate(employee.joiningDate) : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Employment Status</span>
                <span className={`font-semibold ${employee.employmentStatus === 'INACTIVE' ? 'text-slate-600' : 'text-emerald-700'}`}>
                  {employee.employmentStatus === 'INACTIVE' ? 'Inactive' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-3 mb-4 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Bank & Payment Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Account Holder</span>
                <span className="font-semibold text-slate-800">
                  {bank.accountHolderName || `${employee.firstName} ${employee.lastName}`}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Bank Name</span>
                <span className="font-semibold text-slate-800">{bank.bankName || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Account Number</span>
                <span className="font-mono font-bold text-slate-800">{bank.accountNumber || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">IFSC Code</span>
                <span className="font-mono font-bold text-blue-700">{bank.ifscCode || '—'}</span>
              </div>
              {bank.branchName && (
                <div>
                  <span className="text-xs text-slate-400 block">Branch</span>
                  <span className="font-semibold text-slate-800">{bank.branchName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

