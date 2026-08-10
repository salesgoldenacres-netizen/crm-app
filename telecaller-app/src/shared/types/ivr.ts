export interface IVRSettings {
  enableIvr: boolean;
  ivrProvider: string;
  ivrVirtualNumber: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  exotelSid: string;
  exotelToken: string;
  exotelVirtualNumber: string;
  ivrCustomOutboundUrl: string;
  ivrCustomMethod: string;
  ivrCustomAuthHeader: string;
  ivrCustomHeaders: string;
  ivrCustomPayload: string;
  [key: string]: string | boolean;
}

export interface IVRActiveCall {
  id: string;
  agentId?: string;
  timestamp: string;
  callerPhone: string;
  callerName: string;
  leadId: string;
  status: string;
}
