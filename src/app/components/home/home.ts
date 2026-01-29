import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabulatorTableComponent, TableConfig } from '../tabulator-table/tabulator-table.component';
import { TableStateService } from '../home/table-state.service';
import { ApiService, ColorProcessed, ColorDisplay, MonthlyStats, OutputStats } from '../../services/api.service';
import { StackedChartComponent } from '../stacked-chart/stacked-chart.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule, CardModule, ChartModule, TableModule, ChipModule, 
        ButtonModule, InputTextModule, BadgeModule, DialogModule, 
        StackedChartComponent, AutoCompleteModule, FormsModule, 
        TooltipModule, TabulatorTableComponent, ToastModule
    ],
    templateUrl: './home.html',
    styleUrls: ['./home.css'],
    providers: [MessageService]
})
export class Home implements OnInit {
    nextRunTimer = '7H:52M:25S';
    filterVisible: boolean = false;
    isTableExpanded: boolean = false;

    // Filter data - MAIN conditions
    filterConditions: any[] = [{ column: 'Bwic Cover', operator: 'Equal to', values: 'JPMO', logicalOperator: 'AND' }];

    // Filter data - SUBGROUPS (for nested filtering)
    filterSubgroups: any[] = [];

    // Column options for dropdown
    columnOptions = ['Bwic Cover', 'Ticker', 'CUSIP', 'Bias', 'Date', 'Source', 'Sector', 'Rank', 'Price'];
    filteredColumnOptions: string[] = [];

    // Operator options for dropdown
    operatorOptions = ['Equal to', 'Not equal to', 'contains', 'Starts with', 'Ends with', 'is greater than', 'is less than'];
    filteredOperatorOptions: string[] = [];

    // Chart data
    availableColorsChart: any;
    availableColorsOptions: any;

    // Table data - will be loaded from backend
    tableData: ColorDisplay[] = [];
    selectedRows: any[] = [];

    // Available sectors for filtering
    availableSectors: string[] = [];
    selectedSector: string | null = null;

    // Output statistics
    outputStats: OutputStats | null = null;

    // Tabulator configuration
    tabulatorConfig: TableConfig = {
        title: 'Market Pulse Data',
        editable: false,
        allowImport: true,
        allowExport: true,
        allowS3Fetch: true,
        pagination: true,
        paginationSize: 20,
        selectable: true,
        movableColumns: true,
        headerFilter: false
    };

    constructor(
        private tableStateService: TableStateService,
        private apiService: ApiService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        console.log('🚀 Home component initialized - loading data from backend...');
        this.loadDataFromBackend();
        this.loadAvailableSectors();
        this.loadOutputStats();
        
        // Initialize filtered options with all options
        this.filteredColumnOptions = [...this.columnOptions];
        this.filteredOperatorOptions = [...this.operatorOptions];
    }

    private loadDataFromBackend() {
        console.log('📡 Fetching data from backend API...');

        // Load monthly stats for chart
        this.apiService.getMonthlyStats(this.selectedSector || undefined).subscribe({
            next: (response) => {
                console.log('✅ Monthly stats received:', response.stats.length, 'months');
                const data = response.stats.map((stat: MonthlyStats) => stat.total_colors);
                const labels = response.stats.map((stat: MonthlyStats) => {
                    const date = new Date(stat.month);
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                });
                this.initChart(data, labels);
            },
            error: (error) => {
                console.error('❌ Error loading monthly stats:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load monthly statistics'
                });
                this.initChart();
            }
        });

        // Load colors data for table
        this.apiService.getColors(0, 100, this.selectedSector || undefined).subscribe({
            next: (response) => {
                console.log('✅ Colors received from backend:', response.colors.length, 'total:', response.total_count);
                
                // Convert backend format to frontend display format
                this.tableData = response.colors.map((color: ColorProcessed, index: number) => {
                    return this.apiService.convertToDisplayFormat(color, index);
                });
                
                console.log('✅ Loaded', this.tableData.length, 'colors from backend');
                console.log('Sample data:', this.tableData[0]);
            },
            error: (error) => {
                console.error('❌ Error loading colors from backend:', error);
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
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: 'Could not load next run schedule'
                });
            }
        });
    }

    private loadAvailableSectors() {
        this.apiService.getAvailableSectors().subscribe({
            next: (response) => {
                this.availableSectors = response.sectors;
                console.log('✅ Available sectors loaded:', this.availableSectors);
            },
            error: (error) => {
                console.error('❌ Error loading sectors:', error);
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: 'Could not load available sectors'
                });
            }
        });
    }

    private loadOutputStats() {
        this.apiService.getOutputStats().subscribe({
            next: (stats) => {
                this.outputStats = stats;
                console.log('✅ Output stats loaded:', stats);
            },
            error: (error) => {
                console.error('❌ Error loading output stats:', error);
            }
        });
    }

    private initChart(data?: number[], labels?: string[]) {
        const chartData = data || [1200, 2100, 1200, 2100, 1200, 2100, 1200, 2100, 1200, 2100, 1200, 2100];
        const chartLabels = labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        this.availableColorsChart = {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Colors',
                    data: chartData,
                    backgroundColor: () => {
                        const gradients = [];
                        for (let i = 0; i < chartData.length; i++) {
                            gradients.push('#6B7280');
                        }
                        return gradients;
                    },
                    borderRadius: 6,
                    barThickness: 28,
                    categoryPercentage: 0.8,
                    barPercentage: 0.9,
                    borderWidth: 0
                }
            ]
        };

        this.availableColorsOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#111827',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (context: any) => {
                            const value = context.parsed.y;
                            return value >= 1000 ? `${(value / 1000).toFixed(1)}k Colors` : `${value} Colors`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: '#6B7280',
                        font: { size: 12 }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 2500,
                    grid: {
                        color: '#E5E7EB',
                        drawTicks: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9CA3AF',
                        font: { size: 12 },
                        padding: 12,
                        stepSize: 500,
                        callback: (value: number) => (value >= 1000 ? `${value / 1000}k` : value)
                    }
                }
            },
            elements: {
                bar: {
                    borderRadius: 12,
                    borderSkipped: false
                }
            },
            layout: {
                padding: {
                    top: 8,
                    left: 6,
                    right: 6,
                    bottom: 0
                }
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            }
        };
    }

    // ==================== SECTOR FILTERING ====================

    onSectorChange(sector: string | null) {
        this.selectedSector = sector;
        console.log('🔍 Filtering by sector:', sector);
        this.loadDataFromBackend();
    }

    clearSectorFilter() {
        this.selectedSector = null;
        this.loadDataFromBackend();
    }

    // ==================== FILTER SEARCH METHODS ====================

    searchColumn(event: any) {
        console.log('🔍 Searching columns:', event.query);
        const query = event.query.toLowerCase();
        this.filteredColumnOptions = this.columnOptions.filter((option) => option.toLowerCase().includes(query));
        console.log('📊 Filtered columns:', this.filteredColumnOptions);
    }

    searchOperator(event: any) {
        console.log('🔍 Searching operators:', event.query);
        const query = event.query.toLowerCase();
        this.filteredOperatorOptions = this.operatorOptions.filter((option) => option.toLowerCase().includes(query));
        console.log('📊 Filtered operators:', this.filteredOperatorOptions);
    }

    // ==================== FILTER DIALOG METHODS ====================

    showFilterDialog() {
        this.filterVisible = true;
    }

    // ==================== MAIN CONDITIONS ====================

    addCondition() {
        console.log('➕ Adding new condition');
        this.filterConditions.push({ column: '', operator: '', values: '', logicalOperator: 'AND' });
    }

    removeCondition(index: number) {
        console.log('🗑️ Removing condition at index:', index);
        this.filterConditions.splice(index, 1);
        if (this.filterConditions.length === 0) {
            this.addCondition();
        }
    }

    // ==================== SUBGROUPS ====================

    addSubgroup() {
        console.log('✅ Adding new subgroup');
        this.filterSubgroups.push({
            id: Date.now(),
            logicalOperator: 'AND',
            conditions: [{ column: '', operator: '', values: '', logicalOperator: 'AND' }]
        });
    }

    removeSubgroup(subgroupId: number) {
        console.log('🗑️ Removing subgroup with id:', subgroupId);
        const index = this.filterSubgroups.findIndex((s) => s.id === subgroupId);
        if (index > -1) {
            this.filterSubgroups.splice(index, 1);
        }
    }

    addSubgroupCondition(subgroupId: number) {
        console.log('➕ Adding condition to subgroup:', subgroupId);
        const subgroup = this.filterSubgroups.find((s) => s.id === subgroupId);
        if (subgroup) {
            subgroup.conditions.push({ column: '', operator: '', values: '', logicalOperator: 'AND' });
        }
    }

    removeSubgroupCondition(subgroupId: number, conditionIndex: number) {
        console.log('🗑️ Removing condition at index:', conditionIndex, 'from subgroup:', subgroupId);
        const subgroup = this.filterSubgroups.find((s) => s.id === subgroupId);
        if (subgroup) {
            subgroup.conditions.splice(conditionIndex, 1);
            if (subgroup.conditions.length === 0) {
                this.removeSubgroup(subgroupId);
            }
        }
    }

    // ==================== FILTER ACTIONS ====================

    removeAllFilters() {
        console.log('🗑️ Removing all filters');
        this.filterConditions = [];
        this.filterSubgroups = [];
        this.addCondition();
        this.clearSectorFilter();
    }

    applyFilters() {
        console.log('✅ Applying filters');
        const allFilters = {
            conditions: this.filterConditions,
            subgroups: this.filterSubgroups,
            sector: this.selectedSector
        };
        console.log('📋 Complete filter structure:', allFilters);
        this.filterVisible = false;
        
        // Reload data with filters
        this.loadDataFromBackend();
    }

    // ==================== TABULATOR TABLE METHODS ====================

    onTableDataChanged(updatedData: any[]) {
        console.log('📊 Tabulator data changed:', updatedData.length, 'rows');
        // Handle data changes from editable table
    }

    onTableDataLoaded(loadedData: any[]) {
        console.log('📥 Tabulator data loaded:', loadedData.length, 'rows');
        this.tableData = loadedData;
    }

    onTableRowSelected(selectedRows: any[]) {
        console.log('✅ Tabulator rows selected:', selectedRows.length);
        this.selectedRows = selectedRows;
    }

    onTableExpandToggled(isExpanded: boolean) {
        console.log('🔄 Table expand toggled:', isExpanded);
        this.isTableExpanded = isExpanded;
        this.tableStateService.setTableExpanded(isExpanded);
    }

    // ==================== TABLE ACTIONS ====================

    toggleTableExpansion() {
        console.log('🔄 Toggling table expansion');
        this.isTableExpanded = !this.isTableExpanded;
        this.tableStateService.setTableExpanded(this.isTableExpanded);
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
        console.log('✅ Export completed');
        
        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: `${dataToExport.length} row(s) exported to CSV`
        });
    }

    private convertToCSV(data: any[]): string {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
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

    importViaExcel() {
        console.log('📥 Import ID via Excel clicked');
        // Redirect to manual color page for Excel import
        window.location.href = '/manual-color';
    }

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
        // TODO: Implement manual override API call
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
        // TODO: Implement restore last run functionality
    }

    cronJobsAndTime() {
        console.log('⏰ Cron Jobs & Time clicked');
        window.location.href = '/settings?section=corn-jobs';
    }

    getExportButtonLabel(): string {
        return this.selectedRows.length > 0 
            ? `Export Selected (${this.selectedRows.length})` 
            : 'Export All';
    }

    // ==================== OUTPUT STATS DISPLAY ====================

    getProcessedCount(): number {
        return this.outputStats?.total_count || 0;
    }

    getAutomatedCount(): number {
        return this.outputStats?.automated_count || 0;
    }

    getManualCount(): number {
        return this.outputStats?.manual_count || 0;
    }
}