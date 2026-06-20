'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { useCan } from '@/hooks/use-can';
import { GatedButton } from '@/components/ui/gated-button';
import { toast } from 'sonner';
import type { Product, ProductStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<ProductStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  discontinued: 'bg-red-500/10 text-red-400 border-red-500/30',
  seasonal: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

export default function ProductsPage() {
  const supabase = createClient();
  const { defaultCurrency } = useAuth();
  const canEdit = useCan('edit-settings');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      const json = await res.json();

      const allProducts: Product[] = json.products ?? [];
      setTotalCount(allProducts.length);

      // Client-side pagination
      const from = page * PAGE_SIZE;
      setProducts(allProducts.slice(from, from + PAGE_SIZE));
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      toast.success('Product deleted');
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-white">Products</h1>
          <p className="text-sm text-slate-400">
            Manage your product and service catalog
          </p>
        </div>
        <GatedButton
          canAct={canEdit}
          gateReason="manage products"
          onClick={() => {
            setEditProduct(null);
            setFormOpen(true);
          }}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Product
        </GatedButton>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
            <SelectItem value="seasonal">Seasonal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-sm font-medium text-white mb-1">
              {search || statusFilter !== 'all'
                ? 'No products match your filters'
                : 'Add your first product'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 max-w-sm">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Create products and services to track in your reactivation campaigns'}
            </p>
            {!search && statusFilter === 'all' && (
              <GatedButton
                canAct={canEdit}
                gateReason="manage products"
                onClick={() => {
                  setEditProduct(null);
                  setFormOpen(true);
                }}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-1 h-4 w-4" /> Add Product
              </GatedButton>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Category</TableHead>
                <TableHead className="text-slate-400">Price</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  className="border-slate-800 cursor-pointer hover:bg-slate-800/50"
                  onClick={() => {
                    setEditProduct(product);
                    setFormOpen(true);
                  }}
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      {product.short_pitch && (
                        <p className="text-xs text-slate-500 truncate max-w-xs">
                          {product.short_pitch}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {product.category || '\u2014'}
                  </TableCell>
                  <TableCell className="text-sm text-white">
                    {formatCurrency(product.price, defaultCurrency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[product.status] || ''}
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(product);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3">
          <p className="text-xs text-slate-500">
            Showing {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
            {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Product Form Sheet */}
      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editProduct}
        onSaved={() => {
          setFormOpen(false);
          fetchProducts();
        }}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Product</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
