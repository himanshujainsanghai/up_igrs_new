/**
 * Inventory Management Page
 * Full inventory listing with filtering, search, and CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { inventoryService } from '@/services/inventory.service';
import { Inventory } from '@/types';
import { 
  Package, 
  Plus, 
  MapPin, 
  DollarSign, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ type?: string; location?: string }>();
  
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fundSourceFilter, setFundSourceFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Inventory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Initialize filters from URL
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart === 'by-type') {
      // Show type filter UI - user can select type
      // Type filter is already available in the filters section
    } else if (lastPart === 'by-location') {
      // Show location filter UI - could add location search
      // For now, location is searchable in the search field
    } else if (lastPart === 'add') {
      // This route should show add form - handled by routing
      return;
    }
  }, [location.pathname, params]);

  // Fetch inventory
  useEffect(() => {
    fetchInventory();
  }, [page, statusFilter, typeFilter, fundSourceFilter]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getAllInventory(page, 20);
      setInventory(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeleting(true);
      await inventoryService.deleteInventory(itemToDelete._id);
      toast.success('Inventory item deleted successfully');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchInventory();
    } catch (error: any) {
      console.error('Error deleting inventory:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete inventory item');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      in_stock: { variant: 'default', label: 'In Stock' },
      distributed: { variant: 'secondary', label: 'Distributed' },
      in_use: { variant: 'outline', label: 'In Use' },
      available: { variant: 'default', label: 'Available' },
      maintenance: { variant: 'destructive', label: 'Maintenance' },
      disposed: { variant: 'secondary', label: 'Disposed' },
    };
    const statusConfig = config[status] || config.in_stock;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const getFundSourceBadge = (fundSource: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      personal: { variant: 'outline', label: 'Personal' },
      mlalad: { variant: 'default', label: 'MLALAD' },
      government: { variant: 'secondary', label: 'Government' },
    };
    const sourceConfig = config[fundSource] || config.personal;
    return <Badge variant={sourceConfig.variant}>{sourceConfig.label}</Badge>;
  };

  // Filter inventory based on search and filters
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesFundSource = fundSourceFilter === 'all' || item.fundSource === fundSourceFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesFundSource;
  });

  // Get unique types and locations for filters
  const uniqueTypes = Array.from(new Set(inventory.map(item => item.type).filter(Boolean)));
  const uniqueLocations = Array.from(new Set(inventory.map(item => item.location).filter(Boolean)));

  // If on add route, show add form (will be handled by separate component or modal)
  if (location.pathname === '/admin/inventory/add') {
    // For now, redirect to main page - add form will be a modal or separate page
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Add Inventory Item</h1>
            <p className="text-muted-foreground mt-1">Add a new item to inventory</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/inventory')}>
            Cancel
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Add form will be implemented here or as a modal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {location.pathname.includes('by-type') && 'Inventory by Type'}
            {location.pathname.includes('by-location') && 'Inventory by Location'}
            {!location.pathname.includes('by-type') && !location.pathname.includes('by-location') && 'Inventory Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {location.pathname.includes('by-type') && 'Filter and view inventory items by type'}
            {location.pathname.includes('by-location') && 'Filter and view inventory items by location'}
            {!location.pathname.includes('by-type') && !location.pathname.includes('by-location') && `Manage inventory items and assets (${totalItems} items)`}
          </p>
        </div>
        <div className="flex gap-2">
          {(location.pathname.includes('by-type') || location.pathname.includes('by-location')) && (
            <Button variant="outline" onClick={() => navigate('/admin/inventory')}>
              View All
            </Button>
          )}
          <Button onClick={() => navigate('/admin/inventory/add')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="distributed">Distributed</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fund Source Filter */}
            <Select value={fundSourceFilter} onValueChange={setFundSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Fund Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fund Sources</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="mlalad">MLALAD</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      {loading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading inventory...</p>
          </CardContent>
        </Card>
      ) : filteredInventory.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {inventory.length === 0 ? 'No inventory items found' : 'No items match your filters'}
            </p>
            {inventory.length === 0 && (
              <Button onClick={() => navigate('/admin/inventory/add')}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventory.map((item) => (
              <Card key={item._id} className="border-orange-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-primary" />
                        {item.name}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        {item.type}
                      </CardDescription>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">₹{item.amount?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{item.quantity || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fund Source:</span>
                      {getFundSourceBadge(item.fundSource || 'personal')}
                    </div>
                    {item.purchaseDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Purchase Date:</span>
                        <span className="font-medium">
                          {new Date(item.purchaseDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/admin/inventory/${item._id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/admin/inventory/${item._id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryPage;
