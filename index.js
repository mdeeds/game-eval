//@ts-check

// import './style.css';
import { Engine, runMonteCarlo, runOptionMonteCarlo } from './game/engine.js';
import { StartState } from './game/modulo-game.js';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Initialize the game
const engine = new Engine();
console.log('A');
engine.initGame(root, new StartState());
console.log('B');

// Set up global input handling
document.addEventListener('keydown', (e) => {
  engine.handleGlobalKeydown(e.key);
});

// --- Monte Carlo UI ---
const simContainer = document.createElement('div');
simContainer.className = 'mc-container';

const winnerBtn = document.createElement('button');
winnerBtn.className = 'mc-button';
winnerBtn.textContent = 'Estimate Winner';
winnerBtn.style.marginRight = '10px';

const optionsBtn = document.createElement('button');
optionsBtn.className = 'mc-button';
optionsBtn.textContent = 'Estimate Options';

const resultsDiv = document.createElement('div');
resultsDiv.className = 'mc-results';

// -- Helper to clear results --
const clearResults = () => {
  resultsDiv.innerHTML = 'Calculating...';
};

// -- Estimate Winner Handler --
winnerBtn.onclick = () => {
  clearResults();

  setTimeout(() => {
    const results = runMonteCarlo(engine, 1000);
    resultsDiv.innerHTML = '';

    if (!results) {
      resultsDiv.textContent = "Game inactive or over.";
      return;
    }

    const sortedPlayers = Object.keys(results).sort((a, b) => parseInt(a) - parseInt(b));

    if (sortedPlayers.length === 0) {
      resultsDiv.textContent = "No winners (simulation inconclusive).";
      return;
    }

    sortedPlayers.forEach(player => {
      const wins = results[player];
      const probability = ((wins / 1000) * 100).toFixed(1);
      const line = document.createElement('div');
      line.textContent = `Player ${player} Win Probability: ${probability}% (${wins} wins)`;
      resultsDiv.appendChild(line);
    });
  }, 10);
};

// -- Estimate Options Handler --
optionsBtn.onclick = () => {
  clearResults();

  setTimeout(() => {
    const currentPlayer = engine.getActivePlayer();
    const simCount = 200; // Simulations per option
    const results = runOptionMonteCarlo(engine, simCount);
    resultsDiv.innerHTML = '';

    if (results === null) {
      resultsDiv.textContent = "Not available (Setup phase or Game Over).";
      return;
    }

    const options = Object.keys(results).sort((a, b) => {
      // Sort by win count descending, then by option value
      return results[b] - results[a] || parseInt(a) - parseInt(b);
    });

    const header = document.createElement('div');
    header.style.marginBottom = '10px';
    header.style.color = '#fff';
    header.textContent = `Win Probability for Player ${currentPlayer} by Move:`;
    resultsDiv.appendChild(header);

    options.forEach(opt => {
      const wins = results[opt];
      const probability = ((wins / simCount) * 100).toFixed(1);
      const line = document.createElement('div');
      line.textContent = `Move [${opt}] -> Win Prob: ${probability}%`;
      resultsDiv.appendChild(line);
    });
  }, 10);
};

simContainer.appendChild(winnerBtn);
simContainer.appendChild(optionsBtn);
simContainer.appendChild(resultsDiv);
document.body.appendChild(simContainer);