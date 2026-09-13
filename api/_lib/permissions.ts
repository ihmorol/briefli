// Permission rule: personalized links may only be modified by the signed-in
// user who owns them; public links may be modified by any signed-in user.
// Anonymous requests can never modify a link — requireUser() guarantees
// userId is a real user id before this check runs.
export function canModify(
  link: { is_personalized?: boolean | null; user_id?: string | null },
  userId: string
): boolean {
  if (link.is_personalized) {
    return link.user_id === userId;
  }
  return true;
}
