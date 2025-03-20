// src/components/dashboard/InfoCard.jsx
import React from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  Avatar, 
  IconButton,
  Tooltip
} from '@mui/material';
import { TrendingUp, TrendingDown, MoreVert } from '@mui/icons-material';

const formatCurrency = (value) => {
  return `LKR ${value.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

const InfoCard = ({ title, value, subtitle, icon, color, trend }) => {
  // Set default color if not provided
  const iconBgColor = color || '#1976d2';
  
  // Format value as currency if it's a number
  const formattedValue = typeof value === 'number' ? formatCurrency(value) : value;
  
  // Determine if trend is positive or negative
  const isTrendPositive = trend > 0;
  const trendIcon = isTrendPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />;
  const trendColor = isTrendPositive ? 'success.main' : 'error.main';
  
  return (
    <Paper 
      sx={{ 
        p: 3, 
        height: '100%',
        borderRadius: 2,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Avatar
          sx={{
            bgcolor: iconBgColor,
            color: 'white',
            width: 48,
            height: 48
          }}
        >
          {icon}
        </Avatar>
        
        <IconButton size="small">
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>
      
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      
      <Typography variant="h4" component="p" fontWeight="medium" sx={{ mb: 1 }}>
        {formattedValue}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
        
        {trend !== undefined && (
          <Tooltip title={`${Math.abs(trend).toFixed(1)}% ${isTrendPositive ? 'increase' : 'decrease'} compared to previous period`}>
            <Box sx={{ display: 'flex', alignItems: 'center', color: trendColor }}>
              {trendIcon}
              <Typography variant="body2" component="span" sx={{ ml: 0.5 }}>
                {Math.abs(trend).toFixed(1)}%
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default InfoCard;