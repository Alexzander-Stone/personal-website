---
layout: ../../layouts/MarkdownProjectLayout.astro

highlighted: true
shortTitle: "Derzan's CryptoWager"
title: "Crypto Wagering Ethereum Dapp"
pubDate: 2023-09-13
description: "Facilitating crypto wagers based on live streamer's actions."
author: 'Alex Stone'
image:
    url: '/projects/derzans-cryptowager/clean_banner.PNG'
    source: "Derzan's CryptoWager"
    alt: "DCW - Derzan's CryptoWager Banner."
    width:
        mini: 319.25
        normal: 766.5
    height:
        mini: 123.5
        normal: 296.53
tags: ["ethereum", "solidity", "foundry", "websocket", "node.js", "reactjs", "extension", "postgresql"]
---

### The Why

If you've ever used Twitch.tv, you'll know that as you watch a channel, you'll gather Channel Points that can be spent on small rewards within the chat context (new emote, highlighted message, or sometimes a unique reward defined by the streamer). But, the cooler part of the Channel Points experience is the ability to show off how many you've gathered, compared to other viewers. It has a competitive feel to it, so viewers are always looking to gain more and more Channel Points.

#### ![Twitch: Twitch Prediction Example](/projects/derzans-cryptowager/twitch_predictions.png)

#### *Source: Twitch: Channel Points Predictions*

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
