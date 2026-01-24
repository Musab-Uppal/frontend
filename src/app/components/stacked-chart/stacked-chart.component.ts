import { Component } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
    selector: 'stacked-chart',
    standalone: true,
    imports: [NgxEchartsDirective],
    templateUrl: 'stacked-chart.component.html'
})
export class StackedChartComponent {
    readonly options = {
        grid: {
            left: 24,
            right: 24,
            top: 32, // ⬆ more top padding
            bottom: 32 // ⬆ more bottom padding
        },

        xAxis: {
            type: 'category',
            data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#6B7280',
                fontSize: 12
            }
        },

        yAxis: {
            show: false
        },

        series: [
            // block 1 (darkest)
            {
                type: 'bar',
                stack: 'total',
                barWidth: 64, // ⬇ thinner bars
                barGap: '1%', // ⬆ more space between bars
                data: Array(11).fill(1),
                itemStyle: {
                    color: '#334155',
                    borderRadius: [6, 6, 0, 0]
                }
            },

            // block 2
            {
                type: 'bar',
                stack: 'total',
                data: Array(11).fill(1),
                itemStyle: {
                    color: '#475569'
                }
            },

            // block 3
            {
                type: 'bar',
                stack: 'total',
                data: Array(11).fill(1),
                itemStyle: {
                    color: '#64748B'
                }
            },

            // block 4 (top, with label)
            {
                type: 'bar',
                stack: 'total',
                data: Array(11).fill(1),
                itemStyle: {
                    color: '#94A3B8',
                    borderRadius: [0, 0, 6, 6]
                },
                label: {
                    show: true,
                    position: 'top', // ✅ ON TOP
                    rotate: 0, // ✅ NOT SIDEWAYS
                    distance: 6,
                    formatter: (_: any, index: number) => (index % 2 === 0 ? '1.2K' : '2.1K'),
                    color: '#6B7280',
                    fontSize: 12,
                    fontWeight: 500
                }
            }
        ]
    };
}
