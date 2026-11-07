export interface BaseTemplate {
  id: number;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
