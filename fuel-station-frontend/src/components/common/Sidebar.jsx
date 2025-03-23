// src/components/common/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PeopleIcon from '@mui/icons-material/People';
import PaidIcon from '@mui/icons-material/Paid';
import SavingsIcon from '@mui/icons-material/Savings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <ul className="nav-menu">
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            <DashboardIcon fontSize="small" sx={{ mr: 1 }} />
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/sales" className={({ isActive }) => isActive ? 'active' : ''}>
            <ReceiptIcon fontSize="small" sx={{ mr: 1 }} />
            Sales
          </NavLink>
        </li>
        <li>
          <NavLink to="/expenses" className={({ isActive }) => isActive ? 'active' : ''}>
            <MonetizationOnIcon fontSize="small" sx={{ mr: 1 }} />
            Expenses
          </NavLink>
        </li>
        <li>
          <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
            <InventoryIcon fontSize="small" sx={{ mr: 1 }} />
            Inventory
          </NavLink>
        </li>
        
        {/* Financial Management Group */}
        <li className="nav-section-header">Financial Management</li>
        <li>
          <NavLink to="/bank-accounts" className={({ isActive }) => isActive ? 'active' : ''}>
            <AccountBalanceIcon fontSize="small" sx={{ mr: 1 }} />
            Bank Accounts
          </NavLink>
        </li>
        <li>
          <NavLink to="/petty-cash" className={({ isActive }) => isActive ? 'active' : ''}>
            <SavingsIcon fontSize="small" sx={{ mr: 1 }} />
            Petty Cash
          </NavLink>
        </li>
        
        {/* HR Management Group */}
        <li className="nav-section-header">HR Management</li>
        <li>
          <NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>
            <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
            Employees
          </NavLink>
        </li>
        <li>
          <NavLink to="/payroll" className={({ isActive }) => isActive ? 'active' : ''}>
            <PaidIcon fontSize="small" sx={{ mr: 1 }} />
            Payroll & EPF/ETF
          </NavLink>
        </li>
        <li>
          <NavLink to="/loans" className={({ isActive }) => isActive ? 'active' : ''}>
            <MonetizationOnIcon fontSize="small" sx={{ mr: 1 }} />
            Employee Loans
          </NavLink>
        </li>
        
        {/* Other sections */}
        <li>
          <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>
            <PersonIcon fontSize="small" sx={{ mr: 1 }} />
            Customers
          </NavLink>
        </li>
        <li>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
            <AssessmentIcon fontSize="small" sx={{ mr: 1 }} />
            Reports
          </NavLink>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;