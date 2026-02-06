import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { CustomTableComponent, TableColumn, TableRow, TableConfig } from '../custom-table/custom-table.component';
import { FilterDialogComponent } from '../filter-dialog/filter-dialog.component';
import { ApiService, ColorProcessed } from '../../services/api.service';
import { StackedChartComponent } from '../stacked-chart/stacked-chart.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        FormsModule,
        ToastModule,
        TooltipModule,
        CustomTableComponent,
        FilterDialogComponent,
        StackedChartComponent
    ],
    templateUrl: './home.html',
    styleUrls: ['./home.css'],
    providers: [MessageService]
})
export class Home implements OnInit {
    @ViewChild('mainTable') mainTable!: CustomTableComponent;
    @ViewChild('expandedTable') expandedTable!: CustomTableComponent;

    nextRunTimer = '7H:52M:25S';
    filterVisible: boolean = false;
    isTableExpanded: boolean = false;

    // Table data
    tableData: TableRow[] = [];
    selectedRows: TableRow[] = [];

    // Table configuration - READ ONLY mode for home
    tableColumns: TableColumn[] = [
        { field: 'messageId', header: 'Message ID', width: '180px', editable: false },
        { field: 'ticker', header: 'Ticker', width: '140px', editable: false },
        { field: 'cusip', header: 'CUSIP', width: '140px', editable: false },
        { field: 'bias', header: 'Bias', width: '120px', editable: false },
        { field: 'date', header: 'Date', width: '120px', editable: false },
        { field: 'bid', header: 'BID', width: '100px', editable: false },
        { field: 'mid', header: 'MID', width: '100px', editable: false },
        { field: 'ask', header: 'ASK', width: '100px', editable: false },
        { field: 'px', header: 'PX', width: '100px', editable: false },
        { field: 'source', header: 'Source', width: '140px', editable: false }
    ];

    tableConfig: TableConfig = {
        editable: false,       // READ ONLY on home page
        selectable: true,
        showSelectButton: true,
        showRowNumbers: false,
        pagination: true,
        pageSize: 20
    };

    constructor(
        private apiService: ApiService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        console.log('🚀 Home component initialized - loading data from backend...');
        this.loadDataFromBackend();
    }

    /**
     * Load color data from backend API
     * Maps the backend response to table format
     */
    private loadDataFromBackend() {
        console.log('📡 Fetching colors from backend API...');

        this.apiService.getColors(0, 100).subscribe({
            next: (response) => {
                console.log('✅ Colors received from backend:', response.colors.length);

                // Convert backend format to table format with parent-child relationships
                this.tableData = response.colors.map((color: ColorProcessed, index: number) => ({
                    _rowId: `row_${color.message_id}`,
                    _selected: false,
                    rowNumber: String(index + 1),
                    messageId: String(color.message_id),
                    ticker: color.ticker,
                    cusip: color.cusip,
                    bias: color.bias,
                    date: color.date ? new Date(color.date).toLocaleDateString() : '',
                    bid: color.bid,
                    mid: (color.bid + color.ask) / 2,
                    ask: color.ask,
                    px: color.px,
                    source: color.source,
                    rank: color.rank,
                    isParent: color.is_parent,
                    parentRow: color.parent_message_id,
                    childrenCount: color.children_count || 0
                }));

                console.log('✅ Loaded', this.tableData.length, 'colors from backend');
            },
            error: (error) => {
                console.error('❌ Error loading colors from backend:', error);
                
                // Show empty table on error
                this.tableData = [];
                
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load color data from backend'
                });
            }
        });

        // Load next run time
        this.apiService.getNextRunTime().subscribe({
            next: (response) => {
                console.log('✅ Next run time received:', response.next_run);
                this.nextRunTimer = response.next_run;
            },
            error: (error) => {
                console.error('❌ Error loading next run time:', error);
            }
        });
    }

    // ==================== TABLE EVENTS ====================

    onTableDataChanged(data: TableRow[]) {
        console.log('📊 Table data changed:', data.length, 'rows');
        this.tableData = data;
    }

    onTableRowsSelected(selectedRows: TableRow[]) {
        console.log('✅ Rows selected:', selectedRows.length);
        this.selectedRows = selectedRows;
    }

    // ==================== MESSAGE ID LOOKUP ====================

    onMessageIdLookup(event: { row: TableRow; value: any }) {
        const messageId = Number(event.value);
        if (isNaN(messageId)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Invalid ID',
                detail: 'Please enter a valid numeric Message ID'
            });
            return;
        }

        this.apiService.getColorByMessageId(messageId).subscribe({
            next: (response) => {
                if (response.colors && response.colors.length > 0) {
                    const color = response.colors[0];
                    const rowData: Partial<TableRow> = {
                        messageId: String(color.message_id),
                        ticker: color.ticker,
                        cusip: color.cusip,
                        bias: color.bias,
                        date: color.date ? new Date(color.date).toLocaleDateString() : '',
                        bid: color.bid,
                        mid: (color.bid + color.ask) / 2,
                        ask: color.ask,
                        px: color.px,
                        source: color.source,
                        rank: color.rank,
                        isParent: color.is_parent,
                        parentRow: color.parent_message_id,
                        childrenCount: color.children_count || 0
                    };

                    const table = this.isTableExpanded ? this.expandedTable : this.mainTable;
                    if (table) {
                        table.updateRowData(event.row._rowId!, rowData);
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Data Found',
                        detail: `Loaded data for Message ID ${messageId}`
                    });
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Not Found',
                        detail: `No data found for Message ID ${messageId}`
                    });
                }
            },
            error: (error) => {
                console.error('Error fetching message ID:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Fetch Failed',
                    detail: 'Failed to fetch data from backend'
                });
            }
        });
    }

    // ==================== TABLE EXPANSION ====================

    /**
     * Toggle table expansion to full screen
     * Hides sidebar when expanded, restores when minimized
     */
    toggleTableExpansion() {
        console.log('📄 Toggling table expansion - Current state:', this.isTableExpanded);
        this.isTableExpanded = !this.isTableExpanded;
        
        // Manage sidebar visibility
        if (this.isTableExpanded) {
            // Collapse sidebar and hide body scroll
            document.body.style.overflow = 'hidden';
            const sidebar = document.querySelector('.layout-sidebar');
            if (sidebar) {
                (sidebar as HTMLElement).style.display = 'none';
            }
        } else {
            // Restore sidebar and body scroll
            document.body.style.overflow = 'auto';
            const sidebar = document.querySelector('.layout-sidebar');
            if (sidebar) {
                (sidebar as HTMLElement).style.display = 'block';
            }
        }
        
        console.log('📄 New expanded state:', this.isTableExpanded);
    }

    // ==================== ACTIONS ====================

    refreshColors() {
        console.log('🔄 Refreshing colors...');
        this.loadDataFromBackend();
        this.messageService.add({
            severity: 'success',
            summary: 'Refreshed',
            detail: 'Colors refreshed from backend'
        });
    }

    overrideAndRun() {
        console.log('⚙️ Override & Run clicked');
        this.messageService.add({
            severity: 'info',
            summary: 'Manual Override',
            detail: 'Manual ranking override triggered'
        });
    }

    importSample() {
        console.log('📥 Import Sample clicked');
        window.location.href = '/color-type';
    }

    rulesAndPresets() {
        console.log('⚙️ Rules & Presets clicked');
        window.location.href = '/settings?section=rules';
    }

    restoreLastRun() {
        console.log('↩️ Restore last run clicked');
        this.messageService.add({
            severity: 'info',
            summary: 'Restore Last Run',
            detail: 'Restoring previous ranking results...'
        });
    }

    cronJobsAndTime() {
        console.log('⏰ Cron Jobs & Time clicked');
        window.location.href = '/settings?section=corn-jobs';
    }

    importViaExcel() {
        console.log('📥 Import ID via Excel clicked');
        window.location.href = '/manual-color';
    }

    fetchData() {
        console.log('📥 Fetching latest data...');
        this.loadDataFromBackend();
        this.messageService.add({
            severity: 'success',
            summary: 'Refreshed',
            detail: 'Data refreshed from backend'
        });
    }

    exportAll() {
        console.log('📤 Exporting data...');
        const dataToExport = this.selectedRows.length > 0 ? this.selectedRows : this.tableData;
        
        if (dataToExport.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Data',
                detail: 'No data to export'
            });
            return;
        }

        // Convert to CSV
        const csvContent = this.convertToCSV(dataToExport);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = this.selectedRows.length > 0 
            ? `marketpulse_selected_rows_${new Date().toISOString().split('T')[0]}.csv` 
            : `marketpulse_colors_${new Date().toISOString().split('T')[0]}.csv`;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: `${dataToExport.length} row(s) exported to CSV`
        });
    }

    /**
     * Convert table data to CSV format
     */
    private convertToCSV(data: any[]): string {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
        const csvRows = [];
        csvRows.push(headers.join(','));
        for (const row of data) {
            const values = headers.map((header) => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }

    // ==================== FILTERS ====================

    showFilterDialog() {
        this.filterVisible = true;
    }

    onFiltersApplied(filters: any) {
        console.log('✅ Filters applied:', filters);
        this.messageService.add({
            severity: 'success',
            summary: 'Filters Applied',
            detail: `${filters.conditions.length} filter(s) applied`
        });
        // Reload data with filters
        this.loadDataFromBackend();
    }

    removeAllFilters() {
        this.messageService.add({
            severity: 'info',
            summary: 'Filters Cleared',
            detail: 'All filters removed'
        });
        this.loadDataFromBackend();
    }

    // ==================== HELPERS ====================

    getExportButtonLabel(): string {
        return this.selectedRows.length > 0 
            ? `Export Selected (${this.selectedRows.length})` 
            : 'Export All';
    }
}