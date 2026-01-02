import { getToken } from "@/lib/auth";

export function getRequiredToken(): string {
  const token = getToken();
  if (!token) throw new Error("NO_TOKEN");
  return token;
}
