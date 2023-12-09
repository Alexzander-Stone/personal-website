---
layout: ../../layouts/MarkdownProjectLayout.astro

highlighted: true
shortTitle: "Dookey Dash AI"
title: "Designing an AI to compete for 1_000 WETH"
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


#### ![Alex Stone: Early Demo](/projects/dookey-dash-ai/key.gif)
#### *Source: Alex Stone*



### The Why

During the fourth quarter of 2022, Yuga Labs released a timed competitive game called [Dookey Dash](https://en.wikipedia.org/wiki/Bored_Ape#:~:text=In%20January%202023%2C%20Yuga%20Labs%20launched%2C%20for%20a%20limited%20time%2C%20an%20%22endless%20runner%22%20game%20called%20Dookey%20Dash%20for%20holders%20of%20the%20BAYC%20NFTs.%20Getting%20the%20highest%20score%20granted%20the%20player%20a%20%22golden%20key%22%20NFT%2C%20which%20a%20Twitch%20streamer%20Mongraal%20won%20and%20subsequently%20sold%20to%20Adam%20Weitsman%20for%20%241.6%20million.%5B38%5D), that exists within the BAYC universe. 
To incentivize play, Yuga Labs would award the individual with the highest score a [Golden Key NFT](https://opensea.io/assets/ethereum/0x764aeebcf425d56800ef2c84f2578689415a2daa/21915). 

#### ![Dookey Dash: Golden Key](/projects/dookey-dash-ai/key.gif)
#### *Source: Yuga Labs*

> This key would eventually sell for 1_000 WETH. Many online argued that this was low, and should have went for 1_500, or even 2_000 WETH.


The game itself was a typical [endless runner](https://en.wikipedia.org/wiki/Endless_runner), where the player gathered points by:
* Surviving
* Gathering collectibles
* and Dashing through destructibles


### Anti-Cheat Section

I'm not going to dive too deep into the code for this, since the other developer working on this with me primarily dealt with it. 

Mainly, I'll say two things:
* Yuga Labs representatives would manually review a replay of the game.
* The main algorithmic anti-cheat required the game to be pseudo-always-online.

Let's talk about the algorithmic anti-cheat, starting with the norms of client server interactions in online video games.


##### Two Common Client-Server Interactions in Games
1. The player's client sends their game state, i.e. positions and score, to the server.
    * Without any oversight, this is bad since the player could lie about where they were or how many points they have.
2. The player's client sends defined actions (like mouse/keyboard inputs) to the server, and the server sends back the updated state of the world. The client consumes this state, and displays the effects to the player. 
    * To minimize the delay in sending actions->receiving state->rendering, the client will optimistically assume their actions were valid, and render the effects of it to the player. If there's a discrepancy between the client and server-replied state, then the client must sync back to the server-replied state (potentially losing actions in between). Commonly referred to as [Rollback netcode](https://en.wikipedia.org/wiki/Netcode#:~:text=.%5B5%5D-,Rollback,-%5Bedit%5D).



Yuga Labs went somewhere in the middle, where they allowed the player to keep their inputs entirely to themselves, until the run was over, and it was time to submit scores. The player would submit their score, BAYC ID, and a cached array of player inputs from the run.

If the player inputs array length didn't match with the reported time's expected array length, or if the inputs upon re-play on their internal server would lead to a death state earlier than the player's claim, the run was discarded. 

This same replay setup was used for manual reviews, as well.

> **Input Array**
> <br/><br/>
> Let's say that the game records one input every second. 
> We'll simplify the mouse movements, too, to discrete units of up, down, left, and right. 
> <br/><br/>In this hypothetical setup, we could see a 5 sec run containing an input array of something like:
>  
> * submitted_player_inputs = [up, up, up, left, down]
> * |submitted_player_inputs| == 5
>
> 5 matches the number of seconds in the claimed run, so it passes the time-based anti-cheat check!
>
> This same structure applies to any inputs the player can send and at any interval, from the actual game.
> <br/><br/>
> *Dookey Dash records one input every 0.016666666666666666 seconds of in-game time, leading to **3600 inputs gathered per minute of game time**.*



If I'm being generous, I'd believe Yuga Labs did this to allow players with unstable internet a chance to play the game. Nothing would suck more than to be within reach of the high-score, just to lag out and ram into a wall once the server's state is sync'd back to the client.

Additionally, it requires less active communication between the player and the BAYC server. No need to send updates live during the run, and delays in processing won't cause slowdown to the player's game state.

But, this generosity gives a massive advantage to cheaters.


### Cheating

#### ![Alex Stone: Speedhacking gif](/projects/dookey-dash-ai/key.mp4)
#### *Source: Alex Stone*



### Early Cheating: Speedhacking
To demonstrate, here's a simple cheat that we explored early on. 

Since we know all that matters is whether the inputs match the expected timeframe at the end of the run, and not periodically during the run, we can **speedhack**.
We'll give the player two cheater abilities that affect an artificial "free time" meter:
1. Speed up time, resulting in charging up additional "free time" meter.
2. Slow down time, resulting in depleting "free time" meter.



Both of these are implemented by changing the game engine's **delta t or ticks per second** during play.
	// ! CHECK WITH APPLE.

// IMAGE
// 3 examples, fast, normal, and slow. Show the affects to the free time meter, as well, for each. n
// And additionally the ticks per second being used/seconds of a single tick calculation.

Then, as long as the player takes into consideration the amount of "free time" left in their meter, they can slow down the game at difficult sections, while speeding up during the initially easy sections. 

// IMAGE
// one linear example of playing fast, normal, and slowing down for many obstacles. The actual 
// game. Put a fake meter at the top, to showcase the effect, as well.

*Of course, the "feeling" of inputs would change, due to the input's being consumed slower/faster, so the player needs to change how fast they move their mouse, accordingly.*

If the player dies with positive "free time" left, then we set a delay before submitting our run.
* Positive free time would result in a longer input array than what's expected at our current death time, within the global context.
	* Example: We begin a run and finish it in 1 minute local time, and 3 minutes in Game Engine time. When arriving on the BAYC servers, they'd notice a discrepancy in the time the run was scheduled to begin, the time the run was submitted, and the length of the run, derived from the player inputs array. 
		* Start time (local) = 0 seconds
		* Submission time (local) = 60 seconds
		* Game run time (Game engine) = 180 seconds
	* The difference between Submission time and Game run time is 120 seconds, which would be a glaring data point to trigger anti-cheat responses.

If the player dies with negative "free time" left, we don't submit the run.
* Negative free time would result in a shorter input array than what's expected at our current death time.
	* Example: We begin a run and finish it in 5 minutes local time, and 2 minutes in Game Engine time. When arriving on the BAYC servers, they'd notice a discrepancy in the time the run was scheduled to begin, the time the run was submitted, and the length of the run, derived from the player inputs array. 
		* Start time (local) = 0 seconds
		* Submission time (local) = 300 seconds
		* Game run time (Game engine) = 120 seconds
	* The difference between Submission time and Game run time is 180 seconds, which would be a glaring data point to trigger anti-cheat responses.

##### What happens if the run is manually reviewed?
During a replay, a Yuga Labs employee would see the player moving at a normal speed, since the inputs are presented in the exact same format, as if we'd speed hacked or not!


// GIF OF EXAMPLE OF REPLAYED SECTION FROM ABOVE


We'll continue to build upon this inability of Yuga Labs to detect cheats during on-going runs.


### Early Cheating: Bonus lives
Normally, when we'd collide with an obstacle, our run is ended. Once you die, you'll need to start a new run, which can eat up 7 minutes to get past the excruciatingly slow and easy sections.

With a bit of modifications, we can treat our free time as "bonus lives" to let us continue runs after a death collision.

When we end up colliding with an obstacle with positive free time left, our modified game will pause the current run. In the background, it'll start up a run with the exact same [seed](https://en.wikipedia.org/wiki/Random_seed) and re-play inputs we've recorded so far, pausing around 2 seconds before we made our mistake and died.

Once it's caught up, our view will be swapped with the re-played game. After around 500ms from the initial render, the game is automatically unpaused, relinquishing control of the game to us.

// GIF EXAMPLE OF DEATH INTO RE-RUN.

As long as we have have bonus free time, we can continue to die and catch up, essentially giving us bonus lives.

##### Why do we need the bonus free time for this? 
To catch up to the point we lost our run, our machine will need to simulate and play the entire game over. Even when increasing the ticks per second, our machine is only so fast when cycling through the actions within the game engine. This leads to a delay that needs to be made up for when submitting the final run.

So if it takes 1 second to replay a game where the player died 10 minutes in, there needs to be, at least, 1 seconds worth of free time to burn.



### Playing the game...

With this setup, we were doing pretty well. We even had a few scores on our testbed that would be within the top 100 spots of the leaderboard. 

But the end of the competition was still 1.5 weeks away, and the top score was increasingly getting higher and higher, while our scores plateaued. We had to think of more solutions to help us reach the goal of winning the golden key.

*I also set up a reinforcement learning AI to play the game. The result was a dud, but maybe I'll expand on this another time.*



### Game engine code
These cheats **are** modifying the game engine code, but the BAYC development team checks for this in a manor that is trivial to circumvent.

// EXPLAIN APPLE


### Re-cap

To re-iterate, we now have the ability to play through a level to any point, and re-play the same run to the exact point we ended on in an extremely fast fashion.

What else can we gain through this?

Wellllll, why don't we just speed up the game from the start, turn off collision boxes, and just see what obstacles will be in front of us? We can even plot out a mini-map of sorts to figure out what was coming up past our playable zone.

But, we didn't stop there. Instead, we went one step further and thought "At that point, I might as well just have the game play itself." So that's what we did. We designed an AI to play the game from start to finish.

### Creating the AI

Usually when starting off with an AI, or really solving any problem using programming, I try to look at how I solve the problem, using my beeg brain.


For Dookey Dash, I thought back to my personal strategy of racking up points. We want to avoid all obstacles, but also change our prioritization of how to rack up points during different sections of the run.
##### Early game (3-4 minutes)
Dash through as many destructibles as possible, while gathering all higher-tiered rewards.
##### Mid game (5-12 minutes)
Start taking into account what lies further ahead of our path, especially while dashing. We don't want to commit to a dash, if it's going to result in immediate death.
Continue to greedily gather rewards.
##### Late game (12+ minutes)
Restrict dashing to worst-case situations. Obstacles spawn too soon and move too fast to wildly dash around.
Focus on surviving, and less on rewards.


Once we've laid out the strategy like this, you might notice that my brain was already essentially using a [pathfinding](https://en.wikipedia.org/wiki/Pathfinding) algorithm.
We want to: 
* Avoid bad things, like obstacles and destructibles when our dash is on cooldown.
* Go to good things, like the collectibles and destructibles when our dash is available.
* And most importantly, look-ahead to see if our decision will lead to death given our limited movement. 

Now that we know we'll be looking at this as a path-finding problem, we'll need two things:
1. A Graph of all valid player positions, and the "things" within it (good, bad, neutral), during all times of the game.
2. An algorithm to traverse the Graph to find the path with the highest score.

#### ![Wikipedia: Directed Acyclic Graph](/projects/dookey-dash-ai/graph.svg)
### The graph

So what's our graph actually look like? 

Well, if we pause a single frame, we can identify the playable area as a large circle within our currently 2D space. Within that circle, we can further identify positions where the player can be within, that minimizes the area of overlap between each position. These are showcased by the multi-colored circles, within.


#### ![Alex Stone: Sunflower Render](/projects/dookey-dash-ai/sunflower.png)
#### Sunflowers 
These inner circles, which if you were to plot out with non-mspaint solutions, would appear to have a sunflower-effect to them. Due to slower acceleration towards a position, the further away from the center you are attempting to reach, it's not an exact sunflower. But it's a good showcase, nonetheless.


#### ![Alex Stone: Beautiful MSPaint render](/projects/dookey-dash-ai/sunflower.png)
#### Nodes 
Each of the colors represent one of the good, neutral, or bad, options we identified earlier.
* Collectibles - Good - Green
* Empty Space - Neutral - Black
* Obstacles - Bad - Red
I also included an additional color, Blue, but we'll ignore it for now and just treat it like an Obstacle.
* Destructibles - Bad (for now) - Blue

#### Code 
To gather these nodes, we'll have a second game running on the same seed on a modified game client, simultaneously.
Death is disabled, and we'll go tick by tick collecting all node data at each of the static points we've identified (the circles).

How do we determine the node data? 
On each tick, we move the player character to every node position.
	At each node position, we perform collision checks for:
		Collidables, destructibles, and collectibles.
The most prioritized collision is the final value of the node.
	We wouldn't want to mark a node as "green" if it also includes a "red" collidable, since it leads to death.

// GIF of this happening.

#### Edges
Yay, we have nodes of a single paused tick! Or better worded, a single slice of **time**.

Alright, but there's more to graphs than just nodes. Where's the edges? What even are the edges?

Remember, we're trying to simulate our character **moving** within the straight pipe, from the start to the end of the pipe, to find the most optimal path.

From a side perspective, the world would look like:

// PIPE FROM THE isomorphic view.
// -------------------------------->

Now let's create a few of our sets of nodes on a few different slice time sections of the game.

// PIPE FROM iso with slices but in the artistic sense.

We're getting somewhere. A few of you might realize the next steps required to build out our graph.

If our nodes represent the possible positions of the player at different times of the run, then we can have edges defined as the ability to go from time0.positionA to time1.positionB, within the our variable time frame. Basically, **if our player is at position A, what are the possible positions our player can be at during the next time slice**? 

From here on, I'll define our time frame between time n and time n+1 as 8 ticks within the BAYC game engine.

So now, we can see our node at position A can reach position B, within a single time frame, as show below.

// GRAPH. Arrows showing possible positions.

What this also means, is that there will not exist an edge that connects position A to position I, within a single time frame. But, that doesn't mean we can't reach position I over multiple edges through more than one time frame! Shown below is a way to reach the reward, if given 5 time frames.

// GRAPH


##### But Alex, how do we know which position we can and can't reach, within our single time frame?
You're right, we won't know, initially. Especially since the decrease of acceleration when further from the center of the circle will lead to less valid edges on the outside of our sunflower's nodes, within a single passing time frame.

But, we can just pre-compute this, and reference it during execution of a run, as a simple hashmap.
`const valid_edges_of_position_A = position_to_possible_connecting_positions_map.get("A"); // ["A", "B", ...]`

##### But Alex, when the game starts to get really fast in the end game, won't the path from t(n).positionX to t(n+1).positionY possibly include an obstacle that wasn't identified during the collision collection steps?
Yes, that is possible. As the game speeds up, smaller objects have a higher chance of not being within our timeframe slices (remember, we're creating timeframe slices once every 8 ticks).

To get around this, when performing our collision collection, we can extend our boundary box depth-wise to pick up on objects that exist within the in-between ticks. 

As an additional positive, the resulting AI looks more "natural", since it's more likely to move away from an object well before we approach it, rather than always waiting for the last second.

This is **not** applied to rewards, since we need that collision data to be exact.

#### Nodes and Edges

Let's go ahead an update our pipe showcase...

// SHOWCASE - non-gameplay, instead doodle-y view.

We have our Nodes and the Edges, so now we can pathfind! But how do we do that? 

Let's first look at the structure of our graph. Thanks to the pipe visual, we can see that the graph is moving in a single direction! Such a great side-effect of using the timeframe as a way to divide up our slices of nodes. 

In graph terms, this means we have a graph that is both directed and acyclic:
* Directed - t(n) can only connect to t(x) where x >= n+1.
* Acyclic - when we reach t(n), it's impossible to return to any t(x) that is <= n.



#### DAGs
We should be grateful that we arrived on a [DAG](https://en.wikipedia.org/wiki/Directed_acyclic_graph), or Directed Acyclic Graph, due to it's guaranteed performance improvements when pathfinding.

In a normal weighted Graph, we'd need to use [Dijkstra's](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) or [Bellman-Ford](https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm) to find our most optimal path (which will be defined as the shortest path, later). Unfortunately, the performance of these can be pretty hefty, with a big O notation of O(|E| + |V|log|V|) and O(|V||E|), respectively. 

With our current setup, we're looking at ~300 nodes/vertices and ~2400 edges collected within a single timeframe slice. Our timeframe slice accounts for around 1/10th of a second, so with a run that lasts 15 minutes, we're looking at **over 2_500_000 nodes and 21_600_000 edges**!

DAGs are special, where we can take advantage of [Topological ordering](https://en.wikipedia.org/wiki/Directed_acyclic_graph#:~:text=vertex.%5B8%5D-,Topological%20ordering,-%5Bedit%5D) to perform our [path algorithm](https://en.wikipedia.org/wiki/Directed_acyclic_graph#:~:text=.%5B25%5D-,Path%20algorithms,-%5Bedit%5D), resulting in a big O notation of O(V+E).

This will come in useful later, in combination with the concept of the [Viterbi algorithm](https://www.cs.toronto.edu/~sengels/tutorials/viterbi.html).


#### Defining the path algorithm

Alrighty, so we want to use Topological pathfinding on our DAG. How can we accomplish this?

Essentially, we'll define our problem as a shortest path problem. From now on, our edges that lead to "positive" rewards will be negative values (a 1200 point reward can be represented as -12) and our edges that lead to "negative" outcomes will be positive values (collidables can be represented as 100_000).


###### Building out the weights
Starting from the the initial position at timeframe 0, or t(0), we'll update our single starting position node to be a valid neutral value, or 0. All other nodes will be set to a pseudo-impossible value (100_000).

> When I say pseudo-impossible, what I really mean is that our pathfinding will always find a more beneficial route, that doesn't tack on a massive 100_000 increase on the reward value.

Then, we'll go to t(1), and set the value of each and every node to the lowest sum'd value of possible edges to the node's weight and the respective edge's starting node's value. Additionally, we'll store this starting node as a parent reference within the node.

// EXAMPLE of to.a(0) --[-12]--> t1.a(-12) --[-1]--> t2.a(-13)

We'll continue doing this for all available timeframes, until reaching the end.


```
type Node = {
	id: string; // timeframe index + position
	position: {x: number, y: number};
	value: number; // Defaults to 100_000.
	parent: Node;
}


// contains all edges leading to given Node ID.
const edges_map = new Map<string, Edge>(...); 
const time_frames: Node[][] = [...];

time_frames[0][<position_A_index>].value = 0; // Set up the starting point (center of sunflower).

let index = 1;
while(index <= time_frames.length-1){
	const time_frame_nodes = time_frames[index];
	for(const node of time_frame_nodes){
		const lowest_edge = FindLowestValueEdge(edges_map.get(node.id), node.id);
		const parent_node = lowest_edge.starting_node;
		node.parent = parent_node;
		node.value = lowest_edge.weight + parent_node.value;
	}
}
```


###### Finding the path
Now, to find the path that resulted in the **lowest** value node at t(n), where n was the last timeframe, we'll work in reverse.


Create an empty array of input_nodes.

Go to the final t(n) and find the lowest value node. Include the node within our input_nodes.
Then, use the parent reference on the final node to find the node responsible for t(n-1).
Prepend said node to the input_nodes.
Repeat the parent retrieval process until the current node is null, which will be at t(-1).

Once it's null, that means we've went through all timeframes from 0 to n, and our input_nodes is filled with the intended nodes that lead to the shortest path!

```
type Node = {
	...
	value: number;
	parent: Node;
}

const time_frames: Node[][] = [...];
const last_time_frame = time_frames[time_frames.length-1];

const input_nodes: Node[] = [];
let most_optimal_node = FindLowestValueNode(time_frames[last_time_frame]);
while(most_optimal_node !== null){
	input_nodes.prepend(most_optimal_node);
	most_optimal_node = most_optimal_node.parent;
}

// input_nodes contains a single node for each timeframe that leads to the best score.
```


## Watching it in action.

Assuming you have a helper function to translate intended position to game input (in BAYC's case, mouse movement), we can now have the AI play the game!

Which we can now see in a demonstration below!

// VIDEO

### What would be required to further improve this AI?

For those of you who played Dookey Dash, you'd know that to maximize your score, you'd need to dash through as many obstacles as possible. Especially during early play, it's a great source of points.

Unfortunately, the complexity of the AI also rises when dashing is implemented. 

Each dash will change where we are on the graph, leading to a de-sync to the original Graph of collision points. Why? Dashing increases our speed, causing obstacles to appear sooner than they would in our Graph of collision points. We've been calling each t(n) the time frame, but it's more accurately the global world position of the player.
* Each index of our DAG is directly related to a position within the entire scale of the map. If we were to increase the speed of our player, then the positions that we are on during each tick/index will be increased when compared to our original Graph of collision points.


Now, this isn't actually too bad to deal with, but it requires a similar setup to the [Viterbi Algorithm](https://www.cs.toronto.edu/~sengels/tutorials/viterbi.html) (btw, we'll thank ourselves for having a DAG structure when approaching this problem!). If there's interest, I'll write more about the solution in a part 2. 

Thanks for your time!




# Sources
1. Wikipedia....
2. ...


# Stats
Game Engine
	Fixed Delta Time = 0.016666666666666666