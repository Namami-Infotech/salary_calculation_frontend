'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  RefreshCw, 
  CreditCard, 
  User, 
  Calendar,
  Building2,
  CheckCircle2,
  IndianRupee,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Employee } from '@/types';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exact same form fields as Add Employee (new/page.tsx)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    email: '',
    phone: '',
    employeeCode: '',
    joiningDate: '',
    employmentStatus: 'ACTIVE',
    // Salary Details
    monthlySalary: '45000',
    paymentMode: 'BANK_TRANSFER',
    // Bank Details
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
  });

  // Fetch employee details from API or LocalStorage
  useEffect(() => {
    if (!employeeId) return;

    const loadEmployee = async () => {
      setLoading(true);
      setError(null);

      let foundEmp: any = null;

      // 1. Try fetching from Backend API
      try {
        const res = await api.get(`/employees/${employeeId}`);
        if (res.data) {
          foundEmp = res.data;
        }
      } catch (err: any) {
        console.warn('Could not fetch employee from API, checking local storage cache...', err);
      }

      // 2. If not found via API, fallback to localStorage cache
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
        let bank: any = foundEmp.bankDetails || {};
        if (typeof bank === 'string') {
          try {
            bank = JSON.parse(bank);
          } catch (e) {
            bank = {};
          }
        }

        setFormData({
          firstName: foundEmp.firstName || '',
          lastName: foundEmp.lastName || '',
          age: foundEmp.age ? String(foundEmp.age) : '',
          email: foundEmp.email || '',
          phone: foundEmp.phone || '',
          employeeCode: foundEmp.employeeCode || '',
          joiningDate: foundEmp.joiningDate ? foundEmp.joiningDate.split('T')[0] : '',
          employmentStatus: foundEmp.employmentStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          monthlySalary: foundEmp.monthlySalary ? String(foundEmp.monthlySalary) : '45000',
          paymentMode: foundEmp.paymentMode || 'BANK_TRANSFER',
          accountHolderName: bank.accountHolderName || '',
          bankName: bank.bankName || '',
          accountNumber: bank.accountNumber || '',
          ifscCode: bank.ifscCode || '',
          branchName: bank.branchName || '',
        });
      } else {
        setError(`Employee with ID "${employeeId}" could not be found.`);
      }

      setLoading(false);
    };

    loadEmployee();
  }, [employeeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const numericOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: numericOnly }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'ifscCode' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone && formData.phone.length !== 10) {
      alert('Phone number 10 digit ka hona chahiye.');
      return;
    }
    setSaving(true);
    setError(null);

    const salaryNum = formData.monthlySalary ? parseFloat(formData.monthlySalary) : 0;

    const updatedEmployeeData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      age: formData.age ? parseInt(formData.age, 10) : undefined,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      employeeCode: formData.employeeCode.trim(),
      joiningDate: formData.joiningDate,
      employmentStatus: formData.employmentStatus || 'ACTIVE',
      monthlySalary: salaryNum,
      paymentMode: formData.paymentMode,
      bankDetails: {
        accountHolderName: formData.accountHolderName.trim() || `${formData.firstName} ${formData.lastName}`.trim(),
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim(),
        branchName: formData.branchName.trim(),
      },
    };

    // 1. Try updating Backend API
    try {
      await api.patch(`/employees/${employeeId}`, updatedEmployeeData);
    } catch (err: any) {
      console.warn('Backend API update failed, updating locally:', err);
      if (err?.response?.status === 409) {
        setError(err?.response?.data?.message || 'Employee with this code or email already exists.');
        setSaving(false);
        return;
      }
    }

    // 2. Synchronize LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hrms_employees');
        if (stored) {
          const list: any[] = JSON.parse(stored);
          const index = list.findIndex((e) => e.id === employeeId || e.employeeCode === employeeId);
          if (index !== -1) {
            list[index] = {
              ...list[index],
              ...updatedEmployeeData,
              id: list[index].id || employeeId,
            };
          } else {
            list.push({
              id: employeeId,
              ...updatedEmployeeData,
            });
          }
          localStorage.setItem('hrms_employees', JSON.stringify(list));
        }
      } catch (e) {
        console.error('Failed to update localStorage:', e);
      }
    }

    setSaving(false);
    alert(`Employee ${formData.employeeCode} (${formData.firstName} ${formData.lastName}) updated successfully!`);
    router.push('/employees');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading employee details...</p>
      </div>
    );
  }

  if (error && !formData.employeeCode) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-6 bg-white border border-red-200 rounded-2xl shadow-sm text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Employee Not Found</h2>
        <p className="text-sm text-slate-600">{error}</p>
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

  return (
    // FULL WIDTH CONTAINER - EXACTLY MATCHES Add Employee
    <div className="w-full space-y-6 pb-16">
      
      {/* Top Navigation & Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
        <Link
          href="/employees"
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Employee</h1>
          <p className="text-sm text-slate-500">
            Form with sequential employee code, profile information, and bank details
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        
        {/* 1. Core Profile Details Card - FULL WIDTH (3 Columns) */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Core Profile Details
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-mono font-bold border border-blue-200">
                {formData.employeeCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. Rahul"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Sharma"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Age *
              </label>
              <input
                type="number"
                name="age"
                min="18"
                max="80"
                required
                value={formData.age}
                onChange={handleChange}
                placeholder="e.g. 26"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Minimum age: 18 years</span>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. rahul.sharma@company.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Employee Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Employee Code *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="employeeCode"
                  required
                  value={formData.employeeCode}
                  onChange={handleChange}
                  placeholder="e.g. EMP002"
                  className="w-full bg-white border border-slate-300 font-mono font-bold text-blue-700 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition uppercase"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Unique employee identifier</span>
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Joining Date *
              </label>
              <input
                type="date"
                name="joiningDate"
                required
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Monthly Salary */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Monthly Salary (₹ / Month) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  name="monthlySalary"
                  required
                  min="0"
                  step="500"
                  value={formData.monthlySalary}
                  onChange={handleChange}
                  placeholder="e.g. 50000"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Per month salary amount (CTC: {formatCurrency((parseFloat(formData.monthlySalary) || 0) * 12)} / yr)
              </span>
            </div>

            {/* Employment Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Status *
              </label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">Active or Inactive status</span>
            </div>

          </div>
        </div>

        {/* 2. Bank Details Card - FULL WIDTH (3 Columns) */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="pb-4 mb-6 border-b border-slate-100 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bank Details & Payment Information
              </h2>
              <p className="text-xs text-slate-500">
                Required for salary disbursement and direct bank deposit
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Account Holder Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Account Holder Name *
              </label>
              <input
                type="text"
                name="accountHolderName"
                required
                value={formData.accountHolderName}
                onChange={handleChange}
                placeholder="Full name as in bank passbook"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Bank Name *
              </label>
              <input
                type="text"
                name="bankName"
                required
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g. State Bank of India, HDFC Bank, ICICI"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Bank Account Number *
              </label>
              <input
                type="text"
                name="accountNumber"
                required
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Enter bank account number"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                IFSC Code *
              </label>
              <input
                type="text"
                name="ifscCode"
                required
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="e.g. SBIN0001234"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">11-character branch code</span>
            </div>

            {/* Branch Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Branch Name
              </label>
              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                placeholder="e.g. Main Branch, Delhi"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/employees"
            className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 shadow-sm transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
