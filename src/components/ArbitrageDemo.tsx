import { useState } from "react";
import './arbitrage-demo.css';

type Edge = {
    dex: string;
    from: string;
    to: string;
    token_out: string;
    rate: string;
}

// 0 swaps indicates no viable route found.
type RouteResult = {
    result: "failure"
} |
{
    result: "successful";
    number_of_swaps: number;
    swaps: string; //RouteSwap string, need to parse.
    initial: {
        output: number;
        input: string;
    }
}

type RouteSwap = {
    from: string;
    vertex: string;
    market_place_type: string;
}




const ArbitrageDemo = () => {

    const generateUniqueEdges = (count: number) => {
        const uniqueEdges: Edge[] = [];


        const dexOptions = ["sushiswap", "uniswapv2", "uniswapv3", "pancakeswap", "binance", "dydx", "derzan_dex", "shiba_dexie", "rune", "hamster", "bear"];
        const tokenOptions = ["eth", "btc", "usdt", "weth", "wbtc", "busd", "ape", "dai", "shib", "usdc", "pepe", "link", "hex", "blur", "crv", "bone", "qnt", "ens", "psyop", "rndr", "gohm", "rio", "shia"];


        for (const dex of dexOptions) {
            for (const from of tokenOptions) {
                for (const to of tokenOptions) {
                    if (from === to)
                        continue;

                    uniqueEdges.push({
                        dex: dex,
                        from: from,
                        to: to,
                        token_out: "1",
                        rate: "0"
                    })

                    // if (uniqueEdges.length === count) {
                    //     return uniqueEdges;
                    // }
                }
            }
        }


        return uniqueEdges;
    }

    const handleCellEdit = ({ dex, from, to, token_out, rate }: Edge) => {
        setEdges((old_edges) => {
            const deep_copy_edges: Edge[] = JSON.parse(JSON.stringify(old_edges));

            const change_index = deep_copy_edges.findIndex((edge: Edge) => {
                return edge.dex === dex && edge.from === from && edge.to === to;
            })

            if (change_index !== -1)
                deep_copy_edges[change_index].token_out = token_out


            return deep_copy_edges;
        })
    }


    const randomizeRates = () => {
        function getRandomNumber(min: number, max: number, increment: number) {
            const range = (max - min) / increment;
            const randomIndex = Math.floor(Math.random() * range);
            return (min + randomIndex * increment).toFixed(2);
        }


        setEdges((old_edges) => {
            const deep_copy_edges: Edge[] = JSON.parse(JSON.stringify(old_edges));

            // deep_copy_edges.forEach((edge, index)=>{
            //     edge.token_out = getRandomNumber(0.8, 1.5, 0.01);
            // })

            let i = 0;
            while (i <= 200) {

                deep_copy_edges[i*10].token_out = getRandomNumber(0.8, 1.5, 0.01);

                i++;
            }

            return deep_copy_edges;
        })

    }

    const fetchOptimalPath = async () => {
        // Determine rates. 
        edges.forEach((edge) => {
            edge.rate = Math.log10(parseFloat(edge.token_out)).toString();
        })


        const body = { "python_json": edges }

        try {
            const start_time = new Date();
            setStartTime(start_time.toISOString());
            const response = await fetch("https://socket.app.cryptowager.xyz/arbitrage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            const end_time = new Date();
            setEndTime(end_time.toISOString());

            setElapsedTime((Math.abs(end_time.getTime() - start_time.getTime()) / 1000).toString());


            if (response.ok) {
                const data: RouteResult = await response.json();
                if (data.result === 'failure') {
                    setOptimalPath("API failure");
                    return;
                }
                if (data.number_of_swaps === 0) {
                    setOptimalPath("No Optimal Routes found. Try changing the tokens received above.");
                    return;
                }

                const swaps_arr: RouteSwap[] = JSON.parse(data.swaps as string);

                setOptimalOutput("~" + (10 ** data.initial.output).toFixed(3))
                setOptimalPathElements(swaps_arr);
                setOptimalPath('FOUND'); // Assuming the API responds with an array of names

            } else {
                console.error("Error sending data to the API");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    const [edges, setEdges] = useState<Edge[]>(
        generateUniqueEdges(300)
    );
    const [optimalPath, setOptimalPath] = useState("waiting for submission...");
    const [optimalOutput, setOptimalOutput] = useState<string>("...");
    const [optimalPathElements, setOptimalPathElements] = useState<RouteSwap[]>([]);

    const [startTime, setStartTime] = useState("waiting");
    const [endTime, setEndTime] = useState("waiting");
    const [elapsedTime, setElapsedTime] = useState("waiting");

    return (
        <div className="island">
            <div className="output">

                <div>
                    <strong>Instructions</strong>:
                    <ul>
                        <li>
                            Update rate (x To Tokens received per 1 From Token) to add arbitrage opportunities.
                        </li>
                        <li>
                            The starting token is "1 eth".
                        </li>
                        <li>
                            Each swap will incur a 0.01 eth cost fee.

                        </li>
                    </ul>
                </div>

                <hr />

                <form id="rateForm" className="arbitrage-table">
                    <table >
                        <caption>Pair/Pool Table</caption>
                        <thead>
                            <tr>
                                <th>DEX</th>
                                <th>From Node</th>
                                <th>To Node</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody id="dataRows">
                            {
                                edges.map((edge) => {
                                    return (
                                        <tr id={edge.dex + "_" + edge.from + "_" + edge.to} key={edge.dex + "_" + edge.from + "_" + edge.to}>
                                            <td>{edge.dex}</td>
                                            <td>{edge.from}</td>
                                            <td>{edge.to}</td>
                                            <td >
                                                <input
                                                    name={edge.dex + "_" + edge.from + "_" + edge.to + "rate_field"}
                                                    type="text"
                                                    value={edge.token_out}
                                                    onChange={(event) =>
                                                        handleCellEdit({ dex: edge.dex, from: edge.from, to: edge.to, token_out: event.target.value || '1', rate: edge.rate })
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            }
                        </tbody>
                    </table>
                </form>
                <h4><u>Total Pairs/Pools/Edges</u>: {edges.length}</h4>

                <button className="button" onClick={randomizeRates}>Randomize Rates</button>
                <button className="button" onClick={fetchOptimalPath}>Calculate Optimal Path</button>

                <h6><strong>Start Time</strong>: {startTime} ---- <strong>End Time</strong>: {endTime}</h6>
                <h6><strong>Total Elapsed Time (seconds)</strong>: {elapsedTime}</h6>
                <h3><strong>Profitable Route</strong>: {optimalPath}</h3>
                {optimalPath === "FOUND"
                    ?
                    <ul>
                        <p>Total Revenue: {optimalOutput} eth</p>
                        {optimalPathElements.map((swap) => {
                            return <li>{swap.from + " ----> " + swap.vertex + ", on " + swap.market_place_type + " DEX"}</li>;
                        })}
                    </ul>
                    :
                    null}
            </div>
        </div>
    );
}

export default ArbitrageDemo;