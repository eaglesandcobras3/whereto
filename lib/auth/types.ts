/** Serializable auth user passed from server components to client UI. */
export type AuthSessionUser = {
  id: string;
  email: string | null;
};

export type AuthActionResult =
  | { ok: true; user?: AuthSessionUser }
  | { ok: false; error: string };
