// Turns a thrown Firestore (or any) error into a sentence for a toast.
export function errorMessage(err: unknown): string {
  switch ((err as { code?: string } | null)?.code) {
    case "permission-denied":
      return "You don't have permission to do that.";
    case "unavailable":
      return "Can't reach the server. Check your connection and try again.";
    case "not-found":
      return "That item no longer exists. Reload the page.";
    default:
      return "Something went wrong. Please try again.";
  }
}
