'use client'

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Copy, CheckCircle } from 'lucide-react'
import { User } from '../app/actions'
import { getKey } from '../app/actions'

interface ApiKeyGeneratorProps {
  users: User[];
}

export function ApiKeyGenerator({ users = [] }: ApiKeyGeneratorProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyName, setApiKeyName] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generateApiKey = useCallback(async () => {
    if (!selectedUserId) {
      setError('Please select a user')
      return
    }
    if (!apiKeyName) {
      setError('Please enter a name for the API key')
      return
    }
    
    const selectedUser = users.find(user => user._id === selectedUserId)
    if (!selectedUser) {
      setError('Invalid user selection')
      return
    }

    const key = await getKey(selectedUser.username, apiKeyName)
    
    setApiKey(key)
    setError('')
  }, [selectedUserId, apiKeyName, users])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
<Card className="w-full max-w-md mx-auto">
  <CardHeader>
    <CardTitle>Generate API Key</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="space-y-2">
        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(users) && users.map((user) => (
              <SelectItem key={user._id} value={user._id}>
                {user.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Enter a name for the API key"
          onChange={(e) => setApiKeyName(e.target.value)}
          value={apiKeyName}
        />
      </div>
      {error && (
        <div className="text-red-500 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {apiKey && (
        <div className="p-3 bg-gray-100 rounded-md break-all">
          <p className="font-mono text-sm">{apiKey}</p>
        </div>
      )}
    </div>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button onClick={generateApiKey}>Generate API Key</Button>
    {apiKey && (
      <Button variant="outline" onClick={copyToClipboard}>
        {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
        <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
      </Button>
    )}
  </CardFooter>
</Card>
  )
}