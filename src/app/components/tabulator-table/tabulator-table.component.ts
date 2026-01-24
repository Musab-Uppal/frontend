import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabulatorService, TableData } from './tabulator.service';

declare var Tabulator: any;

export interface TableConfig {
    title?: string;
    editable?: boolean;
    allowImport?: boolean;
    allowExport?: boolean;
    allowS3Fetch?: boolean;
    pagination?: boolean;
    paginationSize?: number;
    selectable?: boolean;
    movableColumns?: boolean;
    headerFilter?: boolean;
}

@Component({
    selector: 'app-tabulator-table',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, FileUploadModule, ToastModule],
    templateUrl: './tabulator-table.component.html',
    styleUrls: ['./tabulator-table.component.css'],
    providers: [MessageService]
})
export class TabulatorTableComponent implements OnInit {
    @ViewChild('tableContainer') tableContainer!: ElementRef;

    // Configuration inputs
    @Input() config: TableConfig = {
        title: 'Data Table',
        editable: false,
        allowImport: true,
        allowExport: true,
        allowS3Fetch: true,
        pagination: true,
        paginationSize: 20,
        selectable: true,
        movableColumns: true,
        headerFilter: true
    };

    @Input() initialData: any[] = [];
    @Input() columns: any[] = [];

    // Output events
    @Output() dataChanged = new EventEmitter<any[]>();
    @Output() rowSelected = new EventEmitter<any[]>();
    @Output() dataLoaded = new EventEmitter<any[]>();

    table: any;
    tableData: any[] = [];
    isLoading: boolean = false;
    s3BucketName: string = '';
    s3FileName: string = '';

    constructor(
        private tabulatorService: TabulatorService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        console.log('🚀 Tabulator component initialized (Editable:', this.config.editable, ')');
        this.initializeTable();
        if (this.initialData && this.initialData.length > 0) {
            this.loadTableData(this.initialData);
        }
    }

    /**
     * Initialize Tabulator table based on configuration
     */
    private initializeTable() {
        // Use custom columns if provided, otherwise use defaults
        const tableColumns = this.columns.length > 0 ? this.columns : this.getDefaultColumns();

        // Configure columns based on editable mode
        const configuredColumns = tableColumns.map((col) => ({
            ...col,
            editor: this.config.editable ? (col.editor !== undefined ? col.editor : 'input') : false,
            editable: this.config.editable ? col.editable !== false : false,
            resizable: true,
            headerSort: col.headerSort !== false,
            headerFilter: col.headerFilter // Use column-specific setting
        }));

        const tableConfig: any = {
            data: [],
            layout: 'fitDataFill', // Better for responsive + fixed widths
            responsiveLayout: false,
            locale: 'en-us',
            placeholder: 'No Data Available',
            columns: configuredColumns,

            // Pagination
            pagination: this.config.pagination ? 'local' : false,
            paginationSize: this.config.paginationSize || 20,
            paginationSizeSelector: [10, 20, 50, 100],

            // Features
            movableColumns: this.config.movableColumns,
            movableRows: this.config.editable,
            selectable: this.config.selectable ? 1 : false,

            clipboard: true,
            clipboardCopyStyled: false,

            history: this.config.editable,

            // Height
            height: '600px',

            // Virtual rendering for performance
            renderVertical: 'virtual',
            renderHorizontal: 'virtual'
        };

        this.table = new Tabulator('#data-table', tableConfig);

        // Event listeners
        if (this.config.editable) {
            this.table.on('cellEdited', (cell: any) => {
                const updatedData = this.table.getData();
                this.tableData = updatedData;
                this.dataChanged.emit(updatedData);
            });

            this.table.on('rowMoved', () => {
                const updatedData = this.table.getData();
                this.tableData = updatedData;
                this.dataChanged.emit(updatedData);
            });
        }

        if (this.config.selectable) {
            this.table.on('rowSelectionChanged', (data: any, rows: any) => {
                const selectedData = rows.map((row: any) => row.getData());
                this.rowSelected.emit(selectedData);
            });
        }

        console.log('✅ Tabulator initialized');
    }
    /**
     * Get default columns for the table
     */
    private getDefaultColumns() {
        return [
            {
                title: '#',
                field: 'rowNumber',
                width: 60,
                editor: false,
                headerSort: false,
                frozen: true,
                hozAlign: 'center',
                headerFilter: false // No filter for row numbers
            },
            {
                title: 'Message ID',
                field: 'messageId',
                width: 180,
                headerFilter: false // Disable filters to show clean headers
            },
            {
                title: 'Ticker ID',
                field: 'tickerId',
                width: 140,
                headerFilter: false
            },
            {
                title: 'CUSIP',
                field: 'cusip',
                width: 140,
                headerFilter: false
            },
            {
                title: 'Bias',
                field: 'bias',
                width: 140,
                headerFilter: false
            },
            {
                title: 'Date',
                field: 'date',
                width: 120,
                sorter: 'date',
                headerFilter: false
            },
            {
                title: 'BID',
                field: 'bid',
                width: 100,
                hozAlign: 'center',
                headerFilter: false
            },
            {
                title: 'MID',
                field: 'mid',
                width: 100,
                hozAlign: 'center',
                headerFilter: false
            },
            {
                title: 'ASK',
                field: 'ask',
                width: 100,
                hozAlign: 'center',
                headerFilter: false
            },
            {
                title: 'Source',
                field: 'source',
                width: 140,
                headerFilter: false
            }
        ];
    }

    /**
     * Handle Excel file upload
     */
    onExcelFileSelected(event: any) {
        const file: File = event.target?.files?.[0];
        if (!file) return;

        console.log('📥 Excel file selected:', file.name);
        this.isLoading = true;

        this.tabulatorService
            .parseExcelFile(file)
            .then(
                (tableData: TableData) => {
                    console.log('✅ Excel parsed:', tableData.data.length, 'rows');
                    this.loadTableData(tableData.data);
                    this.dataLoaded.emit(tableData.data);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Loaded ${tableData.data.length} rows from Excel`
                    });
                    // Reset file input
                    event.target.value = '';
                },
                (error) => {
                    console.error('❌ Error parsing Excel:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: error.message
                    });
                    event.target.value = '';
                }
            )
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Fetch data from S3
     */
    fetchFromS3() {
        if (!this.s3BucketName || !this.s3FileName) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please enter bucket name and file name'
            });
            return;
        }

        console.log('📥 Fetching from S3:', this.s3BucketName, this.s3FileName);
        this.isLoading = true;

        this.tabulatorService
            .fetchFromS3(this.s3BucketName, this.s3FileName)
            .subscribe({
                next: (tableData: TableData) => {
                    console.log('✅ S3 data fetched:', tableData.data.length, 'rows');
                    this.loadTableData(tableData.data);
                    this.dataLoaded.emit(tableData.data);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Loaded ${tableData.data.length} rows from S3`
                    });
                },
                error: (error) => {
                    console.error('❌ Error fetching S3 data:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to fetch data from S3'
                    });
                }
            })
            .add(() => {
                this.isLoading = false;
            });
    }

    /**
     * Load data into table with row numbers
     */
    private loadTableData(data: any[]) {
        const dataWithRowNumbers = data.map((row, index) => ({
            rowNumber: index + 1,
            ...row
        }));

        this.tableData = dataWithRowNumbers;
        this.table.setData(dataWithRowNumbers);
        console.log('📊 Table updated with', dataWithRowNumbers.length, 'rows');
    }

    /**
     * Export to CSV
     */
    exportToCSV() {
        const data = this.table.getData();
        if (data.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }
        this.tabulatorService.exportToCSV(data, 'table-data');
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data exported to CSV'
        });
    }

    /**
     * Export to Excel
     */
    exportToExcel() {
        const data = this.table.getData();
        if (data.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }
        this.tabulatorService.exportToExcel(data, 'table-data');
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data exported to Excel'
        });
    }

    /**
     * Clear all data
     */
    clearData() {
        this.table.clearData();
        this.tableData = [];
        this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: 'Table cleared'
        });
    }

    /**
     * Get current table data
     */
    getTableData(): any[] {
        return this.table.getData();
    }

    /**
     * Get selected rows
     */
    getSelectedRows(): any[] {
        const rows = this.table.getSelectedRows();
        return rows.map((row: any) => row.getData());
    }

    /**
     * Undo last change (only in editable mode)
     */
    undoChange() {
        if (this.config.editable && this.table.getHistoryUndoSize() > 0) {
            this.table.undo();
            this.dataChanged.emit(this.table.getData());
        }
    }

    /**
     * Redo last change (only in editable mode)
     */
    redoChange() {
        if (this.config.editable && this.table.getHistoryRedoSize() > 0) {
            this.table.redo();
            this.dataChanged.emit(this.table.getData());
        }
    }

    /**
     * Add new row (only in editable mode)
     */
    addNewRow() {
        if (this.config.editable) {
            const newRow = { rowNumber: this.tableData.length + 1 };
            this.table.addRow(newRow, false);
            this.tableData = this.table.getData();
            this.dataChanged.emit(this.tableData);
        }
    }

    /**
     * Delete selected rows (only in editable mode)
     */
    deleteSelectedRows() {
        if (this.config.editable) {
            const selectedRows = this.table.getSelectedRows();
            selectedRows.forEach((row: any) => row.delete());
            this.tableData = this.table.getData();
            this.dataChanged.emit(this.tableData);
            this.messageService.add({
                severity: 'info',
                summary: 'Info',
                detail: 'Selected rows deleted'
            });
        }
    }
}
