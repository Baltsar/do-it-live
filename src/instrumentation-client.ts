import { reportClientError } from "@/lib/report-error";

// Runs before the app hydrates, so an error during start-up on a phone still reaches the session log.
window.addEventListener("error", (e) => reportClientError("window.error", e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => reportClientError("unhandledrejection", e.reason));
