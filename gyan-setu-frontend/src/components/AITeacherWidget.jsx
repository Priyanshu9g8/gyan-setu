import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import api from "../api/axios"

export default function AITeacherWidget(){

    const { t } = useTranslation()

    const [open,setOpen] = useState(false)
    const [question,setQuestion] = useState("")
    const [messages,setMessages] = useState([])
    const [loading,setLoading] = useState(false)

    const chatEndRef = useRef(null)

    useEffect(()=>{
        chatEndRef.current?.scrollIntoView({behavior:"smooth"})
    },[messages])

    const askTeacher = async () => {

        if(!question.trim()) return

        const userMessage = { role:"user", text:question }

        setMessages(prev => [...prev,userMessage])
        setLoading(true)

        try{

            const res = await api.post("/ai/ask", { question })

            const aiMessage = { role:"ai", text:res.data.answer || "No response received." }

            setMessages(prev => [...prev,aiMessage])

        }catch(err){

            setMessages(prev => [
                ...prev,
                {role:"ai",text:"⚠ AI service unavailable"}
            ])

        }

        setLoading(false)
        setQuestion("")
    }

    return(

        <>
            {/* Floating Button */}
            <button
                onClick={()=>setOpen(!open)}
                className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white w-14 h-14 rounded-full shadow-xl text-xl hover:scale-110 transition"
            >
                🤖
            </button>

            {/* Chat Box */}
            {open && (

                <div className="fixed bottom-24 right-6 w-80 h-[420px] bg-white shadow-2xl rounded-xl flex flex-col overflow-hidden">

                    {/* Top Bar */}
                    <div className="flex justify-between items-center bg-purple-600 text-white px-3 py-2 text-sm font-semibold">
                        🤖 {t("aiTeacher")}
                        <button onClick={()=>setOpen(false)}>✕</button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">

                        {messages.map((msg,i)=>(
                            <div
                                key={i}
                                className={`p-2 rounded-lg max-w-[80%] ${
                                    msg.role === "user"
                                        ? "ml-auto bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-800"
                                }`}
                            >
                                {msg.text}
                            </div>
                        ))}

                        {loading && (
                            <div className="text-gray-500 text-xs">
                                {t("aiThinking")}
                            </div>
                        )}

                        <div ref={chatEndRef}></div>

                    </div>

                    {/* Input Area */}
                    <div className="border-t p-2 flex gap-2">

                        <input
                            value={question}
                            onChange={(e)=>setQuestion(e.target.value)}
                            onKeyDown={(e)=>e.key==="Enter" && askTeacher()}
                            placeholder={t("askQuestion")}
                            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />

                        <button
                            onClick={askTeacher}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded text-sm"
                        >
                            {t("ask")}
                        </button>

                    </div>

                </div>

            )}

        </>

    )
}