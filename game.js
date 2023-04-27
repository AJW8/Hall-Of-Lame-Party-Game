var states = {
	LOBBY: 0,
	INTRO: 1,
	ROUND_INTRO: 2,
	NOMINATE_PLAYERS1: 3,
	NOMINATE_PLAYERS2: 4,
	SELECT_TITLES: 5,
	CONTEST_TITLE: 6,
	VOTE_NOMINEES: 7,
	TITLE_VOTES: 8,
	TITLE_SCORES: 9,
	SCORES_UNSORTED: 10,
	SCORES_SORTED: 11,
	WINNER: 12,
	END: 13
};

function Games(){
	var games = {};
	
	this.createGame = function(){
		var id = this.generateId();
		games[id] = new Game();
		games[id].setId(id);
		return games[id];
	}
	
	this.generateId = function(){
		var id;
		do{
			id = '';
			var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			var length = letters.length;
			for(var i = 0; i < 4; i++) id += letters.charAt(Math.floor(Math.random() * length));
			for(var g in games) if(games[g] && games[g].getId() == id) id = false;
		}
		while(!id);
		return id;
	}
	
	this.newLobby = function(gameId){
		var game = games[gameId];
		if(!game) return;
		var id = this.generateId();
		games[id] = game;
		game.setId(id);
		game.newLobby();
	}
	
	this.removeGame = function(gameId){
		if(gameId in games){
			games[gameId].disconnectAll();
			delete games[gameId];
			games[gameId] = false;
		}
	}
	
	this.getGame = function(gameId){
		if(gameId in games) return games[gameId];
		else return false;
	}
}

function Game(){
	var gameId = false;
	var round = false;
	var playerIds = false;
	var sortedPlayers = false;
	var playerData = false;
	var titleData = false;
	var currentTitle = false;
	var audience = false;
	var users = new Users();
	var gameState = new GameState();
	gameState.setState(states.LOBBY, {});
	
	this.setId = function(pId){
		gameId = pId;
	}
	
	this.getId = function(){
		return gameId;
	}
	
	this.addUser = function(user){
		if(user.getPlayer() && gameState.get() != states.LOBBY) return;
		users.addUser(user, gameId);
		const allUsers = users.getAll();
		if(user.getPlayer()){
			if(playerIds) playerIds.push(user.getUniqueId());
			else playerIds = [user.getUniqueId()];
			if(gameState.get() != states.LOBBY) return;
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
		}
		else if(user.getAudience()){
			if(!audience) audience = {};
			audience[user.getUniqueId()] = {
				connected: true,
				voting: gameState.get() == states.VOTE_NOMINEES
			};
		}
	}
	
	this.getUser = function(userId){
		return users.getUser(userId);
	}
	
	this.removeUser = function(userId){
		users.removeUser(userId);
	}
	
	this.getState = function(){
		return gameState.get();
	}
	
	this.getPlayerCount = function(){
		return playerIds ? playerIds.length : 0;
	}
	
	this.getAudienceCount = function(){
		if(!audience) return 0;
		const allUsers = users.getAll();
		var audienceCount = 0;
		for(var a in audience) if(audience[a] && audience[a].connected && allUsers[a] && allUsers[a].getAudience()) audienceCount++;
		return audienceCount;
	}
	
	this.hasPlayer = function(playerName){
		if(!playerIds) return false;
		const allUsers = users.getAll();
		for(let i = 0; i < playerIds.length; i++) if(allUsers[playerIds[i]] && playerName == allUsers[playerIds[i]].getName()) return true;
		return false;
	}
	
	this.verifyAudienceConnection = function(userId){
		var user = this.getUser(userId);
		if(user && user.getAudience()) audience[userId].connected = true;
	}
	
	this.getUserData = function(userId){
		var user = this.getUser(userId);
		if(!user) return {};
		const allUsers = users.getAll();
		const state = gameState.get();
		const t = titleData && titleData[currentTitle];
		if(user.getHost()){
			var players = [];
			if(playerIds){
				var end = state == states.END;
				for(let i = 0; i < playerIds.length; i++){
					players.push({
						name: allUsers[playerIds[i]].getName(),
						finished: playerData ? playerData[i].finished : false,
						score: allUsers[playerIds[i]].getScore(),
						winners_nominated: end ? allUsers[playerIds[i]].getWinnersNominated() : false,
						times_nominated: end ? allUsers[playerIds[i]].getTimesNominated() : false,
						titles_won: end ? allUsers[playerIds[i]].getTitlesWon() : false,
						winners_voted: end ? allUsers[playerIds[i]].getWinnersVoted() : false,
						titles_stolen: end ? allUsers[playerIds[i]].getTitlesStolen() : false,
					});
				}
			}
			var nominees = false;
			if(t){
				nominees = [];
				const currentNominees = titleData[currentTitle].nominees;
				for(let i = 0; i < currentNominees.length; i++){
					nominees.push({
						player: currentNominees[i].player,
						nominee: currentNominees[i].nominee,
						forfeit: currentNominees[i].forfeit,
						first_place_votes: currentNominees[i].first_place_votes,
						second_place_votes: currentNominees[i].second_place_votes,
						third_place_votes: currentNominees[i].third_place_votes,
						audience_percentage: currentNominees[i].audience_percentage,
						score: currentNominees[i].score,
						contest_bonus: currentNominees[i].contest_bonus,
						winner_bonus: currentNominees[i].winner_bonus
					});
				}
			}
			return {
				code: gameId,
				state: state,
				min_players: prefs.min_players,
				max_players: prefs.max_players,
				players: players,
				sorted_players: sortedPlayers,
				audience: this.getAudienceCount(),
				round: round,
				current_title: t ? titleData[currentTitle].title : false,
				nominees: nominees,
				audience_votes: t ? titleData[currentTitle].audience_votes : false,
				contested: t ? titleData[currentTitle].contested : false,
				forfeit: t ? titleData[currentTitle].forfeit : false,
				stalemate: t ? titleData[currentTitle].stalemate : false
			};
		}
		else if(user.getPlayer()){
			var playerIndex = false;
			for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) playerIndex = i;
			var title = false;
			var nominees = false;
			var currentNominee = false;
			if(t){
				nominees = [];
				if((state == states.NOMINATE_PLAYERS1 || state == states.NOMINATE_PLAYERS2) && playerData && !playerData[playerIndex].finished){
					for(let i = 0; i < playerIds.length; i++){
						nominees.push(playerIndex == i ? false : allUsers[playerIds[i]].getName());
						const currentNominees = titleData[i].nominees;
						if(playerIndex == currentNominees[state == states.NOMINATE_PLAYERS1 ? 0 : 1].player){
							if(playerData) title = titleData[i].title;
							if(state == states.NOMINATE_PLAYERS2) currentNominee = currentNominees[0].nominee;
						}
					}
				}
				else if(state == states.CONTEST_TITLE && playerData){
					title = titleData[currentTitle].title;
					currentNominee = playerData[playerIndex].title == currentTitle;
				}
				else if(state == states.VOTE_NOMINEES){
					title = titleData[currentTitle].title;
					const currentNominees = titleData[currentTitle].nominees;
					for(let i = 0; i < currentNominees.length; i++){
						var currentNominee = allUsers[playerIds[currentNominees[i].nominee]].getName();
						if(round >= 2){
							const firstPlaceVotes = currentNominees[i].first_place_votes;
							for(let j = 0; j < firstPlaceVotes.length; j++) if(currentNominees[i].nominee == firstPlaceVotes[j]) currentNominee = false;
							if(currentNominee){
								const secondPlaceVotes = currentNominees[i].second_place_votes;
								for(let j = 0; j < secondPlaceVotes.length; j++) if(currentNominees[i].nominee == secondPlaceVotes[j]) currentNominee = false;
							}
						}
						nominees.push(currentNominee);
					}
				}
			}
			return {
				state: state,
				name: allUsers[userId].getName(),
				player_index: playerIndex,
				final_round: round >= 2,
				current_title: title,
				nominees: nominees,
				current_nominee: currentNominee,
				title1: playerData ? playerData[playerIndex].title1 : false,
				title2: playerData ? playerData[playerIndex].title2 : false,
				titles_left: playerData ? playerData[playerIndex].titles_left : false,
				contested: playerData ? playerData[playerIndex].contested : false,
				vote_rank: playerData ? playerData[playerIndex].vote_rank : false
			};
		}
		else if(user.getAudience()){
			const voting = state == states.VOTE_NOMINEES;
			var nominees = false;
			if(voting){
				nominees = [];
				const currentNominees = titleData[currentTitle].nominees;
				for(let i = 0; i < currentNominees.length; i++) nominees.push(allUsers[playerIds[currentNominees[i].nominee]].getName());
			}
			return {
				state: state,
				final_round: round >= 2,
				current_title: voting ? titleData[currentTitle].title : false,
				nominees: nominees,
				vote_rank: (voting && audience[userId].voting) ? 1 : false
			};
		}
		else return {};
	}
	
	this.startGame = function(){
		round = 0;
		sortedPlayers = [];
		for(let i = 0; i < playerIds.length; i++) sortedPlayers.push(i);
		var curState = gameState.get();
		if(curState != states.LOBBY && curState != states.END) return;
		gameState.setState(states.INTRO, {});
		const allUsers = users.getAll();
		for(let i = 0; i < playerIds.length; i++) allUsers[playerIds[i]].resetScore();
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.hasStarted = function(){
		var curState = gameState.get();
		return curState != states.LOBBY;
	}
	
	this.continue = function(){
		var curState = gameState.get();
		const allUsers = users.getAll();
		if(curState == states.LOBBY || curState == states.END) return;
		else if(curState == states.ROUND_INTRO) curState = round < 2 ? states.NOMINATE_PLAYERS1 : states.SELECT_TITLES;
		else if(curState == states.NOMINATE_PLAYERS2) curState = states.VOTE_NOMINEES;
		else if(curState == states.SELECT_TITLES) curState = states.CONTEST_TITLE;
		else if(curState == states.TITLE_SCORES){
			if(currentTitle == titleData.length - 1){
				currentTitle = 0;
				curState = states.SCORES_UNSORTED;
			}
			else{
				currentTitle++;
				curState = round < 2 ? states.VOTE_NOMINEES : states.CONTEST_TITLE;
			}
		}
		else if(curState == states.SCORES_SORTED){
			if(round < 2){
				round++;
				curState = states.ROUND_INTRO;
			}
			else curState = states.WINNER;
		}
		else if(curState == states.WINNER){
			this.endGame();
			return;
		}
		else curState++;
		if(curState == states.NOMINATE_PLAYERS1 || curState == states.SELECT_TITLES){
			currentTitle = 0;
			const allTitles = round == 0 ? prefs.round_1_titles : round == 1 ? prefs.round_2_titles : prefs.final_round_titles;
			var playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			var playerOrder = [];
			for(let i = 0; i < playerIds.length; i++){
				var r;
				do r = Math.floor(Math.random() * playerIds.length);
				while(!playerIndices[r]);
				playerOrder.push(r);
				playerIndices[r] = false;
			}
			playerData = [];
			titleData = [];
			if(curState == states.NOMINATE_PLAYERS1){
				var titleIndices = [];
				for(let i = 0; i < allTitles.length; i++) titleIndices.push(true);
				for(let i = 0; i < playerIds.length; i++){
					playerData.push({
						finished: false,
						vote_rank: false,
						score: 0
					});
					var r;
					do r = Math.floor(Math.random() * allTitles.length);
					while(!titleIndices[r]);
					titleData.push({
						title: allTitles[r],
						nominees: [
							{
								player: playerOrder[i],
								nominee: playerOrder[i],
								forfeit: true,
								first_place_votes: [],
								second_place_votes: [],
								third_place_votes: [],
								audience_votes: 0,
								audience_percentage: 0,
								score: 0,
								contest_bonus: 0,
								winner_bonus: 0
							},
							{
								player: playerOrder[(i + 1) % playerIds.length],
								nominee: playerOrder[(i + 1) % playerIds.length],
								forfeit: true,
								first_place_votes: [],
								second_place_votes: [],
								third_place_votes: [],
								audience_votes: 0,
								audience_percentage: 0,
								score: 0,
								contest_bonus: 0,
								winner_bonus: 0
							}
						],
						player_votes: 0,
						audience_votes: 0,
						forfeit: false,
						stalemate: false
					});
					titleIndices[r] = false;
				}
			}
			else if(curState == states.SELECT_TITLES){
				var titleIndices = [];
				for(let i = 0; i < allTitles.length; i++) titleIndices.push(true);
				var titles = [];
				for(let i = 0; i < playerIds.length * 2; i++){
					var r;
					do r = Math.floor(Math.random() * allTitles.length);
					while(!titleIndices[r]);
					titles.push(allTitles[r]);
					titleIndices[r] = false;
				}
				for(let i = 0; i < playerIds.length; i++){
					var playerTitle = false;
					for(let j = 0; j < playerIds.length; j++) if(i == playerOrder[j]) playerTitle = j;
					playerData.push({
						title: playerTitle,
						title1: titles[i],
						title2: titles[i + playerIds.length],
						finished: false,
						titles_left: playerIds.length < 5 ? 2 : 3,
						contested: false,
						vote_rank: false,
						score: 0
					});
					titleData.push({
						title: titles[playerOrder[i] + Math.floor(Math.random() * 2) * playerIds.length],
						nominees: [],
						contested: 0,
						player_votes: 0,
						audience_votes: 0,
						forfeit: false,
						stalemate: false
					});
				}
			}
		}
		else if(curState == states.NOMINATE_PLAYERS2){
			for(let i = 0; i < playerIds.length; i++) playerData[i].finished = false;
		}
		else if(curState == states.CONTEST_TITLE){
			var forfeit = true;
			for(let i = 0; i < playerIds.length; i++){
				if(playerData[i].title != currentTitle) forfeit &= !playerData[i].titles_left;
				playerData[i].contested = false;
			}
			if(forfeit){
				if(titleData[currentTitle].nominees.length) titleData[currentTitle].forfeit = true;
				else titleData[currentTitle].stalemate = true;
				curState = states.TITLE_VOTES;
			}
		}
		else if(curState == states.VOTE_NOMINEES){
			const nominees = titleData[currentTitle].nominees;
			const forfeit = round < 2 ? (nominees[0].forfeit && !nominees[1].forfeit || !nominees[0].forfeit && nominees[1].forfeit) : (nominees.length == 1);
			titleData[currentTitle].forfeit = forfeit;
			const stalemate = round < 2 ? (nominees[0].forfeit && nominees[1].forfeit) : !nominees.length;
			titleData[currentTitle].stalemate = stalemate;
			if(forfeit || stalemate) curState = states.TITLE_VOTES;
			else{
				for(let i = 0; i < playerIds.length; i++) playerData[i].vote_rank = (round < 2 || nominees.length > 2 || (nominees.length == 2 && i != nominees[0].player && i != nominees[1].player)) ? 1 : false;
				for(var a in audience) if(audience[a] && allUsers[a] && allUsers[a].getAudience()) audience[a].voting = true;
			}
		}
		else if(curState == states.TITLE_VOTES){
			if(!titleData[currentTitle].forfeit && !titleData[currentTitle].stalemate){
				const audienceVotes = titleData[currentTitle].audience_votes;
				const stalemate = !titleData[currentTitle].player_votes && !audienceVotes;
				if(stalemate) titleData[currentTitle].stalemate = true;
				else if(audienceVotes){
					const nominees = titleData[currentTitle].nominees;
					for(let i = 0; i < nominees.length; i++) nominees[i].audience_percentage = Math.floor(nominees[i].audience_votes * 100.0 / audienceVotes);
				}
			}
		}
		if(curState == states.TITLE_SCORES){
			const nominees = titleData[currentTitle].nominees;
			const multiplier = round == 0 ? 1 : round == 1 ? 2 : 3;
			if(titleData[currentTitle].forfeit){
				var winner;
				if(round < 2){
					const nominee1 = nominees[0];
					const nominee2 = nominees[1];
					if(!nominee1.forfeit && nominee2.forfeit) winner = nominee1;
					else if(nominee1.forfeit && !nominee2.forfeit){
						winner = nominee2;
						winner.contest_bonus = multiplier * 100;
					}
					if(winner){
						winner.score = multiplier * 1000;
						winner.winner_bonus = multiplier * 100;
					}
				}
				else{
					winner = nominees[0];
					winner.score = multiplier * 1000;
					winner.winner_bonus = multiplier * 100;
				}
				if(winner){
					playerData[winner.player].score += winner.score + winner.contest_bonus + winner.winner_bonus;
					playerData[winner.nominee].score += multiplier * 100;
					allUsers[playerIds[winner.player]].addWinnerNominated();
					allUsers[playerIds[winner.nominee]].addTitleWon();
					if(round >= 2 && playerData[winner.nominee].contested) allUsers[playerIds[winner.nominee]].addTitleStolen();
				}
			}
			else if(!titleData[currentTitle].stalemate){
				var weights = [];
				var maxWeight = 0;
				var totalWeight = 0;
				for(let i = 0; i < nominees.length; i++){
					const currentWeight = 100 * nominees[i].first_place_votes.length + 50 * nominees[i].second_place_votes.length + 25 * nominees[i].third_place_votes.length + nominees[i].audience_percentage;
					if(currentWeight > maxWeight) maxWeight = currentWeight;
					totalWeight += currentWeight;
					weights.push(currentWeight);
				}
				var winners = 0;
				for(let i = 0; i < weights.length; i++) if(weights[i] == maxWeight) winners++;
				for(let i = 0; i < nominees.length; i++){
					nominees[i].score = Math.floor(multiplier * weights[i] * 100.0 / totalWeight) * 10;
					if(weights[i] == maxWeight){
						nominees[i].winner_bonus = multiplier * 100;
						allUsers[playerIds[nominees[i].player]].addWinnerNominated();
						allUsers[playerIds[nominees[i].nominee]].addTitleWon();
						if(round >= 2 && playerData[nominees[i].nominee].contested) allUsers[playerIds[nominees[i].nominee]].addTitleStolen();
						if(round < 2) playerData[nominees[i].nominee].score += 100;
						for(let j = 0; j < nominees[i].first_place_votes.length; j++){
							const v = nominees[i].first_place_votes[j];
							if(winners == 1) playerData[v].score += multiplier * 500;
							allUsers[playerIds[v]].addWinnerVoted();
						}
						for(let j = 0; j < nominees[i].second_place_votes.length; j++){
							const v = nominees[i].second_place_votes[j];
							if(winners == 1) playerData[v].score += multiplier * 250;
							allUsers[playerIds[v]].addWinnerVoted();
						}
						for(let j = 0; j < nominees[i].third_place_votes.length; j++){
							const v = nominees[i].third_place_votes[j];
							if(winners == 1) playerData[v].score += multiplier * 125;
							allUsers[playerIds[v]].addWinnerVoted();
						}
					}
					if(i > 0 || playerData[nominees[i].nominee].contested) nominees[i].contest_bonus = Math.floor(nominees[i].score / 10);
					playerData[nominees[i].player].score += nominees[i].score + nominees[i].winner_bonus + nominees[i].contest_bonus;
				}
			}
		}
		else if(curState == states.SCORES_SORTED){
			for(let i = 0; i < playerData.length; i++) allUsers[playerIds[i]].addToScore(playerData[i].score);
			sortedPlayers = [];
			var playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			for(let i = 0; i < playerIds.length; i++){
				var maxIndex = 0;
				var maxScore = 0;
				var first = true;
				for(let j = 0; j < playerIds.length; j++){
					if(playerIndices[j]){
						var currentScore = allUsers[playerIds[j]].getScore();
						if(first || currentScore > maxScore){
							first = false;
							maxIndex = j;
							maxScore = currentScore;
						}
					}
				}
				sortedPlayers.push(maxIndex);
				playerIndices[maxIndex] = false;
			}
		}
		gameState.setState(curState, {});
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}	
	
	this.receiveNomination = function(userId, nominee){
		const nomineeIndex = gameState.get() == states.NOMINATE_PLAYERS1 ? 0 : gameState.get() == states.NOMINATE_PLAYERS2 ? 1 : false;
		if(nomineeIndex === false) return;
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		var player = false;
		for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
		if(player === false) return;
		for(let i = 0; i < titleData.length; i++){
			const nomination = titleData[i].nominees[nomineeIndex];
			if(player == nomination.player && nomination.forfeit){
				titleData[i].stalemate = false;
				nomination.nominee = nominee;
				nomination.forfeit = false;
				allUsers[playerIds[nominee]].addTimeNominated();
			}
		}
		playerData[player].finished = true;
		allUsers[playerIds[nominee]].addTimeNominated();
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
	}
	
	this.selectTitle = function(userId, title){
		if(gameState.get() != states.SELECT_TITLES) return;
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		var player = false;
		for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
		if(player === false || playerData[player].title === false || titleData[playerData[player].title].nominees.length) return;
		if(title) titleData[playerData[player].title].title = title;
		titleData[playerData[player].title].nominees = [{
			player: player,
			nominee: player,
			first_place_votes: [],
			second_place_votes: [],
			third_place_votes: [],
			audience_votes: 0,
			audience_percentage: 0,
			score: 0,
			contest_bonus: 0,
			winner_bonus: 0,
		}];
		playerData[player].finished = true;
		allUsers[playerIds[player]].addTimeNominated();
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
	}
	
	this.contestTitle = function(userId){
		if(gameState.get() != states.CONTEST_TITLE) return;
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		var player = false;
		for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
		if(player === false || !playerData[player].titles_left || playerData[player].contested) return;
		const title = titleData[currentTitle];
		title.contested++;
		title.nominees.push({
			player: player,
			nominee: player,
			first_place_votes: [],
			second_place_votes: [],
			third_place_votes: [],
			audience_votes: 0,
			audience_percentage: 0,
			score: 0,
			contest_bonus: 0,
			winner_bonus: 0
		});
		playerData[player].titles_left--;
		playerData[player].contested = true;
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].setContested(titleData[currentTitle].contested);
	}
	
	this.receiveVote = function(userId, vote){
		if(gameState.get() != states.VOTE_NOMINEES) return;
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user) return;
		var nominees = titleData[currentTitle].nominees;
		if(!nominees[vote]) return;
		if(user.getPlayer()){
			var player = false;
			for(let i = 0; i < playerData.length; i++) if(userId == playerIds[i]) player = i;
			if(player === false) return;
			titleData[currentTitle].player_votes++;
			var voteRank = playerData[player].vote_rank;
			if(voteRank == 1) nominees[vote].first_place_votes.push(player);
			else if(voteRank == 2) nominees[vote].second_place_votes.push(player);
			else if(voteRank == 3) nominees[vote].third_place_votes.push(player);
			else return;
			if(round < 2 || playerData[player].vote_rank >= (nominees.length < 4 ? 1 : nominees.length == 4 ? 2 : 3)) playerData[player].vote_rank = false;
			else playerData[player].vote_rank++;
			voteRank = playerData[player].vote_rank;
			if(voteRank) user.setVoteRank(voteRank);
		}
		else if(user.getAudience()){
			titleData[currentTitle].audience_votes++;
			nominees[vote].audience_votes++;
			audience[userId].voting = false;
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].setAudienceVotes(titleData[currentTitle].audience_votes);
		}
	}
	
	this.endGame = function(){
		gameState.setState(states.END, {});
		const allUsers = users.getAll();
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.newLobby = function(){
		playerIds = false;
		audience = {};
		currentTitle = false;
		gameState.setState(states.LOBBY, {});
		const allUsers = users.getAll();
		for(var u in allUsers) if(allUsers[u] && !allUsers[u].getHost()) users.removeUser(u);
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.disconnectAll = function(){
		const allUsers = users.getAll();
		for(var u in allUsers) users.removeUser(u);
	}
	
	this.sendUpdates = function(user, params){
		//var summary = gameState.getSummary();
		//user.sendUpdates(summary, params);
	}
	
	setInterval(function(game){
		return function(){
			const allUsers = users.getAll();
			var audienceCount = game.getAudienceCount();
			for(var a in audience){
				if(audience[a] && allUsers[a] && allUsers[a].getAudience()){
					audience[a].connected = false;
					allUsers[a].checkAudienceConnection();
				}
			}
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendAudienceUpdate(audienceCount);
		}
	}(this), 1000);
}

function Users(){
	var users = {};
	
	this.addUser = function(user, gameId){
		var uniqueId = user.getUniqueId();
		if(typeof uniqueId === 'undefined' || !uniqueId) return;
		user.setGameId(gameId);
		users[uniqueId] = user;
	}
	
	this.getUser = function(userId){
		if(userId in users) return users[userId];
		else return false;
	}
	
	this.removeUser = function(userId){
		if(userId in users){
			users[userId].disconnectUser();
			delete users[userId];
			users[userId] = false;
		}
	}
	
	this.getAll = function(){
		return users;
	}
}

function User(pSocket, pName){
	var socket = pSocket;
	
	this.getUniqueId = function(){
		if(socket && socket.handshake && socket.handshake.session && socket.handshake.session.unique_id) return socket.handshake.session.unique_id;
		return false;
	}
	
	if(socket && socket.handshake && socket.handshake.session){
		//if(typeof socket.handshake.session.unique_id === 'undefined'){
		//	console.log('# User connected.');
		//	socket.handshake.session.unique_id = socket.id;
		//}
		console.log('# User connected.');
		socket.handshake.session.unique_id = socket.id;
		
		socket.handshake.session.in_game = true;
		socket.handshake.session.user_id = this.getUniqueId();
		socket.handshake.session.save();
	}
	
	var isHost = pName == 'host';
	var isPlayer;
	var isAudience = pName == 'audience';
	isPlayer = !(isHost || isAudience);
	var name = isPlayer ? pName : false;
	var score = false;
	var winnersNominated = false;
	var timesNominated = false;
	var titlesWon = false;
	var winnersVoted = false;
	var titlesStolen = false;
	
	this.getHost = function(){
		return isHost;
	}
	
	this.getPlayer = function(){
		return isPlayer;
	}
	
	this.getAudience = function(){
		return isAudience;
	}
	
	this.getName = function(){
		return name;
	}
	
	this.resetScore = function(){
		score = 0;
		winnersNominated = 0;
		timesNominated = 0;
		titlesWon = 0;
		winnersVoted = 0;
		contestedTitlesWon = 0;
	}
	
	this.addToScore = function(s){
		if(isPlayer) score += s;
	}
	
	this.getScore = function(){
		return score;
	}
	
	this.addWinnerNominated = function(){
		winnersNominated++;
	}
	
	this.getWinnersNominated = function(){
		return winnersNominated;
	}
	
	this.addTimeNominated = function(){
		 timesNominated++;
	}
	
	this.getTimesNominated = function(){
		return timesNominated;
	}
	
	this.addTitleWon = function(){
		 titlesWon++;
	}
	
	this.getTitlesWon = function(){
		return titlesWon;
	}
	
	this.addWinnerVoted = function(){
		 winnersVoted++;
	}
	
	this.getWinnersVoted = function(){
		return winnersVoted;
	}
	
	this.addTitleStolen = function(){
		 titlesStolen++;
	}
	
	this.getTitlesStolen = function(){
		return titlesStolen;
	}
	
	this.setGameId = function(gameId){
		socket.handshake.session.game_id = gameId;
	}
	
	this.updateSocket = function(pSocket){
		socket = pSocket;
	}
	
	this.disconnectUser = function(){
		socket.handshake.session.in_game = false;
		socket.handshake.session.unique_id = false;
		socket.handshake.session.user_id = false;
		socket.handshake.session.game_id = false;
		socket.handshake.session.save();
		if(isHost) socket.emit('host_init_nok');
		else socket.emit('game_init_nok');
	}
	
	this.sendPlayersUpdate = function(players){
		if(isHost) socket.emit('host_players_update', players);
	}

	this.sendAudienceUpdate = function(audience){
		if(isHost) socket.emit('host_audience_update', audience);
	}

	this.sendStateUpdate = function(params){
		if(isHost) socket.emit('host_state_update', params);
		else socket.emit('game_state_update', params);
	}
	
	this.setVoteRank = function(voteRank){
		if(isPlayer || isAudience) socket.emit('game_set_vote_rank', voteRank);
	}
	
	this.setAudienceVotes = function(audienceVotes){
		if(isHost) socket.emit('host_set_audience_votes', audienceVotes);
	}
	
	this.setContested = function(contested){
		if(isHost) socket.emit('host_set_contested', contested);
	}
	
	this.checkAudienceConnection = function(){
		if(isAudience) socket.emit('game_check_audience_connection');
	}
}

function GameState(){
	var curState = false;
	var stateParams = false;
	var hiddenParams = false;
	
	this.get = function(){
		return curState;
	}
	
	this.setState = function(pState, pStateParams){
		curState = pState;
		stateParams = pStateParams;
	}
	
	this.setHiddenParams = function(pHiddenParams){
		hiddenParams = pHiddenParams;
	}
	
	this.getHiddenParams = function(){
		return hiddenParams;
	}
	
	this.getSummary = function(){
		var obj = {};
		obj.state = curState;
		obj.stateParams = stateParams;
		return obj;
	}
}
