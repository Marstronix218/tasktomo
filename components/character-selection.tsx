"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Check, Plus, Upload } from "lucide-react"

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

interface CharacterSelectionProps {
  allCharacters: Character[]
  currentCompanions: Character[]
  onSelectCompanions: (companions: Character[]) => void
  onBack: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  userPlan: "Free" | "Premium"
}

export default function CharacterSelection({
  allCharacters,
  currentCompanions,
  onSelectCompanions,
  onBack,
  sidebarOpen,
  setSidebarOpen,
  userPlan,
}: CharacterSelectionProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>(currentCompanions)
  const [showCustomCharacter, setShowCustomCharacter] = useState(false)
  const [customCharacter, setCustomCharacter] = useState({
    name: "",
    avatar: "/placeholder.svg?height=80&width=80&text=Custom",
    personality: "",
    description: "",
    prompt: "",
  })

  const maxCompanions = userPlan === "Premium" ? 5 : 3

  const toggleCharacter = (character: Character) => {
    const isSelected = selectedCharacters.some((c) => c.id === character.id)

    if (isSelected) {
      setSelectedCharacters(selectedCharacters.filter((c) => c.id !== character.id))
    } else if (selectedCharacters.length < maxCompanions) {
      setSelectedCharacters([...selectedCharacters, character])
    } else {
      // Replace the first character if at max capacity
      setSelectedCharacters([...selectedCharacters.slice(1), character])
    }
  }

  const handleConfirm = () => {
    onSelectCompanions(selectedCharacters)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCustomCharacter({ ...customCharacter, avatar: e.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const createCustomCharacter = () => {
    if (customCharacter.name && customCharacter.personality && customCharacter.description) {
      const newCharacter: Character = {
        id: Date.now(),
        name: customCharacter.name,
        avatar: customCharacter.avatar,
        level: 1,
        personality: customCharacter.personality,
        description: customCharacter.description,
        bondLevel: 0,
        maxBond: 10,
        prompt:
          customCharacter.prompt ||
          `You are ${customCharacter.name}, a ${customCharacter.personality}. ${customCharacter.description}`,
        xp: 0,
        tasksCompleted: 0,
      }

      // Add to selected characters if there's room
      if (selectedCharacters.length < maxCompanions) {
        setSelectedCharacters([...selectedCharacters, newCharacter])
      } else {
        setSelectedCharacters([...selectedCharacters.slice(1), newCharacter])
      }

      // Reset form
      setCustomCharacter({
        name: "",
        avatar: "/placeholder.svg?height=80&width=80&text=Custom",
        personality: "",
        description: "",
        prompt: "",
      })
      setShowCustomCharacter(false)
    }
  }

  return (
    <div className="p-6 bg-black min-h-screen overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Choose Your Crew</h1>
            <p className="text-gray-400">Select up to {maxCompanions} companions to help you stay productive</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-white border-gray-500">
            {selectedCharacters.length}/{maxCompanions} Selected
          </Badge>
          {userPlan === "Premium" && (
            <Button
              onClick={() => setShowCustomCharacter(!showCustomCharacter)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Custom
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={selectedCharacters.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Confirm Selection
          </Button>
        </div>
      </div>

      {/* Custom Character Creation */}
      {showCustomCharacter && userPlan === "Premium" && (
        <Card className="bg-gray-800 border-gray-700 text-white mb-6">
          <CardHeader>
            <CardTitle className="text-white">Create Custom Character</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Name</label>
                <Input
                  value={customCharacter.name}
                  onChange={(e) => setCustomCharacter({ ...customCharacter, name: e.target.value })}
                  placeholder="Character name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Avatar</label>
                <div className="flex items-center gap-2">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={customCharacter.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{customCharacter.name[0] || "C"}</AvatarFallback>
                  </Avatar>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 text-white">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Personality</label>
              <Input
                value={customCharacter.personality}
                onChange={(e) => setCustomCharacter({ ...customCharacter, personality: e.target.value })}
                placeholder="e.g., Supportive Mentor, Playful Friend"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <Textarea
                value={customCharacter.description}
                onChange={(e) => setCustomCharacter({ ...customCharacter, description: e.target.value })}
                placeholder="Describe your character's role and traits"
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">AI Prompt (Optional)</label>
              <Textarea
                value={customCharacter.prompt}
                onChange={(e) => setCustomCharacter({ ...customCharacter, prompt: e.target.value })}
                placeholder="You are [name], a [personality]. You help users with..."
                className="bg-gray-700 border-gray-600 text-white"
                rows={4}
              />
            </div>

            <Button onClick={createCustomCharacter} className="w-full bg-green-600 hover:bg-green-700">
              Create Character
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allCharacters.map((character) => {
          const isSelected = selectedCharacters.some((c) => c.id === character.id)
          const isCurrentCompanion = currentCompanions.some((c) => c.id === character.id)

          return (
            <Card
              key={character.id}
              className={`bg-gray-800 border-gray-700 text-white cursor-pointer transition-all hover:scale-105 ${
                isSelected ? "ring-2 ring-purple-500 bg-gray-700" : ""
              }`}
              onClick={() => toggleCharacter(character)}
            >
              <CardHeader className="text-center pb-2">
                <div className="relative">
                  <Avatar className="w-28 h-28 mx-auto mb-3">
                    <AvatarImage src={character.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-3xl">{character.name[0]}</AvatarFallback>
                  </Avatar>
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg text-white">{character.name}</CardTitle>
                <p className="text-sm text-purple-400">{character.personality}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 mb-4 text-center">{character.description}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Level</span>
                    <span className="text-white">{character.level}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bond Level</span>
                    <span className="text-white">
                      {Math.floor(character.bondLevel)}/{character.maxBond}
                    </span>
                  </div>
                </div>

                {isCurrentCompanion && (
                  <Badge variant="outline" className="w-full mt-3 justify-center text-green-400 border-green-400">
                    Current Companion
                  </Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
