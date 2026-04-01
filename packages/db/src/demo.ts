import { createClient } from './client'
import {
  users,
  members,
} from './schema/core'
import {
  forumCategories,
  forumThreads,
  forumPosts,
  forumReactions,
} from './schema/forums'
import {
  ideas,
  ideaVotes,
  ideaComments,
} from './schema/ideas'
import {
  events,
  eventRsvps,
} from './schema/events'
import {
  courses,
  courseLessons,
  courseEnrollments,
} from './schema/courses'
import {
  webinars,
  webinarRegistrations,
} from './schema/webinars'
import {
  kbCategories,
  kbArticles,
} from './schema/kb'
import {
  chatChannels,
  chatMessages,
} from './schema/chat'
import {
  siKeywordGroups,
  siMentions,
  siAlerts,
} from './schema/social-intel'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// ---------------------------------------------------------------------------
// Helper to create a Supabase auth user
// ---------------------------------------------------------------------------
async function createAuthUser(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const data = (await res.json()) as { id?: string; message?: string; msg?: string }
  if (!data.id) {
    // user may already exist — try listing
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      },
    )
    const listData = (await listRes.json()) as { users?: { id: string; email: string }[] }
    const existing = listData.users?.find((u) => u.email === email)
    if (existing) return existing.id
    throw new Error(
      `Failed to create auth user ${email}: ${data.message ?? data.msg ?? JSON.stringify(data)}`,
    )
  }
  return data.id
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000)

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function seed() {
  const db = createClient(DATABASE_URL!)

  // -------------------------------------------------------------------------
  // Step 1: Create auth users
  // -------------------------------------------------------------------------
  console.log('Creating Supabase auth users...')
  const userDefs = [
    { email: 'admin@acme.com',  password: 'password123', displayName: 'Admin User',   role: 'org_admin'  as const, username: 'admin',  bio: 'Community admin and product evangelist at Acme.', avatar: 'admin'  },
    { email: 'sarah@acme.com',  password: 'password123', displayName: 'Sarah Chen',   role: 'moderator'  as const, username: 'sarah',  bio: 'Community moderator. Passionate about developer experience.', avatar: 'sarah'  },
    { email: 'alex@acme.com',   password: 'password123', displayName: 'Alex Rivera',  role: 'member'     as const, username: 'alex',   bio: 'Full-stack engineer, integration enthusiast.', avatar: 'alex'   },
    { email: 'maya@acme.com',   password: 'password123', displayName: 'Maya Patel',   role: 'member'     as const, username: 'maya',   bio: 'Head of Operations. Automates everything possible.', avatar: 'maya'   },
    { email: 'james@acme.com',  password: 'password123', displayName: 'James Okafor', role: 'member'     as const, username: 'james',  bio: 'Startup founder. Using OpenSourceCommunity to scale support.', avatar: 'james'  },
    { email: 'priya@acme.com',  password: 'password123', displayName: 'Priya Singh',  role: 'member'     as const, username: 'priya',  bio: 'Customer Success Manager. Loves webinars.', avatar: 'priya'  },
    { email: 'tom@acme.com',    password: 'password123', displayName: 'Tom Nguyen',   role: 'member'     as const, username: 'tom',    bio: 'Backend engineer, API power user.', avatar: 'tom'    },
    { email: 'guest@acme.com',  password: 'password123', displayName: 'Guest User',   role: 'guest'      as const, username: 'guest',  bio: 'Just exploring the community.', avatar: 'guest'  },
  ]

  const authIds: string[] = []
  for (const u of userDefs) {
    const id = await createAuthUser(u.email, u.password)
    authIds.push(id)
    console.log(`  ✓ ${u.email} → ${id}`)
  }

  // -------------------------------------------------------------------------
  // Step 2: Insert users rows
  // -------------------------------------------------------------------------
  console.log('Inserting users rows...')
  const userRows = userDefs.map((u, i) => ({
    id: authIds[i],
    email: u.email,
    displayName: u.displayName,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`,
  }))
  await db.insert(users).values(userRows).onConflictDoNothing()

  // -------------------------------------------------------------------------
  // Step 3: Insert members rows
  // -------------------------------------------------------------------------
  console.log('Inserting members rows...')
  const memberRows = userDefs.map((u, i) => ({
    tenantId: TENANT_ID,
    userId: authIds[i],
    role: u.role,
    displayName: u.displayName,
    username: u.username,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.avatar}`,
    bio: u.bio,
    socialHandles: u.username === 'admin'
      ? { twitter: '@acmecommunity', linkedin: 'acme-community' }
      : u.username === 'sarah'
      ? { twitter: '@sarahchen_dev', github: 'sarahchen' }
      : u.username === 'alex'
      ? { github: 'alexrivera', twitter: '@alexrivera_eng' }
      : u.username === 'maya'
      ? { linkedin: 'mayapatel-ops' }
      : u.username === 'james'
      ? { twitter: '@jamesokafor', linkedin: 'james-okafor' }
      : u.username === 'priya'
      ? { linkedin: 'priya-singh-cs', twitter: '@priyasingh_cs' }
      : u.username === 'tom'
      ? { github: 'tomnguyen', twitter: '@tomng_dev' }
      : {},
    lastActiveAt: daysAgo(Math.floor(Math.random() * 7)),
  }))
  const insertedMembers = await db
    .insert(members)
    .values(memberRows)
    .onConflictDoNothing()
    .returning({ id: members.id, userId: members.userId })

  // Build userId -> memberId map
  // Re-query to get member IDs reliably
  const { eq, inArray } = await import('drizzle-orm')
  const memberRecords = await db
    .select({ id: members.id, userId: members.userId })
    .from(members)
    .where(inArray(members.userId, authIds))
  const memberByUserId: Record<string, string> = {}
  for (const m of memberRecords) {
    memberByUserId[m.userId] = m.id
  }

  const [adminMId, sarahMId, alexMId, mayaMId, jamesMId, priyaMId, tomMId, guestMId] =
    authIds.map((uid) => memberByUserId[uid])

  console.log(`  Members: ${Object.keys(memberByUserId).length} found`)

  // -------------------------------------------------------------------------
  // Step 4: Forum categories
  // -------------------------------------------------------------------------
  console.log('Creating forum categories...')
  const [catAnnouncements, catGeneral, catHelp] = await db
    .insert(forumCategories)
    .values([
      {
        tenantId: TENANT_ID,
        name: 'Announcements',
        slug: 'announcements',
        description: 'Official announcements from the Acme team.',
        sortOrder: 0,
        visibility: 'members' as const,
      },
      {
        tenantId: TENANT_ID,
        name: 'General Discussion',
        slug: 'general',
        description: 'Chat about anything related to OpenSourceCommunity, integrations, and best practices.',
        sortOrder: 1,
        visibility: 'members' as const,
      },
      {
        tenantId: TENANT_ID,
        name: 'Help & Feedback',
        slug: 'help',
        description: 'Ask questions, report bugs, and share feedback.',
        sortOrder: 2,
        visibility: 'members' as const,
      },
    ])
    .onConflictDoNothing()
    .returning({ id: forumCategories.id })

  // If they already exist, fetch them
  const allCats = await db
    .select({ id: forumCategories.id, slug: forumCategories.slug })
    .from(forumCategories)
    .where(eq(forumCategories.tenantId, TENANT_ID))

  const catMap: Record<string, string> = {}
  for (const c of allCats) catMap[c.slug] = c.id
  const annCatId = catMap['announcements']
  const genCatId = catMap['general']
  const helpCatId = catMap['help']
  console.log(`  Categories: announcements=${annCatId?.slice(0,8)}, general=${genCatId?.slice(0,8)}, help=${helpCatId?.slice(0,8)}`)

  // -------------------------------------------------------------------------
  // Step 5: Forum threads & posts
  // -------------------------------------------------------------------------
  console.log('Creating forum threads and posts...')

  const richBody = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

  const threadDefs = [
    // Announcements
    {
      catId: annCatId, authorId: adminMId, isPinned: true, isFeatured: true,
      title: 'Welcome to the Acme Community!',
      body: richBody("We're thrilled to launch the official Acme community platform. This is your space to connect, share knowledge, get help, and influence our product roadmap. Introduce yourself below!"),
      createdAt: daysAgo(58),
      replies: [
        { authorId: sarahMId, body: richBody("So excited for this! I've been waiting for a dedicated space to connect with other Acme power users."), createdAt: daysAgo(57) },
        { authorId: alexMId, body: richBody("Great initiative. Already found the integrations section super useful."), createdAt: daysAgo(57) },
        { authorId: jamesMId, body: richBody("Just joined — loving the forum layout. Looking forward to connecting with everyone here."), createdAt: daysAgo(56) },
      ],
    },
    {
      catId: annCatId, authorId: adminMId, isPinned: true, isFeatured: false,
      title: 'Platform v2.1 is live — What\'s New',
      body: richBody("We've just shipped v2.1! Highlights: custom domain support is now GA, the Zapier integration is in beta, and we've improved notification delivery speed by 40%. Full changelog in the KB."),
      createdAt: daysAgo(14),
      replies: [
        { authorId: mayaMId, body: richBody("Custom domains finally! We've been waiting for this. Setting it up now."), createdAt: daysAgo(13) },
        { authorId: tomMId, body: richBody("The notification latency improvement is noticeable. Great work team."), createdAt: daysAgo(13) },
      ],
    },
    // General
    {
      catId: genCatId, authorId: alexMId, isPinned: false, isFeatured: true,
      title: 'How are you using the API to automate member onboarding?',
      body: richBody("We built a Zapier-style workflow that auto-invites new Salesforce contacts to the community when they become customers. Happy to share the code snippet. What are other people doing?"),
      createdAt: daysAgo(45),
      replies: [
        { authorId: mayaMId, body: richBody("We do something similar with HubSpot. When a deal closes, we trigger a webhook that calls the members API. Works great!"), createdAt: daysAgo(44) },
        { authorId: tomMId, body: richBody("Nice. We added a role assignment step — new customers get 'member' but churned accounts get downgraded to 'guest' automatically."), createdAt: daysAgo(44) },
        { authorId: jamesMId, body: richBody("This is gold. Do you have a sample payload for the member creation endpoint?"), createdAt: daysAgo(43) },
        { authorId: alexMId, body: richBody("@james Yes! { email, displayName, role, metadata: { sfAccountId } } — super simple."), createdAt: daysAgo(43) },
      ],
    },
    {
      catId: genCatId, authorId: priyaMId, isPinned: false, isFeatured: false,
      title: 'Tips for running a successful community webinar?',
      body: richBody("We're hosting our first community webinar next month. Any veterans here who can share what works? Especially around engagement during the session."),
      createdAt: daysAgo(38),
      replies: [
        { authorId: sarahMId, body: richBody("Start with a 5-min icebreaker poll. Warms people up and gives you data. We saw 3x more Q&A engagement when we did this."), createdAt: daysAgo(37) },
        { authorId: adminMId, body: richBody("Keep it under 45 minutes. Drop a resource link in chat at the halfway point. End with a clear CTA."), createdAt: daysAgo(37) },
        { authorId: priyaMId, body: richBody("Thank you both! Will definitely try the poll idea."), createdAt: daysAgo(36) },
      ],
    },
    {
      catId: genCatId, authorId: jamesMId, isPinned: false, isFeatured: false,
      title: 'Community-led growth: sharing our 3-month results',
      body: richBody("Three months in to running our community on OpenSourceCommunity. Key metrics: 430 active members, 62% monthly engagement rate, support ticket deflection up 34%. Happy to dig into specifics."),
      createdAt: daysAgo(30),
      replies: [
        { authorId: alexMId, body: richBody("34% ticket deflection is impressive. Which KB article categories drive the most self-serve resolution for you?"), createdAt: daysAgo(29) },
        { authorId: priyaMId, body: richBody("We're at 28% deflection after 2 months. Curious what your onboarding flow looks like."), createdAt: daysAgo(29) },
        { authorId: jamesMId, body: richBody("Getting Started articles + a pinned welcome thread. The welcome thread alone accounts for ~15% of deflection."), createdAt: daysAgo(28) },
      ],
    },
    {
      catId: genCatId, authorId: tomMId, isPinned: false, isFeatured: false,
      title: 'Comparing forum vs. chat for async Q&A',
      body: richBody("We used to use Slack for all community Q&A but migrated to forum threads. Finding that threads have a 5x longer shelf life. Anyone else made this switch?"),
      createdAt: daysAgo(22),
      replies: [
        { authorId: sarahMId, body: richBody("Yes! Forum threads are searchable and Google-indexed. Slack is a black hole. Best decision we made."), createdAt: daysAgo(21) },
        { authorId: mayaMId, body: richBody("We kept a #announcements channel in chat and moved all Q&A to forums. Clean separation."), createdAt: daysAgo(21) },
      ],
    },
    {
      catId: genCatId, authorId: mayaMId, isPinned: false, isFeatured: false,
      title: 'Best practices for segmenting your community by customer tier',
      body: richBody("We have free, pro, and enterprise tiers. Using custom roles to gate certain forum categories and courses. Here's our permission matrix if anyone wants to steal it."),
      createdAt: daysAgo(18),
      replies: [
        { authorId: adminMId, body: richBody("This is a great example of using the platform as intended. Would love to feature this in our next webinar!"), createdAt: daysAgo(17) },
        { authorId: alexMId, body: richBody("How do you handle tier upgrades mid-subscription? Do role changes propagate automatically?"), createdAt: daysAgo(17) },
        { authorId: mayaMId, body: richBody("We use a webhook from Stripe that calls the member update API. Instant role change."), createdAt: daysAgo(16) },
      ],
    },
    // Help & Feedback
    {
      catId: helpCatId, authorId: alexMId, isPinned: false, isFeatured: false,
      title: 'API rate limits hitting during bulk imports',
      body: richBody("Getting 429s when importing members in bulk. We have ~2000 members to migrate. Is there a batch endpoint or a way to request higher limits?"),
      createdAt: daysAgo(40),
      replies: [
        { authorId: adminMId, body: richBody("Hey Alex — reach out to support for a temporary rate limit increase. We also have a batch /members/bulk endpoint coming in v2.2."), createdAt: daysAgo(39) },
        { authorId: tomMId, body: richBody("I hit this too. Workaround: add a 100ms delay between requests and process in batches of 50. Stays well under limits."), createdAt: daysAgo(39) },
        { authorId: alexMId, body: richBody("Thanks both! Tom's workaround got me through. Looking forward to the bulk endpoint."), createdAt: daysAgo(38) },
      ],
    },
    {
      catId: helpCatId, authorId: priyaMId, isPinned: false, isFeatured: false,
      title: 'Webinar recording not showing up after upload',
      body: richBody("Uploaded a recording 48 hours ago but it's still showing 'processing'. Is there a size limit or a known delay?"),
      createdAt: daysAgo(28),
      replies: [
        { authorId: sarahMId, body: richBody("Hi Priya! Videos over 2GB can take up to 72 hours. What's the file size?"), createdAt: daysAgo(27) },
        { authorId: priyaMId, body: richBody("It was 3.1GB. That explains it! Just saw it go live. Thanks Sarah!"), createdAt: daysAgo(26) },
      ],
    },
    {
      catId: helpCatId, authorId: jamesMId, isPinned: false, isFeatured: false,
      title: 'Feature request: better email digest controls',
      body: richBody("Would love to be able to configure digest frequency per-category. Right now it's all-or-nothing per user. E.g., immediate notifications for announcements, weekly digest for general."),
      createdAt: daysAgo(20),
      replies: [
        { authorId: mayaMId, body: richBody("+1 to this. We had members unsubscribe from everything because general was too noisy."), createdAt: daysAgo(19) },
        { authorId: adminMId, body: richBody("Great feedback! I've escalated this to our product team. Check the Ideas board — I'd vote for it there too so we can track demand."), createdAt: daysAgo(19) },
        { authorId: tomMId, body: richBody("Already voted. This would be a huge quality-of-life improvement."), createdAt: daysAgo(18) },
      ],
    },
    {
      catId: helpCatId, authorId: tomMId, isPinned: false, isFeatured: false,
      title: 'How to embed a KB article in a forum post?',
      body: richBody("Tried pasting a KB link in a thread body but it just renders as plain text. Is there a way to get a rich embed/preview?"),
      createdAt: daysAgo(12),
      replies: [
        { authorId: sarahMId, body: richBody("Use /embed command in the rich text editor and paste the KB URL. It'll pull in the article title and excerpt."), createdAt: daysAgo(11) },
        { authorId: tomMId, body: richBody("Perfect, that worked! Wish this was documented better — maybe a KB article on using the editor?"), createdAt: daysAgo(11) },
      ],
    },
    {
      catId: helpCatId, authorId: guestMId, isPinned: false, isFeatured: false,
      title: 'Can guests access the Getting Started course?',
      body: richBody("I'm a guest user. I can see the course listed but get an access error when I try to enroll. Is this expected?"),
      createdAt: daysAgo(5),
      replies: [
        { authorId: adminMId, body: richBody("Hi! Yes, by default courses require 'member' role or above. Ask your community admin to upgrade your access. Alternatively, admins can set specific courses to allow guest access."), createdAt: daysAgo(4) },
        { authorId: guestMId, body: richBody("Thanks for the quick reply! I'll reach out to my admin."), createdAt: daysAgo(4) },
      ],
    },
  ]

  const insertedThreadIds: string[] = []
  for (const t of threadDefs) {
    if (!t.catId) continue
    const [thread] = await db
      .insert(forumThreads)
      .values({
        tenantId: TENANT_ID,
        categoryId: t.catId,
        authorId: t.authorId,
        title: t.title,
        body: t.body,
        isPinned: t.isPinned,
        isFeatured: t.isFeatured,
        viewCount: Math.floor(Math.random() * 300) + 50,
        replyCount: t.replies.length,
        lastActivityAt: t.replies.length > 0 ? t.replies[t.replies.length - 1].createdAt : t.createdAt,
        createdAt: t.createdAt,
        status: 'open' as const,
      })
      .onConflictDoNothing()
      .returning({ id: forumThreads.id })

    if (!thread) continue
    insertedThreadIds.push(thread.id)

    // Insert the OP as a post
    const [opPost] = await db
      .insert(forumPosts)
      .values({
        tenantId: TENANT_ID,
        threadId: thread.id,
        authorId: t.authorId,
        body: t.body,
        depth: 0,
        createdAt: t.createdAt,
      })
      .onConflictDoNothing()
      .returning({ id: forumPosts.id })

    // Add a reaction to the OP
    if (opPost) {
      await db.insert(forumReactions).values({
        tenantId: TENANT_ID,
        postId: opPost.id,
        memberId: t.authorId === adminMId ? sarahMId : adminMId,
        emoji: '👍',
        createdAt: t.createdAt,
      }).onConflictDoNothing()
    }

    // Insert replies
    for (const r of t.replies) {
      await db
        .insert(forumPosts)
        .values({
          tenantId: TENANT_ID,
          threadId: thread.id,
          authorId: r.authorId,
          body: r.body,
          depth: 1,
          createdAt: r.createdAt,
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${insertedThreadIds.length} threads`)

  // -------------------------------------------------------------------------
  // Step 6: Ideas
  // -------------------------------------------------------------------------
  console.log('Creating ideas...')

  const ideaDefs = [
    {
      title: 'Dark mode support',
      body: richBody('Add a dark mode theme option for the community platform. Many members use the platform late at night and a dark mode would reduce eye strain significantly.'),
      status: 'under_review' as const,
      voteCount: 47,
      category: 'UI/UX',
      tags: ['ui', 'accessibility', 'theme'],
      authorId: alexMId,
      createdAt: daysAgo(55),
      comments: [
        { authorId: sarahMId, body: richBody('We hear you! This is actively on our design team\'s radar. Targeting Q2 for a beta.'), isOfficial: true, createdAt: daysAgo(40) },
        { authorId: mayaMId, body: richBody('Would love system-preference detection too — auto-switch based on OS dark/light mode.'), isOfficial: false, createdAt: daysAgo(35) },
      ],
    },
    {
      title: 'Salesforce integration',
      body: richBody('Native two-way sync with Salesforce. When a community member\'s company upgrades in Salesforce, their community role should update automatically. CRM data should be visible on member profiles for admins.'),
      status: 'planned' as const,
      voteCount: 38,
      category: 'Integrations',
      tags: ['salesforce', 'crm', 'sync'],
      authorId: mayaMId,
      createdAt: daysAgo(50),
      comments: [
        { authorId: adminMId, body: richBody('Planned for Q3! We\'re partnering with a Salesforce ISV to get this right. Will share early access with voters.'), isOfficial: true, createdAt: daysAgo(30) },
        { authorId: jamesMId, body: richBody('Can\'t wait. This will save our RevOps team hours every week.'), isOfficial: false, createdAt: daysAgo(28) },
        { authorId: tomMId, body: richBody('Will it support custom Salesforce objects or just standard contacts/accounts?'), isOfficial: false, createdAt: daysAgo(25) },
      ],
    },
    {
      title: 'Mobile app (iOS & Android)',
      body: richBody('A native mobile app for community members. The mobile web experience is decent but push notifications and offline reading would make a huge difference for engagement.'),
      status: 'new' as const,
      voteCount: 82,
      category: 'Mobile',
      tags: ['mobile', 'ios', 'android', 'push-notifications'],
      authorId: jamesMId,
      createdAt: daysAgo(48),
      comments: [
        { authorId: priyaMId, body: richBody('This is our most-requested feature from enterprise customers. Would pay for this alone.'), isOfficial: false, createdAt: daysAgo(45) },
        { authorId: sarahMId, body: richBody('We\'re evaluating React Native vs. native toolkits. If you have strong mobile preferences, reply below!'), isOfficial: true, createdAt: daysAgo(42) },
        { authorId: alexMId, body: richBody('React Native for sure — faster iteration and one codebase to maintain.'), isOfficial: false, createdAt: daysAgo(40) },
      ],
    },
    {
      title: 'Custom domain support',
      body: richBody('Allow communities to serve the platform from their own domain (e.g., community.yourcompany.com) with automatic SSL provisioning.'),
      status: 'shipped' as const,
      voteCount: 29,
      category: 'Branding',
      tags: ['domain', 'branding', 'ssl'],
      authorId: priyaMId,
      createdAt: daysAgo(60),
      comments: [
        { authorId: adminMId, body: richBody('Shipped in v2.1! Head to Settings > Custom Domain to set up. SSL auto-provisioned via Let\'s Encrypt.'), isOfficial: true, createdAt: daysAgo(14) },
        { authorId: mayaMId, body: richBody('Set ours up in under 5 minutes. Seamless!'), isOfficial: false, createdAt: daysAgo(13) },
      ],
    },
    {
      title: 'Bulk CSV import for members',
      body: richBody('Ability to import members in bulk via CSV upload with column mapping. Currently the only option is one-by-one or using the API, which requires engineering time.'),
      status: 'new' as const,
      voteCount: 15,
      category: 'Administration',
      tags: ['import', 'csv', 'members', 'admin'],
      authorId: tomMId,
      createdAt: daysAgo(35),
      comments: [
        { authorId: jamesMId, body: richBody('We spent 3 days scripting an import. A CSV uploader would have saved all of that.'), isOfficial: false, createdAt: daysAgo(32) },
        { authorId: sarahMId, body: richBody('Noted! Adding to our admin tooling backlog. Should be relatively quick to build.'), isOfficial: true, createdAt: daysAgo(30) },
      ],
    },
    {
      title: 'Zapier integration',
      body: richBody('An official Zapier app so non-technical admins can connect OpenSourceCommunity to their other tools without writing code. Triggers: new member, new thread, new idea vote. Actions: create member, post announcement.'),
      status: 'planned' as const,
      voteCount: 24,
      category: 'Integrations',
      tags: ['zapier', 'automation', 'no-code'],
      authorId: mayaMId,
      createdAt: daysAgo(42),
      comments: [
        { authorId: adminMId, body: richBody('Beta available now! Check Settings > Integrations > Zapier. Full public launch in v2.2.'), isOfficial: true, createdAt: daysAgo(14) },
        { authorId: priyaMId, body: richBody('Just tested it — worked first try connecting to our Mailchimp list. 10/10.'), isOfficial: false, createdAt: daysAgo(12) },
        { authorId: alexMId, body: richBody('Would love webhook triggers for comment/reply events too.'), isOfficial: false, createdAt: daysAgo(10) },
      ],
    },
    {
      title: 'API rate limit increase for enterprise tier',
      body: richBody('Current limit of 1000 req/min is too low for large enterprise deployments. We have 50k+ members and run scheduled jobs that hit the limit constantly. Need at least 10k req/min.'),
      status: 'new' as const,
      voteCount: 19,
      category: 'API',
      tags: ['api', 'rate-limits', 'enterprise'],
      authorId: tomMId,
      createdAt: daysAgo(25),
      comments: [
        { authorId: adminMId, body: richBody('Enterprise plan customers can request higher limits via support. Working on self-serve controls for this.'), isOfficial: true, createdAt: daysAgo(22) },
        { authorId: alexMId, body: richBody('Also worth looking at the new bulk endpoints — they can significantly reduce your request count.'), isOfficial: false, createdAt: daysAgo(20) },
      ],
    },
    {
      title: 'Two-factor authentication (2FA)',
      body: richBody('Support for TOTP-based 2FA for community admin accounts. Security requirement for many enterprise customers. SAML SSO is great but not everyone has an IdP set up.'),
      status: 'under_review' as const,
      voteCount: 31,
      category: 'Security',
      tags: ['security', '2fa', 'totp', 'enterprise'],
      authorId: jamesMId,
      createdAt: daysAgo(33),
      comments: [
        { authorId: sarahMId, body: richBody('In security review now. We want to get the UX right before shipping — no confusing recovery flows.'), isOfficial: true, createdAt: daysAgo(20) },
        { authorId: priyaMId, body: richBody('Please also support hardware keys (WebAuthn) — it\'s a hard requirement for some of our enterprise prospects.'), isOfficial: false, createdAt: daysAgo(18) },
        { authorId: tomMId, body: richBody('WebAuthn +1. FIDO2 support would cover both TOTP apps and hardware keys.'), isOfficial: false, createdAt: daysAgo(15) },
      ],
    },
  ]

  const ideaIds: string[] = []
  for (const idea of ideaDefs) {
    const [inserted] = await db
      .insert(ideas)
      .values({
        tenantId: TENANT_ID,
        authorId: idea.authorId,
        title: idea.title,
        body: idea.body,
        status: idea.status,
        voteCount: idea.voteCount,
        category: idea.category,
        tags: idea.tags,
        createdAt: idea.createdAt,
      })
      .onConflictDoNothing()
      .returning({ id: ideas.id })

    if (!inserted) continue
    ideaIds.push(inserted.id)

    // Insert votes (distribute among members)
    const voters = [adminMId, sarahMId, alexMId, mayaMId, jamesMId, priyaMId, tomMId, guestMId]
    const voteCount = Math.min(idea.voteCount, voters.length)
    for (let i = 0; i < voteCount; i++) {
      await db
        .insert(ideaVotes)
        .values({
          tenantId: TENANT_ID,
          ideaId: inserted.id,
          memberId: voters[i],
          createdAt: daysAgo(Math.floor(Math.random() * 30) + 1),
        })
        .onConflictDoNothing()
    }

    // Insert comments
    for (const c of idea.comments) {
      await db
        .insert(ideaComments)
        .values({
          tenantId: TENANT_ID,
          ideaId: inserted.id,
          authorId: c.authorId,
          body: c.body,
          isOfficial: c.isOfficial,
          createdAt: c.createdAt,
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${ideaIds.length} ideas`)

  // -------------------------------------------------------------------------
  // Step 7: Events
  // -------------------------------------------------------------------------
  console.log('Creating events...')
  const allMembers = [adminMId, sarahMId, alexMId, mayaMId, jamesMId, priyaMId, tomMId, guestMId]

  const eventDefs = [
    {
      title: 'Q1 Community Kickoff',
      body: richBody('Join us for our first-ever community kickoff! We\'ll be sharing our Q1 roadmap, celebrating early adopters, and running a live Q&A. Recordings will be available for all members.'),
      startsAt: daysAgo(90),
      endsAt: new Date(daysAgo(90).getTime() + 2 * 3600_000),
      timezone: 'America/New_York',
      status: 'published' as const,
      location: { type: 'virtual', url: 'https://zoom.us/j/123456789' },
      tags: ['kickoff', 'roadmap', 'q1'],
      rsvpCount: 45,
      rsvpStatus: 'going' as const,
    },
    {
      title: 'Product Roadmap AMA',
      body: richBody('Our CPO and Head of Engineering will answer your product questions live. Submit questions in advance or ask on the day. No slides — just raw conversation.'),
      startsAt: daysAgo(30),
      endsAt: new Date(daysAgo(30).getTime() + 90 * 60_000),
      timezone: 'America/Los_Angeles',
      status: 'published' as const,
      location: { type: 'virtual', url: 'https://zoom.us/j/987654321' },
      tags: ['ama', 'roadmap', 'product'],
      rsvpCount: 67,
      rsvpStatus: 'going' as const,
    },
    {
      title: 'Summer Meetup 2026',
      body: richBody('Our first in-person community meetup! Virtual attendance also available. Expect lightning talks, networking, and a live demo of upcoming features. Drinks and food provided.'),
      startsAt: daysFromNow(60),
      endsAt: new Date(daysFromNow(60).getTime() + 4 * 3600_000),
      timezone: 'America/Chicago',
      status: 'published' as const,
      location: { type: 'hybrid', address: 'TBD, Chicago IL', url: 'https://zoom.us/j/555666777' },
      tags: ['meetup', 'in-person', 'networking'],
      rsvpCount: 23,
      rsvpStatus: 'going' as const,
    },
    {
      title: 'Advanced API Workshop',
      body: richBody('A hands-on workshop for developers looking to get the most out of the OpenSourceCommunity API. We\'ll cover webhooks, the bulk member API, custom roles, and real-time events. Bring your laptop!'),
      startsAt: daysFromNow(90),
      endsAt: new Date(daysFromNow(90).getTime() + 3 * 3600_000),
      timezone: 'America/Los_Angeles',
      status: 'published' as const,
      location: { type: 'in-person', address: '123 Market St, San Francisco CA 94103' },
      capacity: 30,
      tags: ['workshop', 'api', 'developers', 'in-person'],
      rsvpCount: 8,
      rsvpStatus: 'going' as const,
    },
  ]

  for (const e of eventDefs) {
    const [evt] = await db
      .insert(events)
      .values({
        tenantId: TENANT_ID,
        creatorId: adminMId,
        title: e.title,
        body: e.body,
        location: e.location,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        timezone: e.timezone,
        status: e.status,
        capacity: (e as any).capacity ?? null,
        tags: e.tags,
        createdAt: new Date(e.startsAt.getTime() - 14 * 86_400_000),
      })
      .onConflictDoNothing()
      .returning({ id: events.id })

    if (!evt) continue

    // Add RSVPs from members we have
    const rsvpMembers = allMembers.slice(0, Math.min(e.rsvpCount, allMembers.length))
    for (const mId of rsvpMembers) {
      await db
        .insert(eventRsvps)
        .values({
          tenantId: TENANT_ID,
          eventId: evt.id,
          memberId: mId,
          status: e.rsvpStatus,
          createdAt: new Date(e.startsAt.getTime() - 7 * 86_400_000),
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${eventDefs.length} events`)

  // -------------------------------------------------------------------------
  // Step 8: Courses
  // -------------------------------------------------------------------------
  console.log('Creating courses...')

  const courseDefs = [
    {
      title: 'Getting Started with OpenSourceCommunity',
      description: 'Everything you need to set up and launch a thriving community on the OpenSourceCommunity platform. Covers onboarding, permissions, modules, and your first 30 days.',
      status: 'published' as const,
      enrollmentCount: 156,
      lessons: [
        {
          title: 'Setting Up Your Community',
          sortOrder: 1,
          durationMinutes: 12,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Welcome to OpenSourceCommunity</h2><p>In this lesson we\'ll walk through the initial setup: branding, custom domain, and inviting your first members.</p><ol><li>Navigate to <strong>Settings &gt; General</strong> and upload your logo.</li><li>Set your primary brand color.</li><li>Configure your custom domain under <strong>Settings &gt; Custom Domain</strong>.</li></ol><p>Once your branding is set, head to <strong>Members &gt; Invite</strong> to add your founding members.</p>' }] }] },
        },
        {
          title: 'Understanding Roles and Permissions',
          sortOrder: 2,
          durationMinutes: 8,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Roles & Permissions</h2><p>OpenSourceCommunity has four built-in roles: <strong>org_admin</strong>, <strong>moderator</strong>, <strong>member</strong>, and <strong>guest</strong>. You can also create custom roles with granular permissions.</p><p>Use the custom roles feature to create tier-based access — for example, a "Pro Member" role that unlocks premium courses and restricted forum categories.</p>' }] }] },
        },
        {
          title: 'Enabling and Configuring Modules',
          sortOrder: 3,
          durationMinutes: 10,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Community Modules</h2><p>Each feature of OpenSourceCommunity is a module: Forums, Ideas, Events, Courses, Webinars, Knowledge Base, and Social Intelligence. Enable only what you need under <strong>Settings &gt; Modules</strong>.</p><p>Pro tip: Start with Forums + Knowledge Base for maximum support ticket deflection. Add Ideas and Events once your community has 50+ active members.</p>' }] }] },
        },
        {
          title: 'Your First 30 Days: Engagement Playbook',
          sortOrder: 4,
          durationMinutes: 15,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>30-Day Launch Playbook</h2><p>The first 30 days set the tone for your community. Here\'s what works:</p><ul><li><strong>Week 1:</strong> Invite 20-30 power users and seed 5 forum threads</li><li><strong>Week 2:</strong> Host a live welcome webinar</li><li><strong>Week 3:</strong> Publish your first 3 KB articles</li><li><strong>Week 4:</strong> Run your first Ideas campaign</li></ul><p>Communities that follow this playbook see 3x higher 90-day retention.</p>' }] }] },
        },
      ],
    },
    {
      title: 'Building Integrations with the OpenSourceCommunity API',
      description: 'A technical deep-dive for developers. Learn to integrate OpenSourceCommunity with your CRM, support tools, and internal workflows using webhooks and the REST API.',
      status: 'published' as const,
      enrollmentCount: 43,
      lessons: [
        {
          title: 'API Authentication & Rate Limits',
          sortOrder: 1,
          durationMinutes: 10,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Authentication</h2><p>All API requests require a Bearer token in the Authorization header. Generate API keys in <strong>Settings &gt; API Keys</strong>. Use service-role keys for server-side integrations and restricted keys for client-side.</p><h2>Rate Limits</h2><p>Default limits: 1000 req/min for member tier, 5000 req/min for enterprise. Use the <code>X-RateLimit-Remaining</code> header to monitor usage. The <code>/members/bulk</code> endpoint counts as a single request regardless of batch size.</p>' }] }] },
        },
        {
          title: 'Webhooks: Real-Time Event Streaming',
          sortOrder: 2,
          durationMinutes: 14,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Webhooks</h2><p>Register webhooks in <strong>Settings &gt; Webhooks</strong>. Each webhook has a signing secret — always verify the <code>X-UC-Signature</code> header before processing. Events include: <code>member.created</code>, <code>member.updated</code>, <code>thread.created</code>, <code>idea.voted</code>, and 20 more.</p><p>Use an idempotency key in your handler to safely retry failed webhooks without duplicate processing.</p>' }] }] },
        },
        {
          title: 'CRM Sync Patterns: Salesforce & HubSpot',
          sortOrder: 3,
          durationMinutes: 18,
          body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>CRM Integration Patterns</h2><p>The most common pattern: trigger a community member update when a deal stage changes in your CRM. Here\'s the flow:</p><ol><li>CRM webhook fires on deal stage change</li><li>Your middleware maps CRM contact to community member by email</li><li>Calls PATCH /members/:id with new role or metadata</li><li>Community member sees updated access immediately</li></ol><p>We provide official HubSpot and Salesforce apps that handle this mapping automatically — no middleware needed.</p>' }] }] },
        },
      ],
    },
  ]

  for (const course of courseDefs) {
    const [insertedCourse] = await db
      .insert(courses)
      .values({
        tenantId: TENANT_ID,
        creatorId: adminMId,
        title: course.title,
        description: course.description,
        status: course.status,
        requiresEnrollment: true,
        createdAt: daysAgo(45),
      })
      .onConflictDoNothing()
      .returning({ id: courses.id })

    if (!insertedCourse) continue

    const lessonIds: string[] = []
    for (const lesson of course.lessons) {
      const [insertedLesson] = await db
        .insert(courseLessons)
        .values({
          tenantId: TENANT_ID,
          courseId: insertedCourse.id,
          title: lesson.title,
          body: lesson.body,
          sortOrder: lesson.sortOrder,
          durationMinutes: lesson.durationMinutes,
          isPublished: true,
          createdAt: daysAgo(44),
        })
        .onConflictDoNothing()
        .returning({ id: courseLessons.id })
      if (insertedLesson) lessonIds.push(insertedLesson.id)
    }

    // Enroll existing members (all 8 of them)
    for (const mId of allMembers) {
      const isCompleted = Math.random() > 0.4
      await db
        .insert(courseEnrollments)
        .values({
          tenantId: TENANT_ID,
          courseId: insertedCourse.id,
          memberId: mId,
          status: isCompleted ? 'completed' : 'enrolled',
          completedLessonIds: isCompleted ? lessonIds : lessonIds.slice(0, Math.floor(Math.random() * lessonIds.length)),
          completedAt: isCompleted ? daysAgo(Math.floor(Math.random() * 20) + 1) : null,
          createdAt: daysAgo(Math.floor(Math.random() * 30) + 10),
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${courseDefs.length} courses`)

  // -------------------------------------------------------------------------
  // Step 9: Webinars
  // -------------------------------------------------------------------------
  console.log('Creating webinars...')

  const webinarDefs = [
    {
      title: 'Community-Led Growth Masterclass',
      description: 'A 90-minute deep dive into using community as a growth lever. Featuring case studies from companies that grew from 100 to 10,000 members in under a year.',
      scheduledAt: daysAgo(60),
      durationMinutes: 90,
      status: 'ended' as const,
      recordingUrl: 'https://example.com/recordings/community-led-growth',
      registrationCount: 234,
    },
    {
      title: 'Integration Showcase: Connect Everything',
      description: 'Live demos of 6 popular integrations: Salesforce, HubSpot, Zendesk, Slack, Zapier, and Stripe. Q&A with our integration engineering team.',
      scheduledAt: daysAgo(20),
      durationMinutes: 60,
      status: 'ended' as const,
      recordingUrl: 'https://example.com/recordings/integration-showcase',
      registrationCount: 89,
    },
    {
      title: '2026 Product Roadmap Reveal',
      description: 'Join our CEO and product team for the full reveal of our 2026 roadmap. Mobile app, AI features, and a major enterprise announcement. You won\'t want to miss this.',
      scheduledAt: daysFromNow(42),
      durationMinutes: 75,
      status: 'scheduled' as const,
      recordingUrl: null,
      registrationCount: 312,
    },
  ]

  for (const webinar of webinarDefs) {
    const [insertedWebinar] = await db
      .insert(webinars)
      .values({
        tenantId: TENANT_ID,
        creatorId: adminMId,
        title: webinar.title,
        description: webinar.description,
        speakerIds: [adminMId, sarahMId],
        scheduledAt: webinar.scheduledAt,
        durationMinutes: webinar.durationMinutes,
        status: webinar.status,
        recordingUrl: webinar.recordingUrl,
        maxAttendees: 500,
        viewCount: webinar.status === 'ended' ? Math.floor(Math.random() * 200) + 50 : 0,
        createdAt: new Date(webinar.scheduledAt.getTime() - 21 * 86_400_000),
      })
      .onConflictDoNothing()
      .returning({ id: webinars.id })

    if (!insertedWebinar) continue

    // Register all members
    for (const mId of allMembers) {
      await db
        .insert(webinarRegistrations)
        .values({
          tenantId: TENANT_ID,
          webinarId: insertedWebinar.id,
          memberId: mId,
          attendedAt: webinar.status === 'ended' ? webinar.scheduledAt : null,
          createdAt: new Date(webinar.scheduledAt.getTime() - 7 * 86_400_000),
        })
        .onConflictDoNothing()
    }
  }
  console.log(`  Created ${webinarDefs.length} webinars`)

  // -------------------------------------------------------------------------
  // Step 10: Knowledge Base
  // -------------------------------------------------------------------------
  console.log('Creating knowledge base...')

  const kbCatDefs = [
    { name: 'Getting Started', slug: 'getting-started', description: 'Everything you need to launch your community from day one.', sortOrder: 0 },
    { name: 'Integrations', slug: 'integrations', description: 'Connect OpenSourceCommunity to your existing tools.', sortOrder: 1 },
    { name: 'Administration', slug: 'administration', description: 'Managing members, roles, permissions, and platform settings.', sortOrder: 2 },
  ]

  for (const cat of kbCatDefs) {
    await db
      .insert(kbCategories)
      .values({ tenantId: TENANT_ID, ...cat, createdAt: daysAgo(50) })
      .onConflictDoNothing()
  }

  const allKbCats = await db
    .select({ id: kbCategories.id, slug: kbCategories.slug })
    .from(kbCategories)
    .where(eq(kbCategories.tenantId, TENANT_ID))

  const kbCatMap: Record<string, string> = {}
  for (const c of allKbCats) kbCatMap[c.slug] = c.id

  const kbArticleDefs = [
    {
      catSlug: 'getting-started',
      title: 'Quick Start: Launch Your Community in 15 Minutes',
      slug: 'quick-start',
      excerpt: 'A step-by-step guide to getting your community live in under 15 minutes.',
      tags: ['setup', 'onboarding'],
      helpfulCount: 142,
      viewCount: 1820,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Quick Start Guide</h2><p>Welcome! This guide will get your community live in under 15 minutes.</p><h3>Step 1: Create your tenant</h3><p>Sign up at app.opensourcecommunity.io. Your community URL will be <code>yourslug.opensourcecommunity.io</code> by default.</p><h3>Step 2: Configure branding</h3><p>Go to Settings &gt; General. Upload your logo (recommended: 200x200px PNG), set your primary brand color, and write a welcome message.</p><h3>Step 3: Enable modules</h3><p>Under Settings &gt; Modules, enable the features you want. We recommend starting with Forums and Knowledge Base.</p><h3>Step 4: Invite founding members</h3><p>Go to Members &gt; Invite and add 5-10 trusted community members to seed your initial content.</p><h3>Step 5: Seed content</h3><p>Create your first forum category and post a welcome thread. Pin it so new members see it immediately.</p><p>Congratulations — your community is live!</p>' }] }] },
    },
    {
      catSlug: 'getting-started',
      title: 'Understanding the Member Lifecycle',
      slug: 'member-lifecycle',
      excerpt: 'How members move through invitation, onboarding, engagement, and alumni stages.',
      tags: ['members', 'lifecycle', 'onboarding'],
      helpfulCount: 87,
      viewCount: 940,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>The Member Lifecycle</h2><p>Every community member goes through four stages:</p><ol><li><strong>Invited</strong> — A pending invitation has been sent. The member hasn\'t accepted yet.</li><li><strong>Onboarding</strong> — The member has joined but hasn\'t completed their profile or engaged yet. This is the critical window — send them a direct message and point them to your best content.</li><li><strong>Active</strong> — The member is regularly participating. Track this with the <code>lastActiveAt</code> field.</li><li><strong>Churned</strong> — No activity for 90+ days. Set up an automated re-engagement email via the webhook API.</li></ol><p>Use member metadata to track custom lifecycle stages specific to your business.</p>' }] }] },
    },
    {
      catSlug: 'getting-started',
      title: 'Setting Up Forum Categories and Permissions',
      slug: 'forum-categories',
      excerpt: 'Create a forum structure that encourages the right conversations.',
      tags: ['forums', 'categories', 'permissions'],
      helpfulCount: 64,
      viewCount: 710,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Forum Structure Best Practices</h2><p>A well-structured forum is the backbone of an active community. Here\'s a proven structure for B2B communities:</p><ul><li><strong>Announcements</strong> — Admin-only posting, all members can read. Pin this category.</li><li><strong>General Discussion</strong> — Open to all members. Great for questions, tips, and off-topic chat.</li><li><strong>Product Feedback</strong> — Where members post feature requests before they graduate to Ideas.</li><li><strong>Show & Tell</strong> — Members share how they\'re using your product. High engagement, great social proof.</li></ul><h3>Category Visibility</h3><p>Set visibility to <code>members</code> for most categories. Use <code>restricted</code> with custom role IDs for VIP or enterprise-only spaces.</p>' }] }] },
    },
    {
      catSlug: 'integrations',
      title: 'Zapier Integration Guide',
      slug: 'zapier-integration',
      excerpt: 'Connect OpenSourceCommunity to 5000+ apps without writing code.',
      tags: ['zapier', 'automation', 'no-code'],
      helpfulCount: 93,
      viewCount: 1150,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Zapier Integration</h2><p>The OpenSourceCommunity Zapier app lets you connect your community to over 5,000 other apps without writing a single line of code.</p><h3>Getting Started</h3><ol><li>Go to <strong>Settings &gt; Integrations &gt; Zapier</strong></li><li>Click <strong>Connect to Zapier</strong> and authorize the app</li><li>In Zapier, create a new Zap and search for "OpenSourceCommunity"</li></ol><h3>Available Triggers</h3><ul><li>New Member Joined</li><li>New Forum Thread Created</li><li>New Idea Submitted</li><li>Member Role Changed</li></ul><h3>Available Actions</h3><ul><li>Create Member</li><li>Update Member Role</li><li>Post Announcement</li><li>Send Notification</li></ul><p>Popular Zap: Automatically create a community member when a new customer is added in HubSpot.</p>' }] }] },
    },
    {
      catSlug: 'integrations',
      title: 'Webhook Reference',
      slug: 'webhook-reference',
      excerpt: 'Full reference for all webhook events, payloads, and security.',
      tags: ['webhooks', 'api', 'developers'],
      helpfulCount: 78,
      viewCount: 890,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Webhook Reference</h2><p>Webhooks allow you to receive real-time notifications when events happen in your community.</p><h3>Security</h3><p>Every webhook request includes an <code>X-UC-Signature</code> header. Verify it using HMAC-SHA256 with your webhook secret. Never process a webhook without verifying the signature.</p><h3>Event Types</h3><ul><li><code>member.created</code> — A new member joined</li><li><code>member.updated</code> — Member profile or role changed</li><li><code>thread.created</code> — New forum thread posted</li><li><code>post.created</code> — New reply in a thread</li><li><code>idea.created</code> — New idea submitted</li><li><code>idea.voted</code> — Someone voted on an idea</li><li><code>event.rsvp</code> — Member RSVPed to an event</li><li><code>webinar.registered</code> — Member registered for a webinar</li></ul><h3>Retry Policy</h3><p>Failed webhooks are retried up to 5 times with exponential backoff (1s, 5s, 30s, 5min, 30min).</p>' }] }] },
    },
    {
      catSlug: 'integrations',
      title: 'HubSpot CRM Sync',
      slug: 'hubspot-sync',
      excerpt: 'Two-way sync between OpenSourceCommunity members and HubSpot contacts.',
      tags: ['hubspot', 'crm', 'sync'],
      helpfulCount: 55,
      viewCount: 620,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>HubSpot CRM Sync</h2><p>The HubSpot integration provides two-way sync between community members and HubSpot contacts. When you close a deal, the contact automatically becomes a community member. When a member churns, their HubSpot contact is updated.</p><h3>Setup</h3><ol><li>Go to <strong>Settings &gt; Integrations &gt; HubSpot</strong></li><li>Click <strong>Connect HubSpot</strong> and authorize via OAuth</li><li>Configure field mappings (email is always the sync key)</li><li>Set up sync rules: which deal stages trigger member creation</li></ol><h3>Field Mappings</h3><p>Map any HubSpot contact property to a community member metadata field. Common mappings: Company → company, Lifecycle Stage → member tier, Owner → assigned CSM.</p>' }] }] },
    },
    {
      catSlug: 'administration',
      title: 'Managing Member Roles and Custom Permissions',
      slug: 'roles-and-permissions',
      excerpt: 'A complete guide to built-in roles, custom roles, and permission management.',
      tags: ['roles', 'permissions', 'admin'],
      helpfulCount: 108,
      viewCount: 1340,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Roles and Permissions</h2><h3>Built-in Roles</h3><ul><li><strong>org_admin</strong> — Full access to all settings and content</li><li><strong>moderator</strong> — Can manage content but not billing or integrations</li><li><strong>member</strong> — Standard community access</li><li><strong>guest</strong> — Read-only access to public content</li></ul><h3>Custom Roles</h3><p>Create custom roles under <strong>Settings &gt; Roles</strong>. Assign granular permissions: forum.post, forum.moderate, kb.edit, events.create, etc.</p><p>Use custom roles for tiered access: "Enterprise Member" can access a private forum category that standard members cannot.</p><h3>Bulk Role Updates</h3><p>Use the API endpoint <code>PATCH /members/bulk</code> with a JSON array of member IDs and new roles. Useful for batch tier upgrades.</p>' }] }] },
    },
    {
      catSlug: 'administration',
      title: 'Audit Log: Tracking Admin Actions',
      slug: 'audit-log',
      excerpt: 'Everything that happens in your community is logged. Here\'s how to use the audit log.',
      tags: ['audit', 'security', 'compliance'],
      helpfulCount: 42,
      viewCount: 480,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Audit Log</h2><p>Every admin action in OpenSourceCommunity is recorded in the immutable audit log. Access it under <strong>Settings &gt; Audit Log</strong>.</p><h3>What\'s Logged</h3><ul><li>Member role changes</li><li>Content deletions</li><li>Settings changes</li><li>Integration connects/disconnects</li><li>API key creation and revocation</li></ul><h3>Filtering</h3><p>Filter by actor, action type, resource type, or date range. Export to CSV for compliance reporting.</p><h3>Retention</h3><p>Starter plan: 30 days. Growth plan: 1 year. Enterprise plan: unlimited with custom export.</p>' }] }] },
    },
    {
      catSlug: 'administration',
      title: 'Configuring Email Notifications and Digests',
      slug: 'email-notifications',
      excerpt: 'Control how and when your community sends email notifications.',
      tags: ['email', 'notifications', 'digest'],
      helpfulCount: 71,
      viewCount: 830,
      body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<h2>Email Notifications</h2><p>OpenSourceCommunity sends transactional and digest emails to keep members engaged. Configure them under <strong>Settings &gt; Notifications</strong>.</p><h3>Transactional Emails</h3><ul><li>Direct mentions (@username)</li><li>Replies to your threads</li><li>Idea status changes on ideas you voted for</li><li>Event reminders (24h and 1h before)</li></ul><h3>Digest Emails</h3><p>Weekly digest summarizing top threads, new ideas, and upcoming events. Configurable frequency: daily, weekly, or off.</p><h3>Member Controls</h3><p>Members can manage their own notification preferences in Profile &gt; Notifications. As an admin, you can set default notification preferences for new members.</p><h3>Custom SMTP</h3><p>Enterprise plan: use your own SMTP server for branded email delivery from your domain.</p>' }] }] },
    },
  ]

  for (const article of kbArticleDefs) {
    const catId = kbCatMap[article.catSlug]
    if (!catId) continue
    await db
      .insert(kbArticles)
      .values({
        tenantId: TENANT_ID,
        authorId: adminMId,
        categoryId: catId,
        title: article.title,
        slug: article.slug,
        body: article.body,
        excerpt: article.excerpt,
        tags: article.tags,
        visibility: 'members' as const,
        helpfulCount: article.helpfulCount,
        viewCount: article.viewCount,
        isPublished: true,
        publishedAt: daysAgo(Math.floor(Math.random() * 40) + 5),
        createdAt: daysAgo(Math.floor(Math.random() * 40) + 10),
      })
      .onConflictDoNothing()
  }
  console.log(`  Created ${kbArticleDefs.length} KB articles`)

  // -------------------------------------------------------------------------
  // Step 11: Chat channels and messages
  // -------------------------------------------------------------------------
  console.log('Creating chat channels and messages...')

  const [generalChannel] = await db
    .insert(chatChannels)
    .values({
      tenantId: TENANT_ID,
      name: 'general',
      slug: 'general',
      description: 'General community chat — say hi!',
      isPrivate: false,
      createdBy: adminMId,
      createdAt: daysAgo(58),
    })
    .onConflictDoNothing()
    .returning({ id: chatChannels.id })

  const [announcementsChannel] = await db
    .insert(chatChannels)
    .values({
      tenantId: TENANT_ID,
      name: 'announcements',
      slug: 'announcements',
      description: 'Official announcements from the Acme team.',
      isPrivate: false,
      createdBy: adminMId,
      createdAt: daysAgo(58),
    })
    .onConflictDoNothing()
    .returning({ id: chatChannels.id })

  // Fetch channels if they already existed
  const allChannels = await db
    .select({ id: chatChannels.id, slug: chatChannels.slug })
    .from(chatChannels)
    .where(eq(chatChannels.tenantId, TENANT_ID))

  const channelMap: Record<string, string> = {}
  for (const ch of allChannels) channelMap[ch.slug] = ch.id

  const genChId = channelMap['general']
  const annChId = channelMap['announcements']

  if (genChId) {
    const generalMessages = [
      { authorId: alexMId, body: "Hey everyone! Just finished setting up our Zapier integration. The new member → HubSpot contact sync is working perfectly 🎉", createdAt: daysAgo(7) },
      { authorId: mayaMId, body: "That's awesome @alex! We're planning to do the same with Salesforce once the native integration ships. For now using webhooks.", createdAt: daysAgo(7) },
      { authorId: jamesMId, body: "Morning all! Anyone been to the Q&A thread about API rate limits? Tom's workaround saved us a ton of time.", createdAt: daysAgo(6) },
      { authorId: tomMId, body: "Happy to help! Pro tip: the X-RateLimit-Remaining header is your friend. Set up monitoring on it before you hit the wall.", createdAt: daysAgo(6) },
      { authorId: priyaMId, body: "Quick question — are there templates for the webinar follow-up email? I'm setting up our first one and don't want to start from scratch.", createdAt: daysAgo(6) },
      { authorId: sarahMId, body: "@priya Yes! Check the KB under Getting Started > Webinar Playbook. There are 3 templates in there.", createdAt: daysAgo(6) },
      { authorId: priyaMId, body: "Found it, thank you Sarah! The follow-up email template is perfect.", createdAt: daysAgo(5) },
      { authorId: alexMId, body: "Pro tip of the day: use the forum /embed slash command to pull KB article previews directly into your forum replies. Discovered this by accident.", createdAt: daysAgo(5) },
      { authorId: guestMId, body: "Hi all! Just joined as a guest. The community looks amazing. Hoping to become a full member soon!", createdAt: daysAgo(5) },
      { authorId: adminMId, body: "Welcome @guest! We'll get your access upgraded. In the meantime, feel free to browse the public threads and KB articles.", createdAt: daysAgo(5) },
      { authorId: jamesMId, body: "We just hit 500 community members! Feels like a big milestone. Thanks everyone for being so active here.", createdAt: daysAgo(4) },
      { authorId: mayaMId, body: "500! 🎉 Congrats team. The engagement numbers are wild — we're seeing 70%+ of members active each month.", createdAt: daysAgo(4) },
      { authorId: tomMId, body: "Anyone else excited about the roadmap reveal webinar? Already registered.", createdAt: daysAgo(3) },
      { authorId: priyaMId, body: "Registered the moment it was announced. 312 registrations already — that's going to be a big one.", createdAt: daysAgo(3) },
      { authorId: sarahMId, body: "Reminder: vote on the Ideas board if you haven't! The mobile app idea is at 82 votes — let's get it to 100!", createdAt: daysAgo(3) },
      { authorId: alexMId, body: "Just voted. The 2FA idea too — that's a blocker for a few of our enterprise prospects.", createdAt: daysAgo(2) },
      { authorId: jamesMId, body: "Has anyone tried the bulk CSV import workaround from the API workshop? Works but would love a proper UI.", createdAt: daysAgo(2) },
      { authorId: tomMId, body: "@james There's an idea for that on the board — 15 votes so far. Go add yours!", createdAt: daysAgo(2) },
      { authorId: mayaMId, body: "Just published a new KB article on CRM sync patterns. Would love peer review from anyone who's done complex field mappings.", createdAt: daysAgo(1) },
      { authorId: adminMId, body: "Good morning everyone! Quick update: we're rolling out improved notification preferences controls next week. Watch for the release notes.", createdAt: daysAgo(1) },
      { authorId: priyaMId, body: "That's the most requested change from our power users! Can't wait.", createdAt: daysAgo(0) },
      { authorId: alexMId, body: "Great way to start the week. Let's go!", createdAt: daysAgo(0) },
    ]

    for (const msg of generalMessages) {
      await db
        .insert(chatMessages)
        .values({
          tenantId: TENANT_ID,
          channelId: genChId,
          authorId: msg.authorId,
          body: msg.body,
          createdAt: msg.createdAt,
        })
        .onConflictDoNothing()
    }
  }

  if (annChId) {
    const annMessages = [
      { authorId: adminMId, body: "🎉 Welcome to the official Acme Community! We're so excited to have you here. Please read the pinned welcome thread in the Forums to get started.", createdAt: daysAgo(58) },
      { authorId: adminMId, body: "Platform v2.0 is now live! Highlights: Ideas board, Knowledge Base, and major performance improvements. Full release notes in the Forums > Announcements.", createdAt: daysAgo(30) },
      { authorId: adminMId, body: "Zapier integration beta is open! Apply for access at Settings > Integrations > Zapier. First 50 signups get a dedicated onboarding call.", createdAt: daysAgo(14) },
      { authorId: adminMId, body: "v2.1 shipped today: custom domain support is GA, Zapier is now generally available, and notification delivery is 40% faster. Full changelog in the KB.", createdAt: daysAgo(14) },
      { authorId: adminMId, body: "📅 Don't miss our 2026 Product Roadmap Reveal webinar in 6 weeks — 312 members registered already! Register in the Webinars section.", createdAt: daysAgo(1) },
    ]

    for (const msg of annMessages) {
      await db
        .insert(chatMessages)
        .values({
          tenantId: TENANT_ID,
          channelId: annChId,
          authorId: msg.authorId,
          body: msg.body,
          createdAt: msg.createdAt,
        })
        .onConflictDoNothing()
    }
  }
  console.log('  Created chat channels and messages')

  // -------------------------------------------------------------------------
  // Step 12: Social Intelligence
  // -------------------------------------------------------------------------
  console.log('Creating social intelligence data...')

  const [brandGroup] = await db
    .insert(siKeywordGroups)
    .values({
      tenantId: TENANT_ID,
      name: 'Acme Brand',
      type: 'brand' as const,
      terms: ['acme community', 'ultimatecommunity', '@acmecommunity', '#acmecommunity'],
      platforms: ['twitter', 'reddit', 'linkedin'],
      isActive: true,
      createdAt: daysAgo(45),
    })
    .onConflictDoNothing()
    .returning({ id: siKeywordGroups.id })

  const [competitorGroup] = await db
    .insert(siKeywordGroups)
    .values({
      tenantId: TENANT_ID,
      name: 'Competitors',
      type: 'competitor' as const,
      terms: ['circle.so', 'mighty networks', 'tribe.so', 'disciple media'],
      platforms: ['twitter', 'reddit', 'linkedin'],
      isActive: true,
      createdAt: daysAgo(45),
    })
    .onConflictDoNothing()
    .returning({ id: siKeywordGroups.id })

  const [customGroup] = await db
    .insert(siKeywordGroups)
    .values({
      tenantId: TENANT_ID,
      name: 'Community-Led Growth',
      type: 'custom' as const,
      terms: ['community led growth', 'community-led', 'clg', 'community flywheel'],
      platforms: ['twitter', 'linkedin'],
      isActive: true,
      createdAt: daysAgo(45),
    })
    .onConflictDoNothing()
    .returning({ id: siKeywordGroups.id })

  // Fetch keyword groups
  const allGroups = await db
    .select({ id: siKeywordGroups.id, name: siKeywordGroups.name })
    .from(siKeywordGroups)
    .where(eq(siKeywordGroups.tenantId, TENANT_ID))

  const groupMap: Record<string, string> = {}
  for (const g of allGroups) groupMap[g.name] = g.id

  const brandGroupId = groupMap['Acme Brand']
  const competitorGroupId = groupMap['Competitors']
  const customGroupId = groupMap['Community-Led Growth']

  const mentionDefs = [
    // Positive brand mentions
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_001', authorHandle: '@devops_dan', contentUrl: 'https://twitter.com/devops_dan/status/1', textPreview: "Just migrated our community to @acmecommunity and wow — the onboarding experience is 10x better than what we had before. The API is clean and webhooks are rock solid.", publishedAt: daysAgo(3), sentiment: 'positive' as const, sentimentScore: 0.91, engagementCount: 47 },
    { groupId: brandGroupId, platform: 'linkedin', externalId: 'li_001', authorHandle: 'Sarah Kim', contentUrl: 'https://linkedin.com/posts/sarahkim_001', textPreview: "6 months in with OpenSourceCommunity. Our community engagement rate is 68% monthly — significantly above the 20-30% industry average. If you're building a B2B community, this is the platform.", publishedAt: daysAgo(5), sentiment: 'positive' as const, sentimentScore: 0.88, engagementCount: 134 },
    { groupId: brandGroupId, platform: 'reddit', externalId: 'rd_001', authorHandle: 'u/community_builder', contentUrl: 'https://reddit.com/r/communitymanagement/comments/001', textPreview: "Has anyone used OpenSourceCommunity for enterprise B2B? We have 10k potential members and need solid role-based access. Their custom roles feature looks promising.", publishedAt: daysAgo(4), sentiment: 'neutral' as const, sentimentScore: 0.55, engagementCount: 23 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_002', authorHandle: '@techfounder', contentUrl: 'https://twitter.com/techfounder/status/2', textPreview: "The #acmecommunity Ideas board is brilliant. Customers can vote on features, founders get prioritized roadmaps, and everyone feels heard. Community-led product development done right.", publishedAt: daysAgo(2), sentiment: 'positive' as const, sentimentScore: 0.86, engagementCount: 89 },
    { groupId: brandGroupId, platform: 'linkedin', externalId: 'li_002', authorHandle: 'Marcus Webb', contentUrl: 'https://linkedin.com/posts/marcuswebb_002', textPreview: "Frustrating experience today with @acmecommunity API docs. Rate limit errors with zero context on what triggered them. Took 2 hours to figure out it was the webhook endpoint. Need better error messages.", publishedAt: daysAgo(6), sentiment: 'negative' as const, sentimentScore: 0.18, engagementCount: 12 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_003', authorHandle: '@csm_rachel', contentUrl: 'https://twitter.com/csm_rachel/status/3', textPreview: "Ran our first community webinar on @acmecommunity platform. 234 registrations, 71% attendance rate. The Q&A and polling features made it feel like a real conference, not just a Zoom call.", publishedAt: daysAgo(8), sentiment: 'positive' as const, sentimentScore: 0.93, engagementCount: 67 },
    { groupId: brandGroupId, platform: 'reddit', externalId: 'rd_002', authorHandle: 'u/saas_ops', contentUrl: 'https://reddit.com/r/saas/comments/002', textPreview: "Comparing community platforms for our B2B SaaS. OpenSourceCommunity vs Circle vs Mighty Networks. UC has the best API and integrations but the mobile experience is lacking. Waiting for their mobile app.", publishedAt: daysAgo(10), sentiment: 'mixed' as const, sentimentScore: 0.52, engagementCount: 41 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_004', authorHandle: '@growthops', contentUrl: 'https://twitter.com/growthops/status/4', textPreview: "Love that @acmecommunity has Social Intelligence built in. We caught a negative mention spike before it became a PR problem. Responded in under an hour. This is the future.", publishedAt: daysAgo(1), sentiment: 'positive' as const, sentimentScore: 0.87, engagementCount: 55 },
    // Competitor mentions
    { groupId: competitorGroupId, platform: 'twitter', externalId: 'tw_c001', authorHandle: '@startup_cto', contentUrl: 'https://twitter.com/startup_cto/status/c001', textPreview: "Switched from circle.so to OpenSourceCommunity. Main reasons: better API, webhook reliability, and the social intelligence features. Circle is great for creator communities but UC wins for B2B.", publishedAt: daysAgo(7), sentiment: 'positive' as const, sentimentScore: 0.79, engagementCount: 38 },
    { groupId: competitorGroupId, platform: 'reddit', externalId: 'rd_c001', authorHandle: 'u/platform_eval', contentUrl: 'https://reddit.com/r/communitymanagement/comments/c001', textPreview: "Full comparison: OpenSourceCommunity vs Mighty Networks vs Circle. UC wins on: API, integrations, SSO, and analytics. Loses on: mobile app, content monetization, and price for small communities.", publishedAt: daysAgo(12), sentiment: 'mixed' as const, sentimentScore: 0.58, engagementCount: 95 },
    { groupId: competitorGroupId, platform: 'linkedin', externalId: 'li_c001', authorHandle: 'Jennifer Park', contentUrl: 'https://linkedin.com/posts/jenniferpark_c001', textPreview: "Why we chose OpenSourceCommunity over tribe.so for our enterprise deployment: data isolation, custom roles, audit logging, and a real SLA. Enterprise features at a fair price.", publishedAt: daysAgo(9), sentiment: 'positive' as const, sentimentScore: 0.82, engagementCount: 74 },
    // Custom / CLG mentions
    { groupId: customGroupId, platform: 'twitter', externalId: 'tw_cu001', authorHandle: '@clg_champion', contentUrl: 'https://twitter.com/clg_champion/status/cu001', textPreview: "Community-led growth is the most underrated go-to-market motion in B2B SaaS. Build a place where customers help each other, and you've built a moat.", publishedAt: daysAgo(4), sentiment: 'positive' as const, sentimentScore: 0.90, engagementCount: 156 },
    { groupId: customGroupId, platform: 'linkedin', externalId: 'li_cu001', authorHandle: 'Daniel Torres', contentUrl: 'https://linkedin.com/posts/danieltorres_cu001', textPreview: "The community flywheel: more members → more content → better SEO → more organic signups → more members. We've seen this compound for 12 months. Community-led growth is real.", publishedAt: daysAgo(6), sentiment: 'positive' as const, sentimentScore: 0.88, engagementCount: 203 },
    { groupId: customGroupId, platform: 'twitter', externalId: 'tw_cu002', authorHandle: '@vcbacked', contentUrl: 'https://twitter.com/vcbacked/status/cu002', textPreview: "Hot take: #CLG doesn't work if your product is mediocre. Community amplifies word of mouth in both directions. Fix the product first, then build the community.", publishedAt: daysAgo(3), sentiment: 'mixed' as const, sentimentScore: 0.48, engagementCount: 267 },
    { groupId: customGroupId, platform: 'linkedin', externalId: 'li_cu002', authorHandle: 'Priya Anand', contentUrl: 'https://linkedin.com/posts/priyaanand_cu002', textPreview: "Metrics for community-led growth: monthly active members, thread-to-resolution rate, support ticket deflection %, NPS from community members vs non-members. Tracking all 4 will tell you if CLG is working.", publishedAt: daysAgo(8), sentiment: 'neutral' as const, sentimentScore: 0.65, engagementCount: 118 },
    // More brand mentions to hit 20
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_005', authorHandle: '@devadvocate', contentUrl: 'https://twitter.com/devadvocate/status/5', textPreview: "The @acmecommunity developer experience is top tier. Well-documented API, helpful error messages (mostly), and a dev community that actually answers questions.", publishedAt: daysAgo(11), sentiment: 'positive' as const, sentimentScore: 0.84, engagementCount: 33 },
    { groupId: brandGroupId, platform: 'reddit', externalId: 'rd_003', authorHandle: 'u/csm_pro', contentUrl: 'https://reddit.com/r/customersuccess/comments/003', textPreview: "Anyone using OpenSourceCommunity for customer success? We integrated with Gainsight and it's been a game changer for health scoring — community activity directly feeds into the health model.", publishedAt: daysAgo(13), sentiment: 'positive' as const, sentimentScore: 0.85, engagementCount: 28 },
    { groupId: brandGroupId, platform: 'linkedin', externalId: 'li_003', authorHandle: 'Alex Thompson', contentUrl: 'https://linkedin.com/posts/alexthompson_003', textPreview: "One thing I'd like to see from OpenSourceCommunity: better analytics. The current dashboard shows basic metrics but I want cohort analysis, member journey mapping, and content performance trends.", publishedAt: daysAgo(15), sentiment: 'negative' as const, sentimentScore: 0.25, engagementCount: 19 },
    { groupId: brandGroupId, platform: 'twitter', externalId: 'tw_006', authorHandle: '@ops_hacker', contentUrl: 'https://twitter.com/ops_hacker/status/6', textPreview: "Finally got our @acmecommunity + Stripe integration working. New paying customers automatically get upgraded to 'Pro Member' role. Zero manual work. This is what automation should look like.", publishedAt: daysAgo(2), sentiment: 'positive' as const, sentimentScore: 0.92, engagementCount: 61 },
    { groupId: customGroupId, platform: 'twitter', externalId: 'tw_cu003', authorHandle: '@b2b_growth', contentUrl: 'https://twitter.com/b2b_growth/status/cu003', textPreview: "Community-led growth stat of the day: companies with active communities see 5.4x higher NPS from community members vs non-members. The data is clear — invest in community.", publishedAt: daysAgo(1), sentiment: 'positive' as const, sentimentScore: 0.89, engagementCount: 189 },
  ]

  let mentionsCreated = 0
  for (const mention of mentionDefs) {
    if (!mention.groupId) continue
    await db
      .insert(siMentions)
      .values({
        tenantId: TENANT_ID,
        keywordGroupId: mention.groupId,
        platform: mention.platform,
        externalId: mention.externalId,
        authorHandle: mention.authorHandle,
        contentUrl: mention.contentUrl,
        textPreview: mention.textPreview,
        publishedAt: mention.publishedAt,
        sentiment: mention.sentiment,
        sentimentScore: mention.sentimentScore,
        status: 'new' as const,
        engagementCount: mention.engagementCount,
        rawMetadata: {},
        collectedAt: new Date(),
      })
      .onConflictDoNothing()
    mentionsCreated++
  }

  // Alerts
  if (brandGroupId) {
    await db
      .insert(siAlerts)
      .values([
        {
          tenantId: TENANT_ID,
          alertType: 'volume_spike' as const,
          payload: {
            keywordGroupId: brandGroupId,
            keywordGroupName: 'Acme Brand',
            spikeMultiplier: 3.8,
            mentionCount: 19,
            timeWindowHours: 24,
            message: 'Brand mention volume is 3.8x above baseline — likely due to the v2.1 launch announcement.',
          },
          status: 'open',
          triggeredAt: daysAgo(14),
        },
        {
          tenantId: TENANT_ID,
          alertType: 'crisis' as const,
          payload: {
            keywordGroupId: brandGroupId,
            keywordGroupName: 'Acme Brand',
            negativeRatio: 0.62,
            mentionCount: 8,
            timeWindowHours: 6,
            message: 'Elevated negative sentiment detected. API error messages are generating frustrated mentions. Recommend immediate response from DevRel.',
          },
          status: 'open',
          triggeredAt: daysAgo(6),
        },
      ])
      .onConflictDoNothing()
  }
  console.log(`  Created ${mentionsCreated} mentions and 2 alerts`)

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  console.log('\n✅ Demo seed complete!')
  console.log(`   Users: ${userDefs.length}`)
  console.log(`   Members: ${userDefs.length}`)
  console.log(`   Forum categories: 3`)
  console.log(`   Forum threads: ${insertedThreadIds.length} (with replies and reactions)`)
  console.log(`   Ideas: ${ideaIds.length} (with votes and comments)`)
  console.log(`   Events: ${eventDefs.length} (with RSVPs)`)
  console.log(`   Courses: ${courseDefs.length} (with lessons and enrollments)`)
  console.log(`   Webinars: ${webinarDefs.length} (with registrations)`)
  console.log(`   KB articles: ${kbArticleDefs.length}`)
  console.log(`   Chat messages: ${22 + 5} (2 channels)`)
  console.log(`   SI mentions: ${mentionsCreated} | SI alerts: 2`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
