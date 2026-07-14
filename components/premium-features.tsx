"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Users, MessageCircle, Palette, Check, X } from "lucide-react"

interface PremiumFeaturesProps {
  userPlan: "Free" | "Premium"
  onUpgrade: () => void
}

export default function PremiumFeatures({ userPlan, onUpgrade }: PremiumFeaturesProps) {
  const [showCustomCharacter, setShowCustomCharacter] = useState(false)
  const [customCharacter, setCustomCharacter] = useState({
    name: "",
    avatar: "🤖",
    personality: "",
    description: "",
    prompt: "",
  })

  const features = [
    {
      name: "Available Characters",
      free: "Up to 5",
      premium: "All 10 unlocked",
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: "Active Companions",
      free: "Up to 3",
      premium: "Up to 5",
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: "Group Chat",
      free: "Not Available",
      premium: "Chat with 3 companions",
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      name: "Daily Messages",
      free: "20 per companion",
      premium: "Unlimited",
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      name: "Custom Character",
      free: "Not Available",
      premium: "Create 1 custom companion",
      icon: <Palette className="w-5 h-5" />,
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Crown className="w-5 h-5 text-yellow-400" />
            Premium Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-purple-400">{feature.icon}</div>
                  <span className="text-white font-medium">{feature.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <Badge variant="outline" className="text-gray-400 border-gray-500">
                      Free
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">{feature.free}</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-purple-600 text-white">Premium</Badge>
                    <p className="text-xs text-purple-400 mt-1">{feature.premium}</p>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center">
                    {userPlan === "Premium" ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <X className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {userPlan === "Free" && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg border border-purple-500/30">
              <h3 className="text-white font-semibold mb-2">Upgrade to Premium</h3>
              <p className="text-gray-300 text-sm mb-4">
                Unlock all characters, unlimited messaging, group chats, and create your own custom companion!
              </p>
              <Button disabled className="w-full bg-purple-600 opacity-70">
                <Crown className="w-4 h-4 mr-2" />
                Coming soon — $15/month
              </Button>
            </div>
          )}

          {userPlan === "Premium" && (
            <div className="mt-6 p-4 bg-green-600/20 rounded-lg border border-green-500/30">
              <h3 className="text-white font-semibold mb-2">Premium Active!</h3>
              <p className="text-gray-300 text-sm">
                You can now create custom characters from the Characters page and enjoy all premium features!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
