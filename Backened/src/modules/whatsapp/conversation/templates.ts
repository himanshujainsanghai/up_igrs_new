/** Stale session threshold: treat as new and show welcome back (ms). */
export const STALE_SESSION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const templates = {
  /** Shown on first message only - no session yet. */
  welcomeIntent:
    "Welcome! How can we help you today?\n\nReply with:\n*1* - File a complaint\n*2* - Track complaint status\n*3* - Other / Just saying hi",
  /** Shown when returning after long inactivity. */
  welcomeBack: "Welcome back! Your previous session has expired.\n\n",
  welcome:
    "Hi! You can file a complaint here. Tap the form below to submit quickly, or reply to continue in chat.",
  /** When user sends CANCEL / QUIT / 0. */
  cancel:
    "Session cancelled. Reply *1* to file a complaint, *2* to track status, *3* for other.",
  /** When user chooses "other" or after complaint submitted. */
  goodbye: "Thanks for contacting us. Feel free to reach out anytime.",
  /** When internal error - do not save session. */
  errorGeneric:
    "Something went wrong. Please try again, or reply *CANCEL* to start over.",
  /** When rate limit exceeded. */
  rateLimit: "Too many messages. Please wait a moment before sending again.",
  /** When in START and user sends invalid choice (not 1/2/3). */
  invalidIntent: "Please reply with *1*, *2*, or *3* to choose an option.",
  askBasics:
    "Please share: your name, email, complaint title, category (roads/water/electricity/documents/health/education), and your district + sub-district + area. You can also drop a location pin.",
  /** Ask user to share current location (pin or live) or send coordinates as fallback. */
  askLocation:
    "Please share your *current location*: tap the 📎 attachment icon → *Location* (or share live location).\n\nIf you can't share location, send coordinates as: latitude, longitude (e.g. 28.6139, 77.2090).",
  askDescription: "Please describe the issue (20-5000 characters).",
  askPhone:
    "Use your *current WhatsApp number* for this complaint? Reply *YES* to use it.\n\nOr send another *10-digit mobile number* (starting with 6, 7, 8, or 9) to attach. You can track complaint status from your mobile later.",
  askMedia: "Send photos/documents now. Reply DONE when finished.",
  confirm: (summary: string) =>
    `Here’s what I captured:\n${summary}\n\nReply YES to submit or EDIT <field> to change.`,
  submitted: (complaintId: string) =>
    `Your complaint is submitted. ID: ${complaintId}. We’ll keep you posted.`,
  missingFields: "I still need these required fields: ",
  invalidCategory:
    "That category is not valid. Please choose: roads, water, electricity, documents, health, education.",
};
