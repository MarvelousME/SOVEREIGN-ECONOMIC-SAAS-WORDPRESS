import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { config } from '../config';
import { logger } from '../logger';

export class TelemetryManager {
  private sdk: NodeSDK | null = null;

  /**
   * Initialize OpenTelemetry
   */
  initialize(): void {
    const telemetryConfig = config.getTelemetryConfig();

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: telemetryConfig.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: telemetryConfig.serviceVersion,
    });

    const traceExporter = new OTLPTraceExporter({
      url: `${telemetryConfig.otlpEndpoint}/v1/traces`,
    });

    const metricExporter = new OTLPMetricExporter({
      url: `${telemetryConfig.otlpEndpoint}/v1/metrics`,
    });

    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: telemetryConfig.metricInterval,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    this.sdk.start();
    logger.info('OpenTelemetry initialized', {
      serviceName: telemetryConfig.serviceName,
    });
  }

  /**
   * Shutdown telemetry
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      logger.info('OpenTelemetry shutdown complete');
    }
  }
}

export const telemetry = new TelemetryManager();
