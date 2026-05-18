import os
import re
from dotenv import load_dotenv
load_dotenv()

from typing import TypedDict
from langgraph.graph import StateGraph, START, END
# from huggingface_hub import InferenceClient
from rag import search_codebase
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def llm_invoke(prompt: str) -> str:
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
        temperature=0.3
    )
    return response.choices[0].message.content.strip()

class AgentState(TypedDict):
    user_message: str
    intent: str
    retrieved_code: str
    file_path: str
    response: str
    actions: list

vectorstore = None
repo_files_cache = {}

def inject_context(vs, files: list):
    global vectorstore, repo_files_cache
    vectorstore = vs
    repo_files_cache = {f["path"]: f["content"] for f in files}

def detect_intent(state: AgentState) -> dict:
    prompt = f"""Classify this user message into exactly one of these intents:
- explain
- suggest
- modify
- create
- ui_color
- search

User message: "{state['user_message']}"

Reply with ONLY the intent word, nothing else."""
    intent = llm_invoke(prompt).strip().lower()
    if intent not in ["explain", "suggest", "modify", "create", "ui_color", "search"]:
        intent = "search"
    print(f"Intent: {intent}")
    return {"intent": intent}

def retrieve(state: AgentState) -> dict:
    query = "color theme primary background CSS" if state["intent"] == "ui_color" else state["user_message"]
    results = search_codebase(query, vectorstore, k=5)
    if not results:
        return {"retrieved_code": "", "file_path": ""}
    combined = "\n\n---\n\n".join([f"File: {r['path']}\n{r['content']}" for r in results])
    return {"retrieved_code": combined, "file_path": results[0]["path"]}

def generate(state: AgentState) -> dict:
    intent = state["intent"]
    context = state["retrieved_code"]
    message = state["user_message"]
    file_path = state["file_path"]

    if intent == "explain":
        return {"response": llm_invoke(f"Explain this code:\n{context}\n\nQuestion: {message}"), "actions": []}

    elif intent == "suggest":
        return {"response": llm_invoke(f"Give improvement suggestions for this code:\n{context}"), "actions": []}

    elif intent == "search":
        return {"response": llm_invoke(f"Answer this question based on the code:\n{context}\n\nQuestion: {message}"), "actions": []}

    elif intent == "modify":
        file_content = repo_files_cache.get(file_path, context)
        updated = llm_invoke(f"Current file:\n{file_content}\n\nInstruction: {message}\n\nReturn ONLY the updated file content.")
        updated = re.sub(r"^```[\w]*\n?", "", updated).rstrip("```").strip()
        return {"response": f"Changes ready for `{file_path}`. Review and apply.", "actions": [{"action": "CODE_MODIFIED", "file_path": file_path, "updated_code": updated}]}

    elif intent == "create":
        new_code = llm_invoke(f"Reference files:\n{context}\n\nCreate a new file for: {message}\n\nReturn ONLY the file content.")
        new_code = re.sub(r"^```[\w]*\n?", "", new_code).rstrip("```").strip()
        guessed_path = next((w for w in message.split() if "." in w), "src/pages/NewPage.jsx")
        return {"response": f"Created `{guessed_path}`. Review and apply.", "actions": [{"action": "FILE_CREATED", "file_path": guessed_path, "code": new_code}]}

    elif intent == "ui_color":
        results_raw = search_codebase("color theme CSS variables", vectorstore, k=5)
        theme_files = [r for r in results_raw if any(x in r["path"] for x in [".css", "theme", "style", "tailwind", "global"])] or results_raw[:2]
        changed = []
        for f in theme_files:
            updated = llm_invoke(f"File:\n{f['content']}\n\nInstruction: {message}\n\nReturn ONLY updated file content.")
            updated = re.sub(r"^```[\w]*\n?", "", updated).rstrip("```").strip()
            changed.append({"action": "UI_COLOR_CHANGED", "file_path": f["path"], "updated_code": updated})
        return {"response": f"Updated {len(changed)} file(s). Review before applying.", "actions": changed}

    return {"response": "Could not understand request.", "actions": []}

def build_graph():
    g = StateGraph(AgentState)
    g.add_node("detect_intent", detect_intent)
    g.add_node("retrieve", retrieve)
    g.add_node("generate", generate)
    g.add_edge(START, "detect_intent")
    g.add_edge("detect_intent", "retrieve")
    g.add_edge("retrieve", "generate")
    g.add_edge("generate", END)
    return g.compile()

graph = None

def create_agent(vs, files: list):
    global graph
    inject_context(vs, files)
    graph = build_graph()
    print("Agent ready")
    return graph

def run_agent(message: str) -> dict:
    result = graph.invoke({
        "user_message": message,
        "intent": "",
        "retrieved_code": "",
        "file_path": "",
        "response": "",
        "actions": []
    })
    return {"response": result["response"], "actions": result["actions"]}