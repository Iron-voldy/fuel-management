import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import Dashboard from '../components/dashboard/Dashboard';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';

const DashboardPage = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          px: 1
        }}
      >
        {/* Page Title */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
            Dashboard
          </Typography>
        </Box>
        
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mt: { xs: 1, sm: 0 } }}>
          <Link
            underline="hover"
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Home
          </Link>
          <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <DashboardIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Dashboard
          </Typography>
        </Breadcrumbs>
      </Box>
      
      {/* Main Dashboard Content */}
      <Dashboard />
    </Box>
  );
};

export default DashboardPage;