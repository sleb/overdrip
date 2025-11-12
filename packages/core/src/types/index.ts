/**
 * Minimal type definitions for Overdrip device SDK
 * These are lightweight stubs that will be expanded as we implement each system
 */

// ============================================================================
// SENSOR DATA TYPES (Minimal stubs)
// ============================================================================

export interface SensorReading {
  deviceId: string;
  sensorType: 'moisture' | 'temperature' | 'humidity' | 'light' | 'water_level';
  value: number;
  unit: string;
  timestamp: Date;
  location?: string; // For multi-probe setups
  metadata?: Record<string, any>;
}

// ============================================================================
// DEVICE STATUS TYPES (Minimal stubs)
// ============================================================================

export interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  uptime?: number; // seconds
  lastSeen: Date;
  version?: string;
  metadata?: Record<string, any>;
}

export interface DeviceHealth {
  deviceId: string;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  temperature?: number;
  connectivity?: 'good' | 'poor' | 'disconnected';
  lastCheck: Date;
}

// ============================================================================
// COMMAND TYPES (Minimal stubs)
// ============================================================================

export interface DeviceCommand {
  id: string;
  type: 'water_now' | 'update_config' | 'restart' | 'calibrate_sensor';
  parameters?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  completedAt: Date;
}

// ============================================================================
// CONFIGURATION TYPES (Minimal stubs)
// ============================================================================

export interface DeviceConfig {
  deviceId: string;
  name: string;
  version?: number;
  lastUpdated?: Date;
  // TODO: Add specific config sections as we implement them
  sensors?: Record<string, any>;
  watering?: Record<string, any>;
  telemetry?: Record<string, any>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface DeviceError {
  deviceId: string;
  type: 'sensor_error' | 'actuator_error' | 'network_error' | 'system_error';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// CLIENT OPTIONS
// ============================================================================

export interface DeviceClientOptions {
  authCode?: string;
  deviceId?: string;
  deviceName?: string;
  functionsUrl?: string;
}
