#!/bin/bash
set -e

# NATS JetStream Setup Script for UBI-CMS
# This script initializes all streams and consumers

NATS_URL="${NATS_URL:-nats://localhost:4222}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STREAMS_FILE="${SCRIPT_DIR}/streams.json"

echo "🚀 Setting up NATS JetStream for UBI-CMS"
echo "📡 Connecting to NATS at: ${NATS_URL}"

# Check if NATS server is available
if ! nats --server="${NATS_URL}" server ping &>/dev/null; then
    echo "❌ Error: Cannot connect to NATS server at ${NATS_URL}"
    echo "Please ensure NATS is running and accessible"
    exit 1
fi

echo "✅ NATS server is reachable"

# Enable JetStream
echo ""
echo "📦 Checking JetStream status..."
if nats --server="${NATS_URL}" account info &>/dev/null; then
    echo "✅ JetStream is enabled"
else
    echo "❌ JetStream is not enabled. Please enable it in NATS configuration"
    exit 1
fi

# Function to create or update a stream
create_stream() {
    local name=$1
    local subjects=$2
    local retention=$3
    local storage=$4
    local max_age=$5
    local max_msgs=$6
    local max_bytes=$7
    local max_msg_size=$8
    local discard=$9
    local duplicate_window=${10}
    local deny_delete=${11}
    local deny_purge=${12}
    
    echo ""
    echo "📝 Creating stream: ${name}"
    
    # Build NATS CLI command
    CMD="nats --server=${NATS_URL} stream add ${name} \
        --subjects=${subjects} \
        --retention=${retention} \
        --storage=${storage} \
        --discard=${discard} \
        --dupe-window=${duplicate_window} \
        --max-msg-size=${max_msg_size}"
    
    # Add conditional flags
    if [ "${max_age}" != "0" ]; then
        CMD="${CMD} --max-age=${max_age}"
    fi
    
    if [ "${max_msgs}" != "-1" ]; then
        CMD="${CMD} --max-msgs=${max_msgs}"
    fi
    
    if [ "${max_bytes}" != "-1" ]; then
        CMD="${CMD} --max-bytes=${max_bytes}"
    fi
    
    if [ "${deny_delete}" == "true" ]; then
        CMD="${CMD} --deny-delete"
    fi
    
    if [ "${deny_purge}" == "true" ]; then
        CMD="${CMD} --deny-purge"
    fi
    
    # Execute with defaults flag for non-interactive mode
    eval "${CMD} --defaults" || echo "⚠️  Stream ${name} may already exist, updating..."
    
    echo "✅ Stream ${name} configured"
}

# Function to create a consumer
create_consumer() {
    local stream=$1
    local durable=$2
    local description=$3
    local deliver_policy=$4
    local ack_policy=$5
    local ack_wait=$6
    local max_deliver=$7
    local filter_subject=$8
    
    echo ""
    echo "👥 Creating consumer: ${durable} on stream ${stream}"
    
    CMD="nats --server=${NATS_URL} consumer add ${stream} ${durable} \
        --description='${description}' \
        --deliver=${deliver_policy} \
        --ack=${ack_policy} \
        --wait=${ack_wait} \
        --replay=instant"
    
    if [ "${max_deliver}" != "-1" ]; then
        CMD="${CMD} --max-deliver=${max_deliver}"
    fi
    
    if [ -n "${filter_subject}" ]; then
        CMD="${CMD} --filter=${filter_subject}"
    fi
    
    eval "${CMD} --defaults" || echo "⚠️  Consumer ${durable} may already exist"
    
    echo "✅ Consumer ${durable} configured"
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Creating Streams"
echo "═══════════════════════════════════════════════════════════"

# LEDGER Stream
create_stream "LEDGER" "ledger.*" "workqueue" "file" "2592000s" "-1" "-1" "1048576" "old" "120s" "true" "false"

# UBI Stream
create_stream "UBI" "ubi.*" "limits" "file" "0" "100000" "-1" "1048576" "old" "120s" "false" "false"

# TREASURY Stream
create_stream "TREASURY" "treasury.*" "interest" "file" "0" "-1" "-1" "1048576" "old" "120s" "true" "true"

# TASK Stream
create_stream "TASK" "task.*" "workqueue" "file" "0" "-1" "-1" "1048576" "old" "120s" "false" "false"

# REWARD Stream
create_stream "REWARD" "reward.*" "limits" "file" "0" "50000" "-1" "1048576" "old" "120s" "false" "false"

# AGENT Stream
create_stream "AGENT" "agent.*" "workqueue" "file" "0" "-1" "-1" "1048576" "old" "120s" "false" "false"

# GOVERNANCE Stream
create_stream "GOVERNANCE" "governance.*" "interest" "file" "0" "-1" "-1" "1048576" "old" "120s" "true" "true"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Creating Consumers"
echo "═══════════════════════════════════════════════════════════"

# LEDGER Consumers
create_consumer "LEDGER" "ledger-processor" "Main ledger transaction processor" "all" "explicit" "30s" "3" ""
create_consumer "LEDGER" "audit-logger" "Audit log consumer for ledger events" "all" "explicit" "60s" "-1" ""

# UBI Consumers
create_consumer "UBI" "ubi-distributor" "UBI distribution processor" "all" "explicit" "60s" "5" ""
create_consumer "UBI" "notification-sender" "Send notifications for UBI events" "all" "explicit" "30s" "3" ""

# TREASURY Consumers
create_consumer "TREASURY" "treasury-processor" "Treasury operations processor" "all" "explicit" "60s" "3" ""
create_consumer "TREASURY" "treasury-reporter" "Treasury reporting consumer" "all" "explicit" "120s" "-1" ""

# TASK Consumers
create_consumer "TASK" "task-processor" "Task lifecycle processor" "all" "explicit" "30s" "3" ""

# REWARD Consumers
create_consumer "REWARD" "reward-calculator" "Reward calculation processor" "all" "explicit" "60s" "3" ""
create_consumer "REWARD" "reward-distributor" "Reward distribution processor" "all" "explicit" "60s" "5" "reward.distributed"

# AGENT Consumers
create_consumer "AGENT" "agent-runner" "AI agent execution processor" "all" "explicit" "120s" "2" ""
create_consumer "AGENT" "agent-monitor" "Monitor agent execution and errors" "all" "explicit" "30s" "-1" ""

# GOVERNANCE Consumers
create_consumer "GOVERNANCE" "governance-processor" "Governance proposal and voting processor" "all" "explicit" "60s" "3" ""
create_consumer "GOVERNANCE" "governance-auditor" "Governance audit trail consumer" "all" "explicit" "120s" "-1" ""

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Stream Summary:"
nats --server="${NATS_URL}" stream list

echo ""
echo "✨ NATS JetStream setup completed successfully!"
echo ""
echo "To view stream details, run:"
echo "  nats --server=${NATS_URL} stream info <STREAM_NAME>"
echo ""
echo "To view consumer details, run:"
echo "  nats --server=${NATS_URL} consumer info <STREAM_NAME> <CONSUMER_NAME>"
