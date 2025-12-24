/**
 * Inventory Detail Page
 * View detailed information about a single inventory item
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { inventoryService } from '@/services/inventory.service';
import { Inventory } from '@/types';
import {
  Package,
  MapPin,
  DollarSign,
  Calendar,
  Building2,
  Tag,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Paperclip,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
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

const InventoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await inventoryService.getInventoryById(id);
      setItem(data);
    } catch (error: any) {
      console.error('Error fetching inventory item:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch inventory item');
      // Only navigate if it's a 404 or similar error
      if (error?.response?.status === 404) {
        navigate('/admin/inventory');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    
    try {
      setDeleting(true);
      await inventoryService.deleteInventory(item._id);
      toast.success('Inventory item deleted successfully');
      navigate('/admin/inventory');
    } catch (error: any) {
      console.error('Error deleting inventory:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete inventory item');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
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
    return <Badge variant={statusConfig.variant} className="text-sm px-3 py-1">{statusConfig.label}</Badge>;
  };

  const getFundSourceBadge = (fundSource: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      personal: { variant: 'outline', label: 'Personal' },
      mlalad: { variant: 'default', label: 'MLALAD' },
      government: { variant: 'secondary', label: 'Government' },
    };
    const sourceConfig = config[fundSource] || config.personal;
    return <Badge variant={sourceConfig.variant} className="text-sm px-3 py-1">{sourceConfig.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading inventory item...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Inventory item not found</p>
            <Button onClick={() => navigate('/admin/inventory')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{item.name}</h1>
            <p className="text-muted-foreground mt-1">Inventory Item Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/inventory/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{item.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{item.type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  {getStatusBadge(item.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Fund Source</p>
                  {getFundSourceBadge(item.fundSource || 'personal')}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{item.quantity || 0}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">₹{item.amount?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{item.location}</p>
                  </div>
                </div>
                {item.purchaseDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Purchase Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">
                        {new Date(item.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {item.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Notes</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {item.notes && item.notes.length > 0 ? (
                <div className="space-y-3">
                  {item.notes.map((note) => (
                    <div key={note._id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between">
                        <p className="text-sm">{note.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Documents</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {item.documents && item.documents.length > 0 ? (
                <div className="space-y-2">
                  {item.documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/admin/inventory/${id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // TODO: Implement add note functionality
                  toast.info('Add note functionality coming soon');
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Add Note
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // TODO: Implement add document functionality
                  toast.info('Add document functionality coming soon');
                }}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Add Document
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Item ID</p>
                <p className="font-mono text-xs">{item._id || (item as any).id}</p>
              </div>
              {item.createdAt && (
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              )}
              {item.updatedAt && (
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p>{new Date(item.updatedAt).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{item.name}"? This action cannot be undone.
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

export default InventoryDetailPage;

