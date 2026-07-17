export interface WhatsAppTemplate {
  id: string;
  label: string;
  text: (ctx: {
    name: string;
    project: string;
    agent?: string;
    plot?: string;
  }) => string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "intro",
    label: "Greeting & Project Intro",
    text: ({ name, project, agent }) =>
      `Hello ${name}, this is ${agent || "Golden Acres"}. Thank you for showing interest in ${project}. We would love to share the layout plan and pricing details. Please let us know a convenient time to call. Regards, Golden Acres.`,
  },
  {
    id: "visit",
    label: "Site Visit Confirmation",
    text: ({ name, project }) =>
      `Hello ${name}, this is to confirm your scheduled site visit to ${project}. We have arranged a site executive to guide you. Regards, Golden Acres.`,
  },
  {
    id: "followup",
    label: "Follow-up Call Reminder",
    text: ({ name, project }) =>
      `Hello ${name}, we tried calling you earlier regarding your interest in ${project} plots. Please let us know when we can connect. Regards, Golden Acres.`,
  },
  {
    id: "brochure",
    label: "Brochure Follow-up",
    text: ({ name, project, plot }) =>
      `Hi ${name}, sharing details for ${project}${plot ? ` (Plot ${plot})` : ""}. Happy to walk you through pricing and availability. Regards, Golden Acres.`,
  },
];

/** Static brochure / map attachment presets for the composer. */
export const WHATSAPP_ATTACHMENTS = [
  {
    id: "brochure",
    label: "Project Brochure (PDF)",
    type: "document" as const,
    mediaUrl: "/brochures/golden-acres-overview.pdf",
    mediaMimeType: "application/pdf",
    mediaFileName: "golden-acres-overview.pdf",
    caption: "Please find our project brochure attached.",
  },
  {
    id: "layout",
    label: "Layout Map Image",
    type: "image" as const,
    mediaUrl: "/maps/sample-layout.png",
    mediaMimeType: "image/png",
    mediaFileName: "layout-map.png",
    caption: "Here is the layout map for your reference.",
  },
];
