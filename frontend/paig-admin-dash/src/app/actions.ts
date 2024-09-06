'use server'

import { revalidatePath } from 'next/cache'
import { cache } from 'react'
import { unkey, uk_api_id } from '@/lib/unkey'
const API_URL = process.env.M2M_API_URL ?? ''
const AUTH0_CLIENT_ID = process.env.M2M_AUTH0_CLIENT_ID ?? ''
const AUTH0_CLIENT_SECRET = process.env.M2M_AUTH0_CLIENT_SECRET ?? ''
const AUTH0_AUDIENCE = process.env.M2M_AUTH0_AUDIENCE ?? ''
const AUTH0_TOKEN_URL = process.env.M2M_AUTH0_TOKEN_URL ?? ''

export interface User {
  _id: string
  username: string
  email: string
  createdAt: string | null
  updatedAt: string | null
}

export interface AiModel {
  id: string
  owner: "OpenAI" | "AzureOpenAI" | "Anthropic" | "Google"
}

export interface TokenBucket {
  _id: string
  applicable_ai_model_ids: string[]
  applicable_user_name: string
  window_duration_mins: number
  max_tokens_within_window: number
  type: "api-access" | "ui-access"
  createdAt: string | null
  updatedAt: string | null
}

export interface RequestUsageLog {
  _id: string
  ai_model_id: string
  applicable_token_bucket_id: string
  tokens_input: number
  tokens_output: number
  request_completed: boolean
  createdAt: string | null
  updatedAt: string | null
}
declare global {
  let authToken: string | undefined;
  let authTokenTime: number | undefined;
}
const CACHE_EXPIRY_MS = 3600000 * 12; // 12 hours

let authToken: string | undefined;
let authTokenTime: number | undefined;

const getAuthToken = cache(async () => {
  const now = Date.now();

  if (authToken && authTokenTime && now - authTokenTime < CACHE_EXPIRY_MS) {
    return authToken;
  }

  const response = await fetch(AUTH0_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: AUTH0_AUDIENCE,
      grant_type: 'client_credentials'
    })
  });
  const data = await response.json();
  const token = data.access_token;

  authToken = token;
  authTokenTime = now;

  return token;
});

export async function getUsers(): Promise<User[]> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  const users = await response.json()
  return users.body
}

export async function getModels(): Promise<AiModel[]> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/models?`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  })
  const models = await response.json()
  return models.data
}

export async function getTokenBuckets(): Promise<TokenBucket[]> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/token-buckets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  const tokenBuckets = await response.json()
  return tokenBuckets.body
}

export async function createUser(formData: FormData): Promise<User> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username: formData.get('username'),
      email: formData.get('email')
    })
  })
  const newUser = await response.json()
  revalidatePath('/admin')
  return newUser
}

export async function updateUser(userId: string, formData: FormData): Promise<User> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username: formData.get('username'),
      email: formData.get('email')
    })
  })
  const updatedUser = await response.json()
  revalidatePath('/admin')
  return updatedUser
}

export async function deleteUser(userId: string): Promise<void> {
  const token = await getAuthToken()
  await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  revalidatePath('/admin')
}

export async function createModel(formData: FormData): Promise<AiModel> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      provider_id: formData.get('provider_id'),
      provider: formData.get('provider')
    })
  })
  const newModel = await response.json()
  revalidatePath('/admin')
  return newModel
}

export async function updateModel(modelId: string, formData: FormData): Promise<AiModel> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/models/${modelId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      provider_id: formData.get('provider_id'),
      provider: formData.get('provider')
    })
  })
  const updatedModel = await response.json()
  revalidatePath('/admin')
  return updatedModel
}

export async function deleteModel(modelId: string): Promise<void> {
  const token = await getAuthToken()
  await fetch(`${API_URL}/models/${modelId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  revalidatePath('/admin')
}

export async function createTokenBucket(formData: FormData): Promise<TokenBucket> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/token-buckets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      applicable_ai_model_ids: formData.getAll('applicable_ai_model_ids') as string[],
      applicable_user_name: formData.get('applicable_user_name') as string,
      window_duration_mins: parseInt(formData.get('window_duration_mins') as string),
      max_tokens_within_window: parseInt(formData.get('max_tokens_within_window') as string),
      type: formData.get('type') as string
    })
  })
  const newTokenBucket = await response.json()
  revalidatePath('/admin')
  return newTokenBucket
}

export async function updateTokenBucket(bucketId: string, formData: FormData): Promise<TokenBucket> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/token-buckets/${bucketId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      applicable_ai_model_ids: formData.getAll('applicable_ai_model_ids'),
      applicable_user_name: formData.get('applicable_user_name'),
      window_duration_mins: parseInt(formData.get('window_duration_mins') as string),
      max_tokens_within_window: parseInt(formData.get('max_tokens_within_window') as string),
      type: formData.get('type')
    })
  })
  const updatedTokenBucket = await response.json()
  revalidatePath('/admin')
  return updatedTokenBucket
}

export async function deleteTokenBucket(bucketId: string): Promise<void> {
  const token = await getAuthToken()
  await fetch(`${API_URL}/token-buckets/${bucketId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  revalidatePath('/admin')
}

export async function getUsageLogs(): Promise<RequestUsageLog[]> {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/usage-logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  const usageLogs = await response.json()
  return usageLogs.body
}

export async function getKey(username: string, name: string): Promise<string> {
  return await unkey.keys.create(
    {
        apiId: uk_api_id,
        prefix: 'proj',
        ownerId: username,
        name: name,
    }
  ).then((key) => key.result?.key || 'An error occurred');
}

export async function getIssuedKeys(username: string) {
  const keyDescs = await unkey.apis.listKeys(
    {
      apiId: uk_api_id,
      ownerId: username,
    }
  );
  return keyDescs.result!
}

export async function deleteKey(keyId: string) {
  await unkey.keys.delete({ keyId });
} 