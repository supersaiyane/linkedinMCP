---
title: Automation Recipes
sidebar_label: Automation Recipes
sidebar_position: 12
audience: L2-L3
---

# Automation Recipes

Ready-to-paste prompt templates for common LinkedIn, Medium, and Telegram workflows. Copy any recipe into Claude Desktop and replace the `<UPPER_SNAKE>` placeholders with your content.

**TL;DR:** Each recipe below has a goal, a prompt template you can paste directly into Claude Desktop, and the expected outcome. Start with Content Creation if you are new; move to Advanced workflows once you are comfortable with the basics.

**Prerequisite knowledge:** You have completed the [Getting-Started](Getting-Started) guide and can authenticate with LinkedIn. For Medium recipes, you need a [Medium-Setup](Medium-Setup) integration token. For Telegram notifications, complete [Telegram-Setup](Telegram-Setup).

---

## Content Creation

### Quick Post

**Goal:** Publish a short text update to your LinkedIn feed immediately.

**Prompt template:**

```text
Post on LinkedIn: <YOUR_TEXT>
```

**Expected outcome:** Claude calls `linkedin_create_post` with your text. You receive a confirmation message containing the post URL and URN.

---

### Post with Hashtags

**Goal:** Publish a post with specific hashtags appended automatically.

**Prompt template:**

```text
Create a LinkedIn post about <TOPIC>. Add hashtags: <TAG_1>, <TAG_2>, <TAG_3>
```

**Expected outcome:** Claude formats the post body, appends `#TAG_1 #TAG_2 #TAG_3` after a blank line, and publishes. The confirmation includes the live post URL.

---

### Engagement-Optimized Post

**Goal:** Take a rough draft and reshape it for maximum LinkedIn engagement before publishing.

**Prompt template:**

```text
Here is my draft LinkedIn post:

<PASTE_YOUR_DRAFT>

Rewrite it for maximum engagement:
- Strong hook in the first line (pattern interrupt or surprising stat)
- Short paragraphs (1-2 sentences each)
- Use line breaks for readability
- End with a question to drive comments
- Add 5 relevant hashtags

Show me the rewrite, then post it when I say go.
```

**Expected outcome:** Claude returns a rewritten draft and waits for your approval. After you confirm, it publishes and returns the post URL.

---

### Post from an Idea

**Goal:** Turn a rough idea into a polished LinkedIn post without writing the copy yourself.

**Prompt template:**

```text
I want to post on LinkedIn about <TOPIC>. Write an engaging post with:
- A hook in the first line
- 3 short paragraphs
- A call to action at the end
- 5 relevant hashtags

Show me the draft first, then post it after I approve.
```

**Expected outcome:** Claude generates a full draft, presents it for review, and publishes only after you explicitly approve.

---

## Scheduling

### Single Scheduled Post

**Goal:** Write a post now and have it published at a specific future time.

**Prompt template:**

```text
Schedule a LinkedIn post for <DATE> at <TIME>: <YOUR_TEXT>
```

**Expected outcome:** Claude calls `linkedin_schedule_post` with the provided text and an ISO 8601 timestamp. You receive a confirmation with the schedule ID and the exact publish time.

---

### Batch Schedule

**Goal:** Create and schedule multiple posts in a single conversation.

**Prompt template:**

```text
I have 5 posts for this week. Draft a LinkedIn post for each topic and schedule them:

1. Monday 9am: <TOPIC_1>
2. Tuesday 9am: <TOPIC_2>
3. Wednesday 9am: <TOPIC_3>
4. Thursday 9am: <TOPIC_4>
5. Friday 9am: <TOPIC_5>

Show me all drafts first for approval before scheduling.
```

**Expected outcome:** Claude drafts all five posts and presents them as a numbered list. After your approval, it schedules each one and returns five schedule IDs with their publish times.

---

### Weekly Content Calendar

**Goal:** Plan and schedule an entire week of LinkedIn content around themes.

**Prompt template:**

```text
Help me plan my LinkedIn content for next week. I want to post about:
- Monday: A professional insight about <INDUSTRY_OR_FIELD>
- Wednesday: A tip or lesson learned from <RECENT_EXPERIENCE>
- Friday: A personal reflection or weekend thought

Draft all three posts, show them to me, then schedule them for 10am each day.
```

**Expected outcome:** Claude produces three drafts aligned to the themes, gets your approval, and schedules each post for 10:00 AM on the corresponding day. You receive three schedule confirmations.

---

## Articles

### Share a Blog Post

**Goal:** Share an existing article URL on LinkedIn with a compelling commentary.

**Prompt template:**

```text
Share my article "<ARTICLE_TITLE>" from <ARTICLE_URL> on LinkedIn.
Write a compelling description that makes people want to click.
```

**Expected outcome:** Claude calls `linkedin_publish_article` with the URL and a generated description. The result is a LinkedIn article-style post linking to the original content.

---

### Blog-to-LinkedIn Pipeline

**Goal:** Summarize a blog post into a LinkedIn-native format with key takeaways.

**Prompt template:**

```text
Read my blog post at <BLOG_URL>. Create a LinkedIn post that:
- Summarizes the 3 key takeaways
- Uses a hook that creates curiosity
- Includes a link to the full article
- Has 5 relevant hashtags

Post it when I approve.
```

**Expected outcome:** Claude reads the URL content, drafts a summary post with a link, shows you the draft, and publishes after approval.

---

### Medium Article

**Goal:** Publish a long-form article to Medium with tags and draft/public mode.

**Prompt template:**

```text
Write a Medium article about <TOPIC>. Use markdown formatting with headers,
code blocks, and bullet points. Save it as a draft with tags: <TAG_1>, <TAG_2>, <TAG_3>.
```

**Expected outcome:** Claude calls `medium_create_post` with the generated markdown, your tags, and `publishStatus: "draft"`. You receive the Medium draft URL.

---

### Cross-Platform: Medium + LinkedIn

**Goal:** Publish a full article on Medium and a teaser post on LinkedIn in one conversation.

**Prompt template:**

```text
Write a comprehensive article about <TOPIC> (1500+ words with examples).

1. Publish the full article on Medium as a draft with tags <TAG_1>, <TAG_2>
2. Create a LinkedIn post with the 3 key takeaways and a teaser
3. Schedule the LinkedIn post for tomorrow at 10am

Show me both drafts before publishing.
```

**Expected outcome:** Claude generates the article, shows both drafts (Medium article and LinkedIn post), publishes the Medium draft, and schedules the LinkedIn post. You receive a Medium URL and a LinkedIn schedule ID.

---

## Advanced

### Thread-Style Long Content

**Goal:** Publish a structured long-form post that reads like a thread on LinkedIn.

**Prompt template:**

```text
I want to write a long LinkedIn post about <TOPIC>. Structure it as:

1. Hook (1 line that grabs attention)
2. Context (2-3 sentences of background)
3. Main points (numbered list, 3-5 items, 1-2 sentences each)
4. Key takeaway (1 bold statement)
5. Call to action (question or ask)
6. Hashtags (5-7 relevant ones)

Keep it under 3000 characters. Show me the draft.
```

**Expected outcome:** Claude produces a structured post within the 3000-character limit, presents it for review, and publishes on your command.

---

### Thought Leadership Series

**Goal:** Plan and begin a multi-part content series on LinkedIn.

**Prompt template:**

```text
I want to create a 5-part series on LinkedIn about <BROAD_TOPIC>.

Plan the series:
- Part 1: <SUBTOPIC_SUGGESTION>
- Part 2: <SUBTOPIC_SUGGESTION>
- Part 3: <SUBTOPIC_SUGGESTION>
- Part 4: <SUBTOPIC_SUGGESTION>
- Part 5: <SUBTOPIC_SUGGESTION>

Draft Part 1 now. Each post should reference "Part X of 5" and build on
the previous one. Schedule Part 1 for <DATE> at 10am.
```

**Expected outcome:** Claude outlines all five parts, drafts Part 1 with the series label, and schedules it. Subsequent parts can be drafted in follow-up conversations using the same structure.

---

### Event Promotion

**Goal:** Announce an upcoming event with a clear call to action and a reminder post.

**Prompt template:**

```text
I am hosting a <EVENT_TYPE> on <EVENT_DATE> about <TOPIC>. Create a LinkedIn post that:
- Announces the event
- Lists 3 things attendees will learn
- Includes date, time, and location or link
- Has a clear call to action to register
- Adds relevant hashtags

Schedule it for <PROMO_DATE> at 9am, and create a reminder post for the day
before the event.
```

**Expected outcome:** Claude drafts two posts (announcement and reminder), schedules both, and returns two schedule IDs.

---

### Celebrate a Win

**Goal:** Share a milestone or achievement in an authentic, non-corporate tone.

**Prompt template:**

```text
We achieved <ACHIEVEMENT>. Write a LinkedIn post that:
- Celebrates the milestone without being braggy
- Thanks the team
- Shares one lesson learned along the way
- Ends with what comes next

Keep it authentic, not corporate. Post it now.
```

**Expected outcome:** Claude writes a grounded celebration post and publishes immediately. You receive the post URL.

---

## Tips for Better Results

**Draft first, post second.** Always ask Claude to show you the draft before posting. Include phrases like "show me the draft first" or "do not post yet" in your prompt. Once content is published, it cannot be retracted through the MCP server.

**Be specific about tone.** Claude adapts to tone instructions. Use phrases like "professional but conversational", "excited but not hype-driven", or "thoughtful and reflective" to shape the output.

**Provide context.** The more background you give -- your role, your audience, what you want readers to do -- the more relevant the output. A one-line prompt produces generic content; a paragraph of context produces targeted content.

**Use scheduling for consistency.** Batch-create content at the start of the week and schedule it across multiple days. Consistency in posting frequency matters more than volume on LinkedIn.

**Time zones matter.** The scheduler stores times in ISO 8601. If you provide a time like "Tuesday 10am", Claude converts it based on your conversation context. For precision, provide an explicit offset: `2026-04-07T10:00:00-07:00`. See [Configuration](Configuration) for scheduler settings.

**Check your queue.** Periodically ask Claude to "list my scheduled posts" to confirm nothing is stuck in a FAILED state. Failed posts are retried up to 3 times before being marked as permanently failed.

---

## Key Takeaways

- Every recipe follows the pattern: Goal, Prompt template, Expected outcome.
- Always request a draft before publishing. Published posts cannot be recalled through the server.
- Scheduling supports batch workflows -- plan a full week in one conversation.
- Cross-platform recipes (Medium + LinkedIn) work within a single session.
- Provide tone and context instructions for higher-quality output.

## Related Pages

- [Tools-Reference](Tools-Reference) -- Full parameter reference for every tool used in these recipes
- [Getting-Started](Getting-Started) -- First-time setup before using any recipe
- [Medium-Setup](Medium-Setup) -- Required for Medium article recipes
- [Telegram-Setup](Telegram-Setup) -- Optional notifications when scheduled posts publish
- [Troubleshooting](Troubleshooting) -- Common issues with posting and scheduling
