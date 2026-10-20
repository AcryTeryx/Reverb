import { setTimeout as sleep } from "node:timers/promises";

export function retryDelay(value, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

// The full budget includes waiting for the shared quota and all retries, and
// stays below the web client's 30-second timeout.
export async function fetchMusicBrainz(request, reserveSlot) {
  const deadline = Date.now() + 22000;
  let lastStatus = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const delay = await reserveSlot();
    if (delay + 500 >= deadline - Date.now()) break;
    await sleep(delay);
    let response;
    try {
      response = await fetch(request, {
        headers: {
          "User-Agent":
            process.env.MUSICBRAINZ_USER_AGENT ||
            "Reverb/0.1.2 (https://github.com/AcryTeryx/Reverb)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(8000, deadline - Date.now())),
        ),
      });
    } catch {
      lastStatus = null;
    }
    if (response?.ok) return response;
    if (response) {
      lastStatus = response.status;
      await response.body?.cancel();
      // Query errors and access refusals cannot be fixed by immediate retries.
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    }
    if (attempt === 2) break;
    const backoff = Math.max(
      (attempt + 1) * 1000,
      retryDelay(response?.headers.get("retry-after")),
    );
    if (backoff + 500 >= deadline - Date.now()) break;
    await sleep(backoff);
  }
  if (lastStatus === 429)
    throw new Error(
      "Le catalogue limite temporairement les recherches. Patientez une minute puis réessayez.",
    );
  if (lastStatus === 400)
    throw new Error(
      "Le catalogue n’a pas accepté cette recherche. Essayez un titre ou un nom d’artiste plus simple.",
    );
  if (lastStatus === 403)
    throw new Error(
      "Le catalogue refuse temporairement l’accès à Reverb. Réessayez plus tard.",
    );
  throw new Error(
    "Le catalogue est momentanément indisponible malgré plusieurs tentatives. Réessayez dans un instant.",
  );
}
