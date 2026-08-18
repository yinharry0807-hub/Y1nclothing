export interface DocumentRow {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  original_text: string | null;
  storage_path: string | null;
  file_url: string | null;
  status: "parsed" | "vision_pending" | "failed";
  parse_error: string | null;
  source_path: string | null;
  upload_time: string;
  updated_at: string;
  created_by: string | null;
}

export interface StyleRow {
  id: string;
  style_no: string;
  style_name: string | null;
  customer_style_no: string | null;
  brand: string | null;
  customer: string | null;
  category: string | null;
  image_url: string | null;
  status: string;
  notes: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FabricRow {
  id: string;
  style_id: string;
  order_id: string | null;
  material_code: string | null;
  fabric_name: string;
  category: string | null;
  composition: string | null;
  weight: string | null;
  width: string | null;
  usage_per_piece: string | null;
  unit: string | null;
  unit_price: number | null;
  supplier: string | null;
  colorway: string | null;
  shrinkage_warp: string | null;
  shrinkage_weft: string | null;
  loss_rate: string | null;
  position: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessoryRow {
  id: string;
  style_id: string;
  order_id: string | null;
  material_code: string | null;
  accessory_name: string;
  category: string | null;
  spec: string | null;
  colorway: string | null;
  unit: string | null;
  usage_per_piece: string | null;
  quantity: number | null;
  received_qty: number | null;
  unit_price: number | null;
  supplier: string | null;
  source: string | null;
  order_date: string | null;
  expected_arrival: string | null;
  actual_arrival: string | null;
  tracking_status: "未下单" | "已下单" | "在途" | "已到货";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  order_no: string | null;
  po_no: string | null;
  style_id: string;
  style_no: string | null;
  fit: string | null;
  colorway: string | null;
  order_date: string | null;
  quantity: number | null;
  target_qty: number | null;
  actual_qty: number | null;
  unit_price: number | null;
  delivery_date: string | null;
  production_type: string | null;
  current_progress: string | null;
  risk_level: string | null;
  thread_info: string | null;
  fabric_summary: string | null;
  size_breakdown: Record<string, number> | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneRow {
  id: string;
  order_id: string;
  node_name: string;
  status: "已完成" | "进行中" | "待开始";
  planned_time: string | null;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PreproductionRow {
  id: string;
  style_id: string;
  sample_no: string | null;
  version: string | null;
  colorway: string | null;
  quantity: number | null;
  sample_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SampleOrderRow {
  id: string;
  style_id: string;
  sample_order_no: string | null;
  sample_type: string | null;
  colorway: string | null;
  quantity: number | null;
  sample_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiSummaryRow {
  id: string;
  document_id: string | null;
  style_id: string | null;
  summary_type: "document" | "style";
  summary_text: string | null;
  structured_data: Record<string, unknown> | null;
  original_text: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: number;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
}
