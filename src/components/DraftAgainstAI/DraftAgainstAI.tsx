import { useState } from "react";
import "./draft-against-ai.css";

// API URL - change this to your deployed backend URL
const API_URL = "http://localhost:8000";

// Champion list from the backend
const CHAMPIONS = [
  "Aatrox", "Ahri", "Akali", "Alistar", "Amumu", "Anivia", "Annie", "Aphelios",
  "Ashe", "Aurelion Sol", "Azir", "Bard", "Blitzcrank", "Brand", "Braum",
  "Caitlyn", "Camille", "Cassiopeia", "Cho'Gath", "Corki", "Darius", "Diana",
  "Dr. Mundo", "Draven", "Ekko", "Elise", "Evelynn", "Ezreal", "Fiddlesticks",
  "Fiora", "Fizz", "Galio", "Gangplank", "Garen", "Gnar", "Gragas", "Graves",
  "Hecarim", "Heimerdinger", "Illaoi", "Irelia", "Ivern", "Janna", "Jarvan IV",
  "Jax", "Jayce", "Jhin", "Jinx", "Kai'Sa", "Kalista", "Karma", "Karthus",
  "Kassadin", "Katarina", "Kayle", "Kayn", "Kennen", "Kha'Zix", "Kindred",
  "Kled", "Kog'Maw", "LeBlanc", "Lee Sin", "Leona", "Lillia", "Lissandra",
  "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai", "Master Yi",
  "Miss Fortune", "Mordekaiser", "Morgana", "Nami", "Nasus", "Nautilus",
  "Neeko", "Nidalee", "Nocturne", "Nunu & Willump", "Olaf", "Orianna", "Ornn",
  "Pantheon", "Poppy", "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "Rek'Sai",
  "Rell", "Renekton", "Rengar", "Riven", "Rumble", "Ryze", "Samira", "Sejuani",
  "Senna", "Seraphine", "Sett", "Shaco", "Shen", "Shyvana", "Singed", "Sion",
  "Sivir", "Skarner", "Sona", "Soraka", "Swain", "Sylas", "Syndra", "Tahm Kench",
  "Taliyah", "Talon", "Taric", "Teemo", "Thresh", "Tristana", "Trundle",
  "Tryndamere", "Twisted Fate", "Twitch", "Udyr", "Urgot", "Varus", "Vayne",
  "Veigar", "Vel'Koz", "Vi", "Viego", "Viktor", "Vladimir", "Volibear",
  "Warwick", "Wukong", "Xayah", "Xerath", "Xin Zhao", "Yasuo", "Yone", "Yorick",
  "Yuumi", "Zac", "Zed"
];

const POSITIONS = ["top", "jungle", "mid", "bot", "support"] as const;
type Position = typeof POSITIONS[number];

type Action = {
  negated: boolean;
  player: number;
  position: string;
  champion: string;
};

type GameState = {
  game_id: string;
  turn_number: number;
  current_player: number | null;
  is_ban_phase: boolean | null;
  is_hero_turn: boolean | null;
  is_complete: boolean;
  hero_player: number;
  actions: Action[];
  final_reward: number | null;
};

type AIResponse = {
  action: Action;
  expected_reward: number;
  game_state: GameState;
};

const DraftAgainstAI = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedChampion, setSelectedChampion] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<Position>("top");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [heroSide, setHeroSide] = useState<1 | -1>(1);

  const usedChampions = new Set(gameState?.actions.map((a) => a.champion) || []);

  const filteredChampions = CHAMPIONS.filter(
    (c) =>
      !usedChampions.has(c) &&
      c.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const createGame = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL + "/api/v1/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero_player: heroSide }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to create game");
      }
      const data: GameState = await response.json();
      setGameState(data);
      setSelectedChampion("");

      // If AI goes first (hero is red side), request AI move
      if (data.current_player !== heroSide && !data.is_complete) {
        await requestAIMove(data.game_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create game");
    } finally {
      setIsLoading(false);
    }
  };

  const submitAction = async () => {
    if (!gameState || !selectedChampion) return;

    setIsLoading(true);
    setError(null);
    try {
      const position = gameState.is_ban_phase ? "flex" : selectedPosition;
      const response = await fetch(
        API_URL + "/api/v1/games/" + gameState.game_id + "/action",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ champion: selectedChampion, position }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to submit action");
      }
      const data: GameState = await response.json();
      setGameState(data);
      setSelectedChampion("");

      // If it's now AI's turn, request AI move
      if (!data.is_complete && data.current_player !== heroSide) {
        await requestAIMove(data.game_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit action");
    } finally {
      setIsLoading(false);
    }
  };

  const requestAIMove = async (gameId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL + "/api/v1/games/" + gameId + "/ai-move", {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "AI move failed");
      }
      const data: AIResponse = await response.json();
      setGameState(data.game_state);

      // If AI has another turn (double turn), request again
      if (
        !data.game_state.is_complete &&
        data.game_state.current_player !== heroSide
      ) {
        await requestAIMove(gameId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI move failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getBans = (player: number) =>
    gameState?.actions.filter((a) => a.negated && a.player === player) || [];

  const getPicks = (player: number) =>
    gameState?.actions.filter((a) => !a.negated && a.player === player) || [];

  const getPhaseText = () => {
    if (!gameState) return "";
    if (gameState.is_complete) return "Draft Complete";
    if (gameState.is_ban_phase) return "Ban Phase - Turn " + (gameState.turn_number + 1) + "/20";
    return "Pick Phase - Turn " + (gameState.turn_number + 1) + "/20";
  };

  const getTurnText = () => {
    if (!gameState || gameState.is_complete) return "";
    const side = gameState.current_player === 1 ? "Blue" : "Red";
    const isYou = gameState.is_hero_turn ? " (Your Turn)" : " (AI Thinking...)";
    return side + " Side" + isYou;
  };

  const getResultText = () => {
    if (!gameState?.is_complete || gameState.final_reward === null) return "";
    const heroWins =
      (heroSide === 1 && gameState.final_reward > 0) ||
      (heroSide === -1 && gameState.final_reward < 0);
    return heroWins
      ? "You Win! (Score: " + Math.abs(gameState.final_reward).toFixed(1) + ")"
      : "AI Wins! (Score: " + Math.abs(gameState.final_reward).toFixed(1) + ")";
  };

  return (
    <div className="draft-island">
      <div className="draft-output">
        {!gameState ? (
          <div className="start-section">
            <h3>Draft Against the AI</h3>
            <p>Choose your side and start a new draft game.</p>
            <div className="side-select">
              <label>
                <input
                  type="radio"
                  name="side"
                  checked={heroSide === 1}
                  onChange={() => setHeroSide(1)}
                />
                Blue Side (Pick First)
              </label>
              <label>
                <input
                  type="radio"
                  name="side"
                  checked={heroSide === -1}
                  onChange={() => setHeroSide(-1)}
                />
                Red Side (Pick Second)
              </label>
            </div>
            <button
              className="draft-button start-button"
              onClick={createGame}
              disabled={isLoading}
            >
              {isLoading ? "Starting..." : "Start Draft"}
            </button>
          </div>
        ) : (
          <>
            <div className="phase-header">
              <span className="phase-text">{getPhaseText()}</span>
              <span className="turn-text">{getTurnText()}</span>
            </div>

            <div className="teams-container">
              <div className="team blue-team">
                <h4>Blue Side {heroSide === 1 ? "(You)" : "(AI)"}</h4>
                <div className="bans">
                  <span className="label">Bans:</span>
                  {getBans(1).map((a, i) => (
                    <span key={i} className="ban-chip">{a.champion}</span>
                  ))}
                </div>
                <div className="picks">
                  {POSITIONS.map((pos) => {
                    const pick = getPicks(1).find((a) => a.position === pos);
                    return (
                      <div key={pos} className="pick-slot">
                        <span className="position">{pos}</span>
                        <span className="champion">{pick?.champion || "-"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="team red-team">
                <h4>Red Side {heroSide === -1 ? "(You)" : "(AI)"}</h4>
                <div className="bans">
                  <span className="label">Bans:</span>
                  {getBans(-1).map((a, i) => (
                    <span key={i} className="ban-chip">{a.champion}</span>
                  ))}
                </div>
                <div className="picks">
                  {POSITIONS.map((pos) => {
                    const pick = getPicks(-1).find((a) => a.position === pos);
                    return (
                      <div key={pos} className="pick-slot">
                        <span className="position">{pos}</span>
                        <span className="champion">{pick?.champion || "-"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {gameState.is_complete ? (
              <div className="result-section">
                <h3>{getResultText()}</h3>
                <button
                  className="draft-button"
                  onClick={() => setGameState(null)}
                >
                  New Game
                </button>
              </div>
            ) : gameState.is_hero_turn ? (
              <div className="action-section">
                <h4>
                  {gameState.is_ban_phase ? "Select a champion to ban" : "Select a champion to pick"}
                </h4>

                <input
                  type="text"
                  placeholder="Search champions..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="search-input"
                />

                <div className="champion-grid">
                  {filteredChampions.slice(0, 50).map((champ) => (
                    <button
                      key={champ}
                      className={"champion-btn " + (selectedChampion === champ ? "selected" : "")}
                      onClick={() => setSelectedChampion(champ)}
                    >
                      {champ}
                    </button>
                  ))}
                  {filteredChampions.length > 50 && (
                    <span className="more-text">
                      +{filteredChampions.length - 50} more (use search)
                    </span>
                  )}
                </div>

                {!gameState.is_ban_phase && (
                  <div className="position-select">
                    <span>Position:</span>
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        className={"position-btn " + (selectedPosition === pos ? "selected" : "")}
                        onClick={() => setSelectedPosition(pos)}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  className="draft-button submit-button"
                  onClick={submitAction}
                  disabled={!selectedChampion || isLoading}
                >
                  {isLoading
                    ? "Processing..."
                    : gameState.is_ban_phase
                    ? "Ban " + (selectedChampion || "...")
                    : "Pick " + (selectedChampion || "...")}
                </button>
              </div>
            ) : (
              <div className="waiting-section">
                <p>AI is thinking...</p>
                <div className="spinner"></div>
              </div>
            )}
          </>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default DraftAgainstAI;
