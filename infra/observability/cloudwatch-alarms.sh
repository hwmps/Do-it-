#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
FUNCTION_NAME="do-it-backend"

echo "Creating/updating Do-it production CloudWatch alarms..."

aws cloudwatch put-metric-alarm \
  --alarm-name "DoIt-Prod-Lambda-Errors" \
  --alarm-description "Production Lambda reported one or more execution errors within 5 minutes." \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --datapoints-to-alarm 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION" \
  --no-cli-pager

aws cloudwatch put-metric-alarm \
  --alarm-name "DoIt-Prod-Lambda-Throttles" \
  --alarm-description "Production Lambda was throttled at least once within 5 minutes." \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --datapoints-to-alarm 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION" \
  --no-cli-pager

aws cloudwatch put-metric-alarm \
  --alarm-name "DoIt-Prod-AI-Timeouts" \
  --alarm-description "Gemini recommendation timed out at least once within 5 minutes." \
  --namespace DoIt \
  --metric-name AIRequestTimeoutCount \
  --dimensions \
    Name=environment,Value=production \
    Name=service,Value=do-it-backend \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --datapoints-to-alarm 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION" \
  --no-cli-pager

echo "✅ CloudWatch alarms configured"
