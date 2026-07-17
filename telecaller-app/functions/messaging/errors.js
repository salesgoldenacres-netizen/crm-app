class NotConnectedError extends Error {
  constructor(message = "WhatsApp provider is not connected") {
    super(message);
    this.name = "NotConnectedError";
    this.code = "not_connected";
  }
}

class UnsupportedCapabilityError extends Error {
  constructor(capability, message) {
    super(message || `Provider does not support: ${capability}`);
    this.name = "UnsupportedCapabilityError";
    this.code = "unsupported_capability";
    this.capability = capability;
  }
}

module.exports = {
  NotConnectedError,
  UnsupportedCapabilityError,
};
