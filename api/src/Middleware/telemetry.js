/**
 * OpenTelemetry Middleware
 * 
 * @version 1.0.0
 * Distributed tracing and metrics for UBI CMS API
 */

const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricsExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

// tracing.js - Tracing middleware
let tracer;

function initTracing() {
    try {
        const sdk = new NodeSDK({
            serviceName: 'ubi-cms-api',
            traceExporter: new OTLPTraceExporter({
                url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
            }),
            instrumentations: [getNodeAutoInstrumentations()],
        });
        
        sdk.start();
        tracer = trace.getTracer('ubi-cms-api');
        console.log('OpenTelemetry tracing initialized');
    } catch (error) {
        console.error('Failed to initialize tracing:', error.message);
    }
}

// Request tracing middleware
function tracingMiddleware(req, res, next) {
    if (!tracer) {
        return next();
    }
    
    const span = tracer.startSpan(`${req.method} ${req.path}`, {
        kind: trace.SpanKind.SERVER,
        attributes: {
            'http.method': req.method,
            'http.url': req.url,
            'http.target': req.path,
            'http.host': req.headers.host,
            'http.scheme': 'http',
            'http.request.method': req.method,
            'http.response.status_code': res.statusCode,
            'user_agent.original': req.headers['user-agent'],
            'client.ip': req.ip,
        },
    });
    
    // Add custom attributes
    if (req.user) {
        span.setAttribute('user.id', req.user.userId);
        span.setAttribute('user.roles', JSON.stringify(req.user.roles));
    }
    
    // Track response
    const originalSend = res.send;
    res.send = function(data) {
        span.setAttribute('http.response.body.size', Buffer.byteLength(JSON.stringify(data)));
        span.setStatus({
            code: res.statusCode >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
            message: res.statusCode >= 400 ? 'Error' : undefined,
        });
        span.end();
        return originalSend.call(this, data);
    };
    
    // End span on close
    res.on('close', () => {
        if (span) {
            span.end();
        }
    });
    
    req.span = span;
    next();
}

// metrics.js - Metrics middleware
let meter;

function initMetrics() {
    try {
        meter = metrics.getMeter('ubi-cms-api');
        
        // Request counter
        meter.createCounter('http.requests.total', {
            description: 'Total HTTP requests',
            unit: 'requests',
        });
        
        // Response time histogram
        meter.createHistogram('http.response.time', {
            description: 'HTTP response time',
            unit: 'ms',
            boundaries: [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
        });
        
        // Active connections gauge
        meter.createUpDownCounter('http.connections.active', {
            description: 'Active HTTP connections',
            unit: 'connections',
        });
        
        console.log('OpenTelemetry metrics initialized');
    } catch (error) {
        console.error('Failed to initialize metrics:', error.message);
    }
}

// Metrics collection middleware
function metricsMiddleware(req, res, next) {
    if (!meter) {
        return next();
    }
    
    const startTime = Date.now();
    const counter = meter.getCounter('http.requests.total');
    const histogram = meter.getHistogram('http.response.time');
    const connections = meter.getUpDownCounter('http.connections.active');
    
    // Track connection
    connections.add(1);
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Record metrics
        counter.add(1, {
            'http.method': req.method,
            'http.target': req.path,
            'http.status_code': res.statusCode,
        });
        
        histogram.record(duration, {
            'http.method': req.method,
            'http.target': req.path,
        });
        
        // Update connection count
        connections.add(-1);
    });
    
    next();
}

// Log correlation middleware
function logCorrelation(req, res, next) {
    const traceId = req.span?.spanContext()?.traceId || '';
    const spanId = req.span?.spanContext()?.spanId || '';
    
    req.traceId = traceId;
    req.spanId = spanId;
    
    // Add to response headers for client-side correlation
    if (traceId) {
        res.set('X-Trace-ID', traceId);
        res.set('X-Span-ID', spanId);
    }
    
    next();
}

// Auto-initialize on module load (can be disabled)
if (process.env.OTEL_ENABLED !== 'false') {
    initTracing();
    initMetrics();
}

module.exports = {
    initTracing,
    initMetrics,
    tracingMiddleware,
    metricsMiddleware,
    logCorrelation,
    getTracer: () => tracer,
    getMeter: () => meter,
};