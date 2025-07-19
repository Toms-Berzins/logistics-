import React, { useMemo, useRef, useEffect, forwardRef } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  flexRender,
  ColumnDef,
  Table as TanStackTable
} from '@tanstack/react-table'
import { cn } from '../../lib/utils'

interface VirtualizedTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  height: number
  rowHeight: number
  className?: string
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void
  getRowId?: (row: T) => string
  overscan?: number
  loading?: boolean
  emptyMessage?: string
  stickyHeader?: boolean
  rowClassName?: (row: T, index: number) => string
  onScroll?: (scrollTop: number) => void
  estimatedRowHeight?: number
}

function VirtualizedTableInner<T>({
  data,
  columns,
  height,
  rowHeight,
  className,
  onRowClick,
  onRowDoubleClick,
  sorting = [],
  onSortingChange,
  columnFilters = [],
  onColumnFiltersChange,
  getRowId,
  overscan = 5,
  loading = false,
  emptyMessage = 'No data available',
  stickyHeader = true,
  rowClassName,
  onScroll,
  estimatedRowHeight
}: VirtualizedTableProps<T>) {
  const listRef = useRef<List>(null)
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange,
    onColumnFiltersChange,
    getRowId,
    enableSorting: true,
    enableFilters: true,
  })

  const { rows } = table.getRowModel()
  const headers = table.getHeaderGroups()[0]?.headers || []

  // Scroll to top when data changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start')
    }
  }, [data.length, columnFilters, sorting])

  const Row = ({ index, style }: ListChildComponentProps) => {
    const row = rows[index]
    const originalData = row.original

    if (!row) return null

    return (
      <div
        style={style}
        className={cn(
          'flex border-b border-gray-200 hover:bg-gray-50 transition-colors',
          rowClassName?.(originalData, index),
          'cursor-pointer'
        )}
        onClick={() => onRowClick?.(originalData)}
        onDoubleClick={() => onRowDoubleClick?.(originalData)}
        role="row"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRowClick?.(originalData)
          }
        }}
      >
        {row.getVisibleCells().map((cell, cellIndex) => {
          const column = headers[cellIndex]
          const width = column?.getSize() || 150

          return (
            <div
              key={cell.id}
              className="flex items-center px-4 py-2 text-sm text-gray-900 overflow-hidden"
              style={{ 
                width: `${width}px`,
                minWidth: `${width}px`,
                maxWidth: `${width}px`
              }}
              role="gridcell"
            >
              <div className="truncate w-full">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const handleScroll = ({ scrollTop }: { scrollTop: number }) => {
    onScroll?.(scrollTop)
  }

  if (loading) {
    return (
      <div className={cn('border border-gray-200 rounded-lg', className)}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className={cn('border border-gray-200 rounded-lg', className)}>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      {stickyHeader && (
        <div className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          {headers.map((header) => {
            const width = header.getSize()
            const canSort = header.column.getCanSort()
            const isSorted = header.column.getIsSorted()

            return (
              <div
                key={header.id}
                className={cn(
                  'flex items-center px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden',
                  canSort && 'cursor-pointer hover:bg-gray-100'
                )}
                style={{ 
                  width: `${width}px`,
                  minWidth: `${width}px`,
                  maxWidth: `${width}px`
                }}
                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                role="columnheader"
                aria-sort={
                  isSorted ? (isSorted === 'desc' ? 'descending' : 'ascending') : 'none'
                }
              >
                <div className="flex items-center space-x-1 truncate w-full">
                  <span className="truncate">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </span>
                  {canSort && (
                    <span className="flex-shrink-0">
                      {isSorted === 'desc' ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : isSorted === 'asc' ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 opacity-40" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 12l5-5 5 5H5z" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Virtual List */}
      <List
        ref={listRef}
        height={height}
        itemCount={rows.length}
        itemSize={estimatedRowHeight || rowHeight}
        overscanCount={overscan}
        onScroll={handleScroll}
        role="grid"
        aria-rowcount={rows.length}
        aria-colcount={headers.length}
      >
        {Row}
      </List>
    </div>
  )
}

// Export with proper generic typing
export const VirtualizedTable = forwardRef(VirtualizedTableInner) as <T>(
  props: VirtualizedTableProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => JSX.Element