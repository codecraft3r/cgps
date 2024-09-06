'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createUser, updateUser, deleteUser, createModel, updateModel, deleteModel, createTokenBucket, updateTokenBucket, deleteTokenBucket, getUsageLogs, getUsers, getModels, getTokenBuckets } from "../app/actions"
import { User, AiModel, TokenBucket, RequestUsageLog } from "../app/actions"
import { useRouter } from "next/navigation"

// Enum for AI providers
enum AiProvider {
  OpenAI = "OpenAI",
  AzureOpenAI = "AzureOpenAI",
  Anthropic = "Anthropic",
  Google = "Google"
}

export function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [models, setModels] = useState<AiModel[]>([])
  const [tokenBuckets, setTokenBuckets] = useState<TokenBucket[]>([])
  const [usageLogs, setUsageLogs] = useState<RequestUsageLog[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      await getUsageLogs().then(logs => setUsageLogs(logs))
      await getUsers().then(users => setUsers(users))
      await getModels().then(models => setModels(models))
      await getTokenBuckets().then(tokenBuckets => setTokenBuckets(tokenBuckets))
    }
    fetchData()
  }, [])

  const handleCreateUser = async (formData: FormData) => {
    const newUser = await createUser(formData)
    setUsers([...users, newUser])
    router.refresh()
  }

  const handleUpdateUser = async (userId: string, formData: FormData) => {
    const updatedUser = await updateUser(userId, formData)
    setUsers(users.map(user => user._id === userId ? updatedUser : user))
    router.refresh()
  }

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId)
    setUsers(users.filter(user => user._id !== userId))
    router.refresh()
  }

  const handleCreateModel = async (formData: FormData) => {
    const newModel = await createModel(formData)
    setModels([...models, newModel])
    router.refresh()
  }

  const handleUpdateModel = async (modelId: string, formData: FormData) => {
    const updatedModel = await updateModel(modelId, formData)
    setModels(models.map(model => model.id === modelId ? updatedModel : model))
    router.refresh()
  }

  const handleDeleteModel = async (modelId: string) => {
    await deleteModel(modelId)
    setModels(models.filter(model => model.id !== modelId))
    router.refresh()
  }

  const handleCreateTokenBucket = async (formData: FormData) => {
    const newTokenBucket = await createTokenBucket(formData)
    setTokenBuckets([...tokenBuckets, newTokenBucket])
    router.refresh()
  }

  const handleUpdateTokenBucket = async (bucketId: string, formData: FormData) => {
    const updatedTokenBucket = await updateTokenBucket(bucketId, formData)
    setTokenBuckets(tokenBuckets.map(bucket => bucket._id === bucketId ? updatedTokenBucket : bucket))
    router.refresh()
  }

  const handleDeleteTokenBucket = async (bucketId: string) => {
    await deleteTokenBucket(bucketId)
    setTokenBuckets(tokenBuckets.filter(bucket => bucket._id !== bucketId))
    router.refresh()
  }

  const calculateCost = (tokens: number) => {
    // This is a simplified cost calculation. Adjust as needed.
    return (tokens / 1000) * 0.02 // Assuming $0.02 per 1K tokens
  }

  return (
    <div className="container mx-auto bg-white rounded-xl text-black p-4">
      <h1 className="text-2xl font-bold mb-4">AI Admin Dashboard</h1>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="audit">Cost Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <form action={handleCreateUser} className="space-y-4 mb-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit">Add User</Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(users) && users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit User</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault()
                          handleUpdateUser(user._id, new FormData(e.currentTarget))
                        }} className="space-y-4">
                          <div>
                            <Label htmlFor="edit-username">Username</Label>
                            <Input id="edit-username" name="username" defaultValue={user.username} required />
                          </div>
                          <div>
                            <Label htmlFor="edit-email">Email</Label>
                            <Input id="edit-email" name="email" type="email" defaultValue={user.email} required />
                          </div>
                          <Button type="submit">Update User</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user._id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="models">
          <form action={handleCreateModel} className="space-y-4 mb-4">
            <div>
              <Label htmlFor="provider_id">Provider ID</Label>
              <Input id="provider_id" name="provider_id" required />
            </div>
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select name="provider" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AiProvider).map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Add Model</Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(models) && models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>{model.id}</TableCell>
                  <TableCell>{model.owner}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Model</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault()
                          handleUpdateModel(model.id, new FormData(e.currentTarget))
                        }} className="space-y-4">
                          <div>
                            <Label htmlFor="edit-provider_id">Provider ID</Label>
                            <Input id="edit-provider_id" name="provider_id" defaultValue={model.id} required />
                          </div>
                          <div>
                            <Label htmlFor="edit-provider">Provider</Label>
                            <Select name="provider" defaultValue={model.owner}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(AiProvider).map((provider) => (
                                  <SelectItem key={provider} value={provider}>
                                    {provider}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit">Update Model</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteModel(model.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="limits">
          <form action={handleCreateTokenBucket} className="space-y-4 mb-4">
            <div>
              <Label htmlFor="applicable_ai_model_ids">Applicable AI Models</Label>
              <Select name="applicable_ai_model_ids" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI models" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(models) && models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id} ({model.owner})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="applicable_user_name">Applicable Username</Label>
              <Select name="applicable_user_name" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(users) && users.map((user) => (
                    <SelectItem key={user._id} value={user.username}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="window_duration_mins">Window Duration (minutes)</Label>
              <Input id="window_duration_mins" name="window_duration_mins" type="number" required />
            </div>
            <div>
              <Label htmlFor="max_tokens_within_window">Max Tokens Within Window</Label>
              <Input id="max_tokens_within_window" name="max_tokens_within_window" type="number" required />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api-access">API Access</SelectItem>
                  <SelectItem value="ui-access">UI Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Add Token Bucket</Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Model IDs</TableHead>
                <TableHead>Window (mins)</TableHead>
                <TableHead>Max Tokens</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(tokenBuckets) && tokenBuckets.map((bucket) => (
                <TableRow key={bucket._id}>
                  <TableCell>{bucket.applicable_user_name}</TableCell>
                  <TableCell>{bucket.applicable_ai_model_ids.join(", ")}</TableCell>
                  <TableCell>{bucket.window_duration_mins}</TableCell>
                  <TableCell>{bucket.max_tokens_within_window}</TableCell>
                  <TableCell>{bucket.type}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Token Bucket</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault()
                          handleUpdateTokenBucket(bucket._id, new FormData(e.currentTarget))
                        }} className="space-y-4">
                          <div>
                            <Label htmlFor="edit-applicable_ai_model_ids">Applicable AI Models</Label>
                            <Select name="applicable_ai_model_ids" defaultValue={`${bucket.applicable_ai_model_ids.map(provider_id => provider_id.toString())}`}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select AI models" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(models) && models.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.id} ({model.owner})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="edit-applicable_user_name">Applicable Username</Label>
                            <Select name="applicable_user_name" defaultValue={bucket.applicable_user_name}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a user" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(users) && users.map((user) => (
                                  <SelectItem key={user._id} value={user.username}>
                                    {user.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="edit-window_duration_mins">Window Duration (minutes)</Label>
                            <Input id="edit-window_duration_mins" name="window_duration_mins" type="number" defaultValue={bucket.window_duration_mins} required />
                          </div>
                          <div>
                            <Label htmlFor="edit-max_tokens_within_window">Max Tokens Within Window</Label>
                            <Input id="edit-max_tokens_within_window" name="max_tokens_within_window" type="number" defaultValue={bucket.max_tokens_within_window} required />
                          </div>
                          <div>
                            <Label htmlFor="edit-type">Type</Label>
                            <Select name="type" defaultValue={bucket.type}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="api-access">API Access</SelectItem>
                                <SelectItem value="ui-access">UI Access</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit">Update Token Bucket</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTokenBucket(bucket._id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="audit">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Token Bucket</TableHead>
                <TableHead>Input Tokens</TableHead>
                <TableHead>Output Tokens</TableHead>
                <TableHead>Total Tokens</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(usageLogs) && usageLogs.map((log) => {
                const totalTokens = log.tokens_input + log.tokens_output
                const estimatedCost = calculateCost(totalTokens)
                return (
                  <TableRow key={log._id}>
                    <TableCell>{log.ai_model_id}</TableCell>
                    <TableCell>{log.applicable_token_bucket_id}</TableCell>
                    <TableCell>{log.tokens_input}</TableCell>
                    <TableCell>{log.tokens_output}</TableCell>
                    <TableCell>{totalTokens}</TableCell>
                    <TableCell>${estimatedCost.toFixed(4)}</TableCell>
                    <TableCell>{log.request_completed ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  )
}