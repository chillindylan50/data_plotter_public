# SvelteKit Migration Guide

## Overview

This guide provides a comprehensive strategy for migrating the Data Plotter application from Flask + TypeScript to SvelteKit.

## Why SvelteKit?

### Advantages Over Current Stack

1. **Full-Stack TypeScript**
   - Backend and frontend in same language
   - Shared types and validation
   - Better developer experience

2. **Modern Reactivity**
   - No manual DOM updates
   - Automatic UI synchronization
   - Reactive stores for state management

3. **Better Performance**
   - Smaller bundle sizes (no virtual DOM)
   - Faster initial load
   - Server-side rendering (SSR)
   - Code splitting out of the box

4. **Developer Experience**
   - Hot module replacement (HMR)
   - Built-in routing
   - File-based routing
   - TypeScript-first

5. **Scalability**
   - Stateless architecture (if using JWT)
   - Easy to deploy to edge (Vercel, Cloudflare)
   - Better concurrency than Flask

## Migration Strategy

### Phased Approach (Recommended)

**Phase 1: Parallel Development (2-3 weeks)**
- Set up SvelteKit project
- Migrate frontend components to Svelte
- Keep Flask backend as API
- Test both systems side-by-side

**Phase 2: Backend Migration (2-3 weeks)**
- Replace Flask routes with SvelteKit server routes
- Migrate database layer from SQLAlchemy to Prisma
- Update authentication to SvelteKit auth
- Integration testing

**Phase 3: Optimization (1-2 weeks)**
- Add SSR where beneficial
- Implement streaming
- Optimize bundle sizes
- Performance testing

**Phase 4: Deployment (1 week)**
- Deploy to production
- Monitor and fix issues
- Gradual rollout

### Big Bang Migration (Not Recommended)

Rewrite everything at once - higher risk, longer time to deployment.

## Technology Stack Mapping

| Current (Flask) | SvelteKit Equivalent |
|----------------|---------------------|
| Flask 3.1.1 | SvelteKit 2.0+ |
| Flask-Login | Auth.js (NextAuth) |
| SQLAlchemy + SQLite | Prisma + PostgreSQL |
| Jinja2 templates | Svelte components |
| TypeScript (vanilla) | SvelteKit + TypeScript |
| Plotly.js | Plotly.js (same) |
| SciPy (Python) | simple-statistics (JS) or API |
| Google OAuth (Python) | Auth.js Google provider |

## Project Setup

### 1. Initialize SvelteKit Project

```bash
npm create svelte@latest data-plotter-sveltekit
cd data-plotter-sveltekit

# Choose options:
# - TypeScript: Yes
# - ESLint: Yes
# - Prettier: Yes
# - Playwright: Yes
# - Vitest: Yes

npm install
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install @auth/sveltekit @auth/core
npm install @prisma/client
npm install plotly.js-dist
npm install openai

# Dev dependencies
npm install -D prisma
npm install -D @types/plotly.js
npm install -D vite-plugin-node-polyfills
```

### 3. Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── DataTable.svelte
│   │   ├── PlotVisualization.svelte
│   │   ├── CorrelationMatrix.svelte
│   │   ├── ChatInterface.svelte
│   │   └── FileUpload.svelte
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.prisma
│   │   │   └── queries.ts
│   │   ├── auth/
│   │   │   └── config.ts
│   │   └── utils/
│   │       ├── stats.ts
│   │       └── validation.ts
│   ├── stores/
│   │   ├── data.ts
│   │   ├── chat.ts
│   │   └── correlations.ts
│   └── types/
│       └── index.ts
├── routes/
│   ├── +page.svelte
│   ├── +page.server.ts
│   ├── login/
│   │   └── +page.svelte
│   └── api/
│       ├── data/
│       │   ├── +server.ts
│       │   └── import/
│       │       └── +server.ts
│       ├── correlations/
│       │   └── +server.ts
│       └── chat/
│           └── +server.ts
└── hooks.server.ts
```

## Step-by-Step Migration

### Step 1: Database Migration

#### Install Prisma

```bash
npx prisma init
```

#### Define Schema (prisma/schema.prisma)

```prisma
datasource db {
  provider = "postgresql"  // or "sqlite" for development
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  googleId  String   @unique @map("google_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  dataPoints         DataPoint[]
  chatSessions       ChatSession[]
  correlationResults CorrelationResult[]
  
  @@map("users")
}

model DataPoint {
  id        Int      @id @default(autoincrement())
  userId    String   @map("user_id")
  date      DateTime
  data      Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, date])
  @@map("data_points")
}

model ChatSession {
  id                      Int      @id @default(autoincrement())
  userId                  String   @map("user_id")
  apiKeyHash              String   @map("api_key_hash")
  lastCorrelationContext  String?  @map("last_correlation_context") @db.Text
  createdAt               DateTime @default(now()) @map("created_at")
  updatedAt               DateTime @updatedAt @map("updated_at")
  
  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]
  
  @@map("chat_sessions")
}

model ChatMessage {
  id        Int      @id @default(autoincrement())
  sessionId Int      @map("session_id")
  role      String
  content   String   @db.Text
  timestamp DateTime @default(now())
  
  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@map("chat_messages")
}

model CorrelationResult {
  id           Int      @id @default(autoincrement())
  userId       String   @map("user_id")
  variableX    String   @map("variable_x")
  variableY    String   @map("variable_y")
  correlation  Float
  pValue       Float    @map("p_value")
  strength     String
  direction    String
  calculatedAt DateTime @default(now()) @map("calculated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("correlation_results")
}
```

#### Generate Client and Migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### Create Database Client

```typescript
// src/lib/server/db/client.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
```

### Step 2: Authentication Setup

#### Configure Auth.js

```typescript
// src/hooks.server.ts
import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '$lib/server/db/client';
import { env } from '$env/dynamic/private';

export const handle = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    }
  },
  secret: env.AUTH_SECRET
});
```

#### Protected Routes

```typescript
// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();
  
  if (!session) {
    throw redirect(303, '/login');
  }
  
  // Load user data
  const data = await prisma.dataPoint.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'asc' }
  });
  
  return {
    user: session.user,
    data: data.map(d => ({
      Date: d.date.toISOString().split('T')[0],
      ...(d.data as Record<string, any>)
    }))
  };
};
```

### Step 3: Component Migration

#### Data Table Component

```svelte
<!-- src/lib/components/DataTable.svelte -->
<script lang="ts">
  import type { RowData } from '$lib/types';
  
  export let data: RowData[] = [];
  export let onAddRow: (row: RowData) => void;
  export let onDeleteRow: (index: number) => void;
  
  let columns = ['Date', 'Variable_1', 'Variable_2'];
  let newRow: RowData = { Date: new Date().toISOString().split('T')[0] };
  
  $: if (data.length > 0) {
    columns = Object.keys(data[0]);
  }
  
  function handleAddRow() {
    onAddRow(newRow);
    newRow = { Date: new Date().toISOString().split('T')[0] };
  }
</script>

<div class="table-container">
  <table>
    <thead>
      <tr>
        {#each columns as col}
          <th contenteditable={col !== 'Date'}>{col}</th>
        {/each}
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <!-- Input row -->
      <tr class="input-row">
        {#each columns as col}
          <td>
            {#if col === 'Date'}
              <input type="date" bind:value={newRow[col]} />
            {:else}
              <input type="number" bind:value={newRow[col]} />
            {/if}
          </td>
        {/each}
        <td>
          <button on:click={handleAddRow}>Add</button>
        </td>
      </tr>
      
      <!-- Data rows -->
      {#each data as row, i}
        <tr>
          {#each columns as col}
            <td>{row[col]}</td>
          {/each}
          <td>
            <button on:click={() => onDeleteRow(i)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-container {
    overflow-x: auto;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    border: 1px solid var(--color-border);
    padding: 0.5rem;
    text-align: left;
  }
  
  .input-row {
    background-color: #fffacd;
  }
  
  input {
    width: 100%;
    padding: 0.25rem;
    border: 1px solid var(--color-border);
  }
</style>
```

#### Plot Visualization Component

```svelte
<!-- src/lib/components/PlotVisualization.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Plotly from 'plotly.js-dist';
  import type { RowData } from '$lib/types';
  
  export let data: RowData[];
  export let xAxis: string = 'Date';
  export let yAxis1: string = 'Variable_1';
  export let yAxis2: string = 'Variable_2';
  
  let plotDiv: HTMLDivElement;
  
  $: if (plotDiv && data.length > 0) {
    updatePlot();
  }
  
  function updatePlot() {
    const xData = data.map(d => d[xAxis]);
    const y1Data = data.map(d => d[yAxis1]);
    const y2Data = data.map(d => d[yAxis2]);
    
    const traces = [
      {
        x: xData,
        y: y1Data,
        type: 'scatter',
        mode: 'lines+markers',
        name: yAxis1,
        line: { color: '#3498db' }
      }
    ];
    
    if (yAxis2 && yAxis2 !== yAxis1) {
      traces.push({
        x: xData,
        y: y2Data,
        type: 'scatter',
        mode: 'lines+markers',
        name: yAxis2,
        yaxis: 'y2',
        line: { color: '#e74c3c' }
      });
    }
    
    const layout = {
      title: 'Data Visualization',
      xaxis: { title: xAxis },
      yaxis: { title: yAxis1 },
      yaxis2: {
        title: yAxis2,
        overlaying: 'y',
        side: 'right'
      },
      showlegend: true
    };
    
    Plotly.newPlot(plotDiv, traces, layout, { responsive: true });
  }
  
  onMount(() => {
    updatePlot();
  });
  
  onDestroy(() => {
    if (plotDiv) {
      Plotly.purge(plotDiv);
    }
  });
</script>

<div bind:this={plotDiv} class="plot"></div>

<style>
  .plot {
    width: 100%;
    height: 500px;
  }
</style>
```

### Step 4: API Routes Migration

#### Data Routes

```typescript
// src/routes/api/data/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import prisma from '$lib/server/db/client';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.getSession();
  
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const data = await prisma.dataPoint.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'asc' }
  });
  
  return json(
    data.map(d => ({
      Date: d.date.toISOString().split('T')[0],
      ...(d.data as Record<string, any>)
    }))
  );
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.getSession();
  
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const body = await request.json();
  const { Date: dateStr, ...data } = body;
  
  await prisma.dataPoint.create({
    data: {
      userId: session.user.id,
      date: new Date(dateStr),
      data: data
    }
  });
  
  return json({ success: true });
};
```

#### Correlation Routes

```typescript
// src/routes/api/correlations/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { calculateCorrelations } from '$lib/server/utils/stats';
import prisma from '$lib/server/db/client';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.getSession();
  
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const limit = parseInt(url.searchParams.get('limit') || '100');
  
  const correlations = await prisma.correlationResult.findMany({
    where: { userId: session.user.id },
    orderBy: { correlation: 'desc' },
    take: limit
  });
  
  return json({ correlations });
};

export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.getSession();
  
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Load data and calculate correlations
  const data = await prisma.dataPoint.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'asc' }
  });
  
  await calculateCorrelations(session.user.id, data);
  
  return json({ success: true });
};
```

### Step 5: State Management

#### Create Stores

```typescript
// src/lib/stores/data.ts
import { writable } from 'svelte/store';
import type { RowData } from '$lib/types';

export const tableData = writable<RowData[]>([]);

export async function loadData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  tableData.set(data);
}

export async function addRow(row: RowData) {
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row)
  });
  await loadData();
}
```

```typescript
// src/lib/stores/correlations.ts
import { writable } from 'svelte/store';

export const correlations = writable([]);

export async function calculateCorrelations() {
  await fetch('/api/correlations', { method: 'POST' });
  const response = await fetch('/api/correlations?limit=10');
  const data = await response.json();
  correlations.set(data.correlations);
}
```

### Step 6: Main Page

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import DataTable from '$lib/components/DataTable.svelte';
  import PlotVisualization from '$lib/components/PlotVisualization.svelte';
  import ChatInterface from '$lib/components/ChatInterface.svelte';
  import { tableData, addRow, deleteRow } from '$lib/stores/data';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  // Initialize store with server data
  $: $tableData = data.data;
  
  let xAxis = 'Date';
  let yAxis1 = 'Variable_1';
  let yAxis2 = 'Variable_2';
</script>

<div class="container">
  <h1>📊 Data Plotter</h1>
  
  <div class="grid">
    <div>
      <h2>Data Table</h2>
      <DataTable 
        data={$tableData}
        onAddRow={addRow}
        onDeleteRow={deleteRow}
      />
    </div>
    
    <div>
      <h2>Plot</h2>
      <PlotVisualization 
        data={$tableData}
        {xAxis}
        {yAxis1}
        {yAxis2}
      />
    </div>
  </div>
  
  <ChatInterface />
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 2rem;
  }
  
  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

**Configuration (vercel.json):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".svelte-kit",
  "framework": "sveltekit",
  "env": {
    "DATABASE_URL": "@database-url",
    "GOOGLE_CLIENT_ID": "@google-client-id",
    "GOOGLE_CLIENT_SECRET": "@google-client-secret",
    "AUTH_SECRET": "@auth-secret"
  }
}
```

### Cloudflare Pages

```bash
npm run build
npx wrangler pages publish .svelte-kit/cloudflare
```

### Self-Hosted (Node.js)

```bash
npm run build
node build/index.js
```

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// src/lib/utils/stats.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePearson } from './stats';

describe('Stats Utils', () => {
  it('calculates correlation correctly', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    
    const result = calculatePearson(x, y);
    
    expect(result.correlation).toBeCloseTo(1.0);
    expect(result.pValue).toBeLessThan(0.05);
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/app.test.ts
import { test, expect } from '@playwright/test';

test('can add data row', async ({ page }) => {
  await page.goto('/');
  
  // Fill input row
  await page.fill('[name="Variable_1"]', '42');
  await page.fill('[name="Variable_2"]', '35');
  
  // Add row
  await page.click('text=Add Row');
  
  // Verify row added
  await expect(page.locator('table tbody tr')).toHaveCount(2);
});
```

## Performance Optimization

### Code Splitting

SvelteKit automatically code-splits by route.

### Prerendering Static Pages

```typescript
// src/routes/about/+page.ts
export const prerender = true;
```

### Server-Side Rendering

```typescript
// src/routes/+page.server.ts
export const ssr = true;  // Default
```

### Streaming

```typescript
export const load: PageServerLoad = async () => {
  return {
    streamed: {
      data: loadDataAsync()
    }
  };
};
```

## Migration Checklist

- [ ] Set up SvelteKit project
- [ ] Install and configure Prisma
- [ ] Migrate database schema
- [ ] Set up Auth.js with Google provider
- [ ] Convert Flask routes to SvelteKit API routes
- [ ] Migrate components to Svelte
  - [ ] DataTable
  - [ ] PlotVisualization
  - [ ] CorrelationMatrix
  - [ ] ChatInterface
  - [ ] FileUpload
- [ ] Implement state management with stores
- [ ] Set up API routes
  - [ ] Data CRUD
  - [ ] Correlations
  - [ ] Chat
- [ ] Migrate styling (CSS variables)
- [ ] Write tests (unit + E2E)
- [ ] Deploy to staging
- [ ] Load testing
- [ ] Deploy to production
- [ ] Monitor and optimize

## Common Pitfalls

1. **SSR vs Client-Side**
   - Plotly.js only works in browser
   - Use `onMount()` for client-side-only code

2. **Database Connections**
   - Prisma connection pooling
   - Close connections properly

3. **Authentication**
   - Auth.js session management
   - Cookie configuration for production

4. **Type Safety**
   - Share types between server and client
   - Use Zod for runtime validation

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Auth.js Documentation](https://authjs.dev/)
- [Svelte Tutorial](https://learn.svelte.dev/)
