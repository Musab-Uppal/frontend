import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TabulatorTableComponent, TableConfig } from '../tabulator-table/tabulator-table.component';
import { ApiService, ColorRaw, ColorDisplay, UploadResponse, ProcessResponse } from '../../services/api.service';

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
    ProgressSpinnerModule,
    FormsModule,
    TabulatorTableComponent
  ],
  templateUrl: './manual-color.html',
  styleUrls: ['./manual-color.css'],
  providers: [MessageService]
})
export class ManualColor implements OnInit {
  searchText = '';
  showImportDialog = false;
  isUploading = false;
  isProcessing = false;
  
  // Uploaded colors from backend (after Excel parsing)
  uploadedColors: ColorRaw[] = [];
  processedColors: ColorDisplay[] = [];

  // Tabulator configuration - EDITABLE MODE
  tabulatorConfig: TableConfig = {
    title: 'Manual Color Data',
    editable: true,               // ✅ EDITABLE - enables floating actions
    allowImport: false,
    allowExport: true,
    allowS3Fetch: false,
    pagination: true,
    paginationSize: 10,
    selectable: true,
    movableColumns: true,
    headerFilter: false
  };

  constructor(
    private messageService: MessageService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    console.log('🚀 Manual Color component initialized');
  }

  /**
   * Open import dialog
   */
  openImportDialog() {
    this.showImportDialog = true;
  }

  /**
   * Handle file upload to backend
   */
  onUpload(event: any) {
    const file: File = event.files[0];
    if (!file) return;

    console.log('📥 Uploading file to backend:', file.name);
    this.isUploading = true;

    this.apiService.uploadManualColors(file).subscribe({
      next: (response: UploadResponse) => {
        console.log('✅ File uploaded successfully:', response);
        
        this.uploadedColors = response.colors;
        
        // Convert to display format for table
        this.processedColors = response.colors.map((color: ColorRaw, index: number) => {
          return {
            rowNumber: String(index + 1),
            messageId: String(color.message_id),
            ticker: color.ticker,
            sector: color.sector,
            cusip: color.cusip,
            date: color.date,
            price_level: color.price_level,
            bid: color.bid,
            ask: color.ask,
            px: color.px,
            source: color.source,
            bias: color.bias,
            rank: color.rank,
            cov_price: color.cov_price,
            percent_diff: color.percent_diff,
            price_diff: color.price_diff,
            confidence: color.confidence,
            isParent: false,
            childrenCount: 0
          };
        });

        this.showImportDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Uploaded ${response.valid_colors} valid colors from ${response.filename}. ${response.errors_count} errors found.`
        });

        if (response.errors_count > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Parsing Warnings',
            detail: `${response.errors_count} rows had errors. Check console for details.`
          });
          console.log('Parsing errors:', response.errors);
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

  /**
   * Process colors through ranking engine
   */
  runAutomation() {
    if (this.uploadedColors.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'Please upload an Excel file first'
      });
      return;
    }

    console.log('⚙️ Processing colors through ranking engine...');
    this.isProcessing = true;

    this.apiService.processManualColors(this.uploadedColors).subscribe({
      next: (response: ProcessResponse) => {
        console.log('✅ Colors processed successfully:', response);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Processing Complete',
          detail: `Processed ${response.processed_count} colors: ${response.parents} parents, ${response.children} children`
        });

        // Clear uploaded colors after successful processing
        this.uploadedColors = [];
        this.processedColors = [];
      },
      error: (error) => {
        console.error('❌ Error processing colors:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Processing Failed',
          detail: error.error?.detail || 'Failed to process colors'
        });
      },
      complete: () => {
        this.isProcessing = false;
      }
    });
  }

  /**
   * Cancel import
   */
  onCancelUpload() {
    this.showImportDialog = false;
  }

  /**
   * Handle table data changes (from Tabulator)
   */
  onTableDataChanged(data: any[]) {
    console.log('📝 Table data changed:', data.length, 'rows');
    
    // Convert back to ColorRaw format and update uploadedColors
    this.uploadedColors = data.map((displayColor: any) => {
      return this.apiService.convertToBackendFormat(displayColor);
    });
    
    this.processedColors = data;
  }

  /**
   * Handle table data loaded (from Tabulator)
   */
  onTableDataLoaded(data: any[]) {
    console.log('📥 Table data loaded:', data.length, 'rows');
    this.processedColors = data;
  }

  /**
   * Handle row selection (from Tabulator)
   */
  onTableRowSelected(selectedRows: any[]) {
    console.log('✅ Selected rows:', selectedRows.length);
  }

  /**
   * Add new row manually
   */
  addNewRow() {
    const newRow: ColorDisplay = {
      rowNumber: String(this.processedColors.length + 1),
      messageId: '',
      ticker: '',
      sector: '',
      cusip: '',
      date: new Date().toISOString().split('T')[0],
      price_level: 0,
      bid: 0,
      ask: 0,
      px: 0,
      source: '',
      bias: '',
      rank: 5,
      cov_price: 0,
      percent_diff: 0,
      price_diff: 0,
      confidence: 5,
      isParent: false,
      childrenCount: 0
    };
    
    this.processedColors = [newRow, ...this.processedColors];
    
    // Also add to uploadedColors
    this.uploadedColors = [this.apiService.convertToBackendFormat(newRow), ...this.uploadedColors];
    
    this.messageService.add({
      severity: 'success',
      summary: 'Added',
      detail: 'New color row added'
    });
  }

  /**
   * Clear all data
   */
  clearData() {
    this.uploadedColors = [];
    this.processedColors = [];
    this.messageService.add({
      severity: 'info',
      summary: 'Cleared',
      detail: 'All color data cleared'
    });
  }

  /**
   * Get colors for table display
   */
  get colors(): ColorDisplay[] {
    return this.processedColors;
  }
}