
# Support Ticket Issue Intelligence System

## Overview
Customer support teams receive large volumes of tickets every day. Hidden within these tickets are signals about product failures, outages, usability issues, and operational problems.

Manually identifying patterns across thousands of tickets is slow and inefficient.

This project builds a system that automatically analyzes support tickets to:

- Identify clusters of related issues
- Detect trends in ticket frequency over time
- Highlight emerging operational problems
- Visualize insights through a dashboard

The system processes ticket text, groups similar tickets using machine learning techniques, and surfaces insights that help support teams prioritize problems.

---

# System Architecture

The system has two major parts.

Backend  
Responsible for ticket ingestion, preprocessing, clustering, trend detection, and analytics.

Frontend  
A React dashboard that visualizes the detected issues and trends.

Pipeline flow:

Dataset  
→ Ticket Ingestion  
→ Text Preprocessing  
→ Embedding Generation  
→ Ticket Clustering  
→ Cluster Aggregation  
→ Issue Labeling  
→ Trend Detection  
→ Impact Score Calculation  
→ API  
→ React Dashboard

---

# Architecture Flow

User Support Ticket  
↓  
Ticket Ingestion  
↓  
Text Preprocessing  
↓  
Transformer Embeddings  
↓  
K-Means Clustering  
↓  
Cluster Aggregation  
↓  
Issue Labeling  
↓  
Trend Detection  
↓  
Impact Score & Severity  
↓  
Insights API  
↓  
React Dashboard

---

# Dataset

Dataset used:

Customer Support Ticket Dataset  
https://www.kaggle.com/datasets/suraj520/customer-support-ticket-dataset

Important fields used:

- Ticket Subject
- Ticket Description
- Ticket Created Time
- Ticket Priority

---

# Backend Modules

## Ticket Loader
backend/src/services/ticketLoader.js

Loads tickets from the dataset CSV file and converts them into structured ticket objects.

Fields extracted:

- id
- subject
- description
- created_at
- priority

---

## Text Preprocessing
backend/src/services/preprocessTickets.js

Ticket text is cleaned before analysis.

Cleaning steps:

- remove HTML tags
- remove URLs
- remove placeholders
- normalize whitespace
- limit text length

This improves embedding quality.

---

## Embedding Generation
backend/src/services/embeddingService.js

Ticket text is converted into embeddings using:

Xenova/all-MiniLM-L6-v2

Each ticket becomes a 384 dimensional vector representing semantic meaning.

This allows grouping tickets based on meaning rather than keywords.

---

## Ticket Clustering
backend/src/services/clusteringService.js

Uses K-Means clustering to group tickets with similar embeddings.

Clusters represent recurring issues such as:

- Network failures
- Billing errors
- Account access problems
- Application crashes

---

## Cluster Aggregation
backend/src/services/clusterAggregator.js

Aggregates tickets belonging to the same cluster and calculates:

- ticket count
- example tickets
- associated ticket objects

---

## Issue Labeling
backend/src/services/clusterLabeler.js

Clusters are labeled using keyword rules.

Examples:

battery → Battery Problems  
account → Account Access Issues  
refund → Refund Requests

---

## Trend Detection
backend/src/services/trendDetector.js

Trend detection compares two time windows.

Recent window
Last 7 days

Previous window
7–14 days

Formula:

growth_rate = (recent - previous) / max(previous, 1)

Trend classification:

- increasing
- decreasing
- stable

Growth rate indicates how quickly an issue frequency is changing.

---

## Impact Score and Severity

Impact score prioritizes issues.

impact_score = mentions × (1 + growth_rate)

This ensures the system prioritizes issues that:

- affect many users
- are increasing rapidly

Severity levels:

- Critical
- High
- Medium
- Low

Important insight:

Growth rate shows how fast an issue is increasing.  
Severity shows how large the issue is overall.

Two issues may grow at the same rate, but the one affecting more users will have higher severity.

---

# Backend API

GET /insights

Returns detected issues with:

- issue name
- mentions
- trend
- growth percentage
- severity
- example tickets

POST /rebuild-insights

Triggers manual refresh of insights.

---

# Frontend

Built using React + Vite.

Key components:

App.jsx  
Handles API calls and sorting.

IssueList.jsx  
Displays detected issue clusters.

IssueCard.jsx  
Displays issue details.

Header.jsx  
Dashboard header and refresh button.

---

# Dashboard Features

The dashboard displays:

- Issue clusters
- Number of ticket mentions
- Growth percentage
- Trend indicators
- Severity level
- Example tickets

Issues are sorted by impact score so the most important problems appear first.

---

# Updating Results

Because the dataset is static, real user simulation is not possible.

However the system demonstrates update capability.

Automatic refresh  
Backend rebuilds insights every 15 minutes.

Manual refresh  
Dashboard refresh button recomputes analytics.

If new tickets are added to the dataset, the system updates insights accordingly.

---

# How To Run The Project

## 1 Clone Repository

git clone <https://github.com/Arpan200502/support-ticket-intelligence>

cd support-ticket-intelligence

---

## 2 Install Backend

cd backend

npm install

---

## 3 Start Backend Server

node server.js

Backend runs on

http://localhost:5000

---

## 4 Install Frontend

cd ../frontend

npm install

---

## 5 Start Frontend

npm run dev

Frontend runs on

http://localhost:5173

---

# Scalability Improvements

If more time were available the system could be extended with:

- Redis caching for frequently accessed insights
- real-time ticket ingestion APIs
- background workers for embedding generation
- load balancing for backend services
- database storage for embeddings
- distributed clustering pipelines
- LLM based issue labeling
- advanced dashboard analytics

These improvements would allow the system to scale to millions of tickets.

---

# Author

Arpan Mukherjee  
Full Stack Developer  
Techno India University
