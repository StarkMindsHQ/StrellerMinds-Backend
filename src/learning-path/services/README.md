# Advanced Reporting Module

## Overview
The Reports module provides a flexible system for defining, generating, visualizing, and scheduling reports. It allows users to create custom report templates based on various metrics and dimensions.

## Features

### 1. Custom Report Builder
- **Templates**: Define reports with specific metrics, dimensions, and filters.
- **Types**: Support for User Engagement, Financial, Course Performance, and System Health reports.
- **Visualization**: Configure how data should be displayed (Table, Bar Chart, Line Chart, Pie Chart).

### 2. Data Generation & Visualization
- **Data Fetching**: Aggregates data based on template configuration.
- **Visualization Ready**: Returns data formatted for frontend charting libraries (e.g., Chart.js).
- **Mock Data**: Currently simulates data sources for demonstration.

### 3. Export Capabilities
- **Formats**: Support for CSV and JSON exports.
- **Download**: Direct file download endpoints.

### 4. Scheduling
- **Frequency**: Schedule reports to run Daily, Weekly, or Monthly.
- **Recipients**: Define email recipients for generated reports.

## API Endpoints

- `POST /reports/templates` - Create a report template
- `GET /reports/templates` - List templates
- `POST /reports/templates/:id/generate` - Get JSON data for visualization
- `GET /reports/templates/:id/export?format=CSV` - Download report file
- `POST /reports/schedule` - Schedule a report

## Data Model

### ReportTemplate
Stores the definition of a report, including the configuration JSON blob that defines metrics and dimensions.

### ReportSchedule
Manages when reports should run and who receives them.

## Integration

Import `ReportsModule` in `AppModule`:

```typescript
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [ReportsModule, ...],
})
export class AppModule {}
```