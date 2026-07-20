import { Code } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/shared/components/ui/Card";

export default function CloudFunctionCodeReference() {
  return (
    <Card className="mt-4 animate-fadeIn">
      <CardHeader>
        <h3 className="type-card-title flex items-center text-theme-text">
          <Code className="w-5 h-5 mr-2 text-theme-accent" aria-hidden="true" />
          Production Cloud Function Code
        </h3>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-theme-muted font-medium">
          Deploy this code to Firebase Functions. It processes incoming POST
          webhooks from Meta and Google Ads, validates tokens, and saves leads
          directly to your Firestore database.
        </p>
        <div className="bg-theme-surface text-theme-text p-4 rounded-theme text-[10px] font-mono overflow-x-auto max-h-[250px] border border-theme-border leading-relaxed select-all space-y-1">
          <div className="text-theme-success">
            // Firebase Cloud Functions — Ad Webhook Endpoint
          </div>
          <div className="text-theme-muted">// File: functions/index.js</div>
          <div className="text-theme-muted">
            // Deploy: firebase deploy --only functions
          </div>
          <div className="mt-2 text-theme-warning">
            const functions = require(&apos;firebase-functions&apos;);
          </div>
          <div className="text-theme-warning">
            const admin = require(&apos;firebase-admin&apos;);
          </div>
          <div className="text-theme-warning">
            const axios = require(&apos;axios&apos;);
          </div>
          <div className="text-theme-warning">admin.initializeApp();</div>
          <div className="mt-2 text-theme-accent">
            exports.adLeadsWebhook = functions.https.onRequest(async (req, res)
            =&gt; {"{"}
          </div>
          <div className="pl-4 text-theme-muted">
            {"  "}
            // Handles GET (Meta verification) and POST (lead ingestion)
          </div>
          <div className="pl-4 text-theme-muted">
            {"  "}
            // Supports both Google Ads and Meta Lead Ads formats
          </div>
          <div className="pl-4 text-theme-muted">
            {"  "}
            // Validates webhook keys and saves leads to Firestore
          </div>
          <div className="text-theme-accent">{"}"});</div>
          <div className="mt-2 text-theme-muted text-[9px] font-medium">
            Full source code is available in your project repository under
            /functions/index.js
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
