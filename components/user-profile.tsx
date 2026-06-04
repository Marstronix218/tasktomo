"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, User, CreditCard, MessageSquare, UserX, Save, AlertTriangle, Volume2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface UserInfo {
  username: string
  email: string
  plan: "Free" | "Premium"
  avatar: string
  messageCount: { [key: number]: number }
}

interface UserProfileProps {
  userInfo: UserInfo
  onBack: () => void
  onUpdateUsername: (username: string) => void
  onCancelPremium: () => void
  onDeleteAccount: () => void
  onSendFeedback: (feedback: string) => void
  soundEnabled: boolean
  onToggleSound: (enabled: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function UserProfile({
  userInfo,
  onBack,
  onUpdateUsername,
  onCancelPremium,
  onDeleteAccount,
  onSendFeedback,
  soundEnabled,
  onToggleSound,
  sidebarOpen,
  setSidebarOpen,
}: UserProfileProps) {
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState(userInfo.username)
  const [feedback, setFeedback] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleSaveUsername = () => {
    if (newUsername.trim()) {
      onUpdateUsername(newUsername.trim())
      setEditingUsername(false)
    }
  }

  const handleSendFeedback = () => {
    if (feedback.trim()) {
      onSendFeedback(feedback.trim())
      setFeedback("")
    }
  }

  return (
    <div className="p-6 min-h-screen bg-black overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2 text-white">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Information */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={userInfo.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400">Username:</span>
                  {editingUsername ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter username"
                      />
                      <Button onClick={handleSaveUsername} size="sm">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => setEditingUsername(false)} variant="ghost" size="sm">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{userInfo.username}</span>
                      <Button onClick={() => setEditingUsername(true)} variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{userInfo.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Volume2 className="w-5 h-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Sound effects</p>
                <p className="text-gray-400 text-sm">Play sounds on completions and celebrations.</p>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={onToggleSound} />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Management */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Current Plan</p>
                <p className="text-gray-400 text-sm">
                  {userInfo.plan === "Premium" ? "Premium - $15/month" : "Free Plan"}
                </p>
              </div>
              <Badge variant={userInfo.plan === "Premium" ? "default" : "outline"}>{userInfo.plan}</Badge>
            </div>

            {userInfo.plan === "Premium" && (
              <div className="pt-4 border-t border-gray-700">
                {showCancelConfirm ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Are you sure you want to cancel your Premium plan?</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={onCancelPremium} variant="destructive" size="sm">
                        Yes, Cancel Premium
                      </Button>
                      <Button onClick={() => setShowCancelConfirm(false)} variant="ghost" size="sm">
                        Keep Premium
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowCancelConfirm(true)}
                    variant="outline"
                    className="text-red-400 border-red-400"
                  >
                    Cancel Premium Plan
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Feedback */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <MessageSquare className="w-5 h-5" />
              Send Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Share your thoughts, suggestions, or report issues..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              rows={4}
            />
            <Button
              onClick={handleSendFeedback}
              disabled={!feedback.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Send Feedback
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-gray-800 border-red-500/50 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <UserX className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-white font-medium">Delete Account</p>
              <p className="text-gray-400 text-sm">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>

            {showDeleteConfirm ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">This will permanently delete your account and all data!</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={onDeleteAccount} variant="destructive" size="sm">
                    Yes, Delete Account
                  </Button>
                  <Button onClick={() => setShowDeleteConfirm(false)} variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive">
                Delete Account
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
