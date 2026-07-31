export const canonicalShipmentStatuses = new Set([
  "draft",
  "registration_pending",
  "registered",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "exception",
  "returned",
  "cancelled",
]);

export class CarrierIntegrationError extends Error {
  constructor(message, { code = "CARRIER_ERROR", retryable = false } = {}) {
    super(message);
    this.name = "CarrierIntegrationError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function assertShipmentRequest(input) {
  if (!input?.shipmentId || !input?.merchantOrderId || !input?.serviceCode) {
    throw new CarrierIntegrationError("Canonical shipment request is incomplete", {
      code: "SHIPMENT_VALIDATION_FAILED",
    });
  }
}

