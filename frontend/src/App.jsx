import { useState, useRef, useEffect } from "react";
import { loadRepo, sendMessage } from "./api";
import CodePreview from "./Codepreview";

/* ── Logo SVG ───────────────────────────────────────────────────────────── */
function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="38" height="38" rx="10" stroke="#4d7654" strokeWidth="1.5" fill="none" />
      <path d="M10 14 L16 20 L10 26" stroke="#f1f1f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 26 H30" stroke="#adcccaf0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="12" r="3" fill="#8764b2" opacity="0.5" />
      <circle cx="30" cy="12" r="1.5" fill="#f76c6c" />
    </svg>
  );
}

/* ── Global CSS ─────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: #09090b; font-family: 'Outfit', sans-serif; color: #e4e4e7; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }

  input, textarea, button { font-family: inherit; }
  input::placeholder, textarea::placeholder { color: #3f3f46; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes slideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes blink   { 0%,80%,100%{opacity:0.15} 40%{opacity:1} }
  @keyframes glow    { 0%,100%{opacity:0.4} 50%{opacity:0.85} }
  @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }

  .chat-del { opacity: 0; transition: opacity 0.15s; }
  .chat-row:hover .chat-del { opacity: 1; }

  .sidebar-backdrop {
    display: none;
    position: fixed; inset: 0; background: rgba(0,0,0,0.65);
    z-index: 40; animation: fadeIn 0.2s ease;
  }
  .sidebar-backdrop.open { display: block; }

  @media (max-width: 680px) {
    .sidebar-wrap {
      position: fixed !important;
      top: 0; left: 0; bottom: 0;
      z-index: 50;
      transform: translateX(-100%);
      transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 4px 0 28px rgba(0,0,0,0.6);
      width: 230px !important;
    }
    .sidebar-wrap.open { transform: translateX(0); }
    .chat-del { opacity: 1 !important; }
    .topbar-repo { display: none !important; }
    .input-pad { padding: 6px 10px 14px !important; }
    .msg-pad { padding: 14px 12px !important; }
    .load-pad { padding: 18px 12px !important; }
    .suggestions-pad { padding: 0 12px 6px !important; }
    .hint-text { display: none !important; }
    .user-bubble { max-width: 85% !important; }
    .agent-bubble { max-width: 88% !important; }
  }
`;

/* ── Theme ──────────────────────────────────────────────────────────────── */
const T = {
  bg:          "#09090b",
  bgDeep:      "#050507",
  surface:     "#0f0f12",
  card:        "#141417",
  border:      "#1f1f23",
  borderHi:    "#2e2e33",
  text:        "#e4e4e7",
  muted:       "#52525b",
  dim:         "#18181b",
  accentBg:    "#111113",
  accentBorder:"#2a2a2e",
  accentText:  "#d4d4d8",
  accentDim:   "#0e0e10",
  green:       "#7e7086",
  greenGlow:   "#4ade8020",
  red:         "#f87171",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function Spinner({ size = 12 }) {
  return <span style={{
    width: size, height: size,
    border: `1.5px solid ${T.border}`, borderTopColor: T.accentText,
    borderRadius: "50%", display: "inline-block",
    animation: "spin 0.7s linear infinite",
  }} />;
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: T.muted,
          display: "inline-block",
          animation: "blink 1.3s infinite", animationDelay: `${i*0.22}s`,
        }} />
      ))}
    </span>
  );
}

function LogoAvatar() {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      background: "#0c0c0e", border: "1.5px solid #252529",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 0 0 3px ${T.greenGlow}`,
    }}>
      <Logo size={20} />
    </div>
  );
}

/* ── Splash ─────────────────────────────────────────────────────────────── */
function SplashScreen({ onEnter }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      position:"fixed", inset:0, background:T.bgDeep,
      display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
    }}>
      <div style={{
        position:"absolute", inset:0, opacity:0.06,
        backgroundImage:`linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`,
        backgroundSize:"48px 48px",
      }}/>
      <div style={{
        position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:520, height:520,
        background:`radial-gradient(circle,${T.greenGlow} 0%,transparent 65%)`,
        animation:"glow 3s ease-in-out infinite", pointerEvents:"none",
      }}/>
      {[{top:20,left:20},{top:20,right:20},{bottom:20,left:20},{bottom:20,right:20}].map((pos,i)=>(
        <div key={i} style={{
          position:"absolute",...pos, width:16,height:16,opacity:0.4,
          borderTop:i<2?`1px solid ${T.border}`:"none",
          borderBottom:i>=2?`1px solid ${T.border}`:"none",
          borderLeft:i%2===0?`1px solid ${T.border}`:"none",
          borderRight:i%2===1?`1px solid ${T.border}`:"none",
        }}/>
      ))}
      {[{top:"17%",left:"13%",d:"0s"},{top:"71%",left:"10%",d:"0.8s"},{top:"20%",right:"12%",d:"1.4s"},{top:"67%",right:"16%",d:"0.4s"}].map((n,i)=>(
        <div key={i} style={{
          position:"absolute",top:n.top,left:n.left,right:n.right,
          width:5,height:5,borderRadius:"50%",background:T.green,opacity:0.18,
          animation:"float 3s ease-in-out infinite",animationDelay:n.d,
        }}/>
      ))}

      <div style={{ position:"relative", textAlign:"center", animation:"fadeUp 0.7s ease both", padding:"0 20px" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:13,marginBottom:26 }}>
          <div style={{ animation:"float 4s ease-in-out infinite" }}><Logo size={44}/></div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:34,fontWeight:700,letterSpacing:"-1px",lineHeight:1,color:T.text }}>
              Kod<span style={{ color:T.green }}>exa</span>
            </div>
            <div style={{ fontSize:10,color:T.muted,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",marginTop:3 }}>
              AI · Codebase Intelligence
            </div>
          </div>
        </div>
        <p style={{ fontSize:14,color:T.muted,maxWidth:340,margin:"0 auto 14px",lineHeight:1.7 }}>
          Load any GitHub repository. Ask questions, get explanations, request changes — all through natural conversation.
        </p>
        <div style={{ display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap",marginBottom:38 }}>
          {["🔍 RAG Search","💡 Code Explain","✏️ Modify Files","🎨 UI Changes"].map(f=>(
            <span key={f} style={{
              padding:"4px 10px",borderRadius:20,border:`1px solid ${T.border}`,
              fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",background:T.dim,
            }}>{f}</span>
          ))}
        </div>
        <button
          onClick={onEnter}
          onMouseEnter={()=>setHovered(true)}
          onMouseLeave={()=>setHovered(false)}
          style={{
            padding:"13px 36px",borderRadius:10,
            border:`1px solid ${hovered?T.accentBorder:T.borderHi}`,
            background:hovered?"rgba(255,255,255,0.05)":"transparent",
            color:T.text,fontSize:14,fontWeight:600,cursor:"pointer",
            letterSpacing:"0.03em",transition:"all 0.2s ease",
          }}
        >Let's dive in →</button>
        <div style={{ marginTop:22,fontSize:10,color:"#27272a",fontFamily:"'JetBrains Mono',monospace" }}>
          Pinecone · HuggingFace · Gemini · LangGraph
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar Component ───────────────────────────────────────────────────── */
function Sidebar({ chats, activeChatId, setActiveChatId, handleNewChat, handleDeleteChat, chat, onClose, isMobile }) {
  return (
    <div style={{
      width:230, height:"100%", display:"flex", flexDirection:"column",
      background:T.surface, borderRight:`1px solid ${T.border}`,
    }}>
      {/* Brand */}
      <div style={{ padding:"13px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <Logo size={24}/>
            <span style={{ fontWeight:600,fontSize:14,color:T.text,letterSpacing:"-0.3px" }}>
              Kod<span style={{ color:T.green }}>exa</span>
            </span>
          </div>
          <div style={{ display:"flex",gap:5 }}>
            <button onClick={handleNewChat} title="New chat" style={{
              width:28,height:28,borderRadius:7,border:`1px solid ${T.border}`,
              background:"transparent",color:T.muted,cursor:"pointer",fontSize:18,
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderHi;e.currentTarget.style.color=T.text;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}
            >+</button>
            {isMobile && (
              <button onClick={onClose} title="Close sidebar" style={{
                width:28,height:28,borderRadius:7,border:`1px solid ${T.border}`,
                background:"transparent",color:T.muted,cursor:"pointer",fontSize:15,
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Chat list */}
      <div style={{ flex:1,overflowY:"auto",padding:"8px" }}>
        <div style={{ fontSize:9,color:T.muted,padding:"4px 6px 7px",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>
          💬 Chats
        </div>
        {chats.map(c => (
          <div key={c.id} className="chat-row"
            onClick={()=>{ setActiveChatId(c.id); if(isMobile) onClose(); }}
            style={{
              padding:"8px 8px",borderRadius:7,cursor:"pointer",marginBottom:2,
              background:c.id===activeChatId?T.card:"transparent",
              border:`1px solid ${c.id===activeChatId?T.border:"transparent"}`,
              display:"flex",alignItems:"center",justifyContent:"space-between",
              transition:"background 0.12s",
            }}
            onMouseEnter={e=>{if(c.id!==activeChatId)e.currentTarget.style.background=T.dim;}}
            onMouseLeave={e=>{if(c.id!==activeChatId)e.currentTarget.style.background="transparent";}}
          >
            <div style={{ display:"flex",alignItems:"center",gap:7,minWidth:0,flex:1 }}>
              <span style={{ fontSize:9,color:c.repoLoaded?T.green:T.muted,flexShrink:0 }}>
                {c.repoLoaded?"●":"○"}
              </span>
              <span style={{
                fontSize:12,color:c.id===activeChatId?T.text:T.muted,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                fontFamily:"'JetBrains Mono',monospace",
              }}>{c.title}</span>
            </div>
            {chats.length>1 && (
              <button className="chat-del"
                onClick={e=>{e.stopPropagation();handleDeleteChat(c.id);}}
                title="Delete chat"
                style={{
                  flexShrink:0,marginLeft:5,
                  width:24,height:24,borderRadius:6,
                  border:`1px solid ${T.border}`,
                  background:"rgba(248,113,113,0.07)",
                  color:T.red,cursor:"pointer",fontSize:15,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  padding:0,transition:"all 0.15s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(248,113,113,0.2)";e.currentTarget.style.borderColor=T.red;}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(248,113,113,0.07)";e.currentTarget.style.borderColor=T.border;}}
              >×</button>
            )}
          </div>
        ))}
      </div>

      {/* Repo stats with emojis */}
      {chat?.repoLoaded && chat?.repoMeta && (
        <div style={{ padding:"12px",borderTop:`1px solid ${T.border}`,flexShrink:0 }}>
          <div style={{ fontSize:9,color:T.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace" }}>
            📦 Indexed
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
            {[
              { emoji:"📄", label:"Files",   value: chat.repoMeta.file_count },
              { emoji:"🧩", label:"Chunks",  value: chat.repoMeta.chunk_count },
            ].map(({ emoji, label, value }) => (
              <div key={label} style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"7px 10px",background:T.accentDim,borderRadius:7,
                border:`1px solid ${T.accentBorder}`,
              }}>
                <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                  <span style={{ fontSize:15 }}>{emoji}</span>
                  <span style={{ fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace" }}>{label}</span>
                </div>
                <span style={{ fontSize:13,fontWeight:600,color:T.accentText,fontFamily:"'JetBrains Mono',monospace" }}>{value}</span>
              </div>
            ))}
            <div style={{
              display:"flex",alignItems:"center",gap:7,padding:"7px 10px",
              background:T.accentDim,borderRadius:7,border:`1px solid ${T.accentBorder}`,
            }}>
              <span style={{ fontSize:15 }}>🟢</span>
              <span style={{ fontSize:10,color:T.green,fontFamily:"'JetBrains Mono',monospace" }}>Vector store ready</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────────────────── */
let chatIdCounter = 1;
function newChat() {
  return { id:chatIdCounter++, title:"New chat", repoUrl:"", repoLoaded:false, repoMeta:null, messages:[] };
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [chats, setChats] = useState([newChat()]);
  const [activeChatId, setActiveChatId] = useState(1);
  const [previews, setPreviews] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 680);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 680);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const chat = chats.find(c => c.id === activeChatId);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chat?.messages, typing]);
  useEffect(() => { setInput(""); setLoadError(""); setRepoUrl(chat?.repoUrl||""); }, [activeChatId]);

  function updateChat(id, patch) { setChats(prev=>prev.map(c=>c.id===id?{...c,...patch}:c)); }
  function addMessage(chatId, msg) { setChats(prev=>prev.map(c=>c.id===chatId?{...c,messages:[...c.messages,msg]}:c)); }
  function handleNewChat() { const c=newChat(); setChats(prev=>[...prev,c]); setActiveChatId(c.id); setSidebarOpen(false); }
  function handleDeleteChat(id) {
    const rem = chats.filter(c=>c.id!==id);
    if(rem.length===0){const c=newChat();setChats([c]);setActiveChatId(c.id);}
    else{setChats(rem);if(activeChatId===id)setActiveChatId(rem[rem.length-1].id);}
  }

  async function handleLoadRepo() {
    if(!repoUrl.trim()) return;
    setLoadingRepo(true); setLoadError("");
    const cleanUrl = repoUrl.trim().replace(/\.git$/,"");
    try {
      const data = await loadRepo(cleanUrl, token||null);
      const title = cleanUrl.split("/").slice(-2).join("/");
      updateChat(activeChatId,{
        repoUrl:cleanUrl,repoLoaded:true,
        repoMeta:{file_count:data.file_count,chunk_count:data.chunk_count},
        title,
        messages:[{role:"system",text:`📦 Indexed ${data.file_count} files · ${data.chunk_count} chunks in Pinecone`}],
      });
    } catch(err){setLoadError(err.message);}
    finally{setLoadingRepo(false);}
  }

  async function handleSend() {
    const msg = input.trim();
    if(!msg||!chat?.repoLoaded) return;
    setInput("");
    addMessage(activeChatId,{role:"user",text:msg});
    setTyping(true);
    try {
      const data = await sendMessage(msg);
      addMessage(activeChatId,{role:"agent",text:data.response});
      const fp=[];
      for(const a of data.actions||[]){
        if(a.action==="FILE_CREATED") fp.push({file_path:a.file_path,code:a.code,isNew:true});
        if(a.action==="CODE_MODIFIED") fp.push({file_path:a.file_path,updated_code:a.updated_code,isNew:false});
        if(a.action==="UI_COLOR_CHANGED") for(const f of a.files||[]) fp.push({file_path:f.file_path,updated_code:f.updated_code,isNew:false});
      }
      if(fp.length>0) setPreviews(fp);
    } catch(err){
      addMessage(activeChatId,{role:"system",text:err.message,isError:true});
    } finally{setTyping(false);}
  }

  if(splash) return (
    <>
      <style>{css}</style>
      <SplashScreen onEnter={()=>setSplash(false)}/>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div style={{ display:"flex", height:"100vh", width:"100vw", background:T.bg, overflow:"hidden", animation:"fadeIn 0.35s ease" }}>

        {/* Mobile backdrop */}
        <div className={`sidebar-backdrop${sidebarOpen?" open":""}`} onClick={()=>setSidebarOpen(false)}/>

        {/* Sidebar — desktop: inline; mobile: fixed overlay */}
        <div className={`sidebar-wrap${isMobile&&sidebarOpen?" open":""}`}
          style={!isMobile ? {
            width:230, flexShrink:0,
            display:"flex", flexDirection:"column",
            background:T.surface, borderRight:`1px solid ${T.border}`,
          } : {}}
        >
          <Sidebar
            chats={chats}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            handleNewChat={handleNewChat}
            handleDeleteChat={handleDeleteChat}
            chat={chat}
            onClose={()=>setSidebarOpen(false)}
            isMobile={isMobile}
          />
        </div>

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>

          {/* Topbar */}
          <div style={{
            height:48, padding:"0 14px", flexShrink:0,
            borderBottom:`1px solid ${T.border}`, background:T.surface,
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
          }}>
            {/* Hamburger — mobile only */}
            {isMobile && (
              <button onClick={()=>setSidebarOpen(true)} aria-label="Open sidebar" style={{
                width:36,height:36,borderRadius:8,border:`1px solid ${T.border}`,
                background:"transparent",cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4.5,
                flexShrink:0,
              }}>
                {[0,1,2].map(i=>(
                  <span key={i} style={{ width:14,height:1.5,background:T.muted,borderRadius:2,display:"block" }}/>
                ))}
              </button>
            )}

            {/* Repo URL label — hidden on mobile via CSS */}
            <span className="topbar-repo" style={{ fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>
              {chat?.repoLoaded?`⬡ ${chat.repoUrl}`:"No repository loaded"}
            </span>

            {/* Mobile: short title */}
            {isMobile && (
              <span style={{ fontSize:12,color:T.muted,fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>
                {chat?.repoLoaded?chat.title:"No repo"}
              </span>
            )}

            <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
              <span style={{
                width:7,height:7,borderRadius:"50%",display:"inline-block",
                background:chat?.repoLoaded?T.green:T.muted,
                boxShadow:chat?.repoLoaded?`0 0 8px ${T.green}`:"none",
                animation:chat?.repoLoaded?"glow 2s ease-in-out infinite":"none",
              }}/>
              <span style={{ fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace" }}>
                {chat?.repoLoaded?"ready":"idle"}
              </span>
            </div>
          </div>

          {/* Load repo panel */}
          {!chat?.repoLoaded && (
            <div className="load-pad" style={{
              padding:"22px 26px",borderBottom:`1px solid ${T.border}`,
              background:T.bgDeep,animation:"fadeUp 0.3s ease",flexShrink:0,
            }}>
              <div style={{ maxWidth:480 }}>
                <div style={{ fontSize:17,fontWeight:600,color:T.text,marginBottom:3 }}>
                  🔗 Load a repository
                </div>
                <div style={{ fontSize:12,color:T.muted,marginBottom:14 }}>
                  Paste any public GitHub URL to index it into Pinecone
                </div>
                <div style={{ display:"flex",gap:7,marginBottom:9,flexWrap:"wrap" }}>
                  <input
                    value={repoUrl}
                    onChange={e=>setRepoUrl(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleLoadRepo()}
                    placeholder="https://github.com/owner/repository"
                    style={{
                      flex:1,minWidth:160,background:T.surface,border:`1px solid ${T.border}`,
                      borderRadius:8,padding:"9px 12px",color:T.text,fontSize:12,
                      outline:"none",fontFamily:"'JetBrains Mono',monospace",transition:"border-color 0.15s",
                    }}
                    onFocus={e=>e.target.style.borderColor=T.borderHi}
                    onBlur={e=>e.target.style.borderColor=T.border}
                  />
                  <button onClick={handleLoadRepo} disabled={loadingRepo} style={{
                    padding:"9px 17px",borderRadius:8,
                    border:`1px solid ${loadingRepo?T.border:T.accentBorder}`,
                    background:loadingRepo?T.dim:T.accentDim,
                    color:loadingRepo?T.muted:T.accentText,
                    cursor:loadingRepo?"wait":"pointer",fontSize:12,fontWeight:500,
                    display:"flex",alignItems:"center",gap:7,transition:"all 0.15s",flexShrink:0,
                  }}>
                    {loadingRepo?<><Spinner/> Indexing…</>:"Load →"}
                  </button>
                </div>
                {/* <input
                  value={token}
                  onChange={e=>setToken(e.target.value)}
                  placeholder="🔑 GitHub token (optional — for private repos)"
                  style={{
                    width:"100%",background:"transparent",border:`1px solid ${T.border}`,
                    borderRadius:8,padding:"7px 12px",color:T.muted,fontSize:11,
                    outline:"none",fontFamily:"'JetBrains Mono',monospace",
                  }}
                /> */}
                {loadingRepo&&(
                  <div style={{ marginTop:9,fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",animation:"pulse 1.5s infinite" }}>
                    › fetching files → chunking → embedding → upserting to Pinecone
                  </div>
                )}
                {loadError&&<div style={{ marginTop:9,fontSize:12,color:T.red }}>✕ {loadError}</div>}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="msg-pad" style={{ flex:1,overflowY:"auto",padding:"22px 26px",display:"flex",flexDirection:"column",gap:15 }}>
            {chat?.messages.length===0&&chat?.repoLoaded&&(
              <div style={{ color:T.muted,fontSize:13,textAlign:"center",marginTop:48 }}>
                Repository indexed. Start asking questions.
              </div>
            )}

            {chat?.messages.map((msg,i)=>(
              <div key={i} style={{ animation:"slideIn 0.22s ease" }}>

                {/* System */}
                {msg.role==="system"&&(
                  <div style={{
                    display:"inline-flex",alignItems:"center",gap:8,
                    padding:"6px 12px",borderRadius:6,
                    background:msg.isError?"rgba(248,113,113,0.06)":T.accentDim,
                    border:`1px solid ${msg.isError?"rgba(248,113,113,0.2)":T.accentBorder}`,
                    fontSize:12,color:msg.isError?T.red:T.accentText,
                    fontFamily:"'JetBrains Mono',monospace",
                  }}>
                    <span>{msg.isError?"✕":"✓"}</span>
                    <span>{msg.text}</span>
                  </div>
                )}

                {/* User */}
                {msg.role==="user"&&(
                  <div style={{ display:"flex",justifyContent:"flex-end" }}>
                    <div className="user-bubble" style={{
                      maxWidth:"70%",padding:"10px 15px",
                      background:"#111113",border:"1px solid #2a2a2e",
                      borderRadius:"14px 14px 3px 14px",
                      fontSize:13,lineHeight:1.65,color:"#d4d4d8",
                    }}>{msg.text}</div>
                  </div>
                )}

                {/* Agent — with logo */}
                {msg.role==="agent"&&(
                  <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                    <LogoAvatar/>
                    <div className="agent-bubble" style={{
                      maxWidth:"76%",padding:"10px 15px",
                      background:"#0f0f12",border:"1px solid #1f1f23",
                      borderRadius:"3px 14px 14px 14px",
                      fontSize:13,lineHeight:1.8,color:"#d4d4d8",whiteSpace:"pre-wrap",
                    }}>{msg.text}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing */}
            {typing&&(
              <div style={{ display:"flex",gap:10,animation:"slideIn 0.22s ease",alignItems:"flex-start" }}>
                <LogoAvatar/>
                <div style={{
                  padding:"12px 15px",background:"#0f0f12",
                  border:`1px solid ${T.border}`,borderRadius:"3px 14px 14px 14px",
                }}>
                  <TypingDots/>
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>

          {/* Suggestion chips */}
          {chat?.repoLoaded&&chat?.messages.length<=1&&(
            <div className="suggestions-pad" style={{ padding:"0 26px 8px",display:"flex",gap:6,flexWrap:"wrap" }}>
              {["How does this work?","Suggest improvements","Create a new page","Explain the Code"].map(s=>(
                <button key={s} onClick={()=>setInput(s)} style={{
                  padding:"5px 11px",borderRadius:20,
                  border:`1px solid ${T.border}`,background:"transparent",
                  color:T.muted,fontSize:11,cursor:"pointer",
                  fontFamily:"'JetBrains Mono',monospace",transition:"all 0.15s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderHi;e.currentTarget.style.color=T.accentText;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}
                >{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="input-pad" style={{ padding:"8px 26px 18px" }}>
            <div style={{
              display:"flex",gap:7,alignItems:"flex-end",
              background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:14,padding:"8px 8px 8px 14px",transition:"border-color 0.15s",
            }}
              onFocusCapture={e=>e.currentTarget.style.borderColor=T.borderHi}
              onBlurCapture={e=>e.currentTarget.style.borderColor=T.border}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                placeholder={chat?.repoLoaded?"Ask about the code, request changes…":"Load a repository first"}
                disabled={!chat?.repoLoaded}
                rows={1}
                style={{
                  flex:1,background:"transparent",border:"none",outline:"none",
                  color:T.text,fontSize:13,resize:"none",lineHeight:1.6,
                  fontFamily:"'Outfit',sans-serif",paddingTop:2,maxHeight:120,overflowY:"auto",
                }}
                onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
              />
              <button onClick={handleSend} disabled={typing||!chat?.repoLoaded} style={{
                width:34,height:34,borderRadius:9,border:`1px solid ${T.accentBorder}`,flexShrink:0,
                background:typing||!chat?.repoLoaded?T.dim:"#111113",
                color:typing||!chat?.repoLoaded?T.muted:T.accentText,
                cursor:typing||!chat?.repoLoaded?"default":"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16,transition:"all 0.15s",
              }}>↑</button>
            </div>
            <div className="hint-text" style={{ marginTop:4,fontSize:10,color:"#27272a",textAlign:"center",fontFamily:"'JetBrains Mono',monospace" }}>
              enter to send · shift+enter for new line
            </div>
          </div>
        </div>
      </div>

      {previews.length>0&&(
        <CodePreview
          previews={previews}
          onAccept={()=>{addMessage(activeChatId,{role:"system",text:`Applied changes to ${previews.length} file(s)`});setPreviews([]);}}
          onReject={()=>{addMessage(activeChatId,{role:"system",text:"Changes rejected"});setPreviews([]);}}
        />
      )}
    </>
  );
}