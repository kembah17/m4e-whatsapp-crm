"use client";

import { useState } from "react";
import type { StockLocation, LocationType } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Warehouse,
  Store,
  LayoutGrid,
  Box,
  MapPin,
  Truck,
  Cloud,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

const LOCATION_TYPE_CONFIG: Record<
  LocationType,
  { label: string; icon: React.ElementType; color: string }
> = {
  warehouse: {
    label: "Warehouse",
    icon: Warehouse,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  store: {
    label: "Store",
    icon: Store,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  zone: {
    label: "Zone",
    icon: LayoutGrid,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  shelf: {
    label: "Shelf",
    icon: Box,
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  bin: {
    label: "Bin",
    icon: Box,
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  transit: {
    label: "Transit",
    icon: Truck,
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  virtual: {
    label: "Virtual",
    icon: Cloud,
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
};

export { LOCATION_TYPE_CONFIG };

interface LocationTreeNodeProps {
  location: StockLocation;
  depth: number;
  onEdit: (location: StockLocation) => void;
  onDelete: (location: StockLocation) => void;
  onAddChild: (parentId: string) => void;
}

function LocationTreeNode({
  location,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: LocationTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = location.children && location.children.length > 0;
  const config = LOCATION_TYPE_CONFIG[location.location_type] || LOCATION_TYPE_CONFIG.zone;
  const Icon = config.icon;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-800/50 group transition-colors ${
          depth > 0 ? "ml-" + Math.min(depth * 6, 24) : ""
        }`}
        style={{ marginLeft: depth > 0 ? `${depth * 1.5}rem` : undefined }}
      >
        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`p-0.5 rounded hover:bg-slate-700 transition-colors ${
            !hasChildren ? "invisible" : ""
          }`}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {/* Icon */}
        <Icon className="h-4 w-4 text-slate-400 shrink-0" />

        {/* Name */}
        <span className="text-sm font-medium text-white flex-1 truncate">
          {location.name}
        </span>

        {/* Type Badge */}
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${config.color}`}
        >
          {config.label}
        </Badge>

        {/* Child count */}
        {hasChildren && (
          <span className="text-[10px] text-slate-500">
            {location.children!.length} sub
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(location.id)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-green-400"
            title="Add sub-location"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEdit(location)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-blue-400"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(location)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {location.children!.map((child) => (
            <LocationTreeNode
              key={child.id}
              location={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LocationTreeProps {
  locations: StockLocation[];
  onEdit: (location: StockLocation) => void;
  onDelete: (location: StockLocation) => void;
  onAddChild: (parentId: string) => void;
}

export function buildLocationTree(flatLocations: StockLocation[]): StockLocation[] {
  const map = new Map<string, StockLocation>();
  const roots: StockLocation[] = [];

  // First pass: create map
  flatLocations.forEach((loc) => {
    map.set(loc.id, { ...loc, children: [] });
  });

  // Second pass: build tree
  flatLocations.forEach((loc) => {
    const node = map.get(loc.id)!;
    if (loc.parent_id && map.has(loc.parent_id)) {
      map.get(loc.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function LocationTree({
  locations,
  onEdit,
  onDelete,
  onAddChild,
}: LocationTreeProps) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No locations set up yet</p>
        <p className="text-slate-500 text-xs mt-1">
          Use the Setup Wizard or add locations manually
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {locations.map((location) => (
        <LocationTreeNode
          key={location.id}
          location={location}
          depth={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}
