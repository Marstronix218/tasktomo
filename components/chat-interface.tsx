"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { callOpenAI, createCharacterPrompt } from "@/lib/openai"
import { ArrowLeft, Send, MoreVertical, Heart, Zap, Menu, X, Target } from "lucide-react"

interface Message {
  id: number
  text: string
  sender: "user" | "character"
  timestamp: Date
  type?: "text" | "reward" | "system"
  xpReward?: number
}

interface Character {
  id: number
  name: string
  avatar: string
  level: number
  personality: string
  description: string
  bondLevel: number
  maxBond: number
  prompt: string
  lastMessage?: string
  xp: number
  tasksCompleted: number
}

interface Todo {
  id: number
  text: string
  completed: boolean
  xp: number
  category: string
  difficulty: "Easy" | "Medium" | "Hard"
  assignedCharacterId?: number
}

interface ChatInterfaceProps {
  character: Character
  onBack: () => void
  chatHistory: Message[]
  onUpdateChatHistory: (messages: Message[]) => void
  onUpdateBondLevel: (increment: number) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  userTasks: Todo[]
  userPlan: "Free" | "Premium"
  userInfo?: { username: string; email: string; plan: "Free" | "Premium"; avatar: string }
  personaHint?: string
  initialDraft?: string
}

export default function ChatInterface({
  character,
  onBack,
  chatHistory,
  onUpdateChatHistory,
  onUpdateBondLevel,
  sidebarOpen,
  setSidebarOpen,
  userTasks,
  userPlan,
  userInfo,
  personaHint,
  initialDraft,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(chatHistory)
  const [newMessage, setNewMessage] = useState(initialDraft ?? "")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  useEffect(() => setMessages(chatHistory), [chatHistory])

  // Seed the input with a draft passed in from the Home chat-launcher bar.
  useEffect(() => {
    if (initialDraft) setNewMessage(initialDraft)
  }, [initialDraft])

  useEffect(() => {
    if (chatHistory.length === 0) {
      const greeting: Message = {
        id: Date.now() + Math.random() * 1000,
        text: `Hi there! I'm ${character.name}. ${character.description} How can I help you stay productive today? 😊`,
        sender: "character",
        timestamp: new Date(),
      }
      setMessages([greeting])
      onUpdateChatHistory([greeting])
    }
  }, [character.id, chatHistory.length, character.name, character.description, onUpdateChatHistory])

  useEffect(scrollToBottom, [messages])

  const generateAIResponse = async (userText: string): Promise<string> => {
    try {
      // Include a short summary of outstanding tasks for context
      const pendingTasks = userTasks.filter((t) => !t.completed).slice(0, 5)
      const taskContext =
        pendingTasks.length > 0
          ? `Here are the user's remaining tasks:\n${pendingTasks.map((t) => `• ${t.text} [${t.category}]`).join("\n")}`
          : "The user currently has no outstanding tasks."

      // Create the base prompt
      const baseMessages = createCharacterPrompt(
        character.prompt,
        userInfo?.username || "User",
        taskContext,
        personaHint
      )

      // Add conversation history
      const conversationHistory = messages
        .filter((m) => m.type === "text")
        .slice(-10)
        .map((m) => ({
          role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }))

      // Add the current user message
      const allMessages = [...baseMessages, ...conversationHistory, { role: "user" as const, content: userText }]

      return await callOpenAI(allMessages, {
        maxTokens: 150,
        temperature: 0.8,
      })
    } catch (error) {
      console.error("Error calling OpenAI:", error)
      return "Sorry, something went wrong. 😅"
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    if (userPlan === "Free" && messages.filter((m) => m.sender === "user").length >= 20) {
      setNewMessage("")
      return
    }

    const userMsg: Message = {
      id: Date.now() + Math.random() * 1000,
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    onUpdateChatHistory(updated)
    setNewMessage("")
    setIsTyping(true)

    const aiText = await generateAIResponse(newMessage)

    const aiMsg: Message = {
      id: Date.now() + Math.random() * 1000 + 1000,
      text: aiText,
      sender: "character",
      timestamp: new Date(),
    }

    const finalMessages = [...updated, aiMsg]
    setMessages(finalMessages)
    onUpdateChatHistory(finalMessages)
    setIsTyping(false)

    if (Math.random() > 0.6) onUpdateBondLevel(0.1)
  }

  const quickActions = [
    "💪 Need motivation",
    "📝 Task help",
    "🎯 Set goals",
    "😴 Feeling tired",
    "🎉 Celebrate progress",
  ]

  // Get tasks assigned to this character
  const assignedTasks = userTasks.filter(task => task.assignedCharacterId === character.id && !task.completed)
  const assignedTaskTitles = assignedTasks.map(task => task.text)

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-3">
          <Avatar className="w-14 h-14">
            <AvatarImage src={character.avatar || "/placeholder.svg"} />
            <AvatarFallback className="text-xl">{character.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-white">{character.name}</h2>
            <p className="text-sm text-gray-400">{character.personality}</p>
            {assignedTasks.length > 0 && (
              <p className="text-xs text-blue-400 mt-1">
                Working on: {assignedTasks[0].text}
                {assignedTasks.length > 1 && ` (+${assignedTasks.length - 1} more)`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-4">
            <div className="flex items-center gap-1 text-sm text-white">
              <Heart className="w-4 h-4 text-pink-400" />
              <span>Bond L{Math.floor(character.bondLevel)}</span>
            </div>
            <Progress value={(character.bondLevel / character.maxBond) * 100} className="w-20 h-1 mt-1 bg-purple-950/50 [&>div]:bg-purple-500" />
          </div>
          <Button variant="ghost" size="sm" className="text-white">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Assigned Tasks Banner */}
      {assignedTasks.length > 0 && (
        <div className="sticky top-[88px] z-10 px-4 py-2 bg-blue-900/30 border-b border-blue-700/50">
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 font-medium">
              {assignedTasks.length} task{assignedTasks.length !== 1 ? "s" : ""} assigned to {character.name}
            </span>
            <span className="text-blue-400/70 text-xs">
              {assignedTaskTitles.slice(0, 2).join(", ")}
              {assignedTaskTitles.length > 2 && `, +${assignedTaskTitles.length - 2} more`}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-2 max-w-[80%] ${m.sender === "user" ? "flex-row-reverse" : ""}`}>
              {m.sender === "character" && (
                <Avatar className="w-10 h-10 mt-1">
                  <AvatarImage src={character.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-sm">{character.name[0]}</AvatarFallback>
                </Avatar>
              )}

              <div className="space-y-1">
                <div
                  className={`p-3 rounded-2xl ${
                    m.sender === "user"
                      ? "bg-purple-600 text-white"
                      : m.type === "reward"
                        ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-white"
                        : "bg-gray-700 text-white"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                  {m.xpReward && (
                    <div className="flex items-center gap-1 mt-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">+{m.xpReward} Bond Points</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 px-2">{formatTime(m.timestamp)}</p>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <Avatar className="w-10 h-10 mt-1">
                <AvatarImage src={character.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-sm">{character.name[0]}</AvatarFallback>
              </Avatar>
              <div className="bg-gray-700 p-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder={`Message ${character.name}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <Button onClick={sendMessage} size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {quickActions.map((qa) => (
            <Badge
              key={qa}
              variant="outline"
              className="cursor-pointer hover:bg-gray-600 text-gray-300 border-gray-500"
              onClick={() => setNewMessage(qa.replace(/^..?\s/, ""))}
            >
              {qa}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
