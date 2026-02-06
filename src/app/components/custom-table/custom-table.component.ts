import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChildren, QueryList, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

export interface TableColumn {
  field: string;
  header: string;
  width?: string;
  editable?: boolean;
  type?: 'text' | 'number' | 'date';
}

export interface TableRow {
  [key: string]: any;
  _selected?: boolean;
  _rowId?: string;
  isParent?: boolean;
  parentRow?: string | number;
  childrenCount?: number;
  rowNumber?: string | number;
}

export interface TableConfig {
  editable: boolean;
  selectable: boolean;
  showSelectButton: boolean;
  showRowNumbers: boolean;
  pagination?: boolean;
  pageSize?: number;
}

@Component({
  selector: 'app-custom-table',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule, ToastModule],
  templateUrl: './custom-table.component.html',
  styleUrls: ['./custom-table.component.css'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomTableComponent implements OnChanges, AfterViewChecked {
  @Input() columns: TableColumn[] = [];
  @Input() set data(value: TableRow[]) {
    this._rawData = value;
  }
  get data(): TableRow[] {
    return this._processedData;
  }
  @Input() config: TableConfig = {
    editable: false,
    selectable: true,
    showSelectButton: true,
    showRowNumbers: false,
    pagination: true,
    pageSize: 20
  };
  @Input() primaryField: string = 'messageId';

  @Output() dataChanged = new EventEmitter<TableRow[]>();
  @Output() rowsSelected = new EventEmitter<TableRow[]>();
  @Output() cellEdited = new EventEmitter<{ row: TableRow; field: string; oldValue: any; newValue: any }>();
  @Output() onExpandButtonClick = new EventEmitter<void>();
  @Output() primaryFieldLookup = new EventEmitter<{ row: TableRow; value: any }>();

  private _rawData: TableRow[] = [];
  private _processedData: TableRow[] = [];
  displayData: TableRow[] = [];
  selectedRows: TableRow[] = [];
  currentPage = 1;
  totalPages = 1;
  editingCell: { rowId: string; field: string } | null = null;
  tempEditValue: any = '';
  private _needsFocus = false;

  /** Track which parent rows are expanded (by _rowId) */
  expandedRows = new Set<string>();

  Math = Math;

  @ViewChildren('cellInput') cellInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.initializeData();
      this.updatePagination();
      this.cdr.markForCheck();
    }
  }

  ngAfterViewChecked() {
    if (this._needsFocus && this.cellInputs && this.cellInputs.length > 0) {
      this.cellInputs.first.nativeElement.focus();
      this._needsFocus = false;
    }
  }

  private initializeData() {
    this._processedData = this._rawData.map((row, index) => ({
      ...row,
      _rowId: row._rowId || `row_${index}_${Date.now()}`,
      _selected: row._selected || false
    }));

    this.updateDisplayData();
  }

  // ==================== DISPLAY DATA ====================

  /**
   * Build display data: in non-editable mode show only parent rows
   * + children of expanded parents. In editable mode show everything.
   */
  private updateDisplayData() {
    let visibleRows: TableRow[];

    if (this.config.editable) {
      // Editable mode: show all rows, no pagination
      visibleRows = [...this._processedData];
    } else {
      // Non-editable mode: only parents + expanded children
      visibleRows = [];
      for (const row of this._processedData) {
        if (row.isParent === true) {
          visibleRows.push(row);
          // If this parent is expanded, add its children
          if (this.expandedRows.has(row._rowId!)) {
            const children = this._processedData.filter(
              r => !r.isParent && r.parentRow !== undefined && r.parentRow !== null &&
                   this.getParentRowId(r) === row._rowId
            );
            visibleRows.push(...children);
          }
        }
      }
    }

    // Apply pagination only if enabled
    if (this.config.pagination && !this.config.editable) {
      const pageSize = this.config.pageSize || 20;
      // Count only parents for pagination
      const parentRows = visibleRows.filter(r => r.isParent === true);
      this.totalPages = Math.ceil(parentRows.length / pageSize);

      // Paginate by parent groups
      const pagedRows: TableRow[] = [];
      let parentCount = 0;
      for (const row of visibleRows) {
        if (row.isParent === true) {
          parentCount++;
        }
        if (parentCount > (this.currentPage - 1) * (this.config.pageSize || 20) &&
            parentCount <= this.currentPage * (this.config.pageSize || 20)) {
          pagedRows.push(row);
        }
      }
      this.displayData = pagedRows;
    } else {
      this.displayData = visibleRows;
    }
  }

  private updatePagination() {
    if (this.config.pagination && !this.config.editable) {
      const parentCount = this._processedData.filter(r => r.isParent === true).length;
      this.totalPages = Math.ceil(parentCount / (this.config.pageSize || 20));
      if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.currentPage = this.totalPages;
        this.updateDisplayData();
      }
    }
  }

  /** Find the _rowId of the parent for a child row */
  private getParentRowId(childRow: TableRow): string | null {
    // Children are placed after their parent in the array.
    // Walk backwards from this child to find its parent.
    const childIndex = this._processedData.indexOf(childRow);
    for (let i = childIndex - 1; i >= 0; i--) {
      if (this._processedData[i].isParent === true) {
        return this._processedData[i]._rowId || null;
      }
    }
    return null;
  }

  // ==================== EXPAND / COLLAPSE ====================

  toggleRowExpand(row: TableRow) {
    if (this.expandedRows.has(row._rowId!)) {
      this.expandedRows.delete(row._rowId!);
    } else {
      this.expandedRows.add(row._rowId!);
    }
    this.updateDisplayData();
    this.cdr.markForCheck();
  }

  isRowExpanded(row: TableRow): boolean {
    return this.expandedRows.has(row._rowId!);
  }

  hasChildren(row: TableRow): boolean {
    return row.isParent === true && (row.childrenCount ?? 0) > 0;
  }

  // ==================== SELECTION ====================

  toggleSelectAll() {
    const allVisibleSelected = this.isAllSelected();
    this.displayData.forEach(row => {
      row._selected = !allVisibleSelected;
      const dataRow = this._processedData.find(r => r._rowId === row._rowId);
      if (dataRow) dataRow._selected = !allVisibleSelected;
    });
    this.updateSelectedRows();
    this.cdr.markForCheck();
  }

  isAllSelected(): boolean {
    return this.displayData.length > 0 && this.displayData.every(row => row._selected === true);
  }

  isSomeSelected(): boolean {
    return this.displayData.some(row => row._selected === true) && !this.isAllSelected();
  }

  toggleRowSelection(row: TableRow) {
    const dataRow = this._processedData.find(r => r._rowId === row._rowId);
    if (dataRow) {
      dataRow._selected = !dataRow._selected;
      row._selected = dataRow._selected;
    }
    this.updateSelectedRows();
    this.cdr.markForCheck();
  }

  private updateSelectedRows() {
    this.selectedRows = this._processedData.filter(row => row._selected === true);
    this.rowsSelected.emit(this.selectedRows);
  }

  clearSelection() {
    this._processedData.forEach(row => row._selected = false);
    this.displayData.forEach(row => row._selected = false);
    this.selectedRows = [];
    this.rowsSelected.emit([]);
    this.cdr.markForCheck();
  }

  isRowSelected(row: TableRow): boolean {
    return row._selected === true;
  }

  // ==================== EDITING ====================

  startEdit(row: TableRow, field: string) {
    // If already editing this exact cell, do nothing (prevents re-trigger on input click)
    if (this.editingCell &&
        this.editingCell.rowId === row._rowId &&
        this.editingCell.field === field) {
      return;
    }

    const isPrimaryField = field === this.primaryField;

    // In non-editable mode, only allow editing the primary field
    if (!this.config.editable && !isPrimaryField) return;

    // In editable mode, respect per-column editable flag
    if (this.config.editable) {
      const column = this.columns.find(col => col.field === field);
      if (!column || column.editable === false) return;
    }

    this.editingCell = { rowId: row._rowId!, field };
    this.tempEditValue = row[field];
    this._needsFocus = true;
    this.cdr.markForCheck();
  }

  saveEdit(row: TableRow, field: string) {
    if (!this.editingCell) return;

    const oldValue = row[field];
    const newValue = this.tempEditValue;

    // In non-editable mode, primary field triggers a lookup instead of local save
    if (!this.config.editable && field === this.primaryField) {
      if (newValue && newValue !== oldValue) {
        row[field] = newValue;
        const dataRow = this._processedData.find(r => r._rowId === row._rowId);
        if (dataRow) {
          dataRow[field] = newValue;
        }
        this.primaryFieldLookup.emit({ row, value: newValue });
      }
      this.editingCell = null;
      this.tempEditValue = '';
      this.cdr.markForCheck();
      return;
    }

    if (oldValue !== newValue) {
      row[field] = newValue;

      const dataRow = this._processedData.find(r => r._rowId === row._rowId);
      if (dataRow) {
        dataRow[field] = newValue;
      }

      this.cellEdited.emit({ row, field, oldValue, newValue });
      this.dataChanged.emit(this._processedData);
    }

    this.editingCell = null;
    this.tempEditValue = '';
    this.cdr.markForCheck();
  }

  cancelEdit() {
    this.editingCell = null;
    this.tempEditValue = '';
    this.cdr.markForCheck();
  }

  isEditing(row: TableRow, field: string): boolean {
    return this.editingCell !== null &&
           this.editingCell.rowId === row._rowId &&
           this.editingCell.field === field;
  }

  onKeyDown(event: KeyboardEvent, row: TableRow, field: string) {
    if (event.key === 'Enter') {
      this.saveEdit(row, field);
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  // ==================== ROW OPERATIONS ====================

  addNewRow() {
    if (!this.config.editable) return;

    const newRow: TableRow = {
      _rowId: `row_new_${Date.now()}`,
      _selected: false,
      isParent: true
    };

    this.columns.forEach(col => {
      if (col.field !== 'select' && col.field !== 'rowNumber') {
        newRow[col.field] = '';
      }
    });

    this._processedData.unshift(newRow);
    this.updateDisplayData();
    this.dataChanged.emit(this._processedData);

    this.messageService.add({
      severity: 'success',
      summary: 'Row Added',
      detail: 'New row added to the table'
    });

    this.cdr.markForCheck();
  }

  deleteSelectedRows() {
    if (this.selectedRows.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Selection',
        detail: 'Please select rows to delete'
      });
      return;
    }

    const rowsToDelete = new Set<string>();

    this.selectedRows.forEach(selectedRow => {
      rowsToDelete.add(selectedRow._rowId!);

      if (selectedRow['isParent']) {
        this.findAndMarkChildren(selectedRow, rowsToDelete);
      }
    });

    this._processedData = this._processedData.filter(row => !rowsToDelete.has(row._rowId!));

    this.clearSelection();
    this.updatePagination();
    this.updateDisplayData();
    this.dataChanged.emit(this._processedData);

    this.messageService.add({
      severity: 'success',
      summary: 'Deleted',
      detail: `${rowsToDelete.size} row(s) deleted successfully`
    });

    this.cdr.markForCheck();
  }

  private findAndMarkChildren(parentRow: TableRow, deleteSet: Set<string>) {
    const parentRowId = parentRow._rowId;

    this._processedData.forEach(row => {
      if (!row.isParent && row._rowId !== parentRowId) {
        const rowParentId = this.getParentRowId(row);
        if (rowParentId === parentRowId) {
          deleteSet.add(row._rowId!);
        }
      }
    });
  }

  // ==================== PARENT/CHILD OPERATIONS ====================

  swapParentChild() {
    if (this.selectedRows.length !== 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Selection',
        detail: 'Please select exactly one row to swap'
      });
      return;
    }

    this.messageService.add({
      severity: 'info',
      summary: 'Swap Operation',
      detail: 'Swap parent/child functionality - Implementation needed'
    });
  }

  assignAsParent() {
    if (this.selectedRows.length !== 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Selection',
        detail: 'Please select exactly one row'
      });
      return;
    }

    const row = this.selectedRows[0];
    const dataRow = this._processedData.find(r => r._rowId === row._rowId);

    if (dataRow) {
      dataRow['isParent'] = true;
      dataRow['parentRow'] = undefined;

      this.updateDisplayData();
      this.dataChanged.emit(this._processedData);

      this.messageService.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Row assigned as parent'
      });

      this.cdr.markForCheck();
    }
  }

  saveSelectedRows() {
    if (this.selectedRows.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Selection',
        detail: 'Please select rows to save'
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: `${this.selectedRows.length} row(s) saved`
    });

    this.rowsSelected.emit(this.selectedRows);
  }

  // ==================== PAGINATION ====================

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayData();
      this.cdr.markForCheck();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayData();
      this.cdr.markForCheck();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayData();
      this.cdr.markForCheck();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // ==================== EXPORT ====================

  getExportLabel(): string {
    return this.selectedRows.length > 0
      ? `Export Selected (${this.selectedRows.length})`
      : 'Export All';
  }

  exportToCSV() {
    const dataToExport = this.selectedRows.length > 0 ? this.selectedRows : this._processedData;

    if (dataToExport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'No data to export'
      });
      return;
    }

    const headers = this.columns
      .filter(col => col.field !== 'select')
      .map(col => col.header);

    const fields = this.columns
      .filter(col => col.field !== 'select')
      .map(col => col.field);

    let csv = headers.join(',') + '\n';

    dataToExport.forEach(row => {
      const values = fields.map(field => {
        let value = row[field] || '';
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Exported',
      detail: `${dataToExport.length} row(s) exported to CSV`
    });
  }

  // ==================== HELPERS ====================

  trackByRowId(index: number, row: TableRow): string {
    return row._rowId || `${index}`;
  }

  isChildRow(row: TableRow): boolean {
    return row.isParent !== true && row.parentRow !== undefined && row.parentRow !== null;
  }

  isParentRow(row: TableRow): boolean {
    return row.isParent === true;
  }

  canEditCell(column: TableColumn): boolean {
    if (this.config.editable && column.editable !== false) return true;
    if (!this.config.editable && column.field === this.primaryField) return true;
    return false;
  }

  updateRowData(rowId: string, data: Partial<TableRow>) {
    const dataRow = this._processedData.find(r => r._rowId === rowId);
    if (dataRow) {
      Object.assign(dataRow, data);
    }
    const displayRow = this.displayData.find(r => r._rowId === rowId);
    if (displayRow) {
      Object.assign(displayRow, data);
    }
    this.cdr.markForCheck();
  }

  /** Get parent count for display */
  getParentCount(): number {
    return this._processedData.filter(r => r.isParent === true).length;
  }

  getTotalCount(): number {
    return this._processedData.length;
  }
}
