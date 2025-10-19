// MINI TROPA - Game Engine
class MiniTropaGame {
    constructor() {
        this.currentScreen = 'menuScreen';
        this.player = null;
        this.gameState = {
            turn: 0,
            cities: [],
            ownedCities: [],
            soldiers: 7,
            points: 0,
            diceRolled: false,
            dice1: 0,
            dice2: 0
        };
        this.characters = [];
        this.allCities = [];
        this.states = [];
        this.map = null;
        this.markers = {};
        
        this.init();
    }
    
    async init() {
        console.log('Initializing MINI TROPA...');
        await this.loadData();
        this.showMenu();
    }
    
    async loadData() {
        try {
            // Load characters
            const charactersResponse = await fetch('data/characters.json');
            const charactersData = await charactersResponse.json();
            this.characters = charactersData.characters;
            
            // Load cities
            const citiesResponse = await fetch('data/cities.json');
            const citiesData = await citiesResponse.json();
            this.allCities = citiesData.cities;
            
            // Load states
            const statesResponse = await fetch('data/states.json');
            const statesData = await statesResponse.json();
            this.states = statesData.states;
            this.regions = statesData.regions;
            
            console.log('Data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Erro ao carregar dados do jogo. Por favor, recarregue a página.');
        }
    }
    
    // Screen Navigation
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }
    
    showMenu() {
        this.showScreen('menuScreen');
    }
    
    showCharacterSelection() {
        this.showScreen('characterScreen');
        this.renderCharacters();
    }
    
    showRules() {
        this.showScreen('rulesScreen');
    }
    
    showCredits() {
        this.showScreen('creditsScreen');
    }
    
    showGame() {
        this.showScreen('gameScreen');
        if (!this.map) {
            this.initMap();
        }
        
        // If map is not available, show city list
        if (!this.map || typeof L === 'undefined') {
            this.showCityList();
        }
        
        this.updateUI();
    }
    
    // Character Selection
    renderCharacters() {
        const container = document.getElementById('charactersList');
        container.innerHTML = '';
        
        this.characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.innerHTML = `
                <div class="character-icon" style="color: ${character.color}">${character.icon}</div>
                <div class="character-name">${character.name}</div>
                <div class="character-specialty">${character.specialty}</div>
                <div class="character-ability">${character.ability}</div>
            `;
            card.addEventListener('click', () => this.selectCharacter(character));
            container.appendChild(card);
        });
    }
    
    selectCharacter(character) {
        this.player = character;
        this.startGame();
    }
    
    // Game Initialization
    startGame() {
        // Initialize game state
        this.gameState = {
            turn: 1,
            cities: this.allCities.map(city => ({
                ...city,
                owner: null,
                soldiers: 0
            })),
            ownedCities: [],
            soldiers: 7,
            points: 0,
            diceRolled: false,
            dice1: 0,
            dice2: 0
        };
        
        // Give player a random starting city
        const randomCity = this.gameState.cities[Math.floor(Math.random() * this.gameState.cities.length)];
        randomCity.owner = 'player';
        randomCity.soldiers = 3;
        this.gameState.ownedCities.push(randomCity.id);
        this.gameState.soldiers -= 3;
        
        this.showGame();
    }
    
    // Map Initialization
    initMap() {
        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded. Map will not be displayed.');
            document.getElementById('map').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #e0e0e0; color: #333; font-size: 1.2rem; padding: 20px; text-align: center;">Mapa não disponível. O jogo ainda é jogável através dos controles abaixo.</div>';
            return;
        }
        
        // Initialize Leaflet map centered on Brazil
        this.map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([-14.2350, -51.9253], 4);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 7,
            minZoom: 4
        }).addTo(this.map);
        
        // Add zoom control to top right
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);
        
        // Render cities on map
        this.renderCities();
    }
    
    renderCities() {
        // Check if map is available
        if (!this.map || typeof L === 'undefined') {
            console.log('Map not available, skipping city rendering');
            return;
        }
        
        // Clear existing markers
        Object.values(this.markers).forEach(marker => marker.remove());
        this.markers = {};
        
        this.gameState.cities.forEach(city => {
            const isOwned = city.owner === 'player';
            const isNeighbor = this.isCityConquerable(city.id);
            
            let markerColor = '#808080'; // Gray for neutral
            if (isOwned) {
                markerColor = this.player.color;
            } else if (isNeighbor) {
                markerColor = '#FFA500'; // Orange for conquerable
            }
            
            const marker = L.circleMarker([city.lat, city.lng], {
                radius: isOwned ? 10 : 7,
                fillColor: markerColor,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);
            
            // Add popup
            const popupContent = this.createCityPopup(city);
            marker.bindPopup(popupContent);
            
            // Add click handler
            marker.on('click', () => this.onCityClick(city));
            
            this.markers[city.id] = marker;
        });
    }
    
    createCityPopup(city) {
        const isOwned = city.owner === 'player';
        const isConquerable = this.isCityConquerable(city.id);
        
        let content = `
            <div class="city-popup">
                <h4>${city.name}</h4>
                <p><strong>Estado:</strong> ${city.state}</p>
                <p><strong>Soldados:</strong> ${city.soldiers}</p>
        `;
        
        if (isOwned) {
            content += `<p style="color: ${this.player.color}">✓ Sua cidade</p>`;
        } else if (isConquerable && this.gameState.diceRolled) {
            content += `<button class="btn btn-primary" onclick="game.conquerCity('${city.id}')">⚔️ Conquistar</button>`;
        } else if (!isConquerable) {
            content += `<p style="color: #888">Cidade não adjacente</p>`;
        }
        
        content += `</div>`;
        return content;
    }
    
    onCityClick(city) {
        // Additional click handling if needed
    }
    
    showCityList() {
        const mapContainer = document.getElementById('map');
        
        // Create a scrollable city list
        let html = '<div style="height: 100%; overflow-y: auto; padding: 15px; background: #f5f5f5;">';
        html += '<h3 style="color: #1a1a2e; margin-bottom: 15px;">🏙️ Cidades do Brasil</h3>';
        html += '<div style="display: grid; gap: 10px;">';
        
        // Group cities by state
        const citiesByState = {};
        this.gameState.cities.forEach(city => {
            if (!citiesByState[city.state]) {
                citiesByState[city.state] = [];
            }
            citiesByState[city.state].push(city);
        });
        
        // Render cities
        Object.keys(citiesByState).sort().forEach(stateId => {
            const state = this.states.find(s => s.id === stateId);
            html += `<div style="background: white; padding: 10px; border-radius: 8px; border-left: 4px solid #0f3460;">`;
            html += `<strong style="color: #1a1a2e;">${state ? state.name : stateId}</strong>`;
            html += '<div style="margin-top: 8px; display: flex; flex-direction: column; gap: 5px;">';
            
            citiesByState[stateId].forEach(city => {
                const isOwned = city.owner === 'player';
                const isConquerable = this.isCityConquerable(city.id);
                
                let bgColor = '#e0e0e0';
                let borderColor = '#999';
                let textColor = '#333';
                
                if (isOwned) {
                    bgColor = this.player.color + '33';
                    borderColor = this.player.color;
                    textColor = '#000';
                } else if (isConquerable && this.gameState.diceRolled) {
                    bgColor = '#FFA50033';
                    borderColor = '#FFA500';
                }
                
                html += `<div style="background: ${bgColor}; padding: 8px; border-radius: 5px; border: 2px solid ${borderColor}; color: ${textColor}; display: flex; justify-content: space-between; align-items: center;">`;
                html += `<div><strong>${city.name}</strong> ${isOwned ? '✓' : ''}<br><small>Soldados: ${city.soldiers}</small></div>`;
                
                if (isConquerable && this.gameState.diceRolled) {
                    html += `<button onclick="game.conquerCity('${city.id}')" style="background: #e94560; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">⚔️ Conquistar</button>`;
                }
                
                html += '</div>';
            });
            
            html += '</div></div>';
        });
        
        html += '</div></div>';
        mapContainer.innerHTML = html;
    }
    
    // Game Mechanics
    rollDice() {
        if (this.gameState.diceRolled) {
            this.updateActionMessage('Você já rolou os dados neste turno!');
            return;
        }
        
        // Animate dice
        const dice1El = document.getElementById('dice1');
        const dice2El = document.getElementById('dice2');
        
        dice1El.classList.add('rolling');
        dice2El.classList.add('rolling');
        
        // Roll after animation
        setTimeout(() => {
            this.gameState.dice1 = Math.floor(Math.random() * 6) + 1;
            this.gameState.dice2 = Math.floor(Math.random() * 6) + 1;
            this.gameState.diceRolled = true;
            
            dice1El.textContent = this.gameState.dice1;
            dice2El.textContent = this.gameState.dice2;
            
            dice1El.classList.remove('rolling');
            dice2El.classList.remove('rolling');
            
            // Check for doubles
            if (this.gameState.dice1 === this.gameState.dice2) {
                const bonus = this.gameState.dice1;
                this.gameState.soldiers += bonus;
                this.updateActionMessage(`🎉 Dados iguais! Você ganhou +${bonus} soldados!`);
            } else {
                this.updateActionMessage(`Dados: ${this.gameState.dice1} + ${this.gameState.dice2}. Escolha uma cidade para conquistar!`);
            }
            
            this.updateUI();
            this.renderCities(); // Update markers to show conquerable cities
        }, 500);
    }
    
    isCityConquerable(cityId) {
        const city = this.gameState.cities.find(c => c.id === cityId);
        if (!city || city.owner === 'player') return false;
        
        // Check if city is adjacent to any owned city
        for (const ownedCityId of this.gameState.ownedCities) {
            const ownedCity = this.gameState.cities.find(c => c.id === ownedCityId);
            if (ownedCity.neighbors.includes(cityId)) {
                return true;
            }
        }
        
        // Check for long range ability (Major Thomás)
        if (this.player.abilityType === 'long_range') {
            for (const ownedCityId of this.gameState.ownedCities) {
                const ownedCity = this.gameState.cities.find(c => c.id === ownedCityId);
                // Check neighbors of neighbors
                for (const neighborId of ownedCity.neighbors) {
                    const neighbor = this.gameState.cities.find(c => c.id === neighborId);
                    if (neighbor.neighbors.includes(cityId)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    conquerCity(cityId) {
        if (!this.gameState.diceRolled) {
            this.updateActionMessage('Role os dados primeiro!');
            return;
        }
        
        const city = this.gameState.cities.find(c => c.id === cityId);
        if (!city) return;
        
        if (!this.isCityConquerable(cityId)) {
            this.updateActionMessage('Esta cidade não pode ser conquistada agora!');
            return;
        }
        
        // Conquer the city
        city.owner = 'player';
        city.soldiers = 1;
        this.gameState.ownedCities.push(cityId);
        this.gameState.soldiers -= 1;
        
        // Calculate points
        let points = 10; // Base city points
        
        // Apply character ability bonuses
        if (this.player.abilityType === 'bonus_points') {
            points = Math.floor(points * 1.5);
        }
        
        if (this.player.abilityType === 'extra_soldier') {
            this.gameState.soldiers += 1;
        }
        
        this.gameState.points += points;
        
        // Check for state/region completion
        this.checkCompletions(city.state);
        
        this.updateActionMessage(`✓ ${city.name} conquistada! +${points} pontos`);
        
        // End turn
        this.endTurn();
        
        // Check for victory
        if (this.gameState.ownedCities.length === this.allCities.length) {
            this.showVictory();
        }
    }
    
    checkCompletions(stateId) {
        // Check if state is complete
        const stateCities = this.gameState.cities.filter(c => c.state === stateId);
        const ownedStateCities = stateCities.filter(c => c.owner === 'player');
        
        if (stateCities.length === ownedStateCities.length && stateCities.length > 0) {
            const state = this.states.find(s => s.id === stateId);
            this.gameState.points += 100;
            this.updateActionMessage(`🎊 Estado completo: ${state.name}! +100 pontos`);
            
            // Check region
            this.checkRegionCompletion(state.region);
        }
    }
    
    checkRegionCompletion(regionName) {
        const region = this.regions.find(r => r.name === regionName);
        if (!region) return;
        
        // Check if all states in region are complete
        let allComplete = true;
        for (const stateId of region.states) {
            const stateCities = this.gameState.cities.filter(c => c.state === stateId);
            const ownedStateCities = stateCities.filter(c => c.owner === 'player');
            if (stateCities.length !== ownedStateCities.length) {
                allComplete = false;
                break;
            }
        }
        
        if (allComplete) {
            this.gameState.points += 500;
            this.updateActionMessage(`🌟 Região completa: ${regionName}! +500 pontos`);
        }
    }
    
    endTurn() {
        // Reset for next turn
        this.gameState.diceRolled = false;
        this.gameState.turn++;
        
        // Give soldiers for owned cities
        const soldierBonus = Math.floor(this.gameState.ownedCities.length / 3);
        if (soldierBonus > 0) {
            this.gameState.soldiers += soldierBonus;
        }
        
        this.updateUI();
        
        // Update map or city list
        if (this.map && typeof L !== 'undefined') {
            this.renderCities();
        } else {
            this.showCityList();
        }
    }
    
    // UI Updates
    updateUI() {
        document.getElementById('playerName').textContent = this.player.name;
        document.getElementById('playerColorIndicator').style.backgroundColor = this.player.color;
        document.getElementById('playerPoints').textContent = this.gameState.points;
        document.getElementById('playerSoldiers').textContent = this.gameState.soldiers;
        document.getElementById('playerCities').textContent = this.gameState.ownedCities.length;
        
        // Update roll button
        const rollButton = document.getElementById('rollButton');
        if (this.gameState.diceRolled) {
            rollButton.disabled = true;
            rollButton.textContent = '✓ Dados Rolados';
        } else {
            rollButton.disabled = false;
            rollButton.textContent = '🎲 Rolar Dados';
        }
    }
    
    updateActionMessage(message) {
        document.getElementById('actionMessage').textContent = message;
    }
    
    // Game Menu
    showGameMenu() {
        document.getElementById('gameMenuOverlay').classList.add('active');
    }
    
    hideGameMenu() {
        document.getElementById('gameMenuOverlay').classList.remove('active');
    }
    
    restartGame() {
        document.getElementById('gameMenuOverlay').classList.remove('active');
        document.getElementById('victoryOverlay').classList.remove('active');
        this.showCharacterSelection();
    }
    
    quitToMenu() {
        document.getElementById('gameMenuOverlay').classList.remove('active');
        document.getElementById('victoryOverlay').classList.remove('active');
        this.showMenu();
    }
    
    // Victory
    showVictory() {
        const overlay = document.getElementById('victoryOverlay');
        const statsDiv = document.getElementById('victoryStats');
        
        statsDiv.innerHTML = `
            <p><strong>Pontos Finais:</strong> ${this.gameState.points}</p>
            <p><strong>Turnos:</strong> ${this.gameState.turn}</p>
            <p><strong>Cidades Conquistadas:</strong> ${this.gameState.ownedCities.length}</p>
            <p><strong>Comandante:</strong> ${this.player.name}</p>
        `;
        
        overlay.classList.add('active');
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new MiniTropaGame();
});
