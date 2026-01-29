import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule } from '@angular/common';
import { ApiService, MonthlyStats } from '../../services/api.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'stacked-chart',
    standalone: true,
    imports: [NgxEchartsDirective, CommonModule],
    templateUrl: './stacked-chart.component.html'
})
export class StackedChartComponent implements OnInit, OnDestroy {
    // 12 months × compact width → horizontal scroll
    chartWidth = 1152; // 12 * 96
    
    options: any = {};
    isLoading = true;
    hasError = false;
    private dataSubscription?: Subscription;

    constructor(private apiService: ApiService) {}

    ngOnInit() {
        this.loadMonthlyStats();
    }

    ngOnDestroy() {
        if (this.dataSubscription) {
            this.dataSubscription.unsubscribe();
        }
    }

    /**
     * Load monthly statistics from backend API
     */
    private loadMonthlyStats() {
        this.isLoading = true;
        this.hasError = false;

        this.dataSubscription = this.apiService.getMonthlyStats().subscribe({
            next: (response) => {
                console.log('📊 Monthly stats loaded for chart:', response.stats.length, 'months');
                this.processChartData(response.stats);
                this.isLoading = false;
            },
            error: (error) => {
                console.error('❌ Error loading monthly stats for chart:', error);
                this.hasError = true;
                this.isLoading = false;
                
                // Fallback to mock data
                this.useMockData();
            }
        });
    }

    /**
     * Process backend data for ECharts
     */
    private processChartData(stats: MonthlyStats[]) {
        if (!stats || stats.length === 0) {
            this.useMockData();
            return;
        }

        // Sort by date (oldest to newest)
        const sortedStats = [...stats].sort((a, b) => {
            return new Date(a.month).getTime() - new Date(b.month).getTime();
        });

        // Get last 12 months
        const recentStats = sortedStats.slice(-12);
        
        // Extract labels and data
        const months = recentStats.map(stat => {
            const date = new Date(stat.month);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
        
        // Normalize data for stacked chart (each bar total should be 4 for visualization)
        const totalColors = recentStats.map(stat => stat.total_colors);
        const maxValue = Math.max(...totalColors);
        const normalizedData = totalColors.map(value => 
            maxValue > 0 ? (value / maxValue) * 4 : 0
        );

        // Update chart width based on number of months
        this.chartWidth = months.length * 96;

        // Create stacked data for visualization
        // We'll create 4 segments per bar for the stacked effect
        const segment1 = normalizedData.map(value => Math.min(value, 1));
        const segment2 = normalizedData.map(value => Math.min(Math.max(value - 1, 0), 1));
        const segment3 = normalizedData.map(value => Math.min(Math.max(value - 2, 0), 1));
        const segment4 = normalizedData.map(value => Math.max(value - 3, 0));

        this.options = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                borderColor: '#1f2937',
                textStyle: {
                    color: '#ffffff'
                },
                formatter: (params: any[]) => {
                    const statIndex = params[0].dataIndex;
                    const stat = recentStats[statIndex];
                    const total = stat.total_colors;
                    const month = months[statIndex];
                    
                    let tooltip = `<div style="font-weight: 600; margin-bottom: 4px;">${month}</div>`;
                    tooltip += `<div>Total Colors: <strong>${total.toLocaleString()}</strong></div>`;
                    
                    if (stat.asset_class) {
                        tooltip += `<div>Sector: ${stat.asset_class}</div>`;
                    }
                    
                    return tooltip;
                }
            },
            grid: {
                left: 24,
                right: 24,
                top: 36,
                bottom: 32,
                height: 96
            },
            xAxis: {
                type: 'category',
                data: months,
                axisLine: { 
                    show: false 
                },
                axisTick: { 
                    show: false 
                },
                axisLabel: {
                    color: '#6B7280',
                    fontSize: 12,
                    margin: 14
                }
            },
            yAxis: {
                show: false,
                max: 4,
                type: 'value'
            },
            series: [
                this.createSegment('#334155', segment1, [2, 2, 0, 0]),  // Darkest blue (bottom)
                this.createSegment('#475569', segment2),               // Blue
                this.createSegment('#64748B', segment3),               // Medium blue
                this.createSegment('#94A3B8', segment4, [0, 0, 2, 2])  // Light blue (top)
            ]
        };
    }

    /**
     * Create a chart segment (bar stack)
     */
    private createSegment(color: string, data: number[], radius: number[] = [0, 0, 0, 0]) {
        return {
            type: 'bar',
            stack: 'total',
            barWidth: 58,
            barCategoryGap: '55%',
            data: data,
            itemStyle: {
                color: color,
                borderRadius: radius,
                borderColor: '#f3f4f6',
                borderWidth: 2
            },
            label: {
                show: false
            }
        };
    }

    /**
     * Use mock data when API fails
     */
    private useMockData() {
        console.log('📊 Using mock data for chart');
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Mock data values (normalized to 0-4 scale)
        const mockData = [2, 3.5, 1.8, 2.5, 3, 2.2, 3.8, 2.7, 3.2, 2.9, 3.5, 2.4];
        
        // Create segments from mock data
        const segment1 = mockData.map(value => Math.min(value, 1));
        const segment2 = mockData.map(value => Math.min(Math.max(value - 1, 0), 1));
        const segment3 = mockData.map(value => Math.min(Math.max(value - 2, 0), 1));
        const segment4 = mockData.map(value => Math.max(value - 3, 0));

        this.options = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                borderColor: '#1f2937',
                textStyle: {
                    color: '#ffffff'
                },
                formatter: (params: any[]) => {
                    const index = params[0].dataIndex;
                    const month = months[index];
                    const total = Math.round(mockData[index] * 625); // Convert back to approximate count
                    
                    return `<div style="font-weight: 600; margin-bottom: 4px;">${month}</div>
                            <div>Mock Data: <strong>~${total.toLocaleString()} colors</strong></div>
                            <div><em>Using sample data (API unavailable)</em></div>`;
                }
            },
            grid: {
                left: 24,
                right: 24,
                top: 36,
                bottom: 32,
                height: 96
            },
            xAxis: {
                type: 'category',
                data: months,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#6B7280',
                    fontSize: 12,
                    margin: 14
                }
            },
            yAxis: {
                show: false,
                max: 4,
                type: 'value'
            },
            series: [
                this.createSegment('#334155', segment1, [2, 2, 0, 0]),
                this.createSegment('#475569', segment2),
                this.createSegment('#64748B', segment3),
                this.createSegment('#94A3B8', segment4, [0, 0, 2, 2])
            ]
        };
    }

    /**
     * Refresh chart data
     */
    refreshChart() {
        this.loadMonthlyStats();
    }
}