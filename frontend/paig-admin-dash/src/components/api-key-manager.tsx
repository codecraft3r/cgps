"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Key, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getIssuedKeys, deleteKey, User } from "@/app/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function ApiKeyManager({users}: {users: User[]}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [apiKeys, setApiKeys] = useState<any[]>([])

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user)
    setApiKeys((await getIssuedKeys(user.username)).keys!)
  }

  const handleDeleteKey = async (keyId: string) => {
    deleteKey(keyId)
    setApiKeys(apiKeys.filter((key) => key.id !== keyId))
  }

  const handleToggleKey = (keyId: string) => {
    setApiKeys(
      apiKeys.map((key) =>
        key.id === keyId ? { ...key, isEnabled: !key.isEnabled } : key
      )
    )
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>API Key Manager</CardTitle>
        <CardDescription>Manage API keys for your users</CardDescription>
      </CardHeader>
      <CardContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedUser ? selectedUser.username : "Select a user"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            {users.map((user) => (
              <DropdownMenuItem key={user._id} onSelect={() => handleUserSelect(user)}>
                <Check
                  className={`mr-2 h-4 w-4 ${
                    selectedUser?._id === user._id ? "opacity-100" : "opacity-0"
                  }`}
                />
                {user.username}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedUser && (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>{apiKey.name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                      {apiKey.start}
                    </code>
                  </TableCell>
                  <TableCell>
                    {apiKey.expires ? apiKey.expires : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteKey(apiKey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete API key</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}