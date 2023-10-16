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

#### ![Twitch: Twitch Prediction Example](/projects/dookey-dash-ai/key.mp4)
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



Yuga Labs went somewhere in the middle, where they allowed the player to keep their inputs entirely to themselves, until the run was over, and it was time to submit scores.
If the inputs length didn't match with the reported time, or if the inputs upon re-play on their internal server would lead to a death state, the run was discarded.

If I'm being generous, I'd believe Yuga Labs did this to allow players with unstable internet a chance to play the game. Nothing would suck more than to be within reach of the highscore, just to lag out and ram into a wall.

But, this generosity gives a massive advantage to cheaters.


## Early Cheating: Speedhacking

To demonstrate, here's a simple cheat that we explored early on. 

If we know all that matters is whether the input matches the expected timeframe at the end of the run, and not periodically during the run, we can speedhack.
We give the player two abilities:
1. Speed up time, essentially making the game "faster". 
2. Slow down time, making the game slower.

Then, as long as the player takes into consideration the amount of "free time" left in their meter, they can slow down the game at difficult sections, while speeding up during the initially easy sections.

If the player dies with positive "free time" left, then we set a delay up to submit our run.
If the player dies with negative "free time" left, we just don't submit the run.




One of the primary methods of doing so is through [Twitch Predictions](https://help.twitch.tv/s/article/channel-points-predictions?language=en_US).

Essentially, the streamer (or moderators) will show a question to all viewers with multiple choices of outcomes available. The viewer can then select a choice, and bet any amount of Channel Points on their outcome being correct. If they are right, they will win a percentage of the total Channel Points, based on how many points they bet, themselves. Otherwise, they lose their Channel Points.

> xQc will commonly post a Twitch Prediction of "Does xQc win this match?" while playing Overwatch 2. The choices available will be "YES" and "NO". At the end of the match, the moderators will select the winning outcome, and the viewers will receive their rewards.

##### ![7tv: GAMBA emote](/projects/derzans-cryptowager/gamba.webp)

#### *Source: 7tv: GAMBA emote*

This has became so popular within Streamer's communities, that their chat will spam "GAMBA" demanding a new Twitch Prediction be started.

I've personally enjoyed this in the past, but always wanted to expand it's context past a single Channel, and allow for more usages of the Channel Points. Right now, as I mentioned prior, the rewards you can actually redeem the Points for are pretty worthless.









### My solution

#### ![Derzan's CryptoWager: Extension - Active Wager, Valorant Championship](/projects/derzans-cryptowager/active_zoom.PNG)

#### *Source: Derzan's CryptoWager: Extension - Active Wager*


That's why I created [Derzan's CryptoWager](https://cryptowager.xyz/), a Crypto Wagering platform that shares a central token for all Twitch.tv channels. Supported on all [Chromium](https://chrome.google.com/webstore/detail/derzans-cryptowager/mpkdockaemlcpbgooakhcnmefflaeiph) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/derzan-s-cryptowager/) browsers, one can download the extension and head over to an integrated streamer to start wagering.

No matter the channel, your balance will stay the same, and you'll be free to wager them on the Channel outcomes.

Each [integrated streamer](https://derzans-cryptowager.notion.site/Integrated-Channels-Streamers-f95efe56747744b981366c7a44b6649a) is whitelisted, to prevent any bad blood between our platform and streamers. If at any point a streamer decides they no longer wish to be platformed, they can [voice their concern](https://derzans-cryptowager.notion.site/Creator-Signup-58314130fd454b00be8b0f9cd8565841) and we'll remove them, ASAP.

##### ![Derzan's CryptoWager: DCW Token](/projects/derzans-cryptowager/DCW_token_logo.svg)

#### *Source: Derzan's CryptoWager: DCW Token*


Using the Ethereum blockchain, and more specifically the ERC20 token standard, allows for the community to decide what DCW (**D**erzan's **C**rypto**W**ager) tokens can be used for.

- Want to design a leaderboard frontend to show which members have the most DCW tokens? You can!

- Want to create an NFT that can only be minted when X number of DCW tokens are given? You can!

- Dislike the experience given by the browser extensions or the payout algorithm? You can create your own competing platform using the same DCW tokens!

#### ![Derzan's CryptoWager: Extension - Minimized](/projects/derzans-cryptowager/minimized_Active_small.PNG)

#### *Source: Derzan's CryptoWager: Extension - Minimized*

With a focus on viewer experience, I designed the app to minimize the required screen space, like with the ability to minimize to only important Wager details in the header tab.

Chat space is coveted, so by respecting it, it'll lead to less removals due to inactivity.

If it's not in the way, why would a user remove it?


#### ![Derzan's CryptoWager: Free Claim](/projects/derzans-cryptowager/claim_zoom.PNG)

#### *Source: Derzan's CryptoWager: Free Claim*

All DCW tokens are given out to new users in a free claim. At no point do I plan to limit the distribution of tokens to paid users. All tokens ever released will be given, for free, to the community.

*Ethereum smart contract gas consumption still applies.*






### Tech and knowledge used

#### ![ethereum.org: Ethereum](/projects/derzans-cryptowager/ethereum-logo-portrait-purple.svg)

#### *Source: ethereum.org*


- **Ethereum and ERC20:** ERC20 and the Ethereum blockchain allows the project to live on, no matter if the servers are to fall, or not.

- **Community and Documentation:** I've been in the Web3 space for a little bit now, and know that your community makes, or breaks, the project. To ease the burden of onboarding, I've made documentation in the form of [notion pages](https://derzans-cryptowager.notion.site/derzans-cryptowager/Derzan-s-CryptoWager-0108eddfc833426686515bbff598b91b) and [videos](https://www.youtube.com/@DerzansCryptoWager) for all to understand what the platform is doing, and how. Along with a [discord](https://discord.gg/JrnSZJSxtF) that anyone can join and ask questions on.

- **Solidity:** These smart contracts automate withdrawals and ensure super-fast, trustless transactions. Minimal gas consumption applied. [Here's a raw video](https://www.youtube.com/watch?v=Xt01aUJS8GY) where I go over them.

- **Websockets:** Socket.io allows for quick updates to all users on wager status and outcomes.

- **ReactJS and Extensions:** ReactJS gave quick development and distribution for both the Chromium and Firefox browser extension/add-ons. Zero need to create browser-specific JS/HTML code.

- **Node.js and PostgreSQL:** Atomicity and finalization matters, especially when a competitive token is on the line. Node.js microservices and PostgreSQL triggers provided a foundation to reach these requirements.











### What's Next

#### ![Derzan's CryptoWager: Future](/projects/derzans-cryptowager/DCW_logo.svg)

#### *Source: Derzan's CryptoWager*


Continued growth! 

User acquisition is the most important goal.

Although the platform isn't breaking the ToS of any livestream services, as of right now, I do expect questions and critiques to come in when the spotlight grows. No matter the obstacle, I believe Derzan's CryptoWager will grow into a lovely community and platform.

*Keep an eye on me as I change the game, one blockchain at a time.*
