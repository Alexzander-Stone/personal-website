---
layout: ../../layouts/MarkdownProjectLayout.astro

highlighted: true
shortTitle: 'LoL Draft AI'
title: 'League of Legends Flex-conscious Draft AI'
pubDate: 2023-09-11
description: 'Using Game Theory to recommend champion bans and picks.'
author: 'Alex Stone'
image:
    url: '/projects/draft-ai/photo.jpg'
    source: 'Riot Games'
    alt: 'Riot Games: League Draft'
    width:
        mini: 319.25
        normal: 766.5
    height:
        mini: 179.58
        normal: 431.16
tags: ["game theory", "python"]
---

## The why

League of Legends, one of the most popular competitive [MOBA's](https://en.wikipedia.org/wiki/Multiplayer_online_battle_arena), has spawned an entire industry dedicated to perfecting every aspect of the game. Teams of analysts and coaches worldwide tirelessly study and refine every facet of gameplay.

For professional players, meticulous planning and execution begin even before they step onto the Summoner's Rift, in the form of drafting. 
The **drafting** phase is where two competing teams face crucial decisions:

* Banning Champions to restrict selections for both teams.
* Picking Champions to bolster their own team and thwart their opponents.

The choices made during drafting can determine victory or defeat before the match even begins.

> Imagine accidentally neglecting to ban an S-tier (or overpowered) champion, like Olaf. The opposing team seizes the opportunity and picks Olaf, significantly impacting the game's outcome.

Team analysts, coaches, and players collaborate to practice drafting against simulated opponents, striving to maximize their chances of success. To learn more about the drafting order, check [this resource out](https://mobalytics.gg/blog/picks-bans-guide/).

Key factors considered during drafting include:

* Overall Champion strength
* Individual matchup dynamics
* Thematic synergy

With a staggering 164 unique Champions available at the time of writing, planning all possible drafts becomes an immense challenge.

Even when a team is confident in predicting their opponent's choices, there's always the potential for an unexpected, non-meta pick—throwing a curveball into the mix. This can force the on-stage team to improvise a new draft strategy on the spot, potentially overlooking pitfalls in banning or selecting specific champions.

## My solution

To streamline the drafting process, both on-stage and off, I've developed a Drafting AI that serves as a reliable, real-time resource accessible to the team at any stage of the draft.

This AI leverages a combination of Game Theory and heuristics derived from common analytical patterns to offer strategic ban and pick recommendations to both shadow teams. These recommendations are carefully crafted to tilt the game in favor of the participants.

If the LoL team has questions like:

What should your team's final pick be, considering the entire draft? 
What's the opponent's most likely choice for their 3rd pick against you? 
What's the opponent's probable first ban? 

Then they ask the AI.

The AI promptly provides responses within your specified timeframe, ensuring that the suggested drafts indeed lead to more optimal selections. With ongoing training, the AI's confidence in its results continues to grow.


<!-- ## Derzan's Draft example

To easily express the understanding of what the AI is trying to solve, I've invented a simplier "game" of draft, called **Derzan's Draft**.

In this game, there are only 2 roles to consider for each team (bot, support).

There are 10 champions in the game, each with their own strength.

Each champion counters 1 other, and is countered by 1 other.

A champion can possibly fill either one or both available roles.

There are 3 themes: Poke, Engage, Disengage

These roles have a rock-paper-scissors relationship where: Poke beats Disengage which beats Engage which beats Poke -->


## Comparison to other drafting tools

#### ![iTero: Drafting Tool](/projects/draft-ai/itero_draft.png)

#### *Source: iTero: Drafting Tool*

What sets the Draft AI apart from other drafting tools is its versatility and adaptability. Derzan's Draft is configured to align with a team's unique preferences and strategies, making it an iterative process that evolves with a team's needs. We understand that the drafting phase isn't one-size-fits-all, and the tool is designed to be the team's trusted ally throughout the entire drafting process.

Here's a few key features of the AI:

1. **Flex Pick Focus**: A unique first, Derzan's Draft recognizes the immense value of flex picks. It provides recommendations for every aspect of the draft, including bans and picks, while factoring in the potential impact of flex picks for both your team and your opponent.

2. **Beyond Solo Queue**: While many existing tools focus solely on solo queue experiences or post-draft win percentage analysis, Derzan's Draft is built to enhance your live draft phase, offering real-time guidance that complements your team's strategies and preferences.

3. **Replicating Analyst Knowledge**: Our ultimate goal is to provide a tool that replicates the knowledge and insights of your team's analysts. Derzan's Draft serves as a single source of truth that aligns with your team's teachings and adapts seamlessly to high-pressure scenarios, ensuring you have a reliable resource at your fingertips.

4. **Identifying Hidden Opportunities**: Derzan's Draft can uncover viable bans, picks, and team compositions that might have otherwise gone unnoticed by your analysts, providing an additional layer of strategy and insight to your drafting process.



## Tech and knowledge used

1. **Game Theory**: Applied principles of Game Theory to develop strategic drafting recommendations.

2. **Python**: Utilized Python as the primary programming language for AI development.

3. **Heuristics**: Developed configurable heuristics based on analytical patterns to enhance drafting strategies.

4. **API Integration**: AI can be queried through API endpoints.

*Due to the potential for commercialization, I will not be releasing the code to the public.*

## What's next

Having an amateur or professional team actively collaborate on this project would be a huge stepping stone. 

As would having a Drafting website, like [Drafting.gg](https://drafting.gg/) or [DraftLoL](https://draftlol.dawe.gg/), integrate the service as a bot opponent.

Beyond that, although there are optimizations possible on the system, unless an individual expresses interest in supporting the project, there will be no modifications made to the system, in the near future.