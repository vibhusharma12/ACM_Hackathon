# FocusFlow – Smart Productivity Planner

An intelligent productivity system that helps users decide what to work on and how to approach it using AI.

## Live Demo

https://acm-hackathon-eta.vercel.app
Recommended for the best experience.

## Overview

FocusFlow is a productivity system that helps users plan, prioritize, and execute tasks efficiently.
It combines structured workflows with AI-based suggestions to improve decision-making and focus.

## Key Features

### Task Planning

* Add tasks with name, deadline, and estimated time
* Automatic session calculation

### AI-Based Suggestions

* Uses Google Gemini API to analyze tasks
* Generates:

  * Difficulty level
  * Focus duration
  * Number of sessions
  * Break duration

### User Adjustment

* Modify AI-generated plans before starting
* Flexible control over task parameters

### Timer System

* Focus and break cycles
* Pause, resume, and reset functionality

### Dashboard and Insights

* Total workload tracking
* Urgent and overdue task detection
* Average priority insights

### Priority Engine

* Tasks are prioritized using:

  * Difficulty
  * Deadline urgency
  * Estimated effort

## Workflow

1. Enter a task
2. AI generates a suggested plan
3. Adjust parameters if needed
4. Execute focus sessions
5. Track productivity through dashboard

## Tech Stack

* Frontend: React (Vite)
* Styling: Custom CSS
* AI Integration: Google Gemini API
* State Management: React Hooks
* Version Control: Git and GitHub

## Setup (Optional)

To run the project locally:

1. Clone the repository:

```bash
git clone https://github.com/rutamup/ACM_Hackathon.git
cd ACM_Hackathon
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

4. Run the application:

```bash
npm run dev
```

5. Open in browser:
   http://localhost:5173

## Security Note

* The API key is not included in this repository
* You must provide your own key in a `.env` file
* Do not expose your API key publicly

## Problem Addressed

Traditional productivity tools rely on static timers and lack adaptability.
FocusFlow introduces intelligent task planning based on task complexity, deadlines, and effort.

## Future Improvements

* Enhanced AI planning logic
* Task progress tracking
* Notifications and reminders
* Collaboration features

## Team

Developed as part of a hackathon project focused on intelligent productivity systems.

## Demo Pitch

FocusFlow helps users decide what to work on and how to approach it by combining AI-based planning with structured execution.


