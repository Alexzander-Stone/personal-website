---
layout: ../../layouts/MarkdownProjectLayout.astro

highlighted: true
shortTitle: "Dookey Dash AI"
title: "Designing a competitive AI to win 1_000 ETH"
pubDate: 2023-10-16
description: "Utilizing DAG efficiencies for pathfinding in a real-time game."
author: 'Alex Stone'
image:
    url: '/projects/derzans-cryptowager/clean_banner.PNG'
    source: "Derzan's CryptoWager"
    alt: "DCW - Derzan's CryptoWager Banner."
    width:
        mini: 284.33
        normal: 766.5
    height:
        mini: 110
        normal: 296.53
tags: ["ai", "node.js", "graph theory", "algorithms", "ethereum", "websocket", "bayc", "yuga_labs"]
---

### The Why

During the fourth quarter of 2022, Yuga Labs released a timed competitive game called [Dookey Dash](https://en.wikipedia.org/wiki/Bored_Ape#:~:text=In%20January%202023%2C%20Yuga%20Labs%20launched%2C%20for%20a%20limited%20time%2C%20an%20%22endless%20runner%22%20game%20called%20Dookey%20Dash%20for%20holders%20of%20the%20BAYC%20NFTs.%20Getting%20the%20highest%20score%20granted%20the%20player%20a%20%22golden%20key%22%20NFT%2C%20which%20a%20Twitch%20streamer%20Mongraal%20won%20and%20subsequently%20sold%20to%20Adam%20Weitsman%20for%20%241.6%20million.%5B38%5D), that existed in the BAYC universe. 
To incentivize play, Yuga Labs would award the individual with the highest score at end of the competition a [Golden Key NFT](https://opensea.io/assets/ethereum/0x764aeebcf425d56800ef2c84f2578689415a2daa/21915). 

#### ![Dookey Dash: Golden Key](/projects/dookey-dash-ai/key.mp4)
#### *Source: Yuga Labs*

> This key would eventually sell for 1_000 WETH. Many online argued that it could have went for 1_500, or even 2_000 WETH.


The game itself was a typical [endless runner](https://en.wikipedia.org/wiki/Endless_runner), where the player gathered points by:
* Surviving,
* gathering collectibles,
* and busting through destructibles.


#### Anti-Cheat Section

I'm not going to dive too deep into this, since the other developer working on this with me primarily dealt with it. 

Mainly, I'll say two things:
* Yuga Labs representatives would review a replay of the game.
* The main algorithmic anti-cheat required the game to be pseudo-always-online, in a sense.

Let's talk about the algorithmic anti-cheat, first. But, we'll start with talking about the norms of client server interactions in video games.


##### Two Common Client-Server Interactions in Games
1. The player sends their state, like positions and score, to the server.
    Obviously, this is bad since the player could lie about where they were or how many points they have.
2. The user sends defined inputs to the server, and the server sends back the updated state of the world.



Yuga Labs went somewhere in the middle, where they allowed the player to keep their inputs entirely to themselves, until the run was over, and it was time to submit scores. The player would submit their score, BAYC ID, and a cached array of player inputs from the run.

If the inputs array length didn't match with the reported time's expected array length, or if the inputs upon re-play on their internal server would lead to a death state, the run was discarded.

###### Input Array
> Let's say that the game records one input every second. We'll simplify the movements, too, to up, down, left, and right. We could expect to see a 5 sec run in this hypothetical setup containing an input array of something like:
> submitted_inputs = [up, up, up, left, down]
> submitted_inputs.length() == 5, which is also equal to the run time of 5 seconds!
> 
> This same structure applies to any inputs the player can send and at any interval, from the actual game.


If I'm being generous, I'd believe Yuga Labs did this to allow players with unstable internet a chance to play the game. Nothing would suck more than to be within reach of the highscore, just to lag out and ram into a wall.

But, this generosity gives a massive advantage to cheaters.


#### ![Alex Stone: Speedhacking gif](/projects/dookey-dash-ai/key.mp4)
#### *Source: Alex Stone*



## Early Cheating: Speedhacking
To demonstrate, here's a simple cheat that we explored early on. 

If we know all that matters is whether the input matches the expected timeframe at the end of the run, and not periodically during the run, we can **speedhack**.
We'll give the player two cheater abilities that affect an artificial "free time" meter:
1. Speed up time, resulting in charging up additional "free time" meter.
2. Slow down time, resulting in depleting "free time" meter.

Both of these are implemented by changing the game engine's ??DELTA T??.

Then, as long as the player takes into consideration the amount of "free time" left in their meter, they can slow down the game at difficult sections, while speeding up during the initially easy sections.

If the player dies with positive "free time" left, then we set a delay before submitting our run.
If the player dies with negative "free time" left, we don't submit the run.

> During a replay, a Yuga Labs employee would see the player moving at a normal speed, since the inputs are presented in the exact same format, as if we'd speed hacked or not!


We'll build upon this inability of Yuga Labs to detect cheats during on-going runs.
