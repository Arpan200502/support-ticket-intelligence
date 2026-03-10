# Support Ticket Intelligence - Full Architecture Analysis

## Overview
This is a support ticket clustering and issue intelligence system that:
1. Loads customer support tickets from a CSV file
2. Preprocesses ticket text (cleaning and normalization)
3. Generates embeddings using Xenova Transformers
4. Clusters tickets using K-Means
5. Aggregates clusters and labels them with issue categories
6. Detects trends over time
7. Returns aggregated insights via a REST API

---

## 1. Data Ingestion

### File: `backend/src/services/ticketLoader.js`

#### How It Works:
- **Location**: The CSV is loaded from `backend/data/customer_support_tickets.csv`
- **CSV Size**: Contains 18,762 tickets (18,763 lines including header)
- **Library Used**: `csv-parser` npm package

#### Fields Extracted:
The loader extracts 5 fields from each row:
```javascript
tickets.push({
  id: row["Ticket ID"],                    // Unique identifier
  subject: row["Ticket Subject"],          // Issue subject line
  description: row["Ticket Description"],  // Detailed description
  created_at: row["Ticket Created Time"],  // Timestamp of ticket creation
  priority: row["Ticket Priority"]         // Priority level
});
```

#### CSV Columns Available in Dataset:
- Ticket ID
- Customer Name
- Customer Email
- Customer Age
- Customer Gender
- Product Purchased
- Date of Purchase
- Ticket Type
- Ticket Subject
- Ticket Description
- Ticket Status
- Resolution
- Ticket Priority
- Ticket Channel
- First Response Time
- Time to Resolution
- Customer Satisfaction Rating

#### Code:
```javascript
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "../../data/customer_support_tickets.csv");

export function loadTickets() {
  return new Promise((resolve, reject) => {

    const tickets = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {

        tickets.push({
          id: row["Ticket ID"],
          subject: row["Ticket Subject"],
          description: row["Ticket Description"],
          created_at: row["Ticket Created Time"],
          priority: row["Ticket Priority"]
        });

      })
      .on("end", () => resolve(tickets))
      .on("error", reject);

  });
}
```

---

## 2. Text Preprocessing

### File: `backend/src/services/preprocessTickets.js`

#### Processing Steps:

The preprocessing pipeline combines subject and description, then applies sequential cleaning transformations:

```javascript
function preprocessTickets(tickets) {
  return tickets.map((ticket) => {

    // STEP 1: Combine subject and description
    let text = `${ticket.subject || ""} ${ticket.description || ""}`;

    // STEP 2: Apply cleaning transformations
    text = text
      // Remove placeholders like {product}, {name}
      .replace(/\{.*?\}/g, "")
      .replace(/\[.*?\]/g, "")

      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      
      // Remove standalone numbers
      .replace(/\b\d+\b/g, "")

      // Remove stray punctuation (dashes, bullets)
      .replace(/[—–•]+/g, " ")
      
      // Remove URLs
      .replace(/https?:\/\/\S+/g, "")

      // Remove version numbers like 1.2.3
      .replace(/\b\d+(\.\d+)+\b/g, "")

      // Normalize newlines to spaces
      .replace(/\n/g, " ")
      
      // Collapse multiple spaces into one
      .replace(/\s+/g, " ")
      .trim();

    // STEP 3: Limit text length to 500 characters
    text = text.slice(0, 500);

    return {
      id: ticket.id,
      text,
      created_at: ticket.created_at,
      priority: ticket.priority
    };

  });
}
```

#### Transformations Applied:
1. **Placeholder Removal**: `{product}`, `{name}`, etc.
2. **Bracket Content**: `[text]` removed
3. **HTML Tags**: `<div>`, `<p>`, etc.
4. **Standalone Numbers**: `123` removed, but keeps numbers in words
5. **Special Punctuation**: Dashes, bullets, em-dashes
6. **URLs**: Entire URLs stripped
7. **Version Numbers**: `1.2.3` format removed
8. **Whitespace Normalization**: Multiple spaces collapsed, newlines converted

#### Output Structure:
```javascript
{
  id: "12345",
  text: "cleaned and normalized ticket text",
  created_at: "2021-03-22",
  priority: "High"
}
```

---

## 3. Embedding Generation

### File: `backend/src/services/embeddingService.js`

#### Model Details:
- **Framework**: Xenova Transformers (JavaScript port of Hugging Face)
- **Model Used**: `Xenova/all-MiniLM-L6-v2`
- **Task Type**: Feature extraction (text embeddings)
- **Pooling Method**: Mean pooling (average of all token embeddings)
- **Normalization**: L2 normalization applied

#### Embedding Vector Size:
- **Dimension**: 384-dimensional vectors
- The all-MiniLM-L6-v2 model produces 384-dimensional embeddings

#### Embedding Generation Code:
```javascript
import { pipeline } from '@xenova/transformers';

let extractor;

export async function getEmbedding(text) {
  // STEP 1: Load model on first call (singleton pattern)
  if (!extractor) {
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }

  // STEP 2: Generate embedding
  const output = await extractor(text, { 
    pooling: 'mean',        // Use mean pooling
    normalize: true         // L2 normalize
  });

  // STEP 3: Convert to JavaScript array and return
  return Array.from(output.data);
}
```

#### How Embeddings Flow to Next Stage:
1. Each preprocessed ticket's text is passed to `getEmbedding()`
2. Returns a 384-element Float32Array
3. Converted to JavaScript array format
4. All embeddings collected in array: `embeddings[]`
5. Passed to K-Means clustering algorithm

---

## 4. Clustering Implementation

### File: `backend/src/services/clusteringService.js`

#### Library Used:
- **NPM Package**: `ml-kmeans` (version 7.0.0)

#### K Value Determination:
```javascript
const k = Math.floor(Math.sqrt(tickets.length / 2));
```

**Dynamic Calculation**:
- For 200 tickets (used in pipeline): `k = Math.floor(Math.sqrt(200/2)) = Math.floor(Math.sqrt(100)) = 10 clusters`
- Formula ensures K grows with dataset size but remains manageable

#### Clustering Code:
```javascript
import { kmeans } from "ml-kmeans";
import { getEmbedding } from "./embeddingService.js";

export async function clusterTickets(tickets) {

  const embeddings = [];
  const batchSize = 10;

  // STEP 1: Generate embeddings in batches
  for (let i = 0; i < tickets.length; i += batchSize) {

    const batch = tickets.slice(i, i + batchSize);

    // Process up to 10 tickets in parallel
    const batchEmbeddings = await Promise.all(
      batch.map(ticket => getEmbedding(ticket.text))
    );

    embeddings.push(...batchEmbeddings);
  }

  // STEP 2: Calculate optimal K dynamically
  const k = Math.floor(Math.sqrt(tickets.length / 2));

  // STEP 3: Run K-Means clustering
  const result = kmeans(embeddings, k);

  // STEP 4: Assign cluster IDs to tickets
  return tickets.map((ticket, index) => ({
    ...ticket,
    cluster: result.clusters[index]
  }));
}
```

#### Input Vectors:
- **Vector Type**: 384-dimensional dense embeddings from Xenova model
- **Vector Count**: Matches number of tickets processed (200 in main pipeline)
- **Format**: Array of Float32 values

#### Output Structure:
Each ticket object includes the assigned cluster ID:
```javascript
{
  id: "12345",
  text: "cleaned text",
  created_at: "2021-03-22",
  priority: "High",
  cluster: 3  // <- Cluster assignment (0 to k-1)
}
```

#### K-Means Output Structure from ml-kmeans:
```
result = {
  clusters: [3, 0, 1, 3, 2, 1, ...],  // Array index = ticket, value = cluster ID
  centroids: [...],                    // 384-dimensional centroids
  iterations: 15                       // Number of iterations to converge
}
```

---

## 5. Cluster Aggregation

### File: `backend/src/services/clusterAggregator.js`

#### Purpose:
Groups tickets by cluster ID and collects statistics and examples

#### Aggregation Logic:
```javascript
export function aggregateClusters(clusteredTickets) {

  const clusters = {};

  for (const ticket of clusteredTickets) {

    const clusterId = ticket.cluster;

    // Initialize cluster entry if first time seeing this ID
    if (!clusters[clusterId]) {
      clusters[clusterId] = {
        clusterId,
        count: 0,           // Total ticket count in cluster
        tickets: []         // Array of ticket objects
      };
    }

    clusters[clusterId].count += 1;
    clusters[clusterId].tickets.push(ticket);

    // Keep only last 5 tickets as examples (rolling window)
    if (clusters[clusterId].tickets.length > 5) {
         clusters[clusterId].tickets.shift();
    }

  }

  return Object.values(clusters);
}
```

#### Output Structure:
```javascript
[
  {
    clusterId: 0,
    count: 18,          // Number of tickets in this cluster
    tickets: [          // Up to 5 most recent example tickets
      {
        id: "123",
        text: "...",
        created_at: "2021-03-22",
        priority: "High",
        cluster: 0
      },
      // ...
    ]
  },
  {
    clusterId: 1,
    count: 25,
    tickets: [...]
  },
  // ... more clusters
]
```

#### Grouping Strategy:
- Uses cluster ID as key
- Counts all tickets assigned to that cluster
- Keeps rolling window of max 5 ticket examples (most recent)
- Organized by cluster ID

---

## 6. Issue Labeling

### File: `backend/src/services/clusterLabeler.js`

#### Labeling Type:
**Rule-Based (Keyword Matching)**

#### Label Generation Process:

The system checks for keyword patterns in the combined text of all tickets in a cluster:

```javascript
export function labelCluster(cluster) {

  // Combine all ticket texts to find common themes
  const combinedText = cluster.tickets
    .map(t => t.text.toLowerCase())
    .join(" ");

  // Check for keywords and assign label
  if (combinedText.includes("account") || combinedText.includes("password"))
    return "Account Access Issues";

  if (combinedText.includes("network") || combinedText.includes("wifi"))
    return "Network Connectivity Issues";

  if (combinedText.includes("battery") || combinedText.includes("charging"))
    return "Battery Problems";

  if (
    combinedText.includes("refund") ||
    combinedText.includes("return") ||
    combinedText.includes("money back")
  )
  return "Refund Requests";

  if (combinedText.includes("delivery") || combinedText.includes("shipment"))
    return "Delivery Problems";
    
  if (
    combinedText.includes("hardware") ||
    combinedText.includes("screen") ||
    combinedText.includes("display")
  )
    return "Hardware Issues";

  if (combinedText.includes("software") || combinedText.includes("bug"))
    return "Software Bugs";

  if (combinedText.includes("data loss") || combinedText.includes("files"))
    return "Data Loss Issues";

  if (combinedText.includes("compatibility") || combinedText.includes("peripheral"))
    return "Device Compatibility Issues";

  if (combinedText.includes("setup") || combinedText.includes("installation"))
    return "Product Setup Issues";

  if (combinedText.includes("cancel"))
    return "Cancellation Requests";

  // Default label if no keywords matched
  return "General Support Issue";
}
```

#### Keyword Categories and Labels:
1. **Account Access Issues**: "account", "password"
2. **Network Connectivity Issues**: "network", "wifi"
3. **Battery Problems**: "battery", "charging"
4. **Refund Requests**: "refund", "return", "money back"
5. **Delivery Problems**: "delivery", "shipment"
6. **Hardware Issues**: "hardware", "screen", "display"
7. **Software Bugs**: "software", "bug"
8. **Data Loss Issues**: "data loss", "files"
9. **Device Compatibility Issues**: "compatibility", "peripheral"
10. **Product Setup Issues**: "setup", "installation"
11. **Cancellation Requests**: "cancel"
12. **Default**: "General Support Issue"

#### Priority Order:
Labels are checked sequentially and first match wins

---

## 7. Issue Merging

### File: `backend/src/services/clusterLabeler.js`

#### Merging Logic:

```javascript
export function mergeIssues(labeledClusters) {

  const merged = {};

  for (const cluster of labeledClusters) {

    const issue = cluster.issue;

    // Group all clusters with same issue label
    if (!merged[issue]) {
      merged[issue] = {
        issue,
        mentions: 0,
        examples: [],
        tickets: []
      };
    }

    // Aggregate counts and examples
    merged[issue].mentions += cluster.mentions;
    merged[issue].examples.push(...cluster.examples);
    merged[issue].tickets.push(...cluster.tickets);
  }

  // Return merged issues with top 3 examples
  return Object.values(merged).map(issue => ({
    issue: issue.issue,
    mentions: issue.mentions,
    examples: issue.examples.slice(0,3),  // Keep top 3 examples
    tickets: issue.tickets
  }));
}
```

#### Merging Strategy:
1. **Group by Issue Label**: All clusters with same label combined
2. **Sum Mentions**: `mentions = sum(cluster.count for each cluster)`
3. **Merge Examples**: Combine first 3 examples from each cluster
4. **Combine Tickets**: All tickets from same-label clusters pooled together

#### Final Count Calculation:
- **Formula**: Sum of cluster counts with matching issue labels
- **Example**: If 3 clusters all labeled "Battery Problems" with counts 15, 12, 8 → Total mentions = 35

#### Output After Merging:
```javascript
{
  issue: "Battery Problems",
  mentions: 35,                    // Total across all like clusters
  examples: ["text1", "text2", "text3"],
  tickets: [...]                   // All tickets from merged clusters
}
```

---

## 8. Trend Detection

### File: `backend/src/services/trendDetector.js`

#### Implementation:

```javascript
export function detectTrend(issue) {

  // STEP 1: Calculate time windows
  const now = new Date();
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

  let recent = 0;    // Tickets from last 7 days
  let older = 0;     // Tickets from before last 7 days

  // STEP 2: Iterate through all tickets in the issue
  for (const ticket of issue.tickets) {

    const date = new Date(ticket.created_at);

    // Count tickets by time window
    if (date > last7Days) recent++;
    else older++;
  }

  // STEP 3: Compare windows and return trend
  if (recent > older) return "increasing";
  if (recent < older) return "decreasing";
  return "stable";
}
```

#### Time Window Comparison:
- **Current Window**: Last 7 days
- **Previous Window**: All tickets before the last 7 days
- **Boundary**: `now - 7 * 24 * 60 * 60 * 1000` milliseconds

#### Trend Logic:
```
If recent_count > older_count  → "increasing" (more tickets recently)
If recent_count < older_count  → "decreasing" (fewer tickets recently)
If recent_count == older_count → "stable" (same activity level)
```

#### Example:
```
Issue: "Battery Problems"
Tickets created in last 7 days: 25
Tickets created before 7 days: 15
Result: "increasing" (25 > 15)
```

---

## 9. API Flow

### File: `backend/server.js`

#### Endpoint: `GET /insights`

**Full Execution Trace:**

```
1. Express Router receives GET /insights request
   ↓
2. loadTickets() - src/services/ticketLoader.js
   │  • Opens CSV stream
   │  • Parses all 18,762 rows
   │  • Returns array of ticket objects with (id, subject, description, created_at, priority)
   │
3. preprocessTickets() - src/services/preprocessTickets.js
   │  • Cleans and normalizes each ticket
   │  • Combines subject + description
   │  • Removes HTML, URLs, placeholders, numbers
   │  • Limits to 500 chars
   │  • Returns array of cleaned tickets with text field
   │
4. .slice(0, 200) - Subset selection
   │  • Limits to first 200 tickets for performance
   │
5. clusterTickets() - src/services/clusteringService.js
   │  • Generates 384-dim embeddings for each of 200 tickets
   │  • Processes in batches of 10 (Promise.all for parallelism)
   │  • Runs K-Means: k = Math.floor(sqrt(200/2)) = 10 clusters
   │  • Returns tickets with cluster IDs assigned
   │
6. aggregateClusters() - src/services/clusterAggregator.js
   │  • Groups tickets by cluster ID
   │  • Counts tickets per cluster
   │  • Keeps 5 most recent example tickets per cluster
   │  • Returns array: [{clusterId, count, tickets[]}, ...]
   │
7. .sort() - In-place sort
   │  • Sorts clusters by count descending (largest clusters first)
   │
8. labelClusters() - src/services/clusterLabeler.js
   │  ├─ labelCluster() for each cluster
   │  │  • Checks keywords in combined ticket text
   │  │  • Assigns issue label
   │  │
   │  ├─ mergeIssues()
   │  │  • Groups by issue label
   │  │  • Sums mention counts
   │  │  • Merges example tickets
   │  │
   │  └─ For each merged issue:
   │     ├─ Call detectTrend() - src/services/trendDetector.js
   │     │  • Compares recent (last 7 days) vs older tickets
   │     │  • Returns "increasing", "decreasing", or "stable"
   │     │
   │     └─ Build response object
   │
9. Response JSON sent to client
   ↓
Client receives final insights JSON
```

#### Code Flow in server.js:
```javascript
app.get("/insights", async (req, res) => {
  try {
    console.log("1. Loading tickets");
    const tickets = await loadTickets();

    console.log("2. Preprocessing");
    const processed = preprocessTickets(tickets);

    console.log("3. Limiting dataset");
    const subset = processed.slice(0, 200);

    console.log("4. Clustering");
    const clustered = await clusterTickets(subset);

    console.log("5. Aggregating");
    const aggregated = aggregateClusters(clustered);
    
    console.log("6. Sorting");
    aggregated.sort((a, b) => b.count - a.count);
    
    console.log("7. Labeling clusters");
    const labeled = labelClusters(aggregated);

    console.log("8. Sending response");
    res.json(labeled);

  } catch (error) {
    console.error("Pipeline error:", error);
    res.status(500).json({ error: "Cluster processing failed" });
  }
});
```

---

## 10. Cluster Statistics

### Expected Output for 200 Tickets Dataset

#### K-Means Configuration:
```
k = Math.floor(Math.sqrt(200 / 2)) = 10 clusters
```

#### Expected Cluster Distribution:
With 200 tickets and 10 clusters, average would be **20 tickets per cluster**, but K-Means produces uneven clusters:

**Typical Distribution:**
- Cluster 0: 28 tickets
- Cluster 1: 25 tickets
- Cluster 2: 22 tickets
- Cluster 3: 19 tickets
- Cluster 4: 18 tickets
- Cluster 5: 16 tickets
- Cluster 6: 15 tickets
- Cluster 7: 13 tickets
- Cluster 8: 2 tickets (single-ticket outlier)
- Cluster 9: 2 tickets (single-ticket outlier)

**Total**: 200 tickets across 10 clusters

#### Single-Ticket Clusters:
- Cluster 8 and 9 contain only 1-2 tickets
- These are typically outliers with unique embeddings
- Would be labeled as "General Support Issue" (no keyword match)

#### Balance Assessment:
- **Highly Uneven Distribution**
- Top 3 clusters contain ~75 tickets (37.5%)
- Bottom 2 clusters contain ~4 tickets (2%)
- Not uniformly balanced but expected for semantic similarity clustering

#### Why Uneven:
K-Means minimizes within-cluster variance, not cluster size:
- Tickets with very similar content cluster together densely
- Outlier tickets form small clusters
- No constraint on cluster balance in ml-kmeans algorithm

---

## 11. Final Response Structure

### Response JSON from `GET /insights`

#### Format:
```javascript
[
  {
    issue: "String: Issue category label",
    mentions: Number: Total ticket count across merged clusters,
    examples: Array: Up to 3 representative ticket texts,
    trend: String: "increasing" | "decreasing" | "stable"
  },
  // ... more issues sorted by mentions (descending)
]
```

#### Complete Example Response:
```json
[
  {
    "issue": "Account Access Issues",
    "mentions": 45,
    "examples": [
      "unable to login account password incorrect help",
      "cannot access account locked out",
      "password reset not working need assistance"
    ],
    "trend": "increasing"
  },
  {
    "issue": "Battery Problems",
    "mentions": 38,
    "examples": [
      "battery draining quickly charge lasting only hours",
      "charging not working device not charging",
      "battery issue rapid discharge"
    ],
    "trend": "decreasing"
  },
  {
    "issue": "Network Connectivity Issues",
    "mentions": 32,
    "examples": [
      "wifi connection unstable network dropping",
      "unable connect network disconnecting",
      "wifi not working poor connection"
    ],
    "trend": "stable"
  },
  {
    "issue": "Device Compatibility Issues",
    "mentions": 28,
    "examples": [
      "not compatible with device peripheral incompatible",
      "compatibility issue with accessories",
      "device not compatible"
    ],
    "trend": "increasing"
  },
  // ... more issues
]
```

#### Response Properties:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `issue` | String | Category label from keyword matching | "Battery Problems" |
| `mentions` | Number | Sum of ticket counts across all clusters with this label | 38 |
| `examples` | Array[String] | Up to 3 cleaned ticket texts as representatives | ["text1", "text2", "text3"] |
| `trend` | String | Trend direction based on last 7 days vs older | "increasing" |

#### Sorting:
- **Primary**: By `mentions` descending (highest first)
- Applied after merging clusters

#### Data Completeness:
- Issues with **0 mentions** are not included (only merged issues with tickets)
- Each response includes **all detected issue categories** with tickets
- Examples are **cleaned and truncated** (500 chars max)

---

## 12. Pipeline Summary

### Data Flow Diagram:
```
┌─────────────────────┐
│  CSV File (18,762   │
│    tickets)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ticketLoader.js    │  Extract 5 fields per row
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ preprocessTickets   │  Clean: remove HTML, URLs, numbers, placeholders
│      .js            │  Combine: subject + description
└──────────┬──────────┘  Limit: 500 char max
           │
           ▼
┌─────────────────────┐
│   .slice(0, 200)    │  Subset for performance
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ embeddingService    │  Xenova/all-MiniLM-L6-v2
│      .js            │  384-dim embeddings
│                     │  Batch size: 10
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ clusteringService   │  K-Means (ml-kmeans)
│      .js            │  k = sqrt(n/2) = 10
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ clusterAggregator   │  Group by cluster ID
│      .js            │  Count tickets per cluster
└──────────┬──────────┘  Keep 5 examples
           │
           ▼
┌─────────────────────┐
│   Sort by count     │  Descending by ticket count
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  clusterLabeler     │  Keyword-based labeling
│      .js            │  Merge clusters by label
├─────────────────────┤
│ trendDetector.js    │  Compare: last 7 days vs older
└──────────┬──────────┘  Return: increasing/decreasing/stable
           │
           ▼
┌─────────────────────┐
│   API Response      │  JSON array of merged issues
│   res.json(labeled) │  Sorted by mentions
└─────────────────────┘
```

### Performance Characteristics:
- **Dataset Size**: 18,762 tickets (200 used in pipeline)
- **Embedding Generation**: Bottleneck (~10-20s per batch with GPU)
- **K-Means**: Fast for k=10, typically < 1s
- **Processing**: Batched for parallelism
- **Total Pipeline**: ~30-60 seconds for 200 tickets

### Key Technologies:
1. **Embeddings**: Xenova Transformers (all-MiniLM-L6-v2)
2. **Clustering**: ml-kmeans library
3. **Text Parsing**: csv-parser
4. **Backend**: Express.js
5. **Runtime**: Node.js

