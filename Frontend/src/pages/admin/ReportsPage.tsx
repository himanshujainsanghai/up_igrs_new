/**
 * Reports Page
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, TrendingUp, DollarSign, Download } from 'lucide-react';

const ReportsPage: React.FC = () => {
  const reports = [
    {
      title: 'Complaint Reports',
      description: 'Generate comprehensive complaint analysis reports',
      icon: FileText,
      path: '/admin/reports/complaints',
    },
    {
      title: 'Status Summary',
      description: 'View complaint status breakdown and statistics',
      icon: BarChart3,
      path: '/admin/reports/status',
    },
    {
      title: 'Inventory Reports',
      description: 'Generate inventory expenditure and usage reports',
      icon: TrendingUp,
      path: '/admin/reports/inventory',
    },
    {
      title: 'Financial Summary',
      description: 'View financial summaries and budget reports',
      icon: DollarSign,
      path: '/admin/reports/financial',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Generate and download various reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.title}
              className="border-orange-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = report.path}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  {report.title}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsPage;

