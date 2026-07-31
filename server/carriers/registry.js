import { CarrierIntegrationError } from "./contract.js";
import { internalCarrierAdapter } from "./internal.js";

const adapters = new Map([[internalCarrierAdapter.code, internalCarrierAdapter]]);

export function getCarrierAdapter(code) {
  const adapter = adapters.get(code);
  if (adapter) {
    return adapter;
  }

  throw new CarrierIntegrationError(
    `${code} credentials and production adapter are not configured`,
    {
      code: "CARRIER_SETUP_REQUIRED",
      retryable: false,
    },
  );
}

export function listImplementedAdapters() {
  return [...adapters.keys()];
}

