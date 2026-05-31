/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DetectedAccount {
  id: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
  holder_name: string;
  status: 'suspected' | 'frozen' | 'cleared';
  risk_score: number;
  total_flow_idr: number;
  detected_at: string;
  reported_by: string;
}

export interface EnforcementLog {
  id: string;
  report_id: string;
  target_account: string;
  operator: string;
  nodes_blocked: number;
  total_flow_idr: number;
  ai_confidence: number;
  action_type: 'auto_block' | 'manual' | 'monitor';
  status: 'pending' | 'complete' | 'failed';
  created_at: string;
}

export interface TransactionFlow {
  id: string;
  source_account: string;
  dest_account: string;
  amount_idr: number;
  transfer_type: 'BI_FAST' | 'SKN' | 'RTGS' | 'Virtual_Account';
  flagged: boolean;
  pattern_match: string[];
  occurred_at: string;
}

export interface AIAnalysis {
  id: string;
  target_account: string;
  model_version: string;
  gambling_prob: number;
  layering_prob: number;
  structuring_prob: number;
  smurfing_prob: number;
  patterns: string[];
  analyzed_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  agency: 'OJK';
  operator_id: string;
  authority_level: 'Superintendent' | 'Operator' | 'Auditor';
  pin: string;
  created_at: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'db' | 'ai' | 'mtls';
  message: string;
}

export interface ExecutionStep {
  id: number;
  title: string;
  description: string;
  status: 'idle' | 'processing' | 'success' | 'failed';
  details?: string;
}
