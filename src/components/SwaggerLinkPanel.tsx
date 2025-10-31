import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import { openExternal } from '../utils/safeExternalLink';

const SwaggerLinkPanel: React.FC = () => {
  const openSwagger = () => {
    const target = '/swagger-ui/index.html';
    openExternal(target);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>后端文档</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          通过代理访问后端 Swagger 文档，便于调试与查看接口。
        </Typography>
        <Button variant="outlined" onClick={openSwagger}>打开 Swagger 文档</Button>
      </CardContent>
    </Card>
  );
};

export default SwaggerLinkPanel;