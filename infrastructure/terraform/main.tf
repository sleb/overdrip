terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "overdrip-ed767"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

# Log-based metric for registration code cleanup
resource "google_logging_metric" "registration_codes_deleted" {
  name   = "registration_codes_deleted"
  filter = <<-EOT
    resource.type="cloud_function"
    resource.labels.function_name="cleanupExpiredCodes"
    jsonPayload.metric="registration_codes_cleanup"
  EOT

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "DISTRIBUTION"
    unit         = "1"
    display_name = "Registration Codes Deleted"
  }

  bucket_options {
    linear_buckets {
      num_finite_buckets = 64
      width              = 1
      offset             = 0
    }
  }

  value_extractor = "EXTRACT(jsonPayload.deletedCount)"
}

# Dashboard for Overdrip metrics
resource "google_monitoring_dashboard" "overdrip_dashboard" {
  dashboard_json = jsonencode({
    displayName = "Overdrip Metrics"

    mosaicLayout = {
      columns = 12

      tiles = [
        # Registration codes deleted over time
        {
          width  = 6
          height = 4
          widget = {
            title = "Registration Codes Cleanup"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"logging.googleapis.com/user/registration_codes_deleted\""
                    aggregation = {
                      alignmentPeriod  = "86400s"
                      perSeriesAligner = "ALIGN_SUM"
                    }
                  }
                }
                plotType = "LINE"
              }]
              timeshiftDuration = "0s"
              yAxis = {
                label = "Codes Deleted"
                scale = "LINEAR"
              }
            }
          }
        },

        # Cloud Function execution count
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Function Executions"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"cloudfunctions.googleapis.com/function/execution_count\" resource.label.function_name=monitoring.regex.full_match(\"(createDevice|registerDevice|cleanupExpiredCodes)\")"
                    aggregation = {
                      alignmentPeriod  = "3600s"
                      perSeriesAligner = "ALIGN_RATE"
                      groupByFields    = ["resource.function_name"]
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },

        # Function error rate
        {
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Function Error Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"cloudfunctions.googleapis.com/function/execution_count\" resource.label.function_name=monitoring.regex.full_match(\"(createDevice|registerDevice|cleanupExpiredCodes)\") metric.label.status!=\\\"ok\\\""
                    aggregation = {
                      alignmentPeriod  = "3600s"
                      perSeriesAligner = "ALIGN_RATE"
                      groupByFields    = ["resource.function_name"]
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        },

        # Function execution time
        {
          xPos   = 6
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Function Execution Time (95th percentile)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"cloudfunctions.googleapis.com/function/execution_times\" resource.label.function_name=monitoring.regex.full_match(\"(createDevice|registerDevice|cleanupExpiredCodes)\")"
                    aggregation = {
                      alignmentPeriod    = "3600s"
                      perSeriesAligner   = "ALIGN_DELTA"
                      crossSeriesReducer = "REDUCE_PERCENTILE_95"
                      groupByFields      = ["resource.function_name"]
                    }
                  }
                }
                plotType = "LINE"
              }]
            }
          }
        }
      ]
    }
  })
}

# Alert policy for cleanup failures
resource "google_monitoring_alert_policy" "cleanup_failure" {
  display_name = "Registration Code Cleanup Failures"
  combiner     = "OR"

  conditions {
    display_name = "Cleanup function errors"

    condition_threshold {
      filter          = "resource.type=\"cloud_function\" resource.label.function_name=\"cleanupExpiredCodes\" metric.type=\"cloudfunctions.googleapis.com/function/execution_count\" metric.label.status!=\"ok\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [] # Add your notification channels here

  alert_strategy {
    auto_close = "86400s" # Auto-close after 24 hours
  }
}

output "dashboard_url" {
  description = "URL to view the Overdrip monitoring dashboard"
  value       = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.overdrip_dashboard.id}?project=${var.project_id}"
}
