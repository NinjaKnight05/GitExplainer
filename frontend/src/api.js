const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function loadRepo(repoUrl, token = null) {
  const res = await fetch(`${BASE_URL}/load-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl, token }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load repo");
  }
  return res.json();
}

export async function sendMessage(message) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Chat request failed");
  }
  return res.json();
}

export async function deleteRepo(repoUrl) {
  const res = await fetch(`${BASE_URL}/repo`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl }),
  });
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}