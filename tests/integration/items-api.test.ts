import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_EMAIL_1 = `test-user1-${Date.now()}@travelplanner.test`
const TEST_EMAIL_2 = `test-user2-${Date.now()}@travelplanner.test`
const TEST_PASSWORD = 'test-password-123'

let user1Id: string
let user2Id: string
let user1Client: ReturnType<typeof createClient>
let user2Client: ReturnType<typeof createClient>
let createdItemId: string

beforeAll(async () => {
  // Create two test users via admin API
  const { data: u1, error: e1 } = await adminClient.auth.admin.createUser({
    email: TEST_EMAIL_1,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (e1 || !u1.user) throw new Error(`Failed to create user 1: ${e1?.message}`)
  user1Id = u1.user.id

  const { data: u2, error: e2 } = await adminClient.auth.admin.createUser({
    email: TEST_EMAIL_2,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (e2 || !u2.user) throw new Error(`Failed to create user 2: ${e2?.message}`)
  user2Id = u2.user.id

  // Sign in as each user with anon client
  user1Client = createClient(SUPABASE_URL, ANON_KEY)
  user2Client = createClient(SUPABASE_URL, ANON_KEY)

  const { error: s1 } = await user1Client.auth.signInWithPassword({ email: TEST_EMAIL_1, password: TEST_PASSWORD })
  if (s1) throw new Error(`User 1 sign-in failed: ${s1.message}`)

  const { error: s2 } = await user2Client.auth.signInWithPassword({ email: TEST_EMAIL_2, password: TEST_PASSWORD })
  if (s2) throw new Error(`User 2 sign-in failed: ${s2.message}`)
})

afterAll(async () => {
  // Clean up test users
  if (user1Id) await adminClient.auth.admin.deleteUser(user1Id)
  if (user2Id) await adminClient.auth.admin.deleteUser(user2Id)
})

describe('items table — RLS and data layer', () => {
  it('user 1 can insert an item', async () => {
    const { data, error } = await user1Client
      .from('items')
      .insert({
        name: 'Nobu Tokyo',
        category: 'restaurant',
        destination: 'Tokyo, Japan',
        status: 'wishlist',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.name).toBe('Nobu Tokyo')
    expect(data!.category).toBe('restaurant')
    expect(data!.user_id).toBe(user1Id)
    createdItemId = data!.id
  })

  it('user 1 can read their own items', async () => {
    const { data, error } = await user1Client.from('items').select('*')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    expect(data!.every((item) => item.user_id === user1Id)).toBe(true)
  })

  it('user 2 cannot read user 1 items (RLS enforcement)', async () => {
    const { data, error } = await user2Client.from('items').select('*')
    expect(error).toBeNull()
    // User 2 has no items — RLS filters out user 1's rows
    expect(data).toEqual([])
  })

  it('user 2 cannot read a specific user 1 item by id', async () => {
    const { data, error } = await user2Client
      .from('items')
      .select('*')
      .eq('id', createdItemId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('user 2 can insert their own item', async () => {
    const { data, error } = await user2Client
      .from('items')
      .insert({
        name: 'Eiffel Tower',
        category: 'place',
        destination: 'Paris, France',
        status: 'wishlist',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data!.user_id).toBe(user2Id)
  })

  it('user 1 only sees their own items (not user 2 items)', async () => {
    const { data } = await user1Client.from('items').select('*')
    expect(data!.every((item) => item.user_id === user1Id)).toBe(true)
  })
})
