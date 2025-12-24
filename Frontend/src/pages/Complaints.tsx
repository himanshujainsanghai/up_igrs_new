/**
 * Complaints Page
 * Lists all complaints with filters
 */

import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useComplaints } from '@/hooks/useComplaints';
import { FilePlus, Search, Loader2 } from 'lucide-react';
import { useUI } from '@/hooks/useUI';

const Complaints: React.FC = () => {
  const { complaints, loading, fetchComplaints, filters, setFilters } = useComplaints();
  const { openModal } = useUI();

  useEffect(() => {
    fetchComplaints(filters);
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Complaints</h1>
          <p className="text-muted-foreground">View and manage all complaints</p>
        </div>
        <Button onClick={() => openModal('file-complaint')}>
          <FilePlus className="w-4 h-4 mr-2" />
          File New Complaint
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Search complaints..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            {/* Add more filters as needed */}
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : complaints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No complaints found</p>
            <Button className="mt-4" onClick={() => openModal('file-complaint')}>
              File Your First Complaint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {complaints.map((complaint) => (
            <Card key={complaint._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{complaint.title}</CardTitle>
                    <CardDescription>{complaint.location?.address || 'Location not specified'}</CardDescription>
                  </div>
                  <Badge variant={complaint.status === 'resolved' ? 'default' : 'secondary'}>
                    {complaint.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {complaint.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Complaints;

