import { Code } from "lucide-react";

export default function CloudFunctionCodeReference() {
  return (
    <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-5 transition-colors mt-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
        <h3 className="text-lg font-bold flex items-center text-theme-text">
          <Code className="w-5 h-5 mr-2 text-indigo-500" />
          Production Cloud Function Code
        </h3>
      </div>
      <p className="text-xs text-theme-muted mb-3 font-medium">
        Deploy this code to Firebase Functions. It processes incoming POST webhooks from Meta and Google Ads, validates tokens, and saves leads directly to your Firestore database.
      </p>
      <div className="bg-gray-950 text-gray-200 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-[250px] border border-gray-900 leading-relaxed select-all space-y-1">
        <div className="text-green-400">// Firebase Cloud Functions — Ad Webhook Endpoint</div>
        <div className="text-gray-400">// File: functions/index.js</div>
        <div className="text-gray-400">// Deploy: firebase deploy --only functions</div>
        <div className="mt-2 text-yellow-300">const functions = require('firebase-functions');</div>
        <div className="text-yellow-300">const admin = require('firebase-admin');</div>
        <div className="text-yellow-300">const axios = require('axios');</div>
        <div className="text-yellow-300">admin.initializeApp();</div>
        <div className="mt-2 text-blue-300">exports.adLeadsWebhook = functions.https.onRequest(async (req, res) =&gt; {"{"}</div>
        <div className="pl-4 text-gray-300">{"  "}// Handles GET (Meta verification) and POST (lead ingestion)</div>
        <div className="pl-4 text-gray-300">{"  "}// Supports both Google Ads and Meta Lead Ads formats</div>
        <div className="pl-4 text-gray-300">{"  "}// Validates webhook keys and saves leads to Firestore</div>
        <div className="text-blue-300">{"}"});</div>
        <div className="mt-2 text-gray-400 text-[9px] font-medium">
          Full source code is available in your project repository under /functions/index.js
        </div>
      </div>
    </div>
  );
}
