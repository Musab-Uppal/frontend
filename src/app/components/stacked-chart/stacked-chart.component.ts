import { Component } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
    selector: 'stacked-chart',
    standalone: true,
    imports: [NgxEchartsDirective],
    templateUrl: './stacked-chart.component.html'
})
export class StackedChartComponent {
    readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // 12 months × compact width → horizontal scroll
    readonly chartWidth = this.months.length * 96;

    options = {
        grid: {
            left: 24,
            right: 24,
            top: 36,
            bottom: 32,
            height: 96
        },

        xAxis: {
            type: 'category',
            data: this.months,
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
            max: 4
        },

        series: [this.block('#334155', [2, 2, 0, 0]), this.block('#475569'), this.block('#64748B'), this.block('#94A3B8', [0, 0, 2, 2], true)]
    };

    private block(color: string, radius: number[] = [0, 0, 0, 0], showLabel = false) {
        return {
            type: 'bar',
            stack: 'total',
            barWidth: 58, // ✅ thinner bars
            barCategoryGap: '55%', // ✅ horizontal spacing
            data: Array(12).fill(1),
            itemStyle: {
                color,
                borderRadius: radius,
                borderColor: '#f3f4f6', // ✅ bg-gray-100
                borderWidth: 2 // ✅ creates vertical gap illusion
            },
            label: showLabel
                ? {
                      show: true,
                      position: 'top',
                      distance: 8,
                      formatter: '2.1K',
                      color: '#6B7280',
                      fontSize: 12,
                      fontWeight: 500
                  }
                : undefined
        };
    }
}
