import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CustomTableComponent, TableColumn, TableRow, TableConfig } from '../custom-table/custom-table.component';
import { FilterDialogComponent } from '../filter-dialog/filter-dialog.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-manual-color',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    FileUploadModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    ProgressSpinnerModule,
    FormsModule,
    CustomTableComponent,
    FilterDialogComponent
  ],
  templateUrl: './manual-color.html',
  styleUrls: ['./manual-color.css'],
  providers: [MessageService]
})
export class ManualColor implements OnInit {
  @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;

  searchText = '';
  showImportDialog = false;
  showFilterDialog = false;
  isUploading = false;
  isTableExpanded: boolean = false;
  selectedFile: File | null = null;
  fileSize: string = '';
  
  // Session management
  currentSessionId: string | null = null;
  
  // Table data
  tableData: TableRow[] = [];
  
  // Table configuration
  tableColumns: TableColumn[] = [
    { field: 'messageId', header: 'Message ID', width: '180px', editable: true },
    { field: 'ticker', header: 'Ticker', width: '140px', editable: true },
    { field: 'cusip', header: 'CUSIP', width: '140px', editable: true },
    { field: 'bias', header: 'Bias', width: '120px', editable: true },
    { field: 'date', header: 'Date', width: '120px', editable: true },
    { field: 'bid', header: 'BID', width: '100px', editable: true, type: 'number' },
    { field: 'mid', header: 'MID', width: '100px', editable: true, type: 'number' },
    { field: 'ask', header: 'ASK', width: '100px', editable: true, type: 'number' },
    { field: 'px', header: 'PX', width: '100px', editable: true, type: 'number' },
    { field: 'source', header: 'Source', width: '140px', editable: true }
  ];

  tableConfig: TableConfig = {
    editable: true,
    selectable: true,
    showSelectButton: true,
    showRowNumbers: false,
    pagination: false,
    pageSize: 20
  };

  constructor(
    private messageService: MessageService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    console.log('🚀 Manual Color component initialized');
  }

  // ==================== FILE UPLOAD ====================

  /**
   * Trigger native file input dialog
   */
  triggerFileInput() {
    if (this.fileInputRef && this.fileInputRef.nativeElement) {
      this.fileInputRef.nativeElement.click();
    }
  }

  /**
   * Handle native file selection
   */
  onNativeFileSelect(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file: File = files[0];
    
    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidFile) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Only .xlsx and .xls files are supported'
      });
      return;
    }

    // Store file and display info
    this.selectedFile = file;
    this.fileSize = this.formatFileSize(file.size);

    console.log('📄 File selected:', file.name, 'Size:', this.fileSize);

    // Reset file input so same file can be selected again if needed
    event.target.value = '';
  }

  openImportDialog() {
    this.showImportDialog = true;
    this.selectedFile = null;
    this.fileSize = '';
    this.isUploading = false;
  }

  onUpload() {
    if (!this.selectedFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No File Selected',
        detail: 'Please select a file to import'
      });
      return;
    }

    console.log('📥 Uploading file to backend:', this.selectedFile.name);
    this.isUploading = true;

    this.apiService.importManualColorFile(this.selectedFile, 1).subscribe({
      next: (response: any) => {
        console.log('✅ File imported successfully:', response);
        
        if (response.success) {
          this.currentSessionId = response.session_id;
          
          // Convert backend data to table format
          this.tableData = response.sorted_preview.map((row: any, index: number) => ({
            _rowId: `row_${row.message_id}`,
            _selected: false,
            rowNumber: String(row.message_id),  // Use message_id as row identifier
            messageId: row.message_id,
            ticker: row.ticker,
            cusip: row.cusip,
            bias: row.bias,
            date: row.date ? new Date(row.date).toLocaleDateString() : '',
            bid: row.bid,
            mid: (row.bid + row.ask) / 2,
            ask: row.ask,
            px: row.px,
            source: row.source,
            rank: row.rank,
            isParent: row.is_parent,
            parentRow: row.parent_message_id,  // Use parent_message_id
            childrenCount: row.child_count || 0
          }));

          this.showImportDialog = false;
          
          this.messageService.add({
            severity: 'success',
            summary: 'Import Successful',
            detail: `Imported ${response.rows_imported} rows. ${response.statistics.parent_rows} parents, ${response.statistics.child_rows} children.`
          });

          if (response.parsing_errors && response.parsing_errors.length > 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Parsing Warnings',
              detail: `${response.parsing_errors.length} errors found. Check console for details.`
            });
            console.warn('Parsing errors:', response.parsing_errors);
          }
        } else {
          throw new Error(response.error || 'Import failed');
        }
      },
      error: (error) => {
        console.error('❌ Error uploading file:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: error.error?.detail || 'Failed to upload file to backend'
        });
      },
      complete: () => {
        this.isUploading = false;
      }
    });
  }

  onCancelUpload() {
    this.showImportDialog = false;
    this.selectedFile = null;
    this.fileSize = '';
    this.isUploading = false;
  }

  /**
   * Format file size to human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file extension icon
   */
  getFileIcon(): string {
    if (!this.selectedFile) return 'pi-file';
    
    const name = this.selectedFile.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return 'pi-file-excel';
    }
    return 'pi-file';
  }

  // ==================== TABLE EXPANSION ====================

  toggleTableExpansion() {
    console.log('📄 Toggling table expansion - Current state:', this.isTableExpanded);
    this.isTableExpanded = !this.isTableExpanded;
    
    // Notify sidebar to collapse/expand
    if (this.isTableExpanded) {
      // Collapse sidebar
      document.body.style.overflow = 'hidden';
      const sidebar = document.querySelector('.layout-sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.display = 'none';
      }
    } else {
      // Restore sidebar
      document.body.style.overflow = 'auto';
      const sidebar = document.querySelector('.layout-sidebar');
      if (sidebar) {
        (sidebar as HTMLElement).style.display = 'block';
      }
    }
    
    console.log('📄 New expanded state:', this.isTableExpanded);
  }

  // ==================== TABLE EVENTS ====================

  onTableDataChanged(data: TableRow[]) {
    console.log('📊 Table data changed:', data.length, 'rows');
    this.tableData = data;
  }

  onTableRowsSelected(selectedRows: TableRow[]) {
    console.log('✅ Rows selected:', selectedRows.length);
  }

  onCellEdited(event: any) {
    console.log('📝 Cell edited:', event);
  }

  // ==================== ACTIONS ====================

  addNewRow() {
    const newRow: TableRow = {
      _rowId: `row_new_${Date.now()}`,
      _selected: false,
      rowNumber: String(this.tableData.length + 1),
      messageId: '',
      ticker: '',
      cusip: '',
      bias: '',
      date: new Date().toLocaleDateString(),
      bid: 0,
      mid: 0,
      ask: 0,
      px: 0,
      source: 'MANUAL',
      rank: 5,
      isParent: true,
      childrenCount: 0
    };
    
    this.tableData = [newRow, ...this.tableData];
    
    this.messageService.add({
      severity: 'success',
      summary: 'Row Added',
      detail: 'New row added to table'
    });
  }

  runAutomation() {
    if (!this.currentSessionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'Please import data first'
      });
      return;
    }

    console.log('⚙️ Running automation...');
    this.messageService.add({
      severity: 'info',
      summary: 'Processing',
      detail: 'Running automation rules...'
    });

    setTimeout(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Complete',
        detail: 'Automation completed successfully'
      });
    }, 1000);
  }

  saveData() {
    if (!this.currentSessionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Session',
        detail: 'Please import data first'
      });
      return;
    }

    console.log('💾 Saving data...');
    
    this.apiService.saveManualColors(this.currentSessionId, 1).subscribe({
      next: (response: any) => {
        console.log('✅ Data saved:', response);
        
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: `Saved ${response.rows_saved} rows successfully`
          });
        }
      },
      error: (error) => {
        console.error('❌ Error saving data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: error.error?.detail || 'Failed to save data'
        });
      }
    });
  }

  // ==================== FILTERS ====================

  showFilters() {
    this.showFilterDialog = true;
  }

  onFiltersApplied(filters: any) {
    console.log('✅ Filters applied:', filters);
    this.messageService.add({
      severity: 'success',
      summary: 'Filters Applied',
      detail: `${filters.conditions.length} filter(s) applied`
    });
  }
}