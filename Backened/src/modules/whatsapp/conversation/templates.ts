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
  askDescription:
    "Describe the issue (20-5000 characters). You can send *multiple messages*; reply *done* when you've finished.",
  descriptionAdded:
    "Added. Reply *done* when you've finished your description.",
  descriptionTooShort:
    "Description must be at least 20 characters. Send more, then reply *done* when finished.",
  descriptionTooLong:
    "Description cannot exceed 5000 characters. Please shorten and reply *done* when finished.",
  askPhone:
    "Use your *current WhatsApp number* for this complaint? Reply *YES* to use it.\n\nOr send another *10-digit mobile number* (starting with 6, 7, 8, or 9) to attach. You can track complaint status from your mobile later.",
  askMedia:
    "Send photos/documents now. Are you done providing supporting docs? If yes, please forward *done*.",
  /** Shown after each image/document receipt to avoid caption/ordering confusion. */
  askDoneConfirm:
    "Are you done providing supporting docs? If yes, please forward *done*.",
  confirm: (summary: string) =>
    `Here’s what I captured:\n${summary}\n\nReply YES to submit or EDIT <field> to change.`,
  submitted: (complaintId: string) =>
    `Your complaint is submitted. ID: ${complaintId}. We’ll keep you posted.`,
  missingFields: "I still need these required fields: ",
  invalidCategory:
    "That category is not valid. Please choose: roads, water, electricity, documents, health, education.",

  // AI-assisted file path (describe in one go)
  askFileMode:
    "Reply *A* to describe your issue in your own words (name, details, documents) and we'll extract the rest, or *B* for step-by-step.",
  invalidFileMode:
    "Please reply *A* (describe in one go) or *B* (step-by-step).",
  askFreeForm:
    "Describe your issue, your name, contact details, and attach any documents. You can send *multiple messages*. Reply *done* when you've finished.",
  freeFormAdded: "Got it. Send more or reply *done* when finished.",
  freeFormDoneMinContent:
    "Please describe the issue in a few words (or attach a document), then reply *done*. Or reply *B* for step-by-step.",
  freeFormDoneProcessing:
    "We're reading your message and documents. We'll reply in a moment with what we understood and what we still need.",
  aiProcessingWait:
    "We're still processing your previous message. You'll get a reply shortly. Please wait.",
  aiFailedFallback:
    "We couldn't parse that. Reply *B* to file step-by-step, or try again with a clearer message.",
  fillMissingIntro: (have: string, need: string, firstPrompt: string) =>
    `Here's what we have:\n${have}\n\nWe still need: ${need}.\n\n${firstPrompt}`,
};
