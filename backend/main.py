import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

from github_loader import fetch_repo_files
from rag import build_vector_store, load_vector_store, delete_namespace
from agent import create_agent, run_agent

load_dotenv()

app = FastAPI(title="RepoMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent_ready = False
loaded_repo_url = None


class LoadRepoRequest(BaseModel):
    repo_url: str
    token: Optional[str] = None

class ChatRequest(BaseModel):
    message: str

class DeleteRepoRequest(BaseModel):
    repo_url: str


@app.post("/load-repo")
async def load_repo(body: LoadRepoRequest):
    global agent_ready, loaded_repo_url

    try:
        print(f"Fetching files from {body.repo_url}...")
        files = fetch_repo_files(body.repo_url, body.token)

        if not files:
            raise HTTPException(status_code=400, detail="No supported files found.")

        print(f"Indexing {len(files)} files into Pinecone...")
        vs, namespace, chunk_count = build_vector_store(files, body.repo_url)

        print("Creating agent...")
        create_agent(vs, files)
        agent_ready = True
        loaded_repo_url = body.repo_url

        return {
            "status": "success",
            "repo_url": body.repo_url,
            "file_count": len(files),
            "chunk_count": chunk_count,
            "namespace": namespace
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(body: ChatRequest):
    if not agent_ready:
        raise HTTPException(status_code=400, detail="No repository loaded. Call /load-repo first.")
    try:
        result = run_agent(body.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/repo")
async def delete_repo(body: DeleteRepoRequest):
    try:
        delete_namespace(body.repo_url)
        return {"status": "deleted", "repo_url": body.repo_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "repo_loaded": agent_ready,
        "loaded_repo": loaded_repo_url
    }


# ✅ Serve React frontend — MUST be at the very bottom
frontend_dist = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")