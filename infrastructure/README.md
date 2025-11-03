# Overdrip Infrastructure as Code

This directory contains Terraform configurations for Google Cloud Platform monitoring resources.

## Setup

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply configuration
terraform apply
```

## Resources Created

### Log-Based Metric

**Name:** `registration_codes_deleted`
- **Type:** Counter (DELTA)
- **Source:** Cloud Function logs
- **Field:** `jsonPayload.deletedCount`
- **Filter:** Tracks the `cleanupExpiredCodes` function executions

### Monitoring Dashboard

**Name:** "Overdrip Metrics"

Four charts tracking Cloud Function performance:
1. **Registration codes cleanup** - Line chart showing codes deleted over time
2. **Function executions** - Execution rate by function name
3. **Function error rate** - Error rate by function name
4. **Function execution time** - 95th percentile latency by function name

### Alert Policy

**Name:** "Registration Code Cleanup Failures"
- Triggers when `cleanupExpiredCodes` function errors
- Auto-closes after 24 hours
- Notification channels can be configured in `main.tf`

## Viewing Metrics

After deployment, resources are available at:

- **Dashboard:** Output by `terraform apply` (or run `terraform output dashboard_url`)
- **Metrics Explorer:** https://console.cloud.google.com/monitoring/metrics-explorer
- **All Dashboards:** https://console.cloud.google.com/monitoring/dashboards
- **Logs:** https://console.cloud.google.com/logs

## Cleanup

To destroy all monitoring resources:

```bash
cd infrastructure/terraform
terraform destroy
```

## Cost

All resources created are within Google Cloud's free tier:

- Log-based metrics: **Free** (up to 50 metrics)
- Dashboards: **Free**
- Alert policies: **Free** (up to 100 policies)
- Logs ingestion: **Free** (first 50GB/month)

See [Google Cloud Pricing](https://cloud.google.com/stackdriver/pricing) for details.
