---
layout: ../../layouts/MarkdownProjectLayout.astro

highlighted: true
shortTitle: "DEX Arbitrage"
title: "Finding (and completing) arbitrage opportunities within a 13~ sec time."
pubDate: 2022-09-12
description: "Finding (and completing) arbitrage opportunities within a 13~ sec time."
author: 'Alex Stone'
image:
    url: '/projects/dex-arbitrage/dex.png'
    source: "Alex Stone"
    alt: "Ethereum DEX's (Uniswap, Sushiswap, Binance DEX)."
    width:
        mini: 319.25
        normal: 766.5
    height:
        mini: 179.48
        normal: 430.94
tags: ["ethereum", "defi", "solidity", "hardhat", "python", "node.js", "microservices", "postgresql"]
---

### The Why

On Ethereum, there are countless DEX's being made, with even more tokens being added to each, every day. Since each DEX is only concerned with itself, this leads to price discrepancies. The same token pair can have completely different rates among DEX's. 

As a free market does, this difference in rates will eventually be leveled out, due to the profit that can be made from swapping to the token from the low rate, and swapping out to the high rate. This process is known as [arbitrage](https://en.wikipedia.org/wiki/Arbitrage), and the simplest application being [triangular arbitrage](https://en.wikipedia.org/wiki/Triangular_arbitrage) for DEX's.


#### ![OKX twitter](/projects/dex-arbitrage/arbitrage.PNG)

#### *Source: OKX twitter*

Assuming that one can find profitable rates that are more than the gas consumption for the swaps on each platform, you'll make consistent profit.

##### ![7tv: BOARDA emote - OHBENTLEY](/projects/dex-arbitrage/boarda.webp)

#### *Source: 7tv: BOARDA emote - OHBENTLEY*

So the problem comes down to 3 things.

1. Finding the most profitable route of swaps, given the state of the blockchain.

2. Minimizing gas costs.

3. Submitting the route-of-swaps TX within 13 seconds.









### My (partial) solution

#### ![Vecteezy - 3d minimal Business Investments](/projects/dex-arbitrage/stopwatch.png)

#### *Source: Vecteezy - moopick*

I'll focus on the first and third problem: Finding the most profitable route within 13 seconds.

*The second problem comes down to Solidity coding, so not super interesting. But it is important!*

We need to have as many token pairings as possible to have the greatest chance of finding a profitable route, but we also need to be conscious of the speed of our algorithm. Not only does the 13 seconds include our route finding algorithm, but it will also include:

- Token Pair exploit checking
- Finding an optimal principal amount
- TX submission

Unfortunately, I won't be delving too deep into the implementation of my algorithm, since I wish to keep it closed-source. I recommend you start your search around [general pathfinding](https://en.wikipedia.org/wiki/Pathfinding).

But! I will provide an interactive section below for you to see my work in action!


### Interactive Demo

*Todo*


### Tech and knowledge used

#### ![ethereum.org: Ethereum](/projects/derzans-cryptowager/ethereum-logo-portrait-purple.svg)

#### *Source: ethereum.org*


- **Ethereum and DEXs:** The Ethereum blockchain was chosen, since it has some of the highest market caps of token pairs within DEXs in any blockchain.

- **Solidity:** Allowing routes of n swaps across multiple DEXs required custom solidity code. To maximize chances of finding a profitable route, the code is extremely optimized for gas consumption.

- **Hardhat:** Useful for testing if a route was viable, and not just a sham.

- **Node.js and PostgreSQL:** Node.js microservices and PostgreSQL triggers used, extensively.

- **Python:** For the mission critical tasks of finding the swaps within 13 seconds, Python's (w/ C++ modules) performance couldn't be beat.










### What's Next

*Todo*
