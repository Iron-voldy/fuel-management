// src/components/common/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = () => {
  const { isAuthenticated } = useAuth();

  // Don't render sidebar if not authenticated
  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="sidebar">
      <ul className="nav-menu">
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/sales" className={({ isActive }) => isActive ? 'active' : ''}>
            Sales
          </NavLink>
        </li>
        <li>
          <NavLink to="/expenses" className={({ isActive }) => isActive ? 'active' : ''}>
            Expenses
          </NavLink>
        </li>
        <li>
          <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
            Inventory
          </NavLink>
        </li>
        <li>
          <NavLink to="/bank-book" className={({ isActive }) => isActive ? 'active' : ''}>
            Bank Book
          </NavLink>
        </li>
        <li>
          <NavLink to="/petty-cash" className={({ isActive }) => isActive ? 'active' : ''}>
            Petty Cash
          </NavLink>
        </li>
        <li>
          <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>
            Customers
          </NavLink>
        </li>
        <li>
          <NavLink to="/invoices" className={({ isActive }) => isActive ? 'active' : ''}>
            Invoices
          </NavLink>
        </li>
        <li>
          <NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>
            Employees
          </NavLink>
        </li>
        <li>
          <NavLink to="/payroll" className={({ isActive }) => isActive ? 'active' : ''}>
            Payroll
          </NavLink>
        </li>
        <li>
          <NavLink to="/loans" className={({ isActive }) => isActive ? 'active' : ''}>
            Loans
          </NavLink>
        </li>
        <li>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
            Reports
          </NavLink>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;