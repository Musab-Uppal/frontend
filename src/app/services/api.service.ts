import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/enviornments/environment';
// ==================== COLOR INTERFACES ====================

// Backend ColorRaw model
export interface ColorRaw {
  message_id: number;
  ticker: string;
  sector: string;
  cusip: string;
  date: string;
  price_level: number;
  bid: number;
  ask: number;
  px: number;
  source: string;
  bias: string;
  rank: number;
  cov_price: number;
  percent_diff: number;
  price_diff: number;
  confidence: number;
  date_1: string;
  diff_status: string;
}

// Backend ColorProcessed model (with parent/child hierarchy)
export interface ColorProcessed extends ColorRaw {
  is_parent: boolean;
  parent_message_id?: number;
  children_count?: number;
  children?: ColorProcessed[];
}

// For frontend display (mapped from backend)
export interface ColorDisplay {
  rowNumber: string;
  messageId: string;
  ticker: string;
  sector: string;
  cusip: string;
  date: string;
  price_level: number;
  bid: number;
  ask: number;
  px: number;
  source: string;
  bias: string;
  rank: number;
  cov_price: number;
  percent_diff: number;
  price_diff: number;
  confidence: number;
  isParent: boolean;
  childrenCount?: number;
  parentMessageId?: string;
}

// ==================== DASHBOARD RESPONSES ====================

export interface MonthlyStats {
  month: string;
  year: number;
  total_colors: number;
  asset_class?: string;
}

export interface MonthlyStatsResponse {
  stats: MonthlyStats[];
}

export interface ColorResponse {
  total_count: number;
  page: number;
  page_size: number;
  colors: ColorProcessed[];
}

export interface NextRunResponse {
  next_run: string;
  next_run_timestamp: string;
  status: string;
}

export interface AvailableSectorsResponse {
  sectors: string[];
  count: number;
}

export interface OutputStats {
  automated_count: number;
  manual_count: number;
  parent_count: number;
  child_count: number;
  total_count: number;
}

// ==================== MANUAL UPLOAD RESPONSES ====================

export interface UploadResponse {
  success: boolean;
  filename: string;
  total_rows: number;
  valid_colors: number;
  errors_count: number;
  errors: string[];
  colors: ColorRaw[];
}

export interface ProcessResponse {
  success: boolean;
  input_count: number;
  processed_count: number;
  parents: number;
  children: number;
  message: string;
}

export interface ClearOutputResponse {
  success: boolean;
  message: string;
}

// ==================== ADMIN/COLUMN CONFIG ====================

export interface ColumnConfig {
  id?: number;
  oracle_name: string;
  display_name: string;
  data_type: string;
  required: boolean;
  description: string;
}

export interface ColumnsResponse {
  success: boolean;
  oracle_table: string;
  total_columns: number;
  columns: ColumnConfig[];
}

export interface SqlPreviewResponse {
  success: boolean;
  sql_query: string;
  column_count: number;
  oracle_table: string;
}

export interface OracleConfig {
  host: string;
  port: number;
  service_name: string;
  user: string;
  password: string;
}

export interface ConnectionInfo {
  success: boolean;
  using_oracle: boolean;
  oracle_table?: string;
  column_count?: number;
  connection_status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.baseURL;

  constructor(private http: HttpClient) {}

  // ==================== DASHBOARD ENDPOINTS ====================

  /**
   * Get monthly statistics for dashboard chart
   */
  getMonthlyStats(assetClass?: string): Observable<MonthlyStatsResponse> {
    let params = new HttpParams();
    if (assetClass) {
      params = params.set('asset_class', assetClass);
    }
    return this.http.get<MonthlyStatsResponse>(`${this.baseUrl}/api/dashboard/monthly-stats`, { params });
  }

  /**
   * Get colors with pagination and filtering
   */
  getColors(skip: number = 0, limit: number = 50, assetClass?: string): Observable<ColorResponse> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    
    if (assetClass) {
      params = params.set('asset_class', assetClass);
    }
    
    return this.http.get<ColorResponse>(`${this.baseUrl}/api/dashboard/colors`, { params });
  }

  /**
   * Get next run time for cron job
   */
  getNextRunTime(): Observable<NextRunResponse> {
    return this.http.get<NextRunResponse>(`${this.baseUrl}/api/dashboard/next-run`);
  }

  /**
   * Get available sectors/asset classes
   */
  getAvailableSectors(): Observable<AvailableSectorsResponse> {
    return this.http.get<AvailableSectorsResponse>(`${this.baseUrl}/api/dashboard/available-sectors`);
  }

  /**
   * Get output statistics
   */
  getOutputStats(): Observable<OutputStats> {
    return this.http.get<OutputStats>(`${this.baseUrl}/api/dashboard/output-stats`);
  }

  // ==================== MANUAL COLOR ENDPOINTS ====================

  /**
   * Upload Excel file for manual processing
   */
  uploadManualColors(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<UploadResponse>(`${this.baseUrl}/api/manual/upload-excel`, formData);
  }

  /**
   * Process manual colors through ranking engine
   */
  processManualColors(colors: ColorRaw[]): Observable<ProcessResponse> {
    return this.http.post<ProcessResponse>(`${this.baseUrl}/api/manual/process-manual-colors`, colors);
  }

  /**
   * Clear output file (WARNING: deletes all processed data)
   */
  clearOutputFile(): Observable<ClearOutputResponse> {
    return this.http.post<ClearOutputResponse>(`${this.baseUrl}/api/manual/clear-output`, {});
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all column configurations
   */
  getColumnConfig(): Observable<ColumnsResponse> {
    return this.http.get<ColumnsResponse>(`${this.baseUrl}/api/admin/columns`);
  }

  /**
   * Add new column configuration
   */
  addColumn(column: ColumnConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/admin/columns`, column);
  }

  /**
   * Update column configuration
   */
  updateColumn(columnId: number, updates: Partial<ColumnConfig>): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/admin/columns/${columnId}`, updates);
  }

  /**
   * Delete column configuration
   */
  deleteColumn(columnId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/admin/columns/${columnId}`);
  }

  /**
   * Update Oracle table name
   */
  updateOracleTable(tableName: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/admin/oracle-table`, { table_name: tableName });
  }

  /**
   * Preview SQL query
   */
  previewSqlQuery(whereClause?: string): Observable<SqlPreviewResponse> {
    let params = new HttpParams();
    if (whereClause) {
      params = params.set('where_clause', whereClause);
    }
    return this.http.get<SqlPreviewResponse>(`${this.baseUrl}/api/admin/sql-preview`, { params });
  }

  /**
   * Test Oracle connection
   */
  testOracleConnection(): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/admin/oracle/test-connection`, {});
  }

  /**
   * Enable Oracle mode
   */
  enableOracle(config: OracleConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/admin/oracle/enable`, config);
  }

  /**
   * Get connection information
   */
  getConnectionInfo(): Observable<ConnectionInfo> {
    return this.http.get<ConnectionInfo>(`${this.baseUrl}/api/admin/connection-info`);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Health check endpoint
   */
  healthCheck(): Observable<string> {
    return this.http.get(`${this.baseUrl}/health`, { responseType: 'text' });
  }

  /**
   * Get API version
   */
  getVersion(): Observable<string> {
    return this.http.get(`${this.baseUrl}/version`, { responseType: 'text' });
  }

  /**
   * Convert backend ColorProcessed to frontend ColorDisplay format
   */
  convertToDisplayFormat(color: ColorProcessed, index: number): ColorDisplay {
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
      isParent: color.is_parent,
      childrenCount: color.children_count || 0,
      parentMessageId: color.parent_message_id ? String(color.parent_message_id) : undefined
    };
  }

  /**
   * Convert frontend ColorDisplay back to backend ColorRaw format
   */
  convertToBackendFormat(color: ColorDisplay): ColorRaw {
    return {
      message_id: parseInt(color.messageId),
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
      date_1: color.date, // Using same date for date_1
      diff_status: ''
    };
  }
}