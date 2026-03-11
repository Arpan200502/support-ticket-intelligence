@'
# Support Ticket Intelligence - Full Architecture Analysis

## Overview

This system analyzes customer support tickets and automatically identifies recurring issues.

The system performs the following steps:

1. Loads support tickets from a CSV dataset
2. Cleans and preprocesses ticket text
3. Generates semantic embeddings using a transformer model
4. Clusters similar tickets using K-Means
5. Aggregates clusters into issue groups
6. Labels issues using rule-based classification
7. Detects issue trends over time
8. Calculates issue growth rate
9. Computes impact scores for issue prioritization
10. Assigns severity priority levels
11. Stores insights in an in-memory cache
12. Serves insights through a REST API

---

# 1. Data Ingestion

### File
backend/src/services/ticketLoader.js

### Dataset Location

backend/data/customer_support_tickets.csv

### Dataset Size

18,762 tickets

### Library Used

csv-parser

### Fields Extracted

```javascript
tickets.push({
  id: row["Ticket ID"],
  subject: row["Ticket Subject"],
  description: row["Ticket Description"],
  created_at: row["Ticket Created Time"],
  priority: row["Ticket Priority"]
});
```

### CSV Columns in Dataset

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

---

## 2. Text Preprocessing

### File

backend/src/services/preprocessTickets.js

### Purpose

Prepare ticket text for semantic embedding generation.

### Processing Steps

- Combine subject and description
- Replace placeholder tokens
- Remove HTML tags
- Remove URLs
- Normalize punctuation
- Normalize whitespace
- Convert text to lowercase
- Limit text length

### Code

```javascript
function preprocessTickets(tickets) {

  return tickets.map((ticket) => {

    let text = `${ticket.subject || ""} ${ticket.description || ""}`;

    text = text
      .replace(/\{.*?\}/g, " product ")
      .replace(/\[.*?\]/g, " item ")
      .replace(/<[^>]*>/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[—–•]+/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

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

### Output Structure

```
{
  id
  text
  created_at
  priority
}
```

---

## 3. Embedding Generation

### File

backend/src/services/embeddingService.js

### Model

Xenova/all-MiniLM-L6-v2

### Embedding Characteristics

| Property | Value |
|---|---|
| Vector Size | 384 dimensions |
| Pooling | mean pooling |
| Normalization | L2 normalization |

### Code

```javascript
import { pipeline } from '@xenova/transformers';

let extractor;

export async function getEmbedding(text) {

  if (!extractor) {

    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

  }

  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true
  });

  return Array.from(output.data);
}
```

---

## 4. Clustering Implementation

### File

backend/src/services/clusteringService.js

### Library

ml-kmeans

### Dynamic Cluster Count

```
k = floor( sqrt(n / 2) )
```

### Example

800 tickets → ~20 clusters

### Clustering Flow

1. Generate embeddings for each ticket
2. Run K-Means clustering
3. Assign cluster ID to each ticket

### Output Ticket Structure

```
{
  id
  text
  created_at
  priority
  cluster
}
```

---

## 5. Cluster Aggregation

### File

backend/src/services/clusterAggregator.js

### Purpose

Group tickets by cluster ID.

### Aggregated Structure

```
{
  clusterId
  count
  tickets[]
  examples[]
}
```

### Logic

- Count tickets per cluster
- Store ticket objects
- Keep 5 representative example texts

---

## 6. Issue Labeling

### File

backend/src/services/clusterLabeler.js

### Labeling Method

Rule-based keyword classification.

### Example Issue Categories

| Keyword | Issue Label |
|---|---|
| account, password | Account Access Issues |
| battery, charging | Battery Problems |
| network, wifi | Network Connectivity Issues |
| refund, return | Refund Requests |
| delivery, shipment | Delivery Problems |
| software, bug | Software Bugs |
| setup, installation | Product Setup Issues |

### Default label

General Support Issue

---

## 7. Issue Merging

Clusters with the same label are merged.

### Example

- Cluster A → Battery Problems → 15 tickets
- Cluster B → Battery Problems → 12 tickets
- Cluster C → Battery Problems → 8 tickets

### Merged result

Battery Problems → 35 mentions

### Output structure

```
{
  issue
  mentions
  examples
  tickets
}
```

---

## 8. Trend Detection

### File

backend/src/services/trendDetector.js

### Time Window Logic

```
Recent window  → last 7 days
Previous window → 7–14 days
```

### Growth Rate Formula

```
growth_rate = (recent - previous) / max(previous, 1)
```

### Trend Classification

| Condition | Result |
|---|---|
| recent > previous | increasing |
| recent < previous | decreasing |
| equal | stable |

### Returned Data

```
{
  trend
  growthRate
  recent
  previous
}
```

---

## 9. Impact Score Calculation

Issues are ranked using an impact score.

### Formula

```
impact_score = mentions × (1 + growth_rate)
```

### Growth rate is capped

```
growth_rate = min(growth_rate, 2)
```

### Example

```
mentions = 177
growth_rate = 2

impact_score = 177 × 3 = 531
```

### Purpose

- Prioritize large issues
- Detect rapidly increasing issues

---

## 10. Priority Classification

Issues are categorized by severity.

### Thresholds

| Impact Score | Priority |
|---|---|
| ≥ 500 | Critical |
| ≥ 250 | High |
| ≥ 100 | Medium |
| < 100 | Low |

### Example

```json
{
  "issue": "Battery Problems",
  "mentions": 177,
  "growth_rate": 2,
  "impact_score": 531,
  "priority": "critical"
}
```

---

## 11. Insights Cache

Computed insights are stored in memory.

```javascript
let insightsCache = null
```

### Purpose

- Avoid recomputing clustering
- Fast API responses

---

## 12. Automatic Refresh

Insights rebuild automatically.

### Interval

15 minutes

### Implementation

```javascript
setInterval(buildInsights, 15 * 60 * 1000)
```

---

## 13. Manual Refresh

### API endpoint

```
POST /rebuild-insights
```

Allows frontend to manually trigger rebuild.

---

## 14. API Endpoints

### GET /insights

Returns cached insights.

### Example

```json
{
  "issue": "Battery Problems",
  "mentions": 177,
  "trend": "increasing",
  "growth_rate": 2,
  "impact_score": 531,
  "priority": "critical",
  "examples": []
}
```

### POST /rebuild-insights

Rebuild insights.

### Example response

```json
{
  "status": "ok",
  "message": "Insights rebuilt"
}
```

---

## 15. Pipeline Diagram

```
CSV Ticket Dataset
        ↓
Ticket Loader
        ↓
Ticket Preprocessing
        ↓
Embedding Generation (MiniLM)
        ↓
K-Means Clustering
        ↓
Cluster Aggregation
        ↓
Trend Detection
        ↓
Cluster Labeling
        ↓
Impact Score Calculation
        ↓
Priority Classification
        ↓
Insights Cache
        ↓
API Endpoints
```

---

## 16. Performance Characteristics

| Metric | Value |
|---|---|
| Dataset size | 18,762 tickets |
| Processing subset | ~800 tickets |
| Embedding dimension | 384 |
| Clusters | ~20 |
| Auto refresh | 15 minutes |

### Typical runtime

20–60 seconds depending on dataset size

---

## 17. Future Improvements

### Planned upgrades

- React dashboard UI
- Database integration (MongoDB or pgvector)
- Real-time ticket ingestion
- Emerging issue detection
- LLM-based cluster summarization
'@ | Set-Content -Path "c:\Users\Arpan\Desktop\kreo support-ticket-intelligence\ARCHITECTURE_ANALYSIS.md" -Encoding UTF8