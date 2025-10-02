# Database Entity Relationship Diagram

## Overview

This document provides a visual representation of the database schema using Mermaid diagrams.

## Core Entities

```mermaid
erDiagram
    User ||--o| UserProfile : has
    User ||--o| UserSettings : has
    User ||--o{ CourseReview : writes
    User ||--o{ Certificate : earns
    User ||--o{ MentorshipMatch : participates
    User ||--o| MentorshipPreference : has

    Course ||--|{ Module : contains
    Course ||--o{ CourseReview : has
    Course ||--|{ Certificate : issues
    Course }|--|| Category : belongs_to

    Module ||--|{ Lesson : contains

    MentorshipMatch ||--|| User : has_mentor
    MentorshipMatch ||--|| User : has_mentee

    ForumCategory ||--|{ ForumTopic : contains
    ForumTopic ||--|{ ForumPost : contains
    ForumPost ||--|{ ForumComment : has
    ForumPost }|--|| User : created_by

    EmailTemplate ||--o{ EmailLog : generates
    User ||--o{ EmailPreference : has

    User {
        uuid id PK
        string email UK
        string password
        datetime createdAt
        datetime updatedAt
    }

    UserProfile {
        uuid id PK
        uuid userId FK
        string firstName
        string lastName
        datetime createdAt
    }

    Course {
        uuid id PK
        string title
        text description
        uuid categoryId FK
        datetime createdAt
        datetime updatedAt
    }

    Category {
        uuid id PK
        string name UK
        text description
        string icon
        datetime createdAt
        datetime updatedAt
    }

    Module {
        uuid id PK
        uuid courseId FK
        string title
        text description
        int order
        datetime createdAt
        datetime updatedAt
    }

    MentorshipMatch {
        uuid id PK
        uuid mentorId FK
        uuid menteeId FK
        enum status
        enum type
        datetime createdAt
        datetime updatedAt
    }

    EmailTemplate {
        uuid id PK
        string name UK
        string subject
        text content
        boolean isActive
        datetime createdAt
    }

    EmailLog {
        uuid id PK
        string recipient
        string subject
        string templateName
        datetime createdAt
    }

    ForumCategory {
        uuid id PK
        string name
        text description
        int order
        datetime createdAt
        datetime updatedAt
    }
```

## Legend

- PK: Primary Key
- FK: Foreign Key
- UK: Unique Key

## Relationship Types

- `||--||` : One to One
- `||--|{` : One to Many
- `}|--|{` : Many to Many
- `||--o|` : One to Zero or One
- `||--o{` : One to Zero or Many

## Notes

1. All entities use UUID as primary keys
2. Most entities include timestamps (createdAt, updatedAt)
3. Foreign key relationships are enforced at the database level
4. Enum types are used for status and type fields
5. Indexes are created on frequently queried fields (not shown in diagram)
