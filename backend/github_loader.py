import requests
import os
ALLOWED_EXTENSIONS = (
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".md", ".json", ".html", ".css", ".env.example"
)

def fetch_repo_files(repo_url: str, token: str = None):
    token = token or os.getenv("GITHUB_TOKEN")
    """Fetch all code files from a GitHub repo."""
    parts = repo_url.rstrip("/").split("/")
    owner, repo = parts[-2], parts[-1]

    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"

    # Get full file tree
    api = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
    response = requests.get(api, headers=headers)
    response.raise_for_status()
    tree = response.json().get("tree", [])

    files = []
    for item in tree:
        if item["type"] != "blob":
            continue
        if not item["path"].endswith(ALLOWED_EXTENSIONS):
            continue
        # Skip files that are too large (> 100KB)
        if item.get("size", 0) > 100_000:
            continue

        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{item['path']}"
        try:
            content = requests.get(raw_url, headers=headers).text
            files.append({"path": item["path"], "content": content})
        except Exception:
            continue

    return files