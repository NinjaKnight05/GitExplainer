import os
import hashlib
from dotenv import load_dotenv
load_dotenv() 

os.environ["SENTENCE_TRANSFORMERS_HOME"] = "/tmp/st_cache"
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


INDEX_NAME = "repomind"
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))


def init_pinecone_index():
    existing = [i.name for i in pc.list_indexes()]
    if INDEX_NAME not in existing:
        pc.create_index(
            name=INDEX_NAME,
            dimension=384,  # ← fix this, MiniLM = 384 not 1536
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region=os.getenv("PINECONE_REGION", "us-east-1")
            )
        )

# rest of the file stays exactly the same


def repo_namespace(repo_url: str) -> str:
    """Each repo gets its own namespace so multiple repos don't mix."""
    return hashlib.md5(repo_url.encode()).hexdigest()[:12]


def build_vector_store(files: list, repo_url: str):
    """Chunk all files, embed them, upsert into Pinecone."""
    init_pinecone_index()
    namespace = repo_namespace(repo_url)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    docs = []
    for f in files:
        chunks = splitter.create_documents(
            texts=[f["content"]],
            metadatas=[{"path": f["path"], "repo": repo_url}]
        )
        docs.extend(chunks)

    vectorstore = PineconeVectorStore.from_documents(
        documents=docs,
        embedding=embeddings,
        index_name=INDEX_NAME,
        namespace=namespace
    )

    print(f"✅ Upserted {len(docs)} chunks into Pinecone (namespace: {namespace})")
    return vectorstore, namespace, len(docs)


def load_vector_store(repo_url: str):
    """Load existing Pinecone index — no re-embedding needed."""
    namespace = repo_namespace(repo_url)
    vectorstore = PineconeVectorStore(
        index_name=INDEX_NAME,
        embedding=embeddings,
        namespace=namespace
    )
    return vectorstore


def search_codebase(query: str, vectorstore, k: int = 5):
    """Semantic search over the indexed repo."""
    results = vectorstore.similarity_search(query, k=k)
    return [
        {"path": r.metadata["path"], "content": r.page_content}
        for r in results
    ]


def delete_namespace(repo_url: str):
    """Delete all vectors for a repo namespace."""
    namespace = repo_namespace(repo_url)
    index = pc.Index(INDEX_NAME)
    index.delete(delete_all=True, namespace=namespace)
    print(f"🗑️ Deleted namespace: {namespace}")