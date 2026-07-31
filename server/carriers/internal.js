import { assertShipmentRequest } from "./contract.js";

export const internalCarrierAdapter = {
  code: "internal",
  capabilities: {
    createShipment: true,
    cancelShipment: true,
    rates: false,
    providerLabel: false,
    webhooks: false,
    trackingPolling: false,
    multiPackage: false,
    cod: true,
  },

  async createShipment(input) {
    assertShipmentRequest(input);

    const compactId = input.shipmentId.replaceAll("-", "").slice(0, 12).toUpperCase();
    return {
      externalShipmentId: `INT-${compactId}`,
      trackingCode: `ZINT${compactId}`,
      initialStatus: "registered",
      providerMetadata: { source: "internal-adapter" },
    };
  },
};

