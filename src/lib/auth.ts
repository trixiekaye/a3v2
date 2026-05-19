export const AUTH_COOKIE = "a3_session";
export const DEFAULT_CREDENTIALS = {
  username: "admin",
  password: "password",
};

export function isValidCredentials(username: string, password: string): boolean {
  return (
    username === DEFAULT_CREDENTIALS.username &&
    password === DEFAULT_CREDENTIALS.password
  );
}
