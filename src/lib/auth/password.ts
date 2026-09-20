// Minimum length for any password a person chooses (customer "change password", admin sign-up).
// Login forms deliberately do NOT check it, so accounts created with older, shorter passwords can
// still sign in. Keep in sync with Supabase > Authentication > Providers > Email > minimum length.
export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_MIN_MESSAGE = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
