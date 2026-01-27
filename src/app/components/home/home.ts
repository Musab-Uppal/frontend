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
import { TabulatorTableComponent, TableConfig } from '../tabulator-table/tabulator-table.component';
import { TableStateService } from '../home/table-state.service';
import { ApiService } from '../../services/api.service';
import { StackedChartComponent } from '../stacked-chart/stacked-chart.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, TableModule, ChipModule, ButtonModule, InputTextModule, BadgeModule, DialogModule, StackedChartComponent, AutoCompleteModule, FormsModule, TooltipModule, TabulatorTableComponent],
    templateUrl: './home.html',
    styleUrls: ['./home.css']
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
    columnOptions = ['Bwic Cover', 'Ticker', 'CUSIP', 'Bias', 'Date', 'Source'];
    filteredColumnOptions: string[] = [];

    // Operator options for dropdown
    operatorOptions = ['Equal to', 'Not equal to', 'contains', 'Starts with', 'Ends with', 'is greater than', 'is less than'];
    filteredOperatorOptions: string[] = [];

    // Logical operators for subgroups
    logicalOperators = ['AND', 'OR'];

    // Chart data
    availableColorsChart: any;
    availableColorsOptions: any;

    // Table data - will be loaded from backend
    tableData: any[] = [];
    selectedRows: any[] = [];

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
        private apiService: ApiService
    ) {}

    ngOnInit() {
        console.log('🚀 Home component initialized - loading data from backend...');
        this.loadDataFromBackend();
        // Initialize filtered options with all options
        this.filteredColumnOptions = [...this.columnOptions];
        this.filteredOperatorOptions = [...this.operatorOptions];
    }

    private loadDataFromBackend() {
        console.log('📡 Fetching data from backend API...');

        // Load monthly stats for chart
        this.apiService.getMonthlyStats().subscribe({
            next: (response) => {
                console.log('✅ Monthly stats received:', response.stats.length, 'months');
                const data = response.stats.map((stat) => stat.count);
                const labels = response.stats.map((stat) => {
                    const date = new Date(stat.month);
                    return date.toLocaleDateString('en-US', { month: 'short' });
                });
                this.initChart(data, labels);
            },
            error: (error) => {
                console.error('❌ Error loading monthly stats:', error);
                console.log('Falling back to hardcoded chart data');
                this.initChart();
            }
        });

        // Load colors data for table
        this.apiService.getColors(0, 100).subscribe({
            next: (response) => {
                console.log('✅ Colors received from backend:', response.colors.length, 'total:', response.total_count);
                this.tableData = response.colors.map((color) => {
                    const price = color.price || 0;
                    return {
                        messageId: color.message_id,
                        tickerId: color.ticker,
                        cusip: color.cusip,
                        bias: this.formatBias(color.bias),
                        date: this.formatDate(color.date),
                        bid: price.toFixed(1),
                        mid: (price + 1).toFixed(1),
                        ask: (price + 2).toFixed(1),
                        source: color.source,
                        isParent: color.is_parent,
                        childrenCount: color.children_count || 0
                    };
                });
                console.log('✅ Loaded', this.tableData.length, 'colors from backend');
                console.log('Sample data:', this.tableData[0]);
            },
            error: (error) => {
                console.error('❌ Error loading colors from backend:', error);
                console.log('Error details:', error.message);
                console.log('Using fallback hardcoded data');
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

    private formatBias(bias: string): string {
        return bias.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    private formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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

    updateSubgroupLogicalOperator(subgroupId: number, operator: string) {
        console.log('🔄 Updating subgroup operator to:', operator);
        const subgroup = this.filterSubgroups.find((s) => s.id === subgroupId);
        if (subgroup) {
            subgroup.logicalOperator = operator;
        }
    }

    // ==================== FILTER ACTIONS ====================

    removeAllFilters() {
        console.log('🗑️ Removing all filters');
        this.filterConditions = [];
        this.filterSubgroups = [];
        this.addCondition();
    }

    applyFilters() {
        console.log('✅ Applying filters');
        const allFilters = {
            conditions: this.filterConditions,
            subgroups: this.filterSubgroups
        };
        console.log('📋 Complete filter structure:', allFilters);
        this.filterVisible = false;
        // TODO: Send filters to backend API
        // this.apiService.applyFilters(allFilters).subscribe(...)
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
        alert('Excel import feature - Upload file with Message IDs to filter');
    }

    refreshColors() {
        console.log('🔄 Refreshing colors...');
        this.loadDataFromBackend();
        alert('Colors refreshed! Loaded latest data from backend.');
    }

    overrideAndRun() {
        console.log('⚙️ Override & Run clicked');
        alert('Manual ranking override triggered. This will re-run the ranking engine.');
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
        alert('Restore last run: This will reload the previous ranking results.');
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
}