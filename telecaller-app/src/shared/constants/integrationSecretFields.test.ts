import { describe, it, expect } from "vitest";
import { splitIvrSettingsFields } from "./integrationSecretFields";

describe("splitIvrSettingsFields (SEC-2R-R)", () => {
  it("routes Exotel/Twilio tokens to secrets and keeps provider config public", () => {
    const { publicFields, secretFields } = splitIvrSettingsFields({
      enableIvr: true,
      ivrProvider: "exotel",
      exotelVirtualNumber: "+911234567890",
      exotelSid: "sid-secret",
      exotelToken: "token-secret",
      twilioAuthToken: "twilio-secret",
    });

    expect(publicFields).toMatchObject({
      enableIvr: true,
      ivrProvider: "exotel",
      exotelVirtualNumber: "+911234567890",
    });
    expect(secretFields).toMatchObject({
      exotelSid: "sid-secret",
      exotelToken: "token-secret",
      twilioAuthToken: "twilio-secret",
    });
    expect(publicFields).not.toHaveProperty("exotelToken");
  });
});
