import { Injectable } from '@nestjs/common';

export interface VisualizationConfig {
  type: string;
  config: Record<string, any>;
}

@Injectable()
export class VisualizationService {
  async generateVisualizations(
    data: any,
    configuration: any,
  ): Promise<VisualizationConfig[]> {
    const visualizations: VisualizationConfig[] = [];

    if (data.timeSeriesData && data.timeSeriesData.length > 0) {
      visualizations.push(this.createLineChart(data.timeSeriesData));
    }

    if (data.summary) {
      visualizations.push(this.createSummaryCards(data.summary));
    }

    if (data.activityBreakdown) {
      visualizations.push(this.createPieChart(data.activityBreakdown));
    }

    if (data.revenueByGateway) {
      visualizations.push(this.createBarChart(data.revenueByGateway, 'Revenue by Gateway'));
    }

    if (data.topEngagedUsers) {
      visualizations.push(this.createTable(data.topEngagedUsers, 'Top Engaged Users'));
    }

    return visualizations;
  }

  private createLineChart(timeSeriesData: any[]): VisualizationConfig {
    return {
      type: 'line',
      config: {
        title: 'Trend Over Time',
        xAxis: {
          field: 'date',
          label: 'Date',
        },
        yAxis: {
          field: 'count',
          label: 'Count',
        },
        data: timeSeriesData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
              },
            },
            y: {
              beginAtZero: true,
            },
          },
        },
      },
    };
  }

  private createBarChart(data: Record<string, number>, title: string): VisualizationConfig {
    return {
      type: 'bar',
      config: {
        title,
        data: {
          labels: Object.keys(data),
          datasets: [
            {
              label: title,
              data: Object.values(data),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      },
    };
  }

  private createPieChart(data: Record<string, number>): VisualizationConfig {
    return {
      type: 'pie',
      config: {
        title: 'Distribution',
        data: {
          labels: Object.keys(data),
          datasets: [
            {
              data: Object.values(data),
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      },
    };
  }

  private createSummaryCards(summary: Record<string, any>): VisualizationConfig {
    return {
      type: 'cards',
      config: {
        title: 'Summary Metrics',
        cards: Object.entries(summary).map(([key, value]) => ({
          label: this.formatLabel(key),
          value: this.formatValue(value),
          key,
        })),
      },
    };
  }

  private createTable(data: any[], title: string): VisualizationConfig {
    return {
      type: 'table',
      config: {
        title,
        columns: Object.keys(data[0] || {}),
        data,
      },
    };
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private formatValue(value: any): string {
    if (typeof value === 'number') {
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
      return value.toLocaleString();
    }
    return String(value);
  }
}
