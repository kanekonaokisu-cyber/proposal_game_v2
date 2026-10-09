# Proposal Game Web App — Design Concept

## 1. Purpose

This project is a small web application for a marriage-proposal game to be played by one person in a hotel.

The goal is not to create a technically sophisticated puzzle game. The goal is to create an enjoyable, memorable experience in which the player solves several simple 4-choice questions, physically moves around the hotel to find the next QR code, and finally discovers the hotel room number where the proposal takes place.

## 2. Core Game Concept

Game flow:

Q1 QR → Q1 → (correct: Q2 / incorrect: DUMMY 1) → Q3 → (correct: Q4 / incorrect: DUMMY 2) → FINAL QR → 4-digit room number → room → proposal

The first Q1 QR starts the game directly; there is no separate welcome or start page. Each question QR can be answered only once. Reopening an answered question QR instructs the player to scan the next QR.

Each main question has exactly 4 choices. Exactly 1 is correct. The 3 incorrect choices all lead to the same dummy stage. Dummy stages do not reveal that the player made a mistake and eventually rejoin the main route.

## 3. Player Experience

The player scans a QR, answers a 4-choice question, receives a physical destination, walks through the hotel, finds another QR, and repeats. The intended feeling is: “I think this is right, but am I really sure?” The game should not automatically give hints or reveal mistakes.

## 4. Content Nodes

- Main: Q1, Q2, Q3, Q4
- Dummy: D1, D2
- Final: FINAL

Total content nodes: 7.

Question topics are intentionally undecided and must be editable. Possible themes: facts about the proposer, shared memories, photos, chronology, preferences, habits, and light-hearted personal questions.

## 5. QR Code Concept

QR codes identify game nodes rather than embedding question text. Example: QR-Q1 → Q1, QR-Q2 → Q2, QR-D1 → D1, QR-FINAL → FINAL.

QR identity and game content must be separated so that questions and routes can be changed without reprinting QR codes.

## 6. Hotel Exploration

The hotel itself is part of the game board. Planned hotel: Grand Nikko Tokyo Daiba.

Destination instructions should be editable and can use room-number landmarks, e.g. “Look between rooms 2714 and 2715.” Physical QR placement must be arranged with hotel permission and should not be attached directly to fire equipment, doors, or hotel property without permission.

## 7. Answer → Destination → Next Node

Each choice has its own physical destination instruction, but logically there are only two outcomes: correct → next main question; incorrect → shared dummy question.

Example: Q1 A → destination A → D1; B → destination B → D1; C → destination C → Q2; D → destination D → D1.

Important principle: physical routes may branch, but logical content branches stay minimal.

## 8. Real-Time Administrator / Game Master

The proposer needs a real-time administrator screen.

At minimum show: current node, each answer selected, correct/incorrect status, current progress, collected digits, and elapsed time. Record answer history, not only the latest answer.

## 9. Administrator Intervention

Normal gameplay should not automatically provide hints. The administrator monitors the player and can intervene when necessary.

Soft intervention examples: “ほんとに？？もう一度考えてみなくて大丈夫？”

Strong intervention: pause/stop the game or send a direct message if the player is heading somewhere inappropriate or is stuck. LINE can remain as an emergency fallback.

## 10. Room Number Handling

The exact room number is unknown until day-of check-in. Known constraints: expected floor 27 or 28; room number is 4 digits; first digit is expected to be 2.

The exact room number must be runtime configuration, not hard-coded.

Example: room 2807 → digits 2, 8, 0, 7.

## 11. Final Number Mechanism

Four digits are collected during the game and combined into the room number. Conceptually: Q2 result → digit 1; Q3 result → digit 2; Q4 result → digit 3; FINAL QR → digit 4.

The physical implementation of where the digits appear is flexible, e.g. a small number written on the back of a QR card. The administrator must be able to change the digits on the day.

## 12. Final Confirmation

After FINAL, show the assembled room number and ask for confidence, e.g. “あなたが導き出した答えは……2807。この答えに、自信がありますか？”

If the result is wrong, the administrator should be able to identify which main question was answered incorrectly and decide how to intervene. Do not automatically reveal the answer.

## 13. Content Editing Requirements

Admin-editable fields:

- node ID and type (main/dummy/final)
- question text
- optional image
- choice A/B/C/D text
- correct choice
- destination/instruction per choice
- next node ID per choice
- optional digit associated with the route
- global title, participant name, room number, final digits, game status

## 14. Player Screen

Mobile-first. Large readable question, large 4-choice buttons, clear answer confirmation, clear destination instruction, easy QR scanning flow, minimal scrolling, no unnecessary UI.

## 15. Administrator Screen

Desktop-first but usable on a phone. Show real-time progress, answer history, correctness, content editing, destination/routing editing, room/final-digit editing, intervention messaging, pause/stop, and reset.

## 16. MVP Scope

Build the simplest reliable version first.

MVP must support: QR → node; question + 4 choices; answer recording; destination display; next QR; real-time admin monitoring; main/dummy branching; final 4-digit display; admin editing of questions, choices, correctness, routing, destinations, and room number.

Do not build complex puzzle-generation algorithms, accounts/multi-user support, analytics, unrelated gamification, elaborate animations, or automatic hints in the MVP.

## 17. Design Principles

1. Easy to author: a non-professional should be able to edit content from the admin screen.

2. Experience over difficulty: 20–30 minutes should come from simple reasoning + uncertainty + hotel movement + QR discovery + shared memories + final reveal.

3. Keep logical branching small: varied physical destinations, shared dummy nodes.

4. Do not reveal mistakes early.

5. Room number is runtime data.

6. Separate content/configuration from implementation logic.

## 18. Suggested Architecture

The implementation technology is intentionally not prescribed. GitHub Copilot should inspect the repository and propose the simplest appropriate architecture.

Conceptually:

Game Data/DB ↔ Player Web App and Admin Web App.

Real-time synchronization is desirable because the administrator must see answers immediately. Favor simplicity, reliability, and easy testing over production-scale architecture.

## 19. Development Approach

1. Inspect the existing repository and current technology.
2. Propose the minimum architecture for the MVP.
3. Define data models for nodes, choices, routes, sessions, and room-number settings.
4. Build player flow first.
5. Build administrator monitoring second.
6. Add content editing third.
7. Add intervention/pause controls fourth.
8. Test the full game loop with sample data before polishing visuals.

Do not invent unnecessary features.

## 20. Sample Development Data

Use fictional room number 2807 during development.

Example graph:

Q1: A→D1, B→Q2 (correct), C→D1, D→D1
Q2: A→Q3 (correct), B→D1, C→D1, D→D1
D1→Q3
Q3: A→D2, B→D2, C→Q4 (correct), D→D2
D2→Q4
Q4: A→FINAL (correct), B→D2, C→D2, D→D2

This is test data only. Actual questions, destinations, correct answers, and digits will be configured later.

## 21. Success Criteria

The MVP is successful when the proposer can create/edit the six question nodes, configure correctness and per-choice destinations, run the game via smartphone QR scans, observe answers in real time, allow incorrect routes to converge through dummy nodes, configure final digits on the day, reach the final room number without source-code changes, and intervene manually when necessary.

The most important success criterion is that the system makes the real-world proposal game easy to prepare, safe to operate, and fun to experience.
