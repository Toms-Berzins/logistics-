/**
 * Accessible table component for logistics platform
 * WCAG 2.1 AA compliant with sorting, filtering, and keyboard navigation
 */

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { RovingTabindex } from '@/lib/accessibility/focus-management';
import { announceToLiveRegion } from '@/lib/accessibility/live-regions';
import { createTableDescription } from '@/lib/accessibility/screen-reader';
import { LOGISTICS_ARIA_LABELS } from '@/lib/accessibility';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  description?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  caption?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, string>) => void;
  onRowSelect?: (row: T, index: number) => void;
  onRowAction?: (action: string, row: T, index: number) => void;
  selectable?: boolean;
  selectedRows?: Set<number>;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  pageSize?: number;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
}

export function AccessibleTable<T = any>({
  data,
  columns,
  caption,
  sortBy,
  sortDirection,
  onSort,
  onFilter,
  onRowSelect,
  onRowAction,
  selectable = false,
  selectedRows = new Set(),
  className = '',
  emptyMessage = 'No data available',
  loading = false,
  pageSize,
  totalItems,
  currentPage,
  onPageChange,
  searchable = false,
  searchValue = '',
  onSearch,
  searchPlaceholder = 'Search...',
}: TableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rovingTabindexRef = useRef<RovingTabindex | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Generate unique IDs
  const tableId = `table-${React.useId()}`;
  const captionId = `caption-${React.useId()}`;
  const searchId = `search-${React.useId()}`;

  // Set up roving tabindex for table rows
  useEffect(() => {
    if (!tableRef.current) return;

    const tbody = tableRef.current.querySelector('tbody');
    if (!tbody) return;

    rovingTabindexRef.current = new RovingTabindex(tbody, {
      selector: 'tr[tabindex]',
      orientation: 'vertical',
      wrap: true,
    });

    return () => {
      if (rovingTabindexRef.current) {
        rovingTabindexRef.current.deactivate();
      }
    };
  }, [data]);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (!onSort) return;

    const newDirection = 
      sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    
    onSort(columnKey, newDirection);
    
    // Announce sort change
    const column = columns.find(col => col.key === columnKey);
    const direction = newDirection === 'asc' ? 'ascending' : 'descending';
    announceToLiveRegion(
      `Table sorted by ${column?.label || columnKey} in ${direction} order`,
      { priority: 'polite', category: 'system' }
    );
  };

  // Handle filter changes
  const handleFilterChange = (columnKey: string, value: string) => {
    const newFilters = { ...filters, [columnKey]: value };
    if (!value) {
      delete newFilters[columnKey];
    }
    
    setFilters(newFilters);
    onFilter?.(newFilters);
    
    // Announce filter change
    if (value) {
      announceToLiveRegion(
        `Filter applied to ${columnKey}: ${value}`,
        { priority: 'polite', category: 'system' }
      );
    } else {
      announceToLiveRegion(
        `Filter removed from ${columnKey}`,
        { priority: 'polite', category: 'system' }
      );
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setLocalSearch(value);
    onSearch?.(value);
  };

  // Handle row selection
  const handleRowSelect = (row: T, index: number) => {
    onRowSelect?.(row, index);
    
    // Announce selection
    announceToLiveRegion(
      `Row ${index + 1} ${selectedRows.has(index) ? 'deselected' : 'selected'}`,
      { priority: 'polite', category: 'system' }
    );
  };

  // Handle keyboard navigation on rows
  const handleRowKeyDown = (
    event: React.KeyboardEvent,
    row: T,
    index: number
  ) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (selectable) {
          handleRowSelect(row, index);
        } else {
          onRowAction?.('select', row, index);
        }
        break;
      
      case 'a':
        if (event.ctrlKey) {
          event.preventDefault();
          onRowAction?.('assign', row, index);
        }
        break;
      
      case 'd':
        if (event.ctrlKey) {
          event.preventDefault();
          onRowAction?.('dispatch', row, index);
        }
        break;
    }
  };

  // Create table description for screen readers
  const tableDescription = createTableDescription(
    'items',
    totalItems || data.length,
    data.length,
    sortBy,
    sortDirection,
    Object.values(filters).filter(Boolean)
  );

  // Filterable columns
  const filterableColumns = columns.filter(col => col.filterable);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      {(searchable || filterableColumns.length > 0) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          {searchable && (
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                {searchPlaceholder}
              </label>
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                id={searchId}
                type="text"
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="
                  pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  text-sm
                "
                aria-describedby={`${searchId}-help`}
              />
              <div id={`${searchId}-help`} className="sr-only">
                Search through table data
              </div>
            </div>
          )}

          {/* Filters */}
          {filterableColumns.length > 0 && (
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filters:</span>
              {filterableColumns.map((column) => (
                <div key={column.key} className="relative">
                  <label htmlFor={`filter-${column.key}`} className="sr-only">
                    Filter by {column.label}
                  </label>
                  <input
                    id={`filter-${column.key}`}
                    type="text"
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    placeholder={`Filter ${column.label}...`}
                    className="
                      px-3 py-1 w-32 border border-gray-300 rounded text-xs
                      focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                    "
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table
          ref={tableRef}
          id={tableId}
          className="min-w-full divide-y divide-gray-200"
          role="table"
          aria-labelledby={captionId}
          aria-describedby={`${captionId}-desc`}
        >
          {/* Caption */}
          {caption && (
            <caption id={captionId} className="sr-only">
              {caption}
            </caption>
          )}
          
          {/* Hidden description for screen readers */}
          <caption id={`${captionId}-desc`} className="sr-only">
            {tableDescription}
          </caption>

          {/* Header */}
          <thead className="bg-gray-50">
            <tr role="row">
              {selectable && (
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  role="columnheader"
                >
                  <span className="sr-only">Select</span>
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`
                    px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : 'text-left'}
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                    ${column.headerClassName || ''}
                  `}
                  style={{ width: column.width }}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  onKeyDown={column.sortable ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(column.key);
                    }
                  } : undefined}
                  tabIndex={column.sortable ? 0 : undefined}
                  role="columnheader"
                  aria-sort={
                    sortBy === column.key
                      ? sortDirection === 'asc' ? 'ascending' : 'descending'
                      : column.sortable ? 'none' : undefined
                  }
                  aria-label={
                    column.sortable
                      ? `${column.label}, sortable column, ${
                          sortBy === column.key
                            ? `currently sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
                            : 'not sorted'
                        }`
                      : column.label
                  }
                >
                  <div className="flex items-center gap-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="flex flex-col">
                        <ChevronUpIcon 
                          className={`h-3 w-3 ${
                            sortBy === column.key && sortDirection === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <ChevronDownIcon 
                          className={`h-3 w-3 -mt-1 ${
                            sortBy === column.key && sortDirection === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </span>
                    )}
                  </div>
                  {column.description && (
                    <div className="sr-only">{column.description}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr role="row">
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                  role="cell"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr role="row">
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                  role="cell"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  role="row"
                  tabIndex={0}
                  className={`
                    hover:bg-gray-50 focus:bg-blue-50 focus:outline-none focus:ring-2 
                    focus:ring-blue-500 focus:ring-inset transition-colors
                    ${selectedRows.has(index) ? 'bg-blue-50' : ''}
                    ${selectable || onRowAction ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => selectable && handleRowSelect(row, index)}
                  onKeyDown={(e) => handleRowKeyDown(e, row, index)}
                  aria-selected={selectable ? selectedRows.has(index) : undefined}
                  aria-rowindex={index + 2} // +1 for header, +1 for 1-based indexing
                >
                  {selectable && (
                    <td className="px-6 py-4" role="cell">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleRowSelect(row, index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => {
                    const value = row[column.key as keyof T];
                    const cellContent = column.render 
                      ? column.render(value, row, index)
                      : String(value || '');

                    return (
                      <td
                        key={column.key}
                        className={`
                          px-6 py-4 whitespace-nowrap text-sm text-gray-900
                          ${column.align === 'center' ? 'text-center' : ''}
                          ${column.align === 'right' ? 'text-right' : 'text-left'}
                          ${column.className || ''}
                        `}
                        role="cell"
                        aria-describedby={column.description ? `${column.key}-desc` : undefined}
                      >
                        {cellContent}
                        {column.description && (
                          <div id={`${column.key}-desc`} className="sr-only">
                            {column.description}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize && totalItems && totalItems > pageSize && (
        <TablePagination
          currentPage={currentPage || 1}
          totalPages={Math.ceil(totalItems / pageSize)}
          onPageChange={onPageChange}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}

/**
 * Accessible pagination component
 */
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    onPageChange?.(page);
    
    // Announce page change
    announceToLiveRegion(
      `Page ${page} of ${totalPages}, showing items ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalItems)}`,
      { priority: 'polite', category: 'system' }
    );
  };

  return (
    <nav
      className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
      role="navigation"
      aria-label={LOGISTICS_ARIA_LABELS.PAGINATION}
    >
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="
            relative inline-flex items-center rounded-md border border-gray-300 bg-white 
            px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          "
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="
            relative ml-3 inline-flex items-center rounded-md border border-gray-300 
            bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          "
        >
          Next
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="
              relative inline-flex items-center rounded-md border border-gray-300 bg-white 
              px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
            aria-label="Go to previous page"
          >
            Previous
          </button>
          
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`
                  relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${pageNum === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                  }
                `}
                aria-label={`Go to page ${pageNum}`}
                aria-current={pageNum === currentPage ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="
              relative inline-flex items-center rounded-md border border-gray-300 bg-white 
              px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
            aria-label="Go to next page"
          >
            Next
          </button>
        </div>
      </div>
    </nav>
  );
}