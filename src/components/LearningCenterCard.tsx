import React from 'react';
import { Card, CardContent, Typography, Box, Button } from '@mui/material';

const LearningCenterCard: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>学习中心</Typography>
        <Typography variant="body2" color="text.secondary">
          初学者模式将隐藏高级工具。这里有快速入门与风险提示：
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1, mt: 1 }}>
          <Button size="small" variant="outlined">什么是限价/市价？</Button>
          <Button size="small" variant="outlined">手续费与滑点如何影响成交？</Button>
          <Button size="small" variant="outlined">多链资产与桥接基础</Button>
          <Button size="small" variant="outlined">冷钱包与安全习惯</Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          高级模式可开启订单簿深度、图表指标与叠加分析。
        </Typography>
      </CardContent>
    </Card>
  );
};

export default LearningCenterCard;