/**
 * Inventory Form Page
 * Add/Edit inventory item form
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { inventoryService } from '@/services/inventory.service';
import { Inventory } from '@/types';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const InventoryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    quantity: 0,
    amount: 0,
    fund_source: 'personal' as 'personal' | 'mlalad' | 'government',
    purchase_date: new Date().toISOString().split('T')[0],
    status: 'in_stock' as 'in_stock' | 'distributed' | 'in_use',
    description: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchItem();
    }
  }, [id, isEdit]);

  const fetchItem = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const item = await inventoryService.getInventoryById(id);
      // Map backend response to form data
      const itemData = item as any;
      setFormData({
        name: item.name || '',
        type: item.type || item.category || itemData.type || '',
        location: item.location || '',
        quantity: item.quantity || 0,
        amount: item.amount || 0,
        fund_source: (item.fundSource || item.fund_source || itemData.fund_source || 'personal') as 'personal' | 'mlalad' | 'government',
        purchase_date: (item.purchaseDate || itemData.purchase_date)
          ? new Date(item.purchaseDate || itemData.purchase_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: (item.status === 'available' ? 'in_stock' : (item.status || itemData.status || 'in_stock')) as 'in_stock' | 'distributed' | 'in_use',
        description: item.description || itemData.description || '',
      });
    } catch (error: any) {
      console.error('Error fetching inventory item:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch inventory item');
      navigate('/admin/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        type: formData.type,
        location: formData.location,
        quantity: Number(formData.quantity),
        amount: Number(formData.amount),
        fund_source: formData.fund_source,
        purchase_date: new Date(formData.purchase_date),
        status: formData.status,
        ...(formData.description && { description: formData.description }),
      };

      if (isEdit && id) {
        await inventoryService.updateInventory(id, payload);
        toast.success('Inventory item updated successfully');
      } else {
        await inventoryService.createInventory(payload);
        toast.success('Inventory item created successfully');
      }
      
      navigate('/admin/inventory');
    } catch (error: any) {
      console.error('Error saving inventory item:', error);
      toast.error(error?.response?.data?.message || 'Failed to save inventory item');
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-3xl font-bold text-foreground">
              {isEdit ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? 'Update inventory item details' : 'Add a new item to inventory'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
            <CardDescription>Enter the details of the inventory item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter item name"
                  required
                  minLength={2}
                  maxLength={200}
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type/Category <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="Enter item type"
                  required
                  maxLength={100}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">
                  Location <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter storage location"
                  required
                  maxLength={200}
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  required
                  min={0}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Purchase Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                  min={0}
                  step="0.01"
                />
              </div>

              {/* Fund Source */}
              <div className="space-y-2">
                <Label htmlFor="fund_source">
                  Fund Source <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.fund_source}
                  onValueChange={(value: 'personal' | 'mlalad' | 'government') =>
                    setFormData({ ...formData, fund_source: value })
                  }
                >
                  <SelectTrigger id="fund_source">
                    <SelectValue placeholder="Select fund source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="mlalad">MLALAD</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Purchase Date */}
              <div className="space-y-2">
                <Label htmlFor="purchase_date">
                  Purchase Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'in_stock' | 'distributed' | 'in_use') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="distributed">Distributed</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description"
                rows={4}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/inventory')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEdit ? 'Update Item' : 'Create Item'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default InventoryFormPage;

